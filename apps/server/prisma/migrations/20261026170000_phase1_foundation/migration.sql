CREATE TYPE "UserRole" AS ENUM ('FARMER', 'FARM_WORKER', 'PROFESSIONAL', 'ADMIN');
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "FarmMembershipRole" AS ENUM ('OWNER', 'MANAGER', 'WORKER');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');
CREATE TYPE "AnimalPurpose" AS ENUM ('BEEF', 'DAIRY');
CREATE TYPE "AnimalSex" AS ENUM ('FEMALE', 'MALE', 'UNKNOWN');
CREATE TYPE "AnimalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DECEASED', 'SOLD');

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'FARMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Farm" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationLabel" TEXT,
    "preferredUnits" TEXT NOT NULL DEFAULT 'METRIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FarmMembership" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "FarmMembershipRole" NOT NULL DEFAULT 'OWNER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FarmMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Animal" (
    "id" TEXT NOT NULL,
    "farmId" TEXT NOT NULL,
    "internalCode" TEXT NOT NULL,
    "earTag" TEXT,
    "name" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "sex" "AnimalSex" NOT NULL,
    "purpose" "AnimalPurpose" NOT NULL,
    "birthDate" DATE,
    "estimatedAgeMonths" INTEGER,
    "status" "AnimalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Animal_age_source_check" CHECK (
        ("birthDate" IS NOT NULL AND "estimatedAgeMonths" IS NULL)
        OR ("birthDate" IS NULL AND "estimatedAgeMonths" IS NOT NULL)
    ),
    CONSTRAINT "Animal_estimated_age_check" CHECK (
        "estimatedAgeMonths" IS NULL OR "estimatedAgeMonths" BETWEEN 0 AND 600
    )
);

CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changeSummary" JSONB,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "FarmMembership_farmId_userId_key" ON "FarmMembership"("farmId", "userId");
CREATE INDEX "FarmMembership_userId_status_idx" ON "FarmMembership"("userId", "status");
CREATE UNIQUE INDEX "Animal_farmId_internalCode_key" ON "Animal"("farmId", "internalCode");
CREATE UNIQUE INDEX "Animal_farmId_earTag_key" ON "Animal"("farmId", "earTag");
CREATE INDEX "Animal_farmId_name_idx" ON "Animal"("farmId", "name");
CREATE INDEX "Animal_farmId_createdAt_idx" ON "Animal"("farmId", "createdAt");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_userId_expiresAt_idx" ON "Session"("userId", "expiresAt");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE INDEX "AuditLog_entityType_entityId_occurredAt_idx" ON "AuditLog"("entityType", "entityId", "occurredAt");
CREATE INDEX "AuditLog_actorUserId_occurredAt_idx" ON "AuditLog"("actorUserId", "occurredAt");

ALTER TABLE "FarmMembership" ADD CONSTRAINT "FarmMembership_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FarmMembership" ADD CONSTRAINT "FarmMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Animal" ADD CONSTRAINT "Animal_farmId_fkey"
    FOREIGN KEY ("farmId") REFERENCES "Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
