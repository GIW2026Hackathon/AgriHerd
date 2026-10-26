CREATE TYPE "PilotFeedbackCategory" AS ENUM (
    'USABILITY',
    'DATA_QUALITY',
    'ACCESS',
    'PROFESSIONAL_WORKFLOW',
    'OTHER'
);

ALTER TABLE "ExtensionRequest"
    ADD COLUMN "firstRespondedAt" TIMESTAMP(3),
    ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "ExtensionRequest" AS request
SET "firstRespondedAt" = (
    SELECT MIN(interaction."interactionDate")
    FROM "ExtensionInteraction" AS interaction
    WHERE interaction."requestId" = request."id"
);

UPDATE "ExtensionRequest"
SET "completedAt" = "updatedAt"
WHERE "status" IN ('RESOLVED', 'CLOSED');

ALTER TABLE "ExtensionRequest" ADD CONSTRAINT "ExtensionRequest_completedAt_status_check"
    CHECK (
        ("completedAt" IS NULL AND "status" NOT IN ('RESOLVED', 'CLOSED'))
        OR ("completedAt" IS NOT NULL AND "status" IN ('RESOLVED', 'CLOSED'))
    );

CREATE TABLE "PilotFeedback" (
    "id" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "category" "PilotFeedbackCategory" NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PilotFeedback_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "PilotFeedback_rating_check" CHECK ("rating" BETWEEN 1 AND 5)
);

CREATE INDEX "PilotFeedback_createdAt_idx" ON "PilotFeedback"("createdAt");

ALTER TABLE "PilotFeedback" ADD CONSTRAINT "PilotFeedback_submittedById_fkey"
    FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
