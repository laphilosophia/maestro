import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createAmigdala,
  createNodePressureSource,
  noopPressureSource,
  type PressureSource,
} from '../src/components/amigdala.js'

describe('Amigdala (RFC-6 §7)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'))
  })

  describe('snapshot()', () => {
    it('returns PressureSignal with all required fields', () => {
      const amigdala = createAmigdala()
      const signal = amigdala.snapshot()

      expect(signal).toHaveProperty('memory')
      expect(signal).toHaveProperty('queueDepth')
      expect(signal).toHaveProperty('spawnSaturation')
      expect(signal).toHaveProperty('timestamp')
    })

    it('includes current timestamp', () => {
      const amigdala = createAmigdala()
      const before = Date.now()
      const signal = amigdala.snapshot()

      expect(signal.timestamp).toBe(before)
    })

    it('same call returns same values (stateless)', () => {
      const mockSource: PressureSource = {
        getMemoryPressure: () => 0.5,
        getQueueDepthPressure: () => 0.3,
        getSpawnSaturation: () => 0.7,
      }

      const amigdala = createAmigdala({ source: mockSource })
      const signal1 = amigdala.snapshot()
      const signal2 = amigdala.snapshot()

      expect(signal1.memory).toBe(signal2.memory)
      expect(signal1.queueDepth).toBe(signal2.queueDepth)
      expect(signal1.spawnSaturation).toBe(signal2.spawnSaturation)
    })
  })

  describe('noopPressureSource', () => {
    it('returns zero for all metrics', () => {
      expect(noopPressureSource.getMemoryPressure()).toBe(0)
      expect(noopPressureSource.getQueueDepthPressure()).toBe(0)
      expect(noopPressureSource.getSpawnSaturation()).toBe(0)
    })
  })

  describe('value clamping', () => {
    it('clamps negative values to 0', () => {
      const source: PressureSource = {
        getMemoryPressure: () => -0.5,
        getQueueDepthPressure: () => -1,
        getSpawnSaturation: () => -100,
      }

      const amigdala = createAmigdala({ source })
      const signal = amigdala.snapshot()

      expect(signal.memory).toBe(0)
      expect(signal.queueDepth).toBe(0)
      expect(signal.spawnSaturation).toBe(0)
    })

    it('clamps values > 1 to 1', () => {
      const source: PressureSource = {
        getMemoryPressure: () => 1.5,
        getQueueDepthPressure: () => 2,
        getSpawnSaturation: () => 100,
      }

      const amigdala = createAmigdala({ source })
      const signal = amigdala.snapshot()

      expect(signal.memory).toBe(1)
      expect(signal.queueDepth).toBe(1)
      expect(signal.spawnSaturation).toBe(1)
    })
  })

  describe('createNodePressureSource', () => {
    it('tracks queue depth', () => {
      const source = createNodePressureSource(1024, 100, 100)

      expect(source.getQueueDepthPressure()).toBe(0)

      source.setQueueDepth(50)
      expect(source.getQueueDepthPressure()).toBe(0.5)

      source.setQueueDepth(100)
      expect(source.getQueueDepthPressure()).toBe(1)
    })

    it('tracks spawn count', () => {
      const source = createNodePressureSource(1024, 100, 100)

      expect(source.getSpawnSaturation()).toBe(0)

      source.setSpawnCount(25)
      expect(source.getSpawnSaturation()).toBe(0.25)
    })
  })

  describe('RFC compliance', () => {
    it('is pull-only (no subscribe/callback methods)', () => {
      const amigdala = createAmigdala()

      // Should only have snapshot method
      expect(typeof amigdala.snapshot).toBe('function')
      expect(Object.keys(amigdala)).toEqual(['snapshot'])
    })

    it('snapshot has no side effects', () => {
      let callCount = 0
      const source: PressureSource = {
        getMemoryPressure: () => {
          callCount++
          return 0.5
        },
        getQueueDepthPressure: () => 0,
        getSpawnSaturation: () => 0,
      }

      const amigdala = createAmigdala({ source })

      // Multiple snapshots just read state
      amigdala.snapshot()
      amigdala.snapshot()
      amigdala.snapshot()

      // Source is called but no mutations occur
      expect(callCount).toBe(3)
    })
  })
})
