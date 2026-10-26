import { z } from "zod";

const requiredText = (label: string, max = 120) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

const optionalText = (max = 120) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters for your password.")
  .max(128)
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password must be no more than 72 UTF-8 bytes.",
  );

export const registerSchema = z.object({
  fullName: requiredText("Full name", 120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: passwordSchema,
});

export const createFarmSchema = z.object({
  name: requiredText("Farm name", 120),
  locationLabel: optionalText(160),
  preferredUnits: z.enum(["METRIC", "IMPERIAL"]).default("METRIC"),
});

export const updateFarmSchema = createFarmSchema.partial();

const animalProfileFields = {
  earTag: optionalText(80),
  name: requiredText("Animal name", 120),
  breed: requiredText("Breed", 120),
  sex: z.enum(["FEMALE", "MALE", "UNKNOWN"]),
  purpose: z.enum(["BEEF", "DAIRY"]),
  birthDate: z.string().date().nullable().optional(),
  estimatedAgeMonths: z.number().int().min(0).max(600).nullable().optional(),
};

function validateAgeOrBirthDate(
  value: { birthDate?: string | null; estimatedAgeMonths?: number | null },
  context: z.RefinementCtx,
) {
  const hasBirthDate = Boolean(value.birthDate);
  const hasAge = value.estimatedAgeMonths !== undefined && value.estimatedAgeMonths !== null;
  if (hasBirthDate === hasAge) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["birthDate"],
      message: "Provide either a birth date or an estimated age, but not both.",
    });
  }
  if (value.birthDate && new Date(`${value.birthDate}T00:00:00.000Z`) > new Date()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["birthDate"],
      message: "Birth date cannot be in the future.",
    });
  }
}

export const createAnimalSchema = z
  .object(animalProfileFields)
  .superRefine(validateAgeOrBirthDate);

export const updateAnimalSchema = z
  .object({
    earTag: optionalText(80),
    name: animalProfileFields.name.optional(),
    breed: animalProfileFields.breed.optional(),
    sex: animalProfileFields.sex.optional(),
    purpose: animalProfileFields.purpose.optional(),
    birthDate: animalProfileFields.birthDate,
    estimatedAgeMonths: animalProfileFields.estimatedAgeMonths,
    status: z.enum(["ACTIVE", "INACTIVE", "DECEASED", "SOLD"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");
