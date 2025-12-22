/**
 * RFC-7 Real-World Example: IoT Telemetry with Policy Envelopes
 *
 * This example demonstrates:
 * - Critical telemetry that must never be dropped (allowDrop: false)
 * - Standard telemetry with pressure-based dropping
 * - Different candidate pools for different intents
 *
 * Run with: npx tsx examples/envelope-iot-example.ts
 */

import {
  createAmigdala,
  createCandidateRegistry,
  createCircuitDistributor,
  createDecisionEnvelope,
  createEnvelopeResolver,
  createIntentBasedStrategy,
  createMainRoutine,
  createSimpleFactory,
  type CandidateProfile,
  type DecisionEnvelope,
  type Task,
} from '@maestro/core'

// ============================================================================
// 1. DEFINE CANDIDATES (Sub-routine inventory)
// ============================================================================

const candidates: CandidateProfile[] = [
  {
    id: 'fast-queue',
    capabilities: ['low-latency'],
    factory: () => ({
      dispatch: (task) => console.log(`⚡ [fast-queue] ${task.id}`),
    }),
  },
  {
    id: 'reliable-queue',
    capabilities: ['durable', 'retry'],
    factory: () => ({
      dispatch: (task) => console.log(`🛡️ [reliable-queue] ${task.id}`),
    }),
  },
  {
    id: 'bulk-queue',
    capabilities: ['batch', 'cheap'],
    factory: () => ({
      dispatch: (task) => console.log(`📦 [bulk-queue] ${task.id}`),
    }),
  },
]

const registry = createCandidateRegistry(candidates)

// ============================================================================
// 2. DEFINE ENVELOPES (Static policy constraints)
// ============================================================================

// Critical telemetry: Never drop, only reliable queue
const criticalEnvelope: DecisionEnvelope = createDecisionEnvelope({
  id: 'iot.critical.v1',
  allowDrop: false, // NEVER drop critical telemetry
  allowRetry: true,
  allowCooperate: false, // No cooperative sub-routines
  allowHistoryInfluence: false, // No penalty bias
  eligibleCandidates: ['reliable-queue'], // Only reliable path
})

// Standard telemetry: Can be dropped, fast or bulk
const standardEnvelope: DecisionEnvelope = createDecisionEnvelope({
  id: 'iot.standard.v1',
  allowDrop: true, // May drop under pressure
  allowRetry: true,
  allowCooperate: true,
  allowHistoryInfluence: true,
  eligibleCandidates: ['fast-queue', 'bulk-queue'],
})

// Diagnostic telemetry: Lowest priority, drop-first
const diagnosticEnvelope: DecisionEnvelope = createDecisionEnvelope({
  id: 'iot.diagnostic.v1',
  allowDrop: true,
  allowRetry: false, // No retries for diagnostics
  allowCooperate: false,
  allowHistoryInfluence: true,
  eligibleCandidates: ['bulk-queue'],
})

// ============================================================================
// 3. ENVELOPE RESOLVER (Intent → Envelope mapping)
// ============================================================================

const envelopeResolver = createEnvelopeResolver({
  'telemetry.critical': criticalEnvelope,
  'telemetry.standard': standardEnvelope,
  'telemetry.diagnostic': diagnosticEnvelope,
})

// Default: standard envelope for unknown intents
const defaultEnvelope = standardEnvelope

// ============================================================================
// 4. BUILD MAESTRO
// ============================================================================

// Simulated pressure source (toggle to test drop behavior)
let simulatedPressure = 0.3

const pressureSource = {
  sample: () => ({
    memory: simulatedPressure,
    queueDepth: simulatedPressure,
    spawnSaturation: simulatedPressure,
    timestamp: Date.now(),
  }),
}

const amigdala = createAmigdala({ source: pressureSource })

const strategy = createIntentBasedStrategy({
  intentMap: {
    'telemetry.critical': 'reliable-queue',
    'telemetry.standard': 'fast-queue',
    'telemetry.diagnostic': 'bulk-queue',
  },
  defaultSubRoutineId: 'fast-queue',
})

const factory = createSimpleFactory((task, routeId) => {
  console.log(`📨 Dispatched ${task.id} → ${routeId}`)
})

const distributor = createCircuitDistributor({ strategy, factory })

const maestro = createMainRoutine({
  amigdala,
  distributor,
  registry,
  envelopeResolver,
  defaultEnvelope,
  onDecision: (event) => {
    const status = event.decision.type === 'dispatch' ? '✅' : '❌'
    console.log(
      `${status} Decision: ${event.decision.type} | Envelope: ${event.envelopeId} | Narrowed: ${event.envelopeNarrowed}`
    )
  },
})

// ============================================================================
// 5. SIMULATE IoT TELEMETRY
// ============================================================================

function createTask(id: string, intent: string): Task {
  return {
    id,
    metadata: {
      intent,
      spawnBudget: 3,
      maxRetryDepth: 2,
      createdAt: Date.now(),
    },
  }
}

console.log('\n=== Normal Pressure (0.3) ===\n')

maestro.admit(createTask('temp-001', 'telemetry.standard'))
maestro.admit(createTask('alert-001', 'telemetry.critical'))
maestro.admit(createTask('debug-001', 'telemetry.diagnostic'))

console.log('\n=== High Pressure (0.95) ===\n')
simulatedPressure = 0.95

// Standard and diagnostic should drop, critical should NOT
maestro.admit(createTask('temp-002', 'telemetry.standard'))
maestro.admit(createTask('alert-002', 'telemetry.critical')) // Must NOT drop
maestro.admit(createTask('debug-002', 'telemetry.diagnostic'))

console.log('\n=== Summary ===')
console.log('Critical telemetry (allowDrop=false) survives high pressure')
console.log('Standard/diagnostic telemetry dropped under pressure')
