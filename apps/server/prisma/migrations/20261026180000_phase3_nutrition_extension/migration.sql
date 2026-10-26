CREATE TYPE "FeedUnit" AS ENUM ('KG', 'G', 'L', 'ML', 'BALE', 'BAG', 'OTHER');
CREATE TYPE "GuidanceScope" AS ENUM ('ALL_CATTLE', 'DAIRY', 'BEEF');
CREATE TYPE "GuidanceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ExtensionCategory" AS ENUM ('HEALTH', 'NUTRITION', 'HERD_MANAGEMENT');
CREATE TYPE "ExtensionUrgency" AS ENUM ('ROUTINE', 'SOON', 'URGENT');
CREATE TYPE "ExtensionStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
CREATE TYPE "ContactMethod" AS ENUM ('PHONE', 'EMAIL', 'IN_PERSON');

ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "ProfessionalProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "qualifications" TEXT NOT NULL,
    "serviceArea" TEXT NOT NULL,
    "publicEmail" TEXT,
    "publicPhone" TEXT,
    "isListed" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeedRecord" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "animalId" TEXT,
    "recordedById" TEXT NOT NULL,
    "feedName" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" "FeedUnit" NOT NULL,
    "unitLabel" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FeedRecord_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FeedRecord_quantity_check" CHECK ("quantity" > 0),
    CONSTRAINT "FeedRecord_unit_label_check" CHECK (
        ("unit" = 'OTHER' AND "unitLabel" IS NOT NULL AND length(trim("unitLabel")) > 0)
        OR ("unit" <> 'OTHER' AND "unitLabel" IS NULL)
    )
);

CREATE TABLE "NutritionResource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "scope" "GuidanceScope" NOT NULL DEFAULT 'ALL_CATTLE',
    "source" TEXT,
    "sourceUrl" TEXT,
    "reviewDate" DATE,
    "reviewedById" TEXT,
    "createdById" TEXT NOT NULL,
    "status" "GuidanceStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NutritionResource_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "NutritionResource_published_review_check" CHECK (
        "status" <> 'PUBLISHED'
        OR ("source" IS NOT NULL AND length(trim("source")) > 0
            AND "reviewDate" IS NOT NULL AND "reviewedById" IS NOT NULL)
    )
);

CREATE TABLE "ExtensionRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "animalId" TEXT,
    "assignedProfessionalId" TEXT NOT NULL,
    "category" "ExtensionCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "urgency" "ExtensionUrgency" NOT NULL DEFAULT 'ROUTINE',
    "contactMethod" "ContactMethod" NOT NULL,
    "preferredContactValue" TEXT,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "status" "ExtensionStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExtensionRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExtensionInteraction" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "professionalUserId" TEXT NOT NULL,
    "interactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "advice" TEXT NOT NULL,
    "followUpDate" DATE,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExtensionInteraction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");
CREATE INDEX "ProfessionalProfile_isListed_verifiedAt_idx" ON "ProfessionalProfile"("isListed", "verifiedAt");
CREATE INDEX "FeedRecord_farmId_recordedAt_idx" ON "FeedRecord"("farmId", "recordedAt");
CREATE INDEX "FeedRecord_animalId_recordedAt_idx" ON "FeedRecord"("animalId", "recordedAt");
CREATE INDEX "NutritionResource_status_scope_updatedAt_idx" ON "NutritionResource"("status", "scope", "updatedAt");
CREATE UNIQUE INDEX "ExtensionRequest_reference_key" ON "ExtensionRequest"("reference");
CREATE INDEX "ExtensionRequest_farmId_createdAt_idx" ON "ExtensionRequest"("farmId", "createdAt");
CREATE INDEX "ExtensionRequest_assignedProfessionalId_status_updatedAt_idx"
    ON "ExtensionRequest"("assignedProfessionalId", "status", "updatedAt");
CREATE INDEX "ExtensionInteraction_requestId_interactionDate_idx"
    ON "ExtensionInteraction"("requestId", "interactionDate");

ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedRecord" ADD CONSTRAINT "FeedRecord_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeedRecord" ADD CONSTRAINT "FeedRecord_animalId_fkey"
    FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FeedRecord" ADD CONSTRAINT "FeedRecord_recordedById_fkey"
    FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NutritionResource" ADD CONSTRAINT "NutritionResource_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NutritionResource" ADD CONSTRAINT "NutritionResource_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExtensionRequest" ADD CONSTRAINT "ExtensionRequest_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtensionRequest" ADD CONSTRAINT "ExtensionRequest_submittedById_fkey"
    FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExtensionRequest" ADD CONSTRAINT "ExtensionRequest_animalId_fkey"
    FOREIGN KEY ("animalId") REFERENCES "Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ExtensionRequest" ADD CONSTRAINT "ExtensionRequest_assignedProfessionalId_fkey"
    FOREIGN KEY ("assignedProfessionalId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ExtensionInteraction" ADD CONSTRAINT "ExtensionInteraction_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "ExtensionRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExtensionInteraction" ADD CONSTRAINT "ExtensionInteraction_professionalUserId_fkey"
    FOREIGN KEY ("professionalUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
