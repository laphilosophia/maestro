/**
 * Performance Penalty Spawn Strategy (RFC-2 §4.4)
 *
 * Only negative bias is allowed:
 * - slow or costly paths are penalized
 * - no positive reinforcement permitted
 * - penalties decay over time (forgetting curve)
 */

import { decayWeight } from '../utils/forgetting-curve.js'
import type { SpawnStrategy, StrategyContext, StrategyResult } from './types.js'
import { checkEligibility } from './types.js'

/**
 * Penalty record for a sub-routine
 */
export interface PenaltyRecord {
  /** Penalty amount (higher = worse) */
  penalty: number
  /** Time penalty was recorded (epoch ms) */
  recordedAt: number
}

/**
 * Performance penalty strategy configuration
 */
export interface PerformancePenaltyConfig {
  /** Available sub-routine IDs */
  subRoutineIds: readonly string[]
  /** Penalty threshold - skip if weighted penalty exceeds this */
  penaltyThreshold?: number
}

/**
 * Performance penalty tracker
 */
export interface PenaltyTracker {
  /** Apply a penalty to a sub-routine */
  penalize(subRoutineId: string, penalty: number): void
  /** Get current effective penalty (with decay) */
  getEffectivePenalty(subRoutineId: string): number
}

/**
 * Create in-memory penalty tracker
 */
export function createPenaltyTracker(): PenaltyTracker {
  const penalties = new Map<string, PenaltyRecord[]>()

  return {
    penalize(subRoutineId: string, penalty: number): void {
      const records = penalties.get(subRoutineId) ?? []
      records.push({ penalty, recordedAt: Date.now() })
      penalties.set(subRoutineId, records)

      // Prune old records (older than 30 minutes)
      const cutoff = Date.now() - 30 * 60 * 1000
      const filtered = records.filter((r) => r.recordedAt > cutoff)
      penalties.set(subRoutineId, filtered)
    },

    getEffectivePenalty(subRoutineId: string): number {
      const records = penalties.get(subRoutineId) ?? []
      const now = Date.now()

      let total = 0
      for (const record of records) {
        const elapsed = now - record.recordedAt
        const weight = decayWeight(elapsed)
        total += record.penalty * weight
      }

      return total
    },
  }
}

/**
 * Create performance penalty spawn strategy
 *
 * Selects sub-routine with lowest effective penalty.
 */
export function createPerformancePenaltyStrategy(
  config: PerformancePenaltyConfig,
  tracker: PenaltyTracker
): SpawnStrategy {
  const { subRoutineIds, penaltyThreshold = Infinity } = config

  if (subRoutineIds.length === 0) {
    throw new Error('PerformancePenaltyStrategy requires at least one subRoutineId')
  }

  return {
    name: 'performance-penalty',

    select(context: StrategyContext): StrategyResult {
      const { task, runtimeState, factory } = context

      // Check budget eligibility
      const eligibility = checkEligibility(task, runtimeState)
      if (!eligibility.eligible) {
        return null
      }

      // Find sub-routine with lowest penalty (negative bias only)
      let bestId: string | undefined
      let lowestPenalty = Infinity

      for (const id of subRoutineIds) {
        const penalty = tracker.getEffectivePenalty(id)
        if (penalty < lowestPenalty) {
          lowestPenalty = penalty
          bestId = id
        }
      }

      // Skip if all routes exceed penalty threshold
      if (lowestPenalty > penaltyThreshold) {
        return null
      }

      return {
        primary: factory.create(bestId!),
        cooperatives: [],
      }
    },
  }
}
