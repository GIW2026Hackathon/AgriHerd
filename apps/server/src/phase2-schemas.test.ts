import assert from "node:assert/strict";
import test from "node:test";
import {
  createCareRecordSchema,
  createHealthEventSchema,
  createProfessionalAssessmentSchema,
  updateFollowUpStatusSchema,
} from "./phase2-schemas.js";

test("health observations require an explicit observation time, description, and severity", () => {
  const observation = {
    observedAt: "2026-10-26T08:00:00.000Z",
    symptoms: "Reduced appetite since this morning.",
    severityObserved: "MILD",
  };
  assert.equal(createHealthEventSchema.safeParse(observation).success, true);
  assert.equal(createHealthEventSchema.safeParse({ ...observation, symptoms: " " }).success, false);
  assert.equal(createHealthEventSchema.safeParse({ ...observation, severityObserved: "DIAGNOSIS" }).success, false);
  assert.equal(createHealthEventSchema.safeParse({ ...observation, observedAt: "yesterday" }).success, false);
});

test("care records validate their category and date ordering", () => {
  const record = {
    category: "VETERINARY_VISIT",
    details: "Veterinary visit recorded by the farmer.",
    startDate: "2026-10-24",
    endDate: "2026-10-24",
    followUpDate: "2026-10-31",
  };
  assert.equal(createCareRecordSchema.safeParse(record).success, true);
  assert.equal(createCareRecordSchema.safeParse({ ...record, endDate: "2026-10-23" }).success, false);
  assert.equal(createCareRecordSchema.safeParse({ ...record, followUpDate: "later" }).success, false);
  assert.equal(createCareRecordSchema.safeParse({ ...record, details: "" }).success, false);
});

test("professional assessments are separate records with optional diagnosis and follow-up", () => {
  const assessment = {
    healthEventId: "ck6q9s7k10000z5p0w3n4b2a1",
    assessment: "Assessment notes recorded by the assigned professional.",
    followUpDate: "2026-10-31",
  };
  assert.equal(createProfessionalAssessmentSchema.safeParse(assessment).success, true);
  assert.equal(
    createProfessionalAssessmentSchema.safeParse({ ...assessment, diagnosisIfMade: " " }).success,
    false,
  );
  assert.equal(updateFollowUpStatusSchema.safeParse({ followUpStatus: "COMPLETED" }).success, true);
  assert.equal(updateFollowUpStatusSchema.safeParse({ followUpStatus: "NOT_REQUIRED" }).success, false);
});
