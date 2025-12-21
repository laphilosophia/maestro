# @maestro/core

**Mechanical decision fabric for task admission under pressure.**

Maestro is a zero-dependency TypeScript library that determines:

- **whether** a task should proceed
- **where** a task should be dispatched
- **under what pressure constraints**

Maestro explicitly does **not** determine: correctness, success, semantic validity, or business meaning.

---

> ⚠️ If you are new to Maestro, read in this order:

1. What Maestro is NOT
2. Core Concepts
3. Quick Start (demo only)
4. RFC links

---

## What Maestro is NOT

This is not a wishlist. This is a **permanent exclusion list**.

| ❌ NOT this      | Why                                                        |
| ---------------- | ---------------------------------------------------------- |
| Message queue    | Maestro doesn't store tasks. It decides if they proceed.   |
| Workflow engine  | No DAGs, no orchestration, no step sequencing.             |
| Saga coordinator | No compensation, no rollback, no distributed transactions. |
| Retry framework  | Retries are bounded and pressure-aware, not automatic.     |
| Scheduler        | No cron, no delayed execution, no timers.                  |
| Load balancer    | Decisions are local, not global. No round-robin.           |

### Will Never Be Added

- **Distributed mode** — No consensus, no leader election, no cluster state.
- **Persistence** — Restart means clean slate. This is intentional.
- **Result-aware strategies** — Maestro ignores success/failure. Only pressure matters.
- **AI/ML routing** — No learning, no prediction, no optimization.
- **DX sugar on core** — Ergonomics live in adapters, not here.

If your architecture **requires** Maestro for correctness, your architecture is wrong.

Maestro is a **gate**, not a **guarantee**.

---

## Mental Model

**Maestro is not an executor. It's a checkpoint.**

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  Your Code   │──task──▶│   Maestro    │──maybe─▶│   Dispatch   │
│  (has job)   │         │   (gate)     │         │  (your code) │
└──────────────┘         └──────────────┘         └──────────────┘
                               │
                               ▼
                            [drop]
```

| Concept                | What it means                                                |
| ---------------------- | ------------------------------------------------------------ |
| **Task ≠ Job**         | Task is metadata only. The actual work lives in your system. |
| **Dispatch ≠ Execute** | Dispatch is a function call. Maestro doesn't wait or watch.  |
| **Retry ≠ Automatic**  | Retries only happen when you signal them externally.         |

---

## Common Misunderstandings

**"Where is the job payload?"**
→ Outside Maestro. Task ID references your job storage.

**"Why doesn't dispatch return anything?"**
→ RFC-0: Fire-and-forget. Maestro doesn't observe results.

**"Why drop instead of infinite retry?"**
→ RFC-1: Bounded execution. Drop is terminal, not failure.

---

## Installation

```bash
pnpm add @maestro/core
# or
npm install @maestro/core
```

## Quick Start (Demos Only)

> ⚠️ **For evaluation and demos only.** Production systems should compose explicitly.

```typescript
import { createMaestro, type Task } from '@maestro/core'

const maestro = createMaestro({
  onDispatch: ({ task, routeId }) => {
    console.log(`${task.id} → ${routeId}`)
  },
})

const task: Task = {
  id: 'task-001',
  metadata: { spawnBudget: 3, maxRetryDepth: 2, createdAt: Date.now() },
}

const decision = maestro.admit(task)
// decision.type: 'dispatch' | 'retry' | 'escalate' | 'drop'
```

## Full Composition (Production)

```typescript
import {
  createMainRoutine,
  createAmigdala,
  createCircuitDistributor,
  createSimpleFactory,
  createIntentBasedStrategy,
  type Task,
} from '@maestro/core'

// 1. Create pressure observer
const amigdala = createAmigdala()

// 2. Create spawn strategy
const strategy = createIntentBasedStrategy({
  intentMap: { fast: 'fast-route', slow: 'slow-route' },
  defaultSubRoutineId: 'default-route',
})

// 3. Create factory for sub-routines
const factory = createSimpleFactory((task, routeId) => {
  console.log(`Dispatching ${task.id} to ${routeId}`)
  // Your actual dispatch logic here
})

// 4. Create circuit distributor
const distributor = createCircuitDistributor({ strategy, factory })

// 5. Create main routine
const maestro = createMainRoutine({ amigdala, distributor })

// 6. Admit tasks
const task: Task = {
  id: 'task-001',
  metadata: {
    intent: 'fast',
    priority: 80,
    spawnBudget: 5,
    maxRetryDepth: 3,
    createdAt: Date.now(),
  },
}

const decision = maestro.admit(task)
// decision.type: 'dispatch' | 'retry' | 'escalate' | 'drop'
```

## Core Concepts

### Task

Opaque unit of work. Maestro never inspects payload—only declared metadata.

### PressureSignal

System pressure snapshot (memory, queue depth, spawn saturation). All values 0..1.

### Decision

Admission verdict: `dispatch`, `retry`, `escalate`, or `drop`.

### SubRoutineGroup

Primary sub-routine (sole commit authority) + cooperative sub-routines (load sharing only).

## Spawn Strategies

| Strategy            | Use Case                                  |
| ------------------- | ----------------------------------------- |
| Intent-based        | Route by declared intent (default)        |
| Priority-based      | 3D selection: priority × depth × pressure |
| Random              | Cold start, bias reset                    |
| Performance-penalty | Negative bias with decay                  |

Compose strategies:

```typescript
import { composeStrategies } from '@maestro/core'

const stack = composeStrategies([intent, priority, penalty, random])
```

## Observability

```typescript
const maestro = createMainRoutine({
  amigdala,
  distributor,
  onDecision: (event) => {
    console.log(`${event.taskId}: ${event.decision.type}`)
    console.log(`Pressure: ${JSON.stringify(event.pressure)}`)
  },
})
```

## RFC Compliance

This implementation follows:

- RFC-0: Core Contract (immutable)
- RFC-1: Execution Model
- RFC-2: Policy & Strategy Layer
- RFC-3: Observability & Diagnostics
- RFC-6: Core Types & Interfaces

## License

MIT
