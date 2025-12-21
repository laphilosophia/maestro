/**
 * @maestro/worker-gate
 *
 * Worker pool gate adapter for Maestro decision fabric.
 *
 * This adapter puts a decision gate in front of worker pools,
 * answering: "Should this task be dispatched right now?"
 */

import type { Task } from '@maestro/core'

// =============================================================================
// WORKER POOL INTERFACE
// =============================================================================

/**
 * Metrics snapshot from worker pool
 *
 * All values are point-in-time measurements.
 * No side effects, no computation.
 */
export interface WorkerPoolSnapshot {
  /**
   * Current utilization (0..1)
   * Ratio of active workers to total capacity
   */
  readonly utilization: number

  /**
   * Current queue depth (integer)
   * Number of tasks waiting for workers
   */
  readonly queueDepth: number
}

/**
 * Generic worker pool interface
 *
 * Maestro does not manage pools - it only:
 * - Dispatches tasks (fire-and-forget)
 * - Reads metrics (pull-based)
 *
 * CRITICAL: dispatch MUST be fire-and-forget.
 * MUST NOT return Promise, result, or callback.
 */
export interface WorkerPool {
  /**
   * Dispatch task to worker pool
   *
   * Fire-and-forget semantics:
   * - MUST NOT return Promise
   * - MUST NOT block
   * - MUST NOT throw on pool full (Maestro handles admission)
   *
   * The pool is responsible for resolving task.id to actual work.
   */
  dispatch(task: Task): void

  /**
   * Get current pool state
   *
   * Pull-based, side-effect free.
   * Called before every admission decision.
   */
  snapshot(): WorkerPoolSnapshot
}

// =============================================================================
// WORKER GATE CONFIG
// =============================================================================

/**
 * Configuration for worker gate
 *
 * Note: Gate does NOT configure Maestro.
 * Gate USES an already-configured MainRoutine.
 */
export interface WorkerGateConfig {
  /**
   * Worker pool to gate
   */
  readonly pool: WorkerPool

  /**
   * Maximum queue depth for pressure normalization
   * Default: 1000
   */
  readonly maxQueueDepth?: number
}

// =============================================================================
// WORKER GATE METRICS
// =============================================================================

/**
 * Gate-level metrics
 *
 * Minimal: admission count, drop count, last pressure.
 * Gate is not an analytics tool.
 */
export interface WorkerGateMetrics {
  readonly admissionCount: number
  readonly dropCount: number
  readonly lastPressure: {
    readonly utilization: number
    readonly queueDepth: number
  }
}
