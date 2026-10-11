import { describe, it, expect, beforeEach } from "vitest";
import { adminService, DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "@/services/admin.service";
import { TenantContext } from "@/repositories/types";
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors";

describe("Phase 4: Administration & School Configuration Architecture", () => {
  const adminCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-super-admin-01",
    userRoles: ["Super Administrator"],
  };

  const otherOrgCtx: TenantContext = {
    organizationId: "org-other-institution-99",
    campusId: "camp-other-99",
    userId: "u-other-admin-99",
    userRoles: ["Principal"],
  };

  // ---------------------------------------------------------------------------
  // 1. Dashboard Metrics & Operational Health
  // ---------------------------------------------------------------------------
  describe("Dashboard Metrics", () => {
    it("returns database-backed statistics for the tenant organization", async () => {
      const stats = await adminService.getDashboardStats(adminCtx);

      expect(stats).toBeDefined();
      expect(stats.organizationName).toBe("Apex International Academy");
      expect(stats.organizationCode).toBe("APEX");
      expect(stats.campusesCount).toBeGreaterThanOrEqual(2);
      expect(stats.classLevelsCount).toBeGreaterThanOrEqual(1);
      expect(stats.classesCount).toBeGreaterThanOrEqual(1);
      expect(stats.subjectsCount).toBeGreaterThanOrEqual(1);
      expect(stats.departmentsCount).toBeGreaterThanOrEqual(1);
      expect(stats.staffCount).toBeGreaterThanOrEqual(1);
      expect(stats.usersCount).toBeGreaterThanOrEqual(1);
    });

    it("isolates statistics per tenant organization", async () => {
      const otherStats = await adminService.getDashboardStats(otherOrgCtx);
      expect(otherStats.campusesCount).toBe(0);
      expect(otherStats.classLevelsCount).toBe(0);
      expect(otherStats.subjectsCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Organization Management
  // ---------------------------------------------------------------------------
  describe("Organization Management", () => {
    it("retrieves organization details for authenticated tenant", async () => {
      const org = await adminService.getOrganization(adminCtx);
      expect(org.id).toBe(DEMO_ORG_ID);
      expect(org.name).toBe("Apex International Academy");
      expect(org.code).toBe("APEX");
      expect(org.status).toBe("ACTIVE");
    });

    it("updates organization profile with valid parameters", async () => {
      const updated = await adminService.updateOrganization(adminCtx, {
        name: "Apex International High Academy",
        code: "APEX",
        phone: "+1 (555) 999-0000",
        address: "500 University Ave, Metro City",
      });

      expect(updated.name).toBe("Apex International High Academy");
      expect(updated.phone).toBe("+1 (555) 999-0000");

      // Verify persistence
      const fresh = await adminService.getOrganization(adminCtx);
      expect(fresh.name).toBe("Apex International High Academy");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Multi-Campus Infrastructure
  // ---------------------------------------------------------------------------
  describe("Campus Management", () => {
    it("lists campuses belonging strictly to the tenant organization", async () => {
      const campuses = await adminService.getCampuses(adminCtx);
      expect(campuses.length).toBeGreaterThanOrEqual(2);
      campuses.forEach((c) => {
        expect(c.organizationId).toBe(adminCtx.organizationId);
      });
    });

    it("creates a new campus with unique code", async () => {
      const uniqueCode = `EST-${Date.now().toString().slice(-4)}`;
      const newCampus = await adminService.createCampus(adminCtx, {
        name: "Apex East Campus",
        code: uniqueCode,
        address: "123 Sunrise Blvd",
        city: "Metro City",
        state: "NY",
        country: "USA",
        postalCode: "10002",
        status: "ACTIVE",
      });

      expect(newCampus.id).toBeDefined();
      expect(newCampus.code).toBe(uniqueCode);
      expect(newCampus.organizationId).toBe(adminCtx.organizationId);
    });

    it("rejects duplicate campus codes within the same organization", async () => {
      await expect(
        adminService.createCampus(adminCtx, {
          name: "Duplicate Main Campus",
          code: "CAMP-01", // Already exists in demo seed
          status: "ACTIVE",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("supports activating and deactivating campus branches without destroying history", async () => {
      const campuses = await adminService.getCampuses(adminCtx);
      const target = campuses[0];
      const originalStatus = target.status;

      const toggled = await adminService.toggleCampusStatus(adminCtx, target.id);
      expect(toggled.status).not.toBe(originalStatus);

      // Revert back
      const reverted = await adminService.toggleCampusStatus(adminCtx, target.id);
      expect(reverted.status).toBe(originalStatus);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Academic Years & Current Academic Year
  // ---------------------------------------------------------------------------
  describe("Academic Year & Active Session Management", () => {
    it("lists academic years and nested terms", async () => {
      const years = await adminService.getAcademicYears(adminCtx);
      expect(years.length).toBeGreaterThanOrEqual(1);
      const currentYear = years.find((y) => y.isCurrent);
      expect(currentYear).toBeDefined();
      expect(currentYear?.terms).toBeDefined();
    });

    it("creates an academic year with chronological start and end dates", async () => {
      const uniqueCode = `AY-${Date.now().toString().slice(-4)}`;
      const newAY = await adminService.createAcademicYear(adminCtx, {
        name: "2027/2028 Academic Session",
        code: uniqueCode,
        startDate: "2027-09-01",
        endDate: "2028-06-30",
        isCurrent: false,
        status: "UPCOMING",
      });

      expect(newAY.id).toBeDefined();
      expect(newAY.name).toBe("2027/2028 Academic Session");
    });

    it("enforces single current academic year constraint", async () => {
      const years = await adminService.getAcademicYears(adminCtx);
      const target = years[0];

      await adminService.setCurrentAcademicYear(adminCtx, target.id);

      const updatedYears = await adminService.getAcademicYears(adminCtx);
      const currentYears = updatedYears.filter((y) => y.isCurrent);
      expect(currentYears.length).toBe(1);
      expect(currentYears[0].id).toBe(target.id);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Term Management
  // ---------------------------------------------------------------------------
  describe("Term Management", () => {
    it("creates configurable terms bound to an academic session", async () => {
      const years = await adminService.getAcademicYears(adminCtx);
      const targetYear = years[0];

      const newTerm = await adminService.createTerm(adminCtx, {
        academicYearId: targetYear.id,
        name: "Mid-Year Intensive Term",
        termNumber: 4,
        startDate: "2026-04-01",
        endDate: "2026-05-30",
        isCurrent: false,
        status: "UPCOMING",
      });

      expect(newTerm.id).toBeDefined();
      expect(newTerm.academicYearId).toBe(targetYear.id);
      expect(newTerm.termNumber).toBe(4);
    });

    it("enforces unique term numbers within the same academic year", async () => {
      const years = await adminService.getAcademicYears(adminCtx);
      const targetYear = years[0];

      await expect(
        adminService.createTerm(adminCtx, {
          academicYearId: targetYear.id,
          name: "Duplicate Term 1",
          termNumber: 1, // Already exists
          startDate: "2026-09-01",
          endDate: "2026-12-15",
          isCurrent: false,
          status: "UPCOMING",
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Class Levels, Classes & Sections Hierarchy
  // ---------------------------------------------------------------------------
  describe("Class Levels, Classes & Sections", () => {
    it("creates and sequences class progression tiers", async () => {
      const uniqueCode = `LVL-${Date.now().toString().slice(-4)}`;
      const level = await adminService.createClassLevel(adminCtx, {
        name: "Grade 11 Senior Tier",
        code: uniqueCode,
        sequenceOrder: 11,
        description: "Pre-college penultimate secondary cohort",
      });

      expect(level.id).toBeDefined();
      expect(level.sequenceOrder).toBe(11);
    });

    it("creates a class linked to a class level", async () => {
      const levels = await adminService.getClassLevels(adminCtx);
      const targetLevel = levels[0];
      const years = await adminService.getAcademicYears(adminCtx);

      const uniqueCode = `CLS-${Date.now().toString().slice(-4)}`;
      const newClass = await adminService.createClass(adminCtx, {
        classLevelId: targetLevel.id,
        academicYearId: years[0].id,
        name: "Grade 10 Honors",
        code: uniqueCode,
        capacity: 32,
      });

      expect(newClass.id).toBeDefined();
      expect(newClass.capacity).toBe(32);
      expect(newClass.classLevelId).toBe(targetLevel.id);
    });

    it("creates section arms linked to a class", async () => {
      const classes = await adminService.getClasses(adminCtx);
      const targetClass = classes[0];

      const uniqueCode = `SEC-${Date.now().toString().slice(-3)}`;
      const section = await adminService.createSection(adminCtx, {
        classId: targetClass.id,
        name: "Ruby Section",
        code: uniqueCode,
        roomNumber: "Hall B-101",
        capacity: 30,
      });

      expect(section.id).toBeDefined();
      expect(section.classId).toBe(targetClass.id);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Curriculum Subjects Catalog
  // ---------------------------------------------------------------------------
  describe("Subjects & Curriculum Catalog", () => {
    it("registers course offerings with credit weights and elective categorization", async () => {
      const uniqueCode = `CRS-${Date.now().toString().slice(-4)}`;
      const subject = await adminService.createSubject(adminCtx, {
        name: "Advanced Robotics & Automation",
        code: uniqueCode,
        description: "Applied STEM computational engineering",
        creditUnits: 4,
        isElective: true,
        isActive: true,
      });

      expect(subject.id).toBeDefined();
      expect(subject.creditUnits).toBe(4);
      expect(subject.isElective).toBe(true);
      expect(subject.isActive).toBe(true);
    });

    it("toggles subject active status", async () => {
      const subjects = await adminService.getSubjects(adminCtx);
      const target = subjects[0];
      const prevActive = target.isActive;

      const toggled = await adminService.toggleSubjectStatus(adminCtx, target.id);
      expect(toggled.isActive).toBe(!prevActive);

      // Revert
      await adminService.toggleSubjectStatus(adminCtx, target.id);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Departments & Staff Positions
  // ---------------------------------------------------------------------------
  describe("Departments & Positions", () => {
    it("creates an institutional department", async () => {
      const uniqueCode = `DPT-${Date.now().toString().slice(-3)}`;
      const dept = await adminService.createDepartment(adminCtx, {
        name: "Humanities & Social Inquiry",
        code: uniqueCode,
        description: "Department of History, Literature and Civic Sciences",
      });

      expect(dept.id).toBeDefined();
      expect(dept.code).toBe(uniqueCode);
    });

    it("creates a staff position linked to a department", async () => {
      const depts = await adminService.getDepartments(adminCtx);
      const targetDept = depts[0];

      const uniqueCode = `POS-${Date.now().toString().slice(-3)}`;
      const pos = await adminService.createPosition(adminCtx, {
        departmentId: targetDept.id,
        title: "Senior Laboratory Instructor",
        code: uniqueCode,
        description: "Maintains laboratory safety and runs science practicals",
      });

      expect(pos.id).toBeDefined();
      expect(pos.departmentId).toBe(targetDept.id);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Staff Directory Foundation
  // ---------------------------------------------------------------------------
  describe("Staff Directory Foundation", () => {
    it("queries staff members with multi-campus and department filtration", async () => {
      const directory = await adminService.getStaffDirectory(adminCtx, {
        limit: 10,
        page: 1,
      });

      expect(directory.items).toBeDefined();
      expect(directory.meta.total).toBeGreaterThanOrEqual(1);

      const staff = directory.items[0];
      expect(staff.firstName).toBeDefined();
      expect(staff.lastName).toBeDefined();
      expect(staff.employeeNumber).toBeDefined();
      expect(staff.department).toBeDefined();
      expect(staff.position).toBeDefined();
    });

    it("retrieves individual staff profile", async () => {
      const directory = await adminService.getStaffDirectory(adminCtx);
      const firstStaff = directory.items[0];

      const profile = await adminService.getStaffProfile(adminCtx, firstStaff.id);
      expect(profile.id).toBe(firstStaff.id);
      expect(profile.email).toBe(firstStaff.email);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. User Account Governance & RBAC Assignment
  // ---------------------------------------------------------------------------
  describe("User Accounts & Governance", () => {
    it("updates user status and prevents self-deactivation", async () => {
      const users = await adminService.getUsers(adminCtx);
      const otherUser = users.find((u) => u.id !== adminCtx.userId);
      expect(otherUser).toBeDefined();

      if (otherUser) {
        const updated = await adminService.updateUserStatus(adminCtx, otherUser.id, "INACTIVE");
        expect(updated.status).toBe("INACTIVE");

        // Reactivate
        await adminService.updateUserStatus(adminCtx, otherUser.id, "ACTIVE");
      }

      // Self-deactivation protection
      await expect(
        adminService.updateUserStatus(adminCtx, adminCtx.userId!, "INACTIVE")
      ).rejects.toThrow(ForbiddenError);
    });

    it("updates assigned roles for institutional accounts", async () => {
      const users = await adminService.getUsers(adminCtx);
      const targetUser = users.find((u) => u.id !== adminCtx.userId)!;

      const updated = await adminService.updateUserRoles(adminCtx, targetUser.id, [
        "Teacher",
        "Attendance Officer",
      ]);
      expect(updated.roles).toContain("Teacher");
      expect(updated.roles).toContain("Attendance Officer");
    });

    it("assigns campus boundary memberships with tenant scope validation", async () => {
      const users = await adminService.getUsers(adminCtx);
      const targetUser = users[0];
      const campuses = await adminService.getCampuses(adminCtx);

      const updated = await adminService.updateUserCampuses(adminCtx, targetUser.id, [
        campuses[0].id,
      ]);
      expect(updated.campusIds).toContain(campuses[0].id);

      // Rejects campus belonging to another tenant
      await expect(
        adminService.updateUserCampuses(adminCtx, targetUser.id, ["camp-unauthorized-external-99"])
      ).rejects.toThrow(ValidationError);
    });

    it("protects immutable Super Administrator role from privilege degradation", async () => {
      const roles = await adminService.getRoles(adminCtx);
      const superAdminRole = roles.find((r) => r.name === "Super Administrator");
      expect(superAdminRole).toBeDefined();

      if (superAdminRole) {
        await expect(
          adminService.updateRolePermissions(adminCtx, superAdminRole.id, ["users.read"])
        ).rejects.toThrow(ForbiddenError);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 11. School Configuration Settings
  // ---------------------------------------------------------------------------
  describe("School Configuration Settings", () => {
    it("reads and modifies institutional parameters", async () => {
      const original = await adminService.getSettings(adminCtx);
      expect(original.schoolName).toBeDefined();

      const updated = await adminService.updateSettings(adminCtx, {
        schoolName: "Apex Global Preparatory Academy",
        timezone: "America/Chicago",
        locale: "en-US",
        currency: "USD",
        dateFormat: "YYYY-MM-DD",
        branding: {
          primaryColor: "#3b82f6",
          accentColor: "#10b981",
          themeMode: "light",
        },
      });

      expect(updated.schoolName).toBe("Apex Global Preparatory Academy");
      expect(updated.timezone).toBe("America/Chicago");
      expect((updated.branding as any)?.primaryColor).toBe("#3b82f6");
    });
  });
});
