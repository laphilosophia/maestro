/**
 * Worker Gate
 *
 * Puts a Maestro decision gate in front of worker pools.
 * Answers: "Should this task be dispatched right now?"
 */

import {
  createAmigdala,
  createCircuitDistributor,
  createIntentBasedStrategy,
  createMainRoutine,
  createSimpleFactory,
  type Decision,
  type DecisionEventHandler,
  type MainRoutine,
  type Task,
} from '@maestro/core'

import { createPoolPressureSource, DEFAULT_MAX_QUEUE_DEPTH } from './pressure.js'
import type { WorkerGateConfig, WorkerGateMetrics, WorkerPool } from './types.js'

/**
 * Worker Gate interface
 */
export interface WorkerGate {
  /**
   * Submit task through the gate
   *
   * Returns decision immediately (sync).
   * If dispatch: task is sent to pool (fire-and-forget).
   * If drop: task is NOT sent to pool.
   */
  submit(task: Task): Decision

  /**
   * Get gate metrics
   */
  metrics(): WorkerGateMetrics

  /**
   * Get underlying MainRoutine (for advanced use cases)
   */
  readonly maestro: MainRoutine
}

/**
 * Extended config with optional Maestro override
 */
export interface WorkerGateFullConfig extends WorkerGateConfig {
  /**
   * Optional: provide your own MainRoutine
   * If not provided, a default one is created with intent-based strategy
   */
  readonly maestro?: MainRoutine

  /**
   * Optional: decision observer
   */
  readonly onDecision?: DecisionEventHandler
}

/**
 * Create a worker gate
 *
 * The gate puts a Maestro decision layer in front of your worker pool.
 * Tasks are only dispatched if Maestro admits them.
 *
 * @example
 * ```typescript
 * const gate = createWorkerGate({ pool: myWorkerPool })
 *
 * const decision = gate.submit(task)
 * if (decision.type === 'drop') {
 *   console.log(`Dropped: ${decision.reason}`)
 * }
 * ```
 */
export function createWorkerGate(config: WorkerGateFullConfig): WorkerGate {
  const { pool, maxQueueDepth, onDecision } = config

  // Metrics tracking
  let admissionCount = 0
  let dropCount = 0
  let lastSnapshot = pool.snapshot()

  // Create Maestro components if not provided
  const maestro =
    config.maestro ??
    createDefaultMaestro(pool, maxQueueDepth ?? DEFAULT_MAX_QUEUE_DEPTH, onDecision)

  return {
    submit(task: Task): Decision {
      // Capture pool state before decision
      lastSnapshot = pool.snapshot()

      // Get decision from Maestro
      const decision = maestro.admit(task)

      // Track metrics
      if (decision.type === 'dispatch') {
        admissionCount++
        // Fire-and-forget dispatch to pool
        pool.dispatch(task)
      } else if (decision.type === 'drop') {
        dropCount++
      }

      return decision
    },

    metrics(): WorkerGateMetrics {
      return {
        admissionCount,
        dropCount,
        lastPressure: {
          utilization: lastSnapshot.utilization,
          queueDepth: lastSnapshot.queueDepth,
        },
      }
    },

    maestro,
  }
}

/**
 * Create default Maestro with pool-based pressure
 */
function createDefaultMaestro(
  pool: WorkerPool,
  maxQueueDepth: number,
  onDecision?: DecisionEventHandler
): MainRoutine {
  const pressureSource = createPoolPressureSource(pool, { maxQueueDepth })
  const amigdala = createAmigdala({ source: pressureSource })

  const strategy = createIntentBasedStrategy()
  const factory = createSimpleFactory((): void => {
    // No-op: actual dispatch is handled by gate.submit()
  })

  const distributor = createCircuitDistributor({ strategy, factory })

  return createMainRoutine(
    onDecision ? { amigdala, distributor, onDecision } : { amigdala, distributor }
  )
}
