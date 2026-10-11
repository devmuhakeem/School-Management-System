import { z } from "zod";

/**
 * Enums matching Prisma domain model for Phase 6
 */
export const SubjectRuleTypeEnum = z.enum(["CORE", "ELECTIVE", "OPTIONAL"]);

export const DayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

export const RoomTypeEnum = z.enum([
  "CLASSROOM",
  "SCIENCE_LAB",
  "ICT_LAB",
  "ART_STUDIO",
  "LIBRARY",
  "AUDITORIUM",
  "SPORTS_FACILITY",
  "WORKSHOP",
]);

export const CurriculumTypeEnum = z.enum([
  "NATIONAL",
  "BRITISH",
  "CAMBRIDGE",
  "MONTESSORI",
  "INTERNATIONAL_BACCALAUREATE",
  "CUSTOM",
]);

/**
 * 1. Curriculum Validation Schemas
 */
export const createCurriculumSchema = z.object({
  name: z.string().trim().min(2, "Curriculum name is required").max(100),
  code: z.string().trim().min(2, "Code is required").max(25).toUpperCase(),
  type: CurriculumTypeEnum.default("NATIONAL"),
  version: z.string().trim().min(1).max(20).default("1.0"),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const updateCurriculumSchema = createCurriculumSchema.partial();

export type CreateCurriculumInput = z.infer<typeof createCurriculumSchema>;
export type UpdateCurriculumInput = z.infer<typeof updateCurriculumSchema>;

/**
 * 2. Subject Combination / Stream Schemas
 */
export const createSubjectCombinationSchema = z.object({
  campusId: z.string().min(1, "Campus ID is required"),
  name: z.string().trim().min(2, "Combination name is required").max(100),
  code: z.string().trim().min(2, "Code is required").max(25).toUpperCase(),
  stream: z.string().trim().min(2, "Stream category is required").max(60), // e.g. "Science", "Arts", "Commercial"
  description: z.string().trim().max(500).optional().or(z.literal("")),
  compulsorySubjectIds: z.array(z.string()).default([]),
  electiveSubjectIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export const updateSubjectCombinationSchema = createSubjectCombinationSchema.partial();

export type CreateSubjectCombinationInput = z.infer<typeof createSubjectCombinationSchema>;
export type UpdateSubjectCombinationInput = z.infer<typeof updateSubjectCombinationSchema>;

/**
 * 3. Class Subject Allocation Schemas
 */
export const createClassSubjectSchema = z.object({
  campusId: z.string().min(1, "Campus is required"),
  academicYearId: z.string().min(1, "Academic Year is required"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional().or(z.literal("")),
  subjectId: z.string().min(1, "Subject is required"),
  ruleType: SubjectRuleTypeEnum.default("CORE"),
  creditUnits: z.number().int().min(0).max(20).default(1),
  periodsPerWeek: z.number().int().min(1, "Must have at least 1 period per week").max(25).default(4),
  syllabusNotes: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export const updateClassSubjectSchema = createClassSubjectSchema.partial();

export type CreateClassSubjectInput = z.infer<typeof createClassSubjectSchema>;
export type UpdateClassSubjectInput = z.infer<typeof updateClassSubjectSchema>;

/**
 * 4. Teacher Subject Assignment Schemas
 */
export const createTeachingAssignmentSchema = z.object({
  campusId: z.string().min(1, "Campus is required"),
  academicYearId: z.string().min(1, "Academic Year is required"),
  termId: z.string().optional().or(z.literal("")),
  staffId: z.string().min(1, "Teacher / Staff is required"),
  subjectId: z.string().min(1, "Subject is required"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional().or(z.literal("")),
  periodsPerWeek: z.number().int().min(1).max(30).default(4),
});

export const updateTeachingAssignmentSchema = createTeachingAssignmentSchema.partial();

export type CreateTeachingAssignmentInput = z.infer<typeof createTeachingAssignmentSchema>;
export type UpdateTeachingAssignmentInput = z.infer<typeof updateTeachingAssignmentSchema>;

/**
 * 5. Class / Form Teacher Allocation Schema
 */
export const assignClassTeacherSchema = z.object({
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional().or(z.literal("")),
  staffId: z.string().min(1, "Teacher is required"),
  roleTitle: z.enum(["CLASS_TEACHER", "SECTION_TEACHER", "FORM_TEACHER"]).default("CLASS_TEACHER"),
});

export type AssignClassTeacherInput = z.infer<typeof assignClassTeacherSchema>;

/**
 * 6. Lesson Period (Bell Schedule) Schemas
 */
export const createLessonPeriodSchema = z.object({
  campusId: z.string().min(1, "Campus is required"),
  periodNumber: z.number().int().min(1).max(20),
  name: z.string().trim().min(2, "Period name is required").max(60),
  startTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be in HH:MM format (24-hour)"),
  endTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be in HH:MM format (24-hour)"),
  isBreak: z.boolean().default(false),
  daysActive: z
    .array(DayOfWeekEnum)
    .min(1, "Must select at least one active day")
    .default(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"]),
}).refine(
  (data) => {
    const [startH, startM] = data.startTime.split(":").map(Number);
    const [endH, endM] = data.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return endMinutes > startMinutes;
  },
  {
    message: "End time must occur after start time",
    path: ["endTime"],
  }
);

export const updateLessonPeriodSchema = z.object({
  periodNumber: z.number().int().min(1).max(20).optional(),
  name: z.string().trim().min(2).max(60).optional(),
  startTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Start time must be HH:MM")
    .optional(),
  endTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "End time must be HH:MM")
    .optional(),
  isBreak: z.boolean().optional(),
  daysActive: z.array(DayOfWeekEnum).optional(),
});

export type CreateLessonPeriodInput = z.infer<typeof createLessonPeriodSchema>;
export type UpdateLessonPeriodInput = z.infer<typeof updateLessonPeriodSchema>;

/**
 * 7. Room Facility Schemas
 */
export const createClassroomRoomSchema = z.object({
  campusId: z.string().min(1, "Campus is required"),
  name: z.string().trim().min(2, "Room name is required").max(60),
  code: z.string().trim().min(1, "Room code is required").max(20).toUpperCase(),
  building: z.string().trim().max(60).optional().or(z.literal("")),
  roomType: RoomTypeEnum.default("CLASSROOM"),
  capacity: z.number().int().min(1).max(500).default(35),
  isAvailable: z.boolean().default(true),
});

export const updateClassroomRoomSchema = createClassroomRoomSchema.partial();

export type CreateClassroomRoomInput = z.infer<typeof createClassroomRoomSchema>;
export type UpdateClassroomRoomInput = z.infer<typeof updateClassroomRoomSchema>;

/**
 * 8. Timetable Lesson Slot Schemas & Conflict Detection Input
 */
export const createTimetableLessonSchema = z.object({
  campusId: z.string().min(1, "Campus is required"),
  academicYearId: z.string().min(1, "Academic Year is required"),
  termId: z.string().optional().or(z.literal("")),
  dayOfWeek: DayOfWeekEnum,
  periodId: z.string().min(1, "Period is required"),
  subjectId: z.string().min(1, "Subject is required"),
  staffId: z.string().min(1, "Teacher is required"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional().or(z.literal("")),
  roomId: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(255).optional().or(z.literal("")),
});

export const updateTimetableLessonSchema = createTimetableLessonSchema.partial();

export type CreateTimetableLessonInput = z.infer<typeof createTimetableLessonSchema>;
export type UpdateTimetableLessonInput = z.infer<typeof updateTimetableLessonSchema>;

export const timetableConflictCheckSchema = z.object({
  campusId: z.string().min(1),
  academicYearId: z.string().min(1),
  dayOfWeek: DayOfWeekEnum,
  periodId: z.string().min(1),
  staffId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().optional().or(z.literal("")),
  roomId: z.string().optional().or(z.literal("")),
  excludeLessonId: z.string().optional().or(z.literal("")),
});

export type TimetableConflictCheckInput = z.infer<typeof timetableConflictCheckSchema>;

/**
 * 9. Teaching Group Schemas
 */
export const createTeachingGroupSchema = z.object({
  campusId: z.string().min(1, "Campus is required"),
  academicYearId: z.string().min(1, "Academic Year is required"),
  termId: z.string().optional().or(z.literal("")),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional().or(z.literal("")),
  subjectId: z.string().min(1, "Subject is required"),
  staffId: z.string().min(1, "Teacher is required"),
  name: z.string().trim().min(2, "Teaching group name is required").max(80),
  code: z.string().trim().min(2, "Code is required").max(30).toUpperCase(),
  maxCapacity: z.number().int().min(1).max(200).default(40),
});

export const updateTeachingGroupSchema = createTeachingGroupSchema.partial();

export type CreateTeachingGroupInput = z.infer<typeof createTeachingGroupSchema>;
export type UpdateTeachingGroupInput = z.infer<typeof updateTeachingGroupSchema>;
