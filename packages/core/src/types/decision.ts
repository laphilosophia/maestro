/**
 * Decision types (RFC-6 §5-6)
 *
 * Decisions are pressure indicators, not execution outcomes.
 */

/** Terminal drop reasons */
export type DropReason = 'spawn_budget_exhausted' | 'retry_depth_exhausted' | 'pressure_exceeded'

/**
 * Decision - Admission verdict (RFC-6 §5)
 *
 * currentDepth is included for:
 * - observability
 * - policy evaluation
 * - carries no result meaning
 */
export type Decision =
  | { readonly type: 'dispatch' }
  | { readonly type: 'retry'; readonly currentDepth: number }
  | { readonly type: 'escalate'; readonly currentDepth: number }
  | { readonly type: 'drop'; readonly reason: DropReason; readonly currentDepth: number }
