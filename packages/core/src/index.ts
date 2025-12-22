/**
 * @maestro/core
 *
 * Mechanical decision fabric for task admission under pressure.
 * RFC-0 through RFC-7 compliant.
 */

// Types
export type { Decision, DropReason } from './types/decision.js'
export type { PressureSignal } from './types/pressure.js'
export { createInitialRuntimeState } from './types/runtime-state.js'
export type { TaskRuntimeState } from './types/runtime-state.js'
export type { SubRoutine, SubRoutineGroup } from './types/subroutine.js'
export type { Task, TaskID, TaskMetadata } from './types/task.js'

// RFC-7 Types
export type { CandidateProfile, CandidateRegistry } from './types/candidate-registry.js'
export {
  createDecisionEnvelope,
  createPermissiveEnvelope,
  type DecisionEnvelope,
  type EnvelopeResolver,
} from './types/envelope.js'

// Utils
export { HALF_LIFE_MS, LAMBDA, decayWeight, timeToWeight } from './utils/forgetting-curve.js'
export { TTLMap } from './utils/ttl-map.js'

// Components
export {
  createAmigdala,
  createNodePressureSource,
  noopPressureSource,
  type Amigdala,
  type AmigdalaConfig,
  type PressureSource,
} from './components/amigdala.js'

export {
  createCircuitDistributor,
  createSimpleFactory,
  type CircuitDistributor,
  type CircuitDistributorConfig,
} from './components/circuit-distributor.js'

export {
  createNoopSubRoutine,
  createSubRoutine,
  type DispatchHandler,
} from './components/subroutine.js'

// RFC-7 Components
export { createCandidateRegistry } from './components/candidate-registry.js'
export { createEnvelopeResolver } from './components/envelope-resolver.js'

export {
  createMainRoutine,
  type DecisionEvent,
  type DecisionEventHandler,
  type MainRoutine,
  type MainRoutineConfig,
} from './components/main-routine.js'

// Strategies
export {
  checkEligibility,
  type EligibilityResult,
  type SpawnStrategy,
  type StrategyContext,
  type StrategyResult,
  type SubRoutineFactory,
} from './strategies/types.js'

export { createIntentBasedStrategy, type IntentBasedConfig } from './strategies/intent-based.js'

export {
  createPriorityBasedStrategy,
  type PriorityBasedConfig,
  type PriorityThreshold,
} from './strategies/priority-based.js'

export { createRandomStrategy, type RandomConfig } from './strategies/random.js'

export {
  createPenaltyTracker,
  createPerformancePenaltyStrategy,
  type PenaltyRecord,
  type PenaltyTracker,
  type PerformancePenaltyConfig,
} from './strategies/performance-penalty.js'

export { composeStrategies, createStandardStrategyStack } from './strategies/compose.js'

// Observability
export {
  createDropDiagnostic,
  createMetricsCollector,
  type DropDiagnostic,
  type MetricsCollector,
  type MetricsSnapshot,
  type ObservabilityEvent,
  type ObservabilityEventType,
} from './observability/events.js'

// Convenience (for demos only)
export {
  createMaestro,
  type DecisionObserver,
  type DispatchObserver,
  type QuickStartConfig,
} from './convenience/create-maestro.js'
