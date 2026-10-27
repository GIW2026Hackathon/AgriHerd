# Gusii HerdCare test report

Date: 2026-10-27

## Commands executed

| Check | Result | Details |
| --- | --- | --- |
| `npm install` | Passed | Installed 310 packages including Vitest/jsdom; npm reported 7 vulnerabilities (1 moderate, 4 high, 2 critical) |
| `npm run build` | Passed | TypeScript compilation and Vite production build completed |
| `npm run lint` | Failed | Existing unused imports, Fast Refresh export rules, and React hook lint findings remain |
| `npm run test` | Passed | 1 test file and 6 repository visibility/workflow tests passed |
| VS Code test discovery | Partial | Repository test command is configured and passes; browser test controller discovery is not the repository test runner |
| Browser smoke test | Passed | Landing page, login persona selection, farmer app shell, and case/triage navigation loaded |
| Dev server | Running | `http://127.0.0.1:5173/` |

## Build result

The production build completed successfully and generated `dist/`.

Vite reported a bundle-size warning:

- JavaScript output is approximately 1.13 MB before gzip.
- The main bundle is approximately 321 KB gzip.
- Code splitting should be considered before production launch.

## Lint findings

Lint is not clean. Findings include:

- unused icon/component imports in multiple pages;
- unused data imports and variables;
- React Fast Refresh warnings for files exporting both components and helpers;
- React hook dependency warnings;
- a state update inside an effect in `AppLayout.tsx`.

These are quality issues to resolve before enforcing lint in CI. The successful production build does not mean lint or production readiness is complete.

The demo sign-in now rejects passwords other than the documented synthetic demo password. This is still not production authentication.

## Browser smoke-test steps

1. Opened the local Vite URL.
2. Confirmed the landing page title and navigation.
3. Opened the demo login route.
4. Confirmed all five persona choices were rendered.
5. Selected Farmer and signed in.
6. Confirmed navigation to the farmer application shell.
7. Confirmed case/triage navigation and case-board content rendered.

## Missing test coverage

The repository still needs:

- unit tests for repository predicates and mutations;
- database migration tests;
- PostgreSQL RLS tests for every role;
- authentication and account-recovery tests;
- claim budget and idempotency tests;
- payment webhook and partial-payment tests;
- upload authorization tests;
- cross-user and cross-organization isolation tests;
- browser tests for all role workflows;
- AI failure fallback and notification failure tests.

No real payments or external notification calls should be used in automated tests.

The new tests are intentionally limited to the local repository because no Supabase project, authenticated test identities, storage bucket, payment sandbox, or notification provider is available in this environment.

## Database verification status

PostgreSQL connectivity, migration execution, and RLS tests were not run. The project currently has no database client or server API, and no safe confirmed staging credentials were provided for use. The SQL files therefore remain unverified against a live PostgreSQL/Supabase instance.

To complete this phase, the owner must provide a disposable/staging Supabase project, configure credentials locally in ignored `.env` files, approve the migration run, and create separate test identities for all five roles. Service-role credentials must never be pasted into chat or committed.

### Latest connectivity retry

The local `.env` was checked without printing secret values:

- Supabase URL variable: present.
- Supabase public-key variable: present, but the REST request returned HTTP `401 Unauthorized`.
- Direct PostgreSQL client: not available (`psql` not installed).
- Direct TCP connection to the configured PostgreSQL host/port: unreachable.
- Local repository tests: 6 passed.
- Production build: passed.

This indicates that the current key/URL configuration is not usable for authenticated Supabase access, and direct database access is unavailable from this machine. Verify the project URL and anon key in the Supabase dashboard, check database network restrictions, and install/configure the PostgreSQL client or use the Supabase SQL editor for migrations.

## Environment-variable verification

The active environment contract is now one variable: `DATABASE_URL`. The environment template and local `.env` were reduced to that variable. `DATABASE_URL` is consumed only by the server-side `db:health` and `db:migrate` scripts; it is not exposed to the browser.

`npm run db:health` was executed after the refactor and correctly stopped with `DATABASE_URL is required` because the local `.env` intentionally contains a blank placeholder. No database connection was attempted. Populate it with a local/staging connection string before running the command.
