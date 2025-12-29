# Commercial Roadmap

> Last updated: 2025-12-30

OSS core sabit varsayımıyla ticari modele giden yol.

---

## Faz 0 — Ön Koşul (current)

**Amaç:** Ürünü satmak değil, ne sattığını kesinleştirmek.

Gerekenler:

- [x] Core davranış stabil
- [x] Drop / retry / dispatch semantiği sabit
- [x] README'de Why / Why Not netliği
- [x] 1 gerçek senaryo (webhook) çalışır örnek

**Çıkış kriteri:**

> "Maestro'yu kapatırsam sistem neyi kaybediyor?" sorusu net cevaplanabiliyor.

---

## Faz 1 — Commercial Boundary

**Amaç:** Neyin asla satılmayacağını kilitlemek.

| Bileşen               | Lisans     | Değişmez mi?     |
| --------------------- | ---------- | ---------------- |
| Core decision logic   | OSS        | ✅ Sonsuza kadar |
| Drop reasons          | OSS        | ✅               |
| Decision events       | OSS        | ✅               |
| Runtime davranışı     | OSS        | ✅               |
| Decision Intelligence | Commercial | —                |
| Governance Layer      | Commercial | —                |

**Kural:** Paralı olan şey asla runtime kararını etkilemez.

---

## Faz 2 — Decision Intelligence Layer

**Amaç:** İlk satılabilir şeyi tanımlamak.

Runtime'a dokunmaz. Event toplar, sonradan analiz eder.

### 2.1. Veri Sözleşmesi

**Blocker:** Bu adım tamamlanmadan Faz 2.2'ye geçilmez.

Gerekenler:

- [x] RFC-8: Event Schema Evolution
- [ ] `DecisionEvent` → `@stable(v1)` annotation
- [ ] `@maestro/telemetry` stub paketi
- [ ] schemaVersion field

Commercial layer yalnızca şu verileri bilir:

- decision type (dispatch / retry / drop)
- drop reason
- envelope id
- pressure snapshot
- timestamp
- task id (opaque)

**Payload yok. Result yok. Correlation yok.**

### 2.2. Event Ingestion

- [ ] `/ingest/decision-event` endpoint
- [ ] Minimal auth (token)
- [ ] Fire-and-forget semantics
- [ ] `@maestro/cloud` stub paketi

**Kural:** Ingest başarısız olursa Maestro etkilenmez.

### 2.3. Storage

- [ ] `decision_events` tablosu
- [ ] Zaman indeksleri
- [ ] Envelope + decision type indeksleri
- [ ] Retention policy (default: 7 gün)

### 2.4. Çekirdek Sorgular

1. Drop summary (son X saat, reason dağılımı)
2. Envelope behavior (dispatch/retry/drop oranları)
3. Pressure vs decision korelasyonu
4. Timeline

### 2.5. İlk UI

- Tek sayfa, 3-4 grafik, read-only
- Zaman seçici, envelope filtresi, drop breakdown

### 2.6. Validation

**Çıkış kriteri:**

- 1 gerçek ekip (external, repo owner değil)
- 1 gerçek incident
- "Buna bakarak kararımızı savunduk" cümlesi

---

## Faz 3 — İlk Ödeme

**Amaç:** Çok küçük bir yerden para almaya başlamak.

- Aylık küçük ücret
- "Internal visibility" gerekçesi
- 1-2 ekipten ödeme

Bu faz ürünü değil, **pazarı** doğrular.

---

## Faz 4 — Governance & Simulation

- Envelope değişiklik geçmişi
- Policy simülasyonu ("Bu envelope prod'da ne yapar?")
- Sertleşme / yumuşama trendleri

Bu fazdan sonra Maestro → **Decision governance aracı**.

---

## Faz 5 — Enterprise (talep varsa)

- K8s admission entegrasyonları
- Multi-region aggregation
- Long-term archive
- Compliance export

---

## Timeline (solo developer, gerçekçi)

| Faz     | Süre          | Kümülatif |
| ------- | ------------- | --------- |
| 0-1     | ✅ Tamamlandı | —         |
| 2.1     | ~1 hafta      | 1 hafta   |
| 2.2-2.5 | ~3 hafta      | 1 ay      |
| 3       | ~2 ay         | 3 ay      |
| 4+      | Talebe bağlı  | —         |

---

## Kritik Uyarı

> "Core'u satılabilir hale getireyim" → Projeyi öldürür.

Doğru model:

- **Core** → güven
- **Analiz** → para
- **Governance** → ölçek
