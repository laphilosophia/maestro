/**
 * Worker Gate Tests
 */

import type { Task } from '@maestro/core'
import { describe, expect, it, vi } from 'vitest'
import {
  createPoolPressureSource,
  createWorkerGate,
  DEFAULT_MAX_QUEUE_DEPTH,
  type WorkerPool,
  type WorkerPoolSnapshot,
} from '../src/index.js'

// =============================================================================
// FAKE POOL
// =============================================================================

function createFakePool(initialSnapshot: WorkerPoolSnapshot): WorkerPool & {
  setSnapshot: (s: WorkerPoolSnapshot) => void
  dispatchedTasks: Task[]
} {
  let currentSnapshot = initialSnapshot
  const dispatchedTasks: Task[] = []

  return {
    dispatch(task: Task): void {
      dispatchedTasks.push(task)
    },
    snapshot(): WorkerPoolSnapshot {
      return currentSnapshot
    },
    setSnapshot(s: WorkerPoolSnapshot): void {
      currentSnapshot = s
    },
    dispatchedTasks,
  }
}

function createTask(id: string): Task {
  return {
    id,
    metadata: {
      spawnBudget: 5,
      maxRetryDepth: 3,
      createdAt: Date.now(),
    },
  }
}

// =============================================================================
// PRESSURE SOURCE TESTS
// =============================================================================

describe('createPoolPressureSource', () => {
  it('should mirror utilization for memory pressure', () => {
    const pool = createFakePool({ utilization: 0.5, queueDepth: 100 })
    const source = createPoolPressureSource(pool)

    // Memory mirrors utilization since pool has no memory info
    expect(source.getMemoryPressure()).toBe(0.5)
  })

  it('should normalize queue depth against default max', () => {
    const pool = createFakePool({ utilization: 0.5, queueDepth: 500 })
    const source = createPoolPressureSource(pool)

    expect(source.getQueueDepthPressure()).toBe(500 / DEFAULT_MAX_QUEUE_DEPTH)
  })

  it('should normalize queue depth against custom max', () => {
    const pool = createFakePool({ utilization: 0.5, queueDepth: 250 })
    const source = createPoolPressureSource(pool, { maxQueueDepth: 500 })

    expect(source.getQueueDepthPressure()).toBe(0.5)
  })

  it('should clamp queue depth pressure to 1', () => {
    const pool = createFakePool({ utilization: 0.5, queueDepth: 2000 })
    const source = createPoolPressureSource(pool, { maxQueueDepth: 100 })

    expect(source.getQueueDepthPressure()).toBe(1)
  })

  it('should return utilization as spawn saturation', () => {
    const pool = createFakePool({ utilization: 0.75, queueDepth: 0 })
    const source = createPoolPressureSource(pool)

    expect(source.getSpawnSaturation()).toBe(0.75)
  })

  it('should clamp spawn saturation to 1', () => {
    const pool = createFakePool({ utilization: 1.5, queueDepth: 0 })
    const source = createPoolPressureSource(pool)

    expect(source.getSpawnSaturation()).toBe(1)
  })
})

// =============================================================================
// WORKER GATE TESTS
// =============================================================================

describe('createWorkerGate', () => {
  it('should dispatch task when pressure is low', () => {
    const pool = createFakePool({ utilization: 0.1, queueDepth: 10 })
    const gate = createWorkerGate({ pool })

    const task = createTask('task-1')
    const decision = gate.submit(task)

    expect(decision.type).toBe('dispatch')
    expect(pool.dispatchedTasks).toHaveLength(1)
    expect(pool.dispatchedTasks[0]?.id).toBe('task-1')
  })

  it('should drop task when pressure exceeds threshold', () => {
    // Set high utilization and queue depth to exceed 0.9 average pressure
    const pool = createFakePool({ utilization: 1.0, queueDepth: 2000 })
    const gate = createWorkerGate({ pool, maxQueueDepth: 100 })

    const task = createTask('task-high-pressure')
    const decision = gate.submit(task)

    expect(decision.type).toBe('drop')
    expect(pool.dispatchedTasks).toHaveLength(0)
  })

  it('should track admission and drop counts', () => {
    const pool = createFakePool({ utilization: 0.1, queueDepth: 10 })
    const gate = createWorkerGate({ pool })

    gate.submit(createTask('task-1'))
    gate.submit(createTask('task-2'))

    // Now increase pressure to cause drops
    pool.setSnapshot({ utilization: 1.0, queueDepth: 2000 })
    gate.submit(createTask('task-3'))

    const metrics = gate.metrics()
    expect(metrics.admissionCount).toBe(2)
    expect(metrics.dropCount).toBe(1)
  })

  it('should expose last pressure snapshot', () => {
    const pool = createFakePool({ utilization: 0.42, queueDepth: 123 })
    const gate = createWorkerGate({ pool })

    gate.submit(createTask('task-1'))

    const metrics = gate.metrics()
    expect(metrics.lastPressure.utilization).toBe(0.42)
    expect(metrics.lastPressure.queueDepth).toBe(123)
  })

  it('should call onDecision callback', () => {
    const pool = createFakePool({ utilization: 0.1, queueDepth: 10 })
    const onDecision = vi.fn()
    const gate = createWorkerGate({ pool, onDecision })

    gate.submit(createTask('callback-test'))

    expect(onDecision).toHaveBeenCalledTimes(1)
    expect(onDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        taskId: 'callback-test',
        decision: expect.objectContaining({ type: 'dispatch' }),
      })
    )
  })
})

// =============================================================================
// RFC INVARIANT TESTS
// =============================================================================

describe('RFC Invariants', () => {
  it('MUST NOT dispatch to pool if decision is not dispatch', () => {
    const pool = createFakePool({ utilization: 1.0, queueDepth: 5000 })
    const gate = createWorkerGate({ pool, maxQueueDepth: 100 })

    const task = createTask('should-not-dispatch')
    const decision = gate.submit(task)

    // Decision should be drop
    expect(decision.type).not.toBe('dispatch')

    // Pool should NOT have received the task
    expect(pool.dispatchedTasks).toHaveLength(0)
  })

  it('dispatch is fire-and-forget (no Promise returned)', () => {
    const pool = createFakePool({ utilization: 0.1, queueDepth: 10 })
    const gate = createWorkerGate({ pool })

    const task = createTask('fire-and-forget')
    const result = gate.submit(task)

    // submit returns Decision, not Promise
    expect(result).not.toBeInstanceOf(Promise)
    expect(result.type).toBe('dispatch')
  })
})
