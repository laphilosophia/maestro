/**
 * Planned Test 1: IoT Flood + Pressure
 *
 * Scenario:
 * - 1 sensor → 10k events
 * - Memory pressure increases
 *
 * Expected:
 * - Admission rate drops
 * - Drops begin
 * - Drop reason = pressure_exceeded
 */

import {
  createAmigdala,
  createCircuitDistributor,
  createIntentBasedStrategy,
  createMainRoutine,
  createMetricsCollector,
  createSimpleFactory,
  type PressureSource,
  type Task,
} from '../packages/core/src/index.js'

// ============================================
// SIMULATED PRESSURE SOURCE
// ============================================

let simulatedPressure = 0.1
let eventCount = 0

const pressureSource: PressureSource = {
  getMemoryPressure: (): number => simulatedPressure,
  getQueueDepthPressure: (): number => simulatedPressure,
  getSpawnSaturation: (): number => simulatedPressure,
}

// ============================================
// MAESTRO SETUP
// ============================================

const metrics = createMetricsCollector()
const amigdala = createAmigdala({ source: pressureSource })

const strategy = createIntentBasedStrategy({
  intentMap: { sensor: 'sensor-processor' },
})

const factory = createSimpleFactory((_task: Task): void => {
  // Simulate processing (instant, fire-and-forget)
  eventCount++
})

const distributor = createCircuitDistributor({ strategy, factory })

const maestro = createMainRoutine({
  amigdala,
  distributor,
  onDecision: (event): void => {
    if (event.decision.type === 'dispatch') {
      metrics.recordAdmission()
    } else if (event.decision.type === 'drop') {
      metrics.recordDrop(event.decision.reason)
    }
  },
})

// ============================================
// FLOOD SIMULATION
// ============================================

console.log('=== IoT Flood + Pressure Test ===\n')

const TOTAL_EVENTS = 10000
const PRESSURE_INCREASE_INTERVAL = 1000

let dispatched = 0
let dropped = 0

for (let i = 0; i < TOTAL_EVENTS; i++) {
  // Increase pressure every 1000 events - faster ramp
  if (i > 0 && i % PRESSURE_INCREASE_INTERVAL === 0) {
    simulatedPressure = Math.min(simulatedPressure + 0.15, 1.0)
    console.log(`[${i}] Pressure increased to ${(simulatedPressure * 100).toFixed(0)}%`)
  }

  const task: Task = {
    id: `sensor-event-${i}`,
    metadata: {
      intent: 'sensor',
      spawnBudget: 10, // Allow up to 10 spawns
      maxRetryDepth: 10, // Allow retries
      createdAt: Date.now(),
    },
  }

  const decision = maestro.admit(task)

  if (decision.type === 'dispatch') {
    dispatched++
  } else if (decision.type === 'drop') {
    dropped++
    if (dropped === 1) {
      console.log(`[${i}] First drop! Reason: ${decision.reason}`)
    }
  }
}

// ============================================
// RESULTS
// ============================================

console.log('\n=== Results ===')
console.log(`Total events: ${TOTAL_EVENTS}`)
console.log(`Dispatched: ${dispatched}`)
console.log(`Dropped: ${dropped}`)
console.log(`Drop rate: ${((dropped / TOTAL_EVENTS) * 100).toFixed(1)}%`)

const snapshot = metrics.getMetrics()
console.log('\n=== Drop Breakdown ===')
console.log(`- spawn_budget_exhausted: ${snapshot.dropsByReason.spawn_budget_exhausted}`)
console.log(`- retry_depth_exhausted: ${snapshot.dropsByReason.retry_depth_exhausted}`)
console.log(`- pressure_exceeded: ${snapshot.dropsByReason.pressure_exceeded}`)

console.log('\n=== Verification ===')
if (dropped > 0 && snapshot.dropsByReason.pressure_exceeded > 0) {
  console.log('✓ PASS: Drops occurred due to pressure_exceeded')
} else {
  console.log('✗ FAIL: Expected pressure_exceeded drops')
}
