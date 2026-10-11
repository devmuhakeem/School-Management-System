import { z } from "zod";

export const ReportCategoryEnum = z.enum([
  "MANAGEMENT",
  "ACADEMICS",
  "ATTENDANCE",
  "FINANCE",
  "STUDENTS",
  "STAFF",
  "OPERATIONS",
]);

export const ExportFormatEnum = z.enum(["csv", "json"]);

/**
 * Standard Report Query Filter Schema
 */
export const reportFilterSchema = z
  .object({
    campusId: z.string().trim().optional(),
    academicYearId: z.string().trim().optional(),
    termId: z.string().trim().optional(),
    startDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}/, "Start date must be in YYYY-MM-DD format")
      .optional()
      .or(z.literal("")),
    endDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}/, "End date must be in YYYY-MM-DD format")
      .optional()
      .or(z.literal("")),
    classId: z.string().trim().optional(),
    sectionId: z.string().trim().optional(),
    subjectId: z.string().trim().optional(),
    status: z.string().trim().optional(),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    chronicThreshold: z.coerce.number().min(1).max(100).default(85),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(250).default(25),
    sortBy: z.string().trim().optional(),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "Start date must be before or equal to end date",
      path: ["startDate"],
    }
  );

export type ReportFilterInput = z.infer<typeof reportFilterSchema>;
export type RawReportFilterInput = z.input<typeof reportFilterSchema>;

/**
 * Report Export Query Schema
 */
export const reportExportSchema = z
  .object({
    reportKey: z.string().trim().min(1, "Report key is required"),
    format: ExportFormatEnum.default("csv"),
    campusId: z.string().trim().optional(),
    academicYearId: z.string().trim().optional(),
    termId: z.string().trim().optional(),
    startDate: z.string().trim().optional(),
    endDate: z.string().trim().optional(),
    classId: z.string().trim().optional(),
    sectionId: z.string().trim().optional(),
    subjectId: z.string().trim().optional(),
    status: z.string().trim().optional(),
    chronicThreshold: z.coerce.number().min(1).max(100).default(85),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.startDate) <= new Date(data.endDate);
      }
      return true;
    },
    {
      message: "Start date must be before or equal to end date",
      path: ["startDate"],
    }
  );

export type ReportExportInput = z.infer<typeof reportExportSchema>;
export type RawReportExportInput = z.input<typeof reportExportSchema>;
