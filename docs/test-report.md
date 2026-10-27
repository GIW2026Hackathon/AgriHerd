# DairyHub test report

Date: 2026-10-27

## Latest verification

| Check | Result | Details |
| --- | --- | --- |
| `npm run build` | Passed | TypeScript and Vite production build completed. Vite still reports a large JavaScript chunk. |
| `npm test` | Passed | 2 test files; 9 tests passed. |
| `npm audit` | Passed | 0 known dependency vulnerabilities. |
| `node --check server/index.mjs` | Passed | AI API source parses successfully. |
| Focused ESLint (`src/lib/ai.ts`, `server/index.mjs`) | Passed | No findings in those files. |
| Full `npm run lint` | Failed | Existing repository findings remain: 62 errors and 15 warnings across 21 files, including unused imports, hook rules, and Fast Refresh rules. |
| Browser smoke tests | Passed, with a routing fix | Landing and demo sign-in loaded; key role routes rendered; switching roles worked. Logout followed by selecting another persona initially opened the previous role's route. Login now preserves a requested route only when it belongs to the selected role; the farmer and veterinary logout/sign-in flows were rechecked. |
| AI API checks | Passed, with an error-handler fix | Health returned 200; no-key triage returned deterministic fallback and preserved emergency urgency; invalid language returned 400; disallowed origin returned 403. The invalid-request check exposed an undefined CORS fallback that could crash the API; this was fixed and rechecked. |
| PostgreSQL migration/RLS tests | Not run | No local PostgreSQL client/server or confirmed disposable database is available. The hardening migration has not been applied to a live database. |

## Browser coverage

The manual browser smoke test covered:

- Farmer: dashboard, registry, cases, triage, claims, herd health, and veterinary finder.
- Veterinary officer: cases, triage, surveillance, claims, and herd health.
- Sponsor: claims and reports.
- County authority: surveillance, reports, and audit.
- Platform administrator: surveillance, reports, audit, user administration, and herd health.
- Role switching between all five demo personas.
- Deterministic triage for high-fever/recumbency symptoms, including emergency escalation when no AI provider is configured.

These are route/render smoke checks, not full end-to-end workflow tests of every form, mutation, and persistence edge case.

## Remaining coverage and deployment limitations

- Database migrations, role-based RLS isolation, SQL trigger behavior, and migration rollback need tests against a disposable Supabase/PostgreSQL environment.
- The database and browser application are not connected in this prototype; the browser uses synthetic local data and demo persona sign-in.
- Authentication, account recovery, cross-user isolation, claim budget enforcement, payment webhooks, uploads, and external notifications are not production workflows.
- The AI API checks did not call Gemini because no provider credential was configured.
- Full lint must be cleaned up before it can serve as a passing CI gate.
- The production build's JavaScript chunk is approximately 1.06 MB before gzip; consider code splitting.

Do not use the prototype or its seeded data for real clinical, identity, payment, or public-health decisions.
