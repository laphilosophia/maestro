/**
 * Pool → PressureSource Adapter
 *
 * Converts worker pool metrics to Maestro pressure signals.
 */

import type { PressureSource } from '@maestro/core'
import type { WorkerPool } from './types.js'

/**
 * Default max queue depth for pressure normalization
 *
 * Maestro does not infer capacity.
 * This is a sensible default for most worker pools.
 */
export const DEFAULT_MAX_QUEUE_DEPTH = 1000

/**
 * Configuration for pool pressure source
 */
export interface PoolPressureConfig {
  /**
   * Maximum queue depth for normalization
   * Queue depth pressure = current / max
   */
  readonly maxQueueDepth?: number
}

/**
 * Create a PressureSource from worker pool metrics
 *
 * Maps pool.snapshot() to Amigdala pressure signals:
 * - memoryPressure: always 0 (pool doesn't know memory)
 * - queueDepthPressure: queueDepth / maxQueueDepth
 * - spawnSaturation: utilization
 *
 * @example
 * ```typescript
 * const pressureSource = createPoolPressureSource(pool, { maxQueueDepth: 500 })
 * const amigdala = createAmigdala({ source: pressureSource })
 * ```
 */
export function createPoolPressureSource(
  pool: WorkerPool,
  config?: PoolPressureConfig
): PressureSource {
  const maxQueueDepth = config?.maxQueueDepth ?? DEFAULT_MAX_QUEUE_DEPTH

  return {
    getMemoryPressure: (): number => {
      // Pool doesn't provide memory info
      // Mirror utilization to ensure pressure average can exceed threshold
      const snapshot = pool.snapshot()
      return Math.min(snapshot.utilization, 1)
    },

    getQueueDepthPressure: (): number => {
      const snapshot = pool.snapshot()
      const normalized = snapshot.queueDepth / maxQueueDepth
      return Math.min(normalized, 1)
    },

    getSpawnSaturation: (): number => {
      const snapshot = pool.snapshot()
      return Math.min(snapshot.utilization, 1)
    },
  }
}
