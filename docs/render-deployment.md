# Render deployment guide

## What is deployable today

The current project is a Vite/React browser application. It can be deployed to Render as a **Static Site** using [render.yaml](../render.yaml).

The deployed UI is still the synthetic local demonstration:

- Authentication is demo persona selection.
- Data is stored in each browser's localStorage.
- There is no server API.
- PostgreSQL migrations are not run by the static site.
- `DATABASE_URL` must not be added to Render Static Site environment variables.

## Option A: Deploy with the Render Blueprint

1. Push this repository to GitHub.
2. In Render, choose **New → Blueprint**.
3. Select the repository and branch.
4. Render detects `render.yaml`.
5. Confirm the service:
   - Type: Static Site
   - Build command: `npm ci && npm run build`
   - Publish directory: `dist`
6. Create the service.
7. Wait for the build to complete.
8. Open the generated Render URL.

## Option B: Create the Static Site manually

Use these values in Render:

| Setting | Value |
| --- | --- |
| Root directory | repository root |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist` |
| Node version | Use the repository/default Render Node version; pin one if your team requires it |

No environment variables are required for the current static demo.

## Verify the deployment

After deployment:

1. Open the Render URL.
2. Confirm the landing page loads.
3. Open the login page.
4. Sign in with a synthetic persona using the local demo password shown in the UI.
5. Open the farmer dashboard.
6. Open Registry, Cases, and AI Triage.
7. Refresh the browser and confirm the local demo session behavior.
8. Confirm no secrets are present in the rendered JavaScript bundle or Render environment.

## Database deployment is a separate service

The `DATABASE_URL` variable is for server-side Node scripts only:

```env
DATABASE_URL=postgresql://user:password@host:5432/agriherd
```

Do not add it to a Render Static Site. Static sites expose client assets publicly.

Before using PostgreSQL in production, deploy a separate backend service that:

- owns the database connection;
- validates authenticated requests;
- enforces authorization and RLS;
- runs `npm run db:health` and controlled migrations;
- exposes only safe API responses to the browser.

The current repository does not yet contain that backend service. A Render Web Service can be added later with a server entry point and a separate environment group containing `DATABASE_URL`.

## Database migration procedure

Do not run migrations as part of the static site's build command. Use a staging database and an authorized server-side environment:

```bash
npm ci
npm run db:health
npm run db:migrate
```

The SQL baseline expects PostgreSQL/Supabase-compatible extensions and auth objects. Back up the database before applying migrations.

## Rollback

Render keeps previous deploys available:

1. Open the service in Render.
2. Open the deploy history.
3. Select the last known-good deploy.
4. Roll back.

Database rollback is separate. Never roll back application assets and database schema independently without checking compatibility.

## Production blockers

The following must be completed before claiming a production backend:

- Supabase/Auth or equivalent identity integration.
- Server API implementation.
- PostgreSQL-backed reads and writes.
- RLS integration tests.
- Private file storage and signed URLs.
- Payment webhook/reconciliation integration.
- Notification delivery integration.
- Security, data-protection, and veterinary review.
