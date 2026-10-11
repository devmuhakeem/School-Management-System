import { z } from "zod";

/**
 * Organization Update Schema
 */
export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters").max(100),
  code: z.string().trim().min(2, "Code must be at least 2 characters").max(20).toUpperCase(),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  website: z.string().trim().url("Invalid website URL").optional().or(z.literal("")),
  logoUrl: z.string().trim().url("Invalid logo URL").optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]).optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

/**
 * Campus Create & Update Schema
 */
export const campusSchema = z.object({
  name: z.string().trim().min(2, "Campus name must be at least 2 characters").max(100),
  code: z.string().trim().min(2, "Campus code must be at least 2 characters").max(20).toUpperCase(),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  city: z.string().trim().max(100).optional().or(z.literal("")),
  state: z.string().trim().max(100).optional().or(z.literal("")),
  country: z.string().trim().max(100).optional().or(z.literal("")),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "ARCHIVED"]).default("ACTIVE"),
});

export type CampusInput = z.infer<typeof campusSchema>;

/**
 * Academic Year Schema
 */
export const academicYearSchema = z
  .object({
    name: z.string().trim().min(3, "Academic year name is required (e.g. 2026/2027)"),
    code: z.string().trim().min(2, "Academic year code is required").max(20).toUpperCase(),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid start date required"),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid end date required"),
    isCurrent: z.boolean().default(false),
    status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED"]).default("UPCOMING"),
    campusId: z.string().optional().nullable(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: "Start date must precede end date",
    path: ["endDate"],
  });

export type AcademicYearInput = z.infer<typeof academicYearSchema>;

/**
 * Term Schema
 */
export const termSchema = z
  .object({
    academicYearId: z.string().min(1, "Academic year is required"),
    name: z.string().trim().min(2, "Term name is required (e.g. First Term)"),
    termNumber: z.coerce.number().int().min(1).max(10),
    startDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid start date required"),
    endDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid end date required"),
    isCurrent: z.boolean().default(false),
    status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED"]).default("UPCOMING"),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: "Start date must precede end date",
    path: ["endDate"],
  });

export type TermInput = z.infer<typeof termSchema>;

/**
 * Class Level Schema
 */
export const classLevelSchema = z.object({
  name: z.string().trim().min(2, "Class level name is required (e.g. Junior Secondary 1)"),
  code: z.string().trim().min(1, "Code is required (e.g. JSS1)").max(20).toUpperCase(),
  sequenceOrder: z.coerce.number().int().min(1, "Sequence order must be positive"),
  description: z.string().trim().max(255).optional().or(z.literal("")),
  campusId: z.string().optional(),
});

export type ClassLevelInput = z.infer<typeof classLevelSchema>;

/**
 * Class Schema
 */
export const classSchema = z.object({
  classLevelId: z.string().min(1, "Class level is required"),
  academicYearId: z.string().min(1, "Academic year is required"),
  name: z.string().trim().min(2, "Class name is required (e.g. Grade 10 - 2026/2027)"),
  code: z.string().trim().min(1, "Class code is required").max(20).toUpperCase(),
  capacity: z.coerce.number().int().min(1).max(200).default(35),
  classTeacherId: z.string().optional().nullable(),
  campusId: z.string().optional(),
});

export type ClassInput = z.infer<typeof classSchema>;

/**
 * Section Schema
 */
export const sectionSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  name: z.string().trim().min(1, "Section name is required (e.g. Section A)"),
  code: z.string().trim().min(1, "Section code is required (e.g. SEC-A)").max(20).toUpperCase(),
  roomNumber: z.string().trim().max(50).optional().or(z.literal("")),
  capacity: z.coerce.number().int().min(1).max(100).default(30),
  classTeacherId: z.string().optional().nullable(),
});

export type SectionInput = z.infer<typeof sectionSchema>;

/**
 * Subject Schema
 */
export const subjectSchema = z.object({
  name: z.string().trim().min(2, "Subject name is required (e.g. Mathematics)"),
  code: z.string().trim().min(2, "Subject code is required (e.g. MATH-101)").max(20).toUpperCase(),
  description: z.string().trim().max(255).optional().or(z.literal("")),
  creditUnits: z.coerce.number().int().min(0).max(20).default(1),
  isElective: z.boolean().default(false),
  isActive: z.boolean().default(true),
  campusId: z.string().optional(),
});

export type SubjectInput = z.infer<typeof subjectSchema>;

/**
 * Department Schema
 */
export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Department name is required"),
  code: z.string().trim().min(2, "Department code is required").max(20).toUpperCase(),
  description: z.string().trim().max(255).optional().or(z.literal("")),
  headOfDepartmentId: z.string().optional().nullable(),
  campusId: z.string().optional(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;

/**
 * Position Schema
 */
export const positionSchema = z.object({
  departmentId: z.string().optional().nullable(),
  title: z.string().trim().min(2, "Position title is required"),
  code: z.string().trim().min(2, "Position code is required").max(20).toUpperCase(),
  description: z.string().trim().max(255).optional().or(z.literal("")),
  campusId: z.string().optional(),
});

export type PositionInput = z.infer<typeof positionSchema>;

/**
 * User Account Status & Role Assignment Schema
 */
export const updateUserStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "INVITED"]),
});

export const updateUserRolesSchema = z.object({
  roles: z.array(z.string()).min(1, "User must have at least one assigned role"),
});

export const updateUserCampusesSchema = z.object({
  campusIds: z.array(z.string()).min(1, "User must have access to at least one campus"),
  defaultCampusId: z.string().optional(),
});

/**
 * School Settings Schema
 */
export const schoolSettingsSchema = z.object({
  schoolName: z.string().trim().min(2).max(100),
  timezone: z.string().trim().default("UTC"),
  locale: z.string().trim().default("en-US"),
  currency: z.string().trim().default("USD"),
  dateFormat: z.string().trim().default("YYYY-MM-DD"),
  branding: z
    .object({
      primaryColor: z.string().default("#4f46e5"),
      accentColor: z.string().default("#06b6d4"),
      themeMode: z.enum(["light", "dark", "system"]).default("light"),
    })
    .optional(),
  contact: z
    .object({
      primaryEmail: z.string().email().optional().or(z.literal("")),
      primaryPhone: z.string().optional().or(z.literal("")),
      postalAddress: z.string().optional().or(z.literal("")),
    })
    .optional(),
  notifications: z
    .object({
      emailAlerts: z.boolean().default(true),
      smsAlerts: z.boolean().default(false),
      attendanceDigest: z.boolean().default(true),
    })
    .optional(),
});

export type SchoolSettingsInput = z.infer<typeof schoolSettingsSchema>;
