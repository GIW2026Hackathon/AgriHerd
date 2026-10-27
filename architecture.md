# Gusii Livestock Health & Value Chain Intelligence System
## Architecture & Data Modeling Specification (Phase 1)

> **Document status:** Approved-for-build · **Version:** 1.0 · **Date:** 2026-10-26
> **Region scope:** Kisii & Nyamira Counties, Kenya (Gusii highlands) — dairy value chain
> **Classification:** Internal — Engineering & Product

---

## 1. Executive Summary

The **Gusii Livestock Health & Value Chain Intelligence System (GLHVIS)** is a multi-tenant,
role-based platform that links **farmers, veterinary officers (DVOs), sponsors (milk buyers /
co-operatives), county livestock authorities (County Veterinary Services / Directorate of
Veterinary Services), and platform administrators** into one disease-prevention, treatment and
claims network.

It closes the loop that today leaks value: a cow calves sick → farmer has no vet → milk buyer
loses yield → county has no data → treatment costs are paid out-of-pocket with no audit trail.
GLHVIS makes every stage of that loop observable, financed and auditable.

### Core capabilities
1. Farm & animal registry (RFID/S/N tagged herds, geo-located farms)
2. AI-assisted disease pre-screening (Vercel AI SDK, LangGraph.js-style routed pipeline w/ deterministic fallback)
3. Geolocation veterinary-officer finder (Haversine ranking + availability)
4. Sponsor-funded care & **claims workflow** (draft → submitted → approved → disbursed → reconciled)
5. Case & treatment tracking with immutable clinical timeline
6. Disease surveillance & early-warning (ward-level outbreak clustering, threshold alerts)
7. Tick-control & herd-health planning (dipping calendars, deworming, vaccination schedules)
8. Exportable reporting (PDF/CSV/JSON) for county & sponsors

---

## 2. Environment Note (important, honest constraint)

The reference stack is **Next.js (App Router) + Supabase (Postgres & Auth)**. This repository is
compiled with the in-house **Vite + React 19 + TypeScript** toolchain, so the build delivers the
identical product as a single-page application with a `src/pages` route table that mirrors the
Next.js App Router file tree one-to-one (see §4). The data layer (`src/lib/store.ts`) is a
**Supabase-compatible repository**: same table names, same column names, same RBAC matrix, same
RLS predicates (ported verbatim to TypeScript), same `audit_logs` contract, same claims state
machine. Swapping `DataClient` for `@supabase/supabase-js` + the `schema.sql` DDL is a lift-and-shift,
not a rewrite. **No third-party integrations (M-Pesa, SMS gateways, payment processors) are claimed
to work unless explicitly marked as mocked** — see §9.

---

## 3. System Context

```
                    ┌─────────────────────────────────────────────┐
                    │              GLHVIS Platform                 │
                    │                                             │
  Farmer ─────────► │  Registry · AI Triage · Vet Finder · Claims │
  Veterinary ─────► │  Case inbox · Treatment protocols · E-vet    │
  Sponsor ────────► │  Herd programmes · Funding pools · Claims    │
  County Authority► │  Surveillance · Early warning · Reports      │
  Platform Admin ─► │  RBAC · Users · Audit · Sponsors config      │
                    └──────────────┬──────────────────────────────┘
                                   │ HTTPS / PostgREST / Realtime
                    ┌──────────────▼──────────────┐
                    │   Supabase (Postgres)       │
                    │   Auth · RLS · audit_logs   │
                    │   Realtime (case channels)  │
                    └─────────────────────────────┘
                                   │
   SMS gateway (mocked) ── M-Pesa (mocked) ── AI (Vercel AI SDK pattern, deterministic fallback)
```

---

## 4. Next.js App Router Structure (mirrored 1:1)

```
app/                                src/pages/
├── (marketing)/                    ├── Landing.tsx            ← public marketing site
│   └── page.tsx
├── (auth)/login/page.tsx           ├── Login.tsx              ← demo persona switcher
├── dashboard/                      ├── dashboard/
│   ├── layout.tsx  (RBAC shell)    │   ├── AppLayout.tsx      ← sidebar + topbar, role-filtered nav
│   ├── farmer/                     │   ├── farmer/  FarmerHome.tsx
│   ├── vet/                        │   ├── vet/     VetHome.tsx, VetCaseDetail.tsx
│   ├── sponsor/                    │   ├── sponsor/ SponsorHome.tsx, ClaimsReview.tsx
│   ├── county/                     │   ├── county/  CountyHome.tsx (surveillance)
│   └── admin/                      │   └── admin/   AdminHome.tsx
│       ├── farmers/                │   ├── registry/ Farmers.tsx, FarmDetail.tsx, Animals.tsx
│       ├── cases/                  │   ├── cases/    CaseBoard.tsx (kanban), CaseDetail.tsx
│       ├── ai-triage/              │   ├── triage/   AITriage.tsx
│       ├── vets/                   │   ├── vets/     VetFinder.tsx
│       ├── claims/                 │   ├── claims/   Claims.tsx
│       ├── surveillance/           │   ├── surveillance/ Surveillance.tsx
│       ├── tick-control/           │   ├── tick/     HerdHealth.tsx
│       ├── reports/                │   ├── reports/  Reports.tsx
│       └── audit/                  │   └── audit/    AuditLog.tsx
└── actions/ (server actions)       └── lib/ (repository + services)
```

**Route groups** `(marketing)` / `(auth)` / `dashboard` match App Router groups; `layout.tsx`
per group provides the authenticated shell with role-gated navigation.

---

## 5. RBAC Strategy

### 5.1 Roles
| Role | Code | Dashboard | Domain of control |
|---|---|---|---|
| Farmer | `farmer` | `/dashboard/farmer` | Own farms, own animals, own cases, own claims |
| Veterinary Officer | `vet` | `/dashboard/vet` | Assigned caseload, treatment protocols, visits |
| Sponsor (milk buyer / co-op) | `sponsor` | `/dashboard/sponsor` | Linked farmer programmes, funding pools, claims approval |
| County Authority | `county` | `/dashboard/county` | Ward-level surveillance, outbreak response, reports |
| Platform Administrator | `admin` | `/dashboard/admin` | Everything + RBAC, sponsors, audit, platform config |

### 5.2 Permission matrix (resource × action)
`●` allowed, `◐` scoped (own records), blank = denied

| Resource | farmer | vet | sponsor | county | admin |
|---|---|---|---|---|---|
| farms | ◐ C/R/U own | R linked | R linked | R all (geo) | ● |
| animals | ◐ C/R/U own | R/U linked case animals | R linked | R all | ● |
| disease_cases | ◐ C/R own | R/U assigned | R linked | R all (surveillance) | ● |
| case_events | ◐ C own case | ● C/R assigned | R linked | R | ● |
| treatments | R own case | C/R/U assigned | R linked | R | ● |
| claims | C/R own draft | C/R assigned (recommend) | C/R/U approve linked | R | ● |
| claim_line_items | C own | C/R | R/U approve | R | ● |
| tick_control_plans | ◐ C/R/U own | R/U linked | R linked | R | ● |
| disease_alerts | R (ward of own farm) | R + acknowledge | R | C/R/U ● | ● |
| reports | — | R own cases | R portfolio | R + export | ● export all |
| audit_logs | — | — | — | R county-scope | ● R all |
| profiles (users) | ◐ self | R linked farmers | R linked | R ward | ● C/R/U/D |

### 5.3 Enforcement layers (defense in depth)
1. **Route layer** — `AppLayout` hides nav items per role; direct navigation is guarded by
   `<RequireRole>` which redirects unauthorized users to their home dashboard.
2. **Repository layer** — every query passes through `DataClient`, which applies **RLS-equivalent
   predicates** (§6.2) before any row is returned. This mirrors Postgres RLS exactly, including
   `auth.uid()` / `auth.jwt() -> 'role'` claims.
3. **Policy layer in Postgres** — `schema.sql` ships real `CREATE POLICY` statements so the same
   file deployed to Supabase enforces RLS at the database regardless of client behavior.
4. **Audit layer** — every mutation writes an immutable `audit_logs` row (actor, role, action,
   entity, before/after JSONB, IP) via an append-only trigger.

---

## 6. Data Architecture

### 6.1 Entity-relationship map
```
authed_users (Supabase auth.users)
      │ 1:1
   profiles ──────────────────────────────┐
      │ 1:N                               │
     farms ◄──────────── sponsor_members ──┤
      │ 1:N           (sponsor ↔ farmer)  │
   animals ───┐                           │
      │       │ 1:N                       │
      │   disease_cases ◄── vet           │
      │       │ 1:N                       │
      │   case_events                     │
      │   treatments                      │
      │       │ 1:1                       │
      │     claims ─── claim_line_items   │
      │                                   │
   tick_control_plans                     │
                                          │
   disease_alerts (ward/commodity)  ──────┘
   audit_logs (append-only, trigger-fed)
   notifications (per-user)
   sponsors · funding_pools
```

Full DDL: [`schema.sql`](./schema.sql) — 15 tables, 3 enums, 12 indexes, RLS on every table,
audit trigger, `updated_at` trigger, and materialized surveillance view `ward_outbreak_counts`.

### 6.2 RLS predicates (as implemented in `DataClient`)
```
farms            farmer:  created_by = :uid
                 vet/sponsor: farm_id ∈ linked set
                 county/admin:  true (geo-scoped by ward for county)
disease_cases    farmer:  farm.created_by = :uid
                 vet:     assigned_vet_id = :uid
                 sponsor: farm in sponsor_members(uid)
                 county/admin: true
claims           farmer:  requested_by = :uid          (create/read own)
                 vet:     case.assigned_vet_id = :uid  (recommend only — status locked)
                 sponsor: sponsor_id = :uid AND status ∈ reviewable set
                 county: read-only;  admin: full
```

### 6.3 Claims state machine
```
draft ──submit──► submitted ──► under_review ──approve──► approved ──disburse──► disbursed
                    │                  │                                (mocked EFT/M-Pesa)
                    │                  └──reject──► rejected ──(reopen)──► draft
                    └──(withdraw)──► draft
```
Transitions are **role-gated** (only sponsor/admin may approve/reject/disburse) and every
transition writes `audit_logs` + `notifications`. Seeded case `FS-2041` walks this full path.

### 6.4 Audit log contract
`audit_logs(id, ts, actor_id, actor_role, action, entity_table, entity_id, before jsonb,
after jsonb, ip inet)` — append-only; `UPDATE/DELETE` revoked from all roles except a
break-glass `audit_writer`. Viewer UI at `/dashboard/admin/audit` (admin-only).

---

## 7. AI Disease Screening (Vercel AI SDK pattern)

Pipeline (mirrors `ai-triage` route handler):
1. **Intake** — farmer selects animal, free-text symptoms, structured symptom chips, duration, photo (optional).
2. **Deterministic veterinary rule engine** (always available, no API key needed):
   weighted symptom vectors → ranked differential diagnoses w/ confidence %, red flags, urgency tier (ROUTINE / PRIORITY / EMERGENCY) and recommended next action.
3. **Optional LLM enrichment** via Vercel AI SDK (`generateText`) when `AI_GATEWAY_KEY` is present —
   produces a plain-language explanation and farmer-facing advice. **If the key is absent the
   deterministic engine still answers** — no hallucinated "AI worked" claims; the UI badge shows
   which engine served the answer.
4. **Hand-off** — one-click "Log as case" converts the screening into a `disease_cases` row with the
   differential attached, notifies nearest available vet, and is written to `audit_logs`.
5. Every screening is stored (`ai_screenings`) for county surveillance signal.

Red-flag overrides (downer cow, epistaxis + high fever, sudden death, neurological signs) always
force **EMERGENCY** regardless of the model output.

---

## 8. Security Posture

| Control | Implementation |
|---|---|
| AuthN | Supabase Auth (email/password + magic link); demo personas seeded for evaluation |
| AuthZ | RBAC matrix §5.2 enforced at route, repository and Postgres RLS layers |
| Audit | Immutable `audit_logs`; append-only trigger; admin viewer |
| Input validation | Zod schemas at repository boundary |
| Injection | Parameterized DDL; no string-concatenated SQL anywhere; RLS as second barrier |
| Secrets | `.env.local` only; `.env.example` committed; no secrets in repo |
| Transport | HTTPS-only (Vercel); Supabase enforces TLS for PG |
| Data minimization | JWT carries `role` + `sub` only; PII kept in `profiles` with RLS |
| OWASP | XSS (React escaping + CSP header in `vercel.json`), CSRF (SameSite=Lax cookies), Clickjacking (`X-Frame-Options: DENY`) |

---

## 9. Honest Integration Boundaries (no hallucinated functionality)

| Integration | Status | Behavior in build |
|---|---|---|
| Supabase Postgres + Auth | **Architecture-ready** | Repository pattern in `lib/store.ts`; `schema.sql` deploys 1:1 |
| Vercel AI SDK / LLM | **Hybrid** | Calls `generateText` if `AI_GATEWAY_KEY` set; otherwise deterministic veterinary rule engine — both real & functional, engine badge shown |
| M-Pesa disbursement | **Mock** | Claim "disburse" writes a `disbursement_ref` (`MOCK-MPESA-…`) and audit entry; clearly labeled "Simulated payout" |
| SMS notifications | **Mock** | `notifications` table + in-app toast center; `sms_sent` flag simulated |
| RFID ear-tag hardware | **Registry-only** | Tag numbers stored & scanned via input; no hardware SDK claimed |
| County GIS shapefiles | **Ward centroids** | 45 Gusii wards with lat/lng centroids; not survey-grade parcel boundaries |

---

## 10. Phase Plan (with acceptance criteria)

| Phase | Deliverable | Acceptance |
|---|---|---|
| **1 — Architecture & Data Modeling** | `architecture.md`, `schema.sql`, RBAC matrix, claims state machine | Reviewed & approved ✅ (this document) |
| **2 — Design System & Shell** | Tokens, typography, layout, sidebar/topbar, role-gated routing, toast system, favicon | All routes render under auth shell |
| **3 — Auth & Role Switching** | Login w/ persona cards, session context, `RequireRole` guard | Each persona lands on correct dashboard |
| **4 — Core Data Layer** | Seeded relational dataset (8 farms, 22 animals, 6 cases, 4 claims, 45 wards, vets, pools), repository w/ RLS predicates | CRUD flows persist to localStorage-backed store |
| **5 — Farmer & Registry Modules** | Dashboard, farms/animals registry, AI triage page, vet finder w/ geo-ranking | Farmer can run screening → log case |
| **6 — Vet, Sponsor, Claims** | Vet caseload inbox + treatment log, sponsor pools, claims kanban w/ transitions, audit writes | Claim walks full lifecycle |
| **7 — County & Admin** | Surveillance map + ward counts, early-warning alerts, tick-control planner, reports w/ CSV/PDF export, admin (users/sponsors/audit) | Alert ack + report export work |
| **8 — Hardening & Deploy** | Empty states, loading states, a11y pass, 404, build, deploy | Production URL live |

---

## 11. Seeded Demo Dataset (coherent, relational)

- **8 farms** across Kitutu Chache/North, Nyaribari Masaba/Chache, Borabu wards (Kisii & Nyamira)
- **22 animals** (Friesian, Ayrshire, Guernsey, crossbreds; tag, DOB, lactation stage, parity)
- **5 disease cases** across `submitted → under_review → approved → completed` incl. one EMERGENCY (East Coast Fever) and one mastitis cluster in Kitutu Chache
- **4 claims** in 4 different lifecycle states (one with full M-Pesa-style disbursement ref)
- **45 wards** w/ centroids; **6 veterinary officers** w/ ward, specialty, availability
- **2 sponsors** ("Maziwa Co-operative", "Gusii Fresh Dairy Ltd") with funding pools & 6 linked farmers
- **6 surveillance alerts** (2 critical, tick burden, Lumpy Skin Disease watch)
- **Tick-control plans**, notifications, **audit trail seeded with real state-change entries**

---

## 12. Build & Deploy

```bash
npm install
npm run build     # tsc -b && vite build
npm run preview
```
Deployed via Vercel (`vercel.json` with security headers + SPA rewrites). Supabase cutover:
apply `schema.sql` → set `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → flip
`DataClient` implementation (documented in `src/lib/store.ts` header).
