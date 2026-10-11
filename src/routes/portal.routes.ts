import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { portalService } from "@/services/portal.service";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { successResponse, errorResponse } from "@/lib/api-response";
import { validateSchema } from "@/lib/validations/common";
import {
  updateParentProfileSchema,
  updateStudentProfileSchema,
  portalDateFilterSchema,
} from "@/lib/validations/portal";
import { TenantContext } from "@/repositories/types";

export const portalRouter = Router();

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const val = validateSchema(schema, req.body);
    if (!val.success) {
      return res.status(400).json(
        errorResponse("Validation failed", "VALIDATION_ERROR", undefined, val.fieldErrors)
      );
    }
    req.body = val.data;
    next();
  };
}

function getTenantContext(req: Request): TenantContext {
  const user = req.user!;
  return {
    organizationId: user.organizationId,
    campusId: user.activeCampusId || undefined,
    userId: user.userId,
    userRoles: user.roles,
  };
}

// All portal routes require authentication
portalRouter.use(requireAuth);

// =============================================================================
// 1. PARENT / GUARDIAN PORTAL ENDPOINTS
// =============================================================================

/**
 * GET /api/portal/parent/dashboard
 * Complete overview: parent info, linked children, notifications count
 */
portalRouter.get(
  "/parent/dashboard",
  requirePermission("portal.parent.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const data = await portalService.getParentDashboard(ctx);
      return res.json(successResponse(data, "Parent dashboard retrieved successfully."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/parent/children
 * List of all children linked to this authenticated guardian
 */
portalRouter.get(
  "/parent/children",
  requirePermission("portal.parent.children.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const children = await portalService.getGuardianChildren(ctx);
      return res.json(successResponse(children, "Linked children retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/parent/students/:studentId
 * Child student profile details with strict relationship verification
 */
portalRouter.get(
  "/parent/students/:studentId",
  requirePermission("portal.parent.children.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const data = await portalService.getChildProfile(ctx, req.params.studentId);
      return res.json(successResponse(data, "Student profile retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/parent/students/:studentId/attendance
 * Child attendance history with date filtering
 */
portalRouter.get(
  "/parent/students/:studentId/attendance",
  requirePermission("portal.parent.attendance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const val = validateSchema(portalDateFilterSchema, req.query);
      const params = val.success ? val.data : undefined;
      const history = await portalService.getChildAttendance(ctx, req.params.studentId, params);
      return res.json(successResponse(history, "Attendance records retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/parent/students/:studentId/results
 * Child published term examination results
 */
portalRouter.get(
  "/parent/students/:studentId/results",
  requirePermission("portal.parent.results.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const { academicYearId, termId } = req.query;
      const data = await portalService.getChildResults(ctx, req.params.studentId, {
        academicYearId: academicYearId as string,
        termId: termId as string,
      });
      return res.json(successResponse(data, "Academic results retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/parent/students/:studentId/report-cards
 * Child published official terminal report card
 */
portalRouter.get(
  "/parent/students/:studentId/report-cards",
  requirePermission("portal.parent.report_cards.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const { academicYearId, termId } = req.query;
      const reportCard = await portalService.getChildReportCard(
        ctx,
        req.params.studentId,
        academicYearId as string,
        termId as string
      );
      return res.json(successResponse(reportCard, "Official report card retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/parent/students/:studentId/timetable
 * Child weekly class schedule
 */
portalRouter.get(
  "/parent/students/:studentId/timetable",
  requirePermission("portal.parent.timetable.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const timetable = await portalService.getChildTimetable(ctx, req.params.studentId);
      return res.json(successResponse(timetable, "Class timetable schedule retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/parent/students/:studentId/finance
 * Child statement of account / fee ledger
 */
portalRouter.get(
  "/parent/students/:studentId/finance",
  requirePermission("portal.parent.finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const ledger = await portalService.getChildFinance(ctx, req.params.studentId);
      return res.json(successResponse(ledger, "Student fee ledger retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/parent/students/:studentId/invoices
 * Child invoices breakdown
 */
portalRouter.get(
  "/parent/students/:studentId/invoices",
  requirePermission("portal.parent.invoices.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const { status, academicYearId, termId } = req.query;
      const data = await portalService.getChildInvoices(ctx, req.params.studentId, {
        status: status as string,
        academicYearId: academicYearId as string,
        termId: termId as string,
      });
      return res.json(successResponse(data, "Student invoices retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/parent/students/:studentId/receipts
 * Child payment receipts
 */
portalRouter.get(
  "/parent/students/:studentId/receipts",
  requirePermission("portal.parent.receipts.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const receipts = await portalService.getChildReceipts(ctx, req.params.studentId);
      return res.json(successResponse(receipts, "Payment receipts retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/portal/parent/profile
 * Controlled self-service update of contact and address fields
 */
portalRouter.patch(
  "/parent/profile",
  requirePermission("portal.parent.profile.update"),
  validateBody(updateParentProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await portalService.updateParentProfile(ctx, req.body);
      return res.json(successResponse(updated, "Profile updated successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================================
// 2. STUDENT PORTAL ENDPOINTS
// =============================================================================

/**
 * GET /api/portal/student/dashboard
 * Authenticated student's dashboard
 */
portalRouter.get(
  "/student/dashboard",
  requirePermission("portal.student.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const data = await portalService.getStudentDashboard(ctx);
      return res.json(successResponse(data, "Student dashboard retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/student/profile
 * Authenticated student's own profile
 */
portalRouter.get(
  "/student/profile",
  requirePermission("portal.student.profile.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const profile = await portalService.getStudentProfile(ctx);
      return res.json(successResponse(profile, "Personal student profile retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/portal/student/profile
 * Student self-service profile update (Permitted fields only)
 */
portalRouter.patch(
  "/student/profile",
  requirePermission("portal.student.profile.update"),
  validateBody(updateStudentProfileSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await portalService.updateStudentProfile(ctx, req.body);
      return res.json(successResponse(updated, "Personal profile updated."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/student/attendance
 * Authenticated student's own attendance
 */
portalRouter.get(
  "/student/attendance",
  requirePermission("portal.student.attendance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const val = validateSchema(portalDateFilterSchema, req.query);
      const params = val.success ? val.data : undefined;
      const history = await portalService.getStudentAttendance(ctx, params);
      return res.json(successResponse(history, "Personal attendance history retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/student/results
 * Authenticated student's published results
 */
portalRouter.get(
  "/student/results",
  requirePermission("portal.student.results.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const { academicYearId, termId } = req.query;
      const data = await portalService.getStudentResults(ctx, {
        academicYearId: academicYearId as string,
        termId: termId as string,
      });
      return res.json(successResponse(data, "Personal academic results retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/student/report-cards
 * Authenticated student's published report cards
 */
portalRouter.get(
  "/student/report-cards",
  requirePermission("portal.student.report_cards.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const { academicYearId, termId } = req.query;
      const card = await portalService.getStudentReportCard(
        ctx,
        academicYearId as string,
        termId as string
      );
      return res.json(successResponse(card, "Personal terminal report card retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/student/timetable
 * Authenticated student's weekly timetable
 */
portalRouter.get(
  "/student/timetable",
  requirePermission("portal.student.timetable.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const timetable = await portalService.getStudentTimetable(ctx);
      return res.json(successResponse(timetable, "Personal class timetable retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/portal/student/finance
 * Authenticated student's permitted fee overview
 */
portalRouter.get(
  "/student/finance",
  requirePermission("portal.student.finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const finance = await portalService.getStudentFinance(ctx);
      return res.json(successResponse(finance, "Permitted fee overview retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// =============================================================================
// 3. NOTIFICATIONS & INBOX
// =============================================================================

/**
 * GET /api/portal/notifications
 * In-app inbox notifications for the authenticated user
 */
portalRouter.get(
  "/notifications",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const unreadOnly = req.query.unread === "true";
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const notifs = await portalService.getNotifications(ctx, { unreadOnly, limit });
      return res.json(successResponse(notifs, "Notifications retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/portal/notifications/:id/read
 * Mark notification as read
 */
portalRouter.patch(
  "/notifications/:id/read",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const result = await portalService.markNotificationAsRead(ctx, req.params.id);
      return res.json(successResponse(result, "Notification marked as read."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/portal/notifications/mark-all-read
 * Mark all user notifications as read
 */
portalRouter.post(
  "/notifications/mark-all-read",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const result = await portalService.markAllNotificationsAsRead(ctx);
      return res.json(successResponse(result, "All notifications marked as read."));
    } catch (err) {
      next(err);
    }
  }
);
