/**
 * Amigdala - Pressure Observer (RFC-6 §7, RFC-2 §6)
 *
 * Observes system pressure and provides snapshots.
 * Pull-only, no callbacks, no push.
 *
 * Amigdala:
 * - observes system pressure
 * - modulates thresholds
 * - influences urgency
 *
 * Amigdala MUST NOT:
 * - select tasks
 * - dispatch tasks
 * - cancel tasks
 * - interpret outcomes
 */

import type { PressureSignal } from '../types/pressure.js'

/**
 * Pressure source interface
 *
 * Implementations provide platform-specific metrics.
 */
export interface PressureSource {
  /** Get current memory pressure (0..1) */
  getMemoryPressure(): number

  /** Get current queue depth pressure (0..1) */
  getQueueDepthPressure(): number

  /** Get current spawn saturation (0..1) */
  getSpawnSaturation(): number
}

/**
 * Amigdala configuration
 */
export interface AmigdalaConfig {
  /** Custom pressure source (optional, defaults to noop) */
  source?: PressureSource
}

/**
 * Amigdala - System pressure observer (RFC-6 §7)
 *
 * Interface:
 * - Pull-only
 * - No callbacks
 * - No push
 */
export interface Amigdala {
  /**
   * Get current pressure snapshot
   *
   * Main Routine pulls snapshot at each decision point.
   */
  snapshot(): PressureSignal
}

/**
 * Default no-op pressure source
 * Returns zero pressure for all metrics.
 */
export const noopPressureSource: PressureSource = {
  getMemoryPressure: (): number => 0,
  getQueueDepthPressure: (): number => 0,
  getSpawnSaturation: (): number => 0,
}

/**
 * Create Amigdala instance
 *
 * @param config - Optional configuration
 * @returns Amigdala instance with snapshot() method
 */
export function createAmigdala(config?: AmigdalaConfig): Amigdala {
  const source = config?.source ?? noopPressureSource

  return {
    snapshot(): PressureSignal {
      return {
        memory: clamp(source.getMemoryPressure()),
        queueDepth: clamp(source.getQueueDepthPressure()),
        spawnSaturation: clamp(source.getSpawnSaturation()),
        timestamp: Date.now(),
      }
    },
  }
}

/**
 * Clamp value to 0..1 range
 */
function clamp(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

/**
 * Node.js memory pressure source
 *
 * Uses process.memoryUsage() for memory metrics.
 */
export function createNodePressureSource(
  maxHeapBytes: number = 1024 * 1024 * 1024, // 1GB default
  maxQueueDepth: number = 10000,
  maxSpawns: number = 1000
): PressureSource & { setQueueDepth: (n: number) => void; setSpawnCount: (n: number) => void } {
  let queueDepth = 0
  let spawnCount = 0

  return {
    getMemoryPressure(): number {
      // Check if we're in Node.js environment
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage()
        return usage.heapUsed / maxHeapBytes
      }
      return 0
    },

    getQueueDepthPressure(): number {
      return queueDepth / maxQueueDepth
    },

    getSpawnSaturation(): number {
      return spawnCount / maxSpawns
    },

    setQueueDepth(n: number): void {
      queueDepth = n
    },

    setSpawnCount(n: number): void {
      spawnCount = n
    },
  }
}
