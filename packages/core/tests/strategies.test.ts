import { beforeEach, describe, expect, it, vi } from 'vitest'
import { composeStrategies, createStandardStrategyStack } from '../src/strategies/compose.js'
import { createIntentBasedStrategy } from '../src/strategies/intent-based.js'
import {
  createPenaltyTracker,
  createPerformancePenaltyStrategy,
} from '../src/strategies/performance-penalty.js'
import { createPriorityBasedStrategy } from '../src/strategies/priority-based.js'
import { createRandomStrategy } from '../src/strategies/random.js'
import type { StrategyContext, SubRoutineFactory } from '../src/strategies/types.js'
import { checkEligibility } from '../src/strategies/types.js'
import type { PressureSignal } from '../src/types/pressure.js'
import type { TaskRuntimeState } from '../src/types/runtime-state.js'
import type { SubRoutine } from '../src/types/subroutine.js'
import type { Task } from '../src/types/task.js'

// Test helpers
function createMockTask(overrides?: Partial<Task['metadata']>): Task {
  return {
    id: 'test-task-1',
    metadata: {
      spawnBudget: 5,
      maxRetryDepth: 3,
      createdAt: Date.now(),
      ...overrides,
    },
  }
}

function createMockRuntimeState(overrides?: Partial<TaskRuntimeState>): TaskRuntimeState {
  return {
    spawnCount: 0,
    retryDepth: 0,
    lastAttemptAt: Date.now(),
    ...overrides,
  }
}

function createMockPressure(overrides?: Partial<PressureSignal>): PressureSignal {
  return {
    memory: 0.3,
    queueDepth: 0.2,
    spawnSaturation: 0.1,
    timestamp: Date.now(),
    ...overrides,
  }
}

function createMockFactory(): SubRoutineFactory & { created: string[] } {
  const created: string[] = []
  return {
    created,
    create(id: string): SubRoutine {
      created.push(id)
      return {
        dispatch: vi.fn(),
      }
    },
  }
}

function createContext(
  task: Task = createMockTask(),
  runtimeState: TaskRuntimeState = createMockRuntimeState(),
  pressure: PressureSignal = createMockPressure()
): StrategyContext & { factory: ReturnType<typeof createMockFactory> } {
  const factory = createMockFactory()
  return { task, runtimeState, pressure, factory }
}

describe('checkEligibility', () => {
  it('returns eligible when within budgets', () => {
    const task = createMockTask({ spawnBudget: 5, maxRetryDepth: 3 })
    const state = createMockRuntimeState({ spawnCount: 2, retryDepth: 1 })
    expect(checkEligibility(task, state)).toEqual({ eligible: true })
  })

  it('returns ineligible when spawn budget exhausted', () => {
    const task = createMockTask({ spawnBudget: 3 })
    const state = createMockRuntimeState({ spawnCount: 3 })
    expect(checkEligibility(task, state)).toEqual({
      eligible: false,
      reason: 'spawn_budget_exhausted',
    })
  })

  it('returns ineligible when retry depth exhausted', () => {
    const task = createMockTask({ maxRetryDepth: 2 })
    const state = createMockRuntimeState({ retryDepth: 2 })
    expect(checkEligibility(task, state)).toEqual({
      eligible: false,
      reason: 'retry_depth_exhausted',
    })
  })
})

describe('IntentBasedStrategy (RFC-2 §4.1)', () => {
  it('selects based on intent map', () => {
    const strategy = createIntentBasedStrategy({
      intentMap: { fast: 'fast-route', slow: 'slow-route' },
      defaultSubRoutineId: 'default',
    })

    const ctx = createContext(createMockTask({ intent: 'fast' }))
    const result = strategy.select(ctx)

    expect(result).not.toBeNull()
    expect(ctx.factory.created).toEqual(['fast-route'])
  })

  it('uses default when intent not in map', () => {
    const strategy = createIntentBasedStrategy({
      intentMap: { fast: 'fast-route' },
      defaultSubRoutineId: 'fallback',
    })

    const ctx = createContext(createMockTask({ intent: 'unknown' }))
    strategy.select(ctx)

    expect(ctx.factory.created).toEqual(['fallback'])
  })

  it('returns null when budget exhausted', () => {
    const strategy = createIntentBasedStrategy()
    const ctx = createContext(
      createMockTask({ spawnBudget: 1 }),
      createMockRuntimeState({ spawnCount: 1 })
    )

    expect(strategy.select(ctx)).toBeNull()
  })
})

describe('PriorityBasedStrategy (RFC-2 §4.2)', () => {
  it('selects based on priority and pressure', () => {
    const strategy = createPriorityBasedStrategy({
      thresholds: [
        { minPriority: 80, maxPressure: 0.5, subRoutineId: 'premium' },
        { minPriority: 50, maxPressure: 0.8, subRoutineId: 'standard' },
      ],
      fallbackId: 'fallback',
    })

    const ctx = createContext(
      createMockTask({ priority: 90 }),
      createMockRuntimeState(),
      createMockPressure({ memory: 0.3, queueDepth: 0.3, spawnSaturation: 0.3 })
    )
    strategy.select(ctx)

    expect(ctx.factory.created).toEqual(['premium'])
  })

  it('boosts priority based on retry depth', () => {
    const strategy = createPriorityBasedStrategy({
      thresholds: [{ minPriority: 70, maxPressure: 1, subRoutineId: 'boosted' }],
      fallbackId: 'fallback',
    })

    // Priority 60 + retry boost (2 * 5 = 10) = 70
    const ctx = createContext(
      createMockTask({ priority: 60 }),
      createMockRuntimeState({ retryDepth: 2 })
    )
    strategy.select(ctx)

    expect(ctx.factory.created).toEqual(['boosted'])
  })

  it('never bypasses budget exhaustion', () => {
    const strategy = createPriorityBasedStrategy({
      thresholds: [{ minPriority: 0, maxPressure: 1, subRoutineId: 'any' }],
    })

    const ctx = createContext(
      createMockTask({ priority: 100, spawnBudget: 0 }),
      createMockRuntimeState({ spawnCount: 0 })
    )

    expect(strategy.select(ctx)).toBeNull()
  })
})

describe('RandomStrategy (RFC-2 §4.3)', () => {
  it('selects from available options', () => {
    let callCount = 0
    const strategy = createRandomStrategy({
      subRoutineIds: ['a', 'b', 'c'],
      random: () => {
        callCount++
        return 0.5 // Should pick index 1 = 'b'
      },
    })

    const ctx = createContext()
    strategy.select(ctx)

    expect(ctx.factory.created).toEqual(['b'])
    expect(callCount).toBe(1)
  })

  it('throws if no subRoutineIds provided', () => {
    expect(() => createRandomStrategy({ subRoutineIds: [] })).toThrow()
  })
})

describe('PerformancePenaltyStrategy (RFC-2 §4.4)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('selects route with lowest penalty', () => {
    const tracker = createPenaltyTracker()
    tracker.penalize('slow', 100)

    const strategy = createPerformancePenaltyStrategy({ subRoutineIds: ['slow', 'fast'] }, tracker)

    const ctx = createContext()
    strategy.select(ctx)

    expect(ctx.factory.created).toEqual(['fast'])
  })

  it('penalties decay over time', () => {
    const tracker = createPenaltyTracker()
    tracker.penalize('route', 100)

    const initialPenalty = tracker.getEffectivePenalty('route')

    vi.advanceTimersByTime(5 * 60 * 1000) // Half-life

    const decayedPenalty = tracker.getEffectivePenalty('route')
    expect(decayedPenalty).toBeCloseTo(initialPenalty * 0.5, 1)
  })

  it('returns null when all routes exceed threshold', () => {
    const tracker = createPenaltyTracker()
    tracker.penalize('a', 100)
    tracker.penalize('b', 100)

    const strategy = createPerformancePenaltyStrategy(
      { subRoutineIds: ['a', 'b'], penaltyThreshold: 50 },
      tracker
    )

    const ctx = createContext()
    expect(strategy.select(ctx)).toBeNull()
  })
})

describe('Strategy Composition (RFC-2 §5)', () => {
  it('tries strategies in order until one succeeds', () => {
    const failing = { name: 'failing', select: () => null }
    const ctx = createContext()
    const succeeding = {
      name: 'succeeding',
      select: () => ({
        primary: ctx.factory.create('success'),
        cooperatives: [],
      }),
    }

    const composed = composeStrategies([failing, succeeding])
    const result = composed.select(ctx)

    expect(result).not.toBeNull()
    expect(ctx.factory.created).toEqual(['success'])
  })

  it('returns null if all strategies fail', () => {
    const failing1 = { name: 'f1', select: () => null }
    const failing2 = { name: 'f2', select: () => null }

    const composed = composeStrategies([failing1, failing2])
    const ctx = createContext()

    expect(composed.select(ctx)).toBeNull()
  })

  it('createStandardStrategyStack follows RFC order', () => {
    const calls: string[] = []
    const makeStrategy = (name: string) => ({
      name,
      select: () => {
        calls.push(name)
        return null // Always fail to test order
      },
    })

    const stack = createStandardStrategyStack({
      intent: makeStrategy('intent'),
      priority: makeStrategy('priority'),
      penalty: makeStrategy('penalty'),
      random: makeStrategy('random'),
    })

    const ctx = createContext()
    stack.select(ctx)

    expect(calls).toEqual(['intent', 'priority', 'penalty', 'random'])
  })
})
