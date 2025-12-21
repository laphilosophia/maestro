/**
 * PressureSignal - System pressure snapshot (RFC-6 §4)
 *
 * Pressure is:
 * - scalar (0..1 normalized)
 * - snapshot-based
 * - stateless
 */
export interface PressureSignal {
  /** Memory pressure 0..1 */
  readonly memory: number

  /** Queue depth pressure 0..1 */
  readonly queueDepth: number

  /** Spawn saturation 0..1 */
  readonly spawnSaturation: number

  /** Snapshot timestamp (epoch ms) */
  readonly timestamp: number
}
