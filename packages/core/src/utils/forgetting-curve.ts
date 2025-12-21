/**
 * Forgetting Curve (RFC-6 §11, RFC-2 §7)
 *
 * Historical weight MUST decay exponentially.
 * This is NORMATIVE - implementations MUST use this formula.
 * Approximations are NOT acceptable.
 */

/** Half-life in milliseconds (5 minutes) */
export const HALF_LIFE_MS = 5 * 60 * 1000

/** Decay constant λ = ln(2) / half-life */
export const LAMBDA = Math.log(2) / HALF_LIFE_MS

/**
 * Calculate decay weight for given elapsed time
 *
 * weight(t) = e^(-λ * t)
 *
 * @param elapsedMs - Time elapsed since event (milliseconds)
 * @returns Weight between 0..1 (1 = just happened, 0 = fully decayed)
 */
export function decayWeight(elapsedMs: number): number {
  if (elapsedMs < 0) {
    return 1
  }
  return Math.exp(-LAMBDA * elapsedMs)
}

/**
 * Calculate elapsed time to reach target weight
 *
 * Inverse of decayWeight: t = -ln(weight) / λ
 *
 * @param targetWeight - Target weight (0..1)
 * @returns Elapsed time in milliseconds
 */
export function timeToWeight(targetWeight: number): number {
  if (targetWeight <= 0) {
    return Infinity
  }
  if (targetWeight >= 1) {
    return 0
  }
  return -Math.log(targetWeight) / LAMBDA
}
