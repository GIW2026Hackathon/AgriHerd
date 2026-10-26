import assert from "node:assert/strict";
import test from "node:test";
import { createAnimalSchema, createFarmSchema, registerSchema } from "./schemas.js";

const validAnimal = {
  name: "Daisy",
  breed: "Friesian",
  sex: "FEMALE",
  purpose: "DAIRY",
};

test("animal profiles accept an estimated age or birth date", () => {
  assert.equal(
    createAnimalSchema.safeParse({ ...validAnimal, estimatedAgeMonths: 30 }).success,
    true,
  );
  assert.equal(
    createAnimalSchema.safeParse({ ...validAnimal, birthDate: "2023-02-12" }).success,
    true,
  );
});

test("animal profiles require exactly one age source", () => {
  assert.equal(createAnimalSchema.safeParse(validAnimal).success, false);
  assert.equal(
    createAnimalSchema.safeParse({
      ...validAnimal,
      birthDate: "2023-02-12",
      estimatedAgeMonths: 30,
    }).success,
    false,
  );
});

test("animal age estimates and birth dates are validated", () => {
  assert.equal(
    createAnimalSchema.safeParse({ ...validAnimal, estimatedAgeMonths: 601 }).success,
    false,
  );
  assert.equal(
    createAnimalSchema.safeParse({ ...validAnimal, birthDate: "not-a-date" }).success,
    false,
  );
  assert.equal(
    createAnimalSchema.safeParse({ ...validAnimal, birthDate: "2999-01-01" }).success,
    false,
  );
});

test("farms default to metric units", () => {
  const result = createFarmSchema.parse({ name: "Green Valley" });
  assert.equal(result.preferredUnits, "METRIC");
});

test("farmer registration requires a long password and normalizes email", () => {
  const result = registerSchema.parse({
    fullName: "Farm Owner",
    email: "OWNER@EXAMPLE.COM",
    password: "a-safe-password-123",
  });
  assert.equal(result.email, "owner@example.com");
  assert.equal(
    registerSchema.safeParse({
      fullName: "Farm Owner",
      email: "owner@example.com",
      password: "short",
    }).success,
    false,
  );
  assert.equal(
    registerSchema.safeParse({
      fullName: "Farm Owner",
      email: "owner@example.com",
      password: "a".repeat(73),
    }).success,
    false,
  );
});
