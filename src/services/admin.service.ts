import { prisma } from "@/lib/db";
import { TenantContext } from "@/repositories/types";
import { auditRepository } from "@/repositories/audit.repository";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  UpdateOrganizationInput,
  CampusInput,
  AcademicYearInput,
  TermInput,
  ClassLevelInput,
  ClassInput,
  SectionInput,
  SubjectInput,
  DepartmentInput,
  PositionInput,
  SchoolSettingsInput,
} from "@/lib/validations/admin";
import { SYSTEM_ROLES_CONFIG } from "@/lib/auth/rbac-config";

// Default demo organization id
export const DEMO_ORG_ID = "org-apex-demo-01";
export const DEMO_CAMPUS_MAIN_ID = "camp-apex-main-01";
export const DEMO_CAMPUS_WEST_ID = "camp-apex-west-02";

// In-Memory Seed State for Offline/Dev Resilience
interface InMemoryAdminState {
  organization: {
    id: string;
    name: string;
    code: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
    website: string;
    logoUrl: string;
    status: string;
    settings: Record<string, unknown>;
  };
  campuses: Array<{
    id: string;
    organizationId: string;
    name: string;
    code: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    phone?: string;
    email?: string;
    status: string;
    isDefault?: boolean;
  }>;
  academicYears: Array<{
    id: string;
    organizationId: string;
    campusId: string | null;
    name: string;
    code: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    status: string;
  }>;
  terms: Array<{
    id: string;
    academicYearId: string;
    name: string;
    termNumber: number;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
    status: string;
  }>;
  classLevels: Array<{
    id: string;
    organizationId: string;
    campusId: string;
    name: string;
    code: string;
    sequenceOrder: number;
    description: string;
  }>;
  classes: Array<{
    id: string;
    organizationId: string;
    campusId: string;
    classLevelId: string;
    academicYearId: string;
    name: string;
    code: string;
    capacity: number;
    classTeacherId: string | null;
  }>;
  sections: Array<{
    id: string;
    classId: string;
    name: string;
    code: string;
    roomNumber: string;
    capacity: number;
    classTeacherId: string | null;
  }>;
  subjects: Array<{
    id: string;
    organizationId: string;
    campusId: string;
    name: string;
    code: string;
    description: string;
    creditUnits: number;
    isElective: boolean;
    isActive: boolean;
  }>;
  departments: Array<{
    id: string;
    organizationId: string;
    campusId: string;
    name: string;
    code: string;
    description: string;
    headOfDepartmentId: string | null;
  }>;
  positions: Array<{
    id: string;
    organizationId: string;
    campusId: string;
    departmentId: string | null;
    title: string;
    code: string;
    description: string;
  }>;
  staff: Array<{
    id: string;
    organizationId: string;
    campusId: string;
    employeeNumber: string;
    userId: string;
    departmentId: string | null;
    positionId: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    employmentStatus: string;
    employmentType: string;
    dateJoined: string;
    qualification: string;
    specialization: string;
  }>;
  users: Array<{
    id: string;
    organizationId: string;
    email: string;
    firstName: string;
    lastName: string;
    status: string;
    roles: string[];
    campusIds: string[];
  }>;
  roles: Array<{
    id: string;
    organizationId: string;
    name: string;
    description: string;
    roleType: string;
    permissions: string[];
    isSystem: boolean;
  }>;
  settings: Record<string, unknown>;
}

function initializeState(): InMemoryAdminState {
  return {
    organization: {
      id: DEMO_ORG_ID,
      name: "Apex International Academy",
      code: "APEX",
      slug: "apex-international",
      email: "info@apex-demo.internal",
      phone: "+1 (555) 234-5678",
      address: "100 Academic Boulevard, Suite 500, Cambridge, MA",
      website: "https://apex-demo.internal",
      logoUrl: "",
      status: "ACTIVE",
      settings: {
        timezone: "America/New_York",
        locale: "en-US",
        currency: "USD",
      },
    },
    campuses: [
      {
        id: DEMO_CAMPUS_MAIN_ID,
        organizationId: DEMO_ORG_ID,
        name: "Apex Main Campus (City Center)",
        code: "CAMP-01",
        address: "100 Academic Boulevard",
        city: "Cambridge",
        state: "MA",
        country: "United States",
        postalCode: "02138",
        phone: "+1 (555) 234-5678",
        email: "main.campus@apex-demo.internal",
        status: "ACTIVE",
        isDefault: true,
      },
      {
        id: DEMO_CAMPUS_WEST_ID,
        organizationId: DEMO_ORG_ID,
        name: "Apex West Campus (Science Wing)",
        code: "CAMP-02",
        address: "45 Innovation Way",
        city: "Boston",
        state: "MA",
        country: "United States",
        postalCode: "02215",
        phone: "+1 (555) 876-5432",
        email: "west.campus@apex-demo.internal",
        status: "ACTIVE",
        isDefault: false,
      },
    ],
    academicYears: [
      {
        id: "ay-2025-26",
        organizationId: DEMO_ORG_ID,
        campusId: null,
        name: "2025/2026 Academic Session",
        code: "AY-2025-26",
        startDate: "2025-08-15",
        endDate: "2026-06-30",
        isCurrent: true,
        status: "ACTIVE",
      },
      {
        id: "ay-2026-27",
        organizationId: DEMO_ORG_ID,
        campusId: null,
        name: "2026/2027 Academic Session",
        code: "AY-2026-27",
        startDate: "2026-08-15",
        endDate: "2027-06-30",
        isCurrent: false,
        status: "UPCOMING",
      },
    ],
    terms: [
      {
        id: "term-2025-t1",
        academicYearId: "ay-2025-26",
        name: "First Term (Fall)",
        termNumber: 1,
        startDate: "2025-08-15",
        endDate: "2025-12-18",
        isCurrent: false,
        status: "COMPLETED",
      },
      {
        id: "term-2025-t2",
        academicYearId: "ay-2025-26",
        name: "Second Term (Spring)",
        termNumber: 2,
        startDate: "2026-01-08",
        endDate: "2026-04-10",
        isCurrent: true,
        status: "ACTIVE",
      },
      {
        id: "term-2025-t3",
        academicYearId: "ay-2025-26",
        name: "Third Term (Summer)",
        termNumber: 3,
        startDate: "2026-04-20",
        endDate: "2026-06-30",
        isCurrent: false,
        status: "UPCOMING",
      },
    ],
    classLevels: [
      {
        id: "lvl-jss1",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Junior Secondary 1 (Grade 7)",
        code: "JSS1",
        sequenceOrder: 1,
        description: "Introductory secondary tier",
      },
      {
        id: "lvl-jss2",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Junior Secondary 2 (Grade 8)",
        code: "JSS2",
        sequenceOrder: 2,
        description: "Intermediate secondary tier",
      },
      {
        id: "lvl-sss1",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Senior Secondary 1 (Grade 10)",
        code: "SS1",
        sequenceOrder: 4,
        description: "Senior secondary specialization tier",
      },
    ],
    classes: [
      {
        id: "cls-jss1-2526",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        classLevelId: "lvl-jss1",
        academicYearId: "ay-2025-26",
        name: "JSS1 - 2025/2026 Cohort",
        code: "JSS1-2526",
        capacity: 40,
        classTeacherId: "u-teacher-01",
      },
      {
        id: "cls-ss1-2526",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        classLevelId: "lvl-sss1",
        academicYearId: "ay-2025-26",
        name: "SS1 - 2025/2026 Cohort",
        code: "SS1-2526",
        capacity: 35,
        classTeacherId: null,
      },
    ],
    sections: [
      {
        id: "sec-jss1-a",
        classId: "cls-jss1-2526",
        name: "Section A (Diamond)",
        code: "JSS1-A",
        roomNumber: "Room 101",
        capacity: 30,
        classTeacherId: "u-teacher-01",
      },
      {
        id: "sec-jss1-b",
        classId: "cls-jss1-2526",
        name: "Section B (Emerald)",
        code: "JSS1-B",
        roomNumber: "Room 102",
        capacity: 30,
        classTeacherId: null,
      },
    ],
    subjects: [
      {
        id: "sub-math",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Pure Mathematics & Geometry",
        code: "MATH-101",
        description: "Algebra, calculus fundamentals, Euclidean geometry",
        creditUnits: 3,
        isElective: false,
        isActive: true,
      },
      {
        id: "sub-eng",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "English Language & Composition",
        code: "ENG-101",
        description: "Grammar, comprehension, and institutional writing",
        creditUnits: 3,
        isElective: false,
        isActive: true,
      },
      {
        id: "sub-phy",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "General Physics with Laboratory",
        code: "PHY-101",
        description: "Classical mechanics and thermodynamics",
        creditUnits: 4,
        isElective: true,
        isActive: true,
      },
    ],
    departments: [
      {
        id: "dept-math-sci",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "Department of Mathematics & Physical Sciences",
        code: "SCI-MATH",
        description: "Faculty teaching mathematics, physics, and computing",
        headOfDepartmentId: "u-teacher-01",
      },
      {
        id: "dept-admin",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        name: "School Administration & Operations",
        code: "ADMIN-OPS",
        description: "Leadership, admissions, and compliance",
        headOfDepartmentId: "u-principal-01",
      },
    ],
    positions: [
      {
        id: "pos-principal",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        departmentId: "dept-admin",
        title: "Principal & Head of School",
        code: "PRIN-01",
        description: "Chief executive leadership",
      },
      {
        id: "pos-snr-teacher",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        departmentId: "dept-math-sci",
        title: "Senior Mathematics Lecturer",
        code: "SNR-MATH",
        description: "Senior secondary faculty lead",
      },
      {
        id: "pos-accountant",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        departmentId: "dept-admin",
        title: "Bursar / Lead Accountant",
        code: "BURSAR-01",
        description: "Institutional finance manager",
      },
    ],
    staff: [
      {
        id: "stf-001",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        employeeNumber: "EMP-2025-01",
        userId: "u-teacher-01",
        departmentId: "dept-math-sci",
        positionId: "pos-snr-teacher",
        firstName: "Marcus",
        lastName: "Holloway",
        email: "teacher.math@apex-demo.internal",
        phone: "+1 (555) 019-8822",
        employmentStatus: "ACTIVE",
        employmentType: "FULL_TIME",
        dateJoined: "2024-08-15",
        qualification: "M.Sc. Mathematics, MIT",
        specialization: "Calculus & Statistics",
      },
      {
        id: "stf-002",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        employeeNumber: "EMP-2024-01",
        userId: "u-principal-01",
        departmentId: "dept-admin",
        positionId: "pos-principal",
        firstName: "Arthur",
        lastName: "Pendleton",
        email: "principal@apex-demo.internal",
        phone: "+1 (555) 019-1100",
        employmentStatus: "ACTIVE",
        employmentType: "FULL_TIME",
        dateJoined: "2023-01-10",
        qualification: "Ph.D. Educational Leadership",
        specialization: "Curriculum Strategy",
      },
      {
        id: "stf-003",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        employeeNumber: "EMP-2025-02",
        userId: "u-accountant-01",
        departmentId: "dept-admin",
        positionId: "pos-accountant",
        firstName: "Clara",
        lastName: "Oswald",
        email: "accountant@apex-demo.internal",
        phone: "+1 (555) 019-3355",
        employmentStatus: "ACTIVE",
        employmentType: "FULL_TIME",
        dateJoined: "2024-09-01",
        qualification: "CPA, B.Sc. Accounting",
        specialization: "Institutional Auditing",
      },
    ],
    users: [
      {
        id: "u-super-admin-01",
        organizationId: DEMO_ORG_ID,
        email: "admin@apex-demo.internal",
        firstName: "Eleanor",
        lastName: "Vance",
        status: "ACTIVE",
        roles: ["Super Administrator"],
        campusIds: [DEMO_CAMPUS_MAIN_ID, DEMO_CAMPUS_WEST_ID],
      },
      {
        id: "u-principal-01",
        organizationId: DEMO_ORG_ID,
        email: "principal@apex-demo.internal",
        firstName: "Arthur",
        lastName: "Pendleton",
        status: "ACTIVE",
        roles: ["Principal"],
        campusIds: [DEMO_CAMPUS_MAIN_ID],
      },
      {
        id: "u-teacher-01",
        organizationId: DEMO_ORG_ID,
        email: "teacher.math@apex-demo.internal",
        firstName: "Marcus",
        lastName: "Holloway",
        status: "ACTIVE",
        roles: ["Academic Teacher"],
        campusIds: [DEMO_CAMPUS_MAIN_ID],
      },
      {
        id: "u-accountant-01",
        organizationId: DEMO_ORG_ID,
        email: "accountant@apex-demo.internal",
        firstName: "Clara",
        lastName: "Oswald",
        status: "ACTIVE",
        roles: ["Accountant"],
        campusIds: [DEMO_CAMPUS_MAIN_ID, DEMO_CAMPUS_WEST_ID],
      },
    ],
    roles: SYSTEM_ROLES_CONFIG.map((rc, idx) => ({
      id: `role-${idx + 1}`,
      organizationId: DEMO_ORG_ID,
      name: rc.name,
      description: rc.description,
      roleType: rc.roleType,
      permissions: rc.permissions,
      isSystem: true,
    })),
    settings: {
      schoolName: "Apex International Academy",
      timezone: "America/New_York",
      locale: "en-US",
      currency: "USD",
      dateFormat: "YYYY-MM-DD",
      branding: {
        primaryColor: "#4f46e5",
        accentColor: "#06b6d4",
        themeMode: "light",
      },
      contact: {
        primaryEmail: "info@apex-demo.internal",
        primaryPhone: "+1 (555) 234-5678",
        postalAddress: "100 Academic Boulevard, Suite 500, Cambridge, MA",
      },
      notifications: {
        emailAlerts: true,
        smsAlerts: false,
        attendanceDigest: true,
      },
    },
  };
}

let inMemoryStore: InMemoryAdminState = initializeState();

export class AdminService {
  /**
   * Resets in-memory store (for testing purposes)
   */
  resetStore() {
    inMemoryStore = initializeState();
  }

  // ---------------------------------------------------------------------------
  // DASHBOARD STATISTICS
  // ---------------------------------------------------------------------------
  async getDashboardStats(ctx: TenantContext) {
    try {
      const [
        campusesCount,
        currentYear,
        classLevelsCount,
        classesCount,
        subjectsCount,
        departmentsCount,
        staffCount,
        usersCount,
      ] = await Promise.all([
        prisma.campus.count({ where: { organizationId: ctx.organizationId } }),
        prisma.academicYear.findFirst({
          where: { organizationId: ctx.organizationId, isCurrent: true },
          include: { terms: { where: { isCurrent: true } } },
        }),
        prisma.classLevel.count({ where: { organizationId: ctx.organizationId } }),
        prisma.class.count({ where: { organizationId: ctx.organizationId } }),
        prisma.subject.count({ where: { organizationId: ctx.organizationId } }),
        prisma.department.count({ where: { organizationId: ctx.organizationId } }),
        prisma.staff.count({ where: { organizationId: ctx.organizationId } }),
        prisma.user.count({ where: { organizationId: ctx.organizationId } }),
      ]);

      const org = await prisma.organization.findUnique({ where: { id: ctx.organizationId } });

      return {
        organizationName: org?.name || inMemoryStore.organization.name,
        organizationCode: org?.code || inMemoryStore.organization.code,
        campusesCount,
        currentAcademicYear: currentYear?.name || null,
        currentTerm: currentYear?.terms[0]?.name || null,
        classLevelsCount,
        classesCount,
        subjectsCount,
        departmentsCount,
        staffCount,
        usersCount,
      };
    } catch {
      // Offline fallback
      const currentYear = inMemoryStore.academicYears.find(
        (ay) => ay.isCurrent && ay.organizationId === ctx.organizationId
      );
      const currentTerm = inMemoryStore.terms.find((t) => t.isCurrent);
      const isCurrentTenant = ctx.organizationId === DEMO_ORG_ID;

      return {
        organizationName: isCurrentTenant ? inMemoryStore.organization.name : "Institution",
        organizationCode: isCurrentTenant ? inMemoryStore.organization.code : "INST",
        campusesCount: inMemoryStore.campuses.filter((c) => c.organizationId === ctx.organizationId).length,
        currentAcademicYear: currentYear ? currentYear.name : null,
        currentTerm: currentTerm ? currentTerm.name : null,
        classLevelsCount: inMemoryStore.classLevels.filter((cl) => cl.organizationId === ctx.organizationId).length,
        classesCount: inMemoryStore.classes.filter((c) => c.organizationId === ctx.organizationId).length,
        subjectsCount: inMemoryStore.subjects.filter((s) => s.organizationId === ctx.organizationId).length,
        departmentsCount: inMemoryStore.departments.filter((d) => d.organizationId === ctx.organizationId).length,
        staffCount: inMemoryStore.staff.filter((s) => s.organizationId === ctx.organizationId).length,
        usersCount: inMemoryStore.users.filter((u) => u.organizationId === ctx.organizationId).length,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // ORGANIZATION MANAGEMENT
  // ---------------------------------------------------------------------------
  async getOrganization(ctx: TenantContext) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: ctx.organizationId },
        include: { campuses: true },
      });
      if (org) return org;
    } catch (e) {
      logger.debug("Database read failed for organization, using memory store", { err: e });
    }
    return inMemoryStore.organization;
  }

  async updateOrganization(ctx: TenantContext, input: UpdateOrganizationInput) {
    try {
      const updated = await prisma.organization.update({
        where: { id: ctx.organizationId },
        data: input,
      });

      await auditRepository.log(ctx, {
        action: "UPDATE",
        entity: "Organization",
        entityId: ctx.organizationId,
        details: { changes: input },
      });

      return updated;
    } catch {
      // Memory store fallback
      inMemoryStore.organization = {
        ...inMemoryStore.organization,
        ...input,
      };

      await auditRepository.log(ctx, {
        action: "UPDATE",
        entity: "Organization",
        entityId: ctx.organizationId,
        details: { changes: input },
      });

      return inMemoryStore.organization;
    }
  }

  // ---------------------------------------------------------------------------
  // CAMPUS MANAGEMENT
  // ---------------------------------------------------------------------------
  async getCampuses(ctx: TenantContext) {
    try {
      const list = await prisma.campus.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { name: "asc" },
      });
      if (list.length > 0) return list;
    } catch (e) {
      logger.debug("Database read failed for campuses, using memory store", { err: e });
    }
    return inMemoryStore.campuses.filter((c) => c.organizationId === ctx.organizationId);
  }

  async createCampus(ctx: TenantContext, input: CampusInput) {
    // Check duplicate code
    const existing = inMemoryStore.campuses.find(
      (c) => c.organizationId === ctx.organizationId && c.code === input.code
    );
    if (existing) {
      throw new ValidationError(`Campus code '${input.code}' already exists within this organization.`, {
        code: ["Campus code must be unique within this organization."],
      });
    }

    try {
      const newCampus = await prisma.campus.create({
        data: {
          ...input,
          organizationId: ctx.organizationId,
        },
      });

      await auditRepository.log(ctx, {
        action: "CREATE",
        entity: "Campus",
        entityId: newCampus.id,
        details: { name: input.name, code: input.code },
      });

      return newCampus;
    } catch {
      const newCampus = {
        id: `camp-${Date.now()}`,
        organizationId: ctx.organizationId,
        ...input,
      };
      inMemoryStore.campuses.push(newCampus);

      await auditRepository.log(ctx, {
        action: "CREATE",
        entity: "Campus",
        entityId: newCampus.id,
        details: { name: input.name, code: input.code },
      });

      return newCampus;
    }
  }

  async updateCampus(ctx: TenantContext, campusId: string, input: Partial<CampusInput>) {
    const campus = inMemoryStore.campuses.find((c) => c.id === campusId);
    if (!campus || campus.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Campus not found or access denied.");
    }

    if (input.code && input.code !== campus.code) {
      const duplicate = inMemoryStore.campuses.find(
        (c) => c.organizationId === ctx.organizationId && c.code === input.code && c.id !== campusId
      );
      if (duplicate) {
        throw new ValidationError(`Campus code '${input.code}' already exists within this organization.`);
      }
    }

    try {
      const updated = await prisma.campus.update({
        where: { id: campusId },
        data: input,
      });

      await auditRepository.log(ctx, {
        action: "UPDATE",
        entity: "Campus",
        entityId: campusId,
        details: input,
      });

      return updated;
    } catch {
      Object.assign(campus, input);

      await auditRepository.log(ctx, {
        action: "UPDATE",
        entity: "Campus",
        entityId: campusId,
        details: input,
      });

      return campus;
    }
  }

  async toggleCampusStatus(ctx: TenantContext, campusId: string) {
    const campus = inMemoryStore.campuses.find((c) => c.id === campusId);
    if (!campus || campus.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Campus not found or access denied.");
    }

    const newStatus = campus.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    campus.status = newStatus;

    try {
      await prisma.campus.update({
        where: { id: campusId },
        data: { status: newStatus as any },
      });
    } catch {
      // Ignored in fallback
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Campus",
      entityId: campusId,
      details: { newStatus },
    });

    return campus;
  }

  // ---------------------------------------------------------------------------
  // ACADEMIC YEAR MANAGEMENT
  // ---------------------------------------------------------------------------
  async getAcademicYears(ctx: TenantContext) {
    try {
      const list = await prisma.academicYear.findMany({
        where: { organizationId: ctx.organizationId },
        include: { terms: { orderBy: { termNumber: "asc" } } },
        orderBy: { startDate: "desc" },
      });
      if (list.length > 0) return list;
    } catch (e) {
      logger.debug("Database read failed for academic years", { err: e });
    }
    return inMemoryStore.academicYears
      .filter((ay) => ay.organizationId === ctx.organizationId)
      .map((ay) => ({
        ...ay,
        terms: inMemoryStore.terms.filter((t) => t.academicYearId === ay.id),
      }));
  }

  async createAcademicYear(ctx: TenantContext, input: AcademicYearInput) {
    // Duplicate check
    const existing = inMemoryStore.academicYears.find(
      (ay) => ay.organizationId === ctx.organizationId && ay.code === input.code
    );
    if (existing) {
      throw new ValidationError(`Academic year with code '${input.code}' already exists.`);
    }

    // If marked current, deactivate existing
    if (input.isCurrent) {
      inMemoryStore.academicYears.forEach((ay) => {
        if (ay.organizationId === ctx.organizationId) ay.isCurrent = false;
      });
    }

    try {
      if (input.isCurrent) {
        await prisma.academicYear.updateMany({
          where: { organizationId: ctx.organizationId },
          data: { isCurrent: false },
        });
      }

      const created = await prisma.academicYear.create({
        data: {
          name: input.name,
          code: input.code,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
          isCurrent: input.isCurrent,
          status: input.status as any,
          organizationId: ctx.organizationId,
          campusId: input.campusId || null,
        },
      });

      await auditRepository.log(ctx, {
        action: "CREATE",
        entity: "AcademicYear",
        entityId: created.id,
        details: { name: input.name, code: input.code },
      });

      return created;
    } catch {
      const newAY = {
        id: `ay-${Date.now()}`,
        organizationId: ctx.organizationId,
        campusId: input.campusId || null,
        name: input.name,
        code: input.code,
        startDate: input.startDate,
        endDate: input.endDate,
        isCurrent: input.isCurrent,
        status: input.status,
      };
      inMemoryStore.academicYears.push(newAY);

      await auditRepository.log(ctx, {
        action: "CREATE",
        entity: "AcademicYear",
        entityId: newAY.id,
        details: { name: input.name, code: input.code },
      });

      return newAY;
    }
  }

  async updateAcademicYear(ctx: TenantContext, id: string, input: Partial<AcademicYearInput>) {
    const ay = inMemoryStore.academicYears.find((item) => item.id === id);
    if (!ay || ay.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Academic year not found.");
    }

    if (input.isCurrent) {
      inMemoryStore.academicYears.forEach((item) => {
        if (item.organizationId === ctx.organizationId) item.isCurrent = false;
      });
    }

    Object.assign(ay, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "AcademicYear",
      entityId: id,
      details: input,
    });

    return ay;
  }

  async setCurrentAcademicYear(ctx: TenantContext, id: string) {
    const ay = inMemoryStore.academicYears.find((item) => item.id === id);
    if (!ay || ay.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Academic year not found.");
    }

    // Unset current on all others
    inMemoryStore.academicYears.forEach((item) => {
      if (item.organizationId === ctx.organizationId) {
        item.isCurrent = item.id === id;
      }
    });

    try {
      await prisma.$transaction([
        prisma.academicYear.updateMany({
          where: { organizationId: ctx.organizationId },
          data: { isCurrent: false },
        }),
        prisma.academicYear.update({
          where: { id },
          data: { isCurrent: true, status: "ACTIVE" },
        }),
      ]);
    } catch {
      // Offline fallback
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "AcademicYear",
      entityId: id,
      details: { isCurrent: true },
    });

    return ay;
  }

  // ---------------------------------------------------------------------------
  // TERM MANAGEMENT
  // ---------------------------------------------------------------------------
  async getTerms(ctx: TenantContext, academicYearId?: string) {
    if (academicYearId) {
      return inMemoryStore.terms.filter((t) => t.academicYearId === academicYearId);
    }
    return inMemoryStore.terms;
  }

  async createTerm(ctx: TenantContext, input: TermInput) {
    const ay = inMemoryStore.academicYears.find((a) => a.id === input.academicYearId);
    if (!ay || ay.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Associated academic year not found.");
    }

    // Check duplicate term number in year
    const existing = inMemoryStore.terms.find(
      (t) => t.academicYearId === input.academicYearId && t.termNumber === input.termNumber
    );
    if (existing) {
      throw new ValidationError(`Term #${input.termNumber} already exists in this academic year.`);
    }

    if (input.isCurrent) {
      inMemoryStore.terms.forEach((t) => {
        t.isCurrent = false;
      });
    }

    const newTerm = {
      id: `term-${Date.now()}`,
      ...input,
    };
    inMemoryStore.terms.push(newTerm);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Term",
      entityId: newTerm.id,
      details: { name: input.name, termNumber: input.termNumber },
    });

    return newTerm;
  }

  async updateTerm(ctx: TenantContext, id: string, input: Partial<TermInput>) {
    const term = inMemoryStore.terms.find((t) => t.id === id);
    if (!term) throw new NotFoundError("Term not found.");

    if (input.isCurrent) {
      inMemoryStore.terms.forEach((t) => {
        t.isCurrent = false;
      });
    }

    Object.assign(term, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Term",
      entityId: id,
      details: input,
    });

    return term;
  }

  async setCurrentTerm(ctx: TenantContext, id: string) {
    const term = inMemoryStore.terms.find((t) => t.id === id);
    if (!term) throw new NotFoundError("Term not found.");

    inMemoryStore.terms.forEach((t) => {
      t.isCurrent = t.id === id;
    });

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Term",
      entityId: id,
      details: { isCurrent: true },
    });

    return term;
  }

  // ---------------------------------------------------------------------------
  // CLASS LEVEL MANAGEMENT
  // ---------------------------------------------------------------------------
  async getClassLevels(ctx: TenantContext, campusId?: string) {
    const targetCampus = campusId || ctx.campusId || DEMO_CAMPUS_MAIN_ID;
    return inMemoryStore.classLevels
      .filter((cl) => cl.organizationId === ctx.organizationId && (!targetCampus || cl.campusId === targetCampus))
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }

  async createClassLevel(ctx: TenantContext, input: ClassLevelInput) {
    const campusId = input.campusId || ctx.campusId || DEMO_CAMPUS_MAIN_ID;

    // Check duplicate code per campus
    const duplicate = inMemoryStore.classLevels.find(
      (cl) => cl.campusId === campusId && cl.code === input.code
    );
    if (duplicate) {
      throw new ValidationError(`Class level with code '${input.code}' already exists in this campus.`);
    }

    const newLevel = {
      id: `lvl-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId,
      name: input.name,
      code: input.code,
      sequenceOrder: input.sequenceOrder,
      description: input.description || "",
    };
    inMemoryStore.classLevels.push(newLevel);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "ClassLevel",
      entityId: newLevel.id,
      details: { name: input.name, code: input.code },
    });

    return newLevel;
  }

  async updateClassLevel(ctx: TenantContext, id: string, input: Partial<ClassLevelInput>) {
    const level = inMemoryStore.classLevels.find((l) => l.id === id);
    if (!level || level.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Class level not found.");
    }

    Object.assign(level, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "ClassLevel",
      entityId: id,
      details: input,
    });

    return level;
  }

  async deleteClassLevel(ctx: TenantContext, id: string) {
    const idx = inMemoryStore.classLevels.findIndex((l) => l.id === id);
    if (idx === -1) throw new NotFoundError("Class level not found.");

    // Check if classes exist for this level
    const hasClasses = inMemoryStore.classes.some((c) => c.classLevelId === id);
    if (hasClasses) {
      throw new ValidationError("Cannot delete class level: Classes are assigned to it.");
    }

    inMemoryStore.classLevels.splice(idx, 1);

    await auditRepository.log(ctx, {
      action: "DELETE",
      entity: "ClassLevel",
      entityId: id,
    });

    return { deleted: true };
  }

  // ---------------------------------------------------------------------------
  // CLASS & SECTION MANAGEMENT
  // ---------------------------------------------------------------------------
  async getClasses(ctx: TenantContext, academicYearId?: string, campusId?: string) {
    const targetCampus = campusId || ctx.campusId;
    return inMemoryStore.classes
      .filter((c) => {
        if (c.organizationId !== ctx.organizationId) return false;
        if (targetCampus && c.campusId !== targetCampus) return false;
        if (academicYearId && c.academicYearId !== academicYearId) return false;
        return true;
      })
      .map((c) => ({
        ...c,
        level: inMemoryStore.classLevels.find((l) => l.id === c.classLevelId),
        sections: inMemoryStore.sections.filter((s) => s.classId === c.id),
      }));
  }

  async createClass(ctx: TenantContext, input: ClassInput) {
    const campusId = input.campusId || ctx.campusId || DEMO_CAMPUS_MAIN_ID;

    // Check duplicate code
    const duplicate = inMemoryStore.classes.find(
      (c) => c.campusId === campusId && c.academicYearId === input.academicYearId && c.code === input.code
    );
    if (duplicate) {
      throw new ValidationError(`Class code '${input.code}' already exists for this academic session.`);
    }

    const newClass = {
      id: `cls-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId,
      classLevelId: input.classLevelId,
      academicYearId: input.academicYearId,
      name: input.name,
      code: input.code,
      capacity: input.capacity,
      classTeacherId: input.classTeacherId || null,
    };
    inMemoryStore.classes.push(newClass);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Class",
      entityId: newClass.id,
      details: { name: input.name, code: input.code },
    });

    return newClass;
  }

  async updateClass(ctx: TenantContext, id: string, input: Partial<ClassInput>) {
    const cls = inMemoryStore.classes.find((c) => c.id === id);
    if (!cls || cls.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Class not found.");
    }

    Object.assign(cls, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Class",
      entityId: id,
      details: input,
    });

    return cls;
  }

  async getSections(ctx: TenantContext, classId?: string) {
    if (classId) {
      return inMemoryStore.sections.filter((s) => s.classId === classId);
    }
    return inMemoryStore.sections;
  }

  async createSection(ctx: TenantContext, input: SectionInput) {
    const cls = inMemoryStore.classes.find((c) => c.id === input.classId);
    if (!cls || cls.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Associated class not found.");
    }

    const duplicate = inMemoryStore.sections.find(
      (s) => s.classId === input.classId && s.code === input.code
    );
    if (duplicate) {
      throw new ValidationError(`Section code '${input.code}' already exists in this class.`);
    }

    const newSection = {
      id: `sec-${Date.now()}`,
      classId: input.classId,
      name: input.name,
      code: input.code,
      roomNumber: input.roomNumber || "",
      capacity: input.capacity,
      classTeacherId: input.classTeacherId || null,
    };
    inMemoryStore.sections.push(newSection);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Section",
      entityId: newSection.id,
      details: { name: input.name, code: input.code },
    });

    return newSection;
  }

  async updateSection(ctx: TenantContext, id: string, input: Partial<SectionInput>) {
    const section = inMemoryStore.sections.find((s) => s.id === id);
    if (!section) throw new NotFoundError("Section not found.");

    Object.assign(section, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Section",
      entityId: id,
      details: input,
    });

    return section;
  }

  // ---------------------------------------------------------------------------
  // SUBJECT MANAGEMENT
  // ---------------------------------------------------------------------------
  async getSubjects(ctx: TenantContext, campusId?: string, search?: string) {
    const targetCampus = campusId || ctx.campusId;
    let list = inMemoryStore.subjects.filter((s) => {
      if (s.organizationId !== ctx.organizationId) return false;
      if (targetCampus && s.campusId !== targetCampus) return false;
      return true;
    });

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }

    return list;
  }

  async createSubject(ctx: TenantContext, input: SubjectInput) {
    const campusId = input.campusId || ctx.campusId || DEMO_CAMPUS_MAIN_ID;

    const duplicate = inMemoryStore.subjects.find(
      (s) => s.campusId === campusId && s.code === input.code
    );
    if (duplicate) {
      throw new ValidationError(`Subject code '${input.code}' already exists in this campus.`);
    }

    const newSubject = {
      id: `sub-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId,
      name: input.name,
      code: input.code,
      description: input.description || "",
      creditUnits: input.creditUnits,
      isElective: input.isElective,
      isActive: input.isActive,
    };
    inMemoryStore.subjects.push(newSubject);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Subject",
      entityId: newSubject.id,
      details: { name: input.name, code: input.code },
    });

    return newSubject;
  }

  async updateSubject(ctx: TenantContext, id: string, input: Partial<SubjectInput>) {
    const subject = inMemoryStore.subjects.find((s) => s.id === id);
    if (!subject || subject.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Subject not found.");
    }

    Object.assign(subject, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Subject",
      entityId: id,
      details: input,
    });

    return subject;
  }

  async toggleSubjectStatus(ctx: TenantContext, id: string) {
    const subject = inMemoryStore.subjects.find((s) => s.id === id);
    if (!subject || subject.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Subject not found.");
    }

    subject.isActive = !subject.isActive;

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Subject",
      entityId: id,
      details: { isActive: subject.isActive },
    });

    return subject;
  }

  // ---------------------------------------------------------------------------
  // DEPARTMENTS & POSITIONS
  // ---------------------------------------------------------------------------
  async getDepartments(ctx: TenantContext, campusId?: string) {
    const targetCampus = campusId || ctx.campusId;
    return inMemoryStore.departments
      .filter((d) => {
        if (d.organizationId !== ctx.organizationId) return false;
        if (targetCampus && d.campusId !== targetCampus) return false;
        return true;
      })
      .map((d) => ({
        ...d,
        positions: inMemoryStore.positions.filter((p) => p.departmentId === d.id),
      }));
  }

  async createDepartment(ctx: TenantContext, input: DepartmentInput) {
    const campusId = input.campusId || ctx.campusId || DEMO_CAMPUS_MAIN_ID;

    const duplicate = inMemoryStore.departments.find(
      (d) => d.campusId === campusId && d.code === input.code
    );
    if (duplicate) {
      throw new ValidationError(`Department code '${input.code}' already exists.`);
    }

    const newDept = {
      id: `dept-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId,
      name: input.name,
      code: input.code,
      description: input.description || "",
      headOfDepartmentId: input.headOfDepartmentId || null,
    };
    inMemoryStore.departments.push(newDept);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Department",
      entityId: newDept.id,
      details: { name: input.name, code: input.code },
    });

    return newDept;
  }

  async updateDepartment(ctx: TenantContext, id: string, input: Partial<DepartmentInput>) {
    const dept = inMemoryStore.departments.find((d) => d.id === id);
    if (!dept || dept.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Department not found.");
    }

    Object.assign(dept, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Department",
      entityId: id,
      details: input,
    });

    return dept;
  }

  async getPositions(ctx: TenantContext, campusId?: string) {
    const targetCampus = campusId || ctx.campusId;
    return inMemoryStore.positions.filter((p) => {
      if (p.organizationId !== ctx.organizationId) return false;
      if (targetCampus && p.campusId !== targetCampus) return false;
      return true;
    });
  }

  async createPosition(ctx: TenantContext, input: PositionInput) {
    const campusId = input.campusId || ctx.campusId || DEMO_CAMPUS_MAIN_ID;

    const duplicate = inMemoryStore.positions.find(
      (p) => p.campusId === campusId && p.code === input.code
    );
    if (duplicate) {
      throw new ValidationError(`Position code '${input.code}' already exists.`);
    }

    const newPos = {
      id: `pos-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId,
      departmentId: input.departmentId || null,
      title: input.title,
      code: input.code,
      description: input.description || "",
    };
    inMemoryStore.positions.push(newPos);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Position",
      entityId: newPos.id,
      details: { title: input.title, code: input.code },
    });

    return newPos;
  }

  async updatePosition(ctx: TenantContext, id: string, input: Partial<PositionInput>) {
    const pos = inMemoryStore.positions.find((p) => p.id === id);
    if (!pos || pos.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Position not found.");
    }

    Object.assign(pos, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Position",
      entityId: id,
      details: input,
    });

    return pos;
  }

  // ---------------------------------------------------------------------------
  // STAFF DIRECTORY FOUNDATION
  // ---------------------------------------------------------------------------
  async getStaffDirectory(
    ctx: TenantContext,
    filters?: {
      departmentId?: string;
      positionId?: string;
      campusId?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;

    let items = inMemoryStore.staff.filter((s) => s.organizationId === ctx.organizationId);

    if (filters?.campusId) {
      items = items.filter((s) => s.campusId === filters.campusId);
    }
    if (filters?.departmentId) {
      items = items.filter((s) => s.departmentId === filters.departmentId);
    }
    if (filters?.positionId) {
      items = items.filter((s) => s.positionId === filters.positionId);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.employeeNumber.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const paginated = items.slice((page - 1) * limit, page * limit).map((s) => ({
      ...s,
      department: inMemoryStore.departments.find((d) => d.id === s.departmentId),
      position: inMemoryStore.positions.find((p) => p.id === s.positionId),
      campus: inMemoryStore.campuses.find((c) => c.id === s.campusId),
    }));

    return {
      items: paginated,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getStaffProfile(ctx: TenantContext, id: string) {
    const staffMember = inMemoryStore.staff.find((s) => s.id === id);
    if (!staffMember || staffMember.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Staff member not found.");
    }

    return {
      ...staffMember,
      department: inMemoryStore.departments.find((d) => d.id === staffMember.departmentId),
      position: inMemoryStore.positions.find((p) => p.id === staffMember.positionId),
      campus: inMemoryStore.campuses.find((c) => c.id === staffMember.campusId),
    };
  }

  // ---------------------------------------------------------------------------
  // USER ADMINISTRATION & ROLES
  // ---------------------------------------------------------------------------
  async getUsers(ctx: TenantContext, search?: string) {
    let list = inMemoryStore.users.filter((u) => u.organizationId === ctx.organizationId);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q)
      );
    }
    return list;
  }

  async updateUserStatus(ctx: TenantContext, userId: string, status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "INVITED") {
    const targetUser = inMemoryStore.users.find((u) => u.id === userId);
    if (!targetUser || targetUser.organizationId !== ctx.organizationId) {
      throw new NotFoundError("User not found.");
    }

    // Protect super admin self-deactivation
    if (targetUser.id === ctx.userId && status !== "ACTIVE") {
      throw new ForbiddenError("Administrators cannot deactivate their own session.");
    }

    targetUser.status = status;

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      details: { newStatus: status },
    });

    return targetUser;
  }

  async updateUserRoles(ctx: TenantContext, userId: string, roles: string[]) {
    const targetUser = inMemoryStore.users.find((u) => u.id === userId);
    if (!targetUser || targetUser.organizationId !== ctx.organizationId) {
      throw new NotFoundError("User not found.");
    }

    targetUser.roles = roles;

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      details: { assignedRoles: roles },
    });

    return targetUser;
  }

  async updateUserCampuses(ctx: TenantContext, userId: string, campusIds: string[]) {
    const targetUser = inMemoryStore.users.find((u) => u.id === userId);
    if (!targetUser || targetUser.organizationId !== ctx.organizationId) {
      throw new NotFoundError("User not found.");
    }

    // Verify all campuses belong to the organization
    const validCampuses = inMemoryStore.campuses
      .filter((c) => c.organizationId === ctx.organizationId)
      .map((c) => c.id);

    const hasInvalid = campusIds.some((cid) => !validCampuses.includes(cid));
    if (hasInvalid) {
      throw new ValidationError("One or more assigned campuses are invalid or outside organization scope.");
    }

    targetUser.campusIds = campusIds;

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "User",
      entityId: userId,
      details: { assignedCampuses: campusIds },
    });

    return targetUser;
  }

  async getRoles(ctx: TenantContext) {
    return inMemoryStore.roles.filter((r) => r.organizationId === ctx.organizationId);
  }

  async updateRolePermissions(ctx: TenantContext, roleId: string, permissions: string[]) {
    const role = inMemoryStore.roles.find((r) => r.id === roleId);
    if (!role || role.organizationId !== ctx.organizationId) {
      throw new NotFoundError("Role not found.");
    }

    if (role.name === "Super Administrator") {
      throw new ForbiddenError("Cannot modify immutable Super Administrator role permissions.");
    }

    role.permissions = permissions;

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Role",
      entityId: roleId,
      details: { updatedPermissionsCount: permissions.length },
    });

    return role;
  }

  // ---------------------------------------------------------------------------
  // SETTINGS
  // ---------------------------------------------------------------------------
  async getSettings(ctx: TenantContext) {
    return inMemoryStore.settings;
  }

  async updateSettings(ctx: TenantContext, input: SchoolSettingsInput) {
    inMemoryStore.settings = {
      ...inMemoryStore.settings,
      ...input,
    };

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Settings",
      entityId: ctx.organizationId,
      details: { updatedKeys: Object.keys(input) },
    });

    return inMemoryStore.settings;
  }
}

export const adminService = new AdminService();
