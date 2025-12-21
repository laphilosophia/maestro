/**
 * Example 2: Retry Flow
 *
 * Shows how retries work - triggered EXTERNALLY, not by Maestro.
 * Maestro only knows "retry was signaled", not "why".
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
// YOUR SYSTEM
// ============================================

interface Job {
  id: string
  attempts: number
  lastError?: string
}

const jobs = new Map<string, Job>()
let maestroRef: MainRoutine

// Handler that sometimes fails
const processJob = (jobId: string): void => {
  const job = jobs.get(jobId)
  if (!job) return

  job.attempts++
  console.log(`[attempt ${job.attempts}] Processing ${jobId}`)

  // Simulate random failure
  if (Math.random() < 0.5) {
    job.lastError = 'Transient error'
    console.log(`[attempt ${job.attempts}] FAILED - ${job.lastError}`)

    // YOUR DECISION: Should we retry?
    // Maestro doesn't decide this - YOU do
    if (job.attempts < 3) {
      console.log(`[retry] Signaling retry to Maestro...`)
      maestroRef.signalRetry(jobId) // ← External signal
      resubmitTask(jobId) // ← You resubmit
    } else {
      console.log(`[give up] Max attempts reached`)
    }
  } else {
    console.log(`[attempt ${job.attempts}] SUCCESS`)
  }
}

function resubmitTask(jobId: string): void {
  const task: Task = {
    id: jobId,
    metadata: {
      spawnBudget: 5,
      maxRetryDepth: 3,
      createdAt: Date.now(),
    },
  }

  const decision = maestroRef.admit(task)
  console.log(`[resubmit] Decision: ${decision.type}`)

  if (decision.type === 'drop') {
    console.log(`[DROPPED] ${(decision as { reason: string }).reason}`)
  }
}

// ============================================
// MAESTRO SETUP
// ============================================

const amigdala = createAmigdala()
const strategy = createIntentBasedStrategy()
const factory = createSimpleFactory((task: Task): void => {
  processJob(task.id)
})
const distributor = createCircuitDistributor({ strategy, factory })

maestroRef = createMainRoutine({ amigdala, distributor })

// ============================================
// RUN
// ============================================

console.log('=== Retry Flow Example ===\n')

const jobId = 'job-retry-test'
jobs.set(jobId, { id: jobId, attempts: 0 })

const task: Task = {
  id: jobId,
  metadata: {
    spawnBudget: 5,
    maxRetryDepth: 3,
    createdAt: Date.now(),
  },
}

console.log('[initial] Submitting task...')
maestroRef.admit(task)

console.log('\n=== Flow Summary ===')
console.log(`
Key insight:
- Maestro didn't "retry" anything
- YOUR handler detected failure
- YOUR code called signalRetry()
- YOUR code resubmitted the task
- Maestro just tracked retry depth
`)
