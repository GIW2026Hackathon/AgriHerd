# DairyHub

DairyHub is a role-based livestock health and dairy value-chain prototype for farming communities in Kisii and Nyamira, Kenya. It brings farm and animal records, veterinary case workflows, preliminary disease screening, sponsor claims, and county surveillance into one demonstration application.

> **Prototype notice:** DairyHub currently runs on synthetic data and browser-local storage. Sign-in is a demo persona selector, not identity verification. Do not use it to manage real animal-health records, make clinical decisions, verify payments, or monitor real outbreaks.

## What you can explore

The demo provides role-specific dashboards for:

- **Farmers** — farm and animal registry, case reporting, preliminary triage, herd-health reminders, and claims.
- **Veterinary officers** — case review, treatment notes, withdrawal-period tracking, and claim recommendations.
- **Sponsors and cooperatives** — linked farms, funding pools, claim review, and reports.
- **County authorities** — surveillance alerts, county reports, claims, and audit history.
- **Platform administrators** — user, platform, report, and audit views.

Other areas include a veterinary directory, case timelines, notifications, and audit records. The seeded people, farms, providers, metrics, and payment references are fictional demonstration data.

## Technology

- React 19, TypeScript, and Vite
- React Router with hash-based routes
- Tailwind CSS and Framer Motion
- Vitest and jsdom for unit tests
- Optional Node.js HTTP service for AI-assisted triage
- PostgreSQL schema and migration scripts for future backend work

## Get started

### Requirements

- Node.js 20.19+ or 22.12+
- npm

### Install and run the web app

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The frontend works without an API or database: triage uses its built-in deterministic screening engine, and demo records are stored in the browser.

### Sign in to the demo

1. Open **Sign in** and choose a persona: Farmer, Veterinary Officer, Sponsor / Co-op, County Authority, or Platform Admin.
2. Select a demo profile and use the shared demo password: `demo2026`.
3. To showcase registration, create a local farmer or veterinary profile. It is saved in this browser and starts a demo session immediately.
4. Open **My demo account** in the sidebar to edit profile details or preview the simulated password-reset flow.

Sign-in, registration, profile editing, and password reset are demonstrations only. Created profiles and profile edits are stored in the browser's demo dataset; passwords are never stored, reset messages are never sent, and no real identity or account is authenticated. The shared demo password applies to all profiles.

## AI triage API (optional)

The triage workflow always has a local, deterministic rules-based screen. To enable optional AI-generated explanations, run the companion API with a server-side Gemini key:

1. Copy `.env.example` to `.env`.
2. Set `GEMINI_API_KEY` and, if needed, `GEMINI_MODEL`.
3. Keep `VITE_API_BASE_URL` pointed at the API (the template uses `http://localhost:8787`).
4. Start the API and frontend in separate terminals:

```bash
npm run start:server
npm run dev
```

The API exposes `GET /api/ai/health` and `POST /api/ai/triage`. Without a configured provider or if the provider is unavailable, the API returns a deterministic fallback. Never put Gemini credentials in a `VITE_*` variable or commit them. AI triage is preliminary information, not a diagnosis or substitute for veterinary care.

## Data and database boundary

- The application repository persists demo data in browser `localStorage` (`glhvis.db.v1`); the demo session is kept in `sessionStorage`.
- Data is local to the browser and is not shared across users or devices. Clearing the browser's site data resets the demo.
- `DATABASE_URL` is used only by the server-side database health and migration scripts. The web application does not currently read or write its records through PostgreSQL.
- The SQL schema and migration are starting points, not a production-ready database deployment. They require a compatible PostgreSQL/Supabase setup and review before use.

To check or apply the SQL using an explicitly configured local or disposable database:

```bash
npm run db:health
npm run db:migrate
```

Set `DATABASE_URL` in the local `.env` file first. Review the SQL and use a disposable or staging database; do not run migrations against production without an approved backup and migration plan.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create the production frontend build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the Vitest suite |
| `npm run start:server` | Start the optional AI triage API |
| `npm run db:health` | Check `DATABASE_URL` connectivity |
| `npm run db:migrate` | Apply the baseline schema and ordered SQL migrations |

## Deployment

The frontend can be built as a static Vite site. The repository includes a Render blueprint in [`render.yaml`](render.yaml) for a static frontend and the optional Node.js AI API. Configure frontend and API environment variables only for the services that need them; keep `GEMINI_API_KEY` and `DATABASE_URL` server-side.

Deployment does not turn the local demo repository into a production backend. The browser data remains local, and the API currently serves AI triage only. See the [Render deployment guide](docs/render-deployment.md) before deploying.

## Project documentation

- [System documentation](docs/system-documentation.md) — architecture, roles, routes, data model, and current limitations.
- [Implementation audit](docs/implementation-audit.md) — current-state findings and production-readiness gaps.
- [Test report](docs/test-report.md) — recorded validation results and remaining test coverage.
- [Architecture notes](architecture.md) — prototype architecture reference.
- [Database schema](schema.sql), [domain migration](migrations/0002_required_domain_entities.sql), and [security hardening migration](migrations/0003_security_hardening.sql).
- [AI API notes](server/README.md).

## Production readiness

DairyHub is a prototype, not a production clinical, identity, payment, or public-health system. Before real-world use, it needs authenticated accounts, server-enforced authorization, a connected and tested backend, private storage, verified provider and payment integrations, operational monitoring, and appropriate veterinary, privacy, and security reviews. See the [implementation audit](docs/implementation-audit.md) for a fuller list.
