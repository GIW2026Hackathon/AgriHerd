# Gusii Livestock Health & Value Chain Intelligence System
## Architecture & Data Modeling — Phase 1 Deliverable

**Version:** 1.0 · **Date:** 2026-10-26 · **Status:** Approved for build · **Region:** Kisii & Nyamira Counties, Kenya

---

## 1. Executive Summary

A production-grade, multi-tenant platform connecting **farmers**, **veterinary officers**, **sponsors** (milk buyers / dairy co-operatives / processors), the **County Livestock Authority** (surveillance) and the **Platform Administrator**. The system closes the loop from *symptom report → AI-assisted triage → verified vet dispatch → clinical case → sponsor-funded claim → payment → anonymised county surveillance*, replacing paper logbooks and fragmented WhatsApp coordination.

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js (App Router) · React · TypeScript | Reference implementation in this repo: Vite + React 19 + TypeScript (SPA, same component model) |
| Styling / UI | Tailwind CSS v4 · shadcn/ui-style primitives | Tokens: pine/maize/paper palette, Fraunces + Inter + IBM Plex Mono |
| Backend | Supabase (PostgreSQL 15, Auth, RLS) | All authorization enforced at the database, not the UI |
| AI | Vercel AI SDK (`ai` + `@ai-sdk/openai`) | Triage copilot with structured JSON output; transparent rule-based fallback engine |
| Offline | IndexedDB mutation queue (outbox pattern) | Writes captured offline, replayed on reconnect |
| Reporting | CSV / printable PDF-style exports | Client-side generation, no extra infra |
| Hosting | Vercel | Serverless |

**Explicitly NOT claimed / NOT implemented:** lab referral integrations, vet price comparison, direct government-database links, livestock trading, transport marketplaces, real M-Pesa settlement, and live production LLM keys. AI triage runs a transparent rule engine in-browser; the Vercel AI SDK path is architected and documented but never advertised as a live paid API.

## 3. Roles & Capability Matrix (RBAC)

| Capability | Farmer | Vet | Sponsor | Authority | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Manage own profile / farms / animals | ✅ | — | — | — | ✅ (all) |
| Report symptoms · AI triage | ✅ | — | — | — | ✅ |
| Find & request vets | ✅ | — | — | — | ✅ |
| Accept/decline cases, log clinical records | — | ✅ | — | — | ✅ |
| Configure agreements & enroll farmers | — | — | ✅ | — | ✅ |
| Review / approve / reject claims | — | — | ✅ | — | ✅ |
| Disease surveillance (anonymised) | — | — | — | ✅ | ✅ |
| Verify vets, approve sponsors, suspend users | — | — | — | — | ✅ |
| Audit log access | — | — | — | — | ✅ |

Enforcement points: (1) client route guards, (2) Postgres RLS policies, (3) API-route role checks, (4) audit triggers. The UI never decides authorization by itself.

## 4. Case Lifecycle (state machine)

```
pending_vet → vet_assigned → in_treatment → resolved → claim_submitted → claim_under_review → claim_approved → claim_paid
                  │                                                          │                          └─ rejected → resubmit
                  └─ cancelled (farmer)                └─ escalated (authority, critical triage)
```

Every transition is a row in `case_events` (immutable) + `audit_logs` entry. Claims ≥ decison thresholds require sponsor-role authorization; payment status flips dashboard KPIs live.

## 5. Sponsor-Entitlement Model

A farmer is **covered** when a `sponsor_enrollments` row links the farmer to a `sponsors` org under an active `sponsorship_agreements` row, via an `enrollment_code` (validated, single-use). Coverage confers: max claim per case, annual cap, and covered diagnosis list. Claim approval debits `used_to_date`; the farmer view recomputes remaining benefits instantly.

## 6. Data Model (see `schema.sql`)

`profiles` (1:1 auth.users, role enum) → owned by role sub-tables (`farmer_profiles`, `vet_profiles`, `sponsor_org_members`, `authority_profiles`).
Farms 1—* animals. Cases link (farm, animal, farmer, vet, sponsor). Clinical records & treatments hang off cases. Claims hang off cases. `alerts` feed the outbreak engine. `vaccinations` + `tick_control_plans` power prevention. `audit_logs` + `notifications` are cross-cutting.

Security invariants:
- RLS enabled on every table; helper functions `auth_role()`, `is_admin()`, `is_sponsor_member(sponsor_id)`.
- Surveillance views (`v_surveillance_zone_stats`, `v_disease_weekly`) use `security_invoker=false` semantics over **anonymised** aggregates — no farmer PII crosses to authority/sponsor roles.
- `audit_logs` writable only by `security definer` trigger — users cannot forge or delete entries.

## 7. Offline-First Strategy

All mutating actions pass through a typed `enqueue()` outbox writing to IndexedDB (`glhis-outbox`). When `navigator.onLine` flips true, or the user clicks "Sync now", the queue replays FIFO against the store with idempotency keys. The topbar shows a live `OFFLINE n pending` badge. Optimistic UI updates apply immediately to the in-memory store.

## 8. AI-Assisted Triage (truthful scope)

Symptom checklist (22 signs, grouped: general / production / respiratory / neurological / skin-parasites) → weighted rule engine produces: ranked differential diagnoses (FMD, ECF, Anaplasmosis, Mastitis, Lumpy Skin Disease, East Coast Fever, Trypanosomosis, Bloat, Milk Fever …), a 0–100 urgency score, recommended action (self-care / call vet within 48h / vet within 24h / emergency), and a structured note. The design isolates the engine behind `triage()` so the Vercel AI SDK + an `OPENAI_API_KEY` can replace the rule engine server-side without touching the UI — this is an **integration seam**, not a claimed live capability.

## 9. Disease Surveillance

Zone-level (ward) aggregation over synthetic + live case data: incidence by disease & zone, 6-week trend, outbreak threshold banner (≥3 FMD cases in a zone/14d ⇒ alert). Exports: CSV of the current filtered dataset and a print-optimised report view.

## 10. Non-Functional

- **Security:** RLS deny-by-default; RBAC guards; audit triggers; no PII in surveillance aggregates; input validation on every form; secrets only server-side.
- **Scalability:** stateless serverless APIs; read-heavy dashboards served from denormalised views; pagination on all lists.
- **Availability:** offline outbox; graceful degradation; empty/loading/error states everywhere.
- **Auditability:** every mutation writes `audit_logs(actor, role, action, entity, entity_id, diff)`.

## 11. Phase Plan (execution protocol)

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Architecture & data modelling (`architecture.md`, `schema.sql`) | ✅ Delivered |
| 2 | Auth, RBAC, app shell, role-routed dashboards | ✅ Delivered |
| 3 | Registry: farms, animals, profiles, eligibility | ✅ Delivered |
| 4 | AI triage, vet finder, case creation & assignment | ✅ Delivered |
| 5 | Clinical tracking, claims engine, sponsor workflow, audit | ✅ Delivered |
| 6 | Surveillance, tick-control, vaccinations, alerts | ✅ Delivered |
| 7 | Docs viewer, CSV/print reporting, exports | ✅ Delivered |
| 8 | Acceptance walkthrough (seed farmer → vet → sponsor → authority) | ✅ Delivered |

## 12. Acceptance Criteria (all programmatically verifiable in-app)

1. Farmer reports sick cow (symptoms → triage → case created) ✔
2. System finds & assigns nearest verified vet (Haversine, Gusii wards) ✔
3. Vet accepts, examines, logs clinical record + treatment ✔
4. Case resolves → vet submits claim → sponsor reviews → approve/reject ✔
5. On approval, claim paid, coverage debited, audit entry written ✔
6. County Authority dashboard KPIs/alerts update automatically ✔
7. All of the above works offline-resiliently and is exported to CSV/print ✔
