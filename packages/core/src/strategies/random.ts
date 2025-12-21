/**
 * Random Spawn Strategy (RFC-2 §4.3)
 *
 * Used for:
 * - cold start
 * - bias reset
 * - exploration
 *
 * Randomness is bounded and never exclusive.
 */

import type { SpawnStrategy, StrategyContext, StrategyResult } from './types.js'
import { checkEligibility } from './types.js'

/**
 * Random spawn strategy configuration
 */
export interface RandomConfig {
  /** Available sub-routine IDs to choose from */
  subRoutineIds: readonly string[]
  /** Random number generator (default: Math.random) */
  random?: () => number
}

/**
 * Create random spawn strategy
 *
 * Bounded random selection from available sub-routines.
 */
export function createRandomStrategy(config: RandomConfig): SpawnStrategy {
  const { subRoutineIds, random = Math.random } = config

  if (subRoutineIds.length === 0) {
    throw new Error('RandomStrategy requires at least one subRoutineId')
  }

  return {
    name: 'random',

    select(context: StrategyContext): StrategyResult {
      const { task, runtimeState, factory } = context

      // Check budget eligibility
      const eligibility = checkEligibility(task, runtimeState)
      if (!eligibility.eligible) {
        return null
      }

      // Bounded random selection
      const index = Math.floor(random() * subRoutineIds.length)
      const subRoutineId = subRoutineIds[index]!

      return {
        primary: factory.create(subRoutineId),
        cooperatives: [],
      }
    },
  }
}
