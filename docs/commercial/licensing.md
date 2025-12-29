# Licensing Strategy

> Last updated: 2025-12-30

## Dual Model

### Core Maestro (OSS)

**License:** Apache 2.0 veya MIT

**Neden?**

- Kurumsal ekipler korkmaz
- "Vendor lock-in" algısı oluşmaz
- Adoption artar

**Scope:**

- Decision logic
- Envelopes
- Pressure handling
- Event emission
- SDKs (`@maestro/core`, `@maestro/telemetry`)

**Bunlar asla lisansla kısıtlanmaz.**

---

### Commercial Layer

**Model:** Closed-source SaaS

**Neden?**

- Lisans karmaşası yok
- Fork tartışması yok
- Değer network ve hosting'te

**Scope:**

- Decision Intelligence API
- Governance UI
- Long-term storage
- Compliance features

---

## SDK Distribution

### `@maestro/core`

- OSS (Apache 2.0 / MIT)
- Decision logic, envelopes, pressure

### `@maestro/telemetry`

- OSS
- Event types, schema versions
- `@stable` annotations

### `@maestro/cloud`

- OSS (config + endpoint only)
- Ingest client (fire-and-forget)
- No business logic

**Commercial olan şey SDK değil, endpoint'in kendisi.**

> "Ben SDK için para ödemiyorum, görünürlük için ödüyorum."

---

## Ticari Hikâye

> "Maestro ücretsizdir.
> Ama Maestro'nun **neden böyle davrandığını anlamak** paralıdır."

Bu:

- Dürüst
- Savunulabilir
- Sürdürülebilir

---

## Integration Patterns

### Desteklenen

| Pattern          | Örnek                                      |
| ---------------- | ------------------------------------------ |
| Ingress boundary | API gateway öncesi, webhook handler başı   |
| Pre-worker       | Job dispatch öncesi, queue push öncesi     |
| Between stages   | Pipeline adımları arası, re-admission gate |

### Desteklenmeyen (bilinçli)

- Worker içinde karar
- Business logic içinde branching
- DB transaction ortası
- Workflow state transitions

**README'de açıkça yaz:** Yanlış kullanıcıyı erken kaybetmek iyidir.
