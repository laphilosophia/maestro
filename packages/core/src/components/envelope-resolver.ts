import type { DecisionEnvelope, EnvelopeResolver } from '../types/envelope.js'

/**
 * Create an EnvelopeResolver from a static mapping.
 *
 * @param map - Intent to envelope mapping
 * @returns Frozen EnvelopeResolver
 *
 * @example
 * ```ts
 * const resolver = createEnvelopeResolver({
 *   'telemetry': telemetryEnvelope,
 *   'critical': criticalEnvelope,
 * })
 * ```
 *
 * Lifecycle (RFC-7 §5.2):
 * - MUST be instantiated at init-time
 * - MUST NOT change its resolution mapping at runtime
 * - Hot-reloading resolver mappings is forbidden
 */
export function createEnvelopeResolver(map: Record<string, DecisionEnvelope>): EnvelopeResolver {
  // Freeze the mapping object to prevent runtime mutation
  const frozen = Object.freeze({ ...map })

  return {
    resolve: (intent: string): DecisionEnvelope | null => {
      return frozen[intent] ?? null
    },
  }
}
