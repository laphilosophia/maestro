import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TTLMap } from '../src/utils/ttl-map.js'

describe('TTLMap (RFC-0 §2.3 Ephemeral State)', () => {
  let map: TTLMap<string, number>

  beforeEach(() => {
    vi.useFakeTimers()
    map = new TTLMap<string, number>(1000) // 1 second TTL
  })

  describe('basic operations', () => {
    it('stores and retrieves values', () => {
      map.set('a', 1)
      expect(map.get('a')).toBe(1)
    })

    it('returns undefined for missing keys', () => {
      expect(map.get('missing')).toBeUndefined()
    })

    it('reports correct size', () => {
      map.set('a', 1)
      map.set('b', 2)
      expect(map.size).toBe(2)
    })

    it('deletes entries', () => {
      map.set('a', 1)
      expect(map.delete('a')).toBe(true)
      expect(map.get('a')).toBeUndefined()
    })

    it('clears all entries', () => {
      map.set('a', 1)
      map.set('b', 2)
      map.clear()
      expect(map.size).toBe(0)
    })
  })

  describe('TTL expiration', () => {
    it('returns value before TTL expires', () => {
      map.set('a', 1)
      vi.advanceTimersByTime(500)
      expect(map.get('a')).toBe(1)
    })

    it('returns undefined after TTL expires', () => {
      map.set('a', 1)
      vi.advanceTimersByTime(1001)
      expect(map.get('a')).toBeUndefined()
    })

    it('respects custom TTL per entry', () => {
      map.set('short', 1, 500)
      map.set('long', 2, 2000)

      vi.advanceTimersByTime(750)
      expect(map.get('short')).toBeUndefined()
      expect(map.get('long')).toBe(2)

      vi.advanceTimersByTime(1500)
      expect(map.get('long')).toBeUndefined()
    })

    it('has() returns false for expired entries', () => {
      map.set('a', 1)
      expect(map.has('a')).toBe(true)
      vi.advanceTimersByTime(1001)
      expect(map.has('a')).toBe(false)
    })
  })

  describe('max size enforcement', () => {
    it('evicts oldest when max size reached', () => {
      const smallMap = new TTLMap<string, number>(10000, 3)

      smallMap.set('a', 1)
      vi.advanceTimersByTime(10)
      smallMap.set('b', 2)
      vi.advanceTimersByTime(10)
      smallMap.set('c', 3)
      vi.advanceTimersByTime(10)

      // Adding 4th should evict 'a' (oldest by expiry)
      smallMap.set('d', 4)

      expect(smallMap.get('a')).toBeUndefined()
      expect(smallMap.get('b')).toBe(2)
      expect(smallMap.get('c')).toBe(3)
      expect(smallMap.get('d')).toBe(4)
      expect(smallMap.size).toBe(3)
    })

    it('does not evict when updating existing key', () => {
      const smallMap = new TTLMap<string, number>(10000, 2)

      smallMap.set('a', 1)
      smallMap.set('b', 2)
      smallMap.set('a', 10) // Update, not insert

      expect(smallMap.get('a')).toBe(10)
      expect(smallMap.get('b')).toBe(2)
      expect(smallMap.size).toBe(2)
    })
  })

  describe('prune', () => {
    it('removes all expired entries', () => {
      map.set('a', 1, 500)
      map.set('b', 2, 1500)
      map.set('c', 3, 2500)

      vi.advanceTimersByTime(1000)
      const evicted = map.prune()

      expect(evicted).toBe(1)
      expect(map.get('a')).toBeUndefined()
      expect(map.get('b')).toBe(2)
      expect(map.get('c')).toBe(3)
    })
  })

  describe('RFC-0 compliance', () => {
    it('state is discardable (clear works)', () => {
      map.set('important', 999)
      map.clear()
      // No correctness violated - this is acceptable
      expect(map.get('important')).toBeUndefined()
    })

    it('state has bounded lifetime via TTL', () => {
      map.set('ephemeral', 42)
      vi.advanceTimersByTime(10000) // Long after TTL
      // State naturally discarded - RFC-0 compliant
      expect(map.get('ephemeral')).toBeUndefined()
    })
  })
})
