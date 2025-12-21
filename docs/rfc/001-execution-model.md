# RFC-1: Maestro Execution Model

## Subtitle: Task Admission, Dispatch, and Re-admission

## Status

- Type: Normative / Stable
- Depends on: RFC-0
- Updated to align with: RFC-6 (Core Types & Interfaces)

---

## 1. Purpose

This RFC defines how tasks move through Maestro once accepted by the Main Routine.

It specifies:

- sub-routine lifecycle
- spawn limits and budgets
- retry, escalation, and drop mechanics
- cooperative load carrying
- bounded execution guarantees

---

## 2. Canonical Execution Flow

Every task processed by Maestro MUST follow this flow:

Task Accepted
→ Admission Decision
→ Dispatch Attempt
→ Outcome Signal
→ Re-admission | Escalation | Drop

Maestro never observes execution success.

---

## 3. Sub-Routine Lifecycle

### 3.1 Definition

A sub-routine is an ephemeral execution carrier that exists only to deliver a task to an external destination.

It is NOT:

- a worker
- a coroutine
- a promise
- a stateful actor

---

### 3.2 States

Each sub-routine exists in exactly one state:

- `0` — idle / void
- `1` — committed (dispatching)
- `-1` — withdrawn

State transitions are linear and bounded.

---

### 3.3 Mandatory Lifecycle

spawn (state = 0)
→ commit (state = 1)
→ dispatch call issued
→ all references released
→ return to void (state = 0)

Sub-routines MUST NOT:

- wait for responses
- retain references
- emit results

---

## 4. Spawn Budget

Each task declares a fixed spawn budget.

- Budget is immutable
- Budget is strictly enforced
- Budget exhaustion forces escalation or drop

Infinite spawning is forbidden.

---

## 5. Cooperative Load Carrying (REVIZED)

### 5.1 Definition

Cooperative carrying allows multiple sub-routines to share execution pressure
without sharing ownership or results.

A cooperative group is defined as a **SubRoutineGroup**:

- exactly one `primary` sub-routine
- zero or more `cooperative` sub-routines

Only the primary may commit.

---

### 5.2 Rules

- The task remains atomically singular
- Cooperative sub-routines:
  - MUST NOT dispatch
  - MUST NOT compete for commit
  - MUST NOT observe execution outcomes
- Only transport pressure is shared

---

### 5.3 Commit Semantics (LOCKED)

Commit eligibility is exclusive.

- A commit is defined as the issuance of a dispatch call
- Only the `primary` sub-routine MAY commit
- Cooperative sub-routines MUST abort **prior to dispatch**
- Abort means: _dispatch is never attempted_

No race condition exists, as commit authority is singular.

### 5.4 Cooperative Cardinality Rule (LOCKED)

The number of cooperative sub-routines for a task MUST be derived
mechanically and deterministically.

Cooperative cardinality MUST NOT be decided heuristically or adaptively.

The cooperative count MUST be computed as a function of:

- declared task intent
- current pressure snapshot
- current retry depth

The computation MUST follow the rule:

```ts
cooperativeCount = clamp(floor(expectedLoad / COOP_UNIT), 0, MAX_COOPERATIVE_SUBROUTINES)
```

Where:

- expectedLoad is a scalar value derived from:
  - intent-based static cost
  - pressure-based multiplier
  - retry-depth-based multiplier
- COOP_UNIT is a fixed constant (default = 1.0)
- MAX_COOPERATIVE_SUBROUTINES is a hard upper bound

The default limits are:

- MAX_COOPERATIVE_SUBROUTINES = 2
- ABSOLUTE_UPPER_BOUND = 4

The resulting cooperative count:

- MUST be zero or greater
- MUST NOT exceed MAX_COOPERATIVE_SUBROUTINES
- MUST be computed prior to sub-routine instantiation

Sub-routines MUST NOT participate in cooperative cardinality decisions.

Cooperative cardinality affects only pressure distribution and MUST NOT
alter commit semantics.

---

## 6. Outcome Signals

Sub-routines emit signals, not results:

- retry
- escalate
- drop

Signals represent pressure feedback only.

---

## 7. Retry Semantics

- Retry depth is bounded
- Retry depth increases monotonically
- Retry is permitted only if:
  - spawn budget allows
  - retry depth < maxRetryDepth
  - pressure permits

Retry is never guaranteed.

---

## 8. Escalation Semantics

Escalation:

- increases urgency
- tightens thresholds
- does NOT bypass budgets
- does NOT guarantee dispatch

---

## 9. Drop Semantics

A task MUST be dropped when:

- spawn budget is exhausted
- retry depth is exhausted
- pressure prohibits continuation

Drop is terminal and observable.

---

## 10. Boundedness Guarantees

Maestro guarantees:

- bounded sub-routines
- bounded retries
- bounded memory usage

---

## 11. Summary

Maestro attempts execution.
It never promises completion.

---

## Status

STABLE — RFC-6 ALIGNED
