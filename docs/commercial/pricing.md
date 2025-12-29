# Pricing Model

> Last updated: 2025-12-30

## Core Principle

**Doğru metrik "kullanım" değil, "görünürlük"tür.**

Request/task/throughput metriklerinden para almak yanlış.
Bunlar runtime'a yakın ve core'a baskı yapar.

---

## Pricing Axis

**Decision visibility + retention + governance**

Para şuna akar:

- Kaç gün decision history görüyorum?
- Kaç envelope / environment izliyorum?
- Kaç ekip bu verilere erişiyor?

---

## Tiers

### Free / OSS

- Core Maestro
- Decision events (local)
- Self-managed usage
- No retention

### Team (~$49-99/mo)

- Hosted Decision Intelligence
- 7 gün retention
- 1-2 environment
- Read-only dashboard

### Org / Pro (~$199-399/mo)

- 30 gün retention
- Envelope history
- Karşılaştırmalar
- Export
- 5+ environment

### Enterprise (custom)

- Compliance
- Long-term archive
- On-prem / VPC
- Custom ingestion
- Sözleşmeli fiyat

---

## Anti-Patterns

❌ **Event başına ücret** → Yanlış müşteri davranışına iter
❌ **Request sayısı** → Runtime baskısı
❌ **Core feature gate** → Güven kaybı

---

## Retention Karar Kriterleri

7 gün default seçilecekse, gerekçe:

| Kriter                        | Değerlendirme                                |
| ----------------------------- | -------------------------------------------- |
| Incident investigation window | Çoğu ekip 48-72 saat içinde investigate eder |
| Post-mortem yazım süresi      | Genelde 5 iş günü içinde                     |
| Storage maliyeti              | X events/day × Y bytes = hesapla             |
| Compliance                    | Sektöre bağlı, default yok                   |

**Karar:** Teknik değil, müşteri segmentine göre belirlenir.
