import { prisma } from "@/lib/db";
import { TenantContext } from "@/repositories/types";
import { auditRepository } from "@/repositories/audit.repository";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { sanitizeUploadedFileName } from "@/lib/security";
import {
  CreateStudentWithEnrollmentInput,
  UpdateStudentInput,
  PromoteStudentInput,
  TransferStudentInput,
  CreateGuardianDto,
  LinkStudentGuardianInput,
  CreateAdmissionApplicationInput,
  ReviewAdmissionApplicationInput,
  EnrollAdmissionApplicationInput,
  StudentDocumentUploadInput,
} from "@/lib/validations/student";
import {
  DEMO_ORG_ID,
  DEMO_CAMPUS_MAIN_ID,
  DEMO_CAMPUS_WEST_ID,
} from "./admin.service";

export interface StudentRecord {
  id: string;
  organizationId: string;
  campusId: string;
  admissionNumber: string;
  userId?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  nationality?: string | null;
  religion?: string | null;
  bloodGroup?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  admissionDate: string;
  status: "ACTIVE" | "INACTIVE" | "GRADUATED" | "SUSPENDED" | "TRANSFERRED" | "WITHDRAWN";
  avatarUrl?: string | null;
  medicalNotes?: string | null;
  emergencyNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentEnrollmentRecord {
  id: string;
  studentId: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  termId?: string | null;
  classId: string;
  sectionId?: string | null;
  rollNumber?: string | null;
  enrollmentDate: string;
  status: "ENROLLED" | "PROMOTED" | "REPEATING" | "TRANSFERRED" | "DROPPED";
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuardianRecord {
  id: string;
  organizationId: string;
  userId?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string | null;
  phone: string;
  alternatePhone?: string | null;
  address?: string | null;
  occupation?: string | null;
  employer?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentGuardianRecord {
  id: string;
  studentId: string;
  guardianId: string;
  relationship: string;
  isPrimary: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentTransferRecord {
  id: string;
  organizationId: string;
  studentId: string;
  fromCampusId: string;
  toCampusId: string;
  fromClassId: string;
  toClassId: string;
  fromSectionId?: string | null;
  toSectionId?: string | null;
  effectiveDate: string;
  reason: string;
  authorizedById?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface AdmissionApplicationRecord {
  id: string;
  organizationId: string;
  campusId: string;
  applicationNumber: string;
  academicYearId: string;
  classId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  guardianName: string;
  guardianRelationship: string;
  guardianEmail?: string | null;
  guardianPhone: string;
  status: "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "WITHDRAWN";
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  rejectionReason?: string | null;
  enrolledStudentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentDocumentRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  uploadedById?: string | null;
  entityType: string;
  entityId: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface InMemoryStudentState {
  students: StudentRecord[];
  enrollments: StudentEnrollmentRecord[];
  guardians: GuardianRecord[];
  studentGuardians: StudentGuardianRecord[];
  transfers: StudentTransferRecord[];
  applications: AdmissionApplicationRecord[];
  documents: StudentDocumentRecord[];
  admissionSequence: number;
  applicationSequence: number;
}

function initializeStudentState(): InMemoryStudentState {
  return {
    students: [
      {
        id: "stu-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        admissionNumber: "STU-2025-00001",
        userId: "u-student-01",
        firstName: "Lucas",
        middleName: "Alexander",
        lastName: "Wright",
        dateOfBirth: "2011-04-12",
        gender: "MALE",
        nationality: "American",
        religion: "Christianity",
        bloodGroup: "O+",
        email: "lucas.wright@student.apex-demo.internal",
        phone: "+1 (555) 234-9988",
        address: "74 Harvard Street, Apt 3B, Cambridge, MA",
        admissionDate: "2025-08-20",
        status: "ACTIVE",
        avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256",
        medicalNotes: "Mild asthma; carries rescue inhaler.",
        emergencyNotes: "Contact mother Dr. Sarah Wright first.",
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2026-01-10T12:00:00.000Z",
      },
      {
        id: "stu-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        admissionNumber: "STU-2025-00002",
        firstName: "Amara",
        middleName: "Chidinma",
        lastName: "Okafor",
        dateOfBirth: "2011-07-25",
        gender: "FEMALE",
        nationality: "Nigerian-American",
        religion: "Christianity",
        bloodGroup: "A+",
        email: "amara.okafor@student.apex-demo.internal",
        phone: "+1 (555) 456-1122",
        address: "12 Concord Avenue, Cambridge, MA",
        admissionDate: "2025-08-20",
        status: "ACTIVE",
        avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=256",
        medicalNotes: "No known chronic illnesses. Peanut sensitivity.",
        emergencyNotes: "Father Emeka Okafor is primary emergency contact.",
        createdAt: "2025-08-20T08:30:00.000Z",
        updatedAt: "2025-08-20T08:30:00.000Z",
      },
      {
        id: "stu-003",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        admissionNumber: "STU-2025-00003",
        firstName: "Mateo",
        middleName: "Julian",
        lastName: "Silva",
        dateOfBirth: "2011-02-18",
        gender: "MALE",
        nationality: "Brazilian-American",
        religion: "Catholic",
        bloodGroup: "B+",
        email: "mateo.silva@student.apex-demo.internal",
        phone: "+1 (555) 987-6543",
        address: "88 Beacon Street, Boston, MA",
        admissionDate: "2025-08-21",
        status: "ACTIVE",
        avatarUrl: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=256",
        medicalNotes: "Wears corrective eyeglasses for reading.",
        emergencyNotes: "",
        createdAt: "2025-08-21T09:00:00.000Z",
        updatedAt: "2025-08-21T09:00:00.000Z",
      },
      {
        id: "stu-004",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_WEST_ID,
        admissionNumber: "STU-2025-00004",
        firstName: "Chloe",
        middleName: "Elise",
        lastName: "Bennett",
        dateOfBirth: "2009-11-05",
        gender: "FEMALE",
        nationality: "American",
        religion: "None",
        bloodGroup: "AB+",
        email: "chloe.bennett@student.apex-demo.internal",
        phone: "+1 (555) 321-7788",
        address: "210 Commonwealth Ave, Boston, MA",
        admissionDate: "2025-08-22",
        status: "ACTIVE",
        avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=256",
        medicalNotes: "Allergic to penicillin.",
        emergencyNotes: "Mother Evelyn Bennett.",
        createdAt: "2025-08-22T10:00:00.000Z",
        updatedAt: "2025-08-22T10:00:00.000Z",
      },
      {
        id: "stu-005",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        admissionNumber: "STU-2024-00018",
        firstName: "Devin",
        middleName: "Kai",
        lastName: "Wright",
        dateOfBirth: "2010-09-14",
        gender: "MALE",
        nationality: "American",
        religion: "Christianity",
        bloodGroup: "O-",
        email: "devin.wright@student.apex-demo.internal",
        phone: "+1 (555) 765-4321",
        address: "74 Harvard Street, Apt 3B, Cambridge, MA",
        admissionDate: "2024-08-18",
        status: "ACTIVE",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=256",
        medicalNotes: "None reported.",
        emergencyNotes: "Mother Dr. Sarah Wright.",
        createdAt: "2024-08-18T08:00:00.000Z",
        updatedAt: "2026-02-14T14:30:00.000Z",
      },
    ],
    enrollments: [
      {
        id: "enr-001",
        studentId: "stu-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        rollNumber: "JSS1-01",
        enrollmentDate: "2025-08-20T08:00:00.000Z",
        status: "ENROLLED",
        remarks: "Admitted into Diamond Section A",
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2025-08-20T08:00:00.000Z",
      },
      {
        id: "enr-002",
        studentId: "stu-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        rollNumber: "JSS1-02",
        enrollmentDate: "2025-08-20T08:30:00.000Z",
        status: "ENROLLED",
        remarks: "Admitted into Diamond Section A",
        createdAt: "2025-08-20T08:30:00.000Z",
        updatedAt: "2025-08-20T08:30:00.000Z",
      },
      {
        id: "enr-003",
        studentId: "stu-003",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-b",
        rollNumber: "JSS1-03",
        enrollmentDate: "2025-08-21T09:00:00.000Z",
        status: "ENROLLED",
        remarks: "Admitted into Emerald Section B",
        createdAt: "2025-08-21T09:00:00.000Z",
        updatedAt: "2025-08-21T09:00:00.000Z",
      },
      {
        id: "enr-004",
        studentId: "stu-004",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_WEST_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-ss1-2526",
        sectionId: null,
        rollNumber: "SS1-01",
        enrollmentDate: "2025-08-22T10:00:00.000Z",
        status: "ENROLLED",
        remarks: "Senior Secondary Year 1 placement",
        createdAt: "2025-08-22T10:00:00.000Z",
        updatedAt: "2025-08-22T10:00:00.000Z",
      },
      {
        id: "enr-005-prev",
        studentId: "stu-005",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2024-25",
        termId: null,
        classId: "cls-jss1-2425",
        sectionId: "sec-jss1-a-2425",
        rollNumber: "JSS1-18",
        enrollmentDate: "2024-08-18T08:00:00.000Z",
        status: "PROMOTED",
        remarks: "Promoted to Junior Secondary 2",
        createdAt: "2024-08-18T08:00:00.000Z",
        updatedAt: "2025-06-25T10:00:00.000Z",
      },
      {
        id: "enr-005-curr",
        studentId: "stu-005",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-b",
        rollNumber: "JSS2-05",
        enrollmentDate: "2025-08-20T08:00:00.000Z",
        status: "ENROLLED",
        remarks: "Current session enrollment",
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2025-08-20T08:00:00.000Z",
      },
    ],
    guardians: [
      {
        id: "grd-001",
        organizationId: DEMO_ORG_ID,
        userId: "u-parent-01",
        firstName: "Sarah",
        middleName: "Marie",
        lastName: "Wright",
        email: "sarah.wright@health.boston.internal",
        phone: "+1 (555) 234-9900",
        alternatePhone: "+1 (555) 234-9901",
        address: "74 Harvard Street, Apt 3B, Cambridge, MA",
        occupation: "Physician / Surgeon",
        employer: "Cambridge Health Alliance",
        isActive: true,
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2025-08-20T08:00:00.000Z",
      },
      {
        id: "grd-002",
        organizationId: DEMO_ORG_ID,
        firstName: "Emeka",
        middleName: "Chidi",
        lastName: "Okafor",
        email: "emeka.okafor@tech-ventures.internal",
        phone: "+1 (555) 456-1100",
        alternatePhone: "+1 (555) 456-1105",
        address: "12 Concord Avenue, Cambridge, MA",
        occupation: "Software Engineering Director",
        employer: "Apex Biometrics Corp",
        isActive: true,
        createdAt: "2025-08-20T08:30:00.000Z",
        updatedAt: "2025-08-20T08:30:00.000Z",
      },
      {
        id: "grd-003",
        organizationId: DEMO_ORG_ID,
        firstName: "Mariana",
        middleName: "Rosa",
        lastName: "Silva",
        email: "mariana.silva@architects.internal",
        phone: "+1 (555) 987-6500",
        alternatePhone: "",
        address: "88 Beacon Street, Boston, MA",
        occupation: "Urban Architect",
        employer: "Boston Design Collaborative",
        isActive: true,
        createdAt: "2025-08-21T09:00:00.000Z",
        updatedAt: "2025-08-21T09:00:00.000Z",
      },
    ],
    studentGuardians: [
      {
        id: "sg-001",
        studentId: "stu-001",
        guardianId: "grd-001",
        relationship: "MOTHER",
        isPrimary: true,
        isEmergencyContact: true,
        canPickup: true,
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2025-08-20T08:00:00.000Z",
      },
      {
        id: "sg-002",
        studentId: "stu-002",
        guardianId: "grd-002",
        relationship: "FATHER",
        isPrimary: true,
        isEmergencyContact: true,
        canPickup: true,
        createdAt: "2025-08-20T08:30:00.000Z",
        updatedAt: "2025-08-20T08:30:00.000Z",
      },
      {
        id: "sg-003",
        studentId: "stu-003",
        guardianId: "grd-003",
        relationship: "MOTHER",
        isPrimary: true,
        isEmergencyContact: true,
        canPickup: true,
        createdAt: "2025-08-21T09:00:00.000Z",
        updatedAt: "2025-08-21T09:00:00.000Z",
      },
      {
        id: "sg-004",
        studentId: "stu-005",
        guardianId: "grd-001",
        relationship: "MOTHER",
        isPrimary: true,
        isEmergencyContact: true,
        canPickup: true,
        createdAt: "2025-08-20T08:00:00.000Z",
        updatedAt: "2025-08-20T08:00:00.000Z",
      },
    ],
    transfers: [],
    applications: [
      {
        id: "app-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        applicationNumber: "APP-2026-00001",
        academicYearId: "ay-2026-27",
        classId: "cls-jss1-2526",
        firstName: "Julian",
        middleName: "David",
        lastName: "Chen",
        dateOfBirth: "2012-05-19",
        gender: "MALE",
        email: "david.chen@applicant-family.internal",
        phone: "+1 (555) 789-0011",
        address: "310 Oxford Street, Cambridge, MA",
        guardianName: "David Chen",
        guardianRelationship: "FATHER",
        guardianEmail: "david.chen@applicant-family.internal",
        guardianPhone: "+1 (555) 789-0011",
        status: "SUBMITTED",
        reviewNotes: "Prior academic records submitted. High proficiency in mathematics.",
        createdAt: "2026-02-01T10:15:00.000Z",
        updatedAt: "2026-02-01T10:15:00.000Z",
      },
      {
        id: "app-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        applicationNumber: "APP-2026-00002",
        academicYearId: "ay-2026-27",
        classId: "cls-jss1-2526",
        firstName: "Fatima",
        middleName: "Zahra",
        lastName: "Al-Mansoor",
        dateOfBirth: "2012-08-30",
        gender: "FEMALE",
        email: "mansoor.family@internal",
        phone: "+1 (555) 890-1122",
        address: "15 River Road, Boston, MA",
        guardianName: "Zainab Al-Mansoor",
        guardianRelationship: "MOTHER",
        guardianEmail: "zainab.mansoor@internal",
        guardianPhone: "+1 (555) 890-1122",
        status: "UNDER_REVIEW",
        reviewNotes: "Interview scheduled with Vice Principal for next Tuesday.",
        createdAt: "2026-02-03T11:45:00.000Z",
        updatedAt: "2026-02-05T09:00:00.000Z",
      },
      {
        id: "app-003",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_WEST_ID,
        applicationNumber: "APP-2026-00003",
        academicYearId: "ay-2026-27",
        classId: "cls-ss1-2526",
        firstName: "Tariq",
        middleName: "S.",
        lastName: "Hassan",
        dateOfBirth: "2010-03-11",
        gender: "MALE",
        email: "tariq.hassan@internal",
        phone: "+1 (555) 901-2233",
        address: "94 Brookline Ave, Boston, MA",
        guardianName: "Samira Hassan",
        guardianRelationship: "MOTHER",
        guardianEmail: "samira.hassan@internal",
        guardianPhone: "+1 (555) 901-2233",
        status: "APPROVED",
        reviewedById: "u-principal-01",
        reviewedAt: "2026-02-10T14:00:00.000Z",
        reviewNotes: "Entrance examination passed with 94% aggregate. Approved for Senior Secondary enrollment.",
        createdAt: "2026-02-04T08:20:00.000Z",
        updatedAt: "2026-02-10T14:00:00.000Z",
      },
    ],
    documents: [
      {
        id: "doc-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        fileName: "Lucas_Wright_Birth_Certificate.pdf",
        storageKey: "students/stu-001/birth_cert.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1048576,
        uploadedById: "u-super-admin-01",
        entityType: "StudentDocument",
        entityId: "stu-001",
        isPublic: false,
        createdAt: "2025-08-20T08:05:00.000Z",
        updatedAt: "2025-08-20T08:05:00.000Z",
      },
      {
        id: "doc-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        fileName: "Lucas_Wright_Immunization_Card.pdf",
        storageKey: "students/stu-001/immunization.pdf",
        mimeType: "application/pdf",
        sizeBytes: 524288,
        uploadedById: "u-super-admin-01",
        entityType: "StudentDocument",
        entityId: "stu-001",
        isPublic: false,
        createdAt: "2025-08-20T08:06:00.000Z",
        updatedAt: "2025-08-20T08:06:00.000Z",
      },
    ],
    admissionSequence: 5,
    applicationSequence: 3,
  };
}

let inMemoryStudentStore: InMemoryStudentState = initializeStudentState();

export class StudentService {
  /**
   * Reset store (for Vitest test suite isolation)
   */
  resetStore() {
    inMemoryStudentStore = initializeStudentState();
  }

  // ---------------------------------------------------------------------------
  // 1. ADMISSION NUMBER GENERATION
  // ---------------------------------------------------------------------------
  async generateAdmissionNumber(ctx: TenantContext, prefix = "STU"): Promise<string> {
    const currentYear = new Date().getFullYear();
    let sequence = inMemoryStudentStore.admissionSequence + 1;
    inMemoryStudentStore.admissionSequence = sequence;

    const candidate = `${prefix}-${currentYear}-${String(sequence).padStart(5, "0")}`;

    // Verify uniqueness
    try {
      const existingDb = await prisma.student.findUnique({
        where: {
          organizationId_admissionNumber: {
            organizationId: ctx.organizationId,
            admissionNumber: candidate,
          },
        },
      });
      if (existingDb) {
        // Increment and retry
        return this.generateAdmissionNumber(ctx, prefix);
      }
    } catch {
      // In-memory fallback uniqueness check
      const existsMem = inMemoryStudentStore.students.some(
        (s) => s.organizationId === ctx.organizationId && s.admissionNumber === candidate
      );
      if (existsMem) {
        return this.generateAdmissionNumber(ctx, prefix);
      }
    }

    return candidate;
  }

  // ---------------------------------------------------------------------------
  // 2. APPLICATION NUMBER GENERATION
  // ---------------------------------------------------------------------------
  async generateApplicationNumber(ctx: TenantContext): Promise<string> {
    const currentYear = new Date().getFullYear();
    let sequence = inMemoryStudentStore.applicationSequence + 1;
    inMemoryStudentStore.applicationSequence = sequence;

    return `APP-${currentYear}-${String(sequence).padStart(5, "0")}`;
  }

  // ---------------------------------------------------------------------------
  // 3. STUDENT DIRECTORY & FILTERING
  // ---------------------------------------------------------------------------
  async getStudents(
    ctx: TenantContext,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      campusId?: string;
      classId?: string;
      sectionId?: string;
      academicYearId?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const search = params.search?.trim().toLowerCase();

    try {
      const where: any = {
        organizationId: ctx.organizationId,
      };

      if (ctx.campusId) {
        where.campusId = ctx.campusId;
      } else if (params.campusId) {
        where.campusId = params.campusId;
      }

      if (params.status && params.status !== "ALL") {
        where.status = params.status;
      }

      if (params.classId || params.sectionId || params.academicYearId) {
        where.enrollments = {
          some: {
            ...(params.classId ? { classId: params.classId } : {}),
            ...(params.sectionId ? { sectionId: params.sectionId } : {}),
            ...(params.academicYearId ? { academicYearId: params.academicYearId } : {}),
          },
        };
      }

      if (search) {
        where.OR = [
          { admissionNumber: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.student.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { [params.sortBy || "createdAt"]: params.sortOrder || "desc" },
          include: {
            campus: true,
            enrollments: {
              include: {
                academicYear: true,
                class: true,
                section: true,
              },
              orderBy: { enrollmentDate: "desc" },
              take: 1,
            },
          },
        }),
        prisma.student.count({ where }),
      ]);

      return {
        items: items.map((s) => ({
          ...s,
          currentEnrollment: s.enrollments[0] || null,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      logger.warn("Database error querying students, using in-memory store", { error: String(err) });

      let filtered = inMemoryStudentStore.students.filter(
        (s) => s.organizationId === ctx.organizationId
      );

      if (ctx.campusId) {
        filtered = filtered.filter((s) => s.campusId === ctx.campusId);
      } else if (params.campusId) {
        filtered = filtered.filter((s) => s.campusId === params.campusId);
      }

      if (params.status && params.status !== "ALL") {
        filtered = filtered.filter((s) => s.status === params.status);
      }

      if (search) {
        filtered = filtered.filter((s) => {
          const fullName = `${s.firstName} ${s.middleName || ""} ${s.lastName}`.toLowerCase();
          return (
            fullName.includes(search) ||
            s.admissionNumber.toLowerCase().includes(search) ||
            (s.email && s.email.toLowerCase().includes(search)) ||
            (s.phone && s.phone.includes(search))
          );
        });
      }

      // Class / Section / Academic Year filtering
      if (params.classId || params.sectionId || params.academicYearId) {
        filtered = filtered.filter((s) => {
          const activeEnr = inMemoryStudentStore.enrollments
            .filter((e) => e.studentId === s.id)
            .sort((a, b) => new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime())[0];

          if (!activeEnr) return false;
          if (params.classId && activeEnr.classId !== params.classId) return false;
          if (params.sectionId && activeEnr.sectionId !== params.sectionId) return false;
          if (params.academicYearId && activeEnr.academicYearId !== params.academicYearId) return false;
          return true;
        });
      }

      const total = filtered.length;
      const startIndex = (page - 1) * limit;
      const paginated = filtered.slice(startIndex, startIndex + limit);

      const items = paginated.map((student) => {
        const studentEnrollments = inMemoryStudentStore.enrollments
          .filter((e) => e.studentId === student.id)
          .sort((a, b) => new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime());

        const currentEnrollment = studentEnrollments[0] || null;

        return {
          ...student,
          campus: {
            id: student.campusId,
            name: student.campusId === DEMO_CAMPUS_WEST_ID ? "Apex West Campus" : "Apex Main Campus",
          },
          currentEnrollment: currentEnrollment
            ? {
                ...currentEnrollment,
                class: {
                  id: currentEnrollment.classId,
                  name: currentEnrollment.classId === "cls-ss1-2526" ? "SS1 - 2025/2026 Cohort" : "JSS1 - 2025/2026 Cohort",
                  code: currentEnrollment.classId === "cls-ss1-2526" ? "SS1-2526" : "JSS1-2526",
                },
                section: currentEnrollment.sectionId
                  ? {
                      id: currentEnrollment.sectionId,
                      name: currentEnrollment.sectionId === "sec-jss1-b" ? "Section B (Emerald)" : "Section A (Diamond)",
                      code: currentEnrollment.sectionId === "sec-jss1-b" ? "JSS1-B" : "JSS1-A",
                    }
                  : null,
                academicYear: {
                  id: currentEnrollment.academicYearId,
                  name: "2025/2026 Academic Session",
                },
              }
            : null,
        };
      });

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 4. STUDENT PROFILE (FULL DETAIL)
  // ---------------------------------------------------------------------------
  async getStudentById(ctx: TenantContext, id: string) {
    try {
      const student = await prisma.student.findFirst({
        where: {
          id,
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
        },
        include: {
          campus: true,
          enrollments: {
            include: {
              academicYear: true,
              term: true,
              class: true,
              section: true,
            },
            orderBy: { enrollmentDate: "desc" },
          },
          studentGuardians: {
            include: {
              guardian: true,
            },
          },
          transfers: {
            include: {
              fromCampus: true,
              toCampus: true,
              fromClass: true,
              toClass: true,
            },
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!student) {
        throw new NotFoundError("Student", id);
      }

      // Fetch file attachments
      const documents = await prisma.fileAttachment.findMany({
        where: {
          organizationId: ctx.organizationId,
          entityType: "StudentDocument",
          entityId: id,
        },
        orderBy: { createdAt: "desc" },
      });

      // Fetch audit timeline
      const timeline = await prisma.auditLog.findMany({
        where: {
          organizationId: ctx.organizationId,
          entity: "Student",
          entityId: id,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      return {
        ...student,
        currentEnrollment: student.enrollments[0] || null,
        documents,
        timeline,
      };
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      logger.warn("Database lookup failed, falling back to memory", { error: String(err) });

      const student = inMemoryStudentStore.students.find(
        (s) =>
          s.id === id &&
          s.organizationId === ctx.organizationId &&
          (!ctx.campusId || s.campusId === ctx.campusId)
      );

      if (!student) {
        throw new NotFoundError("Student", id);
      }

      const enrollments = inMemoryStudentStore.enrollments
        .filter((e) => e.studentId === id)
        .sort((a, b) => new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime())
        .map((e) => ({
          ...e,
          academicYear: {
            id: e.academicYearId,
            name: "2025/2026 Academic Session",
            code: "AY-2025-26",
          },
          class: {
            id: e.classId,
            name: e.classId === "cls-ss1-2526" ? "SS1 - 2025/2026 Cohort" : "JSS1 - 2025/2026 Cohort",
            code: e.classId === "cls-ss1-2526" ? "SS1-2526" : "JSS1-2526",
          },
          section: e.sectionId
            ? {
                id: e.sectionId,
                name: e.sectionId === "sec-jss1-b" ? "Section B (Emerald)" : "Section A (Diamond)",
                code: e.sectionId === "sec-jss1-b" ? "JSS1-B" : "JSS1-A",
              }
            : null,
          term: e.termId
            ? {
                id: e.termId,
                name: "Second Term (Spring)",
              }
            : null,
        }));

      const studentGuardians = inMemoryStudentStore.studentGuardians
        .filter((sg) => sg.studentId === id)
        .map((sg) => {
          const guardian = inMemoryStudentStore.guardians.find((g) => g.id === sg.guardianId);
          return {
            ...sg,
            guardian: guardian || null,
          };
        });

      const transfers = inMemoryStudentStore.transfers
        .filter((t) => t.studentId === id)
        .map((t) => ({
          ...t,
          fromCampus: { id: t.fromCampusId, name: "Apex Main Campus" },
          toCampus: { id: t.toCampusId, name: "Apex West Campus" },
          fromClass: { id: t.fromClassId, name: "JSS1" },
          toClass: { id: t.toClassId, name: "SS1" },
        }));

      const documents = inMemoryStudentStore.documents.filter(
        (d) => d.entityId === id && d.entityType === "StudentDocument"
      );

      const timeline = [
        {
          id: `aud-${student.id}-1`,
          action: "CREATE",
          entity: "Student",
          entityId: student.id,
          createdAt: student.createdAt,
          details: {
            description: "Initial student registration and enrollment created",
            admissionNumber: student.admissionNumber,
          },
        },
      ];

      return {
        ...student,
        campus: {
          id: student.campusId,
          name: student.campusId === DEMO_CAMPUS_WEST_ID ? "Apex West Campus" : "Apex Main Campus",
          code: student.campusId === DEMO_CAMPUS_WEST_ID ? "CAMP-02" : "CAMP-01",
        },
        enrollments,
        currentEnrollment: enrollments[0] || null,
        studentGuardians,
        transfers,
        documents,
        timeline,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // 5. CREATE STUDENT (ATOMIC TRANSACTION)
  // ---------------------------------------------------------------------------
  async createStudent(ctx: TenantContext, input: CreateStudentWithEnrollmentInput) {
    // Campus check
    if (ctx.campusId && ctx.campusId !== input.campusId) {
      throw new ForbiddenError("Cannot register students for a different campus than active context.");
    }

    // Determine Admission Number
    let finalAdmissionNumber = input.admissionNumber;
    if (!finalAdmissionNumber || input.autoGenerateAdmissionNumber) {
      finalAdmissionNumber = await this.generateAdmissionNumber(ctx);
    } else {
      // Validate uniqueness
      const existingInMem = inMemoryStudentStore.students.find(
        (s) => s.organizationId === ctx.organizationId && s.admissionNumber === finalAdmissionNumber
      );
      if (existingInMem) {
        throw new ValidationError(`Admission number '${finalAdmissionNumber}' already exists in this institution.`, {
          admissionNumber: ["Admission number must be unique."],
        });
      }
    }

    const studentId = `stu-${Date.now()}`;
    const enrollmentId = `enr-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const newStudent: StudentRecord = {
      id: studentId,
      organizationId: ctx.organizationId,
      campusId: input.campusId,
      admissionNumber: finalAdmissionNumber,
      firstName: input.firstName,
      middleName: input.middleName || null,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      nationality: input.nationality || "Not Specified",
      religion: input.religion || null,
      bloodGroup: input.bloodGroup || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      admissionDate: input.admissionDate || nowIso.split("T")[0],
      status: "ACTIVE",
      avatarUrl: input.avatarUrl || null,
      medicalNotes: input.medicalNotes || null,
      emergencyNotes: input.emergencyNotes || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const newEnrollment: StudentEnrollmentRecord = {
      id: enrollmentId,
      studentId: studentId,
      organizationId: ctx.organizationId,
      campusId: input.campusId,
      academicYearId: input.academicYearId,
      classId: input.classId,
      sectionId: input.sectionId || null,
      rollNumber: input.rollNumber || null,
      enrollmentDate: nowIso,
      status: "ENROLLED",
      remarks: "Initial enrollment upon admission",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    let createdGuardian: GuardianRecord | null = null;
    let createdStudentGuardian: StudentGuardianRecord | null = null;

    if (input.guardian) {
      let guardianId = input.guardian.existingGuardianId;

      if (!guardianId) {
        guardianId = `grd-${Date.now()}`;
        createdGuardian = {
          id: guardianId,
          organizationId: ctx.organizationId,
          firstName: input.guardian.firstName,
          lastName: input.guardian.lastName,
          phone: input.guardian.phone,
          email: input.guardian.email || null,
          address: input.guardian.address || null,
          occupation: input.guardian.occupation || null,
          employer: null,
          isActive: true,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
      }

      createdStudentGuardian = {
        id: `sg-${Date.now()}`,
        studentId: studentId,
        guardianId: guardianId,
        relationship: input.guardian.relationship || "LEGAL_GUARDIAN",
        isPrimary: input.guardian.isPrimary ?? true,
        isEmergencyContact: input.guardian.isEmergencyContact ?? true,
        canPickup: input.guardian.canPickup ?? true,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
    }

    // Try executing in Prisma transaction
    try {
      await prisma.$transaction(async (tx) => {
        await tx.student.create({
          data: {
            id: newStudent.id,
            organizationId: ctx.organizationId,
            campusId: newStudent.campusId,
            admissionNumber: newStudent.admissionNumber,
            firstName: newStudent.firstName,
            middleName: newStudent.middleName,
            lastName: newStudent.lastName,
            dateOfBirth: new Date(newStudent.dateOfBirth),
            gender: newStudent.gender as any,
            nationality: newStudent.nationality,
            religion: newStudent.religion,
            bloodGroup: newStudent.bloodGroup,
            email: newStudent.email,
            phone: newStudent.phone,
            address: newStudent.address,
            admissionDate: new Date(newStudent.admissionDate),
            status: "ACTIVE",
            avatarUrl: newStudent.avatarUrl,
            medicalNotes: newStudent.medicalNotes,
            emergencyNotes: newStudent.emergencyNotes,
          },
        });

        await tx.studentEnrollment.create({
          data: {
            id: newEnrollment.id,
            studentId: studentId,
            organizationId: ctx.organizationId,
            campusId: newEnrollment.campusId,
            academicYearId: newEnrollment.academicYearId,
            classId: newEnrollment.classId,
            sectionId: newEnrollment.sectionId,
            rollNumber: newEnrollment.rollNumber,
            enrollmentDate: new Date(newEnrollment.enrollmentDate),
            status: "ENROLLED",
          },
        });

        if (createdGuardian) {
          await tx.guardian.create({
            data: {
              id: createdGuardian.id,
              organizationId: ctx.organizationId,
              firstName: createdGuardian.firstName,
              lastName: createdGuardian.lastName,
              phone: createdGuardian.phone,
              email: createdGuardian.email,
              address: createdGuardian.address,
              occupation: createdGuardian.occupation,
              isActive: true,
            },
          });
        }

        if (createdStudentGuardian) {
          await tx.studentGuardian.create({
            data: {
              id: createdStudentGuardian.id,
              studentId,
              guardianId: createdStudentGuardian.guardianId,
              relationship: createdStudentGuardian.relationship as any,
              isPrimary: createdStudentGuardian.isPrimary,
              isEmergencyContact: createdStudentGuardian.isEmergencyContact,
              canPickup: createdStudentGuardian.canPickup,
            },
          });
        }
      });
    } catch (err) {
      logger.warn("Prisma transaction failed or unavailable, persisting to memory", {
        error: String(err),
      });
    }

    // Persist to in-memory store
    inMemoryStudentStore.students.unshift(newStudent);
    inMemoryStudentStore.enrollments.unshift(newEnrollment);
    if (createdGuardian) {
      inMemoryStudentStore.guardians.unshift(createdGuardian);
    }
    if (createdStudentGuardian) {
      inMemoryStudentStore.studentGuardians.unshift(createdStudentGuardian);
    }

    // Audit log
    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Student",
      entityId: studentId,
      details: {
        admissionNumber: finalAdmissionNumber,
        firstName: newStudent.firstName,
        lastName: newStudent.lastName,
        campusId: newStudent.campusId,
        classId: newEnrollment.classId,
      },
    });

    return this.getStudentById(ctx, studentId);
  }

  // ---------------------------------------------------------------------------
  // 6. UPDATE STUDENT (PROFILE INFORMATION)
  // ---------------------------------------------------------------------------
  async updateStudent(ctx: TenantContext, id: string, input: UpdateStudentInput) {
    const student = await this.getStudentById(ctx, id);
    const nowIso = new Date().toISOString();

    try {
      await prisma.student.update({
        where: { id },
        data: {
          firstName: input.firstName,
          middleName: input.middleName || null,
          lastName: input.lastName,
          dateOfBirth: new Date(input.dateOfBirth),
          gender: input.gender as any,
          nationality: input.nationality,
          religion: input.religion,
          bloodGroup: input.bloodGroup,
          email: input.email || null,
          phone: input.phone || null,
          address: input.address || null,
          avatarUrl: input.avatarUrl || null,
          medicalNotes: input.medicalNotes || null,
          emergencyNotes: input.emergencyNotes || null,
        },
      });
    } catch (err) {
      logger.warn("Prisma update failed, updating memory store", { error: String(err) });
    }

    const index = inMemoryStudentStore.students.findIndex((s) => s.id === id);
    if (index !== -1) {
      inMemoryStudentStore.students[index] = {
        ...inMemoryStudentStore.students[index],
        firstName: input.firstName,
        middleName: input.middleName || null,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        nationality: input.nationality || inMemoryStudentStore.students[index].nationality,
        religion: input.religion || null,
        bloodGroup: input.bloodGroup || null,
        email: input.email || null,
        phone: input.phone || null,
        address: input.address || null,
        avatarUrl: input.avatarUrl || inMemoryStudentStore.students[index].avatarUrl,
        medicalNotes: input.medicalNotes || null,
        emergencyNotes: input.emergencyNotes || null,
        updatedAt: nowIso,
      };
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Student",
      entityId: id,
      details: {
        updatedFields: Object.keys(input),
      },
    });

    return this.getStudentById(ctx, id);
  }

  // ---------------------------------------------------------------------------
  // 7. UPDATE STUDENT STATUS (CONTROLLED & AUDITED)
  // ---------------------------------------------------------------------------
  async updateStudentStatus(
    ctx: TenantContext,
    id: string,
    status: StudentRecord["status"],
    reason: string
  ) {
    const student = await this.getStudentById(ctx, id);
    const oldStatus = student.status;
    const nowIso = new Date().toISOString();

    try {
      await prisma.student.update({
        where: { id },
        data: { status: status as any },
      });
    } catch (err) {
      logger.warn("Prisma status update failed, updating memory store", { error: String(err) });
    }

    const index = inMemoryStudentStore.students.findIndex((s) => s.id === id);
    if (index !== -1) {
      inMemoryStudentStore.students[index].status = status;
      inMemoryStudentStore.students[index].updatedAt = nowIso;
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Student",
      entityId: id,
      details: {
        changeType: "STATUS_CHANGE",
        previousStatus: oldStatus,
        newStatus: status,
        reason,
      },
    });

    return this.getStudentById(ctx, id);
  }

  // ---------------------------------------------------------------------------
  // 8. PROMOTION WORKFLOW
  // ---------------------------------------------------------------------------
  async promoteStudent(ctx: TenantContext, studentId: string, input: PromoteStudentInput) {
    const student = await this.getStudentById(ctx, studentId);
    const nowIso = new Date().toISOString();
    const newEnrollmentId = `enr-${Date.now()}`;

    // Mark previous active enrollment as PROMOTED
    const prevEnrollment = inMemoryStudentStore.enrollments.find(
      (e) => e.studentId === studentId && e.status === "ENROLLED"
    );
    if (prevEnrollment) {
      prevEnrollment.status = "PROMOTED";
      prevEnrollment.updatedAt = nowIso;
    }

    const newEnrollment: StudentEnrollmentRecord = {
      id: newEnrollmentId,
      studentId,
      organizationId: ctx.organizationId,
      campusId: student.campusId,
      academicYearId: input.toAcademicYearId,
      classId: input.toClassId,
      sectionId: input.toSectionId || null,
      rollNumber: input.rollNumber || null,
      enrollmentDate: nowIso,
      status: "ENROLLED",
      remarks: input.remarks || "Academic promotion",
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.$transaction(async (tx) => {
        if (prevEnrollment) {
          await tx.studentEnrollment.update({
            where: { id: prevEnrollment.id },
            data: { status: "PROMOTED" },
          });
        }
        await tx.studentEnrollment.create({
          data: {
            id: newEnrollment.id,
            studentId,
            organizationId: ctx.organizationId,
            campusId: student.campusId,
            academicYearId: input.toAcademicYearId,
            classId: input.toClassId,
            sectionId: input.toSectionId || null,
            rollNumber: input.rollNumber || null,
            enrollmentDate: new Date(),
            status: "ENROLLED",
            remarks: input.remarks || "Academic promotion",
          },
        });
      });
    } catch (err) {
      logger.warn("Prisma promotion transaction failed, updating memory store", { error: String(err) });
    }

    inMemoryStudentStore.enrollments.unshift(newEnrollment);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Student",
      entityId: studentId,
      details: {
        actionType: "ACADEMIC_PROMOTION",
        targetClassId: input.toClassId,
        targetAcademicYearId: input.toAcademicYearId,
        remarks: input.remarks,
      },
    });

    return this.getStudentById(ctx, studentId);
  }

  // ---------------------------------------------------------------------------
  // 9. TRANSFER WORKFLOW (CAMPUS / CLASS)
  // ---------------------------------------------------------------------------
  async transferStudent(ctx: TenantContext, studentId: string, input: TransferStudentInput) {
    const student = await this.getStudentById(ctx, studentId);
    const nowIso = new Date().toISOString();
    const currentEnr = student.currentEnrollment;
    const transferId = `trf-${Date.now()}`;

    const transferRecord: StudentTransferRecord = {
      id: transferId,
      organizationId: ctx.organizationId,
      studentId,
      fromCampusId: student.campusId,
      toCampusId: input.toCampusId,
      fromClassId: currentEnr?.classId || "unknown",
      toClassId: input.toClassId,
      fromSectionId: currentEnr?.sectionId || null,
      toSectionId: input.toSectionId || null,
      effectiveDate: input.effectiveDate || nowIso,
      reason: input.reason,
      notes: input.notes || null,
      authorizedById: ctx.userId || null,
      createdAt: nowIso,
    };

    // Update student campus and enrollment
    const studentIndex = inMemoryStudentStore.students.findIndex((s) => s.id === studentId);
    if (studentIndex !== -1) {
      inMemoryStudentStore.students[studentIndex].campusId = input.toCampusId;
      inMemoryStudentStore.students[studentIndex].updatedAt = nowIso;
    }

    // Close old enrollment
    if (currentEnr) {
      const oldEnr = inMemoryStudentStore.enrollments.find((e) => e.id === currentEnr.id);
      if (oldEnr) {
        oldEnr.status = "TRANSFERRED";
        oldEnr.updatedAt = nowIso;
      }
    }

    // Create new enrollment at destination
    const newEnr: StudentEnrollmentRecord = {
      id: `enr-${Date.now()}`,
      studentId,
      organizationId: ctx.organizationId,
      campusId: input.toCampusId,
      academicYearId: currentEnr?.academicYearId || "ay-2025-26",
      classId: input.toClassId,
      sectionId: input.toSectionId || null,
      rollNumber: null,
      enrollmentDate: nowIso,
      status: "ENROLLED",
      remarks: `Transferred from campus ${student.campusId}. Reason: ${input.reason}`,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.$transaction(async (tx) => {
        await tx.studentTransfer.create({
          data: {
            id: transferId,
            organizationId: ctx.organizationId,
            studentId,
            fromCampusId: student.campusId,
            toCampusId: input.toCampusId,
            fromClassId: currentEnr?.classId || "cls-jss1-2526",
            toClassId: input.toClassId,
            fromSectionId: currentEnr?.sectionId || null,
            toSectionId: input.toSectionId || null,
            effectiveDate: new Date(transferRecord.effectiveDate),
            reason: input.reason,
            notes: input.notes || null,
            authorizedById: ctx.userId || null,
          },
        });

        await tx.student.update({
          where: { id: studentId },
          data: { campusId: input.toCampusId },
        });

        if (currentEnr?.id) {
          await tx.studentEnrollment.update({
            where: { id: currentEnr.id },
            data: { status: "TRANSFERRED" },
          });
        }

        await tx.studentEnrollment.create({
          data: {
            id: newEnr.id,
            studentId,
            organizationId: ctx.organizationId,
            campusId: input.toCampusId,
            academicYearId: newEnr.academicYearId,
            classId: input.toClassId,
            sectionId: input.toSectionId || null,
            status: "ENROLLED",
            remarks: newEnr.remarks,
          },
        });
      });
    } catch (err) {
      logger.warn("Prisma transfer transaction failed, persisting in memory", { error: String(err) });
    }

    inMemoryStudentStore.transfers.unshift(transferRecord);
    inMemoryStudentStore.enrollments.unshift(newEnr);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Student",
      entityId: studentId,
      details: {
        actionType: "STUDENT_TRANSFER",
        fromCampusId: student.campusId,
        toCampusId: input.toCampusId,
        toClassId: input.toClassId,
        reason: input.reason,
      },
    });

    return this.getStudentById(ctx, studentId);
  }

  // ---------------------------------------------------------------------------
  // 10. GUARDIAN MANAGEMENT
  // ---------------------------------------------------------------------------
  async getGuardians(
    ctx: TenantContext,
    params: { page?: number; limit?: number; search?: string } = {}
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const search = params.search?.trim().toLowerCase();

    try {
      const where: any = {
        organizationId: ctx.organizationId,
      };

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.guardian.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { lastName: "asc" },
          include: {
            studentGuardians: {
              include: {
                student: true,
              },
            },
          },
        }),
        prisma.guardian.count({ where }),
      ]);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      logger.warn("Database error querying guardians, using memory store", { error: String(err) });

      let filtered = inMemoryStudentStore.guardians.filter(
        (g) => g.organizationId === ctx.organizationId
      );

      if (search) {
        filtered = filtered.filter((g) => {
          const full = `${g.firstName} ${g.middleName || ""} ${g.lastName}`.toLowerCase();
          return (
            full.includes(search) ||
            g.phone.includes(search) ||
            (g.email && g.email.toLowerCase().includes(search))
          );
        });
      }

      const total = filtered.length;
      const startIndex = (page - 1) * limit;
      const paginated = filtered.slice(startIndex, startIndex + limit);

      const items = paginated.map((g) => {
        const links = inMemoryStudentStore.studentGuardians.filter((sg) => sg.guardianId === g.id);
        const studentGuardians = links.map((sg) => {
          const stu = inMemoryStudentStore.students.find((s) => s.id === sg.studentId);
          return {
            ...sg,
            student: stu || null,
          };
        });

        return {
          ...g,
          studentGuardians,
        };
      });

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    }
  }

  async createGuardian(ctx: TenantContext, input: CreateGuardianDto) {
    const id = `grd-${Date.now()}`;
    const nowIso = new Date().toISOString();

    const record: GuardianRecord = {
      id,
      organizationId: ctx.organizationId,
      firstName: input.firstName,
      middleName: input.middleName || null,
      lastName: input.lastName,
      email: input.email || null,
      phone: input.phone,
      alternatePhone: input.alternatePhone || null,
      address: input.address || null,
      occupation: input.occupation || null,
      employer: input.employer || null,
      isActive: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.guardian.create({
        data: {
          id: record.id,
          organizationId: ctx.organizationId,
          firstName: record.firstName,
          middleName: record.middleName,
          lastName: record.lastName,
          email: record.email,
          phone: record.phone,
          alternatePhone: record.alternatePhone,
          address: record.address,
          occupation: record.occupation,
          employer: record.employer,
          isActive: true,
        },
      });
    } catch (err) {
      logger.warn("Prisma guardian create failed, storing in memory", { error: String(err) });
    }

    inMemoryStudentStore.guardians.unshift(record);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Guardian",
      entityId: id,
      details: {
        name: `${record.firstName} ${record.lastName}`,
        phone: record.phone,
      },
    });

    return record;
  }

  async getGuardianById(ctx: TenantContext, id: string): Promise<GuardianRecord> {
    try {
      const g = await prisma.guardian.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (g) {
        return {
          id: g.id,
          organizationId: g.organizationId,
          userId: g.userId,
          firstName: g.firstName,
          middleName: g.middleName,
          lastName: g.lastName,
          email: g.email,
          phone: g.phone,
          alternatePhone: g.alternatePhone,
          address: g.address,
          occupation: g.occupation,
          employer: g.employer,
          isActive: g.isActive,
          createdAt: g.createdAt.toISOString(),
          updatedAt: g.updatedAt.toISOString(),
        };
      }
    } catch {
      // Memory fallback
    }

    const memGuardian = inMemoryStudentStore.guardians.find(
      (g) => g.id === id && g.organizationId === ctx.organizationId
    );
    if (!memGuardian) {
      throw new NotFoundError("Guardian", id);
    }
    return memGuardian;
  }

  async linkGuardianToStudent(ctx: TenantContext, studentId: string, input: LinkStudentGuardianInput) {
    await this.getStudentById(ctx, studentId);
    await this.getGuardianById(ctx, input.guardianId);

    const nowIso = new Date().toISOString();
    const id = `sg-${Date.now()}`;

    // If new link is marked primary, demote existing primary guardians for this student
    if (input.isPrimary) {
      inMemoryStudentStore.studentGuardians.forEach((sg) => {
        if (sg.studentId === studentId) {
          sg.isPrimary = false;
        }
      });
    }

    const newLink: StudentGuardianRecord = {
      id,
      studentId,
      guardianId: input.guardianId,
      relationship: input.relationship,
      isPrimary: input.isPrimary,
      isEmergencyContact: input.isEmergencyContact,
      canPickup: input.canPickup,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      if (input.isPrimary) {
        await prisma.studentGuardian.updateMany({
          where: { studentId },
          data: { isPrimary: false },
        });
      }

      await prisma.studentGuardian.upsert({
        where: {
          studentId_guardianId: {
            studentId,
            guardianId: input.guardianId,
          },
        },
        create: {
          studentId,
          guardianId: input.guardianId,
          relationship: input.relationship as any,
          isPrimary: input.isPrimary,
          isEmergencyContact: input.isEmergencyContact,
          canPickup: input.canPickup,
        },
        update: {
          relationship: input.relationship as any,
          isPrimary: input.isPrimary,
          isEmergencyContact: input.isEmergencyContact,
          canPickup: input.canPickup,
        },
      });
    } catch (err) {
      logger.warn("Prisma link guardian failed, using memory", { error: String(err) });
    }

    // Memory upsert
    const existingIndex = inMemoryStudentStore.studentGuardians.findIndex(
      (sg) => sg.studentId === studentId && sg.guardianId === input.guardianId
    );
    if (existingIndex !== -1) {
      inMemoryStudentStore.studentGuardians[existingIndex] = newLink;
    } else {
      inMemoryStudentStore.studentGuardians.push(newLink);
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Student",
      entityId: studentId,
      details: {
        actionType: "LINK_GUARDIAN",
        guardianId: input.guardianId,
        relationship: input.relationship,
        isPrimary: input.isPrimary,
      },
    });

    return this.getStudentById(ctx, studentId);
  }

  async unlinkGuardianFromStudent(ctx: TenantContext, studentId: string, guardianId: string) {
    await this.getStudentById(ctx, studentId);
    try {
      await prisma.studentGuardian.deleteMany({
        where: {
          studentId,
          guardianId,
        },
      });
    } catch (err) {
      logger.warn("Prisma unlink failed, using memory", { error: String(err) });
    }

    inMemoryStudentStore.studentGuardians = inMemoryStudentStore.studentGuardians.filter(
      (sg) => !(sg.studentId === studentId && sg.guardianId === guardianId)
    );

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Student",
      entityId: studentId,
      details: {
        actionType: "UNLINK_GUARDIAN",
        guardianId,
      },
    });

    return this.getStudentById(ctx, studentId);
  }

  async getStudentGuardians(ctx: TenantContext, studentId: string): Promise<StudentGuardianRecord[]> {
    await this.getStudentById(ctx, studentId);
    try {
      const links = await prisma.studentGuardian.findMany({
        where: { studentId },
      });
      if (links.length > 0) {
        return links.map((l) => ({
          id: l.id,
          studentId: l.studentId,
          guardianId: l.guardianId,
          relationship: l.relationship as any,
          isPrimary: l.isPrimary,
          isEmergencyContact: l.isEmergencyContact,
          canPickup: l.canPickup,
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
        }));
      }
    } catch {
      // Memory fallback
    }
    return inMemoryStudentStore.studentGuardians.filter((sg) => sg.studentId === studentId);
  }

  async getStudentEnrollments(ctx: TenantContext, studentId: string): Promise<StudentEnrollmentRecord[]> {
    try {
      const enrollments = await prisma.studentEnrollment.findMany({
        where: {
          studentId,
          organizationId: ctx.organizationId,
        },
        orderBy: { enrollmentDate: "desc" },
      });
      if (enrollments.length > 0) {
        return enrollments.map((e) => ({
          id: e.id,
          studentId: e.studentId,
          organizationId: e.organizationId,
          campusId: e.campusId,
          academicYearId: e.academicYearId,
          classId: e.classId,
          sectionId: e.sectionId,
          rollNumber: e.rollNumber,
          enrollmentDate: e.enrollmentDate.toISOString(),
          status: e.status as any,
          remarks: e.remarks,
          createdAt: e.createdAt.toISOString(),
          updatedAt: e.updatedAt.toISOString(),
        }));
      }
    } catch {
      // Memory fallback
    }
    return inMemoryStudentStore.enrollments
      .filter((e) => e.studentId === studentId && e.organizationId === ctx.organizationId)
      .sort((a, b) => new Date(b.enrollmentDate).getTime() - new Date(a.enrollmentDate).getTime());
  }

  async updateGuardian(
    ctx: TenantContext,
    id: string,
    input: Partial<Omit<GuardianRecord, "id" | "organizationId" | "createdAt" | "updatedAt">>
  ): Promise<GuardianRecord> {
    const nowIso = new Date().toISOString();
    try {
      await prisma.guardian.update({
        where: { id },
        data: {
          phone: input.phone,
          alternatePhone: input.alternatePhone || null,
          address: input.address || null,
          occupation: input.occupation || null,
          employer: input.employer || null,
        },
      });
    } catch {
      // Memory fallback
    }

    const index = inMemoryStudentStore.guardians.findIndex(
      (g) => g.id === id && g.organizationId === ctx.organizationId
    );
    if (index === -1) {
      throw new NotFoundError("Guardian", id);
    }

    inMemoryStudentStore.guardians[index] = {
      ...inMemoryStudentStore.guardians[index],
      ...input,
      updatedAt: nowIso,
    };

    return inMemoryStudentStore.guardians[index];
  }

  // ---------------------------------------------------------------------------
  // 11. STUDENT DOCUMENTS & ATTACHMENTS
  // ---------------------------------------------------------------------------
  async getStudentDocuments(ctx: TenantContext, studentId: string) {
    await this.getStudentById(ctx, studentId);
    try {
      return await prisma.fileAttachment.findMany({
        where: {
          organizationId: ctx.organizationId,
          entityType: "StudentDocument",
          entityId: studentId,
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      return inMemoryStudentStore.documents.filter(
        (d) =>
          d.entityId === studentId &&
          d.entityType === "StudentDocument" &&
          d.organizationId === ctx.organizationId
      );
    }
  }

  async uploadStudentDocument(
    ctx: TenantContext,
    studentId: string,
    input: StudentDocumentUploadInput
  ) {
    const student = await this.getStudentById(ctx, studentId);
    const { sanitizedName } = sanitizeUploadedFileName(input.fileName);
    const id = `doc-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const storageKey = `students/${studentId}/${Date.now()}_${sanitizedName}`;

    const newDoc: StudentDocumentRecord = {
      id,
      organizationId: ctx.organizationId,
      campusId: student.campusId,
      fileName: sanitizedName,
      storageKey,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      uploadedById: ctx.userId || null,
      entityType: "StudentDocument",
      entityId: studentId,
      isPublic: false,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.fileAttachment.create({
        data: {
          id: newDoc.id,
          organizationId: ctx.organizationId,
          campusId: newDoc.campusId,
          fileName: newDoc.fileName,
          storageKey: newDoc.storageKey,
          mimeType: newDoc.mimeType,
          sizeBytes: newDoc.sizeBytes,
          uploadedById: ctx.userId || null,
          entityType: newDoc.entityType,
          entityId: newDoc.entityId,
          isPublic: false,
        },
      });
    } catch (err) {
      logger.warn("Prisma fileAttachment create failed, using memory", { error: String(err) });
    }

    inMemoryStudentStore.documents.unshift(newDoc);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "StudentDocument",
      entityId: id,
      details: {
        studentId,
        fileName: input.fileName,
        sizeBytes: input.sizeBytes,
        documentType: input.documentType,
      },
    });

    return newDoc;
  }

  async deleteStudentDocument(ctx: TenantContext, studentId: string, documentId: string) {
    await this.getStudentById(ctx, studentId);
    try {
      await prisma.fileAttachment.deleteMany({
        where: {
          id: documentId,
          entityType: "StudentDocument",
          entityId: studentId,
          organizationId: ctx.organizationId,
        },
      });
    } catch (err) {
      logger.warn("Prisma document delete failed, using memory", { error: String(err) });
    }

    inMemoryStudentStore.documents = inMemoryStudentStore.documents.filter(
      (d) => !(d.id === documentId && d.entityId === studentId && d.organizationId === ctx.organizationId)
    );

    await auditRepository.log(ctx, {
      action: "DELETE",
      entity: "StudentDocument",
      entityId: documentId,
      details: { studentId },
    });

    return { deleted: true, documentId };
  }

  async getStudentDocumentById(ctx: TenantContext, studentId: string, documentId: string) {
    await this.getStudentById(ctx, studentId);
    try {
      const doc = await prisma.fileAttachment.findFirst({
        where: {
          id: documentId,
          entityType: "StudentDocument",
          entityId: studentId,
          organizationId: ctx.organizationId,
        },
      });
      if (doc) return doc;
    } catch {
      // Memory fallback
    }

    const doc = inMemoryStudentStore.documents.find(
      (d) =>
        d.id === documentId &&
        d.entityId === studentId &&
        d.organizationId === ctx.organizationId
    );
    if (!doc) {
      throw new NotFoundError("StudentDocument", documentId);
    }
    return doc;
  }

  // ---------------------------------------------------------------------------
  // 12. ADMISSIONS PIPELINE
  // ---------------------------------------------------------------------------
  async getAdmissionApplications(
    ctx: TenantContext,
    params: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      campusId?: string;
      academicYearId?: string;
      classId?: string;
    } = {}
  ) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const search = params.search?.trim().toLowerCase();

    try {
      const where: any = {
        organizationId: ctx.organizationId,
      };

      if (ctx.campusId) {
        where.campusId = ctx.campusId;
      } else if (params.campusId) {
        where.campusId = params.campusId;
      }

      if (params.status && params.status !== "ALL") {
        where.status = params.status;
      }

      if (params.academicYearId) {
        where.academicYearId = params.academicYearId;
      }

      if (params.classId) {
        where.classId = params.classId;
      }

      if (search) {
        where.OR = [
          { applicationNumber: { contains: search, mode: "insensitive" } },
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { guardianName: { contains: search, mode: "insensitive" } },
          { guardianPhone: { contains: search, mode: "insensitive" } },
        ];
      }

      const [items, total] = await Promise.all([
        prisma.admissionApplication.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            campus: true,
            academicYear: true,
            class: true,
            reviewedBy: true,
            enrolledStudent: true,
          },
        }),
        prisma.admissionApplication.count({ where }),
      ]);

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (err) {
      logger.warn("Database error querying applications, using memory store", { error: String(err) });

      let filtered = inMemoryStudentStore.applications.filter(
        (a) => a.organizationId === ctx.organizationId
      );

      if (ctx.campusId) {
        filtered = filtered.filter((a) => a.campusId === ctx.campusId);
      } else if (params.campusId) {
        filtered = filtered.filter((a) => a.campusId === params.campusId);
      }

      if (params.status && params.status !== "ALL") {
        filtered = filtered.filter((a) => a.status === params.status);
      }

      if (params.academicYearId) {
        filtered = filtered.filter((a) => a.academicYearId === params.academicYearId);
      }

      if (params.classId) {
        filtered = filtered.filter((a) => a.classId === params.classId);
      }

      if (search) {
        filtered = filtered.filter((a) => {
          const full = `${a.firstName} ${a.middleName || ""} ${a.lastName}`.toLowerCase();
          return (
            full.includes(search) ||
            a.applicationNumber.toLowerCase().includes(search) ||
            a.guardianName.toLowerCase().includes(search) ||
            a.guardianPhone.includes(search)
          );
        });
      }

      const total = filtered.length;
      const startIndex = (page - 1) * limit;
      const paginated = filtered.slice(startIndex, startIndex + limit);

      const items = paginated.map((a) => ({
        ...a,
        campus: {
          id: a.campusId,
          name: a.campusId === DEMO_CAMPUS_WEST_ID ? "Apex West Campus" : "Apex Main Campus",
        },
        academicYear: {
          id: a.academicYearId,
          name: a.academicYearId === "ay-2026-27" ? "2026/2027 Academic Session" : "2025/2026 Academic Session",
        },
        class: {
          id: a.classId,
          name: a.classId === "cls-ss1-2526" ? "SS1 - 2025/2026 Cohort" : "JSS1 - 2025/2026 Cohort",
          code: a.classId === "cls-ss1-2526" ? "SS1-2526" : "JSS1-2526",
        },
      }));

      return {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    }
  }

  async getAdmissionApplicationById(ctx: TenantContext, id: string) {
    try {
      const app = await prisma.admissionApplication.findFirst({
        where: {
          id,
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
        },
        include: {
          campus: true,
          academicYear: true,
          class: true,
          reviewedBy: true,
          enrolledStudent: true,
        },
      });
      if (!app) {
        throw new NotFoundError("AdmissionApplication", id);
      }
      return app;
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      const app = inMemoryStudentStore.applications.find(
        (a) =>
          a.id === id &&
          a.organizationId === ctx.organizationId &&
          (!ctx.campusId || a.campusId === ctx.campusId)
      );
      if (!app) {
        throw new NotFoundError("AdmissionApplication", id);
      }
      return {
        ...app,
        campus: {
          id: app.campusId,
          name: app.campusId === DEMO_CAMPUS_WEST_ID ? "Apex West Campus" : "Apex Main Campus",
        },
        academicYear: {
          id: app.academicYearId,
          name: app.academicYearId === "ay-2026-27" ? "2026/2027 Academic Session" : "2025/2026 Academic Session",
        },
        class: {
          id: app.classId,
          name: app.classId === "cls-ss1-2526" ? "SS1 - 2025/2026 Cohort" : "JSS1 - 2025/2026 Cohort",
        },
      };
    }
  }

  async createAdmissionApplication(ctx: TenantContext, input: CreateAdmissionApplicationInput) {
    const id = `app-${Date.now()}`;
    const applicationNumber = await this.generateApplicationNumber(ctx);
    const nowIso = new Date().toISOString();

    const record: AdmissionApplicationRecord = {
      id,
      organizationId: ctx.organizationId,
      campusId: input.campusId,
      applicationNumber,
      academicYearId: input.academicYearId,
      classId: input.classId,
      firstName: input.firstName,
      middleName: input.middleName || null,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      guardianName: input.guardianName,
      guardianRelationship: input.guardianRelationship || "OTHER",
      guardianEmail: input.guardianEmail || null,
      guardianPhone: input.guardianPhone,
      status: "SUBMITTED",
      reviewNotes: input.notes || null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    try {
      await prisma.admissionApplication.create({
        data: {
          id: record.id,
          organizationId: ctx.organizationId,
          campusId: record.campusId,
          applicationNumber: record.applicationNumber,
          academicYearId: record.academicYearId,
          classId: record.classId,
          firstName: record.firstName,
          middleName: record.middleName,
          lastName: record.lastName,
          dateOfBirth: new Date(record.dateOfBirth),
          gender: record.gender as any,
          email: record.email,
          phone: record.phone,
          address: record.address,
          guardianName: record.guardianName,
          guardianRelationship: record.guardianRelationship as any,
          guardianEmail: record.guardianEmail,
          guardianPhone: record.guardianPhone,
          status: "SUBMITTED",
          reviewNotes: record.reviewNotes,
        },
      });
    } catch (err) {
      logger.warn("Prisma application create failed, using memory store", { error: String(err) });
    }

    inMemoryStudentStore.applications.unshift(record);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "AdmissionApplication",
      entityId: id,
      details: {
        applicationNumber,
        applicant: `${record.firstName} ${record.lastName}`,
      },
    });

    return record;
  }

  async reviewAdmissionApplication(
    ctx: TenantContext,
    id: string,
    input: ReviewAdmissionApplicationInput
  ) {
    const app = await this.getAdmissionApplicationById(ctx, id);
    const nowIso = new Date().toISOString();

    try {
      await prisma.admissionApplication.update({
        where: { id },
        data: {
          status: input.status as any,
          reviewNotes: input.reviewNotes || null,
          rejectionReason: input.rejectionReason || null,
          reviewedById: ctx.userId || null,
          reviewedAt: new Date(),
        },
      });
    } catch (err) {
      logger.warn("Prisma review update failed, using memory", { error: String(err) });
    }

    const index = inMemoryStudentStore.applications.findIndex((a) => a.id === id);
    if (index !== -1) {
      inMemoryStudentStore.applications[index] = {
        ...inMemoryStudentStore.applications[index],
        status: input.status,
        reviewNotes: input.reviewNotes || inMemoryStudentStore.applications[index].reviewNotes,
        rejectionReason: input.rejectionReason || null,
        reviewedById: ctx.userId || null,
        reviewedAt: nowIso,
        updatedAt: nowIso,
      };
    }

    await auditRepository.log(ctx, {
      action: input.status === "APPROVED" ? "APPROVE" : input.status === "REJECTED" ? "REJECT" : "UPDATE",
      entity: "AdmissionApplication",
      entityId: id,
      details: {
        newStatus: input.status,
        reviewNotes: input.reviewNotes,
        rejectionReason: input.rejectionReason,
      },
    });

    return this.getAdmissionApplicationById(ctx, id);
  }

  async enrollApprovedApplication(
    ctx: TenantContext,
    id: string,
    input: EnrollAdmissionApplicationInput
  ) {
    const app = await this.getAdmissionApplicationById(ctx, id);

    if (app.enrolledStudentId) {
      throw new ValidationError("Application has already been converted to an enrolled student.");
    }

    if (app.status !== "APPROVED" && app.status !== "SUBMITTED" && app.status !== "UNDER_REVIEW") {
      throw new ValidationError("Application must be active or approved before enrollment can proceed.");
    }

    // Convert to student
    const createdStudent = await this.createStudent(ctx, {
      campusId: app.campusId,
      admissionNumber: input.admissionNumber || undefined,
      autoGenerateAdmissionNumber: !input.admissionNumber,
      firstName: app.firstName,
      middleName: app.middleName || undefined,
      lastName: app.lastName,
      dateOfBirth: typeof app.dateOfBirth === "string" ? app.dateOfBirth : new Date(app.dateOfBirth).toISOString().split("T")[0],
      gender: app.gender as any,
      nationality: "Not Specified",
      email: app.email || undefined,
      phone: app.phone || undefined,
      address: app.address || undefined,
      academicYearId: app.academicYearId,
      classId: app.classId,
      sectionId: input.sectionId || undefined,
      rollNumber: input.rollNumber || undefined,
      guardian: {
        firstName: app.guardianName.split(" ")[0] || "Guardian",
        lastName: app.guardianName.split(" ").slice(1).join(" ") || "Parent",
        relationship: (app.guardianRelationship as any) || "LEGAL_GUARDIAN",
        phone: app.guardianPhone,
        email: app.guardianEmail || undefined,
        address: app.address || undefined,
        isPrimary: true,
        isEmergencyContact: true,
        canPickup: true,
      },
    });

    // Mark application as enrolled
    const nowIso = new Date().toISOString();
    try {
      await prisma.admissionApplication.update({
        where: { id },
        data: {
          status: "APPROVED",
          enrolledStudentId: createdStudent.id,
          reviewedAt: new Date(),
        },
      });
    } catch {
      // Memory fallback
    }

    const appIndex = inMemoryStudentStore.applications.findIndex((a) => a.id === id);
    if (appIndex !== -1) {
      inMemoryStudentStore.applications[appIndex].status = "APPROVED";
      inMemoryStudentStore.applications[appIndex].enrolledStudentId = createdStudent.id;
      inMemoryStudentStore.applications[appIndex].updatedAt = nowIso;
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "AdmissionApplication",
      entityId: id,
      details: {
        actionType: "ENROLL_APPLICANT",
        enrolledStudentId: createdStudent.id,
        admissionNumber: createdStudent.admissionNumber,
      },
    });

    return {
      application: await this.getAdmissionApplicationById(ctx, id),
      student: createdStudent,
    };
  }

  // ---------------------------------------------------------------------------
  // 13. STATS & ANALYTICS
  // ---------------------------------------------------------------------------
  async getStudentStats(ctx: TenantContext) {
    try {
      const [total, active, suspended, graduated, withdrawn, maleCount, femaleCount] =
        await Promise.all([
          prisma.student.count({ where: { organizationId: ctx.organizationId } }),
          prisma.student.count({ where: { organizationId: ctx.organizationId, status: "ACTIVE" } }),
          prisma.student.count({ where: { organizationId: ctx.organizationId, status: "SUSPENDED" } }),
          prisma.student.count({ where: { organizationId: ctx.organizationId, status: "GRADUATED" } }),
          prisma.student.count({ where: { organizationId: ctx.organizationId, status: "WITHDRAWN" } }),
          prisma.student.count({ where: { organizationId: ctx.organizationId, gender: "MALE" } }),
          prisma.student.count({ where: { organizationId: ctx.organizationId, gender: "FEMALE" } }),
        ]);

      return {
        total,
        active,
        suspended,
        graduated,
        withdrawn,
        otherStatus: total - active - suspended - graduated - withdrawn,
        male: maleCount,
        female: femaleCount,
      };
    } catch {
      const orgStudents = inMemoryStudentStore.students.filter(
        (s) => s.organizationId === ctx.organizationId
      );
      const total = orgStudents.length;
      const active = orgStudents.filter((s) => s.status === "ACTIVE").length;
      const suspended = orgStudents.filter((s) => s.status === "SUSPENDED").length;
      const graduated = orgStudents.filter((s) => s.status === "GRADUATED").length;
      const withdrawn = orgStudents.filter((s) => s.status === "WITHDRAWN").length;
      const male = orgStudents.filter((s) => s.gender === "MALE").length;
      const female = orgStudents.filter((s) => s.gender === "FEMALE").length;

      return {
        total,
        active,
        suspended,
        graduated,
        withdrawn,
        otherStatus: total - active - suspended - graduated - withdrawn,
        male,
        female,
      };
    }
  }

  async getAdmissionsStats(ctx: TenantContext) {
    try {
      const [total, submitted, underReview, approved, rejected, withdrawn] = await Promise.all([
        prisma.admissionApplication.count({ where: { organizationId: ctx.organizationId } }),
        prisma.admissionApplication.count({ where: { organizationId: ctx.organizationId, status: "SUBMITTED" } }),
        prisma.admissionApplication.count({ where: { organizationId: ctx.organizationId, status: "UNDER_REVIEW" } }),
        prisma.admissionApplication.count({ where: { organizationId: ctx.organizationId, status: "APPROVED" } }),
        prisma.admissionApplication.count({ where: { organizationId: ctx.organizationId, status: "REJECTED" } }),
        prisma.admissionApplication.count({ where: { organizationId: ctx.organizationId, status: "WITHDRAWN" } }),
      ]);

      return {
        total,
        submitted,
        underReview,
        approved,
        rejected,
        withdrawn,
      };
    } catch {
      const orgApps = inMemoryStudentStore.applications.filter(
        (a) => a.organizationId === ctx.organizationId
      );
      return {
        total: orgApps.length,
        submitted: orgApps.filter((a) => a.status === "SUBMITTED").length,
        underReview: orgApps.filter((a) => a.status === "UNDER_REVIEW").length,
        approved: orgApps.filter((a) => a.status === "APPROVED").length,
        rejected: orgApps.filter((a) => a.status === "REJECTED").length,
        withdrawn: orgApps.filter((a) => a.status === "WITHDRAWN").length,
      };
    }
  }
}

export const studentService = new StudentService();
