/**
 * CircuitDistributor (RFC-6 §10)
 *
 * select(task, pressure): SubRoutineGroup
 *
 * Returns structured group, not flat array.
 */

import type { SpawnStrategy, StrategyContext, SubRoutineFactory } from '../strategies/types.js'
import type { PressureSignal } from '../types/pressure.js'
import type { TaskRuntimeState } from '../types/runtime-state.js'
import type { SubRoutine, SubRoutineGroup } from '../types/subroutine.js'
import type { Task } from '../types/task.js'

/**
 * CircuitDistributor interface (RFC-6 §10)
 */
export interface CircuitDistributor {
  /**
   * Select sub-routine group for task dispatch
   *
   * @returns SubRoutineGroup if selection successful, null if should drop
   */
  select(
    task: Task,
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
      runtimeState: TaskRuntimeState,
      pressure: PressureSignal
    ): SubRoutineGroup | null {
      const context: StrategyContext = {
        task,
        runtimeState,
        pressure,
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
