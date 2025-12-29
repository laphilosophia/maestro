# RFC-8: Event Schema Evolution

| Field      | Value                                      |
| ---------- | ------------------------------------------ |
| Status     | Normative                                  |
| Created    | 2025-12-30                                 |
| Depends on | RFC-6 (Core Types), RFC-7 (Envelope Layer) |

---

## 1. Purpose

This RFC defines how Maestro's observable event schemas evolve over time without breaking consumers. It establishes versioning rules, stability annotations, and compatibility guarantees required for the commercial Decision Intelligence layer.

---

## 2. Scope

This RFC applies to:

- `DecisionEvent` (primary)
- Any future event types emitted by Maestro core

This RFC does NOT apply to:

- Internal data structures
- Configuration interfaces
- Component APIs (covered by semver)

---

## 3. Schema Version Format

Every event MUST include a `schemaVersion` field:

```typescript
interface DecisionEvent {
  /** Schema version in semver format */
  schemaVersion: string // e.g., "1.0", "1.1", "2.0"

  // ... other fields
}
```

### Version Semantics

| Version Part | Meaning                                           |
| ------------ | ------------------------------------------------- |
| Major (X.0)  | Breaking change. Consumers MUST update.           |
| Minor (1.X)  | Additive change. Consumers MAY ignore new fields. |

Patch versions are not used. Schema changes are either additive or breaking.

---

## 4. Compatibility Rules

### 4.1 Allowed (Minor Bump)

| Change                 | Example                       | Version   |
| ---------------------- | ----------------------------- | --------- |
| Add optional field     | `+ candidateScore?: number`   | 1.0 → 1.1 |
| Add field with default | `+ retryable: boolean = true` | 1.0 → 1.1 |
| Widen enum             | `DropReason += 'custom'`      | 1.0 → 1.1 |

### 4.2 Breaking (Major Bump)

| Change                       | Example                      | Version   |
| ---------------------------- | ---------------------------- | --------- |
| Remove field                 | `- timestamp`                | 1.x → 2.0 |
| Rename field                 | `taskId → id`                | 1.x → 2.0 |
| Change field type            | `timestamp: number → string` | 1.x → 2.0 |
| Change field semantics       | `pressure: 0-1 → 0-100`      | 1.x → 2.0 |
| Narrow enum                  | `DropReason -= 'timeout'`    | 1.x → 2.0 |
| Make optional field required | `envelope?: → envelope:`     | 1.x → 2.0 |

---

## 5. Stability Annotations

Fields and interfaces MAY be annotated with stability markers:

```typescript
/**
 * @stable(v1)
 * This interface is stable. Breaking changes require major version bump.
 */
interface DecisionEvent {
  /** @stable(v1) */
  schemaVersion: string

  /** @stable(v1) */
  decisionType: 'dispatch' | 'retry' | 'drop'

  /** @stable(v1) */
  timestamp: number

  /** @unstable - subject to change */
  experimentalMetrics?: Record<string, number>
}
```

### Annotation Rules

| Annotation          | Meaning                                       |
| ------------------- | --------------------------------------------- |
| `@stable(v1)`       | Covered by compatibility guarantees from v1.0 |
| `@stable(v2)`       | Stable starting from v2.0                     |
| `@unstable`         | No compatibility guarantees                   |
| `@deprecated(v1.2)` | Will be removed in next major                 |

---

## 6. Current DecisionEvent Schema (v1.0)

```typescript
/**
 * @stable(v1)
 * Decision event emitted after each task evaluation.
 */
interface DecisionEvent {
  /** @stable(v1) */
  schemaVersion: '1.0'

  /** @stable(v1) - Task identifier (opaque to commercial layer) */
  taskId: string

  /** @stable(v1) - Task intent for routing */
  intent: string

  /** @stable(v1) - Decision outcome */
  decisionType: 'dispatch' | 'retry' | 'drop'

  /** @stable(v1) - Selected sub-routine (null if dropped) */
  target: string | null

  /** @stable(v1) - Drop reason (null if not dropped) */
  dropReason: DropReason | null

  /** @stable(v1) - System pressure at decision time (0-1) */
  pressure: number

  /** @stable(v1) - Envelope identifier */
  envelopeId: string

  /** @stable(v1) - Unix timestamp (ms) */
  timestamp: number

  /** @stable(v1) - Eligible candidates after envelope filtering */
  eligibleCandidatesCount: number

  /** @stable(v1) - Whether envelope narrowed the candidate set */
  envelopeNarrowed: boolean
}
```

---

## 7. Consumer Guidelines

### For Decision Intelligence Layer

```typescript
function processEvent(event: DecisionEvent): void {
  // Always check version for forward compatibility
  const [major] = event.schemaVersion.split('.').map(Number)

  if (major > SUPPORTED_MAJOR_VERSION) {
    // Log warning, don't crash
    logger.warn(`Unsupported schema version: ${event.schemaVersion}`)
    return
  }

  // Safe to process - minor versions are additive
  ingestEvent(event)
}
```

### Version Negotiation

Commercial layer SHOULD:

1. Accept any minor version within supported major
2. Log unknown fields (don't fail)
3. Fail fast on unsupported major version
4. Provide clear upgrade path documentation

---

## 8. Migration Path

When a major version bump is required:

1. **Deprecation phase** (1+ minor releases)

   - Add `@deprecated` to affected fields
   - Add replacement fields alongside
   - Emit both old and new format

2. **Breaking release**

   - Bump major version
   - Remove deprecated fields
   - Update stability annotations

3. **Consumer update window**
   - Minimum 30 days notice
   - Dual-emit during transition
   - Clear migration guide

---

## 9. Invariants

1. `schemaVersion` field MUST be present in every event
2. `schemaVersion` format MUST be `MAJOR.MINOR`
3. Stable fields MUST NOT change semantics within major version
4. Additive changes MUST NOT break existing consumers
5. Breaking changes MUST increment major version
6. `@unstable` fields provide no compatibility guarantees

---

## 10. Implementation Checklist

- [ ] Add `schemaVersion: '1.0'` to `DecisionEvent`
- [ ] Add `@stable(v1)` annotations to core fields
- [ ] Export schema version constant from `@maestro/core`
- [ ] Create `@maestro/telemetry` package with event types
- [ ] Document migration path for future v2.0

---

## 11. References

- [RFC-6: Core Types & Interfaces](./006-core-types-interfaces.md)
- [RFC-7: Decision Envelope Layer](./007-decision-envelope-layer.md)
- [Semantic Versioning 2.0](https://semver.org/)
