# DairyHub system documentation

## 1. Purpose and scope

DairyHub is a role-based livestock-health and value-chain intelligence prototype for dairy communities in Kisii and Nyamira counties. The current repository is a Vite/React demonstration with synthetic data. It supports exploring farmer, veterinary, sponsor, county, and administrator workflows in one browser.

It is not currently a production clinical, public-health, identity, or payment system.

## 2. Current runtime architecture

```text
Browser
  React 19 + TypeScript + Vite
  React Router hash routes
  AppProvider/session context
  DataClient repository
  localStorage: glhvis.db.v1
  sessionStorage: glhvis.session.v1

Future production boundary
  Browser -> authenticated server API/Supabase client
          -> PostgreSQL/Supabase RLS
          -> private object storage
          -> server-side AI, SMS, and payment integrations
```

### Main source areas

- `src/App.tsx`: route map and role shells.
- `src/components/AppLayout.tsx`: authenticated navigation and layout.
- `src/lib/session.tsx`: demo session/persona state.
- `src/lib/store.ts`: local repository, visibility predicates, mutations, audit and notifications.
- `src/lib/seed.ts`: synthetic demo dataset.
- `src/lib/types.ts`: shared domain types.
- `src/lib/ai.ts`: local deterministic triage logic.
- `schema.sql`: PostgreSQL/Supabase baseline schema and RLS draft.
- `migrations/0002_required_domain_entities.sql`: additional domain entities and initial policies.

## 3. Roles and permissions in the prototype

| Role | Intended scope |
| --- | --- |
| Farmer | Own farms, animals, cases, triage submissions, claims, and notifications |
| Vet | Assigned cases, treatment records, clinical notes, and claim recommendations |
| Sponsor | Explicitly linked farms, eligible cases, funding pools, claims, and reports |
| County | Authorized county-wide surveillance, reports, claims visibility, and audit review |
| Admin | Platform administration, users, configuration, reports, and audit review |

The browser repository mirrors intended access predicates, but these are not security controls. A production deployment must enforce every permission on the server and in PostgreSQL RLS.

## 4. User workflows

### Farmer

1. Open the landing page and choose **Open Dashboard**.
2. Select the Farmer persona and sign in.
3. Use Registry to review farms and animals.
4. Use AI Triage for a rule-based screening.
5. Submit or review cases in Case Board.
6. Open a case to inspect timeline, treatment, and claim state.
7. Review Herd Health reminders and Claims.

### Veterinary professional

1. Select the Veterinary Officer persona.
2. Review assigned or triage-ready cases.
3. Open a case, add notes, record treatment, and change status.
4. Review withdrawal-period information.
5. Add a claim recommendation when the workflow permits.

### Sponsor/cooperative

1. Select the Sponsor/Co-op persona.
2. Review linked farms and claims.
3. Inspect line items, review notes, funding pools, and reports.
4. Treat all disbursement references in the demo as synthetic placeholders.

### County authority

1. Select County Authority.
2. Review surveillance alerts and ward-level reports.
3. Review claims and audit records within authorized scope.

### Platform administrator

1. Select Platform Admin.
2. Review users, reports, surveillance, claims, and audit history.
3. Treat all user and provider records as synthetic demo personas.

## 5. Route map

Public routes:

- `#/`: landing page
- `#/login`: demo persona sign-in

Role route families:

- `#/app/farmer`
- `#/app/vet`
- `#/app/sponsor`
- `#/app/county`
- `#/app/admin`

Common feature routes include `registry`, `cases`, `cases/:caseId`, `triage`, `claims`, `herd-health`, `surveillance`, `reports`, `audit`, and `users`, subject to role navigation.

## 6. Data model

### Implemented in the local repository

- Profiles
- Farms
- Animals
- Disease cases
- Case events
- Treatments
- Sponsors and sponsor members
- Funding pools
- Claims and claim line items
- Tick control plans
- AI screenings
- Disease alerts
- Notifications
- Audit records

### Defined in the SQL baseline/migration

The SQL adds or prepares support for:

- Organizations and organization memberships
- Farm memberships
- User consents
- Veterinary profiles and credential verification
- Provider services, service areas, and availability
- Breeding records
- Vaccination records
- Preventive-care records
- Follow-up records
- Tick-treatment records
- Attachment metadata

## 7. Local development

Prerequisites:

- Node.js compatible with the installed Vite/TypeScript toolchain
- npm

Commands:

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```

The current dev server uses:

```text
http://127.0.0.1:5173/
```

`npm run test` executes `src/lib/store.test.ts`. These tests cover farmer, veterinary, sponsor, and staff visibility plus persistence of triage cases, screenings, events, notifications, audits, and treatments.

The browser demo stores data locally. To reset it, use the application's demo-data reset control if available, or clear the `glhvis.db.v1` localStorage key in browser developer tools.

## 8. Configuration

Use [.env.example](../.env.example) as the variable-name inventory. The system now uses one configuration variable for PostgreSQL: `DATABASE_URL`. Keep it server-side; never put it in a `VITE_*` variable.

The repository ignores `.env` and `.env.*` files except `.env.example`. The checked-in template contains blank placeholders only. If a real credential has ever been placed in a tracked file, pasted into chat, or shared in a screenshot, revoke and rotate it before continuing.

The browser continues using the local demo repository. The server-side PostgreSQL scripts use only `DATABASE_URL`; the browser never receives this value.

The AI Triage screen supports typed farmer descriptions and browser speech recognition. It defaults to Swahili (`sw-KE`) feedback, recognises common Swahili and English livestock-health phrases, and feeds the resulting symptom signals into the deterministic veterinary engine. Browser speech recognition depends on browser support and microphone permission; the typed input remains the fallback.

The generated explanation is advisory and does not replace a veterinary diagnosis. Red-flag symptoms still force emergency escalation. Model-backed enrichment remains optional and must be implemented behind a server-side API before production credentials are introduced; provider keys must never be placed in browser `VITE_*` variables.

## 9. Database deployment

1. Provision a local PostgreSQL database or disposable PostgreSQL/Supabase project.
2. Set one local server-side variable in `.env`:
   `DATABASE_URL=postgresql://user:password@host:5432/agriherd`
3. Run `npm run db:health`.
4. Review and apply `schema.sql` and `migrations/0002_required_domain_entities.sql` with `npm run db:migrate`.
5. Run RLS tests with separate farmer, vet, sponsor, county, and admin identities.
6. Add a versioned migration runner before applying changes to shared environments.
7. Back up the database before production migrations.
8. Do not apply synthetic seed data to a production tenant.

Available database commands:

- `npm run db:health`: connects and reports the database/user without exposing the connection string.
- `npm run db:migrate`: applies the baseline and ordered SQL migrations and records applied filenames in `public._agriherd_migrations`.

The current SQL contains an initial RLS design, not a completed production authorization review.

### Database verification status

The repository now includes server-side `db:health` and `db:migrate` scripts that read only `DATABASE_URL`. The browser still uses the local demo repository until a server API is implemented; a PostgreSQL connection string cannot be used directly from browser code.

The SQL baseline targets Supabase/PostgreSQL and requires `pgcrypto`, `pg_trgm`, PostGIS, and Supabase-compatible `auth.users`, `auth.uid()`, and `auth.jwt()` objects. For a plain local PostgreSQL installation, use a local Supabase stack or provision those extensions and compatibility objects before running the migration. The connection-string contract remains the same.

To complete database verification, provide the items in the setup checklist below, then run the migrations against a disposable Supabase project first. Never send service-role keys through chat.

### Setup checklist needed from the project owner

1. Confirm the database is local/disposable or provide approval for staging.
2. Set only `DATABASE_URL` in the ignored `.env` file.
3. Confirm whether PostGIS and `pg_trgm` are enabled or permitted.
4. Create test identities for farmer, vet, sponsor, county, and admin roles.
5. Confirm the JWT role-claim strategy used by `current_role()` when using Supabase.
6. Approve applying both SQL files to staging.
7. Provide the expected organization/farm-link test cases and whether synthetic seed data may be loaded.
8. Confirm backup and rollback ownership before any shared-environment migration.

## 10. Security and privacy requirements

Before production:

- Replace persona login with Supabase Auth or an equivalent identity provider.
- Enforce authorization in server handlers and PostgreSQL RLS.
- Keep storage private and issue short-lived signed URLs.
- Validate file type, size, ownership, and case linkage.
- Add rate limits to login, triage, upload, claim, and notification operations.
- Make claim approval and payment reconciliation transactional and idempotent.
- Verify provider credentials before displaying a provider as verified.
- Add consent, retention, export, correction, and deletion workflows.
- Use append-only audit records for sensitive changes and access.
- Obtain Kenyan data-protection and veterinary legal review.

## 11. External integrations still required

- Supabase Auth
- PostgreSQL/Supabase database
- Private Supabase Storage
- AI provider, if model-backed triage is approved
- SMS provider and delivery webhook
- Payment provider sandbox, signed webhooks, and reconciliation
- Vercel environment configuration

No real payment, SMS, provider verification, or server-side model provider call is currently performed. The current farmer AI workflow is a local, deterministic pre-screen with optional browser speech-to-text.

## 12. Deployment

The frontend is compatible with a static Vite build:

```bash
npm run build
```

Deploy the generated `dist/` directory through the configured Vercel project. Before doing so:

- configure SPA fallback behavior for hash routes;
- configure security headers from `vercel.json`;
- configure only approved public environment variables in the browser;
- deploy backend/API functions separately once implemented;
- run smoke tests against the deployed URL;
- verify no demo credentials or secrets are bundled.

## 13. Backup and rollback

For a future database deployment:

1. Take a verified backup before every migration.
2. Apply migrations in a staging environment.
3. Run RLS, workflow, and rollback checks.
4. Record migration version and deployment time.
5. Keep the prior frontend deployment available for rollback.
6. Restore only through an authorized database recovery procedure.

The current localStorage demo has no centralized backup or recovery.

## 14. Known limitations

- Demo authentication accepts any password.
- Data is browser-local and mutable.
- There is no server API.
- There is no real database connection.
- Payment disbursement references are synthetic.
- Notifications are local records, not delivery confirmations.
- Providers and programme metrics are synthetic.
- No automated unit, integration, or end-to-end test suite is configured.
- The production SQL migration process is not automated.
- The app is not production-ready.
