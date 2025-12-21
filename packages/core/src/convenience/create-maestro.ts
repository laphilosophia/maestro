/**
 * Quick-Start Convenience Wrapper
 *
 * ⚠️ FOR EVALUATION AND DEMOS ONLY
 *
 * This helper uses:
 * - No-op pressure source (always low pressure)
 * - Fixed intent-based strategy
 * - No performance penalty tracking
 *
 * Production systems MUST compose Maestro explicitly.
 */

import { createAmigdala, noopPressureSource } from '../components/amigdala.js'
import { createCircuitDistributor, createSimpleFactory } from '../components/circuit-distributor.js'
import type { DecisionEventHandler } from '../components/main-routine.js'
import { createMainRoutine, type MainRoutine } from '../components/main-routine.js'
import { createIntentBasedStrategy } from '../strategies/intent-based.js'
import type { Task } from '../types/task.js'

/**
 * Dispatch observer - fire-and-forget signal
 *
 * MUST NOT:
 * - block
 * - await
 * - throw
 */
export type DispatchObserver = (info: { readonly task: Task; readonly routeId: string }) => void

/**
 * Decision observer - called after every decision
 */
export type DecisionObserver = DecisionEventHandler

/**
 * Quick-start configuration
 *
 * Intentionally minimal. For full control, compose explicitly.
 */
export interface QuickStartConfig {
  /**
   * Called when a task is dispatched.
   * Fire-and-forget: MUST NOT block, await, or throw.
   */
  onDispatch?: DispatchObserver

  /**
   * Called after every decision (dispatch, retry, escalate, drop)
   */
  onDecision?: DecisionObserver

  /**
   * Intent-to-route mapping (optional)
   * Default: all tasks go to 'default' route
   */
  intentMap?: Record<string, string>
}

/**
 * Create Maestro with sensible defaults
 *
 * ⚠️ FOR EVALUATION AND DEMOS ONLY
 *
 * Uses:
 * - No-op pressure source
 * - Intent-based strategy
 * - No penalty tracking
 *
 * @example
 * ```typescript
 * const maestro = createMaestro({
 *   onDispatch: ({ task, routeId }) => {
 *     console.log(`${task.id} → ${routeId}`)
 *   }
 * })
 *
 * maestro.admit({ id: 'task-1', metadata: { ... } })
 * ```
 */
export function createMaestro(config?: QuickStartConfig): MainRoutine {
  const { onDispatch, onDecision, intentMap } = config ?? {}

  // Fixed: No-op pressure (always low)
  const amigdala = createAmigdala({ source: noopPressureSource })

  // Fixed: Intent-based strategy only
  const strategy = createIntentBasedStrategy(
    intentMap ? { intentMap, defaultSubRoutineId: 'default' } : { defaultSubRoutineId: 'default' }
  )

  // Factory wraps dispatch observer
  const factory = createSimpleFactory((task: Task, routeId: string): void => {
    if (onDispatch) {
      onDispatch({ task, routeId })
    }
  })

  const distributor = createCircuitDistributor({ strategy, factory })

  return createMainRoutine(
    onDecision ? { amigdala, distributor, onDecision } : { amigdala, distributor }
  )
}
