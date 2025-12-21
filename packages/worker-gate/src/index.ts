/**
 * @maestro/worker-gate
 *
 * Worker pool gate adapter for Maestro decision fabric.
 */

// Types
export type {
  WorkerGateConfig,
  WorkerGateMetrics,
  WorkerPool,
  WorkerPoolSnapshot,
} from './types.js'

// Pressure adapter
export {
  DEFAULT_MAX_QUEUE_DEPTH,
  createPoolPressureSource,
  type PoolPressureConfig,
} from './pressure.js'

// Worker gate
export { createWorkerGate, type WorkerGate, type WorkerGateFullConfig } from './worker-gate.js'
