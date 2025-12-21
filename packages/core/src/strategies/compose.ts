/**
 * Strategy Composition (RFC-2 §5)
 *
 * Spawn strategies MUST be applied in this order:
 * 1. Intent eligibility
 * 2. Priority × pressure modulation
 * 3. Performance penalty
 * 4. Bounded random selection
 */

import type { SpawnStrategy, StrategyContext, StrategyResult } from './types.js'

/**
 * Compose multiple strategies into a single strategy
 *
 * Strategies are tried in order. First non-null result wins.
 */
export function composeStrategies(strategies: readonly SpawnStrategy[]): SpawnStrategy {
  return {
    name: `composed(${strategies.map((s) => s.name).join(',')})`,

    select(context: StrategyContext): StrategyResult {
      for (const strategy of strategies) {
        const result = strategy.select(context)
        if (result !== null) {
          return result
        }
      }
      return null
    },
  }
}

/**
 * Create standard RFC-compliant strategy stack
 *
 * Order: intent → priority → penalty → random
 */
export function createStandardStrategyStack(strategies: {
  intent: SpawnStrategy
  priority: SpawnStrategy
  penalty: SpawnStrategy
  random: SpawnStrategy
}): SpawnStrategy {
  return composeStrategies([
    strategies.intent,
    strategies.priority,
    strategies.penalty,
    strategies.random,
  ])
}
