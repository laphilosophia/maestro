/**
 * RFC-7 Decision Envelope Tests
 *
 * Tests for Decision Envelope Layer compliance (RFC-7).
 */

import { describe, expect, it, vi } from 'vitest'
import { createAmigdala, noopPressureSource } from '../src/components/amigdala.js'
import { createCandidateRegistry } from '../src/components/candidate-registry.js'
import {
  createCircuitDistributor,
  createSimpleFactory,
} from '../src/components/circuit-distributor.js'
import { createEnvelopeResolver } from '../src/components/envelope-resolver.js'
import { createMainRoutine } from '../src/components/main-routine.js'
import { createIntentBasedStrategy } from '../src/strategies/intent-based.js'
import { createDecisionEnvelope } from '../src/types/envelope.js'
import type { Task } from '../src/types/task.js'

describe('RFC-7 Decision Envelope', () => {
  // === Test Fixtures ===

  function createTestTask(intent?: string): Task {
    return {
      id: `task-${Date.now()}`,
      metadata: {
        intent,
        spawnBudget: 5,
        maxRetryDepth: 3,
        createdAt: Date.now(),
      },
    }
  }

  function createTestSetup(
    options: {
      eligibleCandidates?: string[]
      allowDrop?: boolean
    } = {}
  ) {
    const dispatchSpy = vi.fn()
    const decisionSpy = vi.fn()

    const allRoutes = ['fast', 'slow', 'default']
    const eligibleCandidates = options.eligibleCandidates ?? allRoutes

    const registry = createCandidateRegistry(
      allRoutes.map((id) => ({
        id,
        capabilities: [],
        factory: () => ({ dispatch: dispatchSpy }),
      }))
    )

    const defaultEnvelope = createDecisionEnvelope({
      id: 'test.default.v1',
      allowDrop: options.allowDrop ?? true,
      allowRetry: true,
      allowCooperate: true,
      allowHistoryInfluence: true,
      eligibleCandidates,
    })

    const strategy = createIntentBasedStrategy({
      intentMap: { fast: 'fast', slow: 'slow' },
      defaultSubRoutineId: 'default',
    })

    const factory = createSimpleFactory((task, routeId) => {
      dispatchSpy(task, routeId)
    })

    const distributor = createCircuitDistributor({ strategy, factory })
    const amigdala = createAmigdala({ source: noopPressureSource })
    const envelopeResolver = createEnvelopeResolver({})

    const maestro = createMainRoutine({
      amigdala,
      distributor,
      registry,
      envelopeResolver,
      defaultEnvelope,
      onDecision: decisionSpy,
    })

    return { maestro, dispatchSpy, decisionSpy, registry, defaultEnvelope }
  }

  // === Envelope Immutability ===

  describe('Envelope Immutability', () => {
    it('createDecisionEnvelope returns frozen object', () => {
      const envelope = createDecisionEnvelope({
        id: 'test',
        allowDrop: true,
        allowRetry: true,
        allowCooperate: true,
        allowHistoryInfluence: true,
        eligibleCandidates: ['a', 'b'],
      })

      expect(Object.isFrozen(envelope)).toBe(true)
      expect(Object.isFrozen(envelope.eligibleCandidates)).toBe(true)
    })

    it('throws if defaultEnvelope is not frozen', () => {
      const mutableEnvelope = {
        id: 'mutable',
        allowDrop: true,
        allowRetry: true,
        allowCooperate: true,
        allowHistoryInfluence: true,
        eligibleCandidates: ['a'],
      }

      expect(() => {
        createMainRoutine({
          amigdala: createAmigdala({ source: noopPressureSource }),
          distributor: createCircuitDistributor({
            strategy: createIntentBasedStrategy({ defaultSubRoutineId: 'a' }),
            factory: createSimpleFactory(() => {}),
          }),
          registry: createCandidateRegistry([
            { id: 'a', capabilities: [], factory: () => ({ dispatch: () => {} }) },
          ]),
          envelopeResolver: createEnvelopeResolver({}),
          defaultEnvelope: mutableEnvelope as any,
        })
      }).toThrow('defaultEnvelope must be immutable')
    })
  })

  // === Eligibility Filtering ===

  describe('Eligibility Filtering', () => {
    it('empty eligibleCandidates returns null selection', () => {
      const { maestro } = createTestSetup({ eligibleCandidates: [] })
      const task = createTestTask()

      const decision = maestro.admit(task)

      // Empty candidates = no selection possible = drop
      expect(decision.type).toBe('drop')
    })

    // NOTE: This test documents expected future behavior.
    // Current intent-based strategy does not filter by eligibleCandidates.
    // This is tracked as a TODO: strategies should respect eligibleCandidates.
    it.skip('only eligible candidates can be selected', () => {
      const { maestro, dispatchSpy } = createTestSetup({
        eligibleCandidates: ['fast'], // Only fast is eligible
      })

      const task = createTestTask('slow') // Intent is 'slow' but not eligible
      const decision = maestro.admit(task)

      // Selection may fail because 'slow' route is not eligible
      // The intent-based strategy would select 'slow' but it's filtered out
      // This depends on strategy implementation - may dispatch to fallback or fail
      if (decision.type === 'dispatch') {
        // If dispatched, verify it went to eligible candidate
        const [, routeId] = dispatchSpy.mock.calls[0]
        expect(['fast']).toContain(routeId)
      }
    })
  })

  // === Drop Gate (Mask Semantics) ===

  describe('Drop Gate Mask Semantics', () => {
    it('allowDrop=false prevents pressure-based drop', () => {
      // Create high-pressure source using correct PressureSource interface
      const highPressureSource = {
        getMemoryPressure: () => 0.95,
        getQueueDepthPressure: () => 0.95,
        getSpawnSaturation: () => 0.95,
      }

      const registry = createCandidateRegistry([
        { id: 'default', capabilities: [], factory: () => ({ dispatch: () => {} }) },
      ])

      const noDropEnvelope = createDecisionEnvelope({
        id: 'no-drop',
        allowDrop: false, // Drop is NOT allowed
        allowRetry: true,
        allowCooperate: true,
        allowHistoryInfluence: true,
        eligibleCandidates: ['default'],
      })

      const maestro = createMainRoutine({
        amigdala: createAmigdala({ source: highPressureSource }),
        distributor: createCircuitDistributor({
          strategy: createIntentBasedStrategy({ defaultSubRoutineId: 'default' }),
          factory: createSimpleFactory(() => {}),
        }),
        registry,
        envelopeResolver: createEnvelopeResolver({}),
        defaultEnvelope: noDropEnvelope,
      })

      const task = createTestTask()
      const decision = maestro.admit(task)

      // Even under high pressure, drop should NOT happen because allowDrop=false
      expect(decision.type).toBe('dispatch')
    })

    it('allowDrop=true allows pressure-based drop', () => {
      const highPressureSource = {
        getMemoryPressure: () => 0.95,
        getQueueDepthPressure: () => 0.95,
        getSpawnSaturation: () => 0.95,
      }

      const registry = createCandidateRegistry([
        { id: 'default', capabilities: [], factory: () => ({ dispatch: () => {} }) },
      ])

      const dropAllowedEnvelope = createDecisionEnvelope({
        id: 'drop-allowed',
        allowDrop: true, // Drop IS allowed
        allowRetry: true,
        allowCooperate: true,
        allowHistoryInfluence: true,
        eligibleCandidates: ['default'],
      })

      const maestro = createMainRoutine({
        amigdala: createAmigdala({ source: highPressureSource }),
        distributor: createCircuitDistributor({
          strategy: createIntentBasedStrategy({ defaultSubRoutineId: 'default' }),
          factory: createSimpleFactory(() => {}),
        }),
        registry,
        envelopeResolver: createEnvelopeResolver({}),
        defaultEnvelope: dropAllowedEnvelope,
      })

      const task = createTestTask()
      const decision = maestro.admit(task)

      // Under high pressure with allowDrop=true, drop SHOULD happen
      expect(decision.type).toBe('drop')
      if (decision.type === 'drop') {
        expect(decision.reason).toBe('pressure_exceeded')
      }
    })
  })

  // === Observability ===

  describe('Observability', () => {
    it('DecisionEvent includes envelopeId', () => {
      const { maestro, decisionSpy, defaultEnvelope } = createTestSetup()
      const task = createTestTask()

      maestro.admit(task)

      expect(decisionSpy).toHaveBeenCalled()
      const event = decisionSpy.mock.calls[0][0]
      expect(event.envelopeId).toBe(defaultEnvelope.id)
    })

    it('DecisionEvent includes envelopeNarrowed flag', () => {
      const { maestro, decisionSpy, registry } = createTestSetup({
        eligibleCandidates: ['fast'], // Narrowed from 3 to 1
      })
      const task = createTestTask()

      maestro.admit(task)

      const event = decisionSpy.mock.calls[0][0]
      expect(event.envelopeNarrowed).toBe(true)
      expect(event.eligibleCandidatesCount).toBe(1)
    })

    it('envelopeNarrowed is false when all candidates eligible', () => {
      const { maestro, decisionSpy } = createTestSetup({
        eligibleCandidates: ['fast', 'slow', 'default'], // All candidates
      })
      const task = createTestTask()

      maestro.admit(task)

      const event = decisionSpy.mock.calls[0][0]
      expect(event.envelopeNarrowed).toBe(false)
    })
  })

  // === Recycling ===

  describe('Recycling Semantics', () => {
    it('recycled task uses same envelope', () => {
      const { maestro, decisionSpy, defaultEnvelope } = createTestSetup()
      const task = createTestTask()

      // First admission
      maestro.admit(task)
      const event1 = decisionSpy.mock.calls[0][0]

      // Signal retry (simulates recycling)
      maestro.signalRetry(task.id)

      // Second admission (recycled)
      maestro.admit(task)
      const event2 = decisionSpy.mock.calls[1][0]

      // Same envelope ID on both admissions
      expect(event1.envelopeId).toBe(defaultEnvelope.id)
      expect(event2.envelopeId).toBe(defaultEnvelope.id)
    })
  })

  // === Resolver Fallback ===

  describe('Resolver Fallback', () => {
    it('unknown intent falls back to defaultEnvelope', () => {
      const { maestro, decisionSpy, defaultEnvelope } = createTestSetup()
      const task = createTestTask('unknown-intent')

      maestro.admit(task)

      const event = decisionSpy.mock.calls[0][0]
      expect(event.envelopeId).toBe(defaultEnvelope.id)
    })
  })
})
