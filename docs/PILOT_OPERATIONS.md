# AgriHerd pilot operations

This procedure is a minimum checklist for a small, supervised pilot. Do not use real farm data until the pilot lead has named the responsible people, selected the participating county and farmer group, approved the consent text and retention schedule, and confirmed that a restore has been rehearsed.

## Pilot ownership and data handling

Before onboarding:

1. Record the pilot county, participating farms, pilot start/end dates, pilot lead, and the named database backup operator in the pilot approval record.
2. Explain to participants what farm and account information is collected, which assigned professionals can access a consented support request, how feedback is reviewed, how long live data and backups are retained, and how participants can request help with their data.
3. Set the live-data retention period and the backup-retention period with the pilot lead. Apply the same deletion schedule to live data, exported reports, and backup copies; document any delay before backup expiry.
4. Restrict database credentials, backup locations, and restore access to the named operator and approved substitutes. Store secrets outside source control and the application logs.
5. Verify HTTPS, production `NODE_ENV`, `WEB_ORIGIN`, trusted proxy configuration, and secure cookie behavior before exposing the service outside a trusted development network.
6. Test farmer, farm-worker, professional, and administrator accounts against the access matrix in the README. Use synthetic records for the rehearsal.

Do not include names, contact information, or animal-health details in pilot feedback comments. The review screen omits submitter identity and farm details, but feedback is stored against an account to prevent anonymous abuse and support accountability.

## Backup schedule

The named database operator should make one encrypted, off-host backup each day while the pilot is active, and before a migration or planned maintenance. Store backups in an access-controlled location separate from the application host. Use a rolling retention window approved for the pilot; a 30-day window is a suggested starting point, not a legal retention determination.

Run the following from an approved PowerShell administration session. Set `PGHOST`, `PGPORT`, `PGUSER`, `PGDATABASE`, and `PGPASSFILE` in the current process environment using the approved secret store. The `PGPASSFILE` must be outside the repository and readable only by the backup operator; do not put passwords in command arguments or source control.

```powershell
$backupDirectory = "D:\AgriHerdBackups"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupFile = Join-Path $backupDirectory "agriherd-$stamp.dump"

New-Item -ItemType Directory -Force -Path $backupDirectory | Out-Null
pg_dump --format=custom --no-owner --no-acl --file="$backupFile" --dbname="$env:PGDATABASE"
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed; do not treat this backup as successful." }

pg_restore --list "$backupFile" | Out-Null
if ($LASTEXITCODE -ne 0) { throw "The backup archive could not be read." }

Get-FileHash -Algorithm SHA256 "$backupFile"
```

Copy the backup and its SHA-256 value to the approved encrypted off-host location. Confirm that the copy's hash matches. Do not place backups, hashes containing identifying filenames, or exports in Git, an unapproved personal cloud folder, or a shared device.

## Restore rehearsal and recovery

Rehearse a restore before the pilot starts, then at least monthly and after a material database change. Restore into a new, empty, isolated PostgreSQL database; never use `--clean` against a live or shared database.

1. Select a backup, verify its SHA-256 value, and inspect it with `pg_restore --list`.
2. Create an empty restore database through the approved database provider. Set `PGHOST`, `PGPORT`, `PGUSER`, and `PGDATABASE` to the restore target using the approved secret store. Ensure the protected `PGPASSFILE` has an entry for that target.
3. Restore the archive:

   ```powershell
   pg_restore --no-owner --no-privileges --exit-on-error `
     --host="$env:PGHOST" --port="$env:PGPORT" --username="$env:PGUSER" `
     --dbname="$env:PGDATABASE" `
     "D:\AgriHerdBackups\agriherd-YYYYMMDD-HHMMSS.dump"
   if ($LASTEXITCODE -ne 0) { throw "Restore failed; keep the pilot database unchanged and investigate." }
   ```

4. Point a staging instance at the restored database. Generate the Prisma client using the deployed source version; do not run migrations against the live pilot database as part of recovery.
5. Verify the expected `_prisma_migrations` entries, farm and animal counts, representative health histories, feed records, and extension-request status/interactions. Confirm that the staging application starts and farm-scoped access checks still separate farms.
6. Record the selected backup timestamp, restore duration, counts checked, test outcome, and any corrective action without copying participant data into the record.
7. For a real incident, the pilot lead authorizes recovery, the operator preserves the original database for investigation, and the team communicates any service interruption to participants. Restore to a new database first and switch the application only after verification.

A dump that has not passed a restore rehearsal is not a verified recovery plan.

## Pilot measures

The farm report defaults to the preceding 90 days and supports periods up to 366 days. Report access follows active farm membership; CSV downloads contain aggregate counts and percentages, not animal names or comments. Health events are filtered by observation date; extension requests are grouped by their creation date, with responses and completions measured through the time the report is run. Active-herd denominators reflect the current herd, not a historical snapshot.

- **Identity coverage:** active animals with a non-empty name, internal code, and breed divided by active animals.
- **Health-event coverage:** active animals with at least one health event observed in the period divided by active animals. Each health event requires an animal, observation date, and follow-up status in the data model.
- **Event field coverage:** health events in the period that satisfy those required fields. The schema enforces these fields, so this is an integrity measure rather than a clinical quality measure.
- **Request completion:** requests created in the period that are `RESOLVED` or `CLOSED`, divided by requests created in the period.
- **Time to first response:** average hours from request creation to the first recorded professional interaction or explicit acknowledgement/status update. Historical values are backfilled from the first interaction date; new values are timestamped when the response or status update is recorded.
- **Recorded next step:** requests whose latest professional interaction records an outcome or follow-up date, divided by requests created in the period. This is a measurable proxy and does not judge the quality of the advice.
- **Time to completion:** average days from request creation to the recorded completion time. Existing terminal requests use their last-updated timestamp as an estimate; new completions are timestamped at the status transition.

Capture a baseline at the start of the pilot and review these measures with farmers and professionals at agreed intervals. Do not use them as staff performance targets or infer animal-health outcomes from record coverage.

## Pilot feedback and low-bandwidth checks

Participants can submit a 1–5 rating with an optional short comment. An administrator can review recent feedback without submitter names or farm details. Collect feedback at onboarding, after the first week, and at the pilot close; record agreed actions and owners outside participant records.

Before rollout, test the primary workflows on a small-screen device and a constrained or intermittent network: sign in, search cattle, record an observation, save care, view an animal timeline, submit a support request, and submit feedback. Confirm that failed saves show an error, that retries do not claim success, and that no offline capture is promised. Offline use remains a separate pilot decision.

## Go / no-go checklist

- [ ] Pilot county and participating farmers/professionals are agreed and recorded.
- [ ] Consent, data access, retention, deletion, and backup ownership are approved.
- [ ] Role and farm-isolation checks pass for farmer, worker, professional, and administrator accounts.
- [ ] Daily backup storage is restricted, encrypted, off-host, and retained under the approved schedule.
- [ ] A restore rehearsal passed and its evidence is recorded.
- [ ] The mobile and constrained-network workflow checks passed.
- [ ] Pilot participants know how to contact the project team and relevant animal-health professionals.
