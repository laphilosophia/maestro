# Maestro Roadmap

> Last updated: 2025-12-29

## Current: v0.2.0-alpha.0

RFC-7 Decision Envelope Layer implemented. Core decision fabric operational.

---

## Pre-Stable Blockers

Before proceeding to stable, these must be resolved:

| Blocker                            | Status         | Priority |
| ---------------------------------- | -------------- | -------- |
| RFC-8: Event Schema Evolution      | ✅ Drafted     | P0       |
| `DecisionEvent` @stable annotation | ⏳ Not started | P0       |
| `@maestro/telemetry` stub package  | ⏳ Not started | P0       |
| `@maestro/cloud` stub package      | ⏳ Not started | P1       |

---

## Milestones

### v0.2.0-alpha.1 — Dispatch Refinement

- [ ] `eligibleCandidates` filtering in strategies
- [ ] Scored candidate model (RFC-2 alignment)
- [ ] Forgetting curve integration
- [ ] Enable skipped strategy tests

### v0.2.0-alpha.2 — Test Hardening

- [ ] Integration test suite
- [ ] Edge case coverage
- [ ] Stress/load tests

### v0.2.0-beta.0 — Observability

- [ ] Drop diagnostics enhancement (RFC-3)
- [ ] Metrics export hooks
- [ ] Trace correlation

### v0.2.0-rc.0 — Release Candidate

- [ ] RFC-4 Deployment patterns
- [ ] RFC-5 Versioning guarantees
- [ ] Migration guide

### v0.2.0 — Stable

Full RFC compliance. Production-ready.

---

## RFC Status

| RFC                    | Status         | Notes                    |
| ---------------------- | -------------- | ------------------------ |
| RFC-0 Core Contract    | ✅ Normative   | Immutable                |
| RFC-1 Execution Model  | ⚠️ Partial     | Retry mechanics pending  |
| RFC-2 Policy-Strategy  | ⚠️ Partial     | Scored model pending     |
| RFC-3 Observability    | ⚠️ Partial     | Drop diagnostics pending |
| RFC-4 Deployment       | 📋 Draft       | Not started              |
| RFC-5 Versioning       | 📋 Draft       | Not started              |
| RFC-6 Core Types       | ✅ Normative   | Complete                 |
| RFC-6.1 Decision Space | ✅ Normative   | Complete                 |
| RFC-7 Envelope Layer   | ✅ Implemented | 1 skipped test           |
| RFC-8 Event Schema     | ✅ Normative   | Not started              |

---

## Timeline Estimate

| Milestone | Effort  | Cumulative  |
| --------- | ------- | ----------- |
| alpha.1   | ~2 days | 2 days      |
| alpha.2   | ~1 day  | 3 days      |
| beta.0    | ~1 day  | 4 days      |
| RC        | ~2 days | 6 days      |
| Stable    | ~1 day  | **~1 week** |

Conservative estimate: **2 weeks** including buffer.
