import { z } from "zod";

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

const cuid = z.string().cuid();
const sourceUrl = z
  .string()
  .url()
  .max(2000)
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), "Use an HTTP or HTTPS source URL.");

export const createFeedRecordSchema = z
  .object({
    animalId: cuid.nullable().optional(),
    feedName: requiredText("Feed name", 120),
    quantity: z.number().finite().positive().max(999_999_999.999),
    unit: z.enum(["KG", "G", "L", "ML", "BALE", "BAG", "OTHER"]),
    unitLabel: optionalText(32),
    recordedAt: z.string().datetime({ offset: true }).optional(),
    notes: optionalText(1000),
  })
  .superRefine((value, context) => {
    if (value.unit === "OTHER" && !value.unitLabel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitLabel"],
        message: "Name the unit when selecting other.",
      });
    }
    if (value.unit !== "OTHER" && value.unitLabel) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["unitLabel"],
        message: "A custom unit label is only valid when the unit is other.",
      });
    }
  });

export const feedRecordQuerySchema = z.object({
  animalId: cuid.optional(),
});

export const createNutritionResourceSchema = z.object({
  title: requiredText("Title", 160),
  content: requiredText("Guidance content", 8000),
  scope: z.enum(["ALL_CATTLE", "DAIRY", "BEEF"]).default("ALL_CATTLE"),
  source: optionalText(500),
  sourceUrl: z.union([sourceUrl, z.literal("")]).nullable().optional(),
});

export const updateNutritionResourceSchema = z
  .object({
    title: requiredText("Title", 160).optional(),
    content: requiredText("Guidance content", 8000).optional(),
    scope: z.enum(["ALL_CATTLE", "DAIRY", "BEEF"]).optional(),
    source: optionalText(500),
    sourceUrl: z.union([sourceUrl, z.literal("")]).nullable().optional(),
    reviewedById: cuid.nullable().optional(),
    reviewDate: z.string().date().nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export const createExtensionRequestSchema = z
  .object({
    animalId: cuid.nullable().optional(),
    assignedProfessionalId: cuid,
    category: z.enum(["HEALTH", "NUTRITION", "HERD_MANAGEMENT"]),
    description: requiredText("Request description", 4000),
    urgency: z.enum(["ROUTINE", "SOON", "URGENT"]).default("ROUTINE"),
    contactMethod: z.enum(["PHONE", "EMAIL", "IN_PERSON"]),
    shareConsent: z.literal(true),
    contactPhone: z
      .string()
      .trim()
      .min(6)
      .max(40)
      .regex(/^[+0-9][0-9\s().-]*$/)
      .refine((phone) => (phone.match(/\d/g)?.length ?? 0) >= 6, "Enter a valid phone number.")
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.contactMethod === "PHONE" && !value.contactPhone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["contactPhone"],
        message: "A phone number is required when phone is the preferred contact method.",
      });
    }
  });

export const createExtensionInteractionSchema = z.object({
  advice: requiredText("Professional notes", 4000),
  interactionDate: z.string().datetime({ offset: true }).optional(),
  followUpDate: z.string().date().nullable().optional(),
  outcome: optionalText(2000),
  status: z.enum(["ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
});

export const updateExtensionRequestSchema = z
  .object({
    status: z.enum(["ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
    assignedProfessionalId: cuid.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export const createProfessionalSchema = z.object({
  fullName: requiredText("Full name", 120),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(12)
    .max(128)
    .refine((password) => Buffer.byteLength(password, "utf8") <= 72),
  qualifications: requiredText("Qualifications", 500),
  serviceArea: requiredText("Service area", 200),
  publicEmail: z.string().trim().email().max(254).nullable().optional(),
  publicPhone: optionalText(40),
});

export const updateProfessionalProfileSchema = z
  .object({
    serviceArea: requiredText("Service area", 200).optional(),
    publicEmail: z.string().trim().email().max(254).nullable().optional(),
    publicPhone: optionalText(40),
    isListed: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, "Provide at least one field to update.");

export function isValidStatusTransition(current: string, next: string) {
  const allowedTransitions: Record<string, string[]> = {
    OPEN: ["ACKNOWLEDGED", "IN_PROGRESS", "CLOSED"],
    ACKNOWLEDGED: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
    IN_PROGRESS: ["RESOLVED", "CLOSED"],
    RESOLVED: ["IN_PROGRESS", "CLOSED"],
    CLOSED: [],
  };
  return allowedTransitions[current]?.includes(next) ?? false;
}
