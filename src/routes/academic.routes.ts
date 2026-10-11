import { Router, Request, Response, NextFunction } from "express";
import { academicService } from "@/services/academic.service";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { successResponse, errorResponse } from "@/lib/api-response";
import { validateSchema } from "@/lib/validations/common";
import {
  createCurriculumSchema,
  updateCurriculumSchema,
  createSubjectCombinationSchema,
  createClassSubjectSchema,
  createTeachingAssignmentSchema,
  assignClassTeacherSchema,
  createLessonPeriodSchema,
  createClassroomRoomSchema,
  createTimetableLessonSchema,
  timetableConflictCheckSchema,
  createTeachingGroupSchema,
} from "@/lib/validations/academic";
import { TenantContext } from "@/repositories/types";

export const academicRouter = Router();

function getTenantContext(req: Request): TenantContext {
  const user = req.user!;
  return {
    organizationId: user.organizationId,
    campusId: user.activeCampusId || undefined,
    userId: user.userId,
    userRoles: user.roles,
  };
}

// All academic routes require authentication
academicRouter.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. ACADEMIC OVERVIEW STATS
// -----------------------------------------------------------------------------
academicRouter.get(
  "/stats",
  requirePermission("academics.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await academicService.getAcademicsOverviewStats(getTenantContext(req));
      return res.json(successResponse(stats, "Academic analytics retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 2. CURRICULUM MANAGEMENT
// -----------------------------------------------------------------------------
academicRouter.get(
  "/curriculums",
  requirePermission("academics.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = (req.query.type as string) || undefined;
      const search = (req.query.search as string) || undefined;
      const items = await academicService.getCurriculums(getTenantContext(req), { type, search });
      return res.json(successResponse(items, "Curriculums retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.post(
  "/curriculums",
  requirePermission("curriculum.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(createCurriculumSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Curriculum validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }
      const created = await academicService.createCurriculum(getTenantContext(req), validation.data);
      return res.status(201).json(successResponse(created, "Curriculum created successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 3. SUBJECT COMBINATIONS / STREAMS
// -----------------------------------------------------------------------------
academicRouter.get(
  "/combinations",
  requirePermission("academics.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stream = (req.query.stream as string) || undefined;
      const items = await academicService.getSubjectCombinations(getTenantContext(req), { stream });
      return res.json(successResponse(items, "Subject combinations retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.post(
  "/combinations",
  requirePermission("curriculum.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(createSubjectCombinationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Combination validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }
      const created = await academicService.createSubjectCombination(getTenantContext(req), validation.data);
      return res.status(201).json(successResponse(created, "Subject combination established."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 4. CLASS SUBJECT ALLOCATIONS
// -----------------------------------------------------------------------------
academicRouter.get(
  "/class-subjects",
  requirePermission("academics.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const classId = (req.query.classId as string) || undefined;
      const sectionId = (req.query.sectionId as string) || undefined;
      const academicYearId = (req.query.academicYearId as string) || undefined;

      const items = await academicService.getClassSubjects(getTenantContext(req), {
        classId,
        sectionId,
        academicYearId,
      });
      return res.json(successResponse(items, "Class subjects retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.post(
  "/class-subjects",
  requirePermission("subjects.assign"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(createClassSubjectSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Class subject allocation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }
      const created = await academicService.allocateSubjectToClass(getTenantContext(req), validation.data);
      return res.status(201).json(successResponse(created, "Subject allocated to class."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.delete(
  "/class-subjects/:id",
  requirePermission("subjects.assign"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await academicService.removeClassSubject(getTenantContext(req), req.params.id);
      return res.json(successResponse(result, "Class subject allocation removed."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 5. TEACHER SUBJECT ASSIGNMENTS & WORKLOAD
// -----------------------------------------------------------------------------
academicRouter.get(
  "/teacher-assignments",
  requirePermission("academics.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = (req.query.staffId as string) || undefined;
      const classId = (req.query.classId as string) || undefined;
      const sectionId = (req.query.sectionId as string) || undefined;
      const academicYearId = (req.query.academicYearId as string) || undefined;

      const items = await academicService.getTeachingAssignments(getTenantContext(req), {
        staffId,
        classId,
        sectionId,
        academicYearId,
      });
      return res.json(successResponse(items, "Teacher assignments retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.post(
  "/teacher-assignments",
  requirePermission("teachers.assign"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(createTeachingAssignmentSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Teaching assignment validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }
      const created = await academicService.createTeachingAssignment(getTenantContext(req), validation.data);
      return res.status(201).json(successResponse(created, "Teacher assigned to subject."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.delete(
  "/teacher-assignments/:id",
  requirePermission("teachers.assign"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await academicService.deleteTeachingAssignment(getTenantContext(req), req.params.id);
      return res.json(successResponse(result, "Teaching assignment deleted."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.post(
  "/class-teachers",
  requirePermission("teachers.assign"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(assignClassTeacherSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Class teacher assignment failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }
      const result = await academicService.assignClassTeacher(getTenantContext(req), validation.data);
      return res.json(successResponse(result, "Class/Form teacher assigned."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.get(
  "/teacher-workload",
  requirePermission("academics.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const staffId = (req.query.staffId as string) || undefined;
      const academicYearId = (req.query.academicYearId as string) || undefined;
      const workload = await academicService.getTeacherWorkload(getTenantContext(req), staffId, academicYearId);
      return res.json(successResponse(workload, "Faculty workload analytics retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 6. BELL SCHEDULE & ROOMS
// -----------------------------------------------------------------------------
academicRouter.get(
  "/periods",
  requirePermission("academics.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const items = await academicService.getLessonPeriods(getTenantContext(req));
      return res.json(successResponse(items, "Lesson periods retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.post(
  "/periods",
  requirePermission("timetable.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(createLessonPeriodSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Period validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }
      const created = await academicService.createLessonPeriod(getTenantContext(req), validation.data);
      return res.status(201).json(successResponse(created, "Lesson period created."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.get(
  "/rooms",
  requirePermission("academics.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const roomType = (req.query.roomType as string) || undefined;
      const items = await academicService.getRooms(getTenantContext(req), undefined, roomType);
      return res.json(successResponse(items, "Classroom rooms retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.post(
  "/rooms",
  requirePermission("timetable.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(createClassroomRoomSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Room validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }
      const created = await academicService.createRoom(getTenantContext(req), validation.data);
      return res.status(201).json(successResponse(created, "Room created successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 7. TIMETABLE & CONFLICT ENGINE
// -----------------------------------------------------------------------------
academicRouter.get(
  "/timetable",
  requirePermission("academics.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const classId = (req.query.classId as string) || undefined;
      const sectionId = (req.query.sectionId as string) || undefined;
      const staffId = (req.query.staffId as string) || undefined;
      const roomId = (req.query.roomId as string) || undefined;
      const academicYearId = (req.query.academicYearId as string) || undefined;

      const items = await academicService.getTimetableMatrix(getTenantContext(req), {
        classId,
        sectionId,
        staffId,
        roomId,
        academicYearId,
      });
      return res.json(successResponse(items, "Timetable matrix retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.post(
  "/timetable/check-conflicts",
  requirePermission("timetable.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(timetableConflictCheckSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Conflict check parameters invalid", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }
      const result = await academicService.checkTimetableConflicts(getTenantContext(req), validation.data);
      return res.json(successResponse(result, "Conflict diagnostic complete."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.post(
  "/timetable",
  requirePermission("timetable.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(createTimetableLessonSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Timetable slot validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }
      const created = await academicService.createTimetableLesson(getTenantContext(req), validation.data);
      return res.status(201).json(successResponse(created, "Timetable slot scheduled successfully."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.delete(
  "/timetable/:id",
  requirePermission("timetable.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await academicService.deleteTimetableLesson(getTenantContext(req), req.params.id);
      return res.json(successResponse(result, "Timetable slot deleted."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 8. TEACHING GROUPS
// -----------------------------------------------------------------------------
academicRouter.get(
  "/teaching-groups",
  requirePermission("academics.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const classId = (req.query.classId as string) || undefined;
      const sectionId = (req.query.sectionId as string) || undefined;
      const subjectId = (req.query.subjectId as string) || undefined;
      const staffId = (req.query.staffId as string) || undefined;

      const items = await academicService.getTeachingGroups(getTenantContext(req), {
        classId,
        sectionId,
        subjectId,
        staffId,
      });
      return res.json(successResponse(items, "Teaching groups retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

academicRouter.post(
  "/teaching-groups",
  requirePermission("academics.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(createTeachingGroupSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse("Teaching group validation failed", "VALIDATION_ERROR", undefined, validation.fieldErrors)
        );
      }
      const created = await academicService.createTeachingGroup(getTenantContext(req), validation.data);
      return res.status(201).json(successResponse(created, "Teaching group established."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 9. STUDENT INHERITED SUBJECTS
// -----------------------------------------------------------------------------
academicRouter.get(
  "/students/:studentId/inherited-subjects",
  requirePermission("academics.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await academicService.getStudentInheritedSubjects(getTenantContext(req), req.params.studentId);
      return res.json(successResponse(result, "Inherited subject catalog calculated."));
    } catch (err) {
      next(err);
    }
  }
);
