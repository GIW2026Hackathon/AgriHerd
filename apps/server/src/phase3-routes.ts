import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import {
  ExtensionStatus,
  GuidanceStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import { Router, type Request } from "express";
import { z } from "zod";
import { requireFarmMembership } from "./access.js";
import { requireRole, requireUser } from "./auth.js";
import { prisma } from "./db.js";
import { asyncRoute, HttpError } from "./http.js";
import {
  createExtensionInteractionSchema,
  createExtensionRequestSchema,
  createFeedRecordSchema,
  createNutritionResourceSchema,
  createProfessionalSchema,
  feedRecordQuerySchema,
  isValidStatusTransition,
  updateExtensionRequestSchema,
  updateNutritionResourceSchema,
  updateProfessionalProfileSchema,
} from "./phase3-schemas.js";

export const phase3Router = Router();

const farmIdSchema = z.string().cuid();
const animalIdSchema = z.string().cuid();
const resourceIdSchema = z.string().cuid();
const requestIdSchema = z.string().cuid();

const requestSummary = {
  id: true,
  reference: true,
  category: true,
  description: true,
  urgency: true,
  contactMethod: true,
  preferredContactValue: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  farm: { select: { id: true, name: true, locationLabel: true } },
  animal: { select: { id: true, name: true, internalCode: true, earTag: true, purpose: true } },
  submittedBy: { select: { id: true, fullName: true } },
  assignedProfessional: {
    select: {
      id: true,
      fullName: true,
      professionalProfile: {
        select: { qualifications: true, serviceArea: true, publicEmail: true, publicPhone: true },
      },
    },
  },
  interactions: {
    orderBy: { interactionDate: "desc" },
    select: {
      id: true,
      interactionDate: true,
      advice: true,
      followUpDate: true,
      outcome: true,
      professional: { select: { id: true, fullName: true } },
    },
  },
} satisfies Prisma.ExtensionRequestSelect;

type RequestSummary = Prisma.ExtensionRequestGetPayload<{ select: typeof requestSummary }>;

async function requireAccessibleRequest(
  request: Request,
  requestId: string,
  userId: string,
  role: UserRole,
) {
  const extensionRequest = await prisma.extensionRequest.findUnique({
    where: { id: requestId },
    select: { id: true, farmId: true, assignedProfessionalId: true },
  });
  if (!extensionRequest) {
    throw new HttpError(404, "REQUEST_NOT_FOUND", "Extension request not found.");
  }

  if (role === UserRole.PROFESSIONAL) {
    if (extensionRequest.assignedProfessionalId !== userId) {
      throw new HttpError(404, "REQUEST_NOT_FOUND", "Extension request not found.");
    }
    return extensionRequest;
  }

  await requireFarmMembership(request, extensionRequest.farmId);
  return extensionRequest;
}

function assertReviewDate(reviewDate: Date | null | undefined) {
  if (reviewDate && reviewDate > new Date(new Date().toISOString().slice(0, 10))) {
    throw new HttpError(400, "INVALID_REVIEW_DATE", "Review date cannot be in the future.");
  }
}

async function requireVerifiedProfessional(professionalUserId: string) {
  const professional = await prisma.user.findFirst({
    where: {
      id: professionalUserId,
      role: UserRole.PROFESSIONAL,
      status: "ACTIVE",
      professionalProfile: { isNot: null },
    },
    select: {
      id: true,
      professionalProfile: { select: { verifiedAt: true, isListed: true } },
    },
  });
  if (!professional?.professionalProfile) {
    throw new HttpError(400, "INVALID_PROFESSIONAL", "Choose an active, verified livestock professional.");
  }
  return professional;
}

function assertRequestStatusTransition(current: ExtensionStatus, next: ExtensionStatus) {
  if (!isValidStatusTransition(current, next)) {
    throw new HttpError(
      409,
      "INVALID_STATUS_TRANSITION",
      `A request cannot move from ${current.toLowerCase().replace("_", " ")} to ${next.toLowerCase().replace("_", " ")}.`,
    );
  }
}

function serializeRequestSummary(item: RequestSummary, viewerId: string, viewerRole: UserRole) {
  const canViewContact = (viewerRole === UserRole.PROFESSIONAL
    && item.assignedProfessional.id === viewerId)
    || item.submittedBy.id === viewerId;
  return {
    ...item,
    ...(canViewContact ? {} : { preferredContactValue: null }),
    assignedProfessional: item.assignedProfessional
      ? {
          id: item.assignedProfessional.id,
          fullName: item.assignedProfessional.fullName,
          profile: item.assignedProfessional.professionalProfile,
        }
      : null,
  };
}

phase3Router.get(
  "/professionals",
  asyncRoute(async (request, response) => {
    requireUser(request);
    const professionals = await prisma.professionalProfile.findMany({
      where: { isListed: true, user: { status: "ACTIVE" } },
      orderBy: [{ serviceArea: "asc" }, { user: { fullName: "asc" } }],
      select: {
        userId: true,
        qualifications: true,
        serviceArea: true,
        publicEmail: true,
        publicPhone: true,
        user: { select: { fullName: true } },
      },
    });
    response.json({
      data: {
        professionals: professionals.map(({ userId, user, ...profile }) => ({
          id: userId,
          fullName: user.fullName,
          ...profile,
        })),
      },
    });
  }),
);

phase3Router.post(
  "/admin/professionals",
  asyncRoute(async (request, response) => {
    const admin = requireRole(request, [UserRole.ADMIN]);
    const input = createProfessionalSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    try {
      const professional = await prisma.$transaction(async (transaction) => {
        const user = await transaction.user.create({
          data: {
            fullName: input.fullName,
            email: input.email,
            passwordHash,
            role: UserRole.PROFESSIONAL,
            mustChangePassword: true,
            professionalProfile: {
              create: {
                qualifications: input.qualifications,
                serviceArea: input.serviceArea,
                publicEmail: input.publicEmail ?? null,
                publicPhone: input.publicPhone ?? null,
                isListed: false,
                verifiedAt: new Date(),
              },
            },
          },
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            professionalProfile: true,
          },
        });
        await transaction.auditLog.create({
          data: {
            actorUserId: admin.id,
            entityType: "ProfessionalProfile",
            entityId: user.id,
            action: "PROVISIONED_AND_VERIFIED",
            changeSummary: { serviceArea: input.serviceArea },
          },
        });
        return user;
      });
      response.status(201).json({ data: { professional } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
      }
      throw error;
    }
  }),
);

phase3Router.get(
  "/admin/professionals",
  asyncRoute(async (request, response) => {
    requireRole(request, [UserRole.ADMIN]);
    const professionals = await prisma.professionalProfile.findMany({
      orderBy: [{ serviceArea: "asc" }, { user: { fullName: "asc" } }],
      select: {
        userId: true,
        qualifications: true,
        serviceArea: true,
        publicEmail: true,
        publicPhone: true,
        isListed: true,
        verifiedAt: true,
        user: { select: { fullName: true, email: true, status: true } },
      },
    });
    response.json({
      data: {
        professionals: professionals.map(({ userId, user, ...profile }) => ({
          id: userId,
          fullName: user.fullName,
          email: user.email,
          accountStatus: user.status,
          ...profile,
        })),
      },
    });
  }),
);

phase3Router.patch(
  "/professionals/me",
  asyncRoute(async (request, response) => {
    const user = requireRole(request, [UserRole.PROFESSIONAL]);
    const input = updateProfessionalProfileSchema.parse(request.body);
    const profile = await prisma.professionalProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      throw new HttpError(403, "PROFILE_NOT_VERIFIED", "Your professional profile has not been verified.");
    }
    const nextPublicEmail = input.publicEmail === undefined ? profile.publicEmail : input.publicEmail;
    const nextPublicPhone = input.publicPhone === undefined ? profile.publicPhone : input.publicPhone;
    const willBeListed = input.isListed ?? profile.isListed;
    if (willBeListed && !nextPublicEmail && !nextPublicPhone) {
      throw new HttpError(
        400,
        "PUBLIC_CONTACT_REQUIRED",
        "Add a public email or phone number before listing your professional profile.",
      );
    }
    const updatedProfile = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.professionalProfile.update({
        where: { id: profile.id },
        data: input,
        select: {
          qualifications: true,
          serviceArea: true,
          publicEmail: true,
          publicPhone: true,
          isListed: true,
          verifiedAt: true,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "ProfessionalProfile",
          entityId: profile.id,
          action: "UPDATED",
          changeSummary: { listed: updated.isListed },
        },
      });
      return updated;
    });
    response.json({ data: { profile: updatedProfile } });
  }),
);

phase3Router.get(
  "/professionals/me",
  asyncRoute(async (request, response) => {
    const user = requireRole(request, [UserRole.PROFESSIONAL]);
    const profile = await prisma.professionalProfile.findUnique({
      where: { userId: user.id },
      select: {
        qualifications: true,
        serviceArea: true,
        publicEmail: true,
        publicPhone: true,
        isListed: true,
        verifiedAt: true,
      },
    });
    if (!profile) {
      throw new HttpError(403, "PROFILE_NOT_VERIFIED", "Your professional profile has not been verified.");
    }
    response.json({ data: { profile } });
  }),
);

phase3Router.get(
  "/farms/:farmId/feed-records",
  asyncRoute(async (request, response) => {
    const farmId = farmIdSchema.parse(request.params.farmId);
    await requireFarmMembership(request, farmId);
    const query = feedRecordQuerySchema.parse(request.query);
    if (query.animalId) {
      const animal = await prisma.animal.findUnique({ where: { id: query.animalId }, select: { farmId: true } });
      if (!animal || animal.farmId !== farmId) {
        throw new HttpError(404, "ANIMAL_NOT_FOUND", "Animal not found on this farm.");
      }
    }
    const records = await prisma.feedRecord.findMany({
      where: { farmId, ...(query.animalId ? { animalId: query.animalId } : {}) },
      orderBy: [{ recordedAt: "desc" }, { id: "asc" }],
      take: 100,
      include: {
        animal: { select: { id: true, name: true, internalCode: true } },
        recordedBy: { select: { id: true, fullName: true } },
      },
    });
    response.json({ data: { records } });
  }),
);

phase3Router.post(
  "/farms/:farmId/feed-records",
  asyncRoute(async (request, response) => {
    const farmId = farmIdSchema.parse(request.params.farmId);
    const user = requireUser(request);
    if (user.role !== UserRole.FARMER && user.role !== UserRole.FARM_WORKER) {
      throw new HttpError(403, "FORBIDDEN", "Only farm members can record feed usage.");
    }
    await requireFarmMembership(request, farmId);
    const input = createFeedRecordSchema.parse(request.body);
    if (input.animalId) {
      const animal = await prisma.animal.findUnique({ where: { id: input.animalId }, select: { farmId: true } });
      if (!animal || animal.farmId !== farmId) {
        throw new HttpError(404, "ANIMAL_NOT_FOUND", "Animal not found on this farm.");
      }
    }
    const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();
    if (recordedAt > new Date()) {
      throw new HttpError(400, "INVALID_RECORD_DATE", "Feed record date cannot be in the future.");
    }
    const record = await prisma.$transaction(async (transaction) => {
      const created = await transaction.feedRecord.create({
        data: {
          farmId,
          animalId: input.animalId ?? null,
          recordedById: user.id,
          feedName: input.feedName,
          quantity: new Prisma.Decimal(input.quantity),
          unit: input.unit,
          unitLabel: input.unit === "OTHER" ? input.unitLabel : null,
          recordedAt,
          notes: input.notes ?? null,
        },
        include: {
          animal: { select: { id: true, name: true, internalCode: true } },
          recordedBy: { select: { id: true, fullName: true } },
        },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "FeedRecord",
          entityId: created.id,
          action: "CREATED",
          changeSummary: {
            farmId,
            animalId: created.animalId,
            feedName: created.feedName,
            quantity: created.quantity.toString(),
            unit: created.unit,
            unitLabel: created.unitLabel,
          },
        },
      });
      return created;
    });
    response.status(201).json({ data: { record } });
  }),
);

phase3Router.get(
  "/animals/:animalId/feed-records",
  asyncRoute(async (request, response) => {
    const animalId = animalIdSchema.parse(request.params.animalId);
    const animal = await prisma.animal.findUnique({ where: { id: animalId }, select: { id: true, farmId: true } });
    if (!animal) throw new HttpError(404, "ANIMAL_NOT_FOUND", "Animal not found.");
    await requireFarmMembership(request, animal.farmId);
    const records = await prisma.feedRecord.findMany({
      where: { animalId },
      orderBy: [{ recordedAt: "desc" }, { id: "asc" }],
      take: 100,
      include: { recordedBy: { select: { id: true, fullName: true } } },
    });
    response.json({ data: { records } });
  }),
);

phase3Router.get(
  "/nutrition-guidance",
  asyncRoute(async (request, response) => {
    requireUser(request);
    const query = z.object({ scope: z.enum(["DAIRY", "BEEF"]).optional() }).parse(request.query);
    const resources = await prisma.nutritionResource.findMany({
      where: {
        status: GuidanceStatus.PUBLISHED,
        ...(query.scope
          ? { scope: { in: ["ALL_CATTLE", query.scope] } }
          : {}),
      },
      orderBy: [{ reviewDate: "desc" }, { title: "asc" }],
      select: {
        id: true,
        title: true,
        content: true,
        scope: true,
        source: true,
        sourceUrl: true,
        reviewDate: true,
        reviewedBy: { select: { id: true, fullName: true } },
      },
    });
    response.json({ data: { resources } });
  }),
);

phase3Router.get(
  "/nutrition-guidance/manage",
  asyncRoute(async (request, response) => {
    const user = requireRole(request, [UserRole.PROFESSIONAL, UserRole.ADMIN]);
    const resources = await prisma.nutritionResource.findMany({
      where: user.role === UserRole.ADMIN ? {} : { createdById: user.id },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        reviewedBy: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true, role: true } },
      },
    });
    response.json({ data: { resources } });
  }),
);

phase3Router.post(
  "/nutrition-guidance",
  asyncRoute(async (request, response) => {
    const author = requireRole(request, [UserRole.PROFESSIONAL, UserRole.ADMIN]);
    const input = createNutritionResourceSchema.parse(request.body);
    const resource = await prisma.$transaction(async (transaction) => {
      const created = await transaction.nutritionResource.create({
        data: {
          title: input.title,
          content: input.content,
          scope: input.scope,
          source: input.source || null,
          sourceUrl: input.sourceUrl || null,
          createdById: author.id,
          status: GuidanceStatus.DRAFT,
        },
        include: { createdBy: { select: { id: true, fullName: true, role: true } } },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: author.id,
          entityType: "NutritionResource",
          entityId: created.id,
          action: "DRAFT_CREATED",
          changeSummary: { scope: created.scope },
        },
      });
      return created;
    });
    response.status(201).json({ data: { resource } });
  }),
);

phase3Router.patch(
  "/nutrition-guidance/:resourceId",
  asyncRoute(async (request, response) => {
    const editor = requireRole(request, [UserRole.PROFESSIONAL, UserRole.ADMIN]);
    const resourceId = resourceIdSchema.parse(request.params.resourceId);
    const input = updateNutritionResourceSchema.parse(request.body);
    const existing = await prisma.nutritionResource.findUnique({ where: { id: resourceId } });
    if (!existing) throw new HttpError(404, "GUIDANCE_NOT_FOUND", "Nutrition resource not found.");
    if (editor.role === UserRole.PROFESSIONAL
      && (existing.createdById !== editor.id || existing.status !== GuidanceStatus.DRAFT)) {
      throw new HttpError(403, "FORBIDDEN", "Professionals may edit only their own draft resources.");
    }

    const nextStatus = input.status ?? existing.status;
    const nextSource = input.source === undefined ? existing.source : input.source;
    const nextReviewedById = input.reviewedById === undefined ? existing.reviewedById : input.reviewedById;
    const nextReviewDate = input.reviewDate === undefined
      ? existing.reviewDate
      : input.reviewDate
        ? new Date(`${input.reviewDate}T00:00:00.000Z`)
        : null;
    if (nextStatus === GuidanceStatus.PUBLISHED) {
      if (editor.role !== UserRole.ADMIN) {
        throw new HttpError(403, "ADMIN_REVIEW_REQUIRED", "Only an administrator can publish reviewed nutrition guidance.");
      }
      const guidanceContentChanged = [
        "title",
        "content",
        "scope",
        "source",
        "sourceUrl",
      ].some((field) => Object.hasOwn(input, field));
      if (guidanceContentChanged
        && (input.reviewedById === undefined || input.reviewDate === undefined)) {
        throw new HttpError(
          400,
          "REVIEW_REQUIRED",
          "Content changes require a new professional reviewer and review date before publication.",
        );
      }
      if (!nextSource?.trim() || !nextReviewedById || !nextReviewDate) {
        throw new HttpError(
          400,
          "REVIEW_REQUIRED",
          "Publishing requires a named source, review date, and verified professional reviewer.",
        );
      }
      assertReviewDate(nextReviewDate);
      await requireVerifiedProfessional(nextReviewedById);
    }

    const updateData: Prisma.NutritionResourceUpdateManyMutationInput = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.scope !== undefined ? { scope: input.scope } : {}),
      ...(input.source !== undefined ? { source: input.source || null } : {}),
      ...(input.sourceUrl !== undefined ? { sourceUrl: input.sourceUrl || null } : {}),
      ...(input.reviewedById !== undefined
        ? { reviewedById: input.reviewedById }
        : {}),
      ...(input.reviewDate !== undefined ? { reviewDate: nextReviewDate } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    };

    const resource = await prisma.$transaction(async (transaction) => {
      const changed = await transaction.nutritionResource.updateMany({
        where: { id: resourceId, updatedAt: existing.updatedAt },
        data: updateData,
      });
      if (changed.count !== 1) {
        throw new HttpError(409, "GUIDANCE_CHANGED", "This resource changed while you were reviewing it. Reload and try again.");
      }
      const updated = await transaction.nutritionResource.findUniqueOrThrow({
        where: { id: resourceId },
        include: {
          reviewedBy: { select: { id: true, fullName: true } },
          createdBy: { select: { id: true, fullName: true, role: true } },
        },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: editor.id,
          entityType: "NutritionResource",
          entityId: resourceId,
          action: nextStatus === GuidanceStatus.PUBLISHED ? "REVIEWED_AND_PUBLISHED" : "UPDATED",
          changeSummary: { changedFields: Object.keys(input), status: nextStatus },
        },
      });
      return updated;
    });
    response.json({ data: { resource } });
  }),
);

phase3Router.post(
  "/farms/:farmId/extension-requests",
  asyncRoute(async (request, response) => {
    const user = requireRole(request, [UserRole.FARMER]);
    const farmId = farmIdSchema.parse(request.params.farmId);
    await requireFarmMembership(request, farmId);
    const input = createExtensionRequestSchema.parse(request.body);
    if (input.animalId) {
      const animal = await prisma.animal.findUnique({
        where: { id: input.animalId },
        select: { farmId: true },
      });
      if (!animal || animal.farmId !== farmId) {
        throw new HttpError(404, "ANIMAL_NOT_FOUND", "Animal not found on this farm.");
      }
    }

    if (input.assignedProfessionalId) {
      const professional = await requireVerifiedProfessional(input.assignedProfessionalId);
      if (!professional.professionalProfile?.isListed) {
        throw new HttpError(400, "PROFESSIONAL_NOT_LISTED", "Choose a professional currently listed in the directory.");
      }
    }

    const extensionRequest = await prisma.$transaction(async (transaction) => {
      const created = await transaction.extensionRequest.create({
        data: {
          reference: `AGH-${randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
          farmId,
          submittedById: user.id,
          animalId: input.animalId ?? null,
          assignedProfessionalId: input.assignedProfessionalId,
          category: input.category,
          description: input.description,
          urgency: input.urgency,
          contactMethod: input.contactMethod,
          preferredContactValue: input.contactMethod === "EMAIL"
            ? user.email
            : input.contactMethod === "PHONE"
              ? input.contactPhone
              : null,
          consentedAt: new Date(),
          status: ExtensionStatus.OPEN,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "ExtensionRequest",
          entityId: created.id,
          action: "SUBMITTED",
          changeSummary: {
            reference: created.reference,
            category: created.category,
            urgency: created.urgency,
            animalId: created.animalId,
          },
        },
      });
      return transaction.extensionRequest.findUniqueOrThrow({
        where: { id: created.id },
        select: requestSummary,
      });
    });
    response.status(201).json({
      data: { request: serializeRequestSummary(extensionRequest, user.id, user.role) },
    });
  }),
);

phase3Router.get(
  "/extension-requests",
  asyncRoute(async (request, response) => {
    const user = requireUser(request);
    let where: Prisma.ExtensionRequestWhereInput;
    if (user.role === UserRole.PROFESSIONAL) {
      where = { assignedProfessionalId: user.id };
    } else if (user.role === UserRole.FARMER || user.role === UserRole.FARM_WORKER) {
      const memberships = await prisma.farmMembership.findMany({
        where: { userId: user.id, status: "ACTIVE" },
        select: { farmId: true },
      });
      where = { farmId: { in: memberships.map((membership) => membership.farmId) } };
    } else {
      throw new HttpError(403, "FORBIDDEN", "Administrators do not receive routine access to private farm requests.");
    }
    const requests = await prisma.extensionRequest.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      take: 100,
      select: requestSummary,
    });
    response.json({
      data: { requests: requests.map((item) => serializeRequestSummary(item, user.id, user.role)) },
    });
  }),
);

phase3Router.get(
  "/extension-requests/:requestId",
  asyncRoute(async (request, response) => {
    const user = requireUser(request);
    const requestId = requestIdSchema.parse(request.params.requestId);
    const accessible = await requireAccessibleRequest(request, requestId, user.id, user.role);
    const extensionRequest = await prisma.extensionRequest.findUnique({
      where: { id: accessible.id },
      select: requestSummary,
    });
    if (!extensionRequest) throw new HttpError(404, "REQUEST_NOT_FOUND", "Extension request not found.");
    response.json({
      data: { request: serializeRequestSummary(extensionRequest, user.id, user.role) },
    });
  }),
);

phase3Router.patch(
  "/extension-requests/:requestId",
  asyncRoute(async (request, response) => {
    const user = requireRole(request, [UserRole.PROFESSIONAL, UserRole.ADMIN]);
    const requestId = requestIdSchema.parse(request.params.requestId);
    const input = updateExtensionRequestSchema.parse(request.body);
    const existing = await prisma.extensionRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, assignedProfessionalId: true, firstRespondedAt: true },
    });
    if (!existing) throw new HttpError(404, "REQUEST_NOT_FOUND", "Extension request not found.");
    if (user.role === UserRole.PROFESSIONAL && existing.assignedProfessionalId !== user.id) {
      throw new HttpError(404, "REQUEST_NOT_FOUND", "Extension request not found.");
    }
    if (input.assignedProfessionalId !== undefined && user.role !== UserRole.ADMIN) {
      throw new HttpError(403, "FORBIDDEN", "Only an administrator can reassign a request.");
    }
    if (input.status !== undefined && user.role === UserRole.ADMIN) {
      throw new HttpError(403, "FORBIDDEN", "Administrators may reassign requests but cannot access or change private request status.");
    }
    if (user.role === UserRole.ADMIN && input.assignedProfessionalId === undefined) {
      throw new HttpError(403, "FORBIDDEN", "Administrators may only update request assignment.");
    }
    if (input.assignedProfessionalId) {
      const professional = await requireVerifiedProfessional(input.assignedProfessionalId);
      if (!professional.professionalProfile?.isListed) {
        throw new HttpError(400, "PROFESSIONAL_NOT_LISTED", "Choose a professional currently listed in the directory.");
      }
    }
    if (input.status) {
      assertRequestStatusTransition(existing.status, input.status);
      if (input.status === ExtensionStatus.RESOLVED || input.status === ExtensionStatus.CLOSED) {
        throw new HttpError(400, "OUTCOME_REQUIRED", "Record a professional interaction and outcome before resolving or closing a request.");
      }
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const changed = await transaction.extensionRequest.updateMany({
        where: {
          id: requestId,
          status: existing.status,
          ...(user.role === UserRole.PROFESSIONAL ? { assignedProfessionalId: user.id } : {}),
          ...(input.status !== undefined ? { firstRespondedAt: existing.firstRespondedAt } : {}),
        },
        data: {
          ...input,
          ...(input.status !== undefined ? { completedAt: null } : {}),
          ...(input.status !== undefined && existing.firstRespondedAt === null
            ? { firstRespondedAt: new Date() }
            : {}),
        },
      });
      if (changed.count !== 1) {
        throw new HttpError(409, "REQUEST_CHANGED", "The request changed while you were updating it. Reload and try again.");
      }
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "ExtensionRequest",
          entityId: requestId,
          action: input.assignedProfessionalId !== undefined ? "UPDATED_ASSIGNMENT" : "STATUS_UPDATED",
          changeSummary: {
            status: input.status ?? null,
            assignedProfessionalId: input.assignedProfessionalId ?? null,
          },
        },
      });
      if (user.role === UserRole.ADMIN) {
        return transaction.extensionRequest.findUniqueOrThrow({
          where: { id: requestId },
          select: { id: true, status: true, assignedProfessionalId: true },
        });
      }
      return transaction.extensionRequest.findUniqueOrThrow({ where: { id: requestId }, select: requestSummary });
    });
    response.json({
      data: {
        request: "reference" in updated
          ? serializeRequestSummary(updated, user.id, user.role)
          : updated,
      },
    });
  }),
);

phase3Router.post(
  "/extension-requests/:requestId/interactions",
  asyncRoute(async (request, response) => {
    const professional = requireRole(request, [UserRole.PROFESSIONAL]);
    const requestId = requestIdSchema.parse(request.params.requestId);
    const input = createExtensionInteractionSchema.parse(request.body);
    const existing = await prisma.extensionRequest.findUnique({
      where: { id: requestId },
      select: { id: true, status: true, assignedProfessionalId: true, firstRespondedAt: true, createdAt: true },
    });
    if (!existing || existing.assignedProfessionalId !== professional.id) {
      throw new HttpError(404, "REQUEST_NOT_FOUND", "Extension request not found.");
    }
    if (existing.status === ExtensionStatus.CLOSED) {
      throw new HttpError(409, "REQUEST_CLOSED", "Closed requests cannot receive new interactions.");
    }
    const nextStatus = input.status
      ?? (existing.status === ExtensionStatus.OPEN ? ExtensionStatus.ACKNOWLEDGED : existing.status);
    if (nextStatus !== existing.status) {
      assertRequestStatusTransition(existing.status, nextStatus);
    }
    if ((nextStatus === ExtensionStatus.RESOLVED || nextStatus === ExtensionStatus.CLOSED)
      && !input.outcome?.trim()) {
      throw new HttpError(400, "OUTCOME_REQUIRED", "Add an outcome before resolving or closing the request.");
    }
    const interactionDate = input.interactionDate ? new Date(input.interactionDate) : new Date();
    if (interactionDate > new Date()) {
      throw new HttpError(400, "INVALID_INTERACTION_DATE", "Interaction date cannot be in the future.");
    }
    if (interactionDate < existing.createdAt) {
      throw new HttpError(400, "INVALID_INTERACTION_DATE", "Interaction date cannot be before the request was submitted.");
    }
    const followUpDate = input.followUpDate
      ? new Date(`${input.followUpDate}T00:00:00.000Z`)
      : null;
    const responseRecordedAt = new Date();
    const interaction = await prisma.$transaction(async (transaction) => {
      const created = await transaction.extensionInteraction.create({
        data: {
          requestId,
          professionalUserId: professional.id,
          advice: input.advice,
          interactionDate,
          followUpDate,
          outcome: input.outcome ?? null,
        },
        include: { professional: { select: { id: true, fullName: true } } },
      });
      const changed = await transaction.extensionRequest.updateMany({
        where: {
          id: requestId,
          status: existing.status,
          assignedProfessionalId: professional.id,
          firstRespondedAt: existing.firstRespondedAt,
        },
        data: {
          status: nextStatus,
          firstRespondedAt: existing.firstRespondedAt ?? responseRecordedAt,
          completedAt: nextStatus === ExtensionStatus.RESOLVED || nextStatus === ExtensionStatus.CLOSED
            ? responseRecordedAt
            : null,
        },
      });
      if (changed.count !== 1) {
        throw new HttpError(409, "REQUEST_CHANGED", "The request changed while you were recording this interaction. Reload and try again.");
      }
      await transaction.auditLog.create({
        data: {
          actorUserId: professional.id,
          entityType: "ExtensionRequest",
          entityId: requestId,
          action: "PROFESSIONAL_INTERACTION_RECORDED",
          changeSummary: {
            status: nextStatus,
            followUpDate: followUpDate?.toISOString() ?? null,
            hasOutcome: Boolean(input.outcome),
          },
        },
      });
      return created;
    });
    response.status(201).json({ data: { interaction, status: nextStatus } });
  }),
);
