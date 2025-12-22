# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- **RFC-7: Decision Envelope Layer** - Static policy constraints for admission
  - `DecisionEnvelope` interface with policy flags (allowDrop, allowRetry, etc.)
  - `EnvelopeResolver` for intent-to-envelope mapping
  - `CandidateRegistry` and `CandidateProfile` for sub-routine inventory
  - `createDecisionEnvelope()`, `createPermissiveEnvelope()` helpers
  - `createCandidateRegistry()`, `createEnvelopeResolver()` factories
  - Drop gate mask semantics (RFC-6.1 §6.0)
  - Envelope-aware observability (`envelopeId`, `envelopeNarrowed`)
- **RFC-6.1: Decision Space Model** - Formal 3D constraint space documentation
- **@maestro/worker-gate** - Worker pool gate adapter
  - Generic `WorkerPool` interface
  - Pool → PressureSource adapter
  - Fire-and-forget dispatch semantics
- Examples directory with 8 demo files (added `envelope-iot-example.ts`)

### Changed

- **BREAKING:** `MainRoutineConfig` now requires `registry`, `envelopeResolver`, `defaultEnvelope`
- **BREAKING:** `CircuitDistributor.select()` signature changed to include `envelope` parameter
- **BREAKING:** `StrategyContext` extended with `envelope` and `eligibleCandidates`
- **BREAKING:** `DecisionEvent` extended with `envelopeId`, `envelopeNarrowed`, `eligibleCandidatesCount`
- Updated `createMaestro()` convenience wrapper for RFC-7 compatibility

---

## [0.1.0-alpha.0] - 2024-12-21

### Added

- **Core decision fabric** with RFC-0 through RFC-6 compliance
- **Amigdala** pressure observer with pluggable sources
- **Spawn strategies**: intent-based, priority-based, random, performance-penalty
- **Strategy composition** via `composeStrategies()`
- **CircuitDistributor** for sub-routine selection
- **MainRoutine** with ephemeral state management (TTLMap)
- **Observability**: DecisionEvent, DropDiagnostic, MetricsCollector
- **Forgetting curve** implementation (5-minute half-life)
- **Quick-start wrapper** `createMaestro()` for demos only

### Notes

- Introduced a demos-only convenience wrapper without altering core composition semantics
- Core uses dependency injection; explicit composition required for production
