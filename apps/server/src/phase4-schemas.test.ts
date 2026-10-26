import assert from "node:assert/strict";
import test from "node:test";
import { createPilotFeedbackSchema, pilotReportRangeSchema } from "./phase4-schemas.js";

test("pilot report periods require valid ordered dates and a maximum 366-day range", () => {
  assert.equal(pilotReportRangeSchema.safeParse({ from: "2026-01-01", to: "2026-12-31" }).success, true);
  assert.equal(pilotReportRangeSchema.safeParse({ from: "2026-02-01", to: "2026-01-31" }).success, false);
  assert.equal(pilotReportRangeSchema.safeParse({ from: "2025-01-01", to: "2026-01-02" }).success, false);
  assert.equal(pilotReportRangeSchema.safeParse({ from: "not-a-date" }).success, false);
});

test("pilot feedback validates its rating, category, and comment length", () => {
  assert.equal(createPilotFeedbackSchema.safeParse({ category: "USABILITY", rating: 4, comments: "Clear and useful." }).success, true);
  assert.equal(createPilotFeedbackSchema.safeParse({ category: "OTHER", rating: 0 }).success, false);
  assert.equal(createPilotFeedbackSchema.safeParse({ category: "UNKNOWN", rating: 3 }).success, false);
  assert.equal(createPilotFeedbackSchema.safeParse({ category: "ACCESS", rating: 5, comments: "x".repeat(1001) }).success, false);
});
