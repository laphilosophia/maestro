# RFC-0

## Maestro Core Contract

**Execution Decision Fabric**

---

## 0. Scope Lock

This RFC defines the **immutable core** of Maestro.

Anything not explicitly described here:

* Is **out of scope**
* Must be implemented **outside** Maestro
* Must not be relied upon by core behavior

Future extensions MAY exist, but MUST NOT weaken or bypass this contract.

---

## 1. Purpose

Maestro is a **mechanical decision fabric** that determines:

* **whether** a task should proceed
* **where** a task should be dispatched
* **under what pressure constraints**

Maestro explicitly does **not** determine:

* correctness
* success
* semantic validity
* business meaning

Maestro only governs **continuation under pressure**.

---

## 2. Core Invariants

### 2.1 Task Invariance

* A Task is a **carrier of intent**, not execution.
* Maestro MUST treat the task as an opaque unit.
* Maestro MUST NOT:

  * mutate task data
  * inspect payload content
  * derive meaning from payload

Only **declared metadata** MAY influence decisions.

---

### 2.2 Result Ignorance

* Maestro MUST NOT:

  * subscribe to results
  * poll for completion
  * correlate retries with outcomes
  * branch logic based on success/failure

Any signal received post-dispatch is treated as:

> **execution pressure feedback**, not result data.

---

### 2.3 Statelessness by Design

* Maestro MAY hold **ephemeral decision metadata only**
* Ephemeral metadata MUST:

  * have bounded lifetime
  * be discardable at any moment
  * never be required for correctness

If Maestro restarts:

* No correctness MUST be lost
* No task identity MUST be reconstructed
* No execution MUST depend on past memory

---

### 2.4 Fail-Soft Semantics

* Failure is **never exceptional**
* Failure is **never escalated automatically**
* Failure only influences **future admission pressure**

Retrying is:

* optional
* bounded
* policy-constrained

Dropping is:

* final
* non-recoverable
* non-erroneous

---

## 3. Main Components

### 3.1 Main Routine

The Main Routine:

* accepts tasks
* applies mechanical decision rules
* delegates dispatch
* emits decision signals

The Main Routine:

* MUST NOT learn
* MUST NOT optimize globally
* MUST NOT coordinate multiple tasks
* MUST NOT correlate tasks

Each task is decided **in isolation**, under current pressure.

---

### 3.2 Sub-Routines

Sub-routines are **ephemeral couriers**.

They:

* temporarily carry a task
* apply transport-level constraints only
* deliver to an external destination
* immediately release all references

They MUST:

* NOT wait
* NOT retain
* NOT respond
* NOT signal results

Sub-routine lifecycle is strictly bounded.

---

### 3.3 Circuit Distributor

The Circuit Distributor:

* controls spawn limits
* enforces budgets
* selects spawn strategies

It MUST NOT:

* validate correctness
* inspect domain semantics
* override core invariants

Spawn strategy affects **distribution**, not meaning.

---

### 3.4 Amigdala (Supervisor)

The Amigdala:

* observes system pressure
* modulates thresholds
* influences urgency

It MUST NOT:

* select tasks
* dispatch tasks
* cancel tasks
* interpret outcomes

Amigdala alters **how strict** decisions are, not **what** decisions mean.

---

## 4. Decision Model

### 4.1 Mechanical Rule

All decisions MUST be:

* local
* bounded
* pressure-aware
* metadata-driven

No probabilistic inference.
No adaptive learning.
No historical optimization.

---

### 4.2 Isolation Guarantee

No task decision MAY depend on:

* other task outcomes
* global fairness
* future expectations

This prevents:

* hidden coupling
* emergent deadlocks
* implicit workflows

---

## 5. Explicit Non-Goals

Maestro MUST NOT be used as:

* workflow engine
* saga coordinator
* retry framework
* message queue
* event loop replacement
* stream processor
* data validator
* domain policy engine

Any implementation drifting into these roles is **invalid**.

---

## 6. Observability

Maestro MUST emit:

* admission decisions
* retry attempts
* escalation events
* drop decisions
* pressure state transitions

Silent decisions are forbidden.

Observability is **mandatory**, not optional.

---

## 7. Drop Semantics

Dropping a task:

* indicates exhaustion of admissible paths
* indicates pressure-based refusal
* is not an error
* is not a failure

Dropped tasks MUST NOT:

* be retried automatically
* be resurrected internally
* be re-injected implicitly

---

## 8. Safety Guarantees

Maestro guarantees:

* bounded memory usage
* bounded concurrency
* bounded recursion
* bounded retry depth

Maestro explicitly refuses to guarantee:

* fairness
* ordering
* correctness
* liveness of external systems

---

## 9. Compatibility Rule

Any extension or implementation:

* MUST comply with this RFC
* MUST fail fast if invariants are violated
* MUST prefer dropping over corruption

Violating RFC-0 invalidates Maestro compliance.

---

## 10. Summary

Maestro is:

* a **decision fabric**
* a **pressure regulator**
* a **continuation gate**

Maestro is not:

* a brain
* a queue
* a workflow
* a promise chain

Maestro answers only one question:

> **“Under current pressure, does this task get to continue?”**

---

## RFC-0 Status

**LOCKED — v1.0-stable**

No backward-incompatible changes allowed.
