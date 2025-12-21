# RFC-4: Deployment & Integration Patterns

**Subtitle:** Where Maestro Lives (and Where It Must Not)

## Status

* **Type:** Informational / Prescriptive
* **Depends on:** RFC-0, RFC-1, RFC-2
* **Scope:** System integration
* **Non-goal:** Infrastructure orchestration

---

## 1. Deployment Position (LOCKED)

Maestro MUST live:

* at **decision boundaries**
* before expensive execution
* before irreversible side-effects

Maestro MUST NOT live:

* inside business logic
* inside worker execution
* inside persistence layers

---

## 2. Valid Integration Patterns

### 2.1 Ingress Decision Gate

* API ingestion
* IoT event intake
* Cron-triggered pipelines

Maestro decides **whether the task continues**.

---

### 2.2 Pre-Worker Admission

* Before worker pool dispatch
* Before thread spawn
* Before remote call

Maestro does not manage workers.
It manages **permission to try**.

---

### 2.3 Multi-Stage Pipelines

Maestro MAY be used:

* between pipeline stages
* as a re-admission gate

Each stage is independent.
No cross-stage memory allowed.

---

## 3. Invalid Integration Patterns

Maestro MUST NOT be used:

* as a queue
* as a scheduler
* as a state machine
* as a workflow coordinator

If Maestro is required for correctness, the architecture is invalid.

---

## 4. Restart & Failure Model

Maestro MUST be restart-safe:

* no recovery logic
* no replay
* no reconciliation

Restart implies **clean slate**.

---

## 5. Summary

Maestro belongs:

* before execution
* between attempts
* outside business meaning
