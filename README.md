# AgriHerd

**Smart Livestock Management for Healthier Herds and Better Farming Decisions.**

AgriHerd is a technology-driven livestock management platform designed to help farmers improve animal health monitoring, organise livestock records, access professional agricultural extension services, and make informed animal nutrition decisions.

The initial release supports **beef and dairy cattle records**. Production-specific dairy and beef workflows can be added in later phases.

## Problem Statement

Livestock farmers face several challenges that affect animal health, productivity, and farm profitability:

1. **Unexplained Animal Sickness and Deaths:** Farmers may struggle to identify warning signs early, maintain complete health histories, and obtain timely professional assistance.
2. **Poor Livestock Data Management:** Animal health, treatment, and productivity records are often scattered across notebooks or disconnected records, making effective herd management difficult.
3. **Inadequate Access to Government Extension Services:** Farmers may have difficulty finding appropriate professional support and following up on livestock management advice.
4. **Inadequate Information on Balanced Animal Nutrition:** Limited access to reliable feeding guidance can lead to poor nutritional decisions that affect animal health and productivity.

AgriHerd aims to address these challenges through accessible digital records, practical alerts, reviewed agricultural information, and improved connections between farmers and livestock professionals.

## Objectives

- Improve the organisation and accessibility of livestock records.
- Help farmers monitor animal health and identify situations requiring professional attention.
- Improve access to government agricultural extension services and qualified livestock professionals.
- Provide reliable, professionally reviewed animal nutrition information.
- Support better dairy herd management through productivity records, reminders, and reporting.
- Establish a scalable foundation for future beef livestock management.

## Core Features

### 1. Animal Health Monitoring
- Record animal symptoms and health observations.
- Maintain treatment and vaccination histories.
- Track follow-up activities and veterinary assessments.
- Generate alerts based on configured warning rules.
- Maintain records of sickness events and animal deaths.

### 2. Digital Livestock Records
- Create a digital profile for each animal.
- Maintain animal identification and relevant characteristics.
- Track health, treatment, breeding, and productivity records.
- Access historical information through individual animal profiles.
- Generate livestock management summaries.

### 3. Agricultural Extension Services
- Connect farmers with participating government extension officers and qualified livestock professionals.
- Submit requests for agricultural or livestock management assistance.
- Track support requests and their status.
- Record professional recommendations and follow-up activities.
- Improve communication between farmers and available extension services.

### 4. Animal Nutrition Management
- Record available feeds and feed inventory.
- Monitor recorded feed consumption and stock levels.
- Provide access to professionally reviewed feeding information.
- Help farmers identify potential feed shortages.
- Support requests for individualised nutritional guidance from qualified professionals.

### 5. Dairy Productivity Management
- Record milk production for individual animals.
- Monitor production trends over time.
- Identify unusual changes that may warrant investigation.
- Generate basic dairy production summaries.

### 6. Alerts and Notifications
- Remind farmers about scheduled animal care activities.
- Flag selected health observations for professional review.
- Notify farmers about important follow-ups.
- Alert farmers when recorded feed stocks approach defined thresholds.

> **Important:** AgriHerd is intended to support livestock management, not replace veterinary professionals or qualified animal nutritionists. Automated alerts are not diagnoses, and feeding recommendations must be based on reliable, appropriately reviewed guidance.

## Target Users

AgriHerd is intended for:

- Smallholder dairy farmers.
- Medium-sized and commercial dairy farms.
- Farm workers and livestock attendants.
- Government agricultural extension officers.
- Veterinarians and other qualified livestock professionals.
- Agricultural organisations supporting livestock farmers.

The initial deployment will target dairy farming in Kenya, subject to validation with farmers and relevant livestock professionals.

## Project Scope

### Phase 1: Foundation

- React application shell and Express REST API.
- Prisma/PostgreSQL schema and migrations.
- Farmer sign-in, farm profiles, and farm-scoped role checks.
- Beef and dairy cattle registration with searchable profiles.

**Exit outcome:** A farmer can securely create a farm and register cattle.

### Phase 2: Health and Records

- Animal timelines and health observations.
- Care/treatment records and follow-up dates.
- A basic dashboard that distinguishes farmer observations from professional entries.

**Implemented:** Farm members can record observations, severity as observed, care already provided, and scheduled follow-ups. Assigned, verified professionals can add separate assessments to a consented health request without changing the original observation. Animal timelines include health, assessment, care, and feed records. The farm dashboard summarizes recent concerns, due follow-ups, and open support requests; it does not diagnose or triage animals.

### Phase 3: Nutrition and Extension

- Feed records and professionally reviewed nutrition guidance.
- Extension directory, support requests, and professional status updates.

### Phase 4: MVP Hardening and Pilot

- Validation, access review, basic reports, backup/recovery procedures, usability improvements, and pilot feedback.

**Implemented:** Farm-scoped 90-day reports with CSV export measure active-herd identity/health coverage and extension response, completion, and next-step recording. Farmers, farm workers, and professionals can submit pilot feedback; administrators can review feedback without submitter names or farm details. Report periods and feedback fields are validated, and extension response/completion timestamps support pilot measurement. The [pilot operations runbook](./docs/PILOT_OPERATIONS.md) defines backup, restore, consent, retention, access, and go/no-go procedures.

**Pilot gate:** The county, participating group, named backup owner, consent and retention policy, production deployment, and a successful restore rehearsal still require project-team approval before using real farm data.

Advanced analytics, offline synchronisation, SMS, sensors, integrations, and detailed dairy-production or beef-growth workflows remain later-release candidates.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React with Vite |
| Backend | Node.js and Express.js |
| Data access and migrations | Prisma |
| Database | PostgreSQL |
| API | Versioned REST API at `/api/v1` |
| Authentication | Email/password with hashed credentials and HTTP-only sessions |
| Version Control | Git and GitHub |
| Deployment | To be determined |

The architecture will prioritise modularity, maintainability, data security, and the ability to extend the platform as requirements grow.

The web client uses AgriHerd's illustrated farm landing page, responsive workspace navigation, and warm, accessible visual theme. Its screens remain connected to this application's existing API and permissions; features not yet implemented are not presented as available.

## High-Level System Modules

AgriHerd will be organised around the following modules:

1. User and Farm Management
2. Animal Identification and Records
3. Animal Health Monitoring
4. Dairy Production Management
5. Feed and Nutrition Management
6. Agricultural Extension Services
7. Notifications and Reminders
8. Reports and Analytics
9. Administration and Access Control

## Getting Started

### Prerequisites

- Node.js 20 or later and npm 10 or later.
- PostgreSQL.
- Git.

### Installation

1. Create a PostgreSQL database for AgriHerd.
2. Copy `.env.example` to `apps/server/.env` and set `DATABASE_URL` to the database connection string. Keep `.env` private.
3. Install dependencies and prepare the database:

   ```powershell
   npm install
   npm run db:generate
   npm run db:migrate
   ```

4. Start the web client and API:

   ```powershell
   npm run dev
   ```

5. Open `http://localhost:5173` and create a farmer account.

The API listens on `127.0.0.1:4000` by default; Vite proxies API calls to it. For a production deployment, configure the host, trusted proxy, HTTPS, and `WEB_ORIGIN` for the actual deployment environment.

On Windows, `npm run dev` launches the API and web client directly with Node, so it does not depend on `cmd.exe` being available through `PATH`.

To provision an administrator account, set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_NAME`, and a unique `SEED_ADMIN_PASSWORD` in `apps/server/.env`, then run `npm run db:seed-admin`. Public registration always creates farmer accounts; users cannot grant themselves professional or administrator access.

Run the focused server validation tests with `npm test`. Build both applications with `npm run build`.

Do not commit credentials, database passwords, API keys, or other secrets to the repository.

### Phase 3 workflows and access

- Farm members can record feed type, positive quantity, explicit unit (including a required name for custom units), date, optional animal, and notes. Records are private to active farm members.
- Signed-in users can browse only published nutrition resources. Publication requires a named source, review date, and a provisioned professional reviewer.
- Administrators must independently verify a professional's qualifications before provisioning an account. The professional starts unlisted and must opt in with a public contact method before appearing in the directory.
- New professional accounts must change their initial password before entering the workspace. Share initial credentials through a secure channel, never in source control or ordinary logs.
- Farmers choose a listed professional and a preferred contact method and explicitly consent to sharing when submitting a support request. The selected professional can view only requests assigned to their account and the contact detail the farmer chose to share; other farm members do not receive that contact detail. Farm members can view requests for their own farms. A professional interaction and outcome remain as history and do not overwrite the farmer's original request.
- Administrators manage professional accounts and nutrition publication, but do not receive routine access to private farm requests. A support request requires a listed professional; if the directory is empty, the farmer is directed to contact local services directly rather than being shown a false submission confirmation.
- Urgency is a farmer-recorded preference, not a triage decision or response-time promise. The system does not diagnose conditions, prescribe treatment, or generate personalised feed rations.

Key REST routes are under `/api/v1`: `/farms/:farmId/feed-records`, `/animals/:animalId/feed-records`, `/nutrition-guidance`, `/professionals`, `/farms/:farmId/extension-requests`, `/extension-requests`, and `/extension-requests/:requestId/interactions`. Administrator routes provision professionals and manage reviewed resources; professional directory status is opt-in.

### Phase 2 health records and access

- Farm owners and workers can record dated health observations and care already provided for animals on their farm. Severity is the observer's description, not a clinical assessment.
- Health observations, professional assessments, care records, and feed records are stored as separate history entries. An assessment never overwrites the farmer's observation.
- A verified professional can read a consented animal history and add an assessment only for that animal while assigned to its health extension request. Other farms, unrelated professionals, and administrators without farm membership do not receive that history.
- Farmers and farm workers can mark scheduled observation, care, and professional-assessment follow-ups complete. Changes and new health entries are audit logged.
- The farm summary counts registered beef/dairy animals, follow-ups due today or earlier, and open support requests. It shows recent concerns and scheduled follow-ups; it does not generate diagnosis, triage, or automated clinical warnings.
- Care forms document care that has already occurred; they do not recommend medication or treatment. Severe or rapidly worsening signs, sudden deaths, or suspected contagious disease require prompt direct contact with a veterinarian or the relevant animal-health authority.

Phase 2 REST routes are under `/api/v1`: `/farms/:farmId/summary`, `/animals/:animalId/history`, `/animals/:animalId/health-events`, `/animals/:animalId/care-records`, `/health-events/:eventId/assessments`, and the corresponding follow-up status routes.

### Phase 4 reports, feedback, and pilot readiness

- Farm reports require active membership and contain aggregate measures only. `GET /farms/:farmId/reports/summary` returns JSON; `GET /farms/:farmId/reports/summary.csv` downloads the same report. Optional `from` and `to` query dates use `YYYY-MM-DD`; the default period is the preceding 90 days and the maximum is 366 days.
- Farmers, farm workers, and professionals can submit a 1–5 pilot rating and optional comment at `POST /pilot/feedback`. Only administrators can list the latest 200 submissions at `GET /pilot/feedback`; submitter names and farm details are not returned.
- `firstRespondedAt` is recorded on the first professional interaction or explicit acknowledgement/status update. `completedAt` is set when an interaction resolves or closes a request and cleared if it is reopened. Migration backfills use historical interaction dates and last-updated timestamps as estimates.
- Report measures are pilot indicators, not clinical, service-quality, or staff-performance judgments. Their definitions and limitations are in the [pilot operations runbook](./docs/PILOT_OPERATIONS.md).

## Development Principles

AgriHerd will follow these principles:

- **Farmer-focused:** Prioritise practical workflows and ease of use.
- **Data-driven:** Use recorded information to support better decisions.
- **Safety-conscious:** Refer health and specialised nutrition decisions to qualified professionals when appropriate.
- **Modular:** Separate shared livestock functionality from dairy- and beef-specific features.
- **Secure:** Protect farm records through authentication and access controls.
- **Maintainable:** Follow consistent coding conventions, documentation, and testing practices.
- **Scalable:** Design for additional farms, users, animals, and future modules.
- **Evidence-informed:** Validate requirements and important recommendations with farmers and livestock professionals.

## Project Status

**Status:** Phase 1 foundation, Phase 2 health and records, Phase 3 nutrition/extension workflows, and Phase 4 reporting/pilot-feedback workflows implemented in code. Automated tests, builds, Prisma generation, and database-backed migration/restore validation remain pending in a configured environment; real-data pilot approval is outstanding.

The application includes account registration/sign-in, farm profiles, farm-scoped access checks, cattle registration, health timelines, farmer observations, assigned professional assessments, care and follow-up records, farm health summaries, feed records, reviewed nutrition resources, an opt-in professional directory, assigned extension requests with professional interactions, aggregate farm reports, and pilot feedback. Install Node.js/npm and configure PostgreSQL before running migrations, tests, or builds. Complete the pilot readiness gate in the [operations runbook](./docs/PILOT_OPERATIONS.md) before collecting real farm data.

## Contributing

Contributions from developers, agricultural professionals, and other interested collaborators are welcome.

Before contributing:

1. Review the project documentation.
2. Discuss major changes with the project team.
3. Create a separate branch for your work.
4. Keep changes focused and maintainable.
5. Test your changes before submitting a pull request.
6. Update relevant documentation when functionality changes.

Detailed contribution guidelines and branch conventions will be added as the team establishes its development workflow.

## Roadmap

- [x] Establish the Phase 1 project structure, API, database schema, and initial migration.
- [x] Implement farmer registration/sign-in, farm management, and farm membership checks.
- [x] Implement beef/dairy cattle registration and farm-scoped search.
- [x] Implement feed records, reviewed nutrition publication, and assigned extension requests.
- [x] Implement health observations, professional assessments, care records, and follow-ups.
- [ ] Implement dairy production tracking.
- [x] Add basic farm reports and pilot feedback.
- [ ] Add reminders and alerts.
- [ ] Validate all phase migrations, tests, builds, and the backup/restore procedure in a configured environment.
- [ ] Test the system with representative users.
- [ ] Pilot the cattle management module.
- [ ] Evaluate further dairy and beef workflows.

## Vision

AgriHerd aims to make livestock management more organised, accessible, and informed by helping farmers maintain better records, recognise potential problems, access professional support, and improve everyday management decisions.

**AgriHerd — Better Herd Management. Better Farming Decisions.**
