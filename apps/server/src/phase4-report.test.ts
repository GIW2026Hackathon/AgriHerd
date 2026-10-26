import assert from "node:assert/strict";
import test from "node:test";
import { calculatePilotReport } from "./phase4-report.js";

test("pilot report calculates herd coverage and request outcome metrics", () => {
  const createdAt = new Date("2026-10-01T00:00:00.000Z");
  const report = calculatePilotReport({
    from: "2026-10-01",
    to: "2026-10-31",
    activeAnimals: 4,
    animalsWithIdentity: 3,
    activeAnimalsWithHealthEvent: 2,
    healthEventCount: 5,
    requests: [
      {
        status: "RESOLVED",
        createdAt,
        firstRespondedAt: new Date("2026-10-01T12:00:00.000Z"),
        completedAt: new Date("2026-10-03T00:00:00.000Z"),
        hasNextStep: true,
      },
      {
        status: "OPEN",
        createdAt,
        firstRespondedAt: null,
        completedAt: null,
        hasNextStep: false,
      },
    ],
  });

  assert.equal(report.animals.identityCoveragePercent, 75);
  assert.equal(report.animals.healthEventCoveragePercent, 50);
  assert.equal(report.health.eventsWithRequiredFields, 5);
  assert.equal(report.health.requiredFieldCoveragePercent, 100);
  assert.equal(report.extension.completionPercent, 50);
  assert.equal(report.extension.requestsWithFirstResponse, 1);
  assert.equal(report.extension.averageHoursToFirstResponse, 12);
  assert.equal(report.extension.requestsWithNextStep, 1);
  assert.equal(report.extension.averageDaysToCompletion, 2);
});

test("pilot report uses zero coverage and null response averages for empty data", () => {
  const report = calculatePilotReport({
    from: "2026-10-01",
    to: "2026-10-31",
    activeAnimals: 0,
    animalsWithIdentity: 0,
    activeAnimalsWithHealthEvent: 0,
    healthEventCount: 0,
    requests: [],
  });
  assert.equal(report.animals.identityCoveragePercent, 0);
  assert.equal(report.animals.healthEventCoveragePercent, 0);
  assert.equal(report.health.requiredFieldCoveragePercent, 0);
  assert.equal(report.extension.averageHoursToFirstResponse, null);
  assert.equal(report.extension.averageDaysToCompletion, null);
});
