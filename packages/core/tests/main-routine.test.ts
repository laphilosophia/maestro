import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAmigdala, type PressureSource } from '../src/components/amigdala.js'
import {
  createCircuitDistributor,
  createSimpleFactory,
} from '../src/components/circuit-distributor.js'
import { createMainRoutine, type DecisionEvent } from '../src/components/main-routine.js'
import { createIntentBasedStrategy } from '../src/strategies/intent-based.js'
import type { Task } from '../src/types/task.js'

function createTestTask(overrides?: Partial<Task['metadata']> & { id?: string }): Task {
  return {
    id: overrides?.id ?? `task-${Date.now()}`,
    metadata: {
      spawnBudget: 5,
      maxRetryDepth: 3,
      createdAt: Date.now(),
      ...overrides,
    },
  }
}

function createTestMainRoutine(options?: {
  pressure?: Partial<{ memory: number; queueDepth: number; spawnSaturation: number }>
  onDecision?: (event: DecisionEvent) => void
  onDispatch?: (task: Task, routeId: string) => void
}) {
  const pressureSource: PressureSource = {
    getMemoryPressure: () => options?.pressure?.memory ?? 0.3,
    getQueueDepthPressure: () => options?.pressure?.queueDepth ?? 0.2,
    getSpawnSaturation: () => options?.pressure?.spawnSaturation ?? 0.1,
  }

  const amigdala = createAmigdala({ source: pressureSource })
  const factory = createSimpleFactory(options?.onDispatch ?? vi.fn())
  const strategy = createIntentBasedStrategy({ defaultSubRoutineId: 'default' })
  const distributor = createCircuitDistributor({ strategy, factory })

  return createMainRoutine({
    amigdala,
    distributor,
    onDecision: options?.onDecision,
  })
}

describe('MainRoutine (RFC-0, RFC-1, RFC-6)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  describe('admit()', () => {
    it('dispatches task and returns dispatch decision', () => {
      const dispatched: Task[] = []
      const routine = createTestMainRoutine({
        onDispatch: (task) => dispatched.push(task),
      })

      const task = createTestTask()
      const decision = routine.admit(task)

      expect(decision.type).toBe('dispatch')
      expect(dispatched).toHaveLength(1)
      expect(dispatched[0]!.id).toBe(task.id)
    })

    it('increments spawn count on dispatch', () => {
      const routine = createTestMainRoutine()
      const task = createTestTask({ id: 'tracked-task' })

      routine.admit(task)
      const state = routine.getRuntimeState(task.id)

      expect(state?.spawnCount).toBe(1)
    })

    it('drops when spawn budget exhausted', () => {
      const routine = createTestMainRoutine()
      const task = createTestTask({ id: 'limited-task', spawnBudget: 2 })

      routine.admit(task)
      routine.admit(task)
      const decision = routine.admit(task)

      expect(decision.type).toBe('drop')
      if (decision.type === 'drop') {
        expect(decision.reason).toBe('spawn_budget_exhausted')
      }
    })

    it('drops when retry depth exhausted', () => {
      const routine = createTestMainRoutine()
      const task = createTestTask({ id: 'retry-task', maxRetryDepth: 2 })

      routine.admit(task)
      routine.signalRetry(task.id)
      routine.admit(task)
      routine.signalRetry(task.id)

      const decision = routine.admit(task)

      expect(decision.type).toBe('drop')
      if (decision.type === 'drop') {
        expect(decision.reason).toBe('retry_depth_exhausted')
      }
    })

    it('drops when pressure exceeds threshold', () => {
      const routine = createTestMainRoutine({
        pressure: { memory: 0.95, queueDepth: 0.95, spawnSaturation: 0.95 },
      })

      const task = createTestTask()
      const decision = routine.admit(task)

      expect(decision.type).toBe('drop')
      if (decision.type === 'drop') {
        expect(decision.reason).toBe('pressure_exceeded')
      }
    })
  })

  describe('signalRetry()', () => {
    it('increments retry depth', () => {
      const routine = createTestMainRoutine()
      const task = createTestTask({ id: 'retry-signal-task' })

      routine.admit(task)
      expect(routine.getRuntimeState(task.id)?.retryDepth).toBe(0)

      routine.signalRetry(task.id)
      expect(routine.getRuntimeState(task.id)?.retryDepth).toBe(1)

      routine.signalRetry(task.id)
      expect(routine.getRuntimeState(task.id)?.retryDepth).toBe(2)
    })
  })

  describe('observability', () => {
    it('emits DecisionEvent on every decision', () => {
      const events: DecisionEvent[] = []
      const routine = createTestMainRoutine({
        onDecision: (e) => events.push(e),
      })

      const task = createTestTask({ id: 'observed-task' })
      routine.admit(task)

      expect(events).toHaveLength(1)
      expect(events[0]!.taskId).toBe(task.id)
      expect(events[0]!.decision.type).toBe('dispatch')
      expect(events[0]!.pressure).toBeDefined()
      expect(events[0]!.timestamp).toBeDefined()
    })

    it('includes pressure snapshot in event', () => {
      const events: DecisionEvent[] = []
      const routine = createTestMainRoutine({
        pressure: { memory: 0.5, queueDepth: 0.3, spawnSaturation: 0.2 },
        onDecision: (e) => events.push(e),
      })

      routine.admit(createTestTask())

      expect(events[0]!.pressure.memory).toBe(0.5)
      expect(events[0]!.pressure.queueDepth).toBe(0.3)
      expect(events[0]!.pressure.spawnSaturation).toBe(0.2)
    })

    it('includes currentDepth in drop events', () => {
      const events: DecisionEvent[] = []
      const routine = createTestMainRoutine({
        onDecision: (e) => events.push(e),
      })

      const task = createTestTask({ id: 'drop-observed', spawnBudget: 1 })
      routine.admit(task)
      routine.signalRetry(task.id)
      routine.admit(task)

      const dropEvent = events.find((e) => e.decision.type === 'drop')
      expect(dropEvent).toBeDefined()
      if (dropEvent && dropEvent.decision.type === 'drop') {
        expect(dropEvent.decision.currentDepth).toBe(1)
      }
    })
  })

  describe('RFC compliance', () => {
    it('each task is decided in isolation', () => {
      const routine = createTestMainRoutine()

      const task1 = createTestTask({ id: 'isolated-1' })
      const task2 = createTestTask({ id: 'isolated-2' })

      routine.admit(task1)
      routine.admit(task1)
      routine.admit(task1)

      // task2 should not be affected by task1's state
      const state2 = routine.getRuntimeState(task2.id)
      expect(state2).toBeUndefined()

      routine.admit(task2)
      expect(routine.getRuntimeState(task2.id)?.spawnCount).toBe(1)
    })

    it('drop is terminal and observable', () => {
      const events: DecisionEvent[] = []
      const routine = createTestMainRoutine({
        onDecision: (e) => events.push(e),
      })

      const task = createTestTask({ id: 'terminal', spawnBudget: 0 })
      const decision = routine.admit(task)

      expect(decision.type).toBe('drop')
      expect(events.some((e) => e.decision.type === 'drop')).toBe(true)
    })
  })
})
