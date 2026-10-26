import {
  ExtensionCategory,
  ExtensionStatus,
  FollowUpStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireFarmMembership } from "./access.js";
import { requireRole, requireUser } from "./auth.js";
import { prisma } from "./db.js";
import { asyncRoute, HttpError } from "./http.js";
import {
  createCareRecordSchema,
  createHealthEventSchema,
  createProfessionalAssessmentSchema,
  updateFollowUpStatusSchema,
  updateProfessionalAssessmentSchema,
} from "./phase2-schemas.js";

export const phase2Router = Router();

const idSchema = z.string().cuid();
const farmerRoles = [UserRole.FARMER, UserRole.FARM_WORKER];

const healthEventInclude = {
  recordedBy: { select: { id: true, fullName: true, role: true } },
  assessments: {
    orderBy: { recordedAt: "desc" as const },
    include: { professional: { select: { id: true, fullName: true } } },
  },
} satisfies Prisma.HealthEventInclude;

async function findAnimal(animalId: string) {
  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    select: {
      id: true,
      farmId: true,
      name: true,
      internalCode: true,
      earTag: true,
      purpose: true,
    },
  });
  if (!animal) throw new HttpError(404, "ANIMAL_NOT_FOUND", "Animal not found.");
  return animal;
}

async function requireProfessionalHealthAccess(
  animalId: string,
  professionalUserId: string,
  requireOpenRequest = false,
) {
  const professional = await prisma.user.findFirst({
    where: {
      id: professionalUserId,
      role: UserRole.PROFESSIONAL,
      status: "ACTIVE",
      professionalProfile: { isNot: null },
    },
    select: { id: true },
  });
  const assignedRequest = await prisma.extensionRequest.findFirst({
    where: {
      animalId,
      assignedProfessionalId: professionalUserId,
      category: ExtensionCategory.HEALTH,
      ...(requireOpenRequest
        ? { status: { in: [ExtensionStatus.OPEN, ExtensionStatus.ACKNOWLEDGED, ExtensionStatus.IN_PROGRESS] } }
        : {}),
    },
    select: { id: true },
  });
  if (!professional || !assignedRequest) {
    throw new HttpError(404, "ANIMAL_NOT_FOUND", "Animal not found.");
  }
}

async function requireAnimalHealthReadAccess(animalId: string, userId: string, role: UserRole) {
  const animal = await findAnimal(animalId);
  if (role === UserRole.FARMER || role === UserRole.FARM_WORKER) {
    await requireFarmMembershipForUser(userId, animal.farmId);
  } else if (role === UserRole.PROFESSIONAL) {
    await requireProfessionalHealthAccess(animalId, userId);
  } else {
    throw new HttpError(404, "ANIMAL_NOT_FOUND", "Animal not found.");
  }
  return animal;
}

async function requireFarmMembershipForUser(userId: string, farmId: string) {
  const membership = await prisma.farmMembership.findUnique({
    where: { farmId_userId: { farmId, userId } },
    select: { id: true, status: true },
  });
  if (!membership || membership.status !== "ACTIVE") {
    throw new HttpError(404, "ANIMAL_NOT_FOUND", "Animal not found.");
  }
}

function ensureFollowUpDate(followUpDate: string | null | undefined, earliestDate: string) {
  if (followUpDate && followUpDate < earliestDate) {
    throw new HttpError(400, "INVALID_FOLLOW_UP_DATE", "Follow-up date cannot be before the recorded event.");
  }
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

phase2Router.get(
  "/animals/:animalId/health-events",
  asyncRoute(async (request, response) => {
    const animalId = idSchema.parse(request.params.animalId);
    const user = requireUser(request);
    await requireAnimalHealthReadAccess(animalId, user.id, user.role);
    const events = await prisma.healthEvent.findMany({
      where: { animalId },
      orderBy: [{ observedAt: "desc" }, { id: "asc" }],
      take: 100,
      include: healthEventInclude,
    });
    response.json({ data: { events } });
  }),
);

phase2Router.post(
  "/animals/:animalId/health-events",
  asyncRoute(async (request, response) => {
    const animalId = idSchema.parse(request.params.animalId);
    const user = requireRole(request, farmerRoles);
    const animal = await findAnimal(animalId);
    await requireFarmMembership(request, animal.farmId);
    const input = createHealthEventSchema.parse(request.body);
    const observedAt = new Date(input.observedAt);
    if (observedAt > new Date()) {
      throw new HttpError(400, "INVALID_OBSERVED_AT", "Observation time cannot be in the future.");
    }
    ensureFollowUpDate(input.followUpDate, dateOnly(observedAt));

    const event = await prisma.$transaction(async (transaction) => {
      const created = await transaction.healthEvent.create({
        data: {
          animalId,
          recordedById: user.id,
          observedAt,
          symptoms: input.symptoms,
          severityObserved: input.severityObserved,
          notes: input.notes ?? null,
          followUpDate: input.followUpDate ? new Date(`${input.followUpDate}T00:00:00.000Z`) : null,
          followUpStatus: input.followUpDate ? FollowUpStatus.PENDING : FollowUpStatus.NOT_REQUIRED,
        },
        include: healthEventInclude,
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "HealthEvent",
          entityId: created.id,
          action: "OBSERVATION_RECORDED",
          changeSummary: { animalId, severityObserved: created.severityObserved },
        },
      });
      return created;
    });
    response.status(201).json({ data: { event } });
  }),
);

phase2Router.patch(
  "/health-events/:eventId/follow-up",
  asyncRoute(async (request, response) => {
    const eventId = idSchema.parse(request.params.eventId);
    const user = requireRole(request, farmerRoles);
    const input = updateFollowUpStatusSchema.parse(request.body);
    const current = await prisma.healthEvent.findUnique({
      where: { id: eventId },
      select: { id: true, animal: { select: { farmId: true } }, followUpDate: true, followUpStatus: true },
    });
    if (!current) throw new HttpError(404, "HEALTH_EVENT_NOT_FOUND", "Health observation not found.");
    await requireFarmMembership(request, current.animal.farmId);
    if (!current.followUpDate) {
      throw new HttpError(400, "FOLLOW_UP_NOT_SCHEDULED", "This observation has no scheduled follow-up.");
    }
    const event = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.healthEvent.update({
        where: { id: eventId },
        data: { followUpStatus: input.followUpStatus },
        include: healthEventInclude,
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "HealthEvent",
          entityId: eventId,
          action: "FOLLOW_UP_STATUS_UPDATED",
          changeSummary: { from: current.followUpStatus, to: input.followUpStatus },
        },
      });
      return updated;
    });
    response.json({ data: { event } });
  }),
);

phase2Router.post(
  "/health-events/:eventId/assessments",
  asyncRoute(async (request, response) => {
    const eventId = idSchema.parse(request.params.eventId);
    const user = requireRole(request, [UserRole.PROFESSIONAL]);
    const input = createProfessionalAssessmentSchema.parse({
      ...request.body,
      healthEventId: eventId,
    });
    const healthEvent = await prisma.healthEvent.findUnique({
      where: { id: eventId },
      select: { id: true, animalId: true, observedAt: true },
    });
    if (!healthEvent) throw new HttpError(404, "HEALTH_EVENT_NOT_FOUND", "Health observation not found.");
    await requireProfessionalHealthAccess(healthEvent.animalId, user.id, true);
    ensureFollowUpDate(input.followUpDate, dateOnly(new Date()));
    const assessment = await prisma.$transaction(async (transaction) => {
      const created = await transaction.professionalAssessment.create({
        data: {
          healthEventId: eventId,
          professionalUserId: user.id,
          assessment: input.assessment,
          diagnosisIfMade: input.diagnosisIfMade ?? null,
          followUpDate: input.followUpDate ? new Date(`${input.followUpDate}T00:00:00.000Z`) : null,
          followUpStatus: input.followUpDate ? FollowUpStatus.PENDING : FollowUpStatus.NOT_REQUIRED,
        },
        include: { professional: { select: { id: true, fullName: true } } },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "ProfessionalAssessment",
          entityId: created.id,
          action: "ASSESSMENT_RECORDED",
          changeSummary: { healthEventId: eventId, hasDiagnosis: Boolean(created.diagnosisIfMade) },
        },
      });
      return created;
    });
    response.status(201).json({ data: { assessment } });
  }),
);

phase2Router.patch(
  "/professional-assessments/:assessmentId/follow-up",
  asyncRoute(async (request, response) => {
    const assessmentId = idSchema.parse(request.params.assessmentId);
    const user = requireUser(request);
    const input = updateProfessionalAssessmentSchema.parse(request.body);
    const current = await prisma.professionalAssessment.findUnique({
      where: { id: assessmentId },
      select: { id: true, professionalUserId: true, followUpDate: true, followUpStatus: true, healthEvent: { select: { animalId: true } } },
    });
    if (!current) {
      throw new HttpError(404, "ASSESSMENT_NOT_FOUND", "Professional assessment not found.");
    }
    if (user.role === UserRole.PROFESSIONAL) {
      if (current.professionalUserId !== user.id) {
        throw new HttpError(404, "ASSESSMENT_NOT_FOUND", "Professional assessment not found.");
      }
      await requireProfessionalHealthAccess(current.healthEvent.animalId, user.id);
    } else if (user.role === UserRole.FARMER || user.role === UserRole.FARM_WORKER) {
      const animal = await findAnimal(current.healthEvent.animalId);
      await requireFarmMembership(request, animal.farmId);
    } else {
      throw new HttpError(404, "ASSESSMENT_NOT_FOUND", "Professional assessment not found.");
    }
    if (!current.followUpDate) {
      throw new HttpError(400, "FOLLOW_UP_NOT_SCHEDULED", "This assessment has no scheduled follow-up.");
    }
    const assessment = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.professionalAssessment.update({
        where: { id: assessmentId },
        data: { followUpStatus: input.followUpStatus },
        include: { professional: { select: { id: true, fullName: true } } },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "ProfessionalAssessment",
          entityId: assessmentId,
          action: "FOLLOW_UP_STATUS_UPDATED",
          changeSummary: { from: current.followUpStatus, to: input.followUpStatus },
        },
      });
      return updated;
    });
    response.json({ data: { assessment } });
  }),
);

phase2Router.get(
  "/animals/:animalId/care-records",
  asyncRoute(async (request, response) => {
    const animalId = idSchema.parse(request.params.animalId);
    const user = requireUser(request);
    await requireAnimalHealthReadAccess(animalId, user.id, user.role);
    const records = await prisma.careRecord.findMany({
      where: { animalId },
      orderBy: [{ startDate: "desc" }, { id: "asc" }],
      take: 100,
      include: { recordedBy: { select: { id: true, fullName: true, role: true } } },
    });
    response.json({ data: { records } });
  }),
);

phase2Router.post(
  "/animals/:animalId/care-records",
  asyncRoute(async (request, response) => {
    const animalId = idSchema.parse(request.params.animalId);
    const user = requireRole(request, farmerRoles);
    const animal = await findAnimal(animalId);
    await requireFarmMembership(request, animal.farmId);
    const input = createCareRecordSchema.parse(request.body);
    ensureFollowUpDate(input.followUpDate, input.endDate ?? input.startDate);
    const record = await prisma.$transaction(async (transaction) => {
      const created = await transaction.careRecord.create({
        data: {
          animalId,
          recordedById: user.id,
          category: input.category,
          details: input.details,
          startDate: new Date(`${input.startDate}T00:00:00.000Z`),
          endDate: input.endDate ? new Date(`${input.endDate}T00:00:00.000Z`) : null,
          followUpDate: input.followUpDate ? new Date(`${input.followUpDate}T00:00:00.000Z`) : null,
          followUpStatus: input.followUpDate ? FollowUpStatus.PENDING : FollowUpStatus.NOT_REQUIRED,
        },
        include: { recordedBy: { select: { id: true, fullName: true, role: true } } },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "CareRecord",
          entityId: created.id,
          action: "CARE_RECORDED",
          changeSummary: { animalId, category: created.category },
        },
      });
      return created;
    });
    response.status(201).json({ data: { record } });
  }),
);

phase2Router.patch(
  "/care-records/:recordId/follow-up",
  asyncRoute(async (request, response) => {
    const recordId = idSchema.parse(request.params.recordId);
    const user = requireRole(request, farmerRoles);
    const input = updateFollowUpStatusSchema.parse(request.body);
    const current = await prisma.careRecord.findUnique({
      where: { id: recordId },
      select: { id: true, followUpDate: true, followUpStatus: true, animal: { select: { farmId: true } } },
    });
    if (!current) throw new HttpError(404, "CARE_RECORD_NOT_FOUND", "Care record not found.");
    await requireFarmMembership(request, current.animal.farmId);
    if (!current.followUpDate) {
      throw new HttpError(400, "FOLLOW_UP_NOT_SCHEDULED", "This care record has no scheduled follow-up.");
    }
    const record = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.careRecord.update({
        where: { id: recordId },
        data: { followUpStatus: input.followUpStatus },
        include: { recordedBy: { select: { id: true, fullName: true, role: true } } },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "CareRecord",
          entityId: recordId,
          action: "FOLLOW_UP_STATUS_UPDATED",
          changeSummary: { from: current.followUpStatus, to: input.followUpStatus },
        },
      });
      return updated;
    });
    response.json({ data: { record } });
  }),
);

phase2Router.get(
  "/animals/:animalId/history",
  asyncRoute(async (request, response) => {
    const animalId = idSchema.parse(request.params.animalId);
    const user = requireUser(request);
    const animal = await requireAnimalHealthReadAccess(animalId, user.id, user.role);
    const [healthEvents, careRecords, feedRecords] = await Promise.all([
      prisma.healthEvent.findMany({
        where: { animalId },
        orderBy: [{ observedAt: "desc" }, { id: "asc" }],
        take: 100,
        include: healthEventInclude,
      }),
      prisma.careRecord.findMany({
        where: { animalId },
        orderBy: [{ startDate: "desc" }, { id: "asc" }],
        take: 100,
        include: { recordedBy: { select: { id: true, fullName: true, role: true } } },
      }),
      prisma.feedRecord.findMany({
        where: { animalId },
        orderBy: [{ recordedAt: "desc" }, { id: "asc" }],
        take: 100,
        select: {
          id: true,
          feedName: true,
          quantity: true,
          unit: true,
          unitLabel: true,
          recordedAt: true,
          notes: true,
          recordedBy: { select: { id: true, fullName: true } },
        },
      }),
    ]);
    response.json({ data: { animal, healthEvents, careRecords, feedRecords } });
  }),
);

phase2Router.get(
  "/farms/:farmId/summary",
  asyncRoute(async (request, response) => {
    const farmId = idSchema.parse(request.params.farmId);
    await requireFarmMembership(request, farmId);
    const today = new Date(`${dateOnly(new Date())}T00:00:00.000Z`);
    const [animalCount, purposeCounts, recentConcerns, dueHealthFollowUps, dueAssessmentFollowUps, dueCareFollowUps, openExtensionRequests, pendingHealthFollowUps, pendingCareFollowUps, pendingAssessmentFollowUps] = await Promise.all([
      prisma.animal.count({ where: { farmId } }),
      prisma.animal.groupBy({ by: ["purpose"], where: { farmId }, _count: { _all: true } }),
      prisma.healthEvent.findMany({
        where: { animal: { farmId } },
        orderBy: [{ observedAt: "desc" }, { id: "asc" }],
        take: 5,
        include: {
          animal: { select: { id: true, name: true, internalCode: true, earTag: true } },
          recordedBy: { select: { id: true, fullName: true, role: true } },
          assessments: {
            orderBy: { recordedAt: "desc" },
            take: 1,
            include: { professional: { select: { id: true, fullName: true } } },
          },
        },
      }),
      prisma.healthEvent.count({
        where: { animal: { farmId }, followUpStatus: "PENDING", followUpDate: { lte: today } },
      }),
      prisma.professionalAssessment.count({
        where: { followUpStatus: "PENDING", followUpDate: { lte: today }, healthEvent: { animal: { farmId } } },
      }),
      prisma.careRecord.count({
        where: { animal: { farmId }, followUpStatus: "PENDING", followUpDate: { lte: today } },
      }),
      prisma.extensionRequest.count({ where: { farmId, status: { in: ["OPEN", "ACKNOWLEDGED", "IN_PROGRESS"] } } }),
      prisma.healthEvent.findMany({
        where: {
          animal: { farmId },
          followUpStatus: "PENDING",
          followUpDate: { not: null },
        },
        orderBy: [{ followUpDate: "asc" }, { id: "asc" }],
        take: 7,
        select: {
          id: true,
          symptoms: true,
          followUpDate: true,
          animal: { select: { id: true, name: true, internalCode: true } },
        },
      }),
      prisma.careRecord.findMany({
        where: { animal: { farmId }, followUpStatus: "PENDING", followUpDate: { not: null } },
        orderBy: [{ followUpDate: "asc" }, { id: "asc" }],
        take: 7,
        select: {
          id: true,
          category: true,
          followUpDate: true,
          animal: { select: { id: true, name: true, internalCode: true } },
        },
      }),
      prisma.professionalAssessment.findMany({
        where: {
          followUpStatus: "PENDING",
          followUpDate: { not: null },
          healthEvent: { animal: { farmId } },
        },
        orderBy: [{ followUpDate: "asc" }, { id: "asc" }],
        take: 7,
        select: {
          id: true,
          assessment: true,
          followUpDate: true,
          healthEvent: { select: { animal: { select: { id: true, name: true, internalCode: true } } } },
        },
      }),
    ]);
    const pendingFollowUps = [
      ...pendingHealthFollowUps.flatMap((item) => item.followUpDate ? [{
        id: item.id,
        type: "HEALTH_EVENT" as const,
        label: item.symptoms,
        followUpDate: item.followUpDate,
        animal: item.animal,
      }] : []),
      ...pendingCareFollowUps.flatMap((item) => item.followUpDate ? [{
        id: item.id,
        type: "CARE_RECORD" as const,
        label: item.category.replaceAll("_", " ").toLowerCase(),
        followUpDate: item.followUpDate,
        animal: item.animal,
      }] : []),
      ...pendingAssessmentFollowUps.flatMap((item) => item.followUpDate ? [{
        id: item.id,
        type: "PROFESSIONAL_ASSESSMENT" as const,
        label: item.assessment,
        followUpDate: item.followUpDate,
        animal: item.healthEvent.animal,
      }] : []),
    ].sort((first, second) => first.followUpDate.getTime() - second.followUpDate.getTime()).slice(0, 7);
    response.json({
      data: {
        summary: {
          animals: animalCount,
          beef: purposeCounts.find((item) => item.purpose === "BEEF")?._count._all ?? 0,
          dairy: purposeCounts.find((item) => item.purpose === "DAIRY")?._count._all ?? 0,
          recentConcerns,
          dueFollowUps: dueHealthFollowUps + dueAssessmentFollowUps + dueCareFollowUps,
          openExtensionRequests,
          pendingFollowUps,
        },
      },
    });
  }),
);
