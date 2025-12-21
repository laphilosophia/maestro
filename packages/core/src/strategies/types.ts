/**
 * Spawn Strategy Types (RFC-2 §3-4)
 *
 * Spawn strategies select SubRoutineGroups.
 * Strategies MUST NOT produce multiple commit-capable candidates.
 */

import type { PressureSignal } from '../types/pressure.js'
import type { TaskRuntimeState } from '../types/runtime-state.js'
import type { SubRoutine, SubRoutineGroup } from '../types/subroutine.js'
import type { Task } from '../types/task.js'

/**
 * Sub-routine factory - creates sub-routines for dispatch
 */
export interface SubRoutineFactory {
  /** Create a sub-routine with given ID */
  create(id: string): SubRoutine
}

/**
 * Strategy context - all inputs available for strategy decision
 */
export interface StrategyContext {
  readonly task: Task
  readonly runtimeState: TaskRuntimeState
  readonly pressure: PressureSignal
  readonly factory: SubRoutineFactory
}

/**
 * Strategy result
 *
 * - null means strategy could not select (pass to next)
 * - SubRoutineGroup means successful selection
 */
export type StrategyResult = SubRoutineGroup | null

/**
 * Spawn strategy interface (RFC-2 §3)
 *
 * Strategies define how sub-routine candidates are selected.
 */
export interface SpawnStrategy {
  /** Strategy name for observability */
  readonly name: string

  /**
   * Attempt to select a SubRoutineGroup
   *
   * @returns SubRoutineGroup if selection successful, null otherwise
   */
  select(context: StrategyContext): StrategyResult
}

/**
 * Eligibility check result
 */
export interface EligibilityResult {
  readonly eligible: boolean
  readonly reason?: string
}

/**
 * Check if task is eligible for spawn based on budgets
 */
export function checkEligibility(task: Task, runtimeState: TaskRuntimeState): EligibilityResult {
  if (runtimeState.spawnCount >= task.metadata.spawnBudget) {
    return { eligible: false, reason: 'spawn_budget_exhausted' }
  }
  if (runtimeState.retryDepth >= task.metadata.maxRetryDepth) {
    return { eligible: false, reason: 'retry_depth_exhausted' }
  }
  return { eligible: true }
}
