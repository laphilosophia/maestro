/**
 * Intent-Based Spawn Strategy (RFC-2 §4.1)
 *
 * Default strategy. Selection based on declared task metadata:
 * - intent
 * - expected cost
 * - resource hints
 *
 * Payload inspection is forbidden.
 */

import type { SpawnStrategy, StrategyContext, StrategyResult } from './types.js'
import { checkEligibility } from './types.js'

/**
 * Intent-based spawn strategy configuration
 */
export interface IntentBasedConfig {
  /**
   * Map intent names to sub-routine IDs
   * Default sub-routine ID used if intent not found
   */
  intentMap?: Record<string, string>

  /** Default sub-routine ID when intent not matched */
  defaultSubRoutineId?: string
}

/**
 * Create intent-based spawn strategy
 *
 * Selection based on task.metadata.intent field.
 */
export function createIntentBasedStrategy(config?: IntentBasedConfig): SpawnStrategy {
  const intentMap = config?.intentMap ?? {}
  const defaultId = config?.defaultSubRoutineId ?? 'default'

  return {
    name: 'intent-based',

    select(context: StrategyContext): StrategyResult {
      const { task, runtimeState, factory } = context

      // Check budget eligibility first
      const eligibility = checkEligibility(task, runtimeState)
      if (!eligibility.eligible) {
        return null
      }

      // Resolve sub-routine ID from intent
      const intent = task.metadata.intent
      const subRoutineId =
        intent !== undefined && intent in intentMap ? intentMap[intent]! : defaultId

      // Create primary sub-routine (sole commit authority)
      const primary = factory.create(subRoutineId)

      return {
        primary,
        cooperatives: [],
      }
    },
  }
}
