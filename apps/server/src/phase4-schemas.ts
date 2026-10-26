import { z } from "zod";

const reportDate = z.string().date();

export const pilotReportRangeSchema = z
  .object({
    from: reportDate.optional(),
    to: reportDate.optional(),
  })
  .superRefine((range, context) => {
    if (range.from && range.to && range.from > range.to) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from"],
        message: "The start date must be on or before the end date.",
      });
    }
    if (range.from && range.to) {
      const days = (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000;
      if (days > 365) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["from"],
          message: "Report periods cannot exceed 366 days.",
        });
      }
    }
  });

export const createPilotFeedbackSchema = z.object({
  category: z.enum(["USABILITY", "DATA_QUALITY", "ACCESS", "PROFESSIONAL_WORKFLOW", "OTHER"]),
  rating: z.number().int().min(1).max(5),
  comments: z.preprocess(
    (value) => (value === "" ? null : value),
    z.string().trim().max(1000).nullable().optional(),
  ),
});
