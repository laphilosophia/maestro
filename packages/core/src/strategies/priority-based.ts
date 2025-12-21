/**
 * Priority-Based Spawn Strategy (RFC-2 §4.2)
 *
 * Selection influenced by:
 * - priority
 * - retry depth
 * - pressure level
 *
 * Priority NEVER bypasses drop conditions.
 */

import type { SpawnStrategy, StrategyContext, StrategyResult } from './types.js'
import { checkEligibility } from './types.js'

/**
 * Priority threshold configuration
 */
export interface PriorityThreshold {
  /** Minimum priority to use this sub-routine (0-100) */
  minPriority: number
  /** Maximum pressure for this threshold (0-1) */
  maxPressure: number
  /** Sub-routine ID to use */
  subRoutineId: string
}

/**
 * Priority-based spawn strategy configuration
 */
export interface PriorityBasedConfig {
  /** Thresholds ordered by preference (first match wins) */
  thresholds: readonly PriorityThreshold[]
  /** Fallback sub-routine ID when no threshold matches */
  fallbackId?: string
}

/**
 * Create priority-based spawn strategy
 *
 * Uses 3D selection: priority × retryDepth × pressure
 */
export function createPriorityBasedStrategy(config: PriorityBasedConfig): SpawnStrategy {
  const { thresholds, fallbackId = 'default' } = config

  return {
    name: 'priority-based',

    select(context: StrategyContext): StrategyResult {
      const { task, runtimeState, pressure, factory } = context

      // Check budget eligibility first - priority never bypasses
      const eligibility = checkEligibility(task, runtimeState)
      if (!eligibility.eligible) {
        return null
      }

      const taskPriority = task.metadata.priority ?? 50
      const avgPressure = (pressure.memory + pressure.queueDepth + pressure.spawnSaturation) / 3

      // Adjust effective priority based on retry depth
      // Each retry increases effective priority (up to limit)
      const retryBoost = Math.min(runtimeState.retryDepth * 5, 20)
      const effectivePriority = Math.min(taskPriority + retryBoost, 100)

      // Find matching threshold
      let matchedId: string | undefined

      for (const threshold of thresholds) {
        if (effectivePriority >= threshold.minPriority && avgPressure <= threshold.maxPressure) {
          matchedId = threshold.subRoutineId
          break
        }
      }

      // Use fallback if no match
      const subRoutineId = matchedId ?? fallbackId

      return {
        primary: factory.create(subRoutineId),
        cooperatives: [],
      }
    },
  }
}
