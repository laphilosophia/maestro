# RFC-2: Policy & Strategy Layer

## Subtitle: Spawn Strategy, Pressure Modulation, and Decision Surface

## Status

- Type: Normative / Stable
- Depends on: RFC-0, RFC-1
- Updated to align with: RFC-6

---

## 1. Purpose

This RFC defines how Maestro's mechanical decisions are shaped by:

- spawn strategies
- system pressure
- retry depth
- bounded historical bias

No learning, prediction, or optimization is permitted.

---

## 2. Policy Model

Policies define bounds and thresholds.

Policies:

- MUST be explicit
- MUST be inspectable
- MUST NOT mutate tasks
- MUST NOT infer semantics

---

## 3. Spawn Strategy Model (REVIZED)

Spawn strategies select a **SubRoutineGroup**, consisting of:

- exactly one primary sub-routine
- zero or more cooperative sub-routines

Strategies MUST NOT produce multiple commit-capable candidates.

---

## 4. Supported Spawn Strategies

### 4.1 Intent-Based Spawn (Default)

Selection based on declared task metadata:

- intent
- expected cost
- resource hints

Payload inspection is forbidden.

---

### 4.2 Priority-Based Spawn (3D Array)

Selection influenced by:

- priority
- retry depth
- pressure level

Priority NEVER bypasses drop conditions.

---

### 4.3 Random Spawn (Bounded)

Used for:

- cold start
- bias reset
- exploration

Randomness is bounded and never exclusive.

---

### 4.4 Performance Penalty Spawn

Only negative bias is allowed.

- slow or costly paths are penalized
- no positive reinforcement permitted
- penalties decay over time

---

## 5. Strategy Composition Rule

Spawn strategies MUST be applied in this order:

1. Intent eligibility
2. Priority × pressure modulation
3. Performance penalty
4. Bounded random selection

---

## 6. Pressure Modulation (Amigdala)

Amigdala provides pressure snapshots.

Pressure:

- tightens thresholds
- reduces tolerance
- increases drop likelihood

Amigdala NEVER selects tasks.

---

## 7. Forgetting Curve (LOCKED)

Historical influence MUST decay exponentially.

Given:

- half-life = 5 minutes
- time unit = milliseconds

`λ = ln(2) / (5 * 60 * 1000)`

`weight(t) = e^(−λ × t)`

Decay is:

- time-based
- monotonic
- irreversible

---

## 8. Retry & Escalation Interaction

- Retry depth is monotonic
- Escalation increases urgency
- Escalation does NOT bypass pressure

---

## 9. Explicit Drop Policy

Drop is:

- policy-driven
- observable
- terminal

Implicit drops are forbidden.

---

## 10. Forbidden Behaviors

This layer MUST NOT:

- learn from outcomes
- predict success
- implement fairness
- correlate tasks

---

## 11. Summary

Maestro does not choose the best path.

It decides whether a path is still admissible.

---

## Status

STABLE — RFC-6 ALIGNED
