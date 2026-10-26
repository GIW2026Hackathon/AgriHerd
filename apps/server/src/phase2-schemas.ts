import { z } from "zod";

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(max).nullable().optional(),
  );

const cuid = z.string().cuid();
const recordDate = z.string().date();
const recordedAt = z.string().datetime({ offset: true });

export const createHealthEventSchema = z.object({
  observedAt: recordedAt,
  symptoms: requiredText("Observation", 4000),
  severityObserved: z.enum(["MILD", "MODERATE", "SEVERE"]),
  notes: optionalText(2000),
  followUpDate: recordDate.nullable().optional(),
});

export const createCareRecordSchema = z
  .object({
    category: z.enum(["VETERINARY_VISIT", "VACCINATION", "MEDICATION", "TREATMENT", "OTHER"]),
    details: requiredText("Care details", 4000),
    startDate: recordDate,
    endDate: recordDate.nullable().optional(),
    followUpDate: recordDate.nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.endDate && value.endDate < value.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "End date cannot be before the start date.",
      });
    }
  });

export const updateFollowUpStatusSchema = z.object({
  followUpStatus: z.enum(["PENDING", "COMPLETED"]),
});

export const createProfessionalAssessmentSchema = z.object({
  healthEventId: cuid,
  assessment: requiredText("Assessment", 4000),
  diagnosisIfMade: optionalText(500),
  followUpDate: recordDate.nullable().optional(),
});

export const updateProfessionalAssessmentSchema = z.object({
  followUpStatus: z.enum(["PENDING", "COMPLETED"]),
});
