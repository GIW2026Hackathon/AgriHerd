# Gusii HerdCare system documentation

## 1. Purpose and scope

Gusii HerdCare is a role-based livestock-health and value-chain intelligence prototype for Gusii communities in Kisii and Nyamira counties. The current repository is a Vite/React demonstration with synthetic data. It supports exploring farmer, veterinary, sponsor, county, and administrator workflows in one browser.

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

Use [.env.example](../.env.example) as the variable-name inventory. Do not put service-role keys, database passwords, AI keys, SMS secrets, or payment secrets in `VITE_*` variables.

Current configuration is documentation-only. The frontend does not yet consume Supabase credentials.

## 9. Database deployment

1. Provision a disposable PostgreSQL/Supabase project.
2. Review and apply `schema.sql`.
3. Review and apply `migrations/0002_required_domain_entities.sql`.
4. Run RLS tests with separate farmer, vet, sponsor, county, and admin identities.
5. Add a versioned migration runner before applying changes to shared environments.
6. Back up the database before production migrations.
7. Do not apply synthetic seed data to a production tenant.

The current SQL contains an initial RLS design, not a completed production authorization review.

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

No real payment, SMS, provider verification, or AI provider call is currently performed.

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
