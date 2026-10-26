CREATE TYPE "HealthSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'NOT_REQUIRED');
CREATE TYPE "CareCategory" AS ENUM ('VETERINARY_VISIT', 'VACCINATION', 'MEDICATION', 'TREATMENT', 'OTHER');

CREATE TABLE "HealthEvent" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "symptoms" TEXT NOT NULL,
    "severityObserved" "HealthSeverity" NOT NULL,
    "notes" TEXT,
    "followUpDate" DATE,
    "followUpStatus" "FollowUpStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HealthEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HealthEvent_follow_up_check" CHECK (
        ("followUpDate" IS NULL AND "followUpStatus" = 'NOT_REQUIRED')
        OR ("followUpDate" IS NOT NULL AND "followUpStatus" <> 'NOT_REQUIRED')
    ),
    CONSTRAINT "HealthEvent_follow_up_date_check" CHECK (
        "followUpDate" IS NULL OR "followUpDate" >= "observedAt"::date
    )
);

CREATE TABLE "ProfessionalAssessment" (
    "id" TEXT NOT NULL,
    "healthEventId" TEXT NOT NULL,
    "professionalUserId" TEXT NOT NULL,
    "assessment" TEXT NOT NULL,
    "diagnosisIfMade" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "followUpDate" DATE,
    "followUpStatus" "FollowUpStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    CONSTRAINT "ProfessionalAssessment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ProfessionalAssessment_follow_up_check" CHECK (
        ("followUpDate" IS NULL AND "followUpStatus" = 'NOT_REQUIRED')
        OR ("followUpDate" IS NOT NULL AND "followUpStatus" <> 'NOT_REQUIRED')
    ),
    CONSTRAINT "ProfessionalAssessment_follow_up_date_check" CHECK (
        "followUpDate" IS NULL OR "followUpDate" >= "recordedAt"::date
    )
);

CREATE TABLE "CareRecord" (
    "id" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "recordedById" TEXT NOT NULL,
    "category" "CareCategory" NOT NULL,
    "details" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "followUpDate" DATE,
    "followUpStatus" "FollowUpStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CareRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CareRecord_date_order_check" CHECK ("endDate" IS NULL OR "endDate" >= "startDate"),
    CONSTRAINT "CareRecord_follow_up_check" CHECK (
        ("followUpDate" IS NULL AND "followUpStatus" = 'NOT_REQUIRED')
        OR ("followUpDate" IS NOT NULL AND "followUpStatus" <> 'NOT_REQUIRED')
    ),
    CONSTRAINT "CareRecord_follow_up_date_check" CHECK (
        "followUpDate" IS NULL OR "followUpDate" >= COALESCE("endDate", "startDate")
    )
);

CREATE INDEX "HealthEvent_animalId_observedAt_idx" ON "HealthEvent"("animalId", "observedAt");
CREATE INDEX "HealthEvent_followUpStatus_followUpDate_idx" ON "HealthEvent"("followUpStatus", "followUpDate");
CREATE INDEX "ProfessionalAssessment_healthEventId_recordedAt_idx" ON "ProfessionalAssessment"("healthEventId", "recordedAt");
CREATE INDEX "ProfessionalAssessment_followUpStatus_followUpDate_idx" ON "ProfessionalAssessment"("followUpStatus", "followUpDate");
CREATE INDEX "CareRecord_animalId_startDate_idx" ON "CareRecord"("animalId", "startDate");
CREATE INDEX "CareRecord_followUpStatus_followUpDate_idx" ON "CareRecord"("followUpStatus", "followUpDate");

ALTER TABLE "HealthEvent" ADD CONSTRAINT "HealthEvent_animalId_fkey"
    FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HealthEvent" ADD CONSTRAINT "HealthEvent_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProfessionalAssessment" ADD CONSTRAINT "ProfessionalAssessment_healthEventId_fkey"
    FOREIGN KEY ("healthEventId") REFERENCES "HealthEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProfessionalAssessment" ADD CONSTRAINT "ProfessionalAssessment_professionalUserId_fkey"
    FOREIGN KEY ("professionalUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CareRecord" ADD CONSTRAINT "CareRecord_animalId_fkey"
    FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CareRecord" ADD CONSTRAINT "CareRecord_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
