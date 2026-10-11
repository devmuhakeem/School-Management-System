import { describe, it, expect, beforeEach } from "vitest";
import { attendanceService } from "@/services/attendance.service";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "@/services/admin.service";
import { TenantContext } from "@/repositories/types";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

describe("Phase 7: Attendance Management Architecture", () => {
  const adminCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-super-admin-01",
    userRoles: ["Super Administrator"],
  };

  const principalCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-principal-01",
    userRoles: ["Principal"],
  };

  const teacherCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "stf-001",
    userRoles: ["Academic Teacher", "Form / Class Teacher"],
  };

  const otherOrgCtx: TenantContext = {
    organizationId: "org-foreign-academy-99",
    campusId: "camp-foreign-99",
    userId: "u-foreign-admin-99",
    userRoles: ["School Administrator"],
  };

  const testDate = "2026-09-28";

  // ---------------------------------------------------------------------------
  // 1. Attendance Register Loading & Student Eligibility
  // ---------------------------------------------------------------------------
  describe("Attendance Register Loading & Eligibility", () => {
    it("loads eligible active students and summary for class on given date", async () => {
      const register = await attendanceService.getAttendanceRegister(adminCtx, {
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        attendanceDate: testDate,
        attendanceType: "DAILY",
      });

      expect(register).toBeDefined();
      expect(register.classId).toBe("cls-jss1-2526");
      expect(register.attendanceDate).toBe(testDate);
      expect(register.roster.length).toBeGreaterThanOrEqual(1);
      expect(register.summary).toBeDefined();
      expect(register.summary.totalEligible).toBeGreaterThanOrEqual(1);
    });

    it("enforces tenant isolation when loading attendance register", async () => {
      const foreignRegister = await attendanceService.getAttendanceRegister(otherOrgCtx, {
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        attendanceDate: testDate,
        attendanceType: "DAILY",
      });

      expect(foreignRegister.summary.markedCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Single Student Attendance Marking
  // ---------------------------------------------------------------------------
  describe("Single Student Attendance Marking", () => {
    it("records a student as PRESENT for a daily session", async () => {
      const record = await attendanceService.recordSingleAttendance(teacherCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        studentId: "stu-demo-01",
        attendanceType: "DAILY",
        attendanceDate: testDate,
        status: "PRESENT",
      });

      expect(record).toBeDefined();
      expect(record.studentId).toBe("stu-demo-01");
      expect(record.status).toBe("PRESENT");
      expect(record.attendanceDate).toBe(testDate);
    });

    it("records a student as LATE with arrival time and notes", async () => {
      const record = await attendanceService.recordSingleAttendance(teacherCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        studentId: "stu-demo-02",
        attendanceType: "DAILY",
        attendanceDate: testDate,
        status: "LATE",
        arrivalTime: "08:15",
        reason: "Delayed by public transit disruption",
      });

      expect(record).toBeDefined();
      expect(record.status).toBe("LATE");
      expect(record.arrivalTime).toBe("08:15");
      expect(record.reason).toContain("transit");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Bulk Attendance Marking
  // ---------------------------------------------------------------------------
  describe("Bulk Attendance Marking", () => {
    it("records attendance for an entire classroom cohort in one operation", async () => {
      const bulkDate = "2026-09-29";
      const result = await attendanceService.bulkMarkAttendance(teacherCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        attendanceType: "DAILY",
        attendanceDate: bulkDate,
        records: [
          { studentId: "stu-demo-01", status: "PRESENT" },
          { studentId: "stu-demo-02", status: "PRESENT" },
          { studentId: "stu-demo-03", status: "ABSENT", reason: "Family emergency" },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(3);
      expect(result.date).toBe(bulkDate);

      // Verify roster reflects submitted records
      const register = await attendanceService.getAttendanceRegister(teacherCtx, {
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        attendanceDate: bulkDate,
        attendanceType: "DAILY",
      });

      expect(register.summary.presentCount).toBe(2);
      expect(register.summary.absentCount).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Controlled Attendance Corrections & Auditing
  // ---------------------------------------------------------------------------
  describe("Controlled Attendance Corrections", () => {
    it("allows authorized staff to correct a student's recorded status with mandatory reason", async () => {
      // Create initial absent record
      const initial = await attendanceService.recordSingleAttendance(teacherCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        studentId: "stu-demo-03",
        attendanceType: "DAILY",
        attendanceDate: "2026-09-30",
        status: "ABSENT",
        reason: "Did not respond during morning call",
      });

      // Submit audited correction: change ABSENT to PRESENT
      const correctionResult = await attendanceService.correctAttendance(
        principalCtx,
        initial.id,
        {
          status: "PRESENT",
          correctionReason: "Student was present at library induction during morning roll call",
          arrivalTime: "08:00",
        }
      );

      expect(correctionResult.success).toBe(true);
      expect(correctionResult.updatedRecord.status).toBe("PRESENT");
      expect(correctionResult.correction.previousStatus).toBe("ABSENT");
      expect(correctionResult.correction.newStatus).toBe("PRESENT");
      expect(correctionResult.correction.correctedById).toBe(principalCtx.userId);
    });

    it("throws NotFoundError when correcting a non-existent attendance record", async () => {
      await expect(
        attendanceService.correctAttendance(adminCtx, "att-non-existent-999", {
          status: "PRESENT",
          correctionReason: "Invalid test",
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. Official Excused Absences
  // ---------------------------------------------------------------------------
  describe("Official Excused Absences", () => {
    it("marks an absence as officially excused under institutional policy", async () => {
      const initial = await attendanceService.recordSingleAttendance(teacherCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        studentId: "stu-demo-02",
        attendanceType: "DAILY",
        attendanceDate: "2026-10-01",
        status: "ABSENT",
      });

      const excused = await attendanceService.excuseAbsence(principalCtx, initial.id, {
        isExcused: true,
        excuseReason: "Certified Medical Illness (Doctor's Note submitted to clinic)",
        remarks: "Verified by Nurse Williams",
      });

      expect(excused.status).toBe("EXCUSED");
      expect(excused.isExcused).toBe(true);
      expect(excused.excusedById).toBe(principalCtx.userId);
      expect(excused.reason).toContain("Certified Medical Illness");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. Attendance Register Locking & Security
  // ---------------------------------------------------------------------------
  describe("Attendance Register Locking", () => {
    it("locks an attendance register and seals it against non-admin modifications", async () => {
      const lockDate = "2026-10-02";

      // 1. Mark attendance
      await attendanceService.recordSingleAttendance(teacherCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        studentId: "stu-demo-01",
        attendanceType: "DAILY",
        attendanceDate: lockDate,
        status: "PRESENT",
      });

      // 2. Administrator locks the register
      const lockResult = await attendanceService.setAttendanceRegisterLock(adminCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        attendanceDate: lockDate,
        attendanceType: "DAILY",
        isLocked: true,
        lockNotes: "End-of-day register closure",
      });

      expect(lockResult.isLocked).toBe(true);

      // 3. Ordinary teacher cannot modify locked register
      await expect(
        attendanceService.recordSingleAttendance(teacherCtx, {
          campusId: DEMO_CAMPUS_MAIN_ID,
          academicYearId: "ay-2025-26",
          classId: "cls-jss1-2526",
          sectionId: "sec-jss1-a",
          studentId: "stu-demo-01",
          attendanceType: "DAILY",
          attendanceDate: lockDate,
          status: "ABSENT",
        })
      ).rejects.toThrow(ForbiddenError);

      // 4. Administrator unlocks register
      const unlockResult = await attendanceService.setAttendanceRegisterLock(adminCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        attendanceDate: lockDate,
        attendanceType: "DAILY",
        isLocked: false,
      });

      expect(unlockResult.isLocked).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. Student Attendance History & Percentage
  // ---------------------------------------------------------------------------
  describe("Student Attendance History & Calculation", () => {
    it("retrieves paginated timeline and computes attendance percentage accurately", async () => {
      const history = await attendanceService.getStudentAttendanceHistory(
        adminCtx,
        "stu-demo-01"
      );

      expect(history).toBeDefined();
      expect(history.studentId).toBe("stu-demo-01");
      expect(history.summary.totalSessions).toBeGreaterThanOrEqual(1);
      expect(history.summary.attendancePercentage).toBeGreaterThanOrEqual(0);
      expect(history.summary.attendancePercentage).toBeLessThanOrEqual(100);
      expect(history.records.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ---------------------------------------------------------------------------
  // 8. Class Attendance History Matrix
  // ---------------------------------------------------------------------------
  describe("Class Attendance History Matrix", () => {
    it("returns date-aggregated class summaries with daily attendance rates", async () => {
      const classHistory = await attendanceService.getClassAttendanceHistory(
        adminCtx,
        "cls-jss1-2526",
        { sectionId: "sec-jss1-a" }
      );

      expect(classHistory).toBeDefined();
      expect(classHistory.classId).toBe("cls-jss1-2526");
      expect(classHistory.summaries.length).toBeGreaterThanOrEqual(1);

      const daySummary = classHistory.summaries[0];
      expect(daySummary.date).toBeDefined();
      expect(daySummary.totalMarked).toBeGreaterThanOrEqual(1);
      expect(daySummary.attendanceRate).toBeGreaterThanOrEqual(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. Dashboard Statistics & Incomplete Class Tracking
  // ---------------------------------------------------------------------------
  describe("Attendance Dashboard Statistics", () => {
    it("provides institutional metrics and flags classes with unsubmitted attendance", async () => {
      const stats = await attendanceService.getAttendanceDashboardStats(adminCtx, {
        date: "2026-09-25",
      });

      expect(stats).toBeDefined();
      expect(stats.attendanceRate).toBeGreaterThanOrEqual(0);
      expect(stats.presentCount).toBeGreaterThanOrEqual(0);
      expect(stats.incompleteClasses).toBeDefined();
      expect(Array.isArray(stats.incompleteClasses)).toBe(true);
    });

    it("isolates dashboard metrics by tenant organization", async () => {
      const foreignStats = await attendanceService.getAttendanceDashboardStats(otherOrgCtx);
      expect(foreignStats.totalMarked).toBe(0);
      expect(foreignStats.presentCount).toBe(0);
      expect(foreignStats.absentCount).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. Institutional Attendance Reports
  // ---------------------------------------------------------------------------
  describe("Institutional Attendance Reports", () => {
    it("generates a class cohort summary report with student breakdown and percentages", async () => {
      const report = await attendanceService.getAttendanceReports(
        adminCtx,
        "CLASS_SUMMARY",
        { classId: "cls-jss1-2526" }
      );

      expect(report.reportType).toBe("CLASS_SUMMARY");
      expect(report.rows).toBeDefined();
      expect(report.rows!.length).toBeGreaterThanOrEqual(1);

      const studentRow = report.rows![0];
      expect(studentRow.studentId).toBeDefined();
      expect(studentRow.studentName).toBeDefined();
      expect(studentRow.attendanceRate).toBeGreaterThanOrEqual(0);
    });

    it("generates a lesson attendance report for subject cohorts", async () => {
      const lessonReport = await attendanceService.getAttendanceReports(
        adminCtx,
        "LESSON_ATTENDANCE",
        { teachingGroupId: "tg-001" }
      );

      expect(lessonReport.reportType).toBe("LESSON_ATTENDANCE");
      expect(lessonReport.totalLessonSessions).toBeGreaterThanOrEqual(0);
    });
  });
});
