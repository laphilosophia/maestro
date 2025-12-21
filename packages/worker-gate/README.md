# @maestro/worker-gate

**Worker pool gate adapter for Maestro decision fabric.**

> ⚠️ **ALPHA - NOT FOR PRODUCTION USE**

This adapter puts a Maestro decision gate in front of worker pools, answering:

> "Should this task be dispatched right now?"

## Installation

```bash
pnpm add @maestro/worker-gate @maestro/core
```

## Quick Start

```typescript
import { createWorkerGate, type WorkerPool } from '@maestro/worker-gate'

// 1. Implement WorkerPool interface for your pool
class MyWorkerPool implements WorkerPool {
  dispatch(task) {
    // Fire-and-forget: send to pool
    this.pool.runTask(task.id)
  }

  snapshot() {
    return {
      utilization: this.pool.utilization,
      queueDepth: this.pool.queueSize,
    }
  }
}

// 2. Create gate
const gate = createWorkerGate({
  pool: new MyWorkerPool(),
  maxQueueDepth: 500,
})

// 3. Submit tasks through gate
const decision = gate.submit({
  id: 'task-001',
  metadata: { spawnBudget: 3, maxRetryDepth: 2, createdAt: Date.now() },
})

if (decision.type === 'drop') {
  console.log(`Task dropped: ${decision.reason}`)
}
```

## What This Does

✅ Reads pool metrics (utilization, queue depth)
✅ Converts metrics to Maestro pressure signals
✅ Decides admission based on pressure
✅ Dispatches admitted tasks (fire-and-forget)

## What This Does NOT Do

❌ Manage worker threads
❌ Handle job results
❌ Implement retry logic
❌ Store dropped tasks

## WorkerPool Interface

```typescript
interface WorkerPool {
  dispatch(task: Task): void // Fire-and-forget
  snapshot(): WorkerPoolSnapshot // Point-in-time metrics
}

interface WorkerPoolSnapshot {
  utilization: number // 0..1
  queueDepth: number // integer
}
```

**Critical**: `dispatch` MUST be fire-and-forget. No Promise, no result.

## API

### `createWorkerGate(config)`

Creates a worker gate.

```typescript
const gate = createWorkerGate({
  pool: WorkerPool, // Required
  maxQueueDepth: number, // Default: 1000
  maestro: MainRoutine, // Optional: provide your own
  onDecision: (event) => {}, // Optional: decision observer
})
```

### `gate.submit(task)`

Submit task through gate. Returns Decision immediately.

### `gate.metrics()`

Get gate metrics: admission count, drop count, last pressure.

## License

MIT
