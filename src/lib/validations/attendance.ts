import { z } from "zod";

export const AttendanceStatusEnum = z.enum([
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
  "HALF_DAY",
  "LEFT_EARLY",
  "SUSPENDED",
]);

export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>;

export const AttendanceTypeEnum = z.enum(["DAILY", "LESSON"]);
export type AttendanceType = z.infer<typeof AttendanceTypeEnum>;

export const AbsenceReasonEnum = z.enum([
  "SICK",
  "MEDICAL_APPOINTMENT",
  "FAMILY_EMERGENCY",
  "APPROVED_ABSENCE",
  "UNEXCUSED",
  "BEREAVEMENT",
  "OFFICIAL_SCHOOL_DUTY",
  "OTHER",
]);

export type AbsenceReason = z.infer<typeof AbsenceReasonEnum>;

/**
 * Single Student Attendance Recording Schema
 */
export const recordSingleAttendanceSchema = z.object({
  campusId: z.string().min(1, "Campus ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
  termId: z.string().optional().nullable(),
  classId: z.string().min(1, "Class ID is required"),
  sectionId: z.string().optional().nullable(),
  teachingGroupId: z.string().optional().nullable(),
  lessonId: z.string().optional().nullable(),
  studentId: z.string().min(1, "Student ID is required"),
  attendanceType: AttendanceTypeEnum.default("DAILY"),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  status: AttendanceStatusEnum.default("PRESENT"),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Arrival time must be HH:MM").optional().nullable(),
  reason: z.string().max(255).optional().nullable(),
  remarks: z.string().max(500).optional().nullable(),
});

export type RecordSingleAttendanceInput = z.infer<typeof recordSingleAttendanceSchema>;

/**
 * Student Attendance Item in Bulk Request
 */
export const bulkAttendanceItemSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  status: AttendanceStatusEnum.default("PRESENT"),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Arrival time must be HH:MM").optional().nullable(),
  reason: z.string().max(255).optional().nullable(),
  remarks: z.string().max(500).optional().nullable(),
});

export type BulkAttendanceItem = z.infer<typeof bulkAttendanceItemSchema>;

/**
 * Bulk Attendance Submission Schema
 */
export const bulkMarkAttendanceSchema = z.object({
  campusId: z.string().min(1, "Campus ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
  termId: z.string().optional().nullable(),
  classId: z.string().min(1, "Class ID is required"),
  sectionId: z.string().optional().nullable(),
  teachingGroupId: z.string().optional().nullable(),
  lessonId: z.string().optional().nullable(),
  attendanceType: AttendanceTypeEnum.default("DAILY"),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  records: z.array(bulkAttendanceItemSchema).min(1, "At least one student attendance record is required"),
});

export type BulkMarkAttendanceInput = z.infer<typeof bulkMarkAttendanceSchema>;

/**
 * Attendance Correction Schema
 */
export const correctAttendanceSchema = z.object({
  status: AttendanceStatusEnum,
  correctionReason: z.string().trim().min(3, "Correction reason must be at least 3 characters").max(500),
  reason: z.string().max(255).optional().nullable(),
  remarks: z.string().max(500).optional().nullable(),
  arrivalTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Arrival time must be HH:MM").optional().nullable(),
});

export type CorrectAttendanceInput = z.infer<typeof correctAttendanceSchema>;

/**
 * Excuse Absence Schema
 */
export const excuseAbsenceSchema = z.object({
  isExcused: z.boolean().default(true),
  excuseReason: z.string().trim().min(3, "Reason for excusing absence must be provided").max(500),
  remarks: z.string().max(500).optional().nullable(),
});

export type ExcuseAbsenceInput = z.infer<typeof excuseAbsenceSchema>;

/**
 * Lock / Unlock Register Schema
 */
export const lockAttendanceSchema = z.object({
  campusId: z.string().min(1, "Campus ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
  classId: z.string().min(1, "Class ID is required"),
  sectionId: z.string().optional().nullable(),
  teachingGroupId: z.string().optional().nullable(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  attendanceType: AttendanceTypeEnum.default("DAILY"),
  isLocked: z.boolean().default(true),
  lockNotes: z.string().max(255).optional().nullable(),
});

export type LockAttendanceInput = z.infer<typeof lockAttendanceSchema>;

/**
 * Filter / Query Schema for Loading Class Register
 */
export const getAttendanceRegisterQuerySchema = z.object({
  campusId: z.string().optional(),
  academicYearId: z.string().optional(),
  termId: z.string().optional(),
  classId: z.string().min(1, "Class ID is required"),
  sectionId: z.string().optional(),
  teachingGroupId: z.string().optional(),
  lessonId: z.string().optional(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  attendanceType: AttendanceTypeEnum.default("DAILY"),
});

export type GetAttendanceRegisterQuery = z.infer<typeof getAttendanceRegisterQuerySchema>;
