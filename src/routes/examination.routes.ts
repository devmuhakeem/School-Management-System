import { Router, Request, Response, NextFunction } from "express";
import { examinationService } from "@/services/examination.service";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { successResponse, errorResponse } from "@/lib/api-response";
import { validateSchema } from "@/lib/validations/common";
import {
  createGradingSchemeSchema,
  createComponentConfigSchema,
  createExamSessionSchema,
  updateExamSessionSchema,
  createExamScheduleSchema,
  checkScheduleConflictSchema,
  createAssessmentSchema,
  bulkRecordScoresSchema,
  correctScoreSchema,
  computeResultsSchema,
  reviewResultsSchema,
  getReportCardQuerySchema,
} from "@/lib/validations/examination";
import { TenantContext } from "@/repositories/types";

export const examinationRouter = Router();

function getTenantContext(req: Request): TenantContext {
  const user = req.user!;
  return {
    organizationId: user.organizationId,
    campusId: user.activeCampusId || undefined,
    userId: user.userId,
    userRoles: user.roles,
  };
}

// All examination endpoints require authentication
examinationRouter.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. OVERVIEW & ANALYTICS
// -----------------------------------------------------------------------------
examinationRouter.get(
  "/overview",
  requirePermission("exams.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await examinationService.getExamOverview(getTenantContext(req));
      return res.json(successResponse(stats, "Examination overview and metrics retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 2. GRADING SCHEMES
// -----------------------------------------------------------------------------
examinationRouter.get(
  "/grading-schemes",
  requirePermission("exams.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schemes = await examinationService.getGradingSchemes(getTenantContext(req));
      return res.json(successResponse(schemes, "Grading schemes retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

examinationRouter.post(
  "/grading-schemes",
  requirePermission("exams.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const val = validateSchema(createGradingSchemeSchema, req.body);
      if (!val.success) {
        return res.status(400).json(
          errorResponse("Invalid grading scheme", "VALIDATION_ERROR", undefined, val.fieldErrors)
        );
      }
      const scheme = await examinationService.createGradingScheme(
        getTenantContext(req),
        val.data
      );
      return res.status(201).json(successResponse(scheme, "Grading scheme created successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 3. ASSESSMENT COMPONENT WEIGHTINGS
// -----------------------------------------------------------------------------
examinationRouter.get(
  "/component-configs",
  requirePermission("exams.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const academicYearId = (req.query.academicYearId as string) || "ay-2025-26";
      const configs = await examinationService.getComponentConfigs(
        getTenantContext(req),
        academicYearId
      );
      return res.json(successResponse(configs, "Assessment component configurations retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

examinationRouter.post(
  "/component-configs",
  requirePermission("exams.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const val = validateSchema(createComponentConfigSchema, req.body);
      if (!val.success) {
        return res.status(400).json(
          errorResponse("Invalid component configuration", "VALIDATION_ERROR", undefined, val.fieldErrors)
        );
      }
      const config = await examinationService.createComponentConfig(
        getTenantContext(req),
        val.data
      );
      return res.status(201).json(successResponse(config, "Component configuration saved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 4. EXAM SESSIONS
// -----------------------------------------------------------------------------
examinationRouter.get(
  "/sessions",
  requirePermission("exams.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const academicYearId = (req.query.academicYearId as string) || undefined;
      const sessions = await examinationService.getExamSessions(
        getTenantContext(req),
        academicYearId
      );
      return res.json(successResponse(sessions, "Exam sessions retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

examinationRouter.post(
  "/sessions",
  requirePermission("exams.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const val = validateSchema(createExamSessionSchema, req.body);
      if (!val.success) {
        return res.status(400).json(
          errorResponse("Invalid exam session", "VALIDATION_ERROR", undefined, val.fieldErrors)
        );
      }
      const session = await examinationService.createExamSession(
        getTenantContext(req),
        val.data
      );
      return res.status(201).json(successResponse(session, "Exam session scheduled."));
    } catch (err) {
      next(err);
    }
  }
);

examinationRouter.patch(
  "/sessions/:id",
  requirePermission("exams.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const val = validateSchema(updateExamSessionSchema, req.body);
      if (!val.success) {
        return res.status(400).json(
          errorResponse("Invalid session update", "VALIDATION_ERROR", undefined, val.fieldErrors)
        );
      }
      const session = await examinationService.updateExamSession(
        getTenantContext(req),
        req.params.id,
        val.data
      );
      return res.json(successResponse(session, "Exam session updated."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 5. EXAM SCHEDULES (TIMETABLE) & CONFLICT CHECKING
// -----------------------------------------------------------------------------
examinationRouter.get(
  "/schedules",
  requirePermission("exams.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const examSessionId = req.query.examSessionId as string;
      if (!examSessionId) {
        return res.status(400).json(errorResponse("examSessionId is required.", "MISSING_PARAM"));
      }
      const schedules = await examinationService.getExamSchedules(
        getTenantContext(req),
        examSessionId
      );
      return res.json(successResponse(schedules, "Exam schedules retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

examinationRouter.post(
  "/schedules/check-conflict",
  requirePermission("exams.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const val = validateSchema(checkScheduleConflictSchema, req.body);
      if (!val.success) {
        return res.status(400).json(
          errorResponse("Invalid conflict check payload", "VALIDATION_ERROR", undefined, val.fieldErrors)
        );
      }
      const conflictResult = await examinationService.checkExamConflicts(
        getTenantContext(req),
        val.data
      );
      return res.json(successResponse(conflictResult, "Conflict evaluation completed."));
    } catch (err) {
      next(err);
    }
  }
);

examinationRouter.post(
  "/schedules",
  requirePermission("exams.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const val = validateSchema(createExamScheduleSchema, req.body);
      if (!val.success) {
        return res.status(400).json(
          errorResponse("Invalid exam schedule payload", "VALIDATION_ERROR", undefined, val.fieldErrors)
        );
      }
      const schedule = await examinationService.createExamSchedule(
        getTenantContext(req),
        val.data
      );
      return res.status(201).json(successResponse(schedule, "Exam schedule item created."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 6. ASSESSMENTS
// -----------------------------------------------------------------------------
examinationRouter.get(
  "/assessments",
  requirePermission("exams.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const academicYearId = (req.query.academicYearId as string) || "ay-2025-26";
      const classId = (req.query.classId as string) || undefined;
      const sectionId = (req.query.sectionId as string) || undefined;
      const subjectId = (req.query.subjectId as string) || undefined;
      const type = (req.query.type as string) || undefined;

      const assessments = await examinationService.getAssessments(getTenantContext(req), {
        academicYearId,
        classId,
        sectionId,
        subjectId,
        type,
      });
      return res.json(successResponse(assessments, "Assessments retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

examinationRouter.get(
  "/assessments/:id",
  requirePermission("exams.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assessment = await examinationService.getAssessmentById(
        getTenantContext(req),
        req.params.id
      );
      return res.json(successResponse(assessment, "Assessment details retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

examinationRouter.post(
  "/assessments",
  requirePermission("exams.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const val = validateSchema(createAssessmentSchema, req.body);
      if (!val.success) {
        return res.status(400).json(
          errorResponse("Invalid assessment payload", "VALIDATION_ERROR", undefined, val.fieldErrors)
        );
      }
      const assessment = await examinationService.createAssessment(
        getTenantContext(req),
        val.data,
        req.user?.userId
      );
      return res.status(201).json(successResponse(assessment, "Assessment created."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 7. SCORES ENTRY & CORRECTIONS
// -----------------------------------------------------------------------------
examinationRouter.get(
  "/assessments/:id/scores",
  requirePermission("exams.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const scores = await examinationService.getScoresForAssessment(
        getTenantContext(req),
        req.params.id
      );
      return res.json(successResponse(scores, "Assessment scores retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

examinationRouter.post(
  "/scores/bulk",
  requirePermission("scores.enter"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const val = validateSchema(bulkRecordScoresSchema, req.body);
      if (!val.success) {
        return res.status(400).json(
          errorResponse("Invalid scores payload", "VALIDATION_ERROR", undefined, val.fieldErrors)
        );
      }
      const result = await examinationService.bulkRecordScores(
        getTenantContext(req),
        val.data,
        req.user?.userId
      );
      return res.json(successResponse(result, "Student scores recorded successfully."));
    } catch (err) {
      next(err);
    }
  }
);

examinationRouter.post(
  "/scores/correct",
  requirePermission("scores.edit"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const val = validateSchema(correctScoreSchema, req.body);
      if (!val.success) {
        return res.status(400).json(
          errorResponse("Invalid correction payload", "VALIDATION_ERROR", undefined, val.fieldErrors)
        );
      }
      const result = await examinationService.correctScore(
        getTenantContext(req),
        val.data,
        req.user!.userId
      );
      return res.json(successResponse(result, "Score corrected with administrative audit trail."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 8. RESULTS COMPUTATION & APPROVAL WORKFLOW
// -----------------------------------------------------------------------------
examinationRouter.post(
  "/results/compute",
  requirePermission("results.compute"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const val = validateSchema(computeResultsSchema, req.body);
      if (!val.success) {
        return res.status(400).json(
          errorResponse("Invalid compute results payload", "VALIDATION_ERROR", undefined, val.fieldErrors)
        );
      }
      const results = await examinationService.computeTermResults(
        getTenantContext(req),
        val.data,
        req.user?.userId
      );
      return res.json(successResponse(results, "Academic results and cohort positions computed."));
    } catch (err) {
      next(err);
    }
  }
);

examinationRouter.post(
  "/results/review",
  requirePermission("results.approve"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const val = validateSchema(reviewResultsSchema, req.body);
      if (!val.success) {
        return res.status(400).json(
          errorResponse("Invalid review results payload", "VALIDATION_ERROR", undefined, val.fieldErrors)
        );
      }
      const result = await examinationService.reviewResults(
        getTenantContext(req),
        val.data,
        req.user!.userId
      );
      return res.json(successResponse(result, `Results updated to status: ${result.newStatus}.`));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 9. STUDENT REPORT CARDS
// -----------------------------------------------------------------------------
examinationRouter.get(
  "/report-card",
  requirePermission("reportcards.generate"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = getReportCardQuerySchema.parse({
        studentId: req.query.studentId,
        academicYearId: req.query.academicYearId,
        termId: req.query.termId,
        classId: req.query.classId,
      });

      const reportCard = await examinationService.getStudentReportCard(
        getTenantContext(req),
        parsed.studentId,
        parsed.academicYearId,
        parsed.termId
      );
      return res.json(successResponse(reportCard, "Student terminal report card generated."));
    } catch (err) {
      next(err);
    }
  }
);
