/**
 * MainRoutine - Maestro Core (RFC-0, RFC-1, RFC-6)
 *
 * The Main Routine:
 * - accepts tasks
 * - applies mechanical decision rules
 * - delegates dispatch
 * - emits decision signals
 *
 * The Main Routine MUST NOT:
 * - learn
 * - optimize globally
 * - coordinate multiple tasks
 * - correlate tasks
 */

import type { Decision } from '../types/decision.js'
import type { TaskRuntimeState } from '../types/runtime-state.js'
import type { Task, TaskID } from '../types/task.js'
import { TTLMap } from '../utils/ttl-map.js'
import type { Amigdala } from './amigdala.js'
import type { CircuitDistributor } from './circuit-distributor.js'

/**
 * Decision event for observability (RFC-6 §12)
 */
export interface DecisionEvent {
  readonly taskId: TaskID
  readonly decision: Decision
  readonly pressure: {
    readonly memory: number
    readonly queueDepth: number
    readonly spawnSaturation: number
  }
  readonly timestamp: number
}

/**
 * Decision event handler
 */
export type DecisionEventHandler = (event: DecisionEvent) => void

/**
 * MainRoutine configuration
 */
export interface MainRoutineConfig {
  /** Pressure observer */
  amigdala: Amigdala
  /** Spawn strategy executor */
  distributor: CircuitDistributor
  /** Runtime state TTL in milliseconds (default: 5 minutes) */
  stateTTL?: number
  /** Maximum tracked tasks (default: 10000) */
  maxTrackedTasks?: number
  /** Decision event handler for observability */
  onDecision?: DecisionEventHandler
}

/**
 * MainRoutine interface
 */
export interface MainRoutine {
  /**
   * Admit a task for processing
   *
   * @returns Decision indicating dispatch, retry, escalate, or drop
   */
  admit(task: Task): Decision

  /**
   * Signal retry for a task (called by external system)
   */
  signalRetry(taskId: TaskID): void

  /**
   * Get runtime state for a task (for testing/debugging)
   */
  getRuntimeState(taskId: TaskID): TaskRuntimeState | undefined
}

/**
 * Create MainRoutine instance
 */
export function createMainRoutine(config: MainRoutineConfig): MainRoutine {
  const {
    amigdala,
    distributor,
    stateTTL = 5 * 60 * 1000,
    maxTrackedTasks = 10000,
    onDecision,
  } = config

  // Ephemeral runtime state storage
  const runtimeStates = new TTLMap<TaskID, TaskRuntimeState>(stateTTL, maxTrackedTasks)

  function getOrCreateRuntimeState(taskId: TaskID): TaskRuntimeState {
    const existing = runtimeStates.get(taskId)
    if (existing) {
      return existing
    }
    const initial: TaskRuntimeState = {
      spawnCount: 0,
      retryDepth: 0,
      lastAttemptAt: Date.now(),
    }
    runtimeStates.set(taskId, initial)
    return initial
  }

  function emitDecision(taskId: TaskID, decision: Decision): void {
    if (!onDecision) return

    const pressure = amigdala.snapshot()
    const event: DecisionEvent = {
      taskId,
      decision,
      pressure: {
        memory: pressure.memory,
        queueDepth: pressure.queueDepth,
        spawnSaturation: pressure.spawnSaturation,
      },
      timestamp: Date.now(),
    }
    onDecision(event)
  }

  return {
    admit(task: Task): Decision {
      const pressure = amigdala.snapshot()
      const runtimeState = getOrCreateRuntimeState(task.id)

      // Check budget exhaustion
      if (runtimeState.spawnCount >= task.metadata.spawnBudget) {
        const decision: Decision = {
          type: 'drop',
          reason: 'spawn_budget_exhausted',
          currentDepth: runtimeState.retryDepth,
        }
        emitDecision(task.id, decision)
        return decision
      }

      if (runtimeState.retryDepth >= task.metadata.maxRetryDepth) {
        const decision: Decision = {
          type: 'drop',
          reason: 'retry_depth_exhausted',
          currentDepth: runtimeState.retryDepth,
        }
        emitDecision(task.id, decision)
        return decision
      }

      // Check pressure threshold (configurable, using simple heuristic)
      const avgPressure = (pressure.memory + pressure.queueDepth + pressure.spawnSaturation) / 3
      if (avgPressure > 0.9) {
        const decision: Decision = {
          type: 'drop',
          reason: 'pressure_exceeded',
          currentDepth: runtimeState.retryDepth,
        }
        emitDecision(task.id, decision)
        return decision
      }

      // Attempt to select sub-routine group
      const group = distributor.select(task, runtimeState, pressure)

      if (!group) {
        // Strategy couldn't select - drop
        const decision: Decision = {
          type: 'drop',
          reason: 'spawn_budget_exhausted',
          currentDepth: runtimeState.retryDepth,
        }
        emitDecision(task.id, decision)
        return decision
      }

      // Dispatch via primary (fire-and-forget)
      group.primary.dispatch(task)

      // Update runtime state
      runtimeState.spawnCount++
      runtimeState.lastAttemptAt = Date.now()
      runtimeStates.set(task.id, runtimeState)

      const decision: Decision = { type: 'dispatch' }
      emitDecision(task.id, decision)
      return decision
    },

    signalRetry(taskId: TaskID): void {
      const state = runtimeStates.get(taskId)
      if (state) {
        state.retryDepth++
        runtimeStates.set(taskId, state)
      }
    },

    getRuntimeState(taskId: TaskID): TaskRuntimeState | undefined {
      return runtimeStates.get(taskId)
    },
  }
}
