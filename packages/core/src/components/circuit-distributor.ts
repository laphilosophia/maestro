/**
 * CircuitDistributor (RFC-6 §10, RFC-7 §7)
 *
 * select(task, envelope, runtimeState, pressure): SubRoutineGroup | null
 *
 * RFC-7 Breaking Change:
 * - Added envelope parameter
 * - Selection operates only on envelope.eligibleCandidates (O(k) not O(N))
 * - Empty eligibleCandidates → null (policy-level short-circuit)
 */

import type { SpawnStrategy, StrategyContext, SubRoutineFactory } from '../strategies/types.js'
import type { DecisionEnvelope } from '../types/envelope.js'
import type { PressureSignal } from '../types/pressure.js'
import type { TaskRuntimeState } from '../types/runtime-state.js'
import type { SubRoutine, SubRoutineGroup } from '../types/subroutine.js'
import type { Task } from '../types/task.js'

/**
 * CircuitDistributor interface (RFC-6 §10, RFC-7 §7)
 *
 * The CircuitDistributor is the ONLY component authorized to traverse
 * the decision space (RFC-6.1 §5).
 */
export interface CircuitDistributor {
  /**
   * Select sub-routine group for task dispatch
   *
   * @param task - Task to dispatch
   * @param envelope - Decision envelope (policy constraints)
   * @param runtimeState - Task runtime state
   * @param pressure - Current pressure snapshot
   * @returns SubRoutineGroup if selection successful, null if should drop
   */
  select(
    task: Task,
    envelope: DecisionEnvelope,
    runtimeState: TaskRuntimeState,
    pressure: PressureSignal
  ): SubRoutineGroup | null
}

/**
 * CircuitDistributor configuration
 */
export interface CircuitDistributorConfig {
  /** Spawn strategy to use */
  strategy: SpawnStrategy
  /** Sub-routine factory */
  factory: SubRoutineFactory
}

/**
 * Create CircuitDistributor instance
 */
export function createCircuitDistributor(config: CircuitDistributorConfig): CircuitDistributor {
  const { strategy, factory } = config

  return {
    select(
      task: Task,
      envelope: DecisionEnvelope,
      runtimeState: TaskRuntimeState,
      pressure: PressureSignal
    ): SubRoutineGroup | null {
      // RFC-7 §3.2: Empty eligibleCandidates → hard exclusion
      // This is policy-level short-circuit, NOT deferred to strategy
      if (envelope.eligibleCandidates.length === 0) {
        return null
      }

      // Build context with envelope - eligibleCandidates is SAME reference
      const context: StrategyContext = {
        task,
        envelope,
        runtimeState,
        pressure,
        eligibleCandidates: envelope.eligibleCandidates, // Same reference, no copy
        factory,
      }

      return strategy.select(context)
    },
  }
}

/**
 * Create simple sub-routine factory
 *
 * Creates sub-routines that call a provided dispatch function.
 */
export function createSimpleFactory(
  dispatcher: (task: Task, routeId: string) => void
): SubRoutineFactory {
  return {
    create(id: string): SubRoutine {
      return {
        dispatch(task: Task): void {
          dispatcher(task, id)
        },
      }
    },
  }
}
