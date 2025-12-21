/**
 * Worker Gate Example
 *
 * Demonstrates using @maestro/worker-gate to gate a simulated worker pool.
 *
 * Run: npx tsx examples/worker-gate-demo.ts
 */

import type { Task } from '../packages/core/src/index.js'
import {
  createWorkerGate,
  type WorkerPool,
  type WorkerPoolSnapshot,
} from '../packages/worker-gate/src/index.js'

// =============================================================================
// SIMULATED WORKER POOL
// =============================================================================

class SimulatedWorkerPool implements WorkerPool {
  private activeWorkers = 0
  private readonly maxWorkers = 4
  private queue: string[] = []
  private processed: string[] = []

  dispatch(task: Task): void {
    // Fire-and-forget: just queue the work
    this.queue.push(task.id)
    this.processQueue()
  }

  snapshot(): WorkerPoolSnapshot {
    return {
      utilization: this.activeWorkers / this.maxWorkers,
      queueDepth: this.queue.length,
    }
  }

  private processQueue(): void {
    if (this.activeWorkers >= this.maxWorkers) return
    if (this.queue.length === 0) return

    const taskId = this.queue.shift()!
    this.activeWorkers++

    // Simulate work (instant for demo)
    console.log(`  [worker] Processing: ${taskId}`)
    this.processed.push(taskId)
    this.activeWorkers--
  }

  getProcessed(): string[] {
    return this.processed
  }
}

// =============================================================================
// DEMO
// =============================================================================

console.log('=== Worker Gate Demo ===\n')

const pool = new SimulatedWorkerPool()

const gate = createWorkerGate({
  pool,
  maxQueueDepth: 10,
  onDecision: (event): void => {
    const icon = event.decision.type === 'dispatch' ? '✓' : '✗'
    console.log(`${icon} ${event.taskId}: ${event.decision.type}`)
  },
})

// Submit tasks
console.log('--- Submitting tasks (low pressure) ---')
for (let i = 1; i <= 5; i++) {
  const task: Task = {
    id: `task-${i}`,
    metadata: {
      spawnBudget: 3,
      maxRetryDepth: 2,
      createdAt: Date.now(),
    },
  }
  gate.submit(task)
}

// Simulate high pressure
console.log('\n--- Simulating high pressure ---')

// Create a pool that reports high utilization
class HighPressurePool implements WorkerPool {
  dispatch(task: Task): void {
    console.log(`  [pool] Would process: ${task.id}`)
  }
  snapshot(): WorkerPoolSnapshot {
    return { utilization: 0.95, queueDepth: 50 }
  }
}

const overloadedGate = createWorkerGate({
  pool: new HighPressurePool(),
  maxQueueDepth: 10,
  onDecision: (event): void => {
    const icon = event.decision.type === 'dispatch' ? '✓' : '✗'
    const reason =
      event.decision.type === 'drop' ? ` (${(event.decision as { reason: string }).reason})` : ''
    console.log(`${icon} ${event.taskId}: ${event.decision.type}${reason}`)
  },
})

for (let i = 6; i <= 10; i++) {
  const task: Task = {
    id: `task-${i}`,
    metadata: {
      spawnBudget: 3,
      maxRetryDepth: 2,
      createdAt: Date.now(),
    },
  }
  overloadedGate.submit(task)
}

// Show metrics
console.log('\n=== Metrics ===')
const lowPressureMetrics = gate.metrics()
const highPressureMetrics = overloadedGate.metrics()

console.log('Low pressure gate:')
console.log(`  Admissions: ${lowPressureMetrics.admissionCount}`)
console.log(`  Drops: ${lowPressureMetrics.dropCount}`)

console.log('High pressure gate:')
console.log(`  Admissions: ${highPressureMetrics.admissionCount}`)
console.log(`  Drops: ${highPressureMetrics.dropCount}`)

console.log('\n=== Key Insight ===')
console.log(`
Worker Gate behavior:
- Low pressure (${lowPressureMetrics.lastPressure.utilization * 100}% util) → ALL tasks admitted
- High pressure (${highPressureMetrics.lastPressure.utilization * 100}% util) → Tasks DROPPED

Gate does NOT:
- Manage workers
- Handle results
- Implement retry

Gate ONLY decides: "Should this task proceed right now?"
`)
