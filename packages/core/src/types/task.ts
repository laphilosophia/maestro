/**
 * Task - Carrier of intent (RFC-0 §2.1)
 *
 * Maestro treats tasks as opaque units.
 * Only declared metadata may influence decisions.
 */

/** Opaque task identifier, UUID recommended */
export type TaskID = string

/**
 * Immutable task metadata (RFC-6 §2)
 *
 * Defines contract limits, not runtime counters.
 * MUST NOT contain payload.
 */
export interface TaskMetadata {
  /** Routing hint for intent-based spawn strategy */
  readonly intent?: string

  /** Priority level 0..100, higher = more urgent */
  readonly priority?: number

  /** Maximum sub-routines across task lifetime (HARD limit) */
  readonly spawnBudget: number

  /** Maximum retry attempts (HARD limit) */
  readonly maxRetryDepth: number

  /** Task creation timestamp (epoch ms) */
  readonly createdAt: number
}

/**
 * Task - Opaque unit of work (RFC-0 §2.1)
 *
 * Maestro MUST NOT:
 * - mutate task data
 * - inspect payload content
 * - derive meaning from payload
 */
export interface Task {
  readonly id: TaskID
  readonly metadata: TaskMetadata
}
