/**
 * Planned Test 3: Restart Test
 *
 * Scenario:
 * - Runtime state reset (simulating Maestro restart)
 * - Same task re-enters
 *
 * Expected:
 * - RetryDepth sıfırdan başlar
 * - But this is NOT a correctness violation
 */

import {
  createAmigdala,
  createCircuitDistributor,
  createIntentBasedStrategy,
  createMainRoutine,
  createSimpleFactory,
  type Task,
} from '../packages/core/src/index.js'

// ============================================
// HELPER: Create fresh Maestro instance
// ============================================

function createFreshMaestro() {
  const amigdala = createAmigdala()
  const strategy = createIntentBasedStrategy()
  const factory = createSimpleFactory((): void => {
    console.log('[handler] Task dispatched')
  })
  const distributor = createCircuitDistributor({ strategy, factory })

  return createMainRoutine({ amigdala, distributor })
}

// ============================================
// TEST
// ============================================

console.log('=== Restart Test ===\n')

const task: Task = {
  id: 'restart-test-task',
  metadata: {
    spawnBudget: 3,
    maxRetryDepth: 2,
    createdAt: Date.now(),
  },
}

// Phase 1: Use first Maestro instance
console.log('=== Phase 1: First Maestro Instance ===')
let maestro = createFreshMaestro()

maestro.admit(task)
console.log(`State after 1st admit: spawnCount=${maestro.getRuntimeState(task.id)?.spawnCount}`)

maestro.signalRetry(task.id)
maestro.admit(task)
console.log(
  `State after retry+admit: retryDepth=${
    maestro.getRuntimeState(task.id)?.retryDepth
  }, spawnCount=${maestro.getRuntimeState(task.id)?.spawnCount}`
)

maestro.signalRetry(task.id)
maestro.admit(task)
console.log(
  `State after 2nd retry: retryDepth=${maestro.getRuntimeState(task.id)?.retryDepth}, spawnCount=${
    maestro.getRuntimeState(task.id)?.spawnCount
  }`
)

// This should drop (budget exhausted)
const preRestartDecision = maestro.admit(task)
console.log(`\n4th admit (should drop): ${preRestartDecision.type}`)
if (preRestartDecision.type === 'drop') {
  console.log(`Reason: ${preRestartDecision.reason}`)
}

// Phase 2: Simulate restart - create NEW instance
console.log('\n=== Phase 2: RESTART (new Maestro instance) ===')
maestro = createFreshMaestro() // Fresh instance = state reset

const stateAfterRestart = maestro.getRuntimeState(task.id)
console.log(
  `State after restart: ${
    stateAfterRestart ? JSON.stringify(stateAfterRestart) : 'undefined (clean slate)'
  }`
)

// Same task, fresh state
const postRestartDecision = maestro.admit(task)
console.log(`\nSame task after restart: ${postRestartDecision.type}`)
console.log(
  `New state: spawnCount=${maestro.getRuntimeState(task.id)?.spawnCount}, retryDepth=${
    maestro.getRuntimeState(task.id)?.retryDepth
  }`
)

// ============================================
// VERIFICATION
// ============================================

console.log('\n=== Verification ===')

if (postRestartDecision.type === 'dispatch') {
  console.log('✓ PASS: Task admitted after restart (state was reset)')
} else {
  console.log('✗ FAIL: Task should have been admitted')
}

console.log(`
=== Key Insight ===

Before restart: Task was DROPPED (budget exhausted)
After restart:  Task was DISPATCHED (fresh state)

This is NOT a bug. This is RFC-0 §2.3:
- "If Maestro restarts, no correctness MUST be lost"
- "Ephemeral metadata MUST be discardable at any moment"

Worst case after restart:
- Task retries a few extra times
- But no CORRECTNESS is violated
- This is the fail-soft trade-off
`)
