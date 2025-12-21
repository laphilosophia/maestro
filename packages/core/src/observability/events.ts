/**
 * Observability Events (RFC-3, RFC-6 §12)
 *
 * Observability exists to answer:
 * > "Why did Maestro make this decision?"
 *
 * Not:
 * > "What happened next?"
 */

import type { Decision, DropReason } from '../types/decision.js'
import type { TaskID } from '../types/task.js'

/**
 * Decision event (RFC-6 §12)
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
 * Event types for observability (RFC-3 §3)
 */
export type ObservabilityEventType =
  | 'task_admitted'
  | 'subroutine_spawned'
  | 'cooperative_carry_invoked'
  | 'retry_attempted'
  | 'escalation_triggered'
  | 'task_dropped'
  | 'pressure_changed'
  | 'policy_adjusted'

/**
 * Base observability event
 */
export interface ObservabilityEvent {
  readonly type: ObservabilityEventType
  readonly timestamp: number
  readonly taskId?: TaskID
  readonly metadata?: Record<string, unknown>
}

/**
 * Drop diagnostic (RFC-3 §4)
 *
 * Every drop MUST include:
 * - terminal reason
 * - retry depth
 * - spawn budget usage
 * - pressure level
 */
export interface DropDiagnostic {
  readonly taskId: TaskID
  readonly reason: DropReason
  readonly retryDepth: number
  readonly spawnCount: number
  readonly spawnBudget: number
  readonly pressure: {
    readonly memory: number
    readonly queueDepth: number
    readonly spawnSaturation: number
  }
  readonly timestamp: number
}

/**
 * Create drop diagnostic from decision event and runtime info
 */
export function createDropDiagnostic(
  taskId: TaskID,
  reason: DropReason,
  runtimeInfo: {
    retryDepth: number
    spawnCount: number
    spawnBudget: number
  },
  pressure: { memory: number; queueDepth: number; spawnSaturation: number }
): DropDiagnostic {
  return {
    taskId,
    reason,
    retryDepth: runtimeInfo.retryDepth,
    spawnCount: runtimeInfo.spawnCount,
    spawnBudget: runtimeInfo.spawnBudget,
    pressure,
    timestamp: Date.now(),
  }
}

/**
 * Metrics collector interface (RFC-3 §5)
 */
export interface MetricsCollector {
  /** Record admission */
  recordAdmission(): void
  /** Record retry */
  recordRetry(): void
  /** Record escalation */
  recordEscalation(): void
  /** Record drop with reason */
  recordDrop(reason: DropReason): void
  /** Get current metrics snapshot */
  getMetrics(): MetricsSnapshot
}

/**
 * Metrics snapshot
 */
export interface MetricsSnapshot {
  readonly admissionCount: number
  readonly retryCount: number
  readonly escalationCount: number
  readonly dropCount: number
  readonly dropsByReason: Readonly<Record<DropReason, number>>
  readonly admissionRate: number // per second
  readonly dropRate: number // per second
}

/**
 * Create in-memory metrics collector
 */
export function createMetricsCollector(): MetricsCollector {
  let admissionCount = 0
  let retryCount = 0
  let escalationCount = 0
  let dropCount = 0
  const dropsByReason: Record<DropReason, number> = {
    spawn_budget_exhausted: 0,
    retry_depth_exhausted: 0,
    pressure_exceeded: 0,
  }

  const startTime = Date.now()

  return {
    recordAdmission(): void {
      admissionCount++
    },

    recordRetry(): void {
      retryCount++
    },

    recordEscalation(): void {
      escalationCount++
    },

    recordDrop(reason: DropReason): void {
      dropCount++
      dropsByReason[reason]++
    },

    getMetrics(): MetricsSnapshot {
      const elapsedSeconds = (Date.now() - startTime) / 1000 || 1

      return {
        admissionCount,
        retryCount,
        escalationCount,
        dropCount,
        dropsByReason,
        admissionRate: admissionCount / elapsedSeconds,
        dropRate: dropCount / elapsedSeconds,
      }
    },
  }
}
