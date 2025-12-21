/**
 * IoT Ingestion Gate Example
 *
 * Demonstrates using Maestro as a decision gate before IoT message processing.
 *
 * Run: npx tsx examples/iot-ingestion.ts
 */

// Relative import for local development
// In production, use: import { ... } from '@maestro/core'
import {
  createAmigdala,
  createCircuitDistributor,
  createIntentBasedStrategy,
  createMainRoutine,
  createMetricsCollector,
  createSimpleFactory,
  type DecisionEvent,
  type Task,
} from '../packages/core/src/index.js'

// Create metrics collector for observability
const metrics = createMetricsCollector()

// Create pressure observer with simulated metrics
let queueSize = 0
const amigdala = createAmigdala({
  source: {
    getMemoryPressure: (): number => {
      // In real app: process.memoryUsage().heapUsed / maxHeap
      return 0.3
    },
    getQueueDepthPressure: (): number => queueSize / 10000,
    getSpawnSaturation: (): number => 0.1,
  },
})

// Track dispatched tasks
const dispatched: Task[] = []

// Create strategy and distributor
const strategy = createIntentBasedStrategy({
  intentMap: {
    temperature: 'temp-processor',
    humidity: 'humidity-processor',
    motion: 'motion-processor',
  },
  defaultSubRoutineId: 'generic-processor',
})

const factory = createSimpleFactory((task: Task, routeId: string): void => {
  console.log(`[${routeId}] Processing: ${task.id}`)
  dispatched.push(task)
})

const distributor = createCircuitDistributor({ strategy, factory })

// Create main routine
const maestro = createMainRoutine({
  amigdala,
  distributor,
  onDecision: (event: DecisionEvent): void => {
    if (event.decision.type === 'dispatch') {
      metrics.recordAdmission()
    } else if (event.decision.type === 'drop') {
      metrics.recordDrop(event.decision.reason)
      console.log(`[DROPPED] ${event.taskId}: ${event.decision.reason}`)
    }
  },
})

// Simulate IoT message ingestion
function ingestIoTMessage(deviceId: string, sensorType: string): void {
  const task: Task = {
    id: `iot-${deviceId}-${Date.now()}`,
    metadata: {
      intent: sensorType,
      priority: sensorType === 'motion' ? 80 : 50,
      spawnBudget: 3,
      maxRetryDepth: 2,
      createdAt: Date.now(),
    },
  }

  queueSize++
  const decision = maestro.admit(task)
  queueSize--

  console.log(`Task ${task.id}: ${decision.type}`)
}

// Simulate incoming messages
console.log('=== IoT Ingestion Gate Demo ===\n')

ingestIoTMessage('sensor-001', 'temperature')
ingestIoTMessage('sensor-002', 'humidity')
ingestIoTMessage('sensor-003', 'motion')
ingestIoTMessage('sensor-004', 'unknown')

// Show metrics
console.log('\n=== Metrics ===')
const snapshot = metrics.getMetrics()
console.log(`Admissions: ${snapshot.admissionCount}`)
console.log(`Drops: ${snapshot.dropCount}`)
console.log(`Admission Rate: ${snapshot.admissionRate.toFixed(2)}/s`)

// Prevent unused variable warning
void dispatched
