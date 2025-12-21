import type { Task } from './task.js'

/**
 * SubRoutine - Ephemeral courier (RFC-6 §8)
 *
 * Rules:
 * - No return
 * - No await
 * - No callback
 */
export interface SubRoutine {
  /**
   * Dispatch task to external destination
   *
   * Fire-and-forget: MUST NOT return, await, or callback.
   */
  dispatch(task: Task): void
}

/**
 * SubRoutineGroup - Cooperative carrying structure (RFC-6 §9)
 *
 * Semantics:
 * - primary: Holds exclusive commit right
 * - cooperatives: Share transport pressure only
 * - When primary commits, cooperatives receive pre-dispatch abort
 * - No race condition: commit authority is singular
 */
export interface SubRoutineGroup {
  /** Sole sub-routine with commit authority */
  readonly primary: SubRoutine

  /** Load-sharing sub-routines (no dispatch rights) */
  readonly cooperatives: readonly SubRoutine[]
}
