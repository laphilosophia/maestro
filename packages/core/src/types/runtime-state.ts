/**
 * TaskRuntimeState - Ephemeral accounting (RFC-6 §3)
 *
 * Lives in Main Routine's ephemeral memory.
 * MAY be lost on restart. MUST NOT be required for correctness.
 *
 * Trade-off: Restart → state reset → task may retry extra times.
 * This is acceptable under fail-soft model (RFC-0 §2.4).
 */
export interface TaskRuntimeState {
  /** Current spawn count (ephemeral, discardable) */
  spawnCount: number

  /** Current retry depth (ephemeral, discardable) */
  retryDepth: number

  /** Last attempt timestamp (epoch ms) */
  lastAttemptAt: number
}

/**
 * Create initial runtime state for a task
 */
export function createInitialRuntimeState(): TaskRuntimeState {
  return {
    spawnCount: 0,
    retryDepth: 0,
    lastAttemptAt: Date.now(),
  }
}
