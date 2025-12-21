# RFC-3: Observability & Diagnostics

**Subtitle:** Visibility Without State Retention

## Status

- **Type:** Informational / Recommended
- **Depends on:** RFC-0, RFC-1, RFC-2
- **Scope:** Diagnostics only
- **Non-goal:** Debugging execution logic

---

## 1. Purpose

This RFC defines **how Maestro is observed** without violating:

- result ignorance
- statelessness
- task isolation

Observability is mandatory, but **introspection is limited**.

---

## 2. Observability Principles (LOCKED)

Maestro MUST be observable in terms of:

- decisions
- pressure
- policy transitions

Maestro MUST NOT expose:

- task payloads
- execution results
- external system state

Visibility is **about decisions**, not data.

---

## 3. Mandatory Signals

Maestro MUST emit events for:

- task admitted
- sub-routine spawned
- cooperative carry invoked
- retry attempted
- escalation triggered
- task dropped
- pressure level changed
- policy tightened / loosened

Each event MUST include:

- timestamp
- task id (opaque)
- decision reason
- current pressure snapshot

---

## 4. Drop Diagnostics (CRITICAL)

Every drop MUST include:

- terminal reason
- retry depth
- spawn budget usage
- pressure level

Dropped tasks MUST be explainable **post-mortem**.

---

## 5. Metrics (RECOMMENDED)

Recommended metrics:

- admission rate
- retry rate
- escalation rate
- drop rate
- spawn saturation
- pressure index

Metrics MUST NOT:

- accumulate task state
- require payload inspection

---

## 6. Forbidden Observability

Maestro MUST NOT:

- trace task lifetimes end-to-end
- correlate execution outcomes
- infer success rates

These belong to external systems.

---

## 7. Summary

Observability exists to answer:

> “Why did Maestro make this decision?”

Not:

> “What happened next?”
