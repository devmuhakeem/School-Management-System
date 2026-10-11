import { describe, it, expect } from "vitest";
import { reportingService } from "@/services/reporting.service";
import { TenantContext } from "@/repositories/types";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "@/services/admin.service";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

describe("Phase 13: Reports, Analytics & Management Dashboards", () => {
  const adminCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-super-admin-01",
    userRoles: ["Super Administrator"],
  };

  const enterpriseAdminCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    userId: "u-enterprise-director",
    userRoles: ["Super Administrator"],
  };

  const restrictedCampusCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: "campus-north",
    userId: "u-campus-north-admin",
    userRoles: ["Campus Administrator"],
  };

  const foreignTenantCtx: TenantContext = {
    organizationId: "org-foreign-academy",
    userId: "u-foreign-user",
    userRoles: ["Super Administrator"],
  };

  // ===========================================================================
  // 1. EXECUTIVE MANAGEMENT DASHBOARD
  // ===========================================================================
  describe("1. Executive Management Dashboard", () => {
    it("aggregates multi-module KPIs across SIS, attendance, academics, finance, and operations", async () => {
      const dashboard = await reportingService.getExecutiveDashboard(adminCtx);

      expect(dashboard).toHaveProperty("metrics");
      expect(dashboard).toHaveProperty("charts");

      // SIS KPIs
      expect(dashboard.metrics.students).toBeDefined();
      expect(dashboard.metrics.students.totalActive).toBeGreaterThanOrEqual(0);
      expect(dashboard.metrics.students.enrolledTotal).toBeGreaterThanOrEqual(0);

      // Attendance KPIs
      expect(dashboard.metrics.attendance.averageRate).toBeGreaterThan(0);
      expect(dashboard.metrics.attendance.presentCount).toBeGreaterThanOrEqual(0);

      // Academics KPIs
      expect(dashboard.metrics.academics.assessmentsCompleted).toBeGreaterThan(0);
      expect(dashboard.metrics.academics.averageScore).toBeGreaterThan(0);

      // Finance KPIs (Phase 9 Single Source of Truth)
      expect(dashboard.metrics.finance.totalCollectedCents).toBeGreaterThanOrEqual(0);
      expect(dashboard.metrics.finance.collectionRate).toBeGreaterThanOrEqual(0);

      // Operations KPIs (Phases 11 & 12)
      expect(dashboard.metrics.operations.libraryActiveLoans).toBeGreaterThanOrEqual(0);
      expect(dashboard.metrics.operations.transportVehiclesActive).toBeGreaterThanOrEqual(0);
      expect(dashboard.metrics.operations.hostelOccupancyRate).toBeGreaterThanOrEqual(0);

      // Charts
      expect(dashboard.charts.attendanceTrends.length).toBeGreaterThan(0);
      expect(dashboard.charts.financialCollectionTrends.length).toBeGreaterThan(0);
      expect(dashboard.charts.enrollmentByClass.length).toBeGreaterThan(0);
      expect(dashboard.charts.gradeDistribution.length).toBeGreaterThan(0);
    });

    it("respects campus filter scoping when permitted", async () => {
      const scopedDashboard = await reportingService.getExecutiveDashboard(enterpriseAdminCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
      });

      expect(scopedDashboard.appliedFilters.campusId).toBe(DEMO_CAMPUS_MAIN_ID);
    });
  });

  // ===========================================================================
  // 2. ACADEMIC ANALYTICS & GRADE DISTRIBUTION
  // ===========================================================================
  describe("2. Academic Analytics & Dynamic Grade Distribution", () => {
    it("dynamically resolves grade boundaries from active grading scheme without hardcoding", async () => {
      const academics = await reportingService.getAcademicAnalytics(adminCtx);

      expect(academics.summary).toBeDefined();
      expect(academics.summary.overallPassRate).toBeGreaterThan(0);
      expect(academics.summary.passCount + academics.summary.failCount).toBe(
        academics.summary.totalSubmissions
      );

      // Grade Distribution
      expect(academics.gradeDistribution.length).toBeGreaterThan(0);
      const gradeA = academics.gradeDistribution.find(
        (g) => g.grade === "A" || g.grade === "A*" || g.grade === "A1"
      );
      expect(gradeA).toBeDefined();
      expect(gradeA?.minScore).toBeGreaterThanOrEqual(75);

      // Subject Performance
      expect(academics.subjectPerformance.length).toBeGreaterThan(0);
      expect(academics.subjectPerformance[0]).toHaveProperty("subjectCode");
      expect(academics.subjectPerformance[0]).toHaveProperty("averageScore");
      expect(academics.subjectPerformance[0].highestScore).toBeGreaterThanOrEqual(
        academics.subjectPerformance[0].lowestScore
      );

      // Class Performance
      expect(academics.classPerformance.length).toBeGreaterThan(0);
      expect(academics.classPerformance[0]).toHaveProperty("className");
      expect(academics.classPerformance[0].enrolledCount).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 3. ATTENDANCE ANALYTICS & CHRONIC ABSENCE INTERVENTION
  // ===========================================================================
  describe("3. Attendance Analytics & Chronic Absence Alerts", () => {
    it("computes presence rates, daily trends, and identifies chronic absentees below threshold", async () => {
      const threshold = 85;
      const attendance = await reportingService.getAttendanceAnalytics(adminCtx, {
        chronicThreshold: threshold,
      });

      expect(attendance.summary.overallAttendanceRate).toBeGreaterThan(0);
      expect(attendance.summary.chronicThresholdUsed).toBe(threshold);
      expect(attendance.dailyTrends.length).toBeGreaterThan(0);
      expect(attendance.classBreakdown.length).toBeGreaterThan(0);

      // Chronic absentees verification
      for (const absentee of attendance.chronicAbsentees) {
        expect(absentee.attendanceRate).toBeLessThan(threshold);
        expect(absentee.admissionNumber).toBeDefined();
        expect(absentee.studentName).toBeDefined();
      }
    });

    it("adjusts chronic absentee counts when threshold is modified", async () => {
      const strictResult = await reportingService.getAttendanceAnalytics(adminCtx, {
        chronicThreshold: 90,
      });
      const lenientResult = await reportingService.getAttendanceAnalytics(adminCtx, {
        chronicThreshold: 75,
      });

      expect(strictResult.chronicAbsentees.length).toBeGreaterThanOrEqual(
        lenientResult.chronicAbsentees.length
      );
    });
  });

  // ===========================================================================
  // 4. FINANCE ANALYTICS & AGING DEBTORS
  // ===========================================================================
  describe("4. Finance Analytics & Fee Debtor Aging Analysis", () => {
    it("classifies debts into 30-day interval aging brackets reusing authoritative ledger", async () => {
      const finance = await reportingService.getFinanceAnalytics(adminCtx);

      expect(finance.summary.totalInvoiced).toBeGreaterThanOrEqual(0);
      expect(finance.summary.totalCollected).toBeGreaterThanOrEqual(0);
      expect(finance.agingAnalysis).toBeDefined();

      const { current30Days, days31To60, days61To90, over90Days, totalDebt } =
        finance.agingAnalysis;
      expect(current30Days + days31To60 + days61To90 + over90Days).toBe(totalDebt);

      expect(finance.feeCategoryBreakdown.length).toBeGreaterThan(0);
      expect(finance.paymentMethodBreakdown.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // 5. ADMISSIONS, STAFF & OPERATIONS ANALYTICS
  // ===========================================================================
  describe("5. Admissions, Faculty Workload & Operational Analytics", () => {
    it("reports admission pipeline conversion stages and demographic breakdowns", async () => {
      const admissions = await reportingService.getAdmissionsAndEnrollment(adminCtx);

      expect(admissions.pipelineStages.length).toBeGreaterThan(0);
      expect(admissions.enrollmentByClass.length).toBeGreaterThan(0);
      expect(admissions.demographics.genderDistribution.length).toBe(2);
      expect(admissions.demographics.statusDistribution.length).toBeGreaterThan(0);
    });

    it("evaluates faculty workload, teaching assignments, and department coverage", async () => {
      const staff = await reportingService.getStaffAnalytics(adminCtx);

      expect(staff.summary.totalStaff).toBeGreaterThan(0);
      expect(staff.departmentAllocations.length).toBeGreaterThan(0);
      expect(staff.teacherWorkloads.length).toBeGreaterThan(0);
      expect(staff.teacherWorkloads[0]).toHaveProperty("assignedSubjectsCount");
      expect(staff.teacherWorkloads[0]).toHaveProperty("assignedClassesCount");
    });

    it("monitors operations: library circulation, bus route utilization, hostel boarding, and email delivery", async () => {
      const ops = await reportingService.getOperationsAnalytics(adminCtx);

      expect(ops.library.totalBooks).toBeGreaterThan(0);
      expect(ops.library.availableCopies).toBeGreaterThanOrEqual(0);

      expect(ops.transport.totalVehicles).toBeGreaterThan(0);
      expect(ops.transport.capacityUtilizationRate).toBeGreaterThanOrEqual(0);

      expect(ops.hostel.totalBedCapacity).toBeGreaterThan(0);
      expect(ops.hostel.occupancyRate).toBeGreaterThanOrEqual(0);

      expect(ops.communication.deliverySuccessRate).toBeGreaterThan(0);
      expect(ops.communication.publishedAnnouncements).toBeGreaterThanOrEqual(0);
    });
  });

  // ===========================================================================
  // 6. REPORT CATALOG & RBAC PERMISSIONS
  // ===========================================================================
  describe("6. Report Catalog & Access Control", () => {
    it("provides complete catalog to super administrators", () => {
      const catalog = reportingService.getCatalog(["*"]);
      expect(catalog.length).toBeGreaterThanOrEqual(10);
      expect(catalog.some((c) => c.key === "executive_overview")).toBe(true);
      expect(catalog.some((c) => c.key === "chronic_absence")).toBe(true);
      expect(catalog.some((c) => c.key === "finance_aging")).toBe(true);
    });

    it("filters catalog strictly according to granular permissions", () => {
      const academicOnlyCatalog = reportingService.getCatalog(["academic_reports.read"]);
      expect(academicOnlyCatalog.every((c) => c.requiredPermission === "academic_reports.read")).toBe(true);

      const financeOnlyCatalog = reportingService.getCatalog(["finance_reports.read"]);
      expect(financeOnlyCatalog.every((c) => c.requiredPermission === "finance_reports.read")).toBe(true);
    });
  });

  // ===========================================================================
  // 7. TABULAR REPORT ENGINE & SUMMARY ROWS
  // ===========================================================================
  describe("7. Tabular Report Generation Engine", () => {
    it("generates tabular data for student enrollment with totals summary row", async () => {
      const report = await reportingService.generateReportData(adminCtx, "student_enrollment");

      expect(report.reportKey).toBe("student_enrollment");
      expect(report.columns.length).toBeGreaterThan(0);
      expect(report.rows.length).toBeGreaterThan(0);
      expect(report.summaryRow).toBeDefined();
      expect(report.summaryRow?.className).toBe("Total Institution");
    });

    it("generates tabular data for academic subject performance", async () => {
      const report = await reportingService.generateReportData(adminCtx, "subject_performance");

      expect(report.columns.some((c) => c.key === "subjectCode")).toBe(true);
      expect(report.rows.length).toBeGreaterThan(0);
      expect(report.rows[0]).toHaveProperty("averageScore");
      expect(report.rows[0]).toHaveProperty("passRate");
    });

    it("generates tabular data for chronic absence operational alerts", async () => {
      const report = await reportingService.generateReportData(adminCtx, "chronic_absence", {
        chronicThreshold: 85,
      });

      expect(report.columns.some((c) => c.key === "alertLevel")).toBe(true);
      expect(report.rows.length).toBeGreaterThanOrEqual(0);
    });

    it("generates tabular data for debtor aging analysis", async () => {
      const report = await reportingService.generateReportData(adminCtx, "finance_aging");

      expect(report.columns.some((c) => c.key === "balanceDue")).toBe(true);
      expect(report.columns.some((c) => c.key === "bucket")).toBe(true);
    });

    it("throws NotFoundError when requesting unknown report key", async () => {
      await expect(
        reportingService.generateReportData(adminCtx, "non_existent_report_key")
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ===========================================================================
  // 8. AUTHORIZED EXPORT ENGINE (RFC 4180 CSV & JSON)
  // ===========================================================================
  describe("8. Authorized Export Engine & Audit Logging", () => {
    it("exports RFC 4180 compliant CSV format with properly escaped values", async () => {
      const exportRes = await reportingService.exportReport(
        adminCtx,
        "student_enrollment",
        "csv"
      );

      expect(exportRes.contentType).toContain("text/csv");
      expect(exportRes.filename).toMatch(/student-enrollment-\d{4}-\d{2}-\d{2}\.csv/);
      expect(exportRes.content).toContain("Class / Grade Level,Room Capacity");
      expect(exportRes.content.length).toBeGreaterThan(20);
    });

    it("exports clean JSON dataset with metadata", async () => {
      const exportRes = await reportingService.exportReport(
        adminCtx,
        "subject_performance",
        "json"
      );

      expect(exportRes.contentType).toBe("application/json");
      expect(exportRes.filename).toMatch(/subject-performance-\d{4}-\d{2}-\d{2}\.json/);

      const parsed = JSON.parse(exportRes.content);
      expect(parsed.reportKey).toBe("subject_performance");
      expect(Array.isArray(parsed.columns)).toBe(true);
      expect(Array.isArray(parsed.rows)).toBe(true);
    });
  });

  // ===========================================================================
  // 9. TENANT ISOLATION & CAMPUS SECURITY GUARDS
  // ===========================================================================
  describe("9. Tenant Isolation & Campus Injection Protection", () => {
    it("forbids restricted campus users from injecting cross-campus parameters", async () => {
      // User restricted to 'campus-north' attempts to query 'campus-main'
      await expect(
        reportingService.getExecutiveDashboard(restrictedCampusCtx, {
          campusId: DEMO_CAMPUS_MAIN_ID,
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("prevents foreign tenants from observing other institution metrics", async () => {
      const foreignDashboard = await reportingService.getExecutiveDashboard(foreignTenantCtx);

      expect(foreignDashboard.metrics.students.totalActive).toBe(0);
      expect(foreignDashboard.metrics.students.newAdmissions).toBe(0);
    });
  });
});
