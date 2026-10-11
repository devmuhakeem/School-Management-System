/**
 * Development Database Seed Script for School Management System
 * Phase 2 & 3: Comprehensive RBAC, Roles, Permissions & Identity
 *
 * NOTE: For development and testing environments ONLY.
 * Never execute with production credentials or in live tenant databases.
 */

import {
  PrismaClient,
  RoleType,
  Gender,
  StudentStatus,
  EnrollmentStatus,
  StaffStatus,
  EmploymentType,
  AcademicYearStatus,
  TermStatus,
  GuardianRelationship,
} from "@prisma/client";

const prisma = new PrismaClient();

export const SYSTEM_PERMISSIONS = [
  // Dashboard & General
  { module: "dashboard", action: "view", description: "Access central institution dashboard" },

  // Organizations & Campuses
  { module: "organizations", action: "read", description: "View institution organization settings" },
  { module: "organizations", action: "update", description: "Modify organization profile and settings" },
  { module: "campuses", action: "read", description: "View campus locations and directory" },
  { module: "campuses", action: "create", description: "Establish new school campus branch" },
  { module: "campuses", action: "update", description: "Update campus branch details" },
  { module: "campuses", action: "delete", description: "Archive or delete campus branch" },

  // Users & Security Roles
  { module: "users", action: "read", description: "View user directory" },
  { module: "users", action: "create", description: "Create staff and student user accounts" },
  { module: "users", action: "update", description: "Edit user profile and status" },
  { module: "users", action: "delete", description: "Deactivate or remove user accounts" },
  { module: "users", action: "manage", description: "Full user access administration" },
  { module: "roles", action: "read", description: "View security roles and permission matrix" },
  { module: "roles", action: "create", description: "Create custom security roles" },
  { module: "roles", action: "update", description: "Modify role permissions" },
  { module: "roles", action: "delete", description: "Delete non-system custom roles" },
  { module: "roles", action: "manage", description: "Full role and permission management" },

  // Students & Admissions
  { module: "students", action: "read", description: "View student directory and profiles" },
  { module: "students", action: "create", description: "Register new students" },
  { module: "students", action: "update", description: "Edit student demographics and profiles" },
  { module: "students", action: "delete", description: "Archive or delete student records" },
  { module: "admissions", action: "read", description: "View admission applications" },
  { module: "admissions", action: "create", description: "Submit admission applications" },
  { module: "admissions", action: "update", description: "Modify application details" },
  { module: "admissions", action: "approve", description: "Approve or reject applicant enrollment" },

  // Academics & Scheduling
  { module: "academics", action: "read", description: "View curriculum, classes, and subjects" },
  { module: "academics", action: "manage", description: "Create and assign terms, classes, and subjects" },

  // Attendance
  { module: "attendance", action: "read", description: "View student and staff attendance registers" },
  { module: "attendance", action: "manage", description: "Record and modify daily attendance" },

  // Examinations & Results
  { module: "exams", action: "read", description: "View exam schedules and grade sheets" },
  { module: "exams", action: "manage", description: "Create exams, grading scales, and enter marks" },
  { module: "results", action: "publish", description: "Publish and lock final term report cards" },

  // Finance & Fees
  { module: "finance", action: "read", description: "View fee structures, invoices, and ledgers" },
  { module: "finance", action: "manage", description: "Configure fee tariffs and discount policies" },
  { module: "payments", action: "record", description: "Collect payments and issue receipts" },
  { module: "fees", action: "manage", description: "Generate term invoices and waivers" },

  // Reports & Analytics
  { module: "reports", action: "read", description: "View analytics dashboards" },
  { module: "reports", action: "generate", description: "Export student, academic, and financial reports" },

  // Settings & System Administration
  { module: "settings", action: "read", description: "View school settings and configurations" },
  { module: "settings", action: "manage", description: "Configure school branding and calendar" },
];

export const SYSTEM_ROLES_CONFIG = [
  {
    name: "Super Administrator",
    description: "Full institutional access across all campuses, settings, and modules",
    roleType: RoleType.SUPER_ADMIN,
    permissions: SYSTEM_PERMISSIONS.map((p) => `${p.module}.${p.action}`),
  },
  {
    name: "School Administrator",
    description: "Operational management of campuses, faculty, students, and settings",
    roleType: RoleType.CAMPUS_ADMIN,
    permissions: [
      "dashboard.view", "organizations.read", "campuses.read", "campuses.update",
      "users.read", "users.create", "users.update", "roles.read",
      "students.read", "students.create", "students.update",
      "admissions.read", "admissions.create", "admissions.update", "admissions.approve",
      "academics.read", "academics.manage", "attendance.read", "attendance.manage",
      "exams.read", "exams.manage", "results.publish",
      "finance.read", "reports.read", "reports.generate", "settings.read", "settings.manage",
    ],
  },
  {
    name: "Principal",
    description: "Academic leadership, staff performance, student welfare, and exam publication",
    roleType: RoleType.PRINCIPAL,
    permissions: [
      "dashboard.view", "campuses.read", "users.read",
      "students.read", "students.create", "students.update",
      "admissions.read", "admissions.approve",
      "academics.read", "academics.manage",
      "attendance.read", "attendance.manage",
      "exams.read", "exams.manage", "results.publish",
      "reports.read", "reports.generate", "settings.read",
    ],
  },
  {
    name: "Vice Principal",
    description: "Assists Principal in academic administration and student discipline",
    roleType: RoleType.CAMPUS_ADMIN,
    permissions: [
      "dashboard.view", "campuses.read", "students.read", "students.update",
      "admissions.read", "academics.read", "academics.manage",
      "attendance.read", "attendance.manage", "exams.read", "exams.manage",
      "reports.read",
    ],
  },
  {
    name: "Academic Teacher",
    description: "Access to classroom attendance, assignments, and exam grading",
    roleType: RoleType.TEACHER,
    permissions: [
      "dashboard.view", "students.read", "academics.read",
      "attendance.read", "attendance.manage",
      "exams.read", "exams.manage", "reports.read",
    ],
  },
  {
    name: "Form / Class Teacher",
    description: "Primary classroom supervisor managing attendance and report cards",
    roleType: RoleType.TEACHER,
    permissions: [
      "dashboard.view", "students.read", "students.update",
      "academics.read", "attendance.read", "attendance.manage",
      "exams.read", "exams.manage", "reports.read",
    ],
  },
  {
    name: "Accountant",
    description: "Fee structure management, invoice generation, and payment collection",
    roleType: RoleType.ACCOUNTANT,
    permissions: [
      "dashboard.view", "students.read",
      "finance.read", "finance.manage", "payments.record", "fees.manage",
      "reports.read", "reports.generate",
    ],
  },
  {
    name: "Librarian",
    description: "Library catalog, book circulation, and member registry",
    roleType: RoleType.LIBRARIAN,
    permissions: ["dashboard.view", "students.read", "reports.read"],
  },
  {
    name: "HR Officer",
    description: "Staff records, recruitment, attendance, and leave management",
    roleType: RoleType.STAFF,
    permissions: ["dashboard.view", "users.read", "attendance.read", "reports.read"],
  },
  {
    name: "Transport Officer",
    description: "Bus fleet management, route planning, and transport pickup allocations",
    roleType: RoleType.STAFF,
    permissions: ["dashboard.view", "students.read", "reports.read"],
  },
  {
    name: "Hostel Officer",
    description: "Dormitory allocations, room maintenance, and boarding student welfare",
    roleType: RoleType.STAFF,
    permissions: ["dashboard.view", "students.read", "attendance.read"],
  },
  {
    name: "Receptionist",
    description: "Front desk inquiries, visitor logs, and admissions information",
    roleType: RoleType.STAFF,
    permissions: ["dashboard.view", "students.read", "admissions.read", "admissions.create"],
  },
  {
    name: "Parent",
    description: "Guardian portal for viewing student attendance, reports, and invoices",
    roleType: RoleType.PARENT,
    permissions: ["dashboard.view", "students.read", "attendance.read", "reports.read", "finance.read"],
  },
  {
    name: "Student",
    description: "Student portal for viewing personal timetable, attendance, and exam grades",
    roleType: RoleType.STUDENT,
    permissions: ["dashboard.view", "academics.read", "attendance.read", "exams.read"],
  },
];

export async function runSeed(client: PrismaClient = prisma) {
  console.log("🌱 [Seed] Initiating Phase 2 & 3 RBAC, Permissions, and Core Domain Seeding...");

  // 1. Create Demo Organization
  const org = await client.organization.upsert({
    where: { slug: "apex-international" },
    update: {},
    create: {
      name: "Apex International Academy (Demo)",
      slug: "apex-international",
      code: "APEX",
      email: "contact@apex-demo.internal",
      phone: "+1-555-019-2834",
      address: "100 Academic Way, Education City",
      website: "https://apex-demo.internal",
      status: "ACTIVE",
      settings: {
        currency: "USD",
        timezone: "America/New_York",
        academicSystem: "Term",
      },
    },
  });
  console.log(`✓ Organization initialized: ${org.name} (${org.id})`);

  // 2. Create Demo Campuses
  const campusMain = await client.campus.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "CAMP-01" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Apex Main Campus (City Center)",
      code: "CAMP-01",
      city: "Metro City",
      state: "Central",
      country: "United States",
      phone: "+1-555-019-2801",
      email: "main@apex-demo.internal",
      status: "ACTIVE",
    },
  });

  const campusWest = await client.campus.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "CAMP-02" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Apex West Campus (Science Wing)",
      code: "CAMP-02",
      city: "Westfield",
      state: "Central",
      country: "United States",
      phone: "+1-555-019-2802",
      email: "west@apex-demo.internal",
      status: "ACTIVE",
    },
  });
  console.log(`✓ Campuses initialized: ${campusMain.code}, ${campusWest.code}`);

  // 3. Seed Standard System Permissions (Idempotent upsert)
  const permissionMap = new Map<string, string>(); // "module.action" -> permissionId
  for (const perm of SYSTEM_PERMISSIONS) {
    const record = await client.permission.upsert({
      where: { module_action: { module: perm.module, action: perm.action } },
      update: { description: perm.description },
      create: perm,
    });
    permissionMap.set(`${perm.module}.${perm.action}`, record.id);
  }
  console.log(`✓ Seeded ${permissionMap.size} system permissions`);

  // 4. Seed 14 System Roles & Role-Permission Join Tables
  for (const roleConf of SYSTEM_ROLES_CONFIG) {
    const roleRecord = await client.role.upsert({
      where: { organizationId_name: { organizationId: org.id, name: roleConf.name } },
      update: { description: roleConf.description, roleType: roleConf.roleType },
      create: {
        organizationId: org.id,
        name: roleConf.name,
        description: roleConf.description,
        roleType: roleConf.roleType,
        isSystem: true,
      },
    });

    for (const permKey of roleConf.permissions) {
      const permId = permissionMap.get(permKey);
      if (permId) {
        await client.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: roleRecord.id, permissionId: permId } },
          update: {},
          create: { roleId: roleRecord.id, permissionId: permId },
        });
      }
    }
  }
  console.log(`✓ Seeded ${SYSTEM_ROLES_CONFIG.length} system roles with permission mappings`);

  // 5. Seed Core Academic Year & Terms
  const academicYear = await client.academicYear.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "AY-2025-26" } },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campusMain.id,
      name: "2025/2026 Academic Session",
      code: "AY-2025-26",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-06-30"),
      isCurrent: true,
      status: AcademicYearStatus.ACTIVE,
    },
  });

  const term1 = await client.term.upsert({
    where: { academicYearId_termNumber: { academicYearId: academicYear.id, termNumber: 1 } },
    update: {},
    create: {
      academicYearId: academicYear.id,
      name: "First Term",
      termNumber: 1,
      startDate: new Date("2025-09-01"),
      endDate: new Date("2025-12-18"),
      isCurrent: true,
      status: TermStatus.ACTIVE,
    },
  });

  await client.term.upsert({
    where: { academicYearId_termNumber: { academicYearId: academicYear.id, termNumber: 2 } },
    update: {},
    create: {
      academicYearId: academicYear.id,
      name: "Second Term",
      termNumber: 2,
      startDate: new Date("2026-01-08"),
      endDate: new Date("2026-04-03"),
      isCurrent: false,
      status: TermStatus.UPCOMING,
    },
  });
  console.log(`✓ Academic calendar seeded: ${academicYear.name}`);

  // 6. Seed Class Levels, Classes, and Sections
  const classLevelG10 = await client.classLevel.upsert({
    where: { campusId_code: { campusId: campusMain.id, code: "G10" } },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campusMain.id,
      name: "Grade 10",
      code: "G10",
      sequenceOrder: 10,
      description: "Senior Secondary Year 1",
    },
  });

  const classG10 = await client.class.upsert({
    where: { campusId_academicYearId_code: { campusId: campusMain.id, academicYearId: academicYear.id, code: "G10-2526" } },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campusMain.id,
      classLevelId: classLevelG10.id,
      academicYearId: academicYear.id,
      name: "Grade 10 (2025/2026)",
      code: "G10-2526",
      capacity: 35,
    },
  });

  const sectionA = await client.section.upsert({
    where: { classId_code: { classId: classG10.id, code: "SEC-A" } },
    update: {},
    create: {
      classId: classG10.id,
      name: "Section A (Main Wing)",
      code: "SEC-A",
      roomNumber: "Room 101",
      capacity: 30,
    },
  });
  console.log(`✓ Class structure seeded: ${classG10.name} / ${sectionA.name}`);

  // 7. Seed Sample Subjects
  const subjectsData = [
    { name: "Mathematics", code: "MATH-10", isElective: false },
    { name: "English Language", code: "ENG-10", isElective: false },
    { name: "Physics", code: "PHY-10", isElective: true },
    { name: "Chemistry", code: "CHEM-10", isElective: true },
    { name: "World History", code: "HIST-10", isElective: true },
  ];

  for (const s of subjectsData) {
    await client.subject.upsert({
      where: { campusId_code: { campusId: campusMain.id, code: s.code } },
      update: {},
      create: {
        organizationId: org.id,
        campusId: campusMain.id,
        name: s.name,
        code: s.code,
        creditUnits: 3,
        isElective: s.isElective,
      },
    });
  }
  console.log(`✓ Seeded ${subjectsData.length} core subjects`);

  // 8. Seed Demo Users & Assign Roles
  // Password hash for "Password123!"
  const DEMO_PW_HASH = "$2b$12$DqYJ5Pj.c434FjR9u4bLReJ3iO95b1H.m85q6uYQ39Bf98f4YJ41S";

  const adminRole = await client.role.findFirst({ where: { organizationId: org.id, name: "Super Administrator" } });
  const principalRole = await client.role.findFirst({ where: { organizationId: org.id, name: "Principal" } });
  const teacherRole = await client.role.findFirst({ where: { organizationId: org.id, name: "Academic Teacher" } });
  const accountantRole = await client.role.findFirst({ where: { organizationId: org.id, name: "Accountant" } });

  // User 1: Super Admin
  const adminUser = await client.user.upsert({
    where: { email: "admin@apex-demo.internal" },
    update: { passwordHash: DEMO_PW_HASH, status: "ACTIVE" },
    create: {
      organizationId: org.id,
      email: "admin@apex-demo.internal",
      firstName: "Eleanor",
      lastName: "Vance",
      status: "ACTIVE",
      passwordHash: DEMO_PW_HASH,
    },
  });

  await client.organizationMembership.upsert({
    where: { userId_organizationId: { userId: adminUser.id, organizationId: org.id } },
    update: {},
    create: { userId: adminUser.id, organizationId: org.id, isDefault: true, isActive: true },
  });

  if (adminRole) {
    const existingAdminRole = await client.userRole.findFirst({
      where: { userId: adminUser.id, roleId: adminRole.id, organizationId: org.id },
    });
    if (!existingAdminRole) {
      await client.userRole.create({
        data: { userId: adminUser.id, roleId: adminRole.id, organizationId: org.id, campusId: null },
      });
    }
  }

  // User 2: Principal
  const principalUser = await client.user.upsert({
    where: { email: "principal@apex-demo.internal" },
    update: { passwordHash: DEMO_PW_HASH, status: "ACTIVE" },
    create: {
      organizationId: org.id,
      email: "principal@apex-demo.internal",
      firstName: "Arthur",
      lastName: "Pendleton",
      status: "ACTIVE",
      passwordHash: DEMO_PW_HASH,
    },
  });

  await client.campusMembership.upsert({
    where: { userId_campusId: { userId: principalUser.id, campusId: campusMain.id } },
    update: {},
    create: { userId: principalUser.id, campusId: campusMain.id, isDefault: true, isActive: true },
  });

  if (principalRole) {
    await client.userRole.upsert({
      where: { userId_roleId_organizationId_campusId: { userId: principalUser.id, roleId: principalRole.id, organizationId: org.id, campusId: campusMain.id } },
      update: {},
      create: { userId: principalUser.id, roleId: principalRole.id, organizationId: org.id, campusId: campusMain.id },
    });
  }

  // User 3: Academic Teacher
  const teacherUser = await client.user.upsert({
    where: { email: "teacher.math@apex-demo.internal" },
    update: { passwordHash: DEMO_PW_HASH, status: "ACTIVE" },
    create: {
      organizationId: org.id,
      email: "teacher.math@apex-demo.internal",
      firstName: "Marcus",
      lastName: "Holloway",
      status: "ACTIVE",
      passwordHash: DEMO_PW_HASH,
    },
  });

  await client.campusMembership.upsert({
    where: { userId_campusId: { userId: teacherUser.id, campusId: campusMain.id } },
    update: {},
    create: { userId: teacherUser.id, campusId: campusMain.id, isDefault: true, isActive: true },
  });

  if (teacherRole) {
    await client.userRole.upsert({
      where: { userId_roleId_organizationId_campusId: { userId: teacherUser.id, roleId: teacherRole.id, organizationId: org.id, campusId: campusMain.id } },
      update: {},
      create: { userId: teacherUser.id, roleId: teacherRole.id, organizationId: org.id, campusId: campusMain.id },
    });
  }

  // User 4: Accountant
  const accountantUser = await client.user.upsert({
    where: { email: "accountant@apex-demo.internal" },
    update: { passwordHash: DEMO_PW_HASH, status: "ACTIVE" },
    create: {
      organizationId: org.id,
      email: "accountant@apex-demo.internal",
      firstName: "Clara",
      lastName: "Oswald",
      status: "ACTIVE",
      passwordHash: DEMO_PW_HASH,
    },
  });

  if (accountantRole) {
    await client.userRole.upsert({
      where: { userId_roleId_organizationId_campusId: { userId: accountantUser.id, roleId: accountantRole.id, organizationId: org.id, campusId: campusMain.id } },
      update: {},
      create: { userId: accountantUser.id, roleId: accountantRole.id, organizationId: org.id, campusId: campusMain.id },
    });
  }

  // 9. Seed Departments & Staff
  const deptScience = await client.department.upsert({
    where: { campusId_code: { campusId: campusMain.id, code: "SCI-DEPT" } },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campusMain.id,
      name: "Department of Mathematics & Sciences",
      code: "SCI-DEPT",
    },
  });

  const posSeniorTeacher = await client.position.upsert({
    where: { campusId_code: { campusId: campusMain.id, code: "SNR-MATH" } },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campusMain.id,
      departmentId: deptScience.id,
      title: "Senior Mathematics Lecturer",
      code: "SNR-MATH",
    },
  });

  await client.staff.upsert({
    where: { organizationId_employeeNumber: { organizationId: org.id, employeeNumber: "EMP-2025-01" } },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campusMain.id,
      employeeNumber: "EMP-2025-01",
      userId: teacherUser.id,
      departmentId: deptScience.id,
      positionId: posSeniorTeacher.id,
      firstName: "Marcus",
      lastName: "Holloway",
      gender: Gender.MALE,
      employmentStatus: StaffStatus.ACTIVE,
      employmentType: EmploymentType.FULL_TIME,
      dateJoined: new Date("2024-08-15"),
      email: "teacher.math@apex-demo.internal",
    },
  });

  // 10. Seed Demo Student, Guardian, and Enrollment
  const studentAlex = await client.student.upsert({
    where: { organizationId_admissionNumber: { organizationId: org.id, admissionNumber: "STU-2025-001" } },
    update: {},
    create: {
      organizationId: org.id,
      campusId: campusMain.id,
      admissionNumber: "STU-2025-001",
      firstName: "Alex",
      middleName: "James",
      lastName: "Mercer",
      dateOfBirth: new Date("2010-05-14"),
      gender: Gender.MALE,
      admissionDate: new Date("2025-08-20"),
      status: StudentStatus.ACTIVE,
      nationality: "United States",
      bloodGroup: "O+",
    },
  });

  const guardianJane = await client.guardian.create({
    data: {
      organizationId: org.id,
      firstName: "Jane",
      lastName: "Mercer",
      phone: "+1-555-019-3344",
      email: "jane.mercer@demo.internal",
      occupation: "Research Biologist",
    },
  });

  await client.studentGuardian.upsert({
    where: { studentId_guardianId: { studentId: studentAlex.id, guardianId: guardianJane.id } },
    update: {},
    create: {
      studentId: studentAlex.id,
      guardianId: guardianJane.id,
      relationship: GuardianRelationship.MOTHER,
      isPrimary: true,
      isEmergencyContact: true,
    },
  });

  await client.studentEnrollment.upsert({
    where: {
      studentId_academicYearId_classId: {
        studentId: studentAlex.id,
        academicYearId: academicYear.id,
        classId: classG10.id,
      },
    },
    update: {},
    create: {
      studentId: studentAlex.id,
      organizationId: org.id,
      campusId: campusMain.id,
      academicYearId: academicYear.id,
      termId: term1.id,
      classId: classG10.id,
      sectionId: sectionA.id,
      rollNumber: "10-A-01",
      status: EnrollmentStatus.ENROLLED,
    },
  });

  console.log(`✓ Student & Guardian seeded: ${studentAlex.firstName} ${studentAlex.lastName} (STU-2025-001)`);
  console.log("✅ [Seed] Phase 2 & 3 RBAC, Roles, and Development Data seeded successfully.");
}

// Standalone execution check
if (typeof process !== "undefined" && process?.argv?.[1]?.includes("seed.ts")) {
  runSeed()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error("❌ [Seed Error]:", e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
