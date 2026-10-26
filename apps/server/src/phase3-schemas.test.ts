import assert from "node:assert/strict";
import test from "node:test";
import {
  createExtensionInteractionSchema,
  createExtensionRequestSchema,
  createFeedRecordSchema,
  createNutritionResourceSchema,
  isValidStatusTransition,
} from "./phase3-schemas.js";

test("feed records require a positive explicit quantity and unit", () => {
  const validRecord = { feedName: "Hay", quantity: 12.5, unit: "KG" };
  assert.equal(createFeedRecordSchema.safeParse(validRecord).success, true);
  assert.equal(createFeedRecordSchema.safeParse({ ...validRecord, quantity: 0 }).success, false);
  assert.equal(createFeedRecordSchema.safeParse({ ...validRecord, quantity: -2 }).success, false);
  assert.equal(createFeedRecordSchema.safeParse({ feedName: "Hay", quantity: 5 }).success, false);
  assert.equal(
    createFeedRecordSchema.safeParse({ feedName: "Hay", quantity: 2, unit: "OTHER" }).success,
    false,
  );
  assert.equal(
    createFeedRecordSchema.safeParse({ feedName: "Hay", quantity: 2, unit: "OTHER", unitLabel: "scoops" }).success,
    true,
  );
});

test("nutrition drafts require readable content but can await professional review", () => {
  assert.equal(
    createNutritionResourceSchema.safeParse({
      title: "General cattle feed storage",
      content: "Store feed in a dry, clean place.",
    }).success,
    true,
  );
  assert.equal(
    createNutritionResourceSchema.safeParse({ title: " ", content: "Guidance" }).success,
    false,
  );
  assert.equal(
    createNutritionResourceSchema.safeParse({
      title: "Unsafe link",
      content: "Guidance",
      sourceUrl: "javascript:alert(1)",
    }).success,
    false,
  );
});

test("professional interactions require advice and validate follow-up dates", () => {
  assert.equal(createExtensionInteractionSchema.safeParse({ advice: "Call the farm tomorrow." }).success, true);
  assert.equal(createExtensionInteractionSchema.safeParse({ advice: "" }).success, false);
  assert.equal(
    createExtensionInteractionSchema.safeParse({ advice: "Follow up.", followUpDate: "next week" }).success,
    false,
  );
});

test("extension support requests must be assigned to a verified directory choice", () => {
  const request = {
    assignedProfessionalId: "ck6q9s7k10000z5p0w3n4b2a1",
    category: "HEALTH",
    description: "An animal has stopped eating.",
    contactMethod: "EMAIL",
    shareConsent: true,
  };
  assert.equal(createExtensionRequestSchema.safeParse(request).success, true);
  assert.equal(
    createExtensionRequestSchema.safeParse({ ...request, assignedProfessionalId: undefined }).success,
    false,
  );
  assert.equal(
    createExtensionRequestSchema.safeParse({ ...request, contactMethod: "PHONE" }).success,
    false,
  );
  assert.equal(
    createExtensionRequestSchema.safeParse({ ...request, contactMethod: "PHONE", contactPhone: "+254 700 123 456" }).success,
    true,
  );
  assert.equal(
    createExtensionRequestSchema.safeParse({ ...request, shareConsent: false }).success,
    false,
  );
});

test("extension requests follow a one-way, auditable status lifecycle", () => {
  assert.equal(isValidStatusTransition("OPEN", "ACKNOWLEDGED"), true);
  assert.equal(isValidStatusTransition("IN_PROGRESS", "RESOLVED"), true);
  assert.equal(isValidStatusTransition("RESOLVED", "IN_PROGRESS"), true);
  assert.equal(isValidStatusTransition("CLOSED", "OPEN"), false);
  assert.equal(isValidStatusTransition("OPEN", "RESOLVED"), false);
});
