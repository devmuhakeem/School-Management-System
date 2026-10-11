import { z } from "zod";

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const AssessmentTypeEnum = z.enum([
  "ASSIGNMENT",
  "QUIZ",
  "TEST",
  "CONTINUOUS_ASSESSMENT",
  "PROJECT",
  "EXAMINATION",
  "PRACTICAL",
  "OTHER",
]);
export type AssessmentType = z.infer<typeof AssessmentTypeEnum>;

export const AssessmentStatusEnum = z.enum([
  "DRAFT",
  "SCHEDULED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
]);
export type AssessmentStatus = z.infer<typeof AssessmentStatusEnum>;

export const ExamSessionTypeEnum = z.enum([
  "FIRST_TERM",
  "SECOND_TERM",
  "THIRD_TERM",
  "MOCK",
  "ENTRANCE",
  "PROMOTION",
  "MID_TERM",
  "SPECIAL",
  "OTHER",
]);
export type ExamSessionType = z.infer<typeof ExamSessionTypeEnum>;

export const ExamSessionStatusEnum = z.enum([
  "PLANNED",
  "ACTIVE",
  "COMPLETED",
  "ARCHIVED",
]);
export type ExamSessionStatus = z.infer<typeof ExamSessionStatusEnum>;

export const ScoreStatusEnum = z.enum([
  "RECORDED",
  "ABSENT",
  "EXEMPT",
  "MALPRACTICE",
  "INCOMPLETE",
]);
export type ScoreStatus = z.infer<typeof ScoreStatusEnum>;

export const ResultApprovalStatusEnum = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "PUBLISHED",
  "LOCKED",
]);
export type ResultApprovalStatus = z.infer<typeof ResultApprovalStatusEnum>;

// =============================================================================
// GRADING SCHEME VALIDATIONS
// =============================================================================

export const gradeBoundarySchema = z.object({
  grade: z.string().min(1, "Grade symbol is required").max(10),
  minScore: z.number().min(0, "Minimum score cannot be negative").max(100),
  maxScore: z.number().min(0).max(100),
  gradePoint: z.number().min(0).max(10),
  remark: z.string().min(1, "Remark/descriptor is required"),
  isPassing: z.boolean().default(true),
});
export type GradeBoundaryInput = z.infer<typeof gradeBoundarySchema>;

export const createGradingSchemeSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  code: z.string().min(2, "Code must be at least 2 characters").regex(/^[A-Z0-9_-]+$/, "Alphanumeric code only"),
  isDefault: z.boolean().default(false),
  maxGpa: z.number().positive().default(5.0),
  description: z.string().optional(),
  boundaries: z.array(gradeBoundarySchema).min(1, "At least one grade boundary is required"),
});
export type CreateGradingSchemeInput = z.infer<typeof createGradingSchemeSchema>;

// =============================================================================
// ASSESSMENT COMPONENT CONFIG VALIDATIONS
// =============================================================================

export const createComponentConfigSchema = z.object({
  academicYearId: z.string().min(1, "Academic year ID is required"),
  name: z.string().min(2, "Component name is required"),
  code: z.string().min(2, "Component code is required").regex(/^[A-Z0-9_-]+$/, "Alphanumeric code only"),
  maxMarks: z.number().positive("Maximum marks must be greater than zero").default(20),
  weightPercentage: z.number().positive("Weight percentage must be greater than zero").max(100),
  orderIndex: z.number().int().min(1).default(1),
  isRequired: z.boolean().default(true),
});
export type CreateComponentConfigInput = z.infer<typeof createComponentConfigSchema>;

// =============================================================================
// EXAM SESSION VALIDATIONS
// =============================================================================

export const createExamSessionSchema = z.object({
  academicYearId: z.string().min(1, "Academic year ID is required"),
  termId: z.string().optional(),
  name: z.string().min(3, "Exam session name is required"),
  code: z.string().min(2, "Exam session code is required").regex(/^[A-Z0-9_-]+$/, "Alphanumeric code only"),
  sessionType: ExamSessionTypeEnum.default("SECOND_TERM"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD"),
  instructions: z.string().optional(),
});
export type CreateExamSessionInput = z.infer<typeof createExamSessionSchema>;

export const updateExamSessionSchema = createExamSessionSchema.partial().extend({
  status: ExamSessionStatusEnum.optional(),
});
export type UpdateExamSessionInput = z.infer<typeof updateExamSessionSchema>;

// =============================================================================
// EXAM SCHEDULE (TIMETABLE) VALIDATIONS
// =============================================================================

export const createExamScheduleSchema = z.object({
  examSessionId: z.string().min(1, "Exam session ID is required"),
  subjectId: z.string().min(1, "Subject ID is required"),
  classId: z.string().min(1, "Class ID is required"),
  sectionId: z.string().optional().nullable(),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Exam date must be YYYY-MM-DD"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Start time must be HH:MM format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "End time must be HH:MM format"),
  roomId: z.string().optional().nullable(),
  primaryInvigilatorId: z.string().optional().nullable(),
  assistantInvigilatorIds: z.array(z.string()).default([]),
  maxCapacity: z.number().int().positive().default(40),
  notes: z.string().optional().nullable(),
});
export type CreateExamScheduleInput = z.infer<typeof createExamScheduleSchema>;

export const checkScheduleConflictSchema = z.object({
  examSessionId: z.string().min(1),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  classId: z.string().min(1),
  sectionId: z.string().optional().nullable(),
  subjectId: z.string().min(1),
  roomId: z.string().optional().nullable(),
  primaryInvigilatorId: z.string().optional().nullable(),
  excludeScheduleId: z.string().optional().nullable(),
});
export type CheckScheduleConflictInput = z.infer<typeof checkScheduleConflictSchema>;

// =============================================================================
// ASSESSMENT CREATION & MANAGEMENT
// =============================================================================

export const createAssessmentSchema = z.object({
  academicYearId: z.string().min(1, "Academic year ID is required"),
  termId: z.string().optional().nullable(),
  classId: z.string().min(1, "Class ID is required"),
  sectionId: z.string().optional().nullable(),
  subjectId: z.string().min(1, "Subject ID is required"),
  teachingGroupId: z.string().optional().nullable(),
  examSessionId: z.string().optional().nullable(),
  name: z.string().min(3, "Assessment name is required"),
  code: z.string().min(2, "Assessment code is required").regex(/^[A-Z0-9_-]+$/, "Alphanumeric code only"),
  type: AssessmentTypeEnum.default("CONTINUOUS_ASSESSMENT"),
  maxScore: z.number().positive("Max score must be greater than zero").default(20.0),
  weight: z.number().positive("Weight must be greater than zero").max(100).default(20.0),
  assessmentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Assessment date must be YYYY-MM-DD"),
  startTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  status: AssessmentStatusEnum.default("SCHEDULED"),
  instructions: z.string().optional().nullable(),
});
export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

// =============================================================================
// SCORE RECORDING & BULK ENTRY
// =============================================================================

export const studentScoreEntrySchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  scoreObtained: z.number().min(0, "Score cannot be negative"),
  status: ScoreStatusEnum.default("RECORDED"),
  remarks: z.string().optional().nullable(),
});
export type StudentScoreEntry = z.infer<typeof studentScoreEntrySchema>;

export const bulkRecordScoresSchema = z.object({
  assessmentId: z.string().min(1, "Assessment ID is required"),
  scores: z.array(studentScoreEntrySchema).min(1, "At least one score entry is required"),
});
export type BulkRecordScoresInput = z.infer<typeof bulkRecordScoresSchema>;

export const correctScoreSchema = z.object({
  scoreId: z.string().min(1, "Score record ID is required"),
  newScore: z.number().min(0, "Score cannot be negative"),
  newStatus: ScoreStatusEnum.default("RECORDED"),
  correctionReason: z.string().min(5, "A descriptive correction reason is mandatory"),
});
export type CorrectScoreInput = z.infer<typeof correctScoreSchema>;

// =============================================================================
// RESULTS COMPUTATION & GOVERNANCE
// =============================================================================

export const computeResultsSchema = z.object({
  academicYearId: z.string().min(1, "Academic year ID is required"),
  termId: z.string().min(1, "Term ID is required"),
  classId: z.string().min(1, "Class ID is required"),
  sectionId: z.string().optional().nullable(),
  gradingSchemeId: z.string().optional().nullable(),
});
export type ComputeResultsInput = z.infer<typeof computeResultsSchema>;

export const reviewResultsSchema = z.object({
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  classId: z.string().min(1),
  sectionId: z.string().optional().nullable(),
  action: z.enum(["SUBMIT", "APPROVE", "PUBLISH", "LOCK", "UNLOCK"]),
  notes: z.string().optional().nullable(),
  teacherRemarks: z.record(z.string(), z.string()).optional(), // studentId -> comment
  principalRemarks: z.record(z.string(), z.string()).optional(), // studentId -> comment
  nextTermResumesDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
});
export type ReviewResultsInput = z.infer<typeof reviewResultsSchema>;

export const getReportCardQuerySchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
  termId: z.string().min(1, "Term ID is required"),
  classId: z.string().optional(),
});
export type GetReportCardQuery = z.infer<typeof getReportCardQuerySchema>;
