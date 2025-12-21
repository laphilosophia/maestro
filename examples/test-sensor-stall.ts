/**
 * Planned Test 2: Sensor Stall
 *
 * Scenario:
 * - External processor cevap vermiyor (simulate)
 *
 * Expected:
 * - Maestro hiçbir şey "beklememeli"
 * - Retry yalnızca signal ile
 */

import {
  createAmigdala,
  createCircuitDistributor,
  createIntentBasedStrategy,
  createMainRoutine,
  createSimpleFactory,
  type MainRoutine,
  type Task,
} from '../packages/core/src/index.js'

// ============================================
// SIMULATED STALLED PROCESSOR
// ============================================

let dispatchCount = 0
let maestroRef: MainRoutine

// This handler "stalls" - but Maestro doesn't wait
const stalledProcessor = (task: Task): void => {
  dispatchCount++
  console.log(`[dispatch ${dispatchCount}] Task ${task.id} sent to stalled processor`)

  // Simulate: processor is stuck, doesn't respond
  // In real world, this would be an HTTP call that times out
  // But Maestro already returned - it doesn't care

  // External system eventually detects stall and signals retry
  if (dispatchCount <= 2) {
    console.log(`[external] Detected stall, signaling retry...`)
    maestroRef.signalRetry(task.id)

    // Resubmit after external timeout detection
    const retryDecision = maestroRef.admit(task)
    console.log(`[retry] Decision: ${retryDecision.type}`)

    if (retryDecision.type === 'drop') {
      console.log(`[retry] Dropped: ${(retryDecision as { reason: string }).reason}`)
    }
  }
}

// ============================================
// MAESTRO SETUP
// ============================================

const amigdala = createAmigdala()
const strategy = createIntentBasedStrategy()

const factory = createSimpleFactory((task: Task): void => {
  stalledProcessor(task)
})

const distributor = createCircuitDistributor({ strategy, factory })

maestroRef = createMainRoutine({
  amigdala,
  distributor,
  onDecision: (event): void => {
    const state = maestroRef.getRuntimeState(event.taskId)
    console.log(`[decision] ${event.decision.type} (retryDepth: ${state?.retryDepth ?? 0})`)
  },
})

// ============================================
// RUN TEST
// ============================================

console.log('=== Sensor Stall Test ===\n')

const task: Task = {
  id: 'stall-test-task',
  metadata: {
    spawnBudget: 5,
    maxRetryDepth: 3,
    createdAt: Date.now(),
  },
}

console.log('[start] Submitting task to stalled processor...\n')

const startTime = Date.now()
const initialDecision = maestroRef.admit(task)
const elapsed = Date.now() - startTime

console.log(`\n=== Verification ===`)
console.log(`Initial decision returned in: ${elapsed}ms`)

if (elapsed < 100) {
  console.log('✓ PASS: Maestro did not wait (fire-and-forget)')
} else {
  console.log('✗ FAIL: Maestro blocked unexpectedly')
}

console.log(`\n=== Key Insight ===`)
console.log(`
- Maestro returned immediately (${elapsed}ms)
- Processor "stall" is invisible to Maestro
- Retries were triggered EXTERNALLY via signalRetry()
- This is Result Ignorance in action
`)
