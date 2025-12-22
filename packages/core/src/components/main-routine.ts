/**
 * MainRoutine - Maestro Core (RFC-0, RFC-1, RFC-6, RFC-7)
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
 *
 * RFC-7 Breaking Changes:
 * - envelopeResolver and defaultEnvelope are required
 * - DecisionEvent includes envelopeId and envelopeNarrowed
 * - Drop gate uses mask semantics
 */

import type { CandidateRegistry } from '../types/candidate-registry.js'
import type { Decision } from '../types/decision.js'
import type { DecisionEnvelope, EnvelopeResolver } from '../types/envelope.js'
import type { TaskRuntimeState } from '../types/runtime-state.js'
import type { Task, TaskID } from '../types/task.js'
import { TTLMap } from '../utils/ttl-map.js'
import type { Amigdala } from './amigdala.js'
import type { CircuitDistributor } from './circuit-distributor.js'

/**
 * Decision event for observability (RFC-6 §12, RFC-7 §11)
 */
export interface DecisionEvent {
  readonly taskId: TaskID
  readonly decision: Decision
  /** Active envelope ID (RFC-7) */
  readonly envelopeId: string
  /** Whether envelope caused candidate narrowing (RFC-7) */
  readonly envelopeNarrowed: boolean
  /** Number of eligible candidates (RFC-7) */
  readonly eligibleCandidatesCount: number
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
 * MainRoutine configuration (RFC-7 Breaking Change)
 */
export interface MainRoutineConfig {
  /** Pressure observer */
  amigdala: Amigdala
  /** Spawn strategy executor */
  distributor: CircuitDistributor
  /** Candidate registry (for narrowing check) */
  registry: CandidateRegistry
  /** Envelope resolver (RFC-7) - REQUIRED */
  envelopeResolver: EnvelopeResolver
  /** Default envelope when intent unknown (RFC-7) - REQUIRED */
  defaultEnvelope: DecisionEnvelope
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
    registry,
    envelopeResolver,
    defaultEnvelope,
    stateTTL = 5 * 60 * 1000,
    maxTrackedTasks = 10000,
    onDecision,
  } = config

  // RFC-7 §6.2: defaultEnvelope MUST be provided
  if (!defaultEnvelope) {
    throw new Error('defaultEnvelope is required (RFC-7)')
  }

  // RFC-7 §4: defaultEnvelope MUST be immutable
  if (!Object.isFrozen(defaultEnvelope)) {
    throw new Error('defaultEnvelope must be immutable (Object.freeze)')
  }

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

  function emitDecision(
    taskId: TaskID,
    decision: Decision,
    envelope: DecisionEnvelope,
    envelopeNarrowed: boolean
  ): void {
    if (!onDecision) return

    const pressure = amigdala.snapshot()
    const event: DecisionEvent = {
      taskId,
      decision,
      envelopeId: envelope.id,
      envelopeNarrowed,
      eligibleCandidatesCount: envelope.eligibleCandidates.length,
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
      // 1. Resolve envelope (RFC-7 §6.3)
      const envelope = envelopeResolver.resolve(task.metadata.intent ?? '') ?? defaultEnvelope

      // Calculate narrowing for observability
      const envelopeNarrowed = envelope.eligibleCandidates.length < registry.count()

      // 2. Get pressure snapshot
      const pressure = amigdala.snapshot()
      const runtimeState = getOrCreateRuntimeState(task.id)

      // 3. Check budget exhaustion
      if (runtimeState.spawnCount >= task.metadata.spawnBudget) {
        const decision: Decision = {
          type: 'drop',
          reason: 'spawn_budget_exhausted',
          currentDepth: runtimeState.retryDepth,
        }
        emitDecision(task.id, decision, envelope, envelopeNarrowed)
        return decision
      }

      if (runtimeState.retryDepth >= task.metadata.maxRetryDepth) {
        const decision: Decision = {
          type: 'drop',
          reason: 'retry_depth_exhausted',
          currentDepth: runtimeState.retryDepth,
        }
        emitDecision(task.id, decision, envelope, envelopeNarrowed)
        return decision
      }

      // 4. Drop gate - MASK SEMANTICS (RFC-6.1 §6.0)
      // If allowDrop is false, drop is NEVER considered (pressure check skipped)
      // If allowDrop is true, pressure may cause drop
      const avgPressure = (pressure.memory + pressure.queueDepth + pressure.spawnSaturation) / 3
      const shouldDropForPressure = envelope.allowDrop && avgPressure > 0.9

      if (shouldDropForPressure) {
        const decision: Decision = {
          type: 'drop',
          reason: 'pressure_exceeded',
          currentDepth: runtimeState.retryDepth,
        }
        emitDecision(task.id, decision, envelope, envelopeNarrowed)
        return decision
      }

      // 5. Select via distributor (envelope-bounded, RFC-7 §7.2)
      const group = distributor.select(task, envelope, runtimeState, pressure)

      if (!group) {
        // Strategy couldn't select - drop
        const decision: Decision = {
          type: 'drop',
          reason: 'spawn_budget_exhausted',
          currentDepth: runtimeState.retryDepth,
        }
        emitDecision(task.id, decision, envelope, envelopeNarrowed)
        return decision
      }

      // 6. Dispatch via primary (fire-and-forget)
      group.primary.dispatch(task)

      // 7. Update runtime state
      runtimeState.spawnCount++
      runtimeState.lastAttemptAt = Date.now()
      runtimeStates.set(task.id, runtimeState)

      const decision: Decision = { type: 'dispatch' }
      emitDecision(task.id, decision, envelope, envelopeNarrowed)
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
