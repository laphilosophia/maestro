import type { SubRoutine } from './subroutine.js'

/**
 * Candidate Registry Types (RFC-7 §4)
 *
 * CandidateRegistry is the inventory of all available sub-routine candidates.
 * It is separate from DecisionEnvelope which declares eligibility.
 *
 * Separation of concerns:
 * - Registry = inventory (what exists)
 * - Envelope = eligibility (what's allowed)
 * - Strategy = selection (what's preferred)
 */

/**
 * CandidateProfile - Sub-routine candidate definition (RFC-7 §4)
 *
 * Defines a candidate that can be selected for task dispatch.
 */
export interface CandidateProfile {
  /** Unique candidate identifier */
  readonly id: string

  /**
   * Declared capabilities (for documentation/debugging only)
   *
   * Note: Capability matching at runtime is OUT OF SCOPE for RFC-7.
   * These are informational only.
   */
  readonly capabilities: readonly string[]

  /**
   * Factory function to create a SubRoutine instance.
   *
   * Called when this candidate is selected for dispatch.
   */
  readonly factory: () => SubRoutine
}

/**
 * CandidateRegistry - Candidate inventory (RFC-7 §4)
 *
 * Rules:
 * - Build-time initialized
 * - NEVER iterated during selection (O(k) not O(N))
 * - Immutability is BEHAVIORAL, not structural
 */
export interface CandidateRegistry {
  /**
   * Get candidate by ID.
   *
   * @param id - Candidate identifier
   * @returns CandidateProfile if found, undefined otherwise
   */
  get(id: string): CandidateProfile | undefined

  /**
   * List all candidate IDs.
   *
   * Note: This is for initialization/debugging only.
   * MUST NOT be called during selection path.
   */
  list(): readonly string[]

  /**
   * Get total candidate count.
   *
   * Used for envelope narrowing check (observability).
   * This is the ONLY registry access allowed during selection.
   */
  count(): number
}
