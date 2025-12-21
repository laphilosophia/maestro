/**
 * SubRoutine base implementation (RFC-6 §8)
 *
 * Rules:
 * - No return
 * - No await
 * - No callback
 */

import type { SubRoutine } from '../types/subroutine.js'
import type { Task } from '../types/task.js'

/**
 * Dispatch handler type
 *
 * Fire-and-forget: MUST NOT return meaningful values.
 */
export type DispatchHandler = (task: Task) => void

/**
 * Create a basic sub-routine
 *
 * @param handler - Fire-and-forget dispatch handler
 */
export function createSubRoutine(handler: DispatchHandler): SubRoutine {
  return {
    dispatch(task: Task): void {
      handler(task)
      // No return, no callback, no await
    },
  }
}

/**
 * Create a no-op sub-routine (for testing)
 */
export function createNoopSubRoutine(): SubRoutine {
  return {
    dispatch(_task: Task): void {
      // Intentionally empty
    },
  }
}
