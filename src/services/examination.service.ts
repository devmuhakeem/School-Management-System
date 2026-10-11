import { prisma } from "@/lib/db";
import { TenantContext } from "@/repositories/types";
import { auditRepository } from "@/repositories/audit.repository";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  CreateGradingSchemeInput,
  GradeBoundaryInput,
  CreateComponentConfigInput,
  CreateExamSessionInput,
  UpdateExamSessionInput,
  CreateExamScheduleInput,
  CheckScheduleConflictInput,
  CreateAssessmentInput,
  BulkRecordScoresInput,
  CorrectScoreInput,
  ComputeResultsInput,
  ReviewResultsInput,
  AssessmentType,
  AssessmentStatus,
  ExamSessionType,
  ExamSessionStatus,
  ScoreStatus,
  ResultApprovalStatus,
} from "@/lib/validations/examination";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "./admin.service";
import { attendanceService } from "./attendance.service";

// =============================================================================
// DOMAIN RECORD INTERFACES
// =============================================================================

export interface GradingSchemeRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  code: string;
  isDefault: boolean;
  maxGpa: number;
  description?: string | null;
  boundaries: GradeBoundaryInput[];
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentComponentConfigRecord {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  name: string;
  code: string;
  maxMarks: number;
  weightPercentage: number;
  orderIndex: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExamSessionRecord {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  termId?: string | null;
  name: string;
  code: string;
  sessionType: ExamSessionType;
  startDate: string;
  endDate: string;
  status: ExamSessionStatus;
  instructions?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExamScheduleRecord {
  id: string;
  organizationId: string;
  campusId: string;
  examSessionId: string;
  subjectId: string;
  classId: string;
  sectionId?: string | null;
  examDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  roomId?: string | null;
  primaryInvigilatorId?: string | null;
  assistantInvigilatorIds: string[];
  maxCapacity: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentRecord {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  termId?: string | null;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  teachingGroupId?: string | null;
  examSessionId?: string | null;
  name: string;
  code: string;
  type: AssessmentType;
  maxScore: number;
  weight: number;
  assessmentDate: string; // YYYY-MM-DD
  startTime?: string | null;
  endTime?: string | null;
  status: AssessmentStatus;
  instructions?: string | null;
  createdById?: string | null;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentAssessmentScoreRecord {
  id: string;
  organizationId: string;
  campusId: string;
  assessmentId: string;
  studentId: string;
  scoreObtained: number;
  maxScore: number;
  percentage: number;
  grade?: string | null;
  gradePoint?: number | null;
  status: ScoreStatus;
  remarks?: string | null;
  enteredById?: string | null;
  enteredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScoreCorrectionRecord {
  id: string;
  organizationId: string;
  scoreId: string;
  studentId: string;
  previousScore: number;
  newScore: number;
  previousStatus: ScoreStatus;
  newStatus: ScoreStatus;
  correctionReason: string;
  correctedById: string;
  createdAt: string;
}

export interface SubjectTermResultRecord {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  termId: string;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  studentId: string;
  caScore: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  subjectRank?: number | null;
  classAverage?: number | null;
  status: ResultApprovalStatus;
  isPassing: boolean;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentTermSummaryRecord {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  termId: string;
  classId: string;
  sectionId?: string | null;
  studentId: string;
  totalMarksObtained: number;
  totalMarksPossible: number;
  averagePercentage: number;
  gpa: number;
  classRank?: number | null;
  totalStudents?: number | null;
  subjectsCount: number;
  subjectsPassed: number;
  subjectsFailed: number;
  attendanceTotalDays?: number | null;
  attendancePresentDays?: number | null;
  attendanceAbsentDays?: number | null;
  attendancePercentage?: number | null;
  status: ResultApprovalStatus;
  teacherRemarks?: string | null;
  principalRemarks?: string | null;
  nextTermResumesDate?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  publishedById?: string | null;
  publishedAt?: string | null;
  lockedById?: string | null;
  lockedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// SEED STATE FOR UNIT TESTS & PERSISTENCE RESILIENCE
// =============================================================================

interface InMemoryExamState {
  gradingSchemes: GradingSchemeRecord[];
  componentConfigs: AssessmentComponentConfigRecord[];
  examSessions: ExamSessionRecord[];
  examSchedules: ExamScheduleRecord[];
  assessments: AssessmentRecord[];
  scores: StudentAssessmentScoreRecord[];
  corrections: ScoreCorrectionRecord[];
  subjectResults: SubjectTermResultRecord[];
  termSummaries: StudentTermSummaryRecord[];
}

function initializeExamState(): InMemoryExamState {
  const defaultBoundaries: GradeBoundaryInput[] = [
    { grade: "A1", minScore: 75, maxScore: 100, gradePoint: 5.0, remark: "Distinction", isPassing: true },
    { grade: "B2", minScore: 70, maxScore: 74, gradePoint: 4.5, remark: "Very Good", isPassing: true },
    { grade: "B3", minScore: 65, maxScore: 69, gradePoint: 4.0, remark: "Good", isPassing: true },
    { grade: "C4", minScore: 60, maxScore: 64, gradePoint: 3.5, remark: "Credit", isPassing: true },
    { grade: "C5", minScore: 55, maxScore: 59, gradePoint: 3.0, remark: "Credit", isPassing: true },
    { grade: "C6", minScore: 50, maxScore: 54, gradePoint: 2.5, remark: "Credit", isPassing: true },
    { grade: "D7", minScore: 45, maxScore: 49, gradePoint: 2.0, remark: "Pass", isPassing: true },
    { grade: "E8", minScore: 40, maxScore: 44, gradePoint: 1.5, remark: "Fair", isPassing: true },
    { grade: "F9", minScore: 0, maxScore: 39, gradePoint: 0.0, remark: "Fail", isPassing: false },
  ];

  const cambridgeBoundaries: GradeBoundaryInput[] = [
    { grade: "A*", minScore: 90, maxScore: 100, gradePoint: 5.0, remark: "Outstanding", isPassing: true },
    { grade: "A", minScore: 80, maxScore: 89, gradePoint: 4.5, remark: "Excellent", isPassing: true },
    { grade: "B", minScore: 70, maxScore: 79, gradePoint: 4.0, remark: "Very Good", isPassing: true },
    { grade: "C", minScore: 60, maxScore: 69, gradePoint: 3.0, remark: "Good / Credit", isPassing: true },
    { grade: "D", minScore: 50, maxScore: 59, gradePoint: 2.0, remark: "Moderate", isPassing: true },
    { grade: "E", minScore: 40, maxScore: 49, gradePoint: 1.0, remark: "Pass", isPassing: true },
    { grade: "U", minScore: 0, maxScore: 39, gradePoint: 0.0, remark: "Ungraded", isPassing: false },
  ];

  const gpa4Boundaries: GradeBoundaryInput[] = [
    { grade: "A", minScore: 70, maxScore: 100, gradePoint: 4.0, remark: "Distinction", isPassing: true },
    { grade: "B", minScore: 60, maxScore: 69, gradePoint: 3.0, remark: "Very Good", isPassing: true },
    { grade: "C", minScore: 50, maxScore: 59, gradePoint: 2.0, remark: "Good", isPassing: true },
    { grade: "D", minScore: 45, maxScore: 49, gradePoint: 1.0, remark: "Pass", isPassing: true },
    { grade: "F", minScore: 0, maxScore: 44, gradePoint: 0.0, remark: "Fail", isPassing: false },
  ];

  return {
    gradingSchemes: [
      {
        id: "sch-waec-01",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Standard Secondary WAEC / WASSCE 9-Point Scale",
        code: "GRADE-WAEC-9",
        isDefault: true,
        maxGpa: 5.0,
        description: "Standard West African Examinations Council 9-point grading scale with A1-F9 brackets",
        boundaries: defaultBoundaries,
        createdAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "sch-camb-01",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Cambridge IGCSE Letter Scale",
        code: "GRADE-CAMBRIDGE",
        isDefault: false,
        maxGpa: 5.0,
        description: "Cambridge Assessment International Education 8-point grading scheme (A* to U)",
        boundaries: cambridgeBoundaries,
        createdAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "sch-gpa4-01",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Standard 4.0 GPA Academic Scale",
        code: "GRADE-GPA-4",
        isDefault: false,
        maxGpa: 4.0,
        description: "Collegiate 4.0 maximum Grade Point Average scale",
        boundaries: gpa4Boundaries,
        createdAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-09-01T08:00:00.000Z",
      },
    ],
    componentConfigs: [
      {
        id: "cfg-ca1",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        name: "First Continuous Assessment (CA1)",
        code: "CA1",
        maxMarks: 20,
        weightPercentage: 20,
        orderIndex: 1,
        isRequired: true,
        createdAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "cfg-ca2",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        name: "Second Continuous Assessment & Midterm (CA2)",
        code: "CA2",
        maxMarks: 20,
        weightPercentage: 20,
        orderIndex: 2,
        isRequired: true,
        createdAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: "cfg-exam",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        name: "Terminal Examination",
        code: "EXAM",
        maxMarks: 60,
        weightPercentage: 60,
        orderIndex: 3,
        isRequired: true,
        createdAt: "2026-09-01T08:00:00.000Z",
        updatedAt: "2026-09-01T08:00:00.000Z",
      },
    ],
    examSessions: [
      {
        id: "sess-2526-t2",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        name: "2025/2026 Second Term Terminal Examinations",
        code: "EXAM-2526-T2",
        sessionType: "SECOND_TERM",
        startDate: "2026-10-12",
        endDate: "2026-10-23",
        status: "ACTIVE",
        instructions: "All students must report to designated examination halls 15 minutes before commencement.",
        createdAt: "2026-09-10T08:00:00.000Z",
        updatedAt: "2026-09-10T08:00:00.000Z",
      },
    ],
    examSchedules: [
      {
        id: "esch-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        examSessionId: "sess-2526-t2",
        subjectId: "sub-math-01", // Mathematics
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        examDate: "2026-10-12",
        startTime: "09:00",
        endTime: "11:00",
        roomId: "room-101",
        primaryInvigilatorId: "stf-002", // Mr. Robert Mensah
        assistantInvigilatorIds: ["stf-003"],
        maxCapacity: 35,
        notes: "Scientific calculators permitted. Graph sheets provided by invigilator.",
        createdAt: "2026-09-15T08:00:00.000Z",
        updatedAt: "2026-09-15T08:00:00.000Z",
      },
      {
        id: "esch-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        examSessionId: "sess-2526-t2",
        subjectId: "sub-eng-01", // English Language
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        examDate: "2026-10-13",
        startTime: "09:00",
        endTime: "11:30",
        roomId: "room-101",
        primaryInvigilatorId: "stf-001", // Dr. Sarah Jenkins
        assistantInvigilatorIds: [],
        maxCapacity: 35,
        notes: "Section 1 Comprehension (45m), Section 2 Essay (1h15m)",
        createdAt: "2026-09-15T08:00:00.000Z",
        updatedAt: "2026-09-15T08:00:00.000Z",
      },
    ],
    assessments: [
      {
        id: "asm-math-ca1",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        subjectId: "sub-math-01",
        teachingGroupId: "tg-jss1a-math",
        name: "Continuous Assessment 1: Linear Equations & Angles",
        code: "CA1-MTH-J1A",
        type: "CONTINUOUS_ASSESSMENT",
        maxScore: 20,
        weight: 20,
        assessmentDate: "2026-09-22",
        startTime: "09:00",
        endTime: "09:45",
        status: "COMPLETED",
        instructions: "Show all mathematical working clearly.",
        createdById: "stf-001",
        createdAt: "2026-09-18T08:00:00.000Z",
        updatedAt: "2026-09-22T10:00:00.000Z",
      },
      {
        id: "asm-math-ca2",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        subjectId: "sub-math-01",
        teachingGroupId: "tg-jss1a-math",
        name: "Continuous Assessment 2: Statistics & Probability Project",
        code: "CA2-MTH-J1A",
        type: "PROJECT",
        maxScore: 20,
        weight: 20,
        assessmentDate: "2026-10-02",
        startTime: "10:00",
        endTime: "11:00",
        status: "COMPLETED",
        instructions: "Submit empirical frequency table and analysis.",
        createdById: "stf-001",
        createdAt: "2026-09-25T08:00:00.000Z",
        updatedAt: "2026-10-02T12:00:00.000Z",
      },
      {
        id: "asm-math-exam",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        subjectId: "sub-math-01",
        teachingGroupId: "tg-jss1a-math",
        examSessionId: "sess-2526-t2",
        name: "Second Term Mathematics Terminal Examination",
        code: "EXAM-MTH-J1A",
        type: "EXAMINATION",
        maxScore: 60,
        weight: 60,
        assessmentDate: "2026-10-12",
        startTime: "09:00",
        endTime: "11:00",
        status: "COMPLETED",
        instructions: "Answer all 40 objective questions and 4 theory problems.",
        createdById: "stf-001",
        createdAt: "2026-10-05T08:00:00.000Z",
        updatedAt: "2026-10-12T14:00:00.000Z",
      },
    ],
    scores: [
      // Zainab Al-Mansoor (stu-demo-01) - Top student
      {
        id: "sc-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        assessmentId: "asm-math-ca1",
        studentId: "stu-demo-01",
        scoreObtained: 19,
        maxScore: 20,
        percentage: 95,
        grade: "A1",
        gradePoint: 5.0,
        status: "RECORDED",
        remarks: "Exemplary precision",
        enteredById: "stf-001",
        enteredAt: "2026-09-22T12:00:00.000Z",
        createdAt: "2026-09-22T12:00:00.000Z",
        updatedAt: "2026-09-22T12:00:00.000Z",
      },
      {
        id: "sc-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        assessmentId: "asm-math-ca2",
        studentId: "stu-demo-01",
        scoreObtained: 18.5,
        maxScore: 20,
        percentage: 92.5,
        grade: "A1",
        gradePoint: 5.0,
        status: "RECORDED",
        remarks: "Outstanding data presentation",
        enteredById: "stf-001",
        enteredAt: "2026-10-02T14:00:00.000Z",
        createdAt: "2026-10-02T14:00:00.000Z",
        updatedAt: "2026-10-02T14:00:00.000Z",
      },
      {
        id: "sc-003",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        assessmentId: "asm-math-exam",
        studentId: "stu-demo-01",
        scoreObtained: 55,
        maxScore: 60,
        percentage: 91.67,
        grade: "A1",
        gradePoint: 5.0,
        status: "RECORDED",
        remarks: "First in class",
        enteredById: "stf-001",
        enteredAt: "2026-10-13T10:00:00.000Z",
        createdAt: "2026-10-13T10:00:00.000Z",
        updatedAt: "2026-10-13T10:00:00.000Z",
      },

      // Chukwudi Okafor (stu-demo-02)
      {
        id: "sc-004",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        assessmentId: "asm-math-ca1",
        studentId: "stu-demo-02",
        scoreObtained: 15,
        maxScore: 20,
        percentage: 75,
        grade: "A1",
        gradePoint: 5.0,
        status: "RECORDED",
        remarks: "Good conceptual clarity",
        enteredById: "stf-001",
        enteredAt: "2026-09-22T12:00:00.000Z",
        createdAt: "2026-09-22T12:00:00.000Z",
        updatedAt: "2026-09-22T12:00:00.000Z",
      },
      {
        id: "sc-005",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        assessmentId: "asm-math-ca2",
        studentId: "stu-demo-02",
        scoreObtained: 14,
        maxScore: 20,
        percentage: 70,
        grade: "B2",
        gradePoint: 4.5,
        status: "RECORDED",
        remarks: "Solid effort",
        enteredById: "stf-001",
        enteredAt: "2026-10-02T14:00:00.000Z",
        createdAt: "2026-10-02T14:00:00.000Z",
        updatedAt: "2026-10-02T14:00:00.000Z",
      },
      {
        id: "sc-006",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        assessmentId: "asm-math-exam",
        studentId: "stu-demo-02",
        scoreObtained: 44,
        maxScore: 60,
        percentage: 73.33,
        grade: "B2",
        gradePoint: 4.5,
        status: "RECORDED",
        remarks: "Very commendable performance",
        enteredById: "stf-001",
        enteredAt: "2026-10-13T10:00:00.000Z",
        createdAt: "2026-10-13T10:00:00.000Z",
        updatedAt: "2026-10-13T10:00:00.000Z",
      },

      // Amina Bello (stu-demo-03)
      {
        id: "sc-007",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        assessmentId: "asm-math-ca1",
        studentId: "stu-demo-03",
        scoreObtained: 17,
        maxScore: 20,
        percentage: 85,
        grade: "A1",
        gradePoint: 5.0,
        status: "RECORDED",
        remarks: "Very strong understanding",
        enteredById: "stf-001",
        enteredAt: "2026-09-22T12:00:00.000Z",
        createdAt: "2026-09-22T12:00:00.000Z",
        updatedAt: "2026-09-22T12:00:00.000Z",
      },
      {
        id: "sc-008",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        assessmentId: "asm-math-ca2",
        studentId: "stu-demo-03",
        scoreObtained: 16.5,
        maxScore: 20,
        percentage: 82.5,
        grade: "A1",
        gradePoint: 5.0,
        status: "RECORDED",
        remarks: "Very well structured",
        enteredById: "stf-001",
        enteredAt: "2026-10-02T14:00:00.000Z",
        createdAt: "2026-10-02T14:00:00.000Z",
        updatedAt: "2026-10-02T14:00:00.000Z",
      },
      {
        id: "sc-009",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        assessmentId: "asm-math-exam",
        studentId: "stu-demo-03",
        scoreObtained: 49,
        maxScore: 60,
        percentage: 81.67,
        grade: "A1",
        gradePoint: 5.0,
        status: "RECORDED",
        remarks: "Second in section",
        enteredById: "stf-001",
        enteredAt: "2026-10-13T10:00:00.000Z",
        createdAt: "2026-10-13T10:00:00.000Z",
        updatedAt: "2026-10-13T10:00:00.000Z",
      },
    ],
    corrections: [],
    subjectResults: [
      {
        id: "subres-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        subjectId: "sub-math-01",
        studentId: "stu-demo-01", // Zainab
        caScore: 37.5,
        examScore: 55,
        totalScore: 92.5,
        grade: "A1",
        gradePoint: 5.0,
        subjectRank: 1,
        classAverage: 82.5,
        status: "APPROVED",
        isPassing: true,
        remarks: "Distinction in Mathematics",
        createdAt: "2026-10-15T08:00:00.000Z",
        updatedAt: "2026-10-15T08:00:00.000Z",
      },
      {
        id: "subres-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        subjectId: "sub-math-01",
        studentId: "stu-demo-03", // Amina
        caScore: 33.5,
        examScore: 49,
        totalScore: 82.5,
        grade: "A1",
        gradePoint: 5.0,
        subjectRank: 2,
        classAverage: 82.5,
        status: "APPROVED",
        isPassing: true,
        remarks: "Excellent problem solving ability",
        createdAt: "2026-10-15T08:00:00.000Z",
        updatedAt: "2026-10-15T08:00:00.000Z",
      },
      {
        id: "subres-003",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        subjectId: "sub-math-01",
        studentId: "stu-demo-02", // Chukwudi
        caScore: 29.0,
        examScore: 44,
        totalScore: 73.0,
        grade: "B2",
        gradePoint: 4.5,
        subjectRank: 3,
        classAverage: 82.5,
        status: "APPROVED",
        isPassing: true,
        remarks: "Very good progress made",
        createdAt: "2026-10-15T08:00:00.000Z",
        updatedAt: "2026-10-15T08:00:00.000Z",
      },
      {
        id: "subres-004",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        subjectId: "sub-math-01",
        studentId: "stu-001", // Lucas Wright
        caScore: 38.0,
        examScore: 54,
        totalScore: 92.0,
        grade: "A1",
        gradePoint: 5.0,
        subjectRank: 1,
        classAverage: 82.0,
        status: "PUBLISHED",
        isPassing: true,
        remarks: "Exceptional mastery of mathematical concepts",
        createdAt: "2026-10-15T08:00:00.000Z",
        updatedAt: "2026-10-15T08:00:00.000Z",
      },
      {
        id: "subres-005",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        subjectId: "sub-eng-01",
        studentId: "stu-001", // Lucas Wright
        caScore: 36.0,
        examScore: 52,
        totalScore: 88.0,
        grade: "A1",
        gradePoint: 5.0,
        subjectRank: 2,
        classAverage: 80.0,
        status: "PUBLISHED",
        isPassing: true,
        remarks: "High proficiency in analytical essay writing",
        createdAt: "2026-10-15T08:00:00.000Z",
        updatedAt: "2026-10-15T08:00:00.000Z",
      },
      {
        id: "subres-006",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-b",
        subjectId: "sub-sci-01",
        studentId: "stu-005", // Devin Wright
        caScore: 35.0,
        examScore: 50,
        totalScore: 85.0,
        grade: "A1",
        gradePoint: 5.0,
        subjectRank: 2,
        classAverage: 78.0,
        status: "PUBLISHED",
        isPassing: true,
        remarks: "Active laboratory inquiry and sound reasoning",
        createdAt: "2026-10-15T08:00:00.000Z",
        updatedAt: "2026-10-15T08:00:00.000Z",
      },
    ],
    termSummaries: [
      {
        id: "sum-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        studentId: "stu-demo-01", // Zainab
        totalMarksObtained: 92.5,
        totalMarksPossible: 100,
        averagePercentage: 92.5,
        gpa: 5.0,
        classRank: 1,
        totalStudents: 3,
        subjectsCount: 1,
        subjectsPassed: 1,
        subjectsFailed: 0,
        attendanceTotalDays: 60,
        attendancePresentDays: 59,
        attendanceAbsentDays: 1,
        attendancePercentage: 98.3,
        status: "APPROVED",
        teacherRemarks: "An outstanding scholar with keen inquisitive intellect. Keep up the high standard.",
        principalRemarks: "Remarkable performance. Zainab represents the ideal academic ethos of SchoolOS.",
        nextTermResumesDate: "2027-01-11",
        approvedById: "u-principal-01",
        approvedAt: "2026-10-16T10:00:00.000Z",
        createdAt: "2026-10-15T08:00:00.000Z",
        updatedAt: "2026-10-16T10:00:00.000Z",
      },
      {
        id: "sum-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        studentId: "stu-demo-03", // Amina
        totalMarksObtained: 82.5,
        totalMarksPossible: 100,
        averagePercentage: 82.5,
        gpa: 5.0,
        classRank: 2,
        totalStudents: 3,
        subjectsCount: 1,
        subjectsPassed: 1,
        subjectsFailed: 0,
        attendanceTotalDays: 60,
        attendancePresentDays: 58,
        attendanceAbsentDays: 2,
        attendancePercentage: 96.7,
        status: "APPROVED",
        teacherRemarks: "Consistently dedicated, active participant in class discussions.",
        principalRemarks: "Very commendable performance. Recommended for academic honors list.",
        nextTermResumesDate: "2027-01-11",
        approvedById: "u-principal-01",
        approvedAt: "2026-10-16T10:00:00.000Z",
        createdAt: "2026-10-15T08:00:00.000Z",
        updatedAt: "2026-10-16T10:00:00.000Z",
      },
      {
        id: "sum-003",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        studentId: "stu-demo-02", // Chukwudi
        totalMarksObtained: 73.0,
        totalMarksPossible: 100,
        averagePercentage: 73.0,
        gpa: 4.5,
        classRank: 3,
        totalStudents: 3,
        subjectsCount: 1,
        subjectsPassed: 1,
        subjectsFailed: 0,
        attendanceTotalDays: 60,
        attendancePresentDays: 56,
        attendanceAbsentDays: 4,
        attendancePercentage: 93.3,
        status: "APPROVED",
        teacherRemarks: "Hardworking student with strong analytical potential. Continue practicing problem sets.",
        principalRemarks: "Good term result with noticeable improvement.",
        nextTermResumesDate: "2027-01-11",
        approvedById: "u-principal-01",
        approvedAt: "2026-10-16T10:00:00.000Z",
        createdAt: "2026-10-15T08:00:00.000Z",
        updatedAt: "2026-10-16T10:00:00.000Z",
      },
      {
        id: "sum-004",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        studentId: "stu-001", // Lucas Wright
        totalMarksObtained: 180.0,
        totalMarksPossible: 200,
        averagePercentage: 90.0,
        gpa: 5.0,
        classRank: 1,
        totalStudents: 30,
        subjectsCount: 2,
        subjectsPassed: 2,
        subjectsFailed: 0,
        attendanceTotalDays: 60,
        attendancePresentDays: 59,
        attendanceAbsentDays: 1,
        attendancePercentage: 98.3,
        status: "PUBLISHED",
        teacherRemarks: "An outstanding scholar with keen inquisitive intellect. Keep up the high standard.",
        principalRemarks: "Remarkable performance. Lucas represents the ideal academic ethos of SchoolOS.",
        nextTermResumesDate: "2027-01-11",
        approvedById: "u-principal-01",
        approvedAt: "2026-10-16T10:00:00.000Z",
        createdAt: "2026-10-15T08:00:00.000Z",
        updatedAt: "2026-10-16T10:00:00.000Z",
      },
      {
        id: "sum-005",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-b",
        studentId: "stu-005", // Devin Wright
        totalMarksObtained: 85.0,
        totalMarksPossible: 100,
        averagePercentage: 85.0,
        gpa: 5.0,
        classRank: 2,
        totalStudents: 28,
        subjectsCount: 1,
        subjectsPassed: 1,
        subjectsFailed: 0,
        attendanceTotalDays: 60,
        attendancePresentDays: 58,
        attendanceAbsentDays: 2,
        attendancePercentage: 96.7,
        status: "PUBLISHED",
        teacherRemarks: "Very dedicated, active participant in class inquiry and scientific discussions.",
        principalRemarks: "Commendable effort and high academic performance throughout the term.",
        nextTermResumesDate: "2027-01-11",
        approvedById: "u-principal-01",
        approvedAt: "2026-10-16T10:00:00.000Z",
        createdAt: "2026-10-15T08:00:00.000Z",
        updatedAt: "2026-10-16T10:00:00.000Z",
      },
    ],
  };
}

// Global in-memory storage singleton
const examState: InMemoryExamState = initializeExamState();

// Helper to check if two time ranges overlap (e.g. "09:00"-"11:00" and "10:30"-"12:30")
function doTimeRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  return startA < endB && endA > startB;
}

// =============================================================================
// EXAMINATION SERVICE IMPLEMENTATION
// =============================================================================

export class ExaminationService {
  // ---------------------------------------------------------------------------
  // 1. GRADING SCHEMES
  // ---------------------------------------------------------------------------

  public async getGradingSchemes(ctx: TenantContext): Promise<GradingSchemeRecord[]> {
    try {
      const records = await prisma.gradingScheme.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      });
      if (records.length > 0) {
        return records.map((r) => ({
          ...r,
          boundaries: r.boundaries as unknown as GradeBoundaryInput[],
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      logger.warn("Prisma getGradingSchemes failed, using memory state");
    }

    return examState.gradingSchemes.filter(
      (s) => s.organizationId === ctx.organizationId
    );
  }

  public async getGradingSchemeById(ctx: TenantContext, id: string): Promise<GradingSchemeRecord> {
    try {
      const record = await prisma.gradingScheme.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (record) {
        return {
          ...record,
          boundaries: record.boundaries as unknown as GradeBoundaryInput[],
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        };
      }
    } catch {
      logger.warn("Prisma getGradingSchemeById failed, checking memory");
    }

    const scheme = examState.gradingSchemes.find(
      (s) => s.id === id && s.organizationId === ctx.organizationId
    );
    if (!scheme) {
      throw new NotFoundError(`Grading scheme with id "${id}" not found.`);
    }
    return scheme;
  }

  public async createGradingScheme(
    ctx: TenantContext,
    input: CreateGradingSchemeInput
  ): Promise<GradingSchemeRecord> {
    // Validate that boundaries cover 0 to 100 without negative gaps
    const sorted = [...input.boundaries].sort((a, b) => b.minScore - a.minScore);
    const minCoverage = Math.min(...sorted.map((b) => b.minScore));
    const maxCoverage = Math.max(...sorted.map((b) => b.maxScore));
    if (minCoverage > 0 || maxCoverage < 100) {
      throw new ValidationError(
        "Grading scheme boundaries must encompass the full 0% to 100% academic range."
      );
    }

    const newRecord: GradingSchemeRecord = {
      id: `sch-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId: ctx.campusId || null,
      name: input.name,
      code: input.code.toUpperCase(),
      isDefault: input.isDefault,
      maxGpa: input.maxGpa,
      description: input.description || null,
      boundaries: sorted,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      if (input.isDefault) {
        await prisma.gradingScheme.updateMany({
          where: { organizationId: ctx.organizationId },
          data: { isDefault: false },
        });
      }

      await prisma.gradingScheme.create({
        data: {
          id: newRecord.id,
          organizationId: newRecord.organizationId,
          campusId: newRecord.campusId,
          name: newRecord.name,
          code: newRecord.code,
          isDefault: newRecord.isDefault,
          maxGpa: newRecord.maxGpa,
          description: newRecord.description,
          boundaries: newRecord.boundaries as any,
        },
      });
    } catch {
      logger.warn("Prisma createGradingScheme failed, using memory");
      if (input.isDefault) {
        examState.gradingSchemes.forEach((s) => {
          if (s.organizationId === ctx.organizationId) s.isDefault = false;
        });
      }
    }

    examState.gradingSchemes.unshift(newRecord);
    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "GradingScheme",
      entityId: newRecord.id,
      details: { name: newRecord.name, code: newRecord.code, maxGpa: newRecord.maxGpa },
    });

    return newRecord;
  }

  public resolveGrade(percentage: number, scheme: GradingSchemeRecord): {
    grade: string;
    gradePoint: number;
    remark: string;
    isPassing: boolean;
  } {
    const clamped = Math.max(0, Math.min(100, Math.round(percentage * 100) / 100));
    // Find matching boundary where minScore <= clamped <= maxScore
    for (const b of scheme.boundaries) {
      if (clamped >= b.minScore && clamped <= b.maxScore) {
        return {
          grade: b.grade,
          gradePoint: b.gradePoint,
          remark: b.remark,
          isPassing: b.isPassing,
        };
      }
    }
    // Fallback to lowest boundary or default F
    const last = scheme.boundaries[scheme.boundaries.length - 1];
    if (last) {
      return {
        grade: last.grade,
        gradePoint: last.gradePoint,
        remark: last.remark,
        isPassing: last.isPassing,
      };
    }
    return { grade: "F", gradePoint: 0.0, remark: "Fail", isPassing: false };
  }

  // ---------------------------------------------------------------------------
  // 2. ASSESSMENT COMPONENT WEIGHTINGS
  // ---------------------------------------------------------------------------

  public async getComponentConfigs(
    ctx: TenantContext,
    academicYearId: string
  ): Promise<AssessmentComponentConfigRecord[]> {
    try {
      const records = await prisma.assessmentComponentConfig.findMany({
        where: {
          organizationId: ctx.organizationId,
          academicYearId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
        },
        orderBy: { orderIndex: "asc" },
      });
      if (records.length > 0) {
        return records.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      logger.warn("Prisma getComponentConfigs failed, using memory");
    }

    return examState.componentConfigs
      .filter((c) => c.organizationId === ctx.organizationId && c.academicYearId === academicYearId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }

  public async createComponentConfig(
    ctx: TenantContext,
    input: CreateComponentConfigInput
  ): Promise<AssessmentComponentConfigRecord> {
    const campusId = ctx.campusId || DEMO_CAMPUS_MAIN_ID;
    const existing = await this.getComponentConfigs(ctx, input.academicYearId);

    // Verify cumulative weight does not exceed 100%
    const currentWeight = existing.reduce((sum, c) => sum + c.weightPercentage, 0);
    if (currentWeight + input.weightPercentage > 100.01) {
      throw new ValidationError(
        `Total assessment component weights cannot exceed 100%. Currently allocated: ${currentWeight}%, attempted addition: ${input.weightPercentage}%.`
      );
    }

    const newRecord: AssessmentComponentConfigRecord = {
      id: `cfg-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId,
      academicYearId: input.academicYearId,
      name: input.name,
      code: input.code.toUpperCase(),
      maxMarks: input.maxMarks,
      weightPercentage: input.weightPercentage,
      orderIndex: input.orderIndex,
      isRequired: input.isRequired,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await prisma.assessmentComponentConfig.create({
        data: {
          id: newRecord.id,
          organizationId: newRecord.organizationId,
          campusId: newRecord.campusId,
          academicYearId: newRecord.academicYearId,
          name: newRecord.name,
          code: newRecord.code,
          maxMarks: newRecord.maxMarks,
          weightPercentage: newRecord.weightPercentage,
          orderIndex: newRecord.orderIndex,
          isRequired: newRecord.isRequired,
        },
      });
    } catch {
      logger.warn("Prisma createComponentConfig failed, storing in memory");
    }

    examState.componentConfigs.push(newRecord);
    return newRecord;
  }

  // ---------------------------------------------------------------------------
  // 3. EXAM SESSIONS
  // ---------------------------------------------------------------------------

  public async getExamSessions(
    ctx: TenantContext,
    academicYearId?: string
  ): Promise<ExamSessionRecord[]> {
    try {
      const records = await prisma.examSession.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(academicYearId ? { academicYearId } : {}),
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
        },
        orderBy: { startDate: "desc" },
      });
      if (records.length > 0) {
        return records.map((r) => ({
          ...r,
          startDate: r.startDate.toISOString().split("T")[0],
          endDate: r.endDate.toISOString().split("T")[0],
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      logger.warn("Prisma getExamSessions failed, checking memory");
    }

    return examState.examSessions.filter((s) => {
      if (s.organizationId !== ctx.organizationId) return false;
      if (ctx.campusId && s.campusId !== ctx.campusId) return false;
      if (academicYearId && s.academicYearId !== academicYearId) return false;
      return true;
    });
  }

  public async createExamSession(
    ctx: TenantContext,
    input: CreateExamSessionInput
  ): Promise<ExamSessionRecord> {
    const campusId = ctx.campusId || DEMO_CAMPUS_MAIN_ID;
    if (new Date(input.startDate) > new Date(input.endDate)) {
      throw new ValidationError("Exam session start date cannot be later than end date.");
    }

    const newRecord: ExamSessionRecord = {
      id: `sess-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId,
      academicYearId: input.academicYearId,
      termId: input.termId || null,
      name: input.name,
      code: input.code.toUpperCase(),
      sessionType: input.sessionType,
      startDate: input.startDate,
      endDate: input.endDate,
      status: "PLANNED",
      instructions: input.instructions || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await prisma.examSession.create({
        data: {
          id: newRecord.id,
          organizationId: newRecord.organizationId,
          campusId: newRecord.campusId,
          academicYearId: newRecord.academicYearId,
          termId: newRecord.termId,
          name: newRecord.name,
          code: newRecord.code,
          sessionType: newRecord.sessionType,
          startDate: new Date(newRecord.startDate),
          endDate: new Date(newRecord.endDate),
          status: newRecord.status,
          instructions: newRecord.instructions,
        },
      });
    } catch {
      logger.warn("Prisma createExamSession failed, using memory");
    }

    examState.examSessions.unshift(newRecord);
    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "ExamSession",
      entityId: newRecord.id,
      details: { name: newRecord.name, code: newRecord.code },
    });
    return newRecord;
  }

  public async updateExamSession(
    ctx: TenantContext,
    id: string,
    input: UpdateExamSessionInput
  ): Promise<ExamSessionRecord> {
    const existingIndex = examState.examSessions.findIndex(
      (s) => s.id === id && s.organizationId === ctx.organizationId
    );
    if (existingIndex === -1) {
      throw new NotFoundError(`Exam session with id "${id}" not found.`);
    }

    const current = examState.examSessions[existingIndex];
    const updated: ExamSessionRecord = {
      ...current,
      ...input,
      updatedAt: new Date().toISOString(),
    };

    try {
      await prisma.examSession.update({
        where: { id },
        data: {
          name: updated.name,
          status: updated.status,
          instructions: updated.instructions,
          ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
          ...(input.endDate ? { endDate: new Date(input.endDate) } : {}),
        },
      });
    } catch {
      logger.warn("Prisma updateExamSession failed, updated in memory");
    }

    examState.examSessions[existingIndex] = updated;
    return updated;
  }

  // ---------------------------------------------------------------------------
  // 4. EXAM SCHEDULES & CONFLICT DETECTION ENGINE
  // ---------------------------------------------------------------------------

  public async checkExamConflicts(
    ctx: TenantContext,
    input: CheckScheduleConflictInput
  ): Promise<{
    hasConflict: boolean;
    conflicts: Array<{ type: "TEACHER" | "ROOM" | "CLASS"; message: string }>;
  }> {
    const conflicts: Array<{ type: "TEACHER" | "ROOM" | "CLASS"; message: string }> = [];

    // Get all schedules for the campus on the requested date
    const allSchedules = examState.examSchedules.filter((s) => {
      if (s.organizationId !== ctx.organizationId) return false;
      if (ctx.campusId && s.campusId !== ctx.campusId) return false;
      if (s.examDate !== input.examDate) return false;
      if (input.excludeScheduleId && s.id === input.excludeScheduleId) return false;
      return true;
    });

    for (const item of allSchedules) {
      const timeOverlaps = doTimeRangesOverlap(
        input.startTime,
        input.endTime,
        item.startTime,
        item.endTime
      );
      if (!timeOverlaps) continue;

      // 1. Invigilator / Teacher collision
      if (
        input.primaryInvigilatorId &&
        (item.primaryInvigilatorId === input.primaryInvigilatorId ||
          item.assistantInvigilatorIds.includes(input.primaryInvigilatorId))
      ) {
        conflicts.push({
          type: "TEACHER",
          message: `Invigilator is already scheduled for an exam between ${item.startTime} and ${item.endTime}.`,
        });
      }

      // 2. Room collision
      if (input.roomId && item.roomId === input.roomId) {
        conflicts.push({
          type: "ROOM",
          message: `Examination Hall / Room is already booked for another examination between ${item.startTime} and ${item.endTime}.`,
        });
      }

      // 3. Class / Section collision
      const sameClass = item.classId === input.classId;
      const sameSection = !input.sectionId || !item.sectionId || item.sectionId === input.sectionId;
      if (sameClass && sameSection) {
        conflicts.push({
          type: "CLASS",
          message: `This Class / Section is already sitting for another examination between ${item.startTime} and ${item.endTime}.`,
        });
      }
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  public async getExamSchedules(
    ctx: TenantContext,
    examSessionId: string
  ): Promise<ExamScheduleRecord[]> {
    try {
      const records = await prisma.examSchedule.findMany({
        where: {
          organizationId: ctx.organizationId,
          examSessionId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
        },
        orderBy: [{ examDate: "asc" }, { startTime: "asc" }],
      });
      if (records.length > 0) {
        return records.map((r) => ({
          ...r,
          examDate: r.examDate.toISOString().split("T")[0],
          assistantInvigilatorIds: r.assistantInvigilatorIds as unknown as string[],
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      logger.warn("Prisma getExamSchedules failed, checking memory");
    }

    return examState.examSchedules
      .filter((s) => s.organizationId === ctx.organizationId && s.examSessionId === examSessionId)
      .sort((a, b) => a.examDate.localeCompare(b.examDate) || a.startTime.localeCompare(b.startTime));
  }

  public async createExamSchedule(
    ctx: TenantContext,
    input: CreateExamScheduleInput
  ): Promise<ExamScheduleRecord> {
    const campusId = ctx.campusId || DEMO_CAMPUS_MAIN_ID;

    // Run conflict detection
    const conflictCheck = await this.checkExamConflicts(ctx, {
      examSessionId: input.examSessionId,
      examDate: input.examDate,
      startTime: input.startTime,
      endTime: input.endTime,
      classId: input.classId,
      sectionId: input.sectionId,
      subjectId: input.subjectId,
      roomId: input.roomId,
      primaryInvigilatorId: input.primaryInvigilatorId,
    });

    if (conflictCheck.hasConflict) {
      throw new ValidationError(
        `Examination schedule collision detected: ${conflictCheck.conflicts.map((c) => c.message).join(" ")}`
      );
    }

    const newRecord: ExamScheduleRecord = {
      id: `esch-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId,
      examSessionId: input.examSessionId,
      subjectId: input.subjectId,
      classId: input.classId,
      sectionId: input.sectionId || null,
      examDate: input.examDate,
      startTime: input.startTime,
      endTime: input.endTime,
      roomId: input.roomId || null,
      primaryInvigilatorId: input.primaryInvigilatorId || null,
      assistantInvigilatorIds: input.assistantInvigilatorIds || [],
      maxCapacity: input.maxCapacity || 40,
      notes: input.notes || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await prisma.examSchedule.create({
        data: {
          id: newRecord.id,
          organizationId: newRecord.organizationId,
          campusId: newRecord.campusId,
          examSessionId: newRecord.examSessionId,
          subjectId: newRecord.subjectId,
          classId: newRecord.classId,
          sectionId: newRecord.sectionId,
          examDate: new Date(newRecord.examDate),
          startTime: newRecord.startTime,
          endTime: newRecord.endTime,
          roomId: newRecord.roomId,
          primaryInvigilatorId: newRecord.primaryInvigilatorId,
          assistantInvigilatorIds: newRecord.assistantInvigilatorIds as any,
          maxCapacity: newRecord.maxCapacity,
          notes: newRecord.notes,
        },
      });
    } catch {
      logger.warn("Prisma createExamSchedule failed, stored in memory");
    }

    examState.examSchedules.push(newRecord);
    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "ExamSchedule",
      entityId: newRecord.id,
      details: { subjectId: newRecord.subjectId, examDate: newRecord.examDate },
    });
    return newRecord;
  }

  // ---------------------------------------------------------------------------
  // 5. ASSESSMENTS
  // ---------------------------------------------------------------------------

  public async getAssessments(
    ctx: TenantContext,
    query: {
      academicYearId: string;
      classId?: string;
      sectionId?: string;
      subjectId?: string;
      type?: string;
    }
  ): Promise<AssessmentRecord[]> {
    try {
      const records = await prisma.assessment.findMany({
        where: {
          organizationId: ctx.organizationId,
          academicYearId: query.academicYearId,
          ...(query.classId ? { classId: query.classId } : {}),
          ...(query.sectionId ? { sectionId: query.sectionId } : {}),
          ...(query.subjectId ? { subjectId: query.subjectId } : {}),
          ...(query.type ? { type: query.type as AssessmentType } : {}),
        },
        orderBy: { assessmentDate: "desc" },
      });
      if (records.length > 0) {
        return records.map((r) => ({
          ...r,
          assessmentDate: r.assessmentDate.toISOString().split("T")[0],
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      logger.warn("Prisma getAssessments failed, checking memory");
    }

    return examState.assessments.filter((a) => {
      if (a.organizationId !== ctx.organizationId) return false;
      if (a.academicYearId !== query.academicYearId) return false;
      if (query.classId && a.classId !== query.classId) return false;
      if (query.sectionId && a.sectionId && a.sectionId !== query.sectionId) return false;
      if (query.subjectId && a.subjectId !== query.subjectId) return false;
      if (query.type && a.type !== query.type) return false;
      return true;
    });
  }

  public async getAssessmentById(ctx: TenantContext, id: string): Promise<AssessmentRecord> {
    try {
      const record = await prisma.assessment.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (record) {
        return {
          ...record,
          assessmentDate: record.assessmentDate.toISOString().split("T")[0],
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
        };
      }
    } catch {
      logger.warn("Prisma getAssessmentById failed, checking memory");
    }

    const asm = examState.assessments.find(
      (a) => a.id === id && a.organizationId === ctx.organizationId
    );
    if (!asm) {
      throw new NotFoundError(`Assessment with id "${id}" not found.`);
    }
    return asm;
  }

  public async createAssessment(
    ctx: TenantContext,
    input: CreateAssessmentInput,
    userId?: string
  ): Promise<AssessmentRecord> {
    const campusId = ctx.campusId || DEMO_CAMPUS_MAIN_ID;

    const newRecord: AssessmentRecord = {
      id: `asm-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId,
      academicYearId: input.academicYearId,
      termId: input.termId || null,
      classId: input.classId,
      sectionId: input.sectionId || null,
      subjectId: input.subjectId,
      teachingGroupId: input.teachingGroupId || null,
      examSessionId: input.examSessionId || null,
      name: input.name,
      code: input.code.toUpperCase(),
      type: input.type,
      maxScore: input.maxScore,
      weight: input.weight,
      assessmentDate: input.assessmentDate,
      startTime: input.startTime || null,
      endTime: input.endTime || null,
      status: input.status,
      instructions: input.instructions || null,
      createdById: userId || null,
      updatedById: userId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await prisma.assessment.create({
        data: {
          id: newRecord.id,
          organizationId: newRecord.organizationId,
          campusId: newRecord.campusId,
          academicYearId: newRecord.academicYearId,
          termId: newRecord.termId,
          classId: newRecord.classId,
          sectionId: newRecord.sectionId,
          subjectId: newRecord.subjectId,
          teachingGroupId: newRecord.teachingGroupId,
          examSessionId: newRecord.examSessionId,
          name: newRecord.name,
          code: newRecord.code,
          type: newRecord.type,
          maxScore: newRecord.maxScore,
          weight: newRecord.weight,
          assessmentDate: new Date(newRecord.assessmentDate),
          startTime: newRecord.startTime,
          endTime: newRecord.endTime,
          status: newRecord.status,
          instructions: newRecord.instructions,
          createdById: newRecord.createdById,
        },
      });
    } catch {
      logger.warn("Prisma createAssessment failed, storing in memory");
    }

    examState.assessments.unshift(newRecord);
    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Assessment",
      entityId: newRecord.id,
      details: { name: newRecord.name, code: newRecord.code, type: newRecord.type },
    });
    return newRecord;
  }

  // ---------------------------------------------------------------------------
  // 6. SCORE RECORDING, BULK ENTRY & CORRECTIONS
  // ---------------------------------------------------------------------------

  public async getScoresForAssessment(
    ctx: TenantContext,
    assessmentId: string
  ): Promise<StudentAssessmentScoreRecord[]> {
    try {
      const records = await prisma.studentAssessmentScore.findMany({
        where: {
          organizationId: ctx.organizationId,
          assessmentId,
        },
      });
      if (records.length > 0) {
        return records.map((r) => ({
          ...r,
          enteredAt: r.enteredAt.toISOString(),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        }));
      }
    } catch {
      logger.warn("Prisma getScoresForAssessment failed, checking memory");
    }

    return examState.scores.filter(
      (s) => s.organizationId === ctx.organizationId && s.assessmentId === assessmentId
    );
  }

  public async bulkRecordScores(
    ctx: TenantContext,
    input: BulkRecordScoresInput,
    userId?: string
  ): Promise<{ savedCount: number; records: StudentAssessmentScoreRecord[] }> {
    const assessment = await this.getAssessmentById(ctx, input.assessmentId);
    const schemes = await this.getGradingSchemes(ctx);
    const defaultScheme = schemes.find((s) => s.isDefault) || schemes[0];

    // Check if the cohort's results are locked
    const lockedSummary = examState.termSummaries.find(
      (ts) =>
        ts.organizationId === ctx.organizationId &&
        ts.academicYearId === assessment.academicYearId &&
        ts.classId === assessment.classId &&
        ts.status === "LOCKED"
    );
    if (lockedSummary) {
      throw new ForbiddenError(
        "Term academic results for this class cohort have been locked. Direct score editing is prohibited; use controlled administrative corrections."
      );
    }

    const savedRecords: StudentAssessmentScoreRecord[] = [];

    for (const item of input.scores) {
      if (item.scoreObtained > assessment.maxScore) {
        throw new ValidationError(
          `Score obtained (${item.scoreObtained}) cannot exceed assessment maximum score (${assessment.maxScore}) for student ${item.studentId}.`
        );
      }

      const percentage = (item.scoreObtained / assessment.maxScore) * 100;
      const gradeInfo = defaultScheme
        ? this.resolveGrade(percentage, defaultScheme)
        : { grade: "N/A", gradePoint: 0.0 };

      const existingIndex = examState.scores.findIndex(
        (s) => s.assessmentId === input.assessmentId && s.studentId === item.studentId
      );

      const record: StudentAssessmentScoreRecord = {
        id: existingIndex >= 0 ? examState.scores[existingIndex].id : `sc-${Date.now()}-${item.studentId.slice(-4)}`,
        organizationId: ctx.organizationId,
        campusId: assessment.campusId,
        assessmentId: input.assessmentId,
        studentId: item.studentId,
        scoreObtained: item.scoreObtained,
        maxScore: assessment.maxScore,
        percentage: Math.round(percentage * 100) / 100,
        grade: gradeInfo.grade,
        gradePoint: gradeInfo.gradePoint,
        status: item.status || "RECORDED",
        remarks: item.remarks || null,
        enteredById: userId || null,
        enteredAt: new Date().toISOString(),
        createdAt: existingIndex >= 0 ? examState.scores[existingIndex].createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        await prisma.studentAssessmentScore.upsert({
          where: {
            assessmentId_studentId: {
              assessmentId: record.assessmentId,
              studentId: record.studentId,
            },
          },
          update: {
            scoreObtained: record.scoreObtained,
            percentage: record.percentage,
            grade: record.grade,
            gradePoint: record.gradePoint,
            status: record.status,
            remarks: record.remarks,
            enteredById: record.enteredById,
          },
          create: {
            id: record.id,
            organizationId: record.organizationId,
            campusId: record.campusId,
            assessmentId: record.assessmentId,
            studentId: record.studentId,
            scoreObtained: record.scoreObtained,
            maxScore: record.maxScore,
            percentage: record.percentage,
            grade: record.grade,
            gradePoint: record.gradePoint,
            status: record.status,
            remarks: record.remarks,
            enteredById: record.enteredById,
          },
        });
      } catch {
        // Fallback in memory
      }

      if (existingIndex >= 0) {
        examState.scores[existingIndex] = record;
      } else {
        examState.scores.push(record);
      }
      savedRecords.push(record);
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "StudentAssessmentScore",
      entityId: input.assessmentId,
      details: { count: savedRecords.length, assessmentName: assessment.name },
    });

    return {
      savedCount: savedRecords.length,
      records: savedRecords,
    };
  }

  public async correctScore(
    ctx: TenantContext,
    input: CorrectScoreInput,
    userId: string
  ): Promise<ScoreCorrectionRecord> {
    const score = examState.scores.find(
      (s) => s.id === input.scoreId && s.organizationId === ctx.organizationId
    );
    if (!score) {
      throw new NotFoundError(`Score record with id "${input.scoreId}" not found.`);
    }

    if (input.newScore > score.maxScore) {
      throw new ValidationError(
        `Corrected score (${input.newScore}) cannot exceed max score (${score.maxScore}).`
      );
    }

    const previousScore = score.scoreObtained;
    const previousStatus = score.status;

    // Update the score
    const percentage = (input.newScore / score.maxScore) * 100;
    const schemes = await this.getGradingSchemes(ctx);
    const defaultScheme = schemes.find((s) => s.isDefault) || schemes[0];
    const gradeInfo = defaultScheme
      ? this.resolveGrade(percentage, defaultScheme)
      : { grade: "N/A", gradePoint: 0.0 };

    score.scoreObtained = input.newScore;
    score.percentage = Math.round(percentage * 100) / 100;
    score.grade = gradeInfo.grade;
    score.gradePoint = gradeInfo.gradePoint;
    score.status = input.newStatus;
    score.updatedAt = new Date().toISOString();

    const correction: ScoreCorrectionRecord = {
      id: `cor-${Date.now()}`,
      organizationId: ctx.organizationId,
      scoreId: score.id,
      studentId: score.studentId,
      previousScore,
      newScore: input.newScore,
      previousStatus,
      newStatus: input.newStatus,
      correctionReason: input.correctionReason,
      correctedById: userId,
      createdAt: new Date().toISOString(),
    };

    try {
      await prisma.scoreCorrection.create({
        data: {
          id: correction.id,
          organizationId: correction.organizationId,
          scoreId: correction.scoreId,
          studentId: correction.studentId,
          previousScore: correction.previousScore,
          newScore: correction.newScore,
          previousStatus: correction.previousStatus,
          newStatus: correction.newStatus,
          correctionReason: correction.correctionReason,
          correctedById: correction.correctedById,
        },
      });
    } catch {
      logger.warn("Prisma scoreCorrection create failed, using memory");
    }

    examState.corrections.unshift(correction);
    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "ScoreCorrection",
      entityId: correction.id,
      details: {
        scoreId: score.id,
        previousScore,
        newScore: input.newScore,
        reason: input.correctionReason,
      },
    });

    return correction;
  }

  // ---------------------------------------------------------------------------
  // 7. RESULTS COMPUTATION & RANKING ENGINE
  // ---------------------------------------------------------------------------

  public async computeTermResults(
    ctx: TenantContext,
    input: ComputeResultsInput,
    userId?: string
  ): Promise<{
    subjectResults: SubjectTermResultRecord[];
    termSummaries: StudentTermSummaryRecord[];
  }> {
    const campusId = ctx.campusId || DEMO_CAMPUS_MAIN_ID;
    const schemes = await this.getGradingSchemes(ctx);
    const scheme = input.gradingSchemeId
      ? schemes.find((s) => s.id === input.gradingSchemeId) || schemes[0]
      : schemes.find((s) => s.isDefault) || schemes[0];

    // Find all assessments for this class/section in the term
    const assessments = examState.assessments.filter((a) => {
      if (a.organizationId !== ctx.organizationId) return false;
      if (a.academicYearId !== input.academicYearId) return false;
      if (a.classId !== input.classId) return false;
      if (input.sectionId && a.sectionId && a.sectionId !== input.sectionId) return false;
      return true;
    });

    if (assessments.length === 0) {
      throw new ValidationError("No assessments found for this cohort to compute results.");
    }

    // Identify unique students who have scores across these assessments
    const assessmentIds = assessments.map((a) => a.id);
    const cohortScores = examState.scores.filter((s) => assessmentIds.includes(s.assessmentId));
    const studentIds = Array.from(new Set(cohortScores.map((s) => s.studentId)));

    // Group assessments by subject
    const subjectMap = new Map<string, AssessmentRecord[]>();
    for (const asm of assessments) {
      const list = subjectMap.get(asm.subjectId) || [];
      list.push(asm);
      subjectMap.set(asm.subjectId, list);
    }

    const calculatedSubjectResults: SubjectTermResultRecord[] = [];

    // Calculate Subject Results
    for (const [subjectId, subjectAssessments] of subjectMap.entries()) {
      const studentSubjectScores: Array<{ studentId: string; totalScore: number; caScore: number; examScore: number }> = [];

      for (const studentId of studentIds) {
        let caScore = 0;
        let examScore = 0;

        for (const asm of subjectAssessments) {
          const scoreRecord = cohortScores.find(
            (s) => s.assessmentId === asm.id && s.studentId === studentId
          );
          if (scoreRecord && scoreRecord.status === "RECORDED") {
            const weightedPoints = (scoreRecord.scoreObtained / asm.maxScore) * asm.weight;
            if (asm.type === "EXAMINATION") {
              examScore += weightedPoints;
            } else {
              caScore += weightedPoints;
            }
          }
        }

        const totalScore = Math.round((caScore + examScore) * 100) / 100;
        studentSubjectScores.push({ studentId, totalScore, caScore, examScore });
      }

      // Compute subject statistics (Average, Subject Position with competition ranking)
      const avg =
        studentSubjectScores.length > 0
          ? Math.round(
              (studentSubjectScores.reduce((sum, s) => sum + s.totalScore, 0) /
                studentSubjectScores.length) *
                100
            ) / 100
          : 0;

      // Sort descending for ranking
      studentSubjectScores.sort((a, b) => b.totalScore - a.totalScore);

      studentSubjectScores.forEach((item, index) => {
        // Standard competition ranking (1st, 2nd, 2nd, 4th)
        let rank = index + 1;
        if (index > 0 && item.totalScore === studentSubjectScores[index - 1].totalScore) {
          rank = calculatedSubjectResults[calculatedSubjectResults.length - 1].subjectRank || rank;
        }

        const gradeInfo = this.resolveGrade(item.totalScore, scheme);
        const subResult: SubjectTermResultRecord = {
          id: `subres-${Date.now()}-${item.studentId.slice(-4)}-${subjectId.slice(-3)}`,
          organizationId: ctx.organizationId,
          campusId,
          academicYearId: input.academicYearId,
          termId: input.termId,
          classId: input.classId,
          sectionId: input.sectionId || null,
          subjectId,
          studentId: item.studentId,
          caScore: Math.round(item.caScore * 10) / 10,
          examScore: Math.round(item.examScore * 10) / 10,
          totalScore: item.totalScore,
          grade: gradeInfo.grade,
          gradePoint: gradeInfo.gradePoint,
          subjectRank: rank,
          classAverage: avg,
          status: "DRAFT",
          isPassing: gradeInfo.isPassing,
          remarks: gradeInfo.remark,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        calculatedSubjectResults.push(subResult);
      });
    }

    // Now Calculate Overall Student Term Summaries
    const calculatedSummaries: StudentTermSummaryRecord[] = [];

    // Pull attendance records from AttendanceService if available
    let attendanceRoster: any[] = [];
    try {
      const reg = await attendanceService.getAttendanceRegister(ctx, {
        academicYearId: input.academicYearId,
        termId: input.termId,
        classId: input.classId,
        sectionId: input.sectionId || undefined,
        attendanceDate: "2026-09-25",
        attendanceType: "DAILY",
      });
      if (reg && Array.isArray(reg.roster)) {
        attendanceRoster = reg.roster;
      }
    } catch {
      logger.warn("Could not fetch attendance records for report card summary");
    }

    for (const studentId of studentIds) {
      const studentSubResults = calculatedSubjectResults.filter((r) => r.studentId === studentId);
      const totalMarksObtained = Math.round(studentSubResults.reduce((sum, r) => sum + r.totalScore, 0) * 10) / 10;
      const totalMarksPossible = studentSubResults.length * 100;
      const averagePercentage =
        totalMarksPossible > 0
          ? Math.round((totalMarksObtained / totalMarksPossible) * 1000) / 10
          : 0;
      const gpa =
        studentSubResults.length > 0
          ? Math.round(
              (studentSubResults.reduce((sum, r) => sum + r.gradePoint, 0) /
                studentSubResults.length) *
                100
            ) / 100
          : 0;

      const subjectsPassed = studentSubResults.filter((r) => r.isPassing).length;
      const subjectsFailed = studentSubResults.length - subjectsPassed;

      // Attendance metrics
      const studentItem = attendanceRoster.find(
        (a) => a.student?.id === studentId || a.studentId === studentId
      );
      const isPresent = studentItem && (studentItem.status === "PRESENT" || studentItem.status === "LATE");
      const totalDays = 60;
      const presentDays = isPresent ? 59 : 58;
      const absentDays = totalDays - presentDays;
      const attPct = Math.round((presentDays / totalDays) * 1000) / 10;

      calculatedSummaries.push({
        id: `sum-${Date.now()}-${studentId.slice(-4)}`,
        organizationId: ctx.organizationId,
        campusId,
        academicYearId: input.academicYearId,
        termId: input.termId,
        classId: input.classId,
        sectionId: input.sectionId || null,
        studentId,
        totalMarksObtained,
        totalMarksPossible,
        averagePercentage,
        gpa,
        classRank: null, // Assigned in next step
        totalStudents: studentIds.length,
        subjectsCount: studentSubResults.length,
        subjectsPassed,
        subjectsFailed,
        attendanceTotalDays: totalDays,
        attendancePresentDays: presentDays,
        attendanceAbsentDays: absentDays,
        attendancePercentage: attPct,
        status: "DRAFT",
        teacherRemarks: "Satisfactory term performance.",
        principalRemarks: "Promoted on merit.",
        nextTermResumesDate: "2027-01-11",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    // Rank students by totalMarksObtained / averagePercentage
    calculatedSummaries.sort((a, b) => b.totalMarksObtained - a.totalMarksObtained);
    calculatedSummaries.forEach((sum, idx) => {
      let rank = idx + 1;
      if (idx > 0 && sum.totalMarksObtained === calculatedSummaries[idx - 1].totalMarksObtained) {
        rank = calculatedSummaries[idx - 1].classRank || rank;
      }
      sum.classRank = rank;
    });

    // Replace in memory state & update DB
    // Filter out existing records for this term & cohort
    examState.subjectResults = examState.subjectResults.filter(
      (r) =>
        !(
          r.organizationId === ctx.organizationId &&
          r.academicYearId === input.academicYearId &&
          r.termId === input.termId &&
          r.classId === input.classId
        )
    );
    examState.subjectResults.push(...calculatedSubjectResults);

    examState.termSummaries = examState.termSummaries.filter(
      (s) =>
        !(
          s.organizationId === ctx.organizationId &&
          s.academicYearId === input.academicYearId &&
          s.termId === input.termId &&
          s.classId === input.classId
        )
    );
    examState.termSummaries.push(...calculatedSummaries);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "SubjectTermResult",
      entityId: input.classId,
      details: {
        academicYearId: input.academicYearId,
        termId: input.termId,
        studentsCount: studentIds.length,
        computedBy: userId,
      },
    });

    return {
      subjectResults: calculatedSubjectResults,
      termSummaries: calculatedSummaries,
    };
  }

  // ---------------------------------------------------------------------------
  // 8. RESULT GOVERNANCE & APPROVAL WORKFLOW
  // ---------------------------------------------------------------------------

  public async reviewResults(
    ctx: TenantContext,
    input: ReviewResultsInput,
    userId: string = "usr-system-admin"
  ): Promise<{ updatedCount: number; newStatus: ResultApprovalStatus; status: ResultApprovalStatus }> {
    const cohortSummaries = examState.termSummaries.filter((s) => {
      if (s.organizationId !== ctx.organizationId) return false;
      if (s.academicYearId !== input.academicYearId) return false;
      if (s.termId !== input.termId) return false;
      if (s.classId !== input.classId) return false;
      if (input.sectionId && s.sectionId && s.sectionId !== input.sectionId) return false;
      return true;
    });

    if (cohortSummaries.length === 0) {
      throw new NotFoundError(
        "No computed result summaries found for this cohort. Please run result computation first."
      );
    }

    let nextStatus: ResultApprovalStatus;
    const now = new Date().toISOString();

    switch (input.action) {
      case "SUBMIT":
        nextStatus = "SUBMITTED";
        break;
      case "APPROVE":
        nextStatus = "APPROVED";
        break;
      case "PUBLISH":
        nextStatus = "PUBLISHED";
        break;
      case "LOCK":
        nextStatus = "LOCKED";
        break;
      case "UNLOCK":
        nextStatus = "APPROVED";
        break;
      default:
        throw new ValidationError(`Unknown review action: ${input.action}`);
    }

    for (const summary of cohortSummaries) {
      summary.status = nextStatus;
      summary.updatedAt = now;

      if (input.action === "APPROVE") {
        summary.approvedById = userId;
        summary.approvedAt = now;
      } else if (input.action === "PUBLISH") {
        summary.publishedById = userId;
        summary.publishedAt = now;
      } else if (input.action === "LOCK") {
        summary.lockedById = userId;
        summary.lockedAt = now;
      }

      if (input.teacherRemarks && input.teacherRemarks[summary.studentId]) {
        summary.teacherRemarks = String(input.teacherRemarks[summary.studentId]);
      }
      if (input.principalRemarks && input.principalRemarks[summary.studentId]) {
        summary.principalRemarks = String(input.principalRemarks[summary.studentId]);
      }
      if (input.nextTermResumesDate) {
        summary.nextTermResumesDate = input.nextTermResumesDate;
      }
    }

    // Update corresponding SubjectTermResults
    examState.subjectResults.forEach((r) => {
      if (
        r.organizationId === ctx.organizationId &&
        r.academicYearId === input.academicYearId &&
        r.termId === input.termId &&
        r.classId === input.classId
      ) {
        r.status = nextStatus;
        r.updatedAt = now;
      }
    });

    await auditRepository.log(ctx, {
      action: input.action === "APPROVE" ? "APPROVE" : input.action === "PUBLISH" ? "PUBLISH" : "UPDATE",
      entity: "StudentTermSummary",
      entityId: input.classId,
      details: {
        action: input.action,
        newStatus: nextStatus,
        cohortCount: cohortSummaries.length,
        notes: input.notes,
      },
    });

    return {
      updatedCount: cohortSummaries.length,
      newStatus: nextStatus,
      status: nextStatus,
    };
  }

  // ---------------------------------------------------------------------------
  // 9. STUDENT REPORT CARDS & TRANSCRIPTS
  // ---------------------------------------------------------------------------

  public async getStudentReportCard(
    ctx: TenantContext,
    studentId: string,
    academicYearId: string,
    termId: string
  ): Promise<{
    studentName?: string;
    institution: {
      name: string;
      motto: string;
      address: string;
      email: string;
      phone: string;
      logoUrl: string | null;
      academicYear: string;
      term: string;
    };
    student: {
      id: string;
      admissionNumber: string;
      fullName: string;
      gender: string;
      className: string;
      sectionName: string;
      rollNumber: string;
    };
    subjects: Array<{
      subjectId: string;
      subjectName: string;
      caScore: number;
      examScore: number;
      totalScore: number;
      grade: string;
      gradePoint: number;
      subjectRank: number | null;
      classAverage: number | null;
      remark: string;
    }>;
    summary: {
      totalMarksObtained: number;
      totalMarksPossible: number;
      averagePercentage: number;
      gpa: number;
      classRank: number | null;
      totalStudents: number;
      subjectsPassed: number;
      subjectsFailed: number;
      attendanceTotalDays: number;
      attendancePresentDays: number;
      attendanceAbsentDays: number;
      attendancePercentage: number;
      status: ResultApprovalStatus;
      teacherRemarks: string;
      principalRemarks: string;
      nextTermResumesDate: string;
    };
  }> {
    const summary = examState.termSummaries.find(
      (s) =>
        s.organizationId === ctx.organizationId &&
        s.studentId === studentId &&
        s.academicYearId === academicYearId &&
        s.termId === termId
    );

    if (!summary) {
      throw new NotFoundError(
        `Academic report card for student "${studentId}" in term "${termId}" not found. Results may not have been computed yet.`
      );
    }

    const subjectResults = examState.subjectResults.filter(
      (r) =>
        r.organizationId === ctx.organizationId &&
        r.studentId === studentId &&
        r.academicYearId === academicYearId &&
        r.termId === termId
    );

    // Map subject IDs to readable names
    const subjectNames: Record<string, string> = {
      "sub-math-01": "Mathematics",
      "sub-eng-01": "English Language",
      "sub-sci-01": "Basic Science",
      "sub-soc-01": "Social Studies",
      "sub-ict-01": "Computer Studies & ICT",
    };

    // Student identity lookup
    const studentNames: Record<string, { name: string; adm: string; gender: string; roll: string }> = {
      "stu-demo-01": { name: "Zainab Al-Mansoor", adm: "STD/2026/0001", gender: "FEMALE", roll: "01" },
      "stu-demo-02": { name: "Chukwudi Okafor", adm: "STD/2026/0002", gender: "MALE", roll: "02" },
      "stu-demo-03": { name: "Amina Bello", adm: "STD/2026/0003", gender: "FEMALE", roll: "03" },
      "stu-demo-04": { name: "David Adeleke", adm: "STD/2026/0004", gender: "MALE", roll: "04" },
      "stu-demo-05": { name: "Fatima Yusuf", adm: "STD/2026/0005", gender: "FEMALE", roll: "05" },
      "stu-demo-06": { name: "Emmanuel Nwosu", adm: "STD/2026/0006", gender: "MALE", roll: "06" },
      "stu-001": { name: "Lucas Alexander Wright", adm: "STU-2025-00001", gender: "MALE", roll: "01" },
      "stu-005": { name: "Devin Kai Wright", adm: "STU-2024-00018", gender: "MALE", roll: "05" },
    };

    const stInfo = studentNames[studentId] || {
      name: `Student (${studentId})`,
      adm: `ADM-${studentId.slice(-4)}`,
      gender: "UNSPECIFIED",
      roll: "10",
    };

    return {
      studentName: stInfo.name,
      institution: {
        name: "Apex International Academy",
        motto: "Excellence, Integrity & Innovation",
        address: "Plot 12, Academic Crescent, Victoria Island, Lagos",
        email: "academics@apexacademy.edu.ng",
        phone: "+234 1 800 2739",
        logoUrl: null,
        academicYear: "2025/2026 Session",
        term: "Second Term",
      },
      student: {
        id: studentId,
        admissionNumber: stInfo.adm,
        fullName: stInfo.name,
        gender: stInfo.gender,
        className: "Junior Secondary 1",
        sectionName: "Section A (Gold)",
        rollNumber: stInfo.roll,
      },
      subjects: subjectResults.map((r) => ({
        subjectId: r.subjectId,
        subjectName: subjectNames[r.subjectId] || r.subjectId,
        caScore: r.caScore,
        examScore: r.examScore,
        totalScore: r.totalScore,
        grade: r.grade,
        gradePoint: r.gradePoint,
        subjectRank: r.subjectRank || null,
        classAverage: r.classAverage || null,
        remark: r.remarks || "Satisfactory",
      })),
      summary: {
        totalMarksObtained: summary.totalMarksObtained,
        totalMarksPossible: summary.totalMarksPossible,
        averagePercentage: summary.averagePercentage,
        gpa: summary.gpa,
        classRank: summary.classRank || null,
        totalStudents: summary.totalStudents || 30,
        subjectsPassed: summary.subjectsPassed,
        subjectsFailed: summary.subjectsFailed,
        attendanceTotalDays: summary.attendanceTotalDays || 60,
        attendancePresentDays: summary.attendancePresentDays || 58,
        attendanceAbsentDays: summary.attendanceAbsentDays || 2,
        attendancePercentage: summary.attendancePercentage || 96.7,
        status: summary.status,
        teacherRemarks: summary.teacherRemarks || "Diligent and consistent effort throughout the term.",
        principalRemarks: summary.principalRemarks || "Commended for good conduct and high academic standards.",
        nextTermResumesDate: summary.nextTermResumesDate || "2027-01-11",
      },
    };
  }

  // ---------------------------------------------------------------------------
  // 10. OVERVIEW & ANALYTICS
  // ---------------------------------------------------------------------------

  public async getExamOverview(ctx: TenantContext): Promise<{
    activeSession: ExamSessionRecord | null;
    totalAssessments: number;
    totalExamsScheduled: number;
    totalScoresRecorded: number;
    publishedResultsCount: number;
    gradeDistribution: Record<string, number>;
    recentAssessments: AssessmentRecord[];
  }> {
    const orgSessions = examState.examSessions.filter((s) => s.organizationId === ctx.organizationId);
    const activeSession = orgSessions.find((s) => s.status === "ACTIVE") || orgSessions[0] || null;

    const orgAssessments = examState.assessments.filter((a) => a.organizationId === ctx.organizationId);
    const orgSchedules = examState.examSchedules.filter((s) => s.organizationId === ctx.organizationId);
    const orgScores = examState.scores.filter((s) => s.organizationId === ctx.organizationId);
    const orgSummaries = examState.termSummaries.filter(
      (s) => s.organizationId === ctx.organizationId && (s.status === "PUBLISHED" || s.status === "LOCKED")
    );

    // Grade distribution across all scored assessments
    const gradeDistribution: Record<string, number> = {
      A1: 0,
      B2: 0,
      B3: 0,
      C4: 0,
      C5: 0,
      C6: 0,
      D7: 0,
      E8: 0,
      F9: 0,
    };
    for (const sc of orgScores) {
      if (sc.grade && gradeDistribution[sc.grade] !== undefined) {
        gradeDistribution[sc.grade]++;
      }
    }

    return {
      activeSession,
      totalAssessments: orgAssessments.length,
      totalExamsScheduled: orgSchedules.length,
      totalScoresRecorded: orgScores.length,
      publishedResultsCount: orgSummaries.length,
      gradeDistribution,
      recentAssessments: orgAssessments.slice(0, 5),
    };
  }
}

export const examinationService = new ExaminationService();
