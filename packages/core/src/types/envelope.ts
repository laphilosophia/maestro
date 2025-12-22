/**
 * Decision Envelope Types (RFC-7)
 *
 * Static policy constraints for admission decisions.
 * Envelopes define the maximum admissible decision subspace.
 */

/**
 * DecisionEnvelope - Static policy artifact (RFC-7 §3)
 *
 * Rules:
 * - MUST be defined at build-time
 * - MUST be immutable at runtime (Object.freeze)
 * - MUST NOT change based on pressure, history, or outcomes
 *
 * Envelope narrows what TaskMetadata allows, never overrides.
 */
export interface DecisionEnvelope {
  /**
   * Unique envelope identifier.
   * MUST be globally unique within a runtime instance.
   * SHOULD be namespaced (e.g. 'telemetry.strict.v1').
   */
  readonly id: string

  // === CONSTRAINT FLAGS ===

  /** Allow task to be dropped under pressure? (RFC-7 §3.1) */
  readonly allowDrop: boolean

  /** Allow retry attempts? (RFC-7 §3.1) */
  readonly allowRetry: boolean

  /** Allow cooperative sub-routines? (RFC-7 §3.1) */
  readonly allowCooperate: boolean

  /** Allow history influence (forgetting curve)? (RFC-7 §3.1) */
  readonly allowHistoryInfluence: boolean

  // === CANDIDATE ELIGIBILITY ===

  /**
   * Pre-determined eligible candidate IDs (RFC-7 §3.2)
   *
   * - Pre-defined at build-time
   * - References candidate IDs from CandidateRegistry
   * - MUST NOT be computed at runtime
   *
   * Empty Array Semantics:
   * If empty, NO candidate is eligible → hard exclusion → null selection.
   * Empty does NOT mean "all candidates are eligible".
   */
  readonly eligibleCandidates: readonly string[]
}

/**
 * EnvelopeResolver - Intent to envelope mapper (RFC-7 §5)
 *
 * Rules:
 * - MUST be a simple key→value lookup
 * - MUST NOT perform pattern matching
 * - MUST return null if intent is unknown
 * - MUST be instantiated at init-time
 * - MUST NOT change its resolution mapping at runtime
 */
export interface EnvelopeResolver {
  /**
   * Resolve envelope for given intent.
   *
   * @param intent - Task intent string
   * @returns DecisionEnvelope if found, null if unknown
   */
  resolve(intent: string): DecisionEnvelope | null
}

/**
 * Create an immutable DecisionEnvelope.
 *
 * @param config - Envelope configuration
 * @returns Frozen DecisionEnvelope
 */
export function createDecisionEnvelope(
  config: Omit<DecisionEnvelope, 'eligibleCandidates'> & {
    eligibleCandidates: string[]
  }
): DecisionEnvelope {
  const envelope: DecisionEnvelope = {
    id: config.id,
    allowDrop: config.allowDrop,
    allowRetry: config.allowRetry,
    allowCooperate: config.allowCooperate,
    allowHistoryInfluence: config.allowHistoryInfluence,
    eligibleCandidates: Object.freeze([...config.eligibleCandidates]),
  }
  return Object.freeze(envelope)
}

/**
 * Default "allow all" envelope for backward compatibility.
 *
 * WARNING: Using this without explicit candidate list means
 * eligibleCandidates will be empty → hard exclusion.
 * You MUST provide eligibleCandidates.
 */
export function createPermissiveEnvelope(
  id: string,
  eligibleCandidates: string[]
): DecisionEnvelope {
  return createDecisionEnvelope({
    id,
    allowDrop: true,
    allowRetry: true,
    allowCooperate: true,
    allowHistoryInfluence: true,
    eligibleCandidates,
  })
}
