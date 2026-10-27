# DairyHub implementation audit

Date: 2026-10-27

## Executive summary

The current application is a polished Vite/React/TypeScript prototype. It has role-specific screens and a useful domain model, but it is not yet a database-backed production application. Data is persisted in browser `localStorage`, authentication is a persona switch rather than identity verification, and several workflows intentionally generate demo outcomes. The existing `schema.sql` is a useful starting point for PostgreSQL/Supabase, but it is not currently connected to the frontend and does not cover every entity required by the product brief.

No real users, providers, payments, outbreaks, or operational statistics should be inferred from the seeded records. The seeded records are synthetic demo data.

## Existing feature inventory

| Area | Current state | Evidence |
| --- | --- | --- |
| Public landing page | Implemented | `src/pages/Landing.tsx` |
| Role-specific application shell | Implemented for farmer, vet, sponsor, county, and admin personas | `src/App.tsx`, `src/components/AppLayout.tsx` |
| Farm and animal registry | Implemented against local repository | `src/pages/Registry.tsx`, `src/lib/store.ts` |
| Case submission, assignment, timeline, treatment notes | Implemented against local repository | `src/pages/Cases.tsx`, `src/pages/CaseDetail.tsx`, `src/lib/store.ts` |
| Rule-based triage experience | Implemented as a local/demo workflow | `src/pages/AITriage.tsx`, `src/lib/ai.ts` |
| Veterinary directory | Implemented from seeded profiles | `src/pages/VetFinder.tsx`, `src/lib/seed.ts` |
| Claims and funding pools | Implemented as a local/demo workflow | `src/pages/Claims.tsx`, `src/lib/store.ts` |
| Surveillance, reports, audit screens | Implemented as local views | `src/pages/Surveillance.tsx`, `src/pages/Reports.tsx`, `src/pages/Audit.tsx` |
| Authentication | Demo persona selection only | `src/pages/Login.tsx`, `src/lib/session.tsx` |
| Persistent backend API | Missing | `package.json` contains no server/API or Supabase client dependency |
| Production identity and recovery | Missing | No Auth provider integration |
| Private file storage | Missing | No upload/storage integration |
| Real notification delivery | Missing | Notifications are local records; `sms_sent` is seeded/demo state |
| Payment provider integration | Missing | Disbursement references are generated with `MOCK-MPESA-...` |

## Confirmed defects and risks

1. **Authentication is not authentication.** Login accepts the selected demo persona and does not verify a password or identity. The session is stored in `sessionStorage`.
2. **Authorization is client-side only.** `DataClient` applies RLS-like predicates in browser code, but a user can modify browser state or localStorage. These checks are not a security boundary.
3. **Data is per-browser and mutable.** `localStorage` is the only persistence layer. Changes do not survive across devices or authenticated sessions.
4. **Demo payment state can be fabricated.** `setClaimStatus` creates a `MOCK-MPESA-*` reference when a claim is marked disbursed. This must not be used as payment confirmation.
5. **The repository suppresses storage failures.** Corrupt storage is silently reseeded and quota errors are ignored, which can make a user believe data was saved when it was not.
6. **The SQL draft is incomplete relative to the product brief.** It contains profiles, farms, animals, cases, treatments, sponsors, claims, screenings, alerts, notifications, and audit logs, but does not define organizations/memberships, farm memberships, consent records, provider credential/service records, breeding/vaccination/preventive-care/follow-up/tick-treatment records, or attachments.
7. **The SQL draft is not versioned as migrations.** `schema.sql` is a single deployment script and is not executed by the application.
8. **No automated test suite is configured.** `package.json` has build/lint scripts but no unit, integration, or end-to-end test runner.
9. **No environment-variable contract exists.** There is no `.env.example` describing database, auth, storage, AI, notification, or payment configuration.
10. **Seeded provider and programme data is synthetic.** The product must not present it as verified real-world provider availability or sponsor coverage.
11. **The environment template previously documented the wrong AI variable.** The frontend reads `VITE_AI_GATEWAY_KEY`; `AI_PROVIDER_API_KEY` is reserved for a future server-side integration and is not read by the current app.

## Database and authorization gaps

The existing SQL should be split into versioned migrations and extended with:

- organizations, organization memberships, farm memberships, and user consent records;
- provider profiles, credentials, services, service areas, availability, and explicit verification state;
- breeding, vaccination, preventive-care, follow-up, and tick-treatment records;
- private attachment metadata and storage-object references;
- server-side helper functions for role and organization access checks;
- RLS policies for every table, including explicit denial of cross-farmer and cross-organization reads;
- immutable audit logging for sensitive reads and all state transitions;
- transactional claim budget checks and idempotent payment/webhook handling.

The browser must use a public client only. Service-role credentials, database passwords, payment secrets, and AI provider keys must remain server-side.

## External services and credentials required

Required before production use:

- PostgreSQL/Supabase project URL and public anon key;
- Supabase Auth configuration and redirect URLs;
- private Supabase Storage bucket and storage policies;
- server-side database/service-role configuration for trusted jobs only;
- AI provider credentials if model-backed triage is enabled;
- SMS provider credentials and delivery webhook if SMS is enabled;
- payment provider sandbox credentials, webhook signing secret, reconciliation process, and approval from the relevant financial operator;
- Vercel project/environment configuration;
- qualified Kenyan data-protection and veterinary compliance review.

## Prioritized implementation plan

1. Add versioned database migrations and complete the missing entities, constraints, indexes, RLS policies, and audit triggers.
2. Add a typed server API/data layer with schema validation and authenticated request handling.
3. Replace demo session handling with Supabase Auth while retaining a clearly labelled local demo mode for development only.
4. Move farm, animal, case, treatment, claim, notification, and report reads/writes to the server API.
5. Add private attachment upload/download flows with signed URLs and validation.
6. Add transactional claim approval/disbursement state handling and provider webhook reconciliation; remove mock payment success paths from production code.
7. Add loading, validation, error, empty, retry, and duplicate-submit states to all mutating screens.
8. Add unit, integration, RLS, and browser tests covering the workflows in the engineering brief.
9. Add deployment, backup/restore, retention, incident-response, and rollback documentation.
10. Complete an independent security, legal, veterinary, and operational review before production launch.

## Current completion boundary

The current repository is suitable for a synthetic local demonstration only. It is not production-ready and must not be used to make clinical, payment, identity, or public-health claims without the backend, authorization, operational integrations, and validation work above.
