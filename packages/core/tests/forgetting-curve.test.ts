import { describe, expect, it } from 'vitest'
import { decayWeight, HALF_LIFE_MS, LAMBDA, timeToWeight } from '../src/utils/forgetting-curve.js'

describe('Forgetting Curve (RFC-6 §11)', () => {
  describe('LAMBDA constant', () => {
    it('is correctly calculated from half-life', () => {
      const expected = Math.log(2) / HALF_LIFE_MS
      expect(LAMBDA).toBeCloseTo(expected, 15)
    })

    it('half-life is 5 minutes', () => {
      expect(HALF_LIFE_MS).toBe(5 * 60 * 1000)
    })
  })

  describe('decayWeight', () => {
    it('returns 1 for elapsed = 0', () => {
      expect(decayWeight(0)).toBe(1)
    })

    it('returns ~0.5 at half-life', () => {
      expect(decayWeight(HALF_LIFE_MS)).toBeCloseTo(0.5, 5)
    })

    it('returns ~0.25 at 2x half-life', () => {
      expect(decayWeight(HALF_LIFE_MS * 2)).toBeCloseTo(0.25, 5)
    })

    it('returns ~0.125 at 3x half-life', () => {
      expect(decayWeight(HALF_LIFE_MS * 3)).toBeCloseTo(0.125, 5)
    })

    it('approaches 0 for large elapsed time', () => {
      const veryLongTime = HALF_LIFE_MS * 20
      expect(decayWeight(veryLongTime)).toBeLessThan(0.000001)
    })

    it('returns 1 for negative elapsed time', () => {
      expect(decayWeight(-1000)).toBe(1)
    })

    it('is monotonically decreasing', () => {
      const weights = [0, 1000, 5000, 10000, 60000, 300000].map(decayWeight)
      for (let i = 1; i < weights.length; i++) {
        expect(weights[i]).toBeLessThan(weights[i - 1]!)
      }
    })
  })

  describe('timeToWeight', () => {
    it('returns 0 for weight = 1', () => {
      expect(timeToWeight(1)).toBe(0)
    })

    it('returns half-life for weight = 0.5', () => {
      expect(timeToWeight(0.5)).toBeCloseTo(HALF_LIFE_MS, 1)
    })

    it('returns Infinity for weight = 0', () => {
      expect(timeToWeight(0)).toBe(Infinity)
    })

    it('returns Infinity for negative weight', () => {
      expect(timeToWeight(-0.5)).toBe(Infinity)
    })

    it('is inverse of decayWeight', () => {
      const testTimes = [0, 1000, 5000, 60000, 300000]
      for (const t of testTimes) {
        const weight = decayWeight(t)
        const recoveredTime = timeToWeight(weight)
        expect(recoveredTime).toBeCloseTo(t, 1)
      }
    })
  })
})
