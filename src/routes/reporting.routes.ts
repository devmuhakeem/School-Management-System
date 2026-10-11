import { Router, Request, Response, NextFunction } from "express";
import { reportingService } from "@/services/reporting.service";
import { requireAuth } from "@/lib/auth/guards";
import { successResponse, errorResponse } from "@/lib/api-response";
import { TenantContext } from "@/repositories/types";
import { REPORT_CATALOG } from "@/lib/reporting/report-catalog";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

export const reportingRouter = Router();

function getTenantContext(req: Request): TenantContext {
  const user = req.user!;
  return {
    organizationId: user.organizationId,
    campusId: user.activeCampusId || undefined,
    userId: user.userId,
    userRoles: user.roles,
  };
}

function hasPermissionOrAdmin(req: Request, permission: string): boolean {
  const user = req.user!;
  const perms = user.permissions || [];
  return (
    perms.includes("*") ||
    perms.includes("reports.manage") ||
    perms.includes("reports.read") ||
    perms.includes(permission)
  );
}

// All reporting routes require authentication
reportingRouter.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. REPORT CATALOG
// -----------------------------------------------------------------------------
reportingRouter.get("/catalog", (req: Request, res: Response) => {
  const user = req.user!;
  const catalog = reportingService.getCatalog(user.permissions || []);
  return res.json(successResponse(catalog, "Authorized report catalog retrieved."));
});

// -----------------------------------------------------------------------------
// 2. EXECUTIVE MANAGEMENT DASHBOARD
// -----------------------------------------------------------------------------
reportingRouter.get("/dashboard", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!hasPermissionOrAdmin(req, "reports.read")) {
      return res.status(403).json(errorResponse("Access denied: reports.read permission required.", "FORBIDDEN"));
    }
    const data = await reportingService.getExecutiveDashboard(getTenantContext(req), req.query);
    return res.json(successResponse(data, "Executive management dashboard metrics retrieved."));
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 3. ACADEMIC ANALYTICS
// -----------------------------------------------------------------------------
reportingRouter.get("/academics", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!hasPermissionOrAdmin(req, "academic_reports.read")) {
      return res.status(403).json(errorResponse("Access denied: academic_reports.read required.", "FORBIDDEN"));
    }
    const data = await reportingService.getAcademicAnalytics(getTenantContext(req), req.query);
    return res.json(successResponse(data, "Academic analytics retrieved."));
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 4. ATTENDANCE ANALYTICS
// -----------------------------------------------------------------------------
reportingRouter.get("/attendance", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!hasPermissionOrAdmin(req, "attendance_reports.read")) {
      return res.status(403).json(errorResponse("Access denied: attendance_reports.read required.", "FORBIDDEN"));
    }
    const data = await reportingService.getAttendanceAnalytics(getTenantContext(req), req.query);
    return res.json(successResponse(data, "Attendance analytics retrieved."));
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 5. FINANCE ANALYTICS
// -----------------------------------------------------------------------------
reportingRouter.get("/finance", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!hasPermissionOrAdmin(req, "finance_reports.read")) {
      return res.status(403).json(errorResponse("Access denied: finance_reports.read required.", "FORBIDDEN"));
    }
    const data = await reportingService.getFinanceAnalytics(getTenantContext(req), req.query);
    return res.json(successResponse(data, "Finance analytics & aging analysis retrieved."));
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 6. ADMISSIONS & ENROLLMENT DEMOGRAPHICS
// -----------------------------------------------------------------------------
reportingRouter.get("/admissions", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!hasPermissionOrAdmin(req, "admissions_reports.read")) {
      return res.status(403).json(errorResponse("Access denied: admissions_reports.read required.", "FORBIDDEN"));
    }
    const data = await reportingService.getAdmissionsAndEnrollment(getTenantContext(req), req.query);
    return res.json(successResponse(data, "Admissions & enrollment demographics retrieved."));
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 7. STAFF & FACULTY WORKLOAD
// -----------------------------------------------------------------------------
reportingRouter.get("/staff", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!hasPermissionOrAdmin(req, "staff_reports.read")) {
      return res.status(403).json(errorResponse("Access denied: staff_reports.read required.", "FORBIDDEN"));
    }
    const data = await reportingService.getStaffAnalytics(getTenantContext(req), req.query);
    return res.json(successResponse(data, "Staff & faculty workload analytics retrieved."));
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 8. OPERATIONS ANALYTICS (Library, Transport, Hostel, Communication)
// -----------------------------------------------------------------------------
reportingRouter.get("/operations", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!hasPermissionOrAdmin(req, "reports.read")) {
      return res.status(403).json(errorResponse("Access denied: reports.read required.", "FORBIDDEN"));
    }
    const data = await reportingService.getOperationsAnalytics(getTenantContext(req), req.query);
    return res.json(successResponse(data, "Operations analytics retrieved."));
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 9. TABULAR REPORT DATA BY KEY
// -----------------------------------------------------------------------------
reportingRouter.get("/data/:reportKey", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportKey = req.params.reportKey;
    const catalogItem = REPORT_CATALOG.find((r) => r.key === reportKey);
    if (!catalogItem) {
      throw new NotFoundError(`Report "${reportKey}" is not registered in the catalog.`);
    }

    if (!hasPermissionOrAdmin(req, catalogItem.requiredPermission)) {
      throw new ForbiddenError(`Access denied: ${catalogItem.requiredPermission} permission required.`);
    }

    const reportData = await reportingService.generateReportData(getTenantContext(req), reportKey, req.query);
    return res.json(successResponse(reportData, `Report "${reportKey}" data generated.`));
  } catch (err) {
    next(err);
  }
});

// -----------------------------------------------------------------------------
// 10. EXPORT REPORT (CSV or JSON)
// -----------------------------------------------------------------------------
reportingRouter.get("/export", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reportKey = req.query.reportKey as string;
    if (!reportKey) {
      return res.status(400).json(errorResponse("reportKey query parameter is required.", "VALIDATION_ERROR"));
    }

    const catalogItem = REPORT_CATALOG.find((r) => r.key === reportKey);
    if (!catalogItem) {
      throw new NotFoundError(`Report "${reportKey}" is not registered in the catalog.`);
    }

    if (!hasPermissionOrAdmin(req, catalogItem.requiredPermission)) {
      throw new ForbiddenError(`Export denied: ${catalogItem.requiredPermission} permission required.`);
    }

    const format = (req.query.format as string) === "json" ? "json" : "csv";
    const exportResult = await reportingService.exportReport(
      getTenantContext(req),
      reportKey,
      format,
      req.query
    );

    res.setHeader("Content-Type", exportResult.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${exportResult.filename}"`);
    return res.send(exportResult.content);
  } catch (err) {
    next(err);
  }
});
