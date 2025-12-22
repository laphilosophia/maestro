import type { CandidateProfile, CandidateRegistry } from '../types/candidate-registry.js'

/**
 * Create a CandidateRegistry from a list of profiles.
 *
 * @param candidates - Array of candidate profiles
 * @returns Immutable CandidateRegistry
 *
 * @example
 * ```ts
 * const registry = createCandidateRegistry([
 *   { id: 'fast-route', capabilities: ['fast'], factory: () => fastSubRoutine },
 *   { id: 'slow-route', capabilities: ['reliable'], factory: () => slowSubRoutine },
 * ])
 * ```
 *
 * Note: Map mutability is irrelevant because registry is never iterated
 * during selection. Immutability is BEHAVIORAL, not structural.
 * CircuitDistributor only accesses registry via envelope.eligibleCandidates.
 */
export function createCandidateRegistry(candidates: CandidateProfile[]): CandidateRegistry {
  const map = new Map(candidates.map((c) => [c.id, c]))
  // Map mutability is irrelevant: registry is never iterated during selection
  // Immutability is BEHAVIORAL, not structural

  return {
    get: (id: string) => map.get(id),
    list: () => Object.freeze([...map.keys()]),
    count: () => map.size,
  }
}
