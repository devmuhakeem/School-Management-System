import { Router, Request, Response, NextFunction } from "express";
import { attendanceService } from "@/services/attendance.service";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { successResponse, errorResponse } from "@/lib/api-response";
import { validateSchema } from "@/lib/validations/common";
import {
  recordSingleAttendanceSchema,
  bulkMarkAttendanceSchema,
  correctAttendanceSchema,
  excuseAbsenceSchema,
  lockAttendanceSchema,
  getAttendanceRegisterQuerySchema,
} from "@/lib/validations/attendance";
import { TenantContext } from "@/repositories/types";

export const attendanceRouter = Router();

function getTenantContext(req: Request): TenantContext {
  const user = req.user!;
  return {
    organizationId: user.organizationId,
    campusId: user.activeCampusId || undefined,
    userId: user.userId,
    userRoles: user.roles,
  };
}

// All attendance routes require authentication
attendanceRouter.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. DASHBOARD METRICS
// -----------------------------------------------------------------------------
attendanceRouter.get(
  "/dashboard-stats",
  requirePermission("attendance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campusId = (req.query.campusId as string) || undefined;
      const date = (req.query.date as string) || undefined;
      const academicYearId = (req.query.academicYearId as string) || undefined;

      const stats = await attendanceService.getAttendanceDashboardStats(
        getTenantContext(req),
        { campusId, date, academicYearId }
      );

      return res.json(successResponse(stats, "Attendance dashboard statistics retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 2. LOAD ATTENDANCE REGISTER
// -----------------------------------------------------------------------------
attendanceRouter.get(
  "/register",
  requirePermission("attendance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(getAttendanceRegisterQuerySchema, {
        campusId: req.query.campusId,
        academicYearId: req.query.academicYearId,
        termId: req.query.termId,
        classId: req.query.classId,
        sectionId: req.query.sectionId,
        teachingGroupId: req.query.teachingGroupId,
        lessonId: req.query.lessonId,
        attendanceDate: req.query.attendanceDate,
        attendanceType: req.query.attendanceType || "DAILY",
      });

      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Invalid attendance register query", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }

      const register = await attendanceService.getAttendanceRegister(
        getTenantContext(req),
        validation.data
      );

      return res.json(successResponse(register, "Attendance register retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 3. RECORD SINGLE STUDENT ATTENDANCE
// -----------------------------------------------------------------------------
attendanceRouter.post(
  "/single",
  requirePermission("attendance.create"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(recordSingleAttendanceSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Attendance recording validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }

      const record = await attendanceService.recordSingleAttendance(
        getTenantContext(req),
        validation.data
      );

      return res.status(201).json(successResponse(record, "Student attendance recorded successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 4. BULK MARK ATTENDANCE
// -----------------------------------------------------------------------------
attendanceRouter.post(
  "/bulk",
  requirePermission("attendance.create"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(bulkMarkAttendanceSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Bulk attendance validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }

      const result = await attendanceService.bulkMarkAttendance(
        getTenantContext(req),
        validation.data
      );

      return res.status(200).json(successResponse(result, "Bulk attendance recorded successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 5. ATTENDANCE CORRECTION
// -----------------------------------------------------------------------------
attendanceRouter.post(
  "/:id/correct",
  requirePermission("attendance.correct"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(correctAttendanceSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Correction validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }

      const result = await attendanceService.correctAttendance(
        getTenantContext(req),
        req.params.id,
        validation.data
      );

      return res.json(successResponse(result, "Attendance corrected successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 6. EXCUSE ABSENCE
// -----------------------------------------------------------------------------
attendanceRouter.post(
  "/:id/excuse",
  requirePermission("attendance.update"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(excuseAbsenceSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Excuse absence validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }

      const result = await attendanceService.excuseAbsence(
        getTenantContext(req),
        req.params.id,
        validation.data
      );

      return res.json(successResponse(result, "Absence excused successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 7. LOCK ATTENDANCE REGISTER
// -----------------------------------------------------------------------------
attendanceRouter.post(
  "/lock",
  requirePermission("attendance.lock"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(lockAttendanceSchema, {
        ...req.body,
        isLocked: true,
      });

      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Lock attendance validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }

      const result = await attendanceService.setAttendanceRegisterLock(
        getTenantContext(req),
        validation.data
      );

      return res.json(successResponse(result, "Attendance register locked successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 8. UNLOCK ATTENDANCE REGISTER
// -----------------------------------------------------------------------------
attendanceRouter.post(
  "/unlock",
  requirePermission("attendance.unlock"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(lockAttendanceSchema, {
        ...req.body,
        isLocked: false,
      });

      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Unlock attendance validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }

      const result = await attendanceService.setAttendanceRegisterLock(
        getTenantContext(req),
        validation.data
      );

      return res.json(successResponse(result, "Attendance register unlocked successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 9. STUDENT ATTENDANCE HISTORY
// -----------------------------------------------------------------------------
attendanceRouter.get(
  "/student/:studentId",
  requirePermission("attendance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.params;
      const startDate = (req.query.startDate as string) || undefined;
      const endDate = (req.query.endDate as string) || undefined;
      const academicYearId = (req.query.academicYearId as string) || undefined;
      const termId = (req.query.termId as string) || undefined;
      const status = (req.query.status as string) || undefined;
      const attendanceType = (req.query.attendanceType as string) || undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

      const history = await attendanceService.getStudentAttendanceHistory(
        getTenantContext(req),
        studentId,
        { startDate, endDate, academicYearId, termId, status, attendanceType, page, limit }
      );

      return res.json(successResponse(history, "Student attendance history retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 10. CLASS ATTENDANCE HISTORY
// -----------------------------------------------------------------------------
attendanceRouter.get(
  "/class/:classId/history",
  requirePermission("attendance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { classId } = req.params;
      const sectionId = (req.query.sectionId as string) || undefined;
      const startDate = (req.query.startDate as string) || undefined;
      const endDate = (req.query.endDate as string) || undefined;
      const academicYearId = (req.query.academicYearId as string) || undefined;

      const history = await attendanceService.getClassAttendanceHistory(
        getTenantContext(req),
        classId,
        { sectionId, startDate, endDate, academicYearId }
      );

      return res.json(successResponse(history, "Class attendance history retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 11. ATTENDANCE REPORTS
// -----------------------------------------------------------------------------
attendanceRouter.get(
  "/reports",
  requirePermission("attendance.reports"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = (req.query.type as "CLASS_SUMMARY" | "STUDENT_DETAIL" | "LESSON_ATTENDANCE") || "CLASS_SUMMARY";
      const classId = (req.query.classId as string) || undefined;
      const sectionId = (req.query.sectionId as string) || undefined;
      const teachingGroupId = (req.query.teachingGroupId as string) || undefined;
      const startDate = (req.query.startDate as string) || undefined;
      const endDate = (req.query.endDate as string) || undefined;
      const academicYearId = (req.query.academicYearId as string) || undefined;

      const report = await attendanceService.getAttendanceReports(
        getTenantContext(req),
        type,
        { classId, sectionId, teachingGroupId, startDate, endDate, academicYearId }
      );

      return res.json(successResponse(report, "Attendance report generated."));
    } catch (err) {
      next(err);
    }
  }
);
