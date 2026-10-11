import { z } from "zod";

/**
 * 1. Organization Schemas
 */
export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  code: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .toUpperCase(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional(),
  website: z.string().trim().url().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "SUSPENDED", "TRIAL", "ARCHIVED"]).default("ACTIVE"),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

/**
 * 2. Campus Schemas
 */
export const createCampusSchema = z.object({
  name: z.string().trim().min(2, "Campus name must be at least 2 characters").max(100),
  code: z.string().trim().min(2).max(10).toUpperCase(),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE", "UNDER_CONSTRUCTION", "ARCHIVED"]).default("ACTIVE"),
});

export type CreateCampusInput = z.infer<typeof createCampusSchema>;

/**
 * 3. User Schemas
 */
export const createUserSchema = z.object({
  email: z.string().trim().email("Valid email required").toLowerCase(),
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  phone: z.string().trim().max(30).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "INVITED"]).default("INVITED"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

/**
 * 4. Academic Structure Schemas
 */
export const createAcademicYearSchema = z.object({
  name: z.string().trim().min(3, "e.g. 2025/2026 Academic Session").max(100),
  code: z.string().trim().min(2).max(20).toUpperCase(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().default(false),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED", "ARCHIVED"]).default("UPCOMING"),
}).refine((data) => data.endDate > data.startDate, {
  message: "End date must occur after start date",
  path: ["endDate"],
});

export const createTermSchema = z.object({
  academicYearId: z.string().uuid("Valid AcademicYear UUID required"),
  name: z.string().trim().min(2).max(50),
  termNumber: z.coerce.number().int().min(1).max(12),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isCurrent: z.boolean().default(false),
  status: z.enum(["UPCOMING", "ACTIVE", "COMPLETED"]).default("UPCOMING"),
}).refine((data) => data.endDate > data.startDate, {
  message: "Term end date must occur after start date",
  path: ["endDate"],
});

export const createClassLevelSchema = z.object({
  name: z.string().trim().min(2).max(60),
  code: z.string().trim().min(1).max(15).toUpperCase(),
  sequenceOrder: z.coerce.number().int().min(1),
  description: z.string().trim().max(255).optional(),
});

export const createClassSchema = z.object({
  campusId: z.string().uuid(),
  classLevelId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().min(1).max(20).toUpperCase(),
  capacity: z.coerce.number().int().min(1).max(200).default(35),
  classTeacherId: z.string().uuid().optional(),
});

export const createSectionSchema = z.object({
  classId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  code: z.string().trim().min(1).max(20).toUpperCase(),
  roomNumber: z.string().trim().max(50).optional(),
  capacity: z.coerce.number().int().min(1).max(100).default(30),
});

export const createSubjectSchema = z.object({
  campusId: z.string().uuid(),
  name: z.string().trim().min(2).max(100),
  code: z.string().trim().min(1).max(20).toUpperCase(),
  creditUnits: z.coerce.number().int().min(0).max(20).default(1),
  isElective: z.boolean().default(false),
});

/**
 * 5. Student & Enrollment Schemas
 */
export const createStudentSchema = z.object({
  campusId: z.string().uuid("Valid campus UUID required"),
  admissionNumber: z.string().trim().min(2, "Admission number is required").max(30).toUpperCase(),
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  dateOfBirth: z.coerce.date(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  nationality: z.string().trim().max(60).default("Not Specified"),
  religion: z.string().trim().max(60).optional(),
  bloodGroup: z.string().trim().max(10).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
  admissionDate: z.coerce.date().default(() => new Date()),
  status: z.enum(["ACTIVE", "INACTIVE", "GRADUATED", "SUSPENDED", "TRANSFERRED", "WITHDRAWN"]).default("ACTIVE"),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const enrollStudentSchema = z.object({
  studentId: z.string().uuid(),
  campusId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  termId: z.string().uuid().optional(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid().optional(),
  rollNumber: z.string().trim().max(20).optional(),
  enrollmentDate: z.coerce.date().default(() => new Date()),
  status: z.enum(["ENROLLED", "PROMOTED", "REPEATING", "TRANSFERRED", "DROPPED"]).default("ENROLLED"),
  remarks: z.string().trim().max(255).optional(),
});

export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;

/**
 * 6. Guardian Schemas
 */
export const createGuardianSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().min(5, "Contact phone is required").max(30),
  alternatePhone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
  occupation: z.string().trim().max(100).optional(),
  relationship: z.enum([
    "FATHER",
    "MOTHER",
    "LEGAL_GUARDIAN",
    "STEP_FATHER",
    "STEP_MOTHER",
    "GRANDPARENT",
    "SIBLING",
    "RELATIVE",
    "OTHER",
  ]).default("OTHER"),
  isPrimary: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(true),
  canPickup: z.boolean().default(true),
});

export type CreateGuardianInput = z.infer<typeof createGuardianSchema>;

/**
 * 7. Staff Schemas
 */
export const createStaffSchema = z.object({
  campusId: z.string().uuid(),
  employeeNumber: z.string().trim().min(2).max(30).toUpperCase(),
  userId: z.string().uuid(),
  departmentId: z.string().uuid().optional(),
  positionId: z.string().uuid().optional(),
  firstName: z.string().trim().min(1).max(60),
  middleName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().min(1).max(60),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  dateOfBirth: z.coerce.date().optional(),
  employmentStatus: z.enum(["ACTIVE", "ON_LEAVE", "SUSPENDED", "TERMINATED", "RESIGNED"]).default("ACTIVE"),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "ADJUNCT", "INTERN"]).default("FULL_TIME"),
  dateJoined: z.coerce.date().default(() => new Date()),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  qualification: z.string().trim().max(150).optional(),
  specialization: z.string().trim().max(150).optional(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/**
 * 8. Attendance Schemas
 */
export const recordStudentAttendanceSchema = z.object({
  studentId: z.string().uuid(),
  campusId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  termId: z.string().uuid().optional(),
  classId: z.string().uuid(),
  sectionId: z.string().uuid().optional(),
  attendanceDate: z.coerce.date(),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"]).default("PRESENT"),
  reason: z.string().trim().max(255).optional(),
  remarks: z.string().trim().max(255).optional(),
});

export type RecordStudentAttendanceInput = z.infer<typeof recordStudentAttendanceSchema>;
