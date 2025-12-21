/**
 * Example 1: Basic Handler Pattern
 *
 * Demonstrates how handlers execute work OUTSIDE Maestro.
 * Maestro never sees results - only decides admission.
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
// YOUR SYSTEM (outside Maestro)
// ============================================

// Job storage - Maestro doesn't see this
interface Job {
  id: string
  payload: { orderId: string; amount: number }
  status: 'pending' | 'processing' | 'done' | 'failed'
}

const jobStore = new Map<string, Job>()

// Handler registry - Maestro doesn't see this
const handlers = {
  'payment-processor': (jobId: string): void => {
    const job = jobStore.get(jobId)
    if (!job) return

    job.status = 'processing'
    console.log(`[payment] Processing order ${job.payload.orderId}`)

    // Simulate work (success/failure happens HERE, not in Maestro)
    if (job.payload.amount > 1000) {
      job.status = 'failed'
      console.log(`[payment] FAILED - amount too high`)
      // Could trigger retry via signalRetry() - but that's YOUR decision
    } else {
      job.status = 'done'
      console.log(`[payment] SUCCESS`)
    }
  },

  default: (jobId: string): void => {
    console.log(`[default] Unknown job type: ${jobId}`)
  },
}

// ============================================
// MAESTRO SETUP (the gate)
// ============================================

const amigdala = createAmigdala()

const strategy = createIntentBasedStrategy({
  intentMap: { payment: 'payment-processor' },
  defaultSubRoutineId: 'default',
})

// Factory routes to handlers - but doesn't return results
const factory = createSimpleFactory((task: Task, routeId: string): void => {
  const handler = handlers[routeId as keyof typeof handlers] ?? handlers.default
  handler(task.id)
  // NO RETURN - fire and forget
})

const distributor = createCircuitDistributor({ strategy, factory })
const maestro = createMainRoutine({ amigdala, distributor })

// ============================================
// USAGE FLOW
// ============================================

function submitOrder(orderId: string, amount: number): void {
  const jobId = `job-${orderId}`

  // 1. Store job FIRST (outside Maestro)
  jobStore.set(jobId, {
    id: jobId,
    payload: { orderId, amount },
    status: 'pending',
  })

  // 2. Create task (metadata only, no payload)
  const task: Task = {
    id: jobId,
    metadata: {
      intent: 'payment',
      priority: 50,
      spawnBudget: 3,
      maxRetryDepth: 2,
      createdAt: Date.now(),
    },
  }

  // 3. Ask Maestro: "Can this proceed?"
  const decision = maestro.admit(task)

  // 4. Handle decision
  if (decision.type === 'dispatch') {
    console.log(`✓ Order ${orderId} admitted and dispatched`)
  } else if (decision.type === 'drop') {
    console.log(`✗ Order ${orderId} dropped: ${decision.reason}`)
    jobStore.delete(jobId) // Cleanup
  }
}

// ============================================
// RUN
// ============================================

console.log('=== Basic Handler Pattern ===\n')

submitOrder('ORD-001', 500) // Should succeed
submitOrder('ORD-002', 1500) // Will fail in handler (but Maestro doesn't know)
submitOrder('ORD-003', 200) // Should succeed

console.log('\n=== Job Store Final State ===')
for (const [id, job] of jobStore) {
  console.log(`${id}: ${job.status}`)
}
