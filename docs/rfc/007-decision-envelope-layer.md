# RFC-7: Decision Envelope Layer

**Subtitle:** Static Policy Constraints for Admission Decisions

## Status

- **Type:** Normative / Required
- **Depends on:** RFC-0, RFC-1, RFC-2, RFC-6
- **Scope:** Admission policy layer
- **Version:** v1.0-stable

---

## 1. Purpose

This RFC defines the **Decision Envelope Layer**, a static policy construct that constrains the decision space **before** the Main Routine evaluates a task.

A Decision Envelope:

- does NOT make decisions
- does NOT compute values
- does NOT observe pressure

A Decision Envelope **declares** which decisions are admissible for a task class.

---

## 2. Core Invariants

### 2.1 Envelope Immutability

Decision Envelopes:

- MUST be defined at build-time
- MUST be immutable at runtime
- MUST NOT change based on pressure, history, or outcomes

> **Envelope = policy artifact, not runtime object.**

---

### 2.2 Envelope Independence

Envelopes MUST NOT:

- observe `PressureSignal`
- compute thresholds
- derive candidate sets dynamically
- perform capability matching at runtime

All constraint resolution happens **before runtime**.

---

### 2.3 Envelope vs Metadata Relationship

The relationship between `TaskMetadata` and `DecisionEnvelope` is **unidirectional**:

| Layer            | Role                     |
| ---------------- | ------------------------ |
| TaskMetadata     | Upper bound (hard limit) |
| DecisionEnvelope | Constraint (narrowing)   |

**Rule:**

> Envelope MUST NOT override metadata.
> Envelope MUST only narrow what metadata allows.

**Example:**

```
metadata.maxRetryDepth = 3
envelope.allowRetry = false
→ Retry disallowed (envelope narrows)
→ maxRetryDepth remains 3 (metadata unchanged)
```

---

## 3. Decision Envelope Type

```ts
interface DecisionEnvelope {
  /**
   * Unique envelope identifier.
   * MUST be globally unique within a runtime instance.
   * SHOULD be namespaced (e.g. 'telemetry.strict.v1').
   */
  readonly id: string

  // === CONSTRAINT FLAGS ===

  /** Allow task to be dropped under pressure? */
  readonly allowDrop: boolean

  /** Allow retry attempts? */
  readonly allowRetry: boolean

  /** Allow cooperative sub-routines? */
  readonly allowCooperate: boolean

  /** Allow history influence (forgetting curve)? */
  readonly allowHistoryInfluence: boolean

  // === CANDIDATE ELIGIBILITY ===

  /** Pre-determined eligible candidate IDs */
  readonly eligibleCandidates: readonly string[]
}
```

### 3.1 Constraint Flags

| Flag                    | Effect when `false`                   |
| ----------------------- | ------------------------------------- |
| `allowDrop`             | Drop decision is never emitted        |
| `allowRetry`            | Retry is disabled for this task class |
| `allowCooperate`        | Cooperative cardinality is 0          |
| `allowHistoryInfluence` | Forgetting curve is bypassed          |

**Critical Rule (Retry Depth):**

> Envelope MUST NOT specify retry depth.
> Retry depth is owned exclusively by `TaskMetadata` and Core logic.
> `allowRetry: false` disables retry entirely; it does not set a depth value.

### 3.2 Eligible Candidates

- Pre-defined at build-time
- References candidate IDs from `CandidateRegistry`
- MUST NOT be computed at runtime

**Empty Array Semantics (NORMATIVE):**

> If `eligibleCandidates` is an empty array, **no candidate is eligible**.
> CircuitDistributor MUST treat this as a hard exclusion and return `null`.
> An empty array does NOT mean "all candidates are eligible".

---

## 4. Candidate Registry

Candidates MUST be defined in a build-time registry:

```ts
interface CandidateRegistry {
  /** Get candidate by ID */
  get(id: string): CandidateProfile | undefined

  /** List all candidate IDs */
  list(): readonly string[]
}

interface CandidateProfile {
  readonly id: string
  readonly capabilities: readonly string[]
  readonly factory: () => SubRoutine
}
```

### 4.1 Registry vs Envelope Separation

| Concern                       | Owner             |
| ----------------------------- | ----------------- |
| Candidate existence           | CandidateRegistry |
| Candidate capabilities        | CandidateRegistry |
| Which candidates are eligible | DecisionEnvelope  |
| Candidate creation            | SubRoutineFactory |

**Rule:**

> Registry = inventory.
> Envelope = eligibility declaration.
> Strategy = selection logic.

These concerns MUST NOT bleed into each other.

---

## 5. Envelope Resolver

### 5.1 Interface

```ts
interface EnvelopeResolver {
  /** Resolve envelope for given intent */
  resolve(intent: string): DecisionEnvelope | null
}
```

### 5.2 Implementation Requirements

- MUST be a simple key→value lookup
- MUST NOT perform pattern matching
- MUST return `null` if intent is unknown

**Lifecycle Rule (NORMATIVE):**

> EnvelopeResolver MUST be instantiated at init-time.
> EnvelopeResolver MUST NOT change its resolution mapping at runtime.
> Hot-reloading resolver mappings is forbidden.

```ts
function createEnvelopeResolver(map: Record<string, DecisionEnvelope>): EnvelopeResolver {
  return {
    resolve(intent: string): DecisionEnvelope | null {
      return map[intent] ?? null
    },
  }
}
```

### 5.3 Pattern Matching (OUT OF SCOPE)

Pattern-based resolution:

- is NOT defined in this RFC
- MAY be implemented as a separate resolver
- MUST NOT become core behavior

---

## 6. Main Routine Integration

### 6.1 Configuration Change

```ts
interface MainRoutineConfig {
  amigdala: Amigdala
  distributor: CircuitDistributor
  envelopeResolver: EnvelopeResolver // NEW
  defaultEnvelope: DecisionEnvelope // NEW, REQUIRED
  stateTTL?: number
  maxTrackedTasks?: number
  onDecision?: DecisionEventHandler
}
```

### 6.2 Default Envelope (MANDATORY)

- `defaultEnvelope` MUST be provided at init-time
- If `envelopeResolver.resolve()` returns `null`, `defaultEnvelope` is used
- Absence of `defaultEnvelope` MUST cause init-time error

**Rationale:**

> Implicit defaults hide behavior.
> Explicit defaults enforce policy clarity.

### 6.3 Admission Flow (Updated)

```
Task
 → EnvelopeResolver.resolve(task.metadata.intent)
   → DecisionEnvelope | null
   → fallback to defaultEnvelope if null
 → MainRoutine.admit(task, envelope)
   → Envelope-constrained eligibility checks
   → Pressure check (if envelope.allowDrop)
   → Budget check (narrowed by envelope)
   → CircuitDistributor.select(task, envelope, runtime, pressure)
     → Candidate filter (envelope.eligibleCandidates)
     → Strategy.select(filteredContext)
   → Dispatch
```

---

## 7. Circuit Distributor Changes

### 7.1 Signature Update

```ts
// Before (RFC-6)
interface CircuitDistributor {
  select(
    task: Task,
    runtimeState: TaskRuntimeState,
    pressure: PressureSignal
  ): SubRoutineGroup | null
}

// After (RFC-7)
interface CircuitDistributor {
  select(
    task: Task,
    envelope: DecisionEnvelope,
    runtimeState: TaskRuntimeState,
    pressure: PressureSignal
  ): SubRoutineGroup | null
}
```

### 7.2 Envelope Usage in Selection

```ts
function select(task, envelope, runtime, pressure) {
  // 1. Filter candidates by envelope
  const eligible = envelope.eligibleCandidates

  // 2. Pass filtered context to strategy
  const context: StrategyContext = {
    task,
    envelope, // NEW
    runtimeState: runtime,
    pressure,
    eligibleCandidates: eligible,
    factory: boundFactory(eligible),
  }

  return strategy.select(context)
}
```

---

## 8. Strategy Context Extension

```ts
interface StrategyContext {
  readonly task: Task
  readonly envelope: DecisionEnvelope // NEW
  readonly runtimeState: TaskRuntimeState
  readonly pressure: PressureSignal
  readonly eligibleCandidates: readonly string[] // NEW
  readonly factory: SubRoutineFactory
}
```

**Rule (NORMATIVE):**

> Strategy MUST treat envelope as **opaque policy context**.
> Strategy MUST NOT interpret, modify, or branch on envelope flags.
> Eligibility constraints are applied by CircuitDistributor **before** Strategy is invoked.
> Strategy MUST NOT duplicate or override this filtering.

---

## 9. Cooperative Cardinality Interaction

RFC-1 §5.4 formula remains unchanged.

Envelope interaction:

```ts
if (!envelope.allowCooperate) {
  cooperativeCount = 0
} else {
  cooperativeCount = RFC1_FORMULA(expectedLoad, ...)
}
```

**Rule:**

> Envelope provides bypass flag, not cardinality value.
> Cardinality computation remains in Core.

---

## 10. History Influence Interaction

RFC-2 §7 forgetting curve remains unchanged.

Envelope interaction:

```ts
if (!envelope.allowHistoryInfluence) {
  // Skip penalty application
  adjustedScore = baseScore
} else {
  adjustedScore = baseScore - decayedPenalty
}
```

**Rule:**

> Envelope controls whether history applies.
> Envelope does NOT control how history decays.

---

## 11. Observability Extension

### 11.1 Decision Event Update

```ts
interface DecisionEvent {
  readonly taskId: TaskID
  readonly decision: Decision
  readonly envelopeId: string // NEW
  readonly pressure: PressureSignal
  readonly timestamp: number
}
```

### 11.2 Mandatory Signals

Maestro MUST emit:

- which envelope was activated
- which candidates were eligible
- whether envelope caused constraint narrowing

---

## 12. Explicit Non-Goals

This RFC does NOT define:

- Pattern-based envelope resolution
- Envelope inheritance or composition
- Dynamic envelope modification
- Envelope versioning or migration
- Envelope validation beyond type checking

---

## 13. Summary

Decision Envelope is:

- a **static policy artifact**
- a **constraint declaration**
- a **space-narrowing mechanism**

Decision Envelope is NOT:

- a decision maker
- a runtime calculator
- a pressure observer

> **The envelope is a fence around the decision space.
> If the fence moves, the system breaks.**

---

## 14. Type Summary

```ts
// === Core Types ===

interface DecisionEnvelope {
  readonly id: string
  readonly allowDrop: boolean
  readonly allowRetry: boolean
  readonly allowCooperate: boolean
  readonly allowHistoryInfluence: boolean
  readonly eligibleCandidates: readonly string[]
}

interface EnvelopeResolver {
  resolve(intent: string): DecisionEnvelope | null
}

interface CandidateRegistry {
  get(id: string): CandidateProfile | undefined
  list(): readonly string[]
}

interface CandidateProfile {
  readonly id: string
  readonly capabilities: readonly string[]
  readonly factory: () => SubRoutine
}

// === Updated Interfaces ===

interface MainRoutineConfig {
  amigdala: Amigdala
  distributor: CircuitDistributor
  envelopeResolver: EnvelopeResolver
  defaultEnvelope: DecisionEnvelope
  // ... existing fields
}

interface CircuitDistributor {
  select(
    task: Task,
    envelope: DecisionEnvelope,
    runtimeState: TaskRuntimeState,
    pressure: PressureSignal
  ): SubRoutineGroup | null
}

interface StrategyContext {
  readonly task: Task
  readonly envelope: DecisionEnvelope
  readonly runtimeState: TaskRuntimeState
  readonly pressure: PressureSignal
  readonly eligibleCandidates: readonly string[]
  readonly factory: SubRoutineFactory
}
```

---

## RFC-7 Status

**v1.0-stable — APPROVED**

Breaking changes to:

- `MainRoutineConfig` (new required fields)
- `CircuitDistributor.select()` signature
- `StrategyContext` interface
