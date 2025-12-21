# RFC-6: Core Types & Interfaces

**Subtitle:** Normative Type System for Maestro Core

## Status

- **Type:** Normative / Required
- **Depends on:** RFC-0 → RFC-5
- **Scope:** Type definitions only
- **Version:** v1.1-stable

---

## 1. Task

```ts
type TaskID = string // opaque, UUID recommended

interface Task {
  id: TaskID
  metadata: TaskMetadata
}
```

---

## 2. TaskMetadata (Immutable)

```ts
interface TaskMetadata {
  intent?: string // routing hint
  priority?: number // 0..100
  spawnBudget: number // HARD limit, immutable
  maxRetryDepth: number // HARD limit, immutable
  createdAt: number // epoch ms
}
```

Metadata:

- MUST be immutable
- MUST NOT contain payload
- Defines **contract limits**, not runtime counters

---

## 3. TaskRuntimeState (Ephemeral)

```ts
interface TaskRuntimeState {
  spawnCount: number // ephemeral, discardable
  retryDepth: number // ephemeral, discardable
  lastAttemptAt: number // epoch ms
}
```

Runtime state:

- Lives in Main Routine's ephemeral memory
- MAY be lost on restart
- MUST NOT be required for correctness

**Trade-off (explicit):**

> Restart → state reset → task may retry extra times.
> This is **acceptable under fail-soft model**.

---

## 4. PressureSignal

```ts
interface PressureSignal {
  memory: number // 0..1
  queueDepth: number // 0..1
  spawnSaturation: number // 0..1
  timestamp: number
}
```

Pressure is:

- scalar
- snapshot-based
- stateless

---

## 5. Decision

```ts
type Decision =
  | { type: 'dispatch' }
  | { type: 'retry'; currentDepth: number }
  | { type: 'escalate'; currentDepth: number }
  | { type: 'drop'; reason: DropReason; currentDepth: number }
```

`currentDepth`:

- For observability
- For policy evaluation
- Carries no result meaning

---

## 6. DropReason

```ts
type DropReason = 'spawn_budget_exhausted' | 'retry_depth_exhausted' | 'pressure_exceeded'
```

---

## 7. Amigdala Interface

```ts
interface Amigdala {
  snapshot(): PressureSignal
}
```

- Pull-only
- No callbacks
- No push

Main Routine pulls snapshot at each decision point.

---

## 8. SubRoutine

```ts
interface SubRoutine {
  dispatch(task: Task): void
}
```

- No return
- No await
- No callback

---

## 9. SubRoutineGroup (Cooperative Carrying)

```ts
interface SubRoutineGroup {
  primary: SubRoutine // sole commit authority
  cooperatives: SubRoutine[] // load sharing only
}
```

Semantics:

- `primary`: Holds exclusive commit right
- `cooperatives`: Share transport pressure only
- When primary commits, cooperatives receive **pre-dispatch abort**
- No race condition: commit authority is singular

## 10. Sub-Routine Cardinality Constraints (NORMATIVE)

Each task MUST be associated with exactly one primary sub-routine.

Cooperative sub-routines are optional and exist solely for pressure sharing.

The following constraints are mandatory:

- Default cooperative sub-routine count: 0
- Maximum cooperative sub-routines per task: 2
- Absolute upper bound (non-configurable): 4

These limits apply per task and per admission attempt.

There MUST NOT exist a global sub-routine pool.
Sub-routines are ephemeral and task-scoped.

Cardinality MUST be computed by the Circuit Distributor and MUST be
deterministic given identical inputs.

Sub-routines MUST NOT be reused across tasks.

---

## 11. Circuit Distributor Interface

```ts
interface CircuitDistributor {
  select(task: Task, pressure: PressureSignal): SubRoutineGroup
}
```

Returns structured group, not flat array.

---

## 12. Forgetting Curve (Normative)

Historical weight MUST decay exponentially:

```ts
weight(t) = e ^ (-λ * t)
```

### Constants (LOCKED)

```ts
const HALF_LIFE_MS = 5 * 60 * 1000 // 5 minutes
const LAMBDA = Math.log(2) / HALF_LIFE_MS // ≈ 2.31 × 10⁻⁶
```

### Implementation

```ts
function decayWeight(elapsedMs: number): number {
  return Math.exp(-LAMBDA * elapsedMs)
}
```

This is **normative**:

- Implementations MUST use this formula
- Approximations are NOT acceptable
- HALF_LIFE_MS is configurable but MUST be bounded

---

## 13. Observability Event

```ts
interface DecisionEvent {
  taskId: TaskID
  decision: Decision
  pressure: PressureSignal
  timestamp: number
}
```

---

## RFC-6 Status

**v1.1-stable — REQUIRED BEFORE IMPLEMENTATION**

All open questions resolved. Ready for implementation.
