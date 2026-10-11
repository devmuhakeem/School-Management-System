import { describe, it, expect, beforeEach } from "vitest";
import { portalService } from "@/services/portal.service";
import { TenantContext } from "@/repositories/types";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

describe("Phase 10: Parent & Student Portals / Self-Service", () => {
  // Context for authenticated parent (Dr. Sarah Wright, grd-001)
  const parentCtx: TenantContext = {
    organizationId: "org-apex-demo-01",
    campusId: "camp-apex-main-01",
    userId: "u-parent-01",
    userRoles: ["Parent"],
  };

  // Context for authenticated student (Lucas Alexander Wright, stu-001)
  const studentCtx: TenantContext = {
    organizationId: "org-apex-demo-01",
    campusId: "camp-apex-main-01",
    userId: "u-student-01",
    userRoles: ["Student"],
  };

  // Context for unrelated guardian in same tenant
  const unrelatedGuardianCtx: TenantContext = {
    organizationId: "org-apex-demo-01",
    campusId: "camp-apex-main-01",
    userId: "u-random-guardian",
    userRoles: ["Parent"],
  };

  // Context for completely isolated external tenant
  const externalTenantCtx: TenantContext = {
    organizationId: "org-isolated-competitor",
    campusId: "camp-competitor-01",
    userId: "u-competitor-parent",
    userRoles: ["Parent"],
  };

  // Context for school administrator
  const adminCtx: TenantContext = {
    organizationId: "org-apex-demo-01",
    campusId: "camp-apex-main-01",
    userId: "u-admin-01",
    userRoles: ["School Administrator"],
  };

  beforeEach(() => {
    portalService.resetState();
  });

  // ===========================================================================
  // 1. STRICT CHILD ACCESS CONTROL & AUTHORIZATION (REQUIREMENT #6)
  // ===========================================================================
  describe("Strict Child Access Control & Identity Resolution", () => {
    it("resolves the guardian profile belonging to the authenticated parent session", async () => {
      const guardian = await portalService.resolveGuardian(parentCtx);
      expect(guardian).toBeDefined();
      expect(guardian.id).toBe("grd-001");
      expect(guardian.firstName).toBe("Sarah");
      expect(guardian.lastName).toBe("Wright");
      expect(guardian.organizationId).toBe("org-apex-demo-01");
    });

    it("authorizes access when StudentGuardian relationship links guardian to student", async () => {
      // Lucas Wright (stu-001) is linked to Dr. Sarah Wright (grd-001)
      const access = await portalService.requireGuardianStudentAccess(parentCtx, "stu-001");
      expect(access).toBeDefined();
      expect(access.guardian.id).toBe("grd-001");
      expect(access.student.id).toBe("stu-001");
      expect(access.relationship).toBe("MOTHER");
    });

    it("authorizes second linked child for multi-child guardian (stu-005)", async () => {
      // Devin Wright (stu-005) is also linked to Dr. Sarah Wright (grd-001)
      const access = await portalService.requireGuardianStudentAccess(parentCtx, "stu-005");
      expect(access).toBeDefined();
      expect(access.student.id).toBe("stu-005");
    });

    it("strictly blocks (IDOR) access when guardian attempts to access unrelated student", async () => {
      // Marcus Vance (stu-003) is linked to grd-002, NOT to Dr. Sarah Wright (grd-001)
      await expect(
        portalService.requireGuardianStudentAccess(parentCtx, "stu-003")
      ).rejects.toThrow(ForbiddenError);
    });

    it("blocks access when user without guardian profile attempts child access", async () => {
      await expect(
        portalService.requireGuardianStudentAccess(unrelatedGuardianCtx, "stu-001")
      ).rejects.toThrow(NotFoundError);
    });

    it("strictly blocks cross-tenant access to students in another organization", async () => {
      await expect(
        portalService.requireGuardianStudentAccess(externalTenantCtx, "stu-001")
      ).rejects.toThrow(NotFoundError);
    });

    it("rejects access attempts with invalid or empty student IDs", async () => {
      await expect(
        portalService.requireGuardianStudentAccess(parentCtx, "")
      ).rejects.toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // 2. PARENT DASHBOARD & MULTI-CHILD SWITCHER (REQUIREMENTS #5 & #7)
  // ===========================================================================
  describe("Parent Dashboard & Child Switcher", () => {
    it("retrieves parent dashboard overview with all linked children", async () => {
      const dashboard = await portalService.getParentDashboard(parentCtx);
      expect(dashboard).toBeDefined();
      expect(dashboard.guardian.fullName).toContain("Sarah");
      expect(dashboard.children.length).toBeGreaterThanOrEqual(1);

      // Verify each child has essential overview data
      const firstChild = dashboard.children.find((c) => c.id === "stu-001");
      expect(firstChild).toBeDefined();
      expect(firstChild?.fullName).toBe("Lucas Alexander Wright");
      expect(firstChild?.admissionNumber).toBe("STU-2025-00001");
      expect(firstChild?.className).toBeDefined();
      expect(firstChild?.campusName).toBeDefined();
      expect(["ENROLLED", "ACTIVE"]).toContain(firstChild?.enrollmentStatus);
      expect(firstChild?.relationship).toBe("MOTHER");

      // Verify academic term context
      expect(dashboard.academicYear).toBeDefined();
      expect(dashboard.term).toBeDefined();
    });

    it("lists all children linked to guardian via getGuardianChildren", async () => {
      const children = await portalService.getGuardianChildren(parentCtx);
      expect(Array.isArray(children)).toBe(true);
      expect(children.length).toBeGreaterThanOrEqual(1);
      const studentIds = children.map((c) => c.id);
      expect(studentIds).toContain("stu-001");
    });
  });

  // ===========================================================================
  // 3. PARENT STUDENT PROFILE (REQUIREMENT #8)
  // ===========================================================================
  describe("Parent Student Profile", () => {
    it("returns comprehensive student profile with guardian relationship", async () => {
      const profile = await portalService.getChildProfile(parentCtx, "stu-001");
      expect(profile).toBeDefined();
      expect(profile.student.id).toBe("stu-001");
      expect(profile.student.firstName).toBe("Lucas");
      expect(profile.student.admissionNumber).toBe("STU-2025-00001");
      expect(profile.student.className).toBeDefined();
      expect(profile.student.campusName).toBeDefined();
      expect(profile.relationship).toBe("MOTHER");
    });

    it("prohibits guardian from accessing profile of non-ward", async () => {
      await expect(
        portalService.getChildProfile(parentCtx, "stu-003")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ===========================================================================
  // 4. STUDENT ATTENDANCE PORTAL (REQUIREMENT #9)
  // ===========================================================================
  describe("Student Attendance Portal View", () => {
    it("returns attendance summary and records for authorized child", async () => {
      const attendance = await portalService.getChildAttendance(parentCtx, "stu-001");
      expect(attendance).toBeDefined();
      expect(attendance.studentId).toBe("stu-001");
      expect(attendance.summary).toBeDefined();
      expect(typeof attendance.summary.totalSessions).toBe("number");
      expect(typeof attendance.summary.attendancePercentage).toBe("number");
      expect(Array.isArray(attendance.records)).toBe(true);
    });

    it("supports date range filtering for attendance records", async () => {
      const attendance = await portalService.getChildAttendance(parentCtx, "stu-001", {
        startDate: "2026-09-01",
        endDate: "2026-09-30",
      });
      expect(attendance).toBeDefined();
      expect(attendance.records).toBeDefined();
    });

    it("blocks attendance lookup for non-ward", async () => {
      await expect(
        portalService.getChildAttendance(parentCtx, "stu-003")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ===========================================================================
  // 5. ACADEMIC RESULTS & REPORT CARDS (REQUIREMENTS #10 & #11)
  // ===========================================================================
  describe("Academic Results & Report Cards", () => {
    it("retrieves published exam results for authorized ward", async () => {
      const results = await portalService.getChildResults(parentCtx, "stu-001");
      expect(results).toBeDefined();
      expect(results.student?.id).toBe("stu-001");
      expect(Array.isArray(results.subjects)).toBe(true);
      expect(results.published).toBe(true);
      expect(["PUBLISHED", "APPROVED", "LOCKED"]).toContain(results.summary?.status);
    });

    it("retrieves official report card for authorized child", async () => {
      const reportCard = await portalService.getChildReportCard(parentCtx, "stu-001");
      expect(reportCard).toBeDefined();
      expect(reportCard.student).toBeDefined();
      expect(reportCard.subjects).toBeDefined();
      expect(reportCard.summary).toBeDefined();
      expect(reportCard.summary.status).toBe("PUBLISHED");
    });

    it("blocks results lookup for unauthorized student", async () => {
      await expect(
        portalService.getChildResults(parentCtx, "stu-003")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ===========================================================================
  // 6. STUDENT TIMETABLE (REQUIREMENT #12)
  // ===========================================================================
  describe("Student Timetable", () => {
    it("returns weekly timetable for child's assigned class", async () => {
      const timetable = await portalService.getChildTimetable(parentCtx, "stu-001");
      expect(timetable).toBeDefined();
      expect(timetable.studentId).toBe("stu-001");
      expect(timetable.schedule).toBeDefined();
      // Schedule contains days of the week
      expect(timetable.schedule.MONDAY).toBeDefined();
      expect(timetable.schedule.FRIDAY).toBeDefined();
    });

    it("denies access to timetable for non-ward", async () => {
      await expect(
        portalService.getChildTimetable(parentCtx, "stu-003")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ===========================================================================
  // 7. FINANCIAL LEDGER, INVOICES & RECEIPTS (REQUIREMENTS #13, #14, #16)
  // ===========================================================================
  describe("Parent Financial Portal (Invoices, Ledger, Receipts)", () => {
    it("retrieves fee ledger and balances for authorized child", async () => {
      const finance = await portalService.getChildFinance(parentCtx, "stu-001");
      expect(finance).toBeDefined();
      expect(finance.student.id).toBe("stu-001");
      expect(typeof finance.currentBalanceDue).toBe("number");
      expect(typeof finance.totalBilled).toBe("number");
      expect(typeof finance.totalPaid).toBe("number");
      expect(Array.isArray(finance.entries)).toBe(true);
    });

    it("retrieves itemized invoices strictly scoped to child", async () => {
      const result = await portalService.getChildInvoices(parentCtx, "stu-001");
      expect(Array.isArray(result.invoices)).toBe(true);
      result.invoices.forEach((inv) => {
        expect(inv.studentId).toBe("stu-001");
        expect(inv.items).toBeDefined();
      });
    });

    it("retrieves official payment receipts strictly scoped to child", async () => {
      const result = await portalService.getChildReceipts(parentCtx, "stu-001");
      expect(Array.isArray(result.receipts)).toBe(true);
      result.receipts.forEach((rec) => {
        expect(rec.studentId).toBe("stu-001");
        expect(rec.receiptNumber).toBeDefined();
        expect(rec.amountPaid).toBeGreaterThan(0);
      });
    });

    it("blocks access to financial records of another parent's child", async () => {
      await expect(
        portalService.getChildFinance(parentCtx, "stu-003")
      ).rejects.toThrow(ForbiddenError);
      await expect(
        portalService.getChildInvoices(parentCtx, "stu-003")
      ).rejects.toThrow(ForbiddenError);
      await expect(
        portalService.getChildReceipts(parentCtx, "stu-003")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ===========================================================================
  // 8. STUDENT SELF-SERVICE PORTAL (REQUIREMENTS #17 - #24)
  // ===========================================================================
  describe("Student Self-Service Portal", () => {
    it("resolves student identity from session context", async () => {
      const student = await portalService.resolveStudent(studentCtx);
      expect(student).toBeDefined();
      expect(student.id).toBe("stu-001");
      expect(student.firstName).toBe("Lucas");
    });

    it("retrieves authenticated student dashboard with schedule and attendance", async () => {
      const dash = await portalService.getStudentDashboard(studentCtx);
      expect(dash).toBeDefined();
      expect(dash.student.id).toBe("stu-001");
      expect(dash.student.admissionNumber).toBe("STU-2025-00001");
      expect(dash.attendanceSummary).toBeDefined();
      expect(Array.isArray(dash.todayLessons)).toBe(true);
      expect(dash.financeSummary).toBeDefined();
    });

    it("retrieves student personal profile", async () => {
      const profile = await portalService.getStudentProfile(studentCtx);
      expect(profile).toBeDefined();
      expect(profile.id).toBe("stu-001");
      expect(profile.className).toBeDefined();
    });

    it("allows student to update permitted profile fields (phone, email)", async () => {
      const updated = await portalService.updateStudentProfile(studentCtx, {
        phone: "+1-555-099-8877",
        email: "lucas.w.updated@student.apex.edu",
      });
      expect(updated.phone).toBe("+1-555-099-8877");
      expect(updated.email).toBe("lucas.w.updated@student.apex.edu");
    });

    it("retrieves student's own attendance history", async () => {
      const att = await portalService.getStudentAttendance(studentCtx);
      expect(att).toBeDefined();
      expect(att.studentId).toBe("stu-001");
      expect(att.summary).toBeDefined();
    });

    it("retrieves student's own published results", async () => {
      const results = await portalService.getStudentResults(studentCtx);
      expect(results).toBeDefined();
      expect(results.student?.id).toBe("stu-001");
      expect(results.published).toBe(true);
      expect(Array.isArray(results.subjects)).toBe(true);
    });

    it("retrieves student's own weekly timetable", async () => {
      const tt = await portalService.getStudentTimetable(studentCtx);
      expect(tt).toBeDefined();
      expect(tt.studentId).toBe("stu-001");
      expect(tt.schedule).toBeDefined();
    });

    it("strictly blocks student IDOR: student cannot access another student's profile", async () => {
      await expect(
        portalService.requireOwnStudentAccess(studentCtx, "stu-002")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ===========================================================================
  // 9. CONTROLLED PROFILE UPDATES (REQUIREMENT #25)
  // ===========================================================================
  describe("Controlled Profile Management", () => {
    it("allows parent to update safe contact fields", async () => {
      const updated = await portalService.updateParentProfile(parentCtx, {
        phone: "+1-555-888-9999",
        alternatePhone: "+1-555-777-6666",
        address: "742 Evergreen Terrace, Springfield",
        occupation: "Lead Pediatric Specialist",
        employer: "General Children's Hospital",
      });
      expect(updated).toBeDefined();
      expect(updated.phone).toBe("+1-555-888-9999");
      expect(updated.alternatePhone).toBe("+1-555-777-6666");
      expect(updated.address).toBe("742 Evergreen Terrace, Springfield");
      expect(updated.occupation).toBe("Lead Pediatric Specialist");
    });
  });

  // ===========================================================================
  // 10. NOTIFICATIONS & INBOX (REQUIREMENT #26)
  // ===========================================================================
  describe("Notifications & In-App Inbox", () => {
    it("retrieves notifications addressed to the authenticated user", async () => {
      const notifs = await portalService.getNotifications(parentCtx);
      expect(Array.isArray(notifs)).toBe(true);
      notifs.forEach((n) => {
        expect(n.recipientId).toBe(parentCtx.userId);
      });
    });

    it("filters unread notifications accurately", async () => {
      const unread = await portalService.getNotifications(parentCtx, { unreadOnly: true });
      unread.forEach((n) => {
        expect(n.isRead).toBe(false);
      });
    });

    it("marks an individual notification as read", async () => {
      const notifs = await portalService.getNotifications(parentCtx, { unreadOnly: true });
      if (notifs.length > 0) {
        const targetId = notifs[0].id;
        const res = await portalService.markNotificationAsRead(parentCtx, targetId);
        expect(res.success).toBe(true);
        expect(res.notification?.isRead).toBe(true);
      }
    });

    it("marks all notifications as read for the user", async () => {
      const res = await portalService.markAllNotificationsAsRead(parentCtx);
      expect(res.success).toBe(true);
      const remainingUnread = await portalService.getNotifications(parentCtx, { unreadOnly: true });
      expect(remainingUnread.length).toBe(0);
    });

    it("prevents user from modifying another user's notification", async () => {
      // notif-003 belongs to student u-student-01, parent u-parent-01 cannot mark it
      await expect(
        portalService.markNotificationAsRead(parentCtx, "notif-003")
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ===========================================================================
  // 11. ADMINISTRATIVE PREVIEW CAPABILITIES
  // ===========================================================================
  describe("Administrative Preview Access", () => {
    it("allows School Administrator to inspect any student's portal records for support", async () => {
      const access = await portalService.requireGuardianStudentAccess(adminCtx, "stu-001");
      expect(access).toBeDefined();
      expect(access.relationship).toBe("ADMINISTRATIVE_PREVIEW");
    });
  });
});
