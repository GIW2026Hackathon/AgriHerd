import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { AnimalPurpose, FarmMembershipRole, Prisma, UserRole } from "@prisma/client";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { requireFarmMembership } from "./access.js";
import { createSession, destroySession, requireFarmer, requireUser } from "./auth.js";
import { prisma } from "./db.js";
import { asyncRoute, HttpError } from "./http.js";
import {
  createAnimalSchema,
  createFarmSchema,
  loginSchema,
  registerSchema,
  updateAnimalSchema,
  updateFarmSchema,
} from "./schemas.js";

export const apiRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: { code: "RATE_LIMITED", message: "Too many sign-in attempts. Try again later." },
  },
});

const farmIdSchema = z.string().cuid();
const animalIdSchema = z.string().cuid();

apiRouter.post(
  "/auth/register",
  authLimiter,
  asyncRoute(async (request, response) => {
    const input = registerSchema.parse(request.body);
    const passwordHash = await bcrypt.hash(input.password, 12);

    try {
      const user = await prisma.user.create({
        data: {
          fullName: input.fullName,
          email: input.email,
          passwordHash,
          role: UserRole.FARMER,
        },
        select: { id: true, fullName: true, email: true, role: true },
      });
      await createSession(user.id, response);
      response.status(201).json({ data: { user } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "EMAIL_ALREADY_REGISTERED", "An account with this email already exists.");
      }
      throw error;
    }
  }),
);

apiRouter.post(
  "/auth/login",
  authLimiter,
  asyncRoute(async (request, response) => {
    const input = loginSchema.parse(request.body);
    await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || user.status !== "ACTIVE" || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    }

    await createSession(user.id, response);
    response.json({
      data: {
        user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role },
      },
    });
  }),
);

apiRouter.post(
  "/auth/logout",
  asyncRoute(async (request, response) => {
    await destroySession(request, response);
    response.json({ data: { signedOut: true } });
  }),
);

apiRouter.get(
  "/auth/session",
  asyncRoute(async (request, response) => {
    response.json({ data: { user: request.user ?? null } });
  }),
);

apiRouter.get(
  "/farms",
  asyncRoute(async (request, response) => {
    const user = requireUser(request);
    const farms = await prisma.farm.findMany({
      where: { memberships: { some: { userId: user.id, status: "ACTIVE" } } },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { animals: true } },
        memberships: {
          where: { userId: user.id, status: "ACTIVE" },
          select: { role: true },
        },
      },
    });
    response.json({
      data: {
        farms: farms.map(({ memberships, ...farm }) => ({
          ...farm,
          membershipRole: memberships[0]?.role,
        })),
      },
    });
  }),
);

apiRouter.post(
  "/farms",
  asyncRoute(async (request, response) => {
    const user = requireFarmer(request);
    const input = createFarmSchema.parse(request.body);
    const farm = await prisma.$transaction(async (transaction) => {
      const createdFarm = await transaction.farm.create({
        data: {
          name: input.name,
          locationLabel: input.locationLabel ?? null,
          preferredUnits: input.preferredUnits,
          memberships: {
            create: { userId: user.id, role: FarmMembershipRole.OWNER, status: "ACTIVE" },
          },
        },
        include: { _count: { select: { animals: true } } },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "Farm",
          entityId: createdFarm.id,
          action: "CREATED",
          changeSummary: { name: createdFarm.name },
        },
      });
      return createdFarm;
    });
    response.status(201).json({ data: { farm } });
  }),
);

apiRouter.get(
  "/farms/:farmId",
  asyncRoute(async (request, response) => {
    const farmId = farmIdSchema.parse(request.params.farmId);
    await requireFarmMembership(request, farmId);
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: { _count: { select: { animals: true } } },
    });
    if (!farm) {
      throw new HttpError(404, "FARM_NOT_FOUND", "Farm not found.");
    }
    response.json({ data: { farm } });
  }),
);

apiRouter.patch(
  "/farms/:farmId",
  asyncRoute(async (request, response) => {
    const farmId = farmIdSchema.parse(request.params.farmId);
    const user = requireUser(request);
    await requireFarmMembership(request, farmId, FarmMembershipRole.OWNER);
    const input = updateFarmSchema.parse(request.body);
    if (Object.keys(input).length === 0) {
      throw new HttpError(400, "EMPTY_UPDATE", "Provide at least one field to update.");
    }
    const farm = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.farm.update({
        where: { id: farmId },
        data: input,
        include: { _count: { select: { animals: true } } },
      });
      await transaction.auditLog.create({
        data: {
          actorUserId: user.id,
          entityType: "Farm",
          entityId: farmId,
          action: "UPDATED",
          changeSummary: input,
        },
      });
      return updated;
    });
    response.json({ data: { farm } });
  }),
);

apiRouter.get(
  "/farms/:farmId/animals",
  asyncRoute(async (request, response) => {
    const farmId = farmIdSchema.parse(request.params.farmId);
    await requireFarmMembership(request, farmId);
    const query = z.object({
      search: z.string().trim().max(100).optional(),
      purpose: z.nativeEnum(AnimalPurpose).optional(),
    }).parse(request.query);
    const animals = await prisma.animal.findMany({
      where: {
        farmId,
        ...(query.purpose ? { purpose: query.purpose } : {}),
        ...(query.search
          ? {
              OR: [
                { internalCode: { contains: query.search, mode: "insensitive" } },
                { earTag: { contains: query.search, mode: "insensitive" } },
                { name: { contains: query.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    });
    response.json({ data: { animals } });
  }),
);

apiRouter.post(
  "/farms/:farmId/animals",
  asyncRoute(async (request, response) => {
    const farmId = farmIdSchema.parse(request.params.farmId);
    const user = requireUser(request);
    await requireFarmMembership(request, farmId, FarmMembershipRole.OWNER);
    const input = createAnimalSchema.parse(request.body);
    const earTag = input.earTag?.trim().toUpperCase() || null;

    try {
      const animal = await prisma.$transaction(async (transaction) => {
        const created = await transaction.animal.create({
          data: {
            farmId,
            internalCode: `AH-${randomUUID().slice(0, 12).toUpperCase()}`,
            earTag,
            name: input.name,
            breed: input.breed,
            sex: input.sex,
            purpose: input.purpose,
            birthDate: input.birthDate ? new Date(`${input.birthDate}T00:00:00.000Z`) : null,
            estimatedAgeMonths: input.estimatedAgeMonths ?? null,
          },
        });
        await transaction.auditLog.create({
          data: {
            actorUserId: user.id,
            entityType: "Animal",
            entityId: created.id,
            action: "CREATED",
            changeSummary: { farmId, internalCode: created.internalCode },
          },
        });
        return created;
      });
      response.status(201).json({ data: { animal } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "DUPLICATE_EAR_TAG", "That ear tag is already registered on this farm.");
      }
      throw error;
    }
  }),
);

apiRouter.get(
  "/animals/:animalId",
  asyncRoute(async (request, response) => {
    const animalId = animalIdSchema.parse(request.params.animalId);
    requireUser(request);
    const animal = await prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) {
      throw new HttpError(404, "ANIMAL_NOT_FOUND", "Animal not found.");
    }
    await requireFarmMembership(request, animal.farmId);
    response.json({ data: { animal } });
  }),
);

apiRouter.patch(
  "/animals/:animalId",
  asyncRoute(async (request, response) => {
    const animalId = animalIdSchema.parse(request.params.animalId);
    const user = requireUser(request);
    const current = await prisma.animal.findUnique({ where: { id: animalId } });
    if (!current) {
      throw new HttpError(404, "ANIMAL_NOT_FOUND", "Animal not found.");
    }
    await requireFarmMembership(request, current.farmId, FarmMembershipRole.OWNER);
    const input = updateAnimalSchema.parse(request.body);

    const birthDate = input.birthDate === undefined
      ? current.birthDate
      : input.birthDate
        ? new Date(`${input.birthDate}T00:00:00.000Z`)
        : null;
    const estimatedAgeMonths = input.estimatedAgeMonths === undefined
      ? current.estimatedAgeMonths
      : input.estimatedAgeMonths;
    const hasBirthDate = birthDate !== null;
    const hasEstimatedAge = estimatedAgeMonths !== null;
    if (hasBirthDate === hasEstimatedAge) {
      throw new HttpError(400, "INVALID_AGE", "Keep either a birth date or an estimated age, but not both.");
    }

    const updateData: Prisma.AnimalUpdateInput = {
      ...(input.earTag !== undefined ? { earTag: input.earTag?.trim().toUpperCase() || null } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.breed !== undefined ? { breed: input.breed } : {}),
      ...(input.sex !== undefined ? { sex: input.sex } : {}),
      ...(input.purpose !== undefined ? { purpose: input.purpose } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      birthDate,
      estimatedAgeMonths,
    };

    try {
      const animal = await prisma.$transaction(async (transaction) => {
        const updated = await transaction.animal.update({ where: { id: animalId }, data: updateData });
        await transaction.auditLog.create({
          data: {
            actorUserId: user.id,
            entityType: "Animal",
            entityId: animalId,
            action: "UPDATED",
            changeSummary: { changedFields: Object.keys(input) },
          },
        });
        return updated;
      });
      response.json({ data: { animal } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new HttpError(409, "DUPLICATE_EAR_TAG", "That ear tag is already registered on this farm.");
      }
      throw error;
    }
  }),
);
