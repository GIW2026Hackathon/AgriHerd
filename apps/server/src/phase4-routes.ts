import { AnimalStatus, UserRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireFarmMembership } from "./access.js";
import { requireRole } from "./auth.js";
import { prisma } from "./db.js";
import { asyncRoute, HttpError } from "./http.js";
import { calculatePilotReport } from "./phase4-report.js";
import { createPilotFeedbackSchema, pilotReportRangeSchema } from "./phase4-schemas.js";

export const phase4Router = Router();

const farmIdSchema = z.string().cuid();

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function resolveReportPeriod(query: unknown) {
  const range = pilotReportRangeSchema.parse(query);
  const today = dateOnly(new Date());
  const to = range.to ?? today;
  const defaultFrom = new Date(`${to}T00:00:00.000Z`);
  defaultFrom.setUTCDate(defaultFrom.getUTCDate() - 89);
  const from = range.from ?? dateOnly(defaultFrom);
  const days = (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000;
  if (days < 0 || days > 365) {
    throw new HttpError(400, "INVALID_REPORT_RANGE", "Report periods cannot exceed 366 days.");
  }
  if (to > today) {
    throw new HttpError(400, "INVALID_REPORT_RANGE", "Report periods cannot include future dates.");
  }
  return { from, to };
}

async function createFarmReport(farmId: string, query: unknown) {
  const period = resolveReportPeriod(query);
  const start = new Date(`${period.from}T00:00:00.000Z`);
  const end = new Date(`${period.to}T23:59:59.999Z`);
  const [activeAnimals, animalsWithIdentity, activeAnimalsWithHealthEvent, healthEventCount, requestRows] = await Promise.all([
    prisma.animal.count({ where: { farmId, status: AnimalStatus.ACTIVE } }),
    prisma.animal.count({
      where: {
        farmId,
        status: AnimalStatus.ACTIVE,
        name: { not: "" },
        internalCode: { not: "" },
        breed: { not: "" },
      },
    }),
    prisma.animal.count({
      where: {
        farmId,
        status: AnimalStatus.ACTIVE,
        healthEvents: { some: { observedAt: { gte: start, lte: end } } },
      },
    }),
    prisma.healthEvent.count({
      where: { animal: { farmId }, observedAt: { gte: start, lte: end } },
    }),
    prisma.extensionRequest.findMany({
      where: { farmId, createdAt: { gte: start, lte: end } },
      select: {
        status: true,
        createdAt: true,
        firstRespondedAt: true,
        completedAt: true,
        interactions: {
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 1,
          select: { followUpDate: true, outcome: true },
        },
      },
    }),
  ]);
  return calculatePilotReport({
    ...period,
    activeAnimals,
    animalsWithIdentity,
    activeAnimalsWithHealthEvent,
    healthEventCount,
    requests: requestRows.map((request) => ({
      status: request.status,
      createdAt: request.createdAt,
      firstRespondedAt: request.firstRespondedAt,
      completedAt: request.completedAt,
      hasNextStep: Boolean(request.interactions[0]?.followUpDate || request.interactions[0]?.outcome?.trim()),
    })),
  });
}

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function reportCsv(report: Awaited<ReturnType<typeof createFarmReport>>) {
  const rows: Array<[string, string | number | null]> = [
    ["Period from", report.period.from],
    ["Period to", report.period.to],
    ["Active animals", report.animals.active],
    ["Active animals with identity records", report.animals.withIdentityRecords],
    ["Animal identity coverage percent", report.animals.identityCoveragePercent],
    ["Active animals with a health event in period", report.animals.withHealthEvent],
    ["Active animal health event coverage percent", report.animals.healthEventCoveragePercent],
    ["Health events in period", report.health.events],
    ["Health events with required fields", report.health.eventsWithRequiredFields],
    ["Health event required field coverage percent", report.health.requiredFieldCoveragePercent],
    ["Extension requests created in period", report.extension.requests],
    ["Completed extension requests", report.extension.completedRequests],
    ["Extension request completion percent", report.extension.completionPercent],
    ["Requests with first response", report.extension.requestsWithFirstResponse],
    ["Average hours to first response", report.extension.averageHoursToFirstResponse],
    ["Requests with a recorded next step", report.extension.requestsWithNextStep],
    ["Next step coverage percent", report.extension.nextStepCoveragePercent],
    ["Average days to completion", report.extension.averageDaysToCompletion],
  ];
  return ["Metric,Value", ...rows.map(([metric, value]) => `${csvCell(metric)},${csvCell(value)}`)].join("\r\n");
}

phase4Router.get(
  "/farms/:farmId/reports/summary",
  asyncRoute(async (request, response) => {
    const farmId = farmIdSchema.parse(request.params.farmId);
    await requireFarmMembership(request, farmId);
    response.json({ data: { report: await createFarmReport(farmId, request.query) } });
  }),
);

phase4Router.get(
  "/farms/:farmId/reports/summary.csv",
  asyncRoute(async (request, response) => {
    const farmId = farmIdSchema.parse(request.params.farmId);
    await requireFarmMembership(request, farmId);
    const report = await createFarmReport(farmId, request.query);
    response
      .type("text/csv")
      .set("Content-Disposition", `attachment; filename="agriherd-farm-report-${report.period.from}-${report.period.to}.csv"`)
      .send(reportCsv(report));
  }),
);

phase4Router.post(
  "/pilot/feedback",
  asyncRoute(async (request, response) => {
    const user = requireRole(request, [UserRole.FARMER, UserRole.FARM_WORKER, UserRole.PROFESSIONAL]);
    const input = createPilotFeedbackSchema.parse(request.body);
    const feedback = await prisma.pilotFeedback.create({
      data: {
        submittedById: user.id,
        category: input.category,
        rating: input.rating,
        comments: input.comments?.trim() || null,
      },
      select: { id: true, category: true, rating: true, createdAt: true },
    });
    response.status(201).json({ data: { feedback } });
  }),
);

phase4Router.get(
  "/pilot/feedback",
  asyncRoute(async (request, response) => {
    requireRole(request, [UserRole.ADMIN]);
    const feedback = await prisma.pilotFeedback.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 200,
      select: {
        id: true,
        category: true,
        rating: true,
        comments: true,
        createdAt: true,
        submittedBy: { select: { role: true } },
      },
    });
    response.json({ data: { feedback } });
  }),
);
