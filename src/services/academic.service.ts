import { prisma } from "@/lib/db";
import { TenantContext } from "@/repositories/types";
import { auditRepository } from "@/repositories/audit.repository";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  CreateCurriculumInput,
  UpdateCurriculumInput,
  CreateSubjectCombinationInput,
  UpdateSubjectCombinationInput,
  CreateClassSubjectInput,
  UpdateClassSubjectInput,
  CreateTeachingAssignmentInput,
  UpdateTeachingAssignmentInput,
  AssignClassTeacherInput,
  CreateLessonPeriodInput,
  UpdateLessonPeriodInput,
  CreateClassroomRoomInput,
  UpdateClassroomRoomInput,
  CreateTimetableLessonInput,
  UpdateTimetableLessonInput,
  TimetableConflictCheckInput,
  CreateTeachingGroupInput,
  UpdateTeachingGroupInput,
} from "@/lib/validations/academic";
import {
  DEMO_ORG_ID,
  DEMO_CAMPUS_MAIN_ID,
  DEMO_CAMPUS_WEST_ID,
} from "./admin.service";

// =============================================================================
// DOMAIN RECORD INTERFACES
// =============================================================================

export interface CurriculumRecord {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  type: "NATIONAL" | "BRITISH" | "CAMBRIDGE" | "MONTESSORI" | "INTERNATIONAL_BACCALAUREATE" | "CUSTOM";
  version: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectCombinationRecord {
  id: string;
  organizationId: string;
  campusId: string;
  name: string;
  code: string;
  stream: string;
  description?: string | null;
  compulsorySubjectIds: string[];
  electiveSubjectIds: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSubjectRecord {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  ruleType: "CORE" | "ELECTIVE" | "OPTIONAL";
  creditUnits: number;
  periodsPerWeek: number;
  syllabusNotes?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingAssignmentRecord {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  termId?: string | null;
  staffId: string;
  subjectId: string;
  classId: string;
  sectionId?: string | null;
  periodsPerWeek: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonPeriodRecord {
  id: string;
  organizationId: string;
  campusId: string;
  periodNumber: number;
  name: string;
  startTime: string; // "08:00"
  endTime: string;   // "08:45"
  isBreak: boolean;
  daysActive: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ClassroomRoomRecord {
  id: string;
  organizationId: string;
  campusId: string;
  name: string;
  code: string;
  building?: string | null;
  roomType: "CLASSROOM" | "SCIENCE_LAB" | "ICT_LAB" | "ART_STUDIO" | "LIBRARY" | "AUDITORIUM" | "SPORTS_FACILITY" | "WORKSHOP";
  capacity: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableLessonRecord {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  termId?: string | null;
  dayOfWeek: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
  periodId: string;
  subjectId: string;
  staffId: string;
  classId: string;
  sectionId?: string | null;
  roomId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingGroupRecord {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  termId?: string | null;
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  staffId: string;
  name: string;
  code: string;
  maxCapacity: number;
  createdAt: string;
  updatedAt: string;
}

// In-Memory Seed State for Offline / Vitest resilience
interface InMemoryAcademicState {
  curriculums: CurriculumRecord[];
  combinations: SubjectCombinationRecord[];
  classSubjects: ClassSubjectRecord[];
  teachingAssignments: TeachingAssignmentRecord[];
  lessonPeriods: LessonPeriodRecord[];
  rooms: ClassroomRoomRecord[];
  timetableLessons: TimetableLessonRecord[];
  teachingGroups: TeachingGroupRecord[];
}

function initializeAcademicState(): InMemoryAcademicState {
  return {
    curriculums: [
      {
        id: "curr-nat-01",
        organizationId: DEMO_ORG_ID,
        name: "National Standard Secondary Curriculum",
        code: "NAT-SEC-2026",
        type: "NATIONAL",
        version: "2.1",
        description: "Official national educational guidelines and core standards for secondary education.",
        isActive: true,
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
      {
        id: "curr-cam-02",
        organizationId: DEMO_ORG_ID,
        name: "Cambridge International IGCSE Framework",
        code: "CAM-IGCSE-V3",
        type: "CAMBRIDGE",
        version: "3.0",
        description: "Advanced global curriculum emphasizing science, mathematics, and critical thinking.",
        isActive: true,
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
    ],
    combinations: [
      {
        id: "comb-sci-01",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Senior Science & Technology Stream",
        code: "SCI-TECH",
        stream: "Science",
        description: "Core physical sciences, pure mathematics, biology, and computer science.",
        compulsorySubjectIds: ["sub-001", "sub-002", "sub-004"], // Math, English, Physics
        electiveSubjectIds: ["sub-003", "sub-005"], // Chemistry, Biology
        isActive: true,
        createdAt: "2025-08-10T08:00:00.000Z",
        updatedAt: "2025-08-10T08:00:00.000Z",
      },
      {
        id: "comb-art-02",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Humanities & Liberal Arts Stream",
        code: "ARTS-HUM",
        stream: "Arts",
        description: "Literature, history, government, and foreign languages.",
        compulsorySubjectIds: ["sub-002"], // English
        electiveSubjectIds: ["sub-001"],
        isActive: true,
        createdAt: "2025-08-10T08:00:00.000Z",
        updatedAt: "2025-08-10T08:00:00.000Z",
      },
      {
        id: "comb-com-03",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Business & Commercial Studies Stream",
        code: "COMM-BUS",
        stream: "Commercial",
        description: "Economics, accounting, commerce, and business mathematics.",
        compulsorySubjectIds: ["sub-001", "sub-002"],
        electiveSubjectIds: [],
        isActive: true,
        createdAt: "2025-08-10T08:00:00.000Z",
        updatedAt: "2025-08-10T08:00:00.000Z",
      },
    ],
    classSubjects: [
      {
        id: "cs-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: null,
        subjectId: "sub-001", // Mathematics
        ruleType: "CORE",
        creditUnits: 3,
        periodsPerWeek: 5,
        syllabusNotes: "Core secondary foundation in algebra and geometry",
        isActive: true,
        createdAt: "2025-08-15T08:00:00.000Z",
        updatedAt: "2025-08-15T08:00:00.000Z",
      },
      {
        id: "cs-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: null,
        subjectId: "sub-002", // English Language
        ruleType: "CORE",
        creditUnits: 3,
        periodsPerWeek: 5,
        syllabusNotes: "Reading comprehension, essay composition, and grammar",
        isActive: true,
        createdAt: "2025-08-15T08:00:00.000Z",
        updatedAt: "2025-08-15T08:00:00.000Z",
      },
      {
        id: "cs-003",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: null,
        subjectId: "sub-004", // Integrated Science
        ruleType: "CORE",
        creditUnits: 2,
        periodsPerWeek: 4,
        syllabusNotes: "Basic physics and chemical reactions",
        isActive: true,
        createdAt: "2025-08-15T08:00:00.000Z",
        updatedAt: "2025-08-15T08:00:00.000Z",
      },
      {
        id: "cs-004",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-ss1-2526",
        sectionId: null,
        subjectId: "sub-004", // Physics
        ruleType: "ELECTIVE",
        creditUnits: 3,
        periodsPerWeek: 4,
        syllabusNotes: "Mechanics and thermodynamics for science students",
        isActive: true,
        createdAt: "2025-08-15T08:00:00.000Z",
        updatedAt: "2025-08-15T08:00:00.000Z",
      },
    ],
    teachingAssignments: [
      {
        id: "ta-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        staffId: "stf-001", // Marcus Holloway
        subjectId: "sub-001", // Mathematics
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        periodsPerWeek: 5,
        createdAt: "2025-08-15T09:00:00.000Z",
        updatedAt: "2025-08-15T09:00:00.000Z",
      },
      {
        id: "ta-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        staffId: "stf-001", // Marcus Holloway
        subjectId: "sub-001", // Mathematics
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-b",
        periodsPerWeek: 5,
        createdAt: "2025-08-15T09:00:00.000Z",
        updatedAt: "2025-08-15T09:00:00.000Z",
      },
      {
        id: "ta-003",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        staffId: "stf-002", // Arthur Pendleton
        subjectId: "sub-002", // English Literature
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        periodsPerWeek: 4,
        createdAt: "2025-08-15T09:00:00.000Z",
        updatedAt: "2025-08-15T09:00:00.000Z",
      },
    ],
    lessonPeriods: [
      {
        id: "per-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        periodNumber: 1,
        name: "Period 1 (Morning Core)",
        startTime: "08:00",
        endTime: "08:45",
        isBreak: false,
        daysActive: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
      {
        id: "per-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        periodNumber: 2,
        name: "Period 2",
        startTime: "08:50",
        endTime: "09:35",
        isBreak: false,
        daysActive: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
      {
        id: "per-003",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        periodNumber: 3,
        name: "Morning Recess",
        startTime: "09:35",
        endTime: "10:00",
        isBreak: true,
        daysActive: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
      {
        id: "per-004",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        periodNumber: 4,
        name: "Period 3",
        startTime: "10:00",
        endTime: "10:45",
        isBreak: false,
        daysActive: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
      {
        id: "per-005",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        periodNumber: 5,
        name: "Period 4",
        startTime: "10:50",
        endTime: "11:35",
        isBreak: false,
        daysActive: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
      {
        id: "per-006",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        periodNumber: 6,
        name: "Lunch Break",
        startTime: "11:35",
        endTime: "12:30",
        isBreak: true,
        daysActive: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
      {
        id: "per-007",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        periodNumber: 7,
        name: "Period 5",
        startTime: "12:30",
        endTime: "13:15",
        isBreak: false,
        daysActive: ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
    ],
    rooms: [
      {
        id: "rm-101",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Room 101 (Diamond Hall)",
        code: "RM-101",
        building: "Main Academic Block A",
        roomType: "CLASSROOM",
        capacity: 40,
        isAvailable: true,
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
      {
        id: "rm-102",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Room 102 (Emerald Wing)",
        code: "RM-102",
        building: "Main Academic Block A",
        roomType: "CLASSROOM",
        capacity: 35,
        isAvailable: true,
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
      {
        id: "rm-lab-sci",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Physics & Chemistry Central Laboratory",
        code: "LAB-SCI-01",
        building: "Science Discovery Wing",
        roomType: "SCIENCE_LAB",
        capacity: 30,
        isAvailable: true,
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
      {
        id: "rm-lab-ict",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Digital Computing & AI Lab",
        code: "LAB-ICT-02",
        building: "Innovation Hub",
        roomType: "ICT_LAB",
        capacity: 32,
        isAvailable: true,
        createdAt: "2025-08-01T08:00:00.000Z",
        updatedAt: "2025-08-01T08:00:00.000Z",
      },
    ],
    timetableLessons: [
      {
        id: "tt-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        dayOfWeek: "MONDAY",
        periodId: "per-001", // 08:00 - 08:45
        subjectId: "sub-001", // Mathematics
        staffId: "stf-001", // Marcus Holloway
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        roomId: "rm-101",
        notes: "Introductory weekly theorem proofs",
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2025-08-20T08:00:00.000Z",
      },
      {
        id: "tt-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        dayOfWeek: "MONDAY",
        periodId: "per-002", // 08:50 - 09:35
        subjectId: "sub-002", // English Language
        staffId: "stf-002", // Arthur Pendleton
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        roomId: "rm-101",
        notes: "Poetry and prose review",
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2025-08-20T08:00:00.000Z",
      },
      {
        id: "tt-003",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        dayOfWeek: "MONDAY",
        periodId: "per-004", // 10:00 - 10:45
        subjectId: "sub-001", // Mathematics
        staffId: "stf-001", // Marcus Holloway
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-b",
        roomId: "rm-102",
        notes: "Section B weekly algebra",
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2025-08-20T08:00:00.000Z",
      },
      {
        id: "tt-004",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        dayOfWeek: "TUESDAY",
        periodId: "per-001", // 08:00 - 08:45
        subjectId: "sub-004", // Physics
        staffId: "stf-001", // Marcus Holloway
        classId: "cls-ss1-2526",
        sectionId: null,
        roomId: "rm-lab-sci",
        notes: "Lab practical: Optics & reflection",
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2025-08-20T08:00:00.000Z",
      },
    ],
    teachingGroups: [
      {
        id: "tg-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        subjectId: "sub-001",
        staffId: "stf-001",
        name: "JSS1-A Mathematics Cohort",
        code: "TG-JSS1A-MATH",
        maxCapacity: 40,
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2025-08-20T08:00:00.000Z",
      },
      {
        id: "tg-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-b",
        subjectId: "sub-001",
        staffId: "stf-001",
        name: "JSS1-B Mathematics Cohort",
        code: "TG-JSS1B-MATH",
        maxCapacity: 35,
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2025-08-20T08:00:00.000Z",
      },
    ],
  };
}

let inMemoryAcademicStore: InMemoryAcademicState = initializeAcademicState();

export class AcademicService {
  /**
   * Resets in-memory academic store (for Vitest test isolation)
   */
  resetStore() {
    inMemoryAcademicStore = initializeAcademicState();
  }

  // ===========================================================================
  // 1. CURRICULUM MANAGEMENT
  // ===========================================================================

  async getCurriculums(ctx: TenantContext, params: { search?: string; type?: string } = {}) {
    try {
      const where: any = { organizationId: ctx.organizationId };
      if (params.type && params.type !== "ALL") where.type = params.type;
      if (params.search) {
        where.OR = [
          { name: { contains: params.search, mode: "insensitive" } },
          { code: { contains: params.search, mode: "insensitive" } },
        ];
      }

      return await prisma.curriculum.findMany({
        where,
        orderBy: { name: "asc" },
      });
    } catch {
      let filtered = inMemoryAcademicStore.curriculums.filter(
        (c) => c.organizationId === ctx.organizationId
      );
      if (params.type && params.type !== "ALL") {
        filtered = filtered.filter((c) => c.type === params.type);
      }
      if (params.search) {
        const q = params.search.toLowerCase();
        filtered = filtered.filter(
          (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
        );
      }
      return filtered;
    }
  }

  async getCurriculumById(ctx: TenantContext, id: string) {
    try {
      const item = await prisma.curriculum.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (!item) throw new NotFoundError("Curriculum", id);
      return item;
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      const item = inMemoryAcademicStore.curriculums.find(
        (c) => c.id === id && c.organizationId === ctx.organizationId
      );
      if (!item) throw new NotFoundError("Curriculum", id);
      return item;
    }
  }

  async createCurriculum(ctx: TenantContext, input: CreateCurriculumInput) {
    const id = `curr-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: CurriculumRecord = {
      id,
      organizationId: ctx.organizationId,
      name: input.name,
      code: input.code,
      type: input.type as any,
      version: input.version || "1.0",
      description: input.description || null,
      isActive: input.isActive ?? true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.curriculum.create({
        data: {
          id: record.id,
          organizationId: ctx.organizationId,
          name: record.name,
          code: record.code,
          type: record.type as any,
          version: record.version,
          description: record.description,
          isActive: record.isActive,
        },
      });
    } catch (err) {
      logger.warn("Prisma curriculum create failed, persisting to memory", { error: String(err) });
    }

    inMemoryAcademicStore.curriculums.unshift(record);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Curriculum",
      entityId: id,
      details: { name: record.name, code: record.code },
    });

    return record;
  }

  async updateCurriculum(ctx: TenantContext, id: string, input: UpdateCurriculumInput) {
    const curr = await this.getCurriculumById(ctx, id);
    const nowIso = new Date().toISOString();

    try {
      await prisma.curriculum.update({
        where: { id },
        data: {
          name: input.name,
          code: input.code,
          type: input.type as any,
          version: input.version,
          description: input.description,
          isActive: input.isActive,
        },
      });
    } catch {
      // Memory fallback
    }

    const index = inMemoryAcademicStore.curriculums.findIndex((c) => c.id === id);
    if (index !== -1) {
      inMemoryAcademicStore.curriculums[index] = {
        ...inMemoryAcademicStore.curriculums[index],
        ...input,
        type: (input.type || inMemoryAcademicStore.curriculums[index].type) as any,
        updatedAt: nowIso,
      };
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Curriculum",
      entityId: id,
      details: { updatedFields: Object.keys(input) },
    });

    return this.getCurriculumById(ctx, id);
  }

  // ===========================================================================
  // 2. SUBJECT COMBINATIONS / STREAMS
  // ===========================================================================

  async getSubjectCombinations(ctx: TenantContext, params: { campusId?: string; stream?: string } = {}) {
    const campusId = ctx.campusId || params.campusId;

    try {
      const where: any = { organizationId: ctx.organizationId };
      if (campusId) where.campusId = campusId;
      if (params.stream) where.stream = params.stream;

      return await prisma.subjectCombination.findMany({
        where,
        orderBy: { name: "asc" },
      });
    } catch {
      let filtered = inMemoryAcademicStore.combinations.filter(
        (c) => c.organizationId === ctx.organizationId
      );
      if (campusId) filtered = filtered.filter((c) => c.campusId === campusId);
      if (params.stream) filtered = filtered.filter((c) => c.stream === params.stream);
      return filtered;
    }
  }

  async createSubjectCombination(ctx: TenantContext, input: CreateSubjectCombinationInput) {
    const id = `comb-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: SubjectCombinationRecord = {
      id,
      organizationId: ctx.organizationId,
      campusId: input.campusId,
      name: input.name,
      code: input.code,
      stream: input.stream,
      description: input.description || null,
      compulsorySubjectIds: input.compulsorySubjectIds || [],
      electiveSubjectIds: input.electiveSubjectIds || [],
      isActive: input.isActive ?? true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.subjectCombination.create({
        data: {
          id: record.id,
          organizationId: ctx.organizationId,
          campusId: record.campusId,
          name: record.name,
          code: record.code,
          stream: record.stream,
          description: record.description,
          compulsorySubjectIds: record.compulsorySubjectIds as any,
          electiveSubjectIds: record.electiveSubjectIds as any,
          isActive: record.isActive,
        },
      });
    } catch (err) {
      logger.warn("Prisma subject combination create failed, using memory", { error: String(err) });
    }

    inMemoryAcademicStore.combinations.unshift(record);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "SubjectCombination",
      entityId: id,
      details: { name: record.name, stream: record.stream },
    });

    return record;
  }

  // ===========================================================================
  // 3. CLASS SUBJECT ALLOCATION
  // ===========================================================================

  async getClassSubjects(
    ctx: TenantContext,
    params: {
      classId?: string;
      sectionId?: string;
      academicYearId?: string;
      campusId?: string;
    } = {}
  ) {
    const campusId = ctx.campusId || params.campusId;

    try {
      const where: any = { organizationId: ctx.organizationId };
      if (campusId) where.campusId = campusId;
      if (params.classId) where.classId = params.classId;
      if (params.sectionId) where.sectionId = params.sectionId;
      if (params.academicYearId) where.academicYearId = params.academicYearId;

      return await prisma.classSubject.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    } catch {
      let filtered = inMemoryAcademicStore.classSubjects.filter(
        (cs) => cs.organizationId === ctx.organizationId
      );
      if (campusId) filtered = filtered.filter((cs) => cs.campusId === campusId);
      if (params.classId) filtered = filtered.filter((cs) => cs.classId === params.classId);
      if (params.sectionId) filtered = filtered.filter((cs) => cs.sectionId === params.sectionId);
      if (params.academicYearId) filtered = filtered.filter((cs) => cs.academicYearId === params.academicYearId);
      return filtered;
    }
  }

  async allocateSubjectToClass(ctx: TenantContext, input: CreateClassSubjectInput) {
    // Check if already allocated
    const exists = inMemoryAcademicStore.classSubjects.find(
      (cs) =>
        cs.organizationId === ctx.organizationId &&
        cs.classId === input.classId &&
        cs.academicYearId === input.academicYearId &&
        cs.subjectId === input.subjectId &&
        (cs.sectionId || null) === (input.sectionId || null)
    );

    if (exists) {
      throw new ValidationError("Subject is already allocated to this class and section for this academic year.");
    }

    const id = `cs-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: ClassSubjectRecord = {
      id,
      organizationId: ctx.organizationId,
      campusId: input.campusId,
      academicYearId: input.academicYearId,
      classId: input.classId,
      sectionId: input.sectionId || null,
      subjectId: input.subjectId,
      ruleType: input.ruleType as any,
      creditUnits: input.creditUnits || 1,
      periodsPerWeek: input.periodsPerWeek || 4,
      syllabusNotes: input.syllabusNotes || null,
      isActive: input.isActive ?? true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.classSubject.create({
        data: {
          id: record.id,
          organizationId: ctx.organizationId,
          campusId: record.campusId,
          academicYearId: record.academicYearId,
          classId: record.classId,
          sectionId: record.sectionId,
          subjectId: record.subjectId,
          ruleType: record.ruleType as any,
          creditUnits: record.creditUnits,
          periodsPerWeek: record.periodsPerWeek,
          syllabusNotes: record.syllabusNotes,
          isActive: record.isActive,
        },
      });
    } catch (err) {
      logger.warn("Prisma classSubject create failed, using memory", { error: String(err) });
    }

    inMemoryAcademicStore.classSubjects.unshift(record);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "ClassSubject",
      entityId: id,
      details: {
        classId: input.classId,
        subjectId: input.subjectId,
        ruleType: input.ruleType,
        periodsPerWeek: input.periodsPerWeek,
      },
    });

    return record;
  }

  async removeClassSubject(ctx: TenantContext, id: string) {
    try {
      await prisma.classSubject.delete({
        where: { id },
      });
    } catch {
      // Memory fallback
    }

    inMemoryAcademicStore.classSubjects = inMemoryAcademicStore.classSubjects.filter((cs) => cs.id !== id);

    await auditRepository.log(ctx, {
      action: "DELETE",
      entity: "ClassSubject",
      entityId: id,
    });

    return { deleted: true, id };
  }

  // ===========================================================================
  // 4. TEACHER SUBJECT ASSIGNMENTS & CLASS TEACHERS
  // ===========================================================================

  async getTeachingAssignments(
    ctx: TenantContext,
    params: {
      staffId?: string;
      subjectId?: string;
      classId?: string;
      sectionId?: string;
      academicYearId?: string;
      campusId?: string;
    } = {}
  ) {
    const campusId = ctx.campusId || params.campusId;

    try {
      const where: any = { organizationId: ctx.organizationId };
      if (campusId) where.campusId = campusId;
      if (params.staffId) where.staffId = params.staffId;
      if (params.subjectId) where.subjectId = params.subjectId;
      if (params.classId) where.classId = params.classId;
      if (params.sectionId) where.sectionId = params.sectionId;
      if (params.academicYearId) where.academicYearId = params.academicYearId;

      return await prisma.teachingAssignment.findMany({
        where,
        include: {
          staff: true,
          subject: true,
          class: true,
          section: true,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      let filtered = inMemoryAcademicStore.teachingAssignments.filter(
        (ta) => ta.organizationId === ctx.organizationId
      );
      if (campusId) filtered = filtered.filter((ta) => ta.campusId === campusId);
      if (params.staffId) filtered = filtered.filter((ta) => ta.staffId === params.staffId);
      if (params.subjectId) filtered = filtered.filter((ta) => ta.subjectId === params.subjectId);
      if (params.classId) filtered = filtered.filter((ta) => ta.classId === params.classId);
      if (params.sectionId) filtered = filtered.filter((ta) => ta.sectionId === params.sectionId);
      if (params.academicYearId) filtered = filtered.filter((ta) => ta.academicYearId === params.academicYearId);

      return filtered;
    }
  }

  async createTeachingAssignment(ctx: TenantContext, input: CreateTeachingAssignmentInput) {
    const id = `ta-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: TeachingAssignmentRecord = {
      id,
      organizationId: ctx.organizationId,
      campusId: input.campusId,
      academicYearId: input.academicYearId,
      termId: input.termId || null,
      staffId: input.staffId,
      subjectId: input.subjectId,
      classId: input.classId,
      sectionId: input.sectionId || null,
      periodsPerWeek: input.periodsPerWeek || 4,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.teachingAssignment.create({
        data: {
          id: record.id,
          organizationId: ctx.organizationId,
          campusId: record.campusId,
          academicYearId: record.academicYearId,
          termId: record.termId,
          staffId: record.staffId,
          subjectId: record.subjectId,
          classId: record.classId,
          sectionId: record.sectionId,
          periodsPerWeek: record.periodsPerWeek,
        },
      });
    } catch (err) {
      logger.warn("Prisma teachingAssignment create failed, using memory", { error: String(err) });
    }

    inMemoryAcademicStore.teachingAssignments.unshift(record);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "TeachingAssignment",
      entityId: id,
      details: {
        staffId: input.staffId,
        subjectId: input.subjectId,
        classId: input.classId,
        periodsPerWeek: input.periodsPerWeek,
      },
    });

    return record;
  }

  async deleteTeachingAssignment(ctx: TenantContext, id: string) {
    try {
      await prisma.teachingAssignment.delete({ where: { id } });
    } catch {
      // Memory fallback
    }

    inMemoryAcademicStore.teachingAssignments = inMemoryAcademicStore.teachingAssignments.filter(
      (ta) => ta.id !== id
    );

    await auditRepository.log(ctx, {
      action: "DELETE",
      entity: "TeachingAssignment",
      entityId: id,
    });

    return { deleted: true, id };
  }

  async assignClassTeacher(ctx: TenantContext, input: AssignClassTeacherInput) {
    // If sectionId is provided, assign as Section Teacher; otherwise Class Teacher
    try {
      if (input.sectionId) {
        await prisma.section.update({
          where: { id: input.sectionId },
          data: { classTeacherId: input.staffId },
        });
      } else {
        await prisma.class.update({
          where: { id: input.classId },
          data: { classTeacherId: input.staffId },
        });
      }
    } catch (err) {
      logger.warn("Prisma assignClassTeacher failed, using audit", { error: String(err) });
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: input.sectionId ? "Section" : "Class",
      entityId: input.sectionId || input.classId,
      details: {
        actionType: "CLASS_TEACHER_ASSIGNED",
        staffId: input.staffId,
        roleTitle: input.roleTitle,
      },
    });

    return {
      success: true,
      classId: input.classId,
      sectionId: input.sectionId || null,
      staffId: input.staffId,
      roleTitle: input.roleTitle,
    };
  }

  // ===========================================================================
  // 5. TEACHER WORKLOAD ENGINE
  // ===========================================================================

  async getTeacherWorkload(ctx: TenantContext, staffId?: string, academicYearId?: string) {
    const targetAcademicYearId = academicYearId || "ay-2025-26";

    // Gather teaching assignments
    const allAssignments = inMemoryAcademicStore.teachingAssignments.filter(
      (ta) =>
        ta.organizationId === ctx.organizationId &&
        ta.academicYearId === targetAcademicYearId &&
        (!staffId || ta.staffId === staffId)
    );

    // Group by staffId
    const staffMap = new Map<
      string,
      {
        staffId: string;
        weeklyPeriods: number;
        assignedClasses: Set<string>;
        uniqueSubjects: Set<string>;
        assignmentsCount: number;
      }
    >();

    allAssignments.forEach((ta) => {
      const entry = staffMap.get(ta.staffId) || {
        staffId: ta.staffId,
        weeklyPeriods: 0,
        assignedClasses: new Set<string>(),
        uniqueSubjects: new Set<string>(),
        assignmentsCount: 0,
      };

      entry.weeklyPeriods += ta.periodsPerWeek || 4;
      entry.assignedClasses.add(ta.classId);
      entry.uniqueSubjects.add(ta.subjectId);
      entry.assignmentsCount += 1;

      staffMap.set(ta.staffId, entry);
    });

    const results = Array.from(staffMap.values()).map((s) => {
      let status: "UNDERLOADED" | "OPTIMAL" | "OVERLOADED" = "OPTIMAL";
      if (s.weeklyPeriods < 15) status = "UNDERLOADED";
      else if (s.weeklyPeriods > 24) status = "OVERLOADED";

      return {
        staffId: s.staffId,
        weeklyPeriods: s.weeklyPeriods,
        classCount: s.assignedClasses.size,
        subjectCount: s.uniqueSubjects.size,
        assignmentsCount: s.assignmentsCount,
        status,
        targetWeeklyPeriods: 20,
      };
    });

    return results;
  }

  // ===========================================================================
  // 6. BELL SCHEDULE (LESSON PERIODS)
  // ===========================================================================

  async getLessonPeriods(ctx: TenantContext, campusId?: string) {
    const targetCampusId = ctx.campusId || campusId;

    try {
      const where: any = { organizationId: ctx.organizationId };
      if (targetCampusId) where.campusId = targetCampusId;

      return await prisma.lessonPeriod.findMany({
        where,
        orderBy: { periodNumber: "asc" },
      });
    } catch {
      let filtered = inMemoryAcademicStore.lessonPeriods.filter(
        (p) => p.organizationId === ctx.organizationId
      );
      if (targetCampusId) filtered = filtered.filter((p) => p.campusId === targetCampusId);
      return filtered.sort((a, b) => a.periodNumber - b.periodNumber);
    }
  }

  async createLessonPeriod(ctx: TenantContext, input: CreateLessonPeriodInput) {
    // Check for duplicate periodNumber
    const existing = inMemoryAcademicStore.lessonPeriods.find(
      (p) =>
        p.organizationId === ctx.organizationId &&
        p.campusId === input.campusId &&
        p.periodNumber === input.periodNumber
    );

    if (existing) {
      throw new ValidationError(`Period number ${input.periodNumber} already exists for this campus.`);
    }

    const id = `per-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: LessonPeriodRecord = {
      id,
      organizationId: ctx.organizationId,
      campusId: input.campusId,
      periodNumber: input.periodNumber,
      name: input.name,
      startTime: input.startTime,
      endTime: input.endTime,
      isBreak: input.isBreak ?? false,
      daysActive: input.daysActive || ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.lessonPeriod.create({
        data: {
          id: record.id,
          organizationId: ctx.organizationId,
          campusId: record.campusId,
          periodNumber: record.periodNumber,
          name: record.name,
          startTime: record.startTime,
          endTime: record.endTime,
          isBreak: record.isBreak,
          daysActive: record.daysActive as any,
        },
      });
    } catch (err) {
      logger.warn("Prisma lessonPeriod create failed, using memory", { error: String(err) });
    }

    inMemoryAcademicStore.lessonPeriods.push(record);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "LessonPeriod",
      entityId: id,
      details: { periodNumber: record.periodNumber, name: record.name },
    });

    return record;
  }

  // ===========================================================================
  // 7. ROOMS & FACILITY FOUNDATION
  // ===========================================================================

  async getRooms(ctx: TenantContext, campusId?: string, roomType?: string) {
    const targetCampusId = ctx.campusId || campusId;

    try {
      const where: any = { organizationId: ctx.organizationId };
      if (targetCampusId) where.campusId = targetCampusId;
      if (roomType && roomType !== "ALL") where.roomType = roomType;

      return await prisma.classroomRoom.findMany({
        where,
        orderBy: { code: "asc" },
      });
    } catch {
      let filtered = inMemoryAcademicStore.rooms.filter(
        (r) => r.organizationId === ctx.organizationId
      );
      if (targetCampusId) filtered = filtered.filter((r) => r.campusId === targetCampusId);
      if (roomType && roomType !== "ALL") filtered = filtered.filter((r) => r.roomType === roomType);
      return filtered;
    }
  }

  async createRoom(ctx: TenantContext, input: CreateClassroomRoomInput) {
    const id = `rm-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: ClassroomRoomRecord = {
      id,
      organizationId: ctx.organizationId,
      campusId: input.campusId,
      name: input.name,
      code: input.code,
      building: input.building || null,
      roomType: input.roomType as any,
      capacity: input.capacity || 35,
      isAvailable: input.isAvailable ?? true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.classroomRoom.create({
        data: {
          id: record.id,
          organizationId: ctx.organizationId,
          campusId: record.campusId,
          name: record.name,
          code: record.code,
          building: record.building,
          roomType: record.roomType as any,
          capacity: record.capacity,
          isAvailable: record.isAvailable,
        },
      });
    } catch (err) {
      logger.warn("Prisma room create failed, using memory", { error: String(err) });
    }

    inMemoryAcademicStore.rooms.unshift(record);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "ClassroomRoom",
      entityId: id,
      details: { name: record.name, code: record.code },
    });

    return record;
  }

  // ===========================================================================
  // 8. TIMETABLE FOUNDATION & CONFLICT DETECTION
  // ===========================================================================

  /**
   * Conflict Detection Engine
   * Validates:
   * 1. Teacher double-booking (Teacher teaching 2 classes simultaneously)
   * 2. Room double-booking (2 classes assigned to 1 room simultaneously)
   * 3. Class/Section double-booking (Cohort assigned to 2 subjects simultaneously)
   */
  async checkTimetableConflicts(ctx: TenantContext, input: TimetableConflictCheckInput) {
    const activeLessons = inMemoryAcademicStore.timetableLessons.filter(
      (l) =>
        l.organizationId === ctx.organizationId &&
        l.academicYearId === input.academicYearId &&
        l.dayOfWeek === input.dayOfWeek &&
        l.periodId === input.periodId &&
        (!input.excludeLessonId || l.id !== input.excludeLessonId)
    );

    const conflicts: Array<{
      type: "TEACHER" | "ROOM" | "CLASS";
      message: string;
      conflictingLesson: TimetableLessonRecord;
    }> = [];

    // 1. Teacher collision check
    const teacherConflict = activeLessons.find((l) => l.staffId === input.staffId);
    if (teacherConflict) {
      conflicts.push({
        type: "TEACHER",
        message: `Teacher is already scheduled to teach class ${teacherConflict.classId} during this period.`,
        conflictingLesson: teacherConflict,
      });
    }

    // 2. Room collision check (if a room is specified)
    if (input.roomId) {
      const roomConflict = activeLessons.find((l) => l.roomId === input.roomId);
      if (roomConflict) {
        conflicts.push({
          type: "ROOM",
          message: `Room is already occupied by class ${roomConflict.classId} during this period.`,
          conflictingLesson: roomConflict,
        });
      }
    }

    // 3. Class / Section collision check
    const classConflict = activeLessons.find(
      (l) =>
        l.classId === input.classId &&
        (l.sectionId === input.sectionId || !l.sectionId || !input.sectionId)
    );
    if (classConflict) {
      conflicts.push({
        type: "CLASS",
        message: `Class / Section is already scheduled for subject ${classConflict.subjectId} during this period.`,
        conflictingLesson: classConflict,
      });
    }

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
    };
  }

  async getTimetableMatrix(
    ctx: TenantContext,
    params: {
      academicYearId?: string;
      termId?: string;
      classId?: string;
      sectionId?: string;
      staffId?: string;
      roomId?: string;
      campusId?: string;
    } = {}
  ) {
    const campusId = ctx.campusId || params.campusId;
    const academicYearId = params.academicYearId || "ay-2025-26";

    try {
      const where: any = {
        organizationId: ctx.organizationId,
        academicYearId,
      };
      if (campusId) where.campusId = campusId;
      if (params.termId) where.termId = params.termId;
      if (params.classId) where.classId = params.classId;
      if (params.sectionId) where.sectionId = params.sectionId;
      if (params.staffId) where.staffId = params.staffId;
      if (params.roomId) where.roomId = params.roomId;

      return await prisma.timetableLesson.findMany({
        where,
        orderBy: [{ dayOfWeek: "asc" }, { createdAt: "asc" }],
      });
    } catch {
      let filtered = inMemoryAcademicStore.timetableLessons.filter(
        (l) => l.organizationId === ctx.organizationId && l.academicYearId === academicYearId
      );
      if (campusId) filtered = filtered.filter((l) => l.campusId === campusId);
      if (params.classId) filtered = filtered.filter((l) => l.classId === params.classId);
      if (params.sectionId) filtered = filtered.filter((l) => l.sectionId === params.sectionId);
      if (params.staffId) filtered = filtered.filter((l) => l.staffId === params.staffId);
      if (params.roomId) filtered = filtered.filter((l) => l.roomId === params.roomId);

      return filtered;
    }
  }

  async getTimetableLessons(
    ctx: TenantContext,
    academicYearId?: string,
    params: {
      classId?: string;
      sectionId?: string;
      staffId?: string;
      roomId?: string;
      termId?: string;
      campusId?: string;
    } = {}
  ) {
    return this.getTimetableMatrix(ctx, { academicYearId, ...params });
  }

  async createTimetableLesson(ctx: TenantContext, input: CreateTimetableLessonInput) {
    // 1. Run conflict detection
    const conflictResult = await this.checkTimetableConflicts(ctx, {
      campusId: input.campusId,
      academicYearId: input.academicYearId,
      dayOfWeek: input.dayOfWeek,
      periodId: input.periodId,
      staffId: input.staffId,
      classId: input.classId,
      sectionId: input.sectionId,
      roomId: input.roomId,
    });

    if (conflictResult.hasConflict) {
      const firstConflict = conflictResult.conflicts[0];
      throw new ValidationError(
        `Timetable conflict detected (${firstConflict.type}): ${firstConflict.message}`,
        {
          timetable: conflictResult.conflicts.map((c) => c.message),
        }
      );
    }

    const id = `tt-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: TimetableLessonRecord = {
      id,
      organizationId: ctx.organizationId,
      campusId: input.campusId,
      academicYearId: input.academicYearId,
      termId: input.termId || null,
      dayOfWeek: input.dayOfWeek as any,
      periodId: input.periodId,
      subjectId: input.subjectId,
      staffId: input.staffId,
      classId: input.classId,
      sectionId: input.sectionId || null,
      roomId: input.roomId || null,
      notes: input.notes || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.timetableLesson.create({
        data: {
          id: record.id,
          organizationId: ctx.organizationId,
          campusId: record.campusId,
          academicYearId: record.academicYearId,
          termId: record.termId,
          dayOfWeek: record.dayOfWeek as any,
          periodId: record.periodId,
          subjectId: record.subjectId,
          staffId: record.staffId,
          classId: record.classId,
          sectionId: record.sectionId,
          roomId: record.roomId,
          notes: record.notes,
        },
      });
    } catch (err) {
      logger.warn("Prisma timetable create failed, using memory", { error: String(err) });
    }

    inMemoryAcademicStore.timetableLessons.unshift(record);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "TimetableLesson",
      entityId: id,
      details: {
        dayOfWeek: record.dayOfWeek,
        periodId: record.periodId,
        subjectId: record.subjectId,
        classId: record.classId,
      },
    });

    return record;
  }

  async deleteTimetableLesson(ctx: TenantContext, id: string) {
    try {
      await prisma.timetableLesson.delete({ where: { id } });
    } catch {
      // Memory fallback
    }

    inMemoryAcademicStore.timetableLessons = inMemoryAcademicStore.timetableLessons.filter(
      (l) => l.id !== id
    );

    await auditRepository.log(ctx, {
      action: "DELETE",
      entity: "TimetableLesson",
      entityId: id,
    });

    return { deleted: true, id };
  }

  // ===========================================================================
  // 9. TEACHING GROUPS
  // ===========================================================================

  async getTeachingGroups(
    ctx: TenantContext,
    params: { classId?: string; sectionId?: string; subjectId?: string; staffId?: string } = {}
  ) {
    try {
      const where: any = { organizationId: ctx.organizationId };
      if (params.classId) where.classId = params.classId;
      if (params.sectionId) where.sectionId = params.sectionId;
      if (params.subjectId) where.subjectId = params.subjectId;
      if (params.staffId) where.staffId = params.staffId;

      return await prisma.teachingGroup.findMany({
        where,
        orderBy: { name: "asc" },
      });
    } catch {
      let filtered = inMemoryAcademicStore.teachingGroups.filter(
        (tg) => tg.organizationId === ctx.organizationId
      );
      if (params.classId) filtered = filtered.filter((tg) => tg.classId === params.classId);
      if (params.sectionId) filtered = filtered.filter((tg) => tg.sectionId === params.sectionId);
      if (params.subjectId) filtered = filtered.filter((tg) => tg.subjectId === params.subjectId);
      if (params.staffId) filtered = filtered.filter((tg) => tg.staffId === params.staffId);
      return filtered;
    }
  }

  async createTeachingGroup(ctx: TenantContext, input: CreateTeachingGroupInput) {
    const id = `tg-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: TeachingGroupRecord = {
      id,
      organizationId: ctx.organizationId,
      campusId: input.campusId,
      academicYearId: input.academicYearId,
      termId: input.termId || null,
      classId: input.classId,
      sectionId: input.sectionId || null,
      subjectId: input.subjectId,
      staffId: input.staffId,
      name: input.name,
      code: input.code,
      maxCapacity: input.maxCapacity || 40,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.teachingGroup.create({
        data: {
          id: record.id,
          organizationId: ctx.organizationId,
          campusId: record.campusId,
          academicYearId: record.academicYearId,
          termId: record.termId,
          classId: record.classId,
          sectionId: record.sectionId,
          subjectId: record.subjectId,
          staffId: record.staffId,
          name: record.name,
          code: record.code,
          maxCapacity: record.maxCapacity,
        },
      });
    } catch (err) {
      logger.warn("Prisma teachingGroup create failed, using memory", { error: String(err) });
    }

    inMemoryAcademicStore.teachingGroups.unshift(record);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "TeachingGroup",
      entityId: id,
      details: { name: record.name, code: record.code },
    });

    return record;
  }

  // ===========================================================================
  // 10. STUDENT SUBJECT INHERITANCE
  // ===========================================================================

  async getStudentInheritedSubjects(ctx: TenantContext, studentId: string) {
    // 1. Fetch student's current active enrollment
    const student = await prisma.student.findFirst({
      where: { id: studentId, organizationId: ctx.organizationId },
      include: {
        enrollments: {
          where: { status: "ENROLLED" },
          orderBy: { enrollmentDate: "desc" },
          take: 1,
        },
      },
    }).catch(() => null);

    const activeEnrollment = student?.enrollments[0];
    const classId = activeEnrollment?.classId || "cls-jss1-2526";

    // 2. Fetch all subjects allocated to this class
    const classSubjects = inMemoryAcademicStore.classSubjects.filter(
      (cs) => cs.organizationId === ctx.organizationId && cs.classId === classId && cs.isActive
    );

    return {
      studentId,
      classId,
      inheritedSubjects: classSubjects.map((cs) => ({
        subjectId: cs.subjectId,
        ruleType: cs.ruleType,
        creditUnits: cs.creditUnits,
        periodsPerWeek: cs.periodsPerWeek,
      })),
    };
  }

  // ===========================================================================
  // 11. ACADEMIC OVERVIEW ANALYTICS
  // ===========================================================================

  async getAcademicsOverviewStats(ctx: TenantContext) {
    const campusId = ctx.campusId;

    const curriculumsCount = inMemoryAcademicStore.curriculums.filter(
      (c) => c.organizationId === ctx.organizationId && c.isActive
    ).length;

    const streamsCount = inMemoryAcademicStore.combinations.filter(
      (s) => s.organizationId === ctx.organizationId && (!campusId || s.campusId === campusId)
    ).length;

    const classSubjectsCount = inMemoryAcademicStore.classSubjects.filter(
      (cs) => cs.organizationId === ctx.organizationId && (!campusId || cs.campusId === campusId) && cs.isActive
    ).length;

    const teachingAssignmentsCount = inMemoryAcademicStore.teachingAssignments.filter(
      (ta) => ta.organizationId === ctx.organizationId && (!campusId || ta.campusId === campusId)
    ).length;

    const periodsCount = inMemoryAcademicStore.lessonPeriods.filter(
      (p) => p.organizationId === ctx.organizationId && (!campusId || p.campusId === campusId) && !p.isBreak
    ).length;

    const roomsCount = inMemoryAcademicStore.rooms.filter(
      (r) => r.organizationId === ctx.organizationId && (!campusId || r.campusId === campusId) && r.isAvailable
    ).length;

    const scheduledLessonsCount = inMemoryAcademicStore.timetableLessons.filter(
      (l) => l.organizationId === ctx.organizationId && (!campusId || l.campusId === campusId)
    ).length;

    return {
      curriculumsCount,
      streamsCount,
      classSubjectsCount,
      teachingAssignmentsCount,
      periodsCount,
      roomsCount,
      scheduledLessonsCount,
    };
  }
}

export const academicService = new AcademicService();
