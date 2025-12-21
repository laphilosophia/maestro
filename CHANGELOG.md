# Changelog

All notable changes to this project will be documented in this file.

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
