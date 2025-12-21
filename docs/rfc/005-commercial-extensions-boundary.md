# RFC-5: Commercial Extensions Boundary

**Subtitle:** Open Core Without Core Erosion

## Status

* **Type:** Policy / Governance
* **Depends on:** RFC-0–RFC-4
* **Scope:** Licensing & monetization
* **Non-goal:** Pricing strategy

---

## 1. Open Core Definition (LOCKED)

The following MUST remain open-source:

* RFC-0 / RFC-1 / RFC-2 behavior
* core decision fabric
* base spawn strategies
* observability hooks

Any attempt to close these violates Maestro identity.

---

## 2. Allowed Commercial Extensions

Commercial offerings MAY include:

### 2.1 Advanced Observability

* dashboards
* long-term analytics
* cross-system correlation
* historical trend analysis

---

### 2.2 Enterprise Integrations

* Kubernetes adapters
* distributed policy sync
* secure isolation layers
* compliance tooling

---

### 2.3 Vertical Playbooks

* domain-specific policy templates
* industry presets
* advisory tooling

Knowledge is sellable.
Mechanics are not.

---

## 3. Forbidden Commercialization

Commercial extensions MUST NOT:

* change core semantics
* bypass drop logic
* override boundedness
* introduce result-based decisions

Enterprise features MUST compose, not mutate.

---

## 4. Governance Rule

If a feature is required to:

* understand Maestro behavior
* debug drops
* ensure safety

It MUST be open-source.

Paid features may **enhance**, never **repair**.

---

## 5. Summary

Maestro monetization relies on:

* insight
* scale
* trust

Not on:

* locking behavior
* hiding mechanics
* artificial limitations
