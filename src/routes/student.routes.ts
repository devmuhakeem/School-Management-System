import { Router, Request, Response, NextFunction } from "express";
import { studentService } from "@/services/student.service";
import { requireAuth } from "@/lib/auth/guards";
import { requirePermission } from "@/lib/auth/guards";
import { successResponse, errorResponse } from "@/lib/api-response";
import { validateSchema } from "@/lib/validations/common";
import {
  createStudentWithEnrollmentSchema,
  updateStudentSchema,
  updateStudentStatusSchema,
  promoteStudentSchema,
  transferStudentSchema,
  createGuardianInputSchema,
  linkStudentGuardianSchema,
  createAdmissionApplicationSchema,
  reviewAdmissionApplicationSchema,
  enrollAdmissionApplicationSchema,
  studentDocumentUploadSchema,
} from "@/lib/validations/student";
import { TenantContext } from "@/repositories/types";

export const studentRouter = Router();

// Helper to construct TenantContext from authenticated request
function getTenantContext(req: Request): TenantContext {
  const user = req.user!;
  return {
    organizationId: user.organizationId,
    campusId: user.activeCampusId || undefined,
    userId: user.userId,
    userRoles: user.roles,
  };
}

// -----------------------------------------------------------------------------
// 1. STATS
// -----------------------------------------------------------------------------

/**
 * GET /api/students/stats
 */
studentRouter.get(
  "/stats",
  requireAuth,
  requirePermission("students.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await studentService.getStudentStats(getTenantContext(req));
      return res.json(successResponse(stats, "Student metrics retrieved successfully."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/students/generate-admission-number
 */
studentRouter.get(
  "/generate-admission-number",
  requireAuth,
  requirePermission("students.create"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const admissionNumber = await studentService.generateAdmissionNumber(getTenantContext(req));
      return res.json(successResponse({ admissionNumber }, "Generated unique admission number."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 2. STUDENT DIRECTORY (LIST & SEARCH)
// -----------------------------------------------------------------------------

/**
 * GET /api/students
 */
studentRouter.get(
  "/",
  requireAuth,
  requirePermission("students.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = (req.query.search as string) || undefined;
      const status = (req.query.status as string) || undefined;
      const campusId = (req.query.campusId as string) || undefined;
      const classId = (req.query.classId as string) || undefined;
      const sectionId = (req.query.sectionId as string) || undefined;
      const academicYearId = (req.query.academicYearId as string) || undefined;
      const sortBy = (req.query.sortBy as string) || undefined;
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || undefined;

      const result = await studentService.getStudents(getTenantContext(req), {
        page,
        limit,
        search,
        status,
        campusId,
        classId,
        sectionId,
        academicYearId,
        sortBy,
        sortOrder,
      });

      return res.json(
        successResponse(
          result.items,
          "Student directory records retrieved successfully.",
          result.pagination
        )
      );
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/students
 * Register a new student with atomic enrollment and guardian creation
 */
studentRouter.post(
  "/",
  requireAuth,
  requirePermission("students.create"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(createStudentWithEnrollmentSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(
            "Validation failed for student registration",
            "VALIDATION_ERROR",
            undefined,
            validation.fieldErrors
          )
        );
      }

      const created = await studentService.createStudent(getTenantContext(req), validation.data);
      return res.status(201).json(
        successResponse(created, "Student registered and enrolled successfully.")
      );
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 3. STUDENT PROFILE & SPECIFIC WORKFLOWS
// -----------------------------------------------------------------------------

/**
 * GET /api/students/:id
 */
studentRouter.get(
  "/:id",
  requireAuth,
  requirePermission("students.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const student = await studentService.getStudentById(getTenantContext(req), req.params.id);
      return res.json(successResponse(student, "Student profile retrieved successfully."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PUT /api/students/:id
 * Update editable profile details
 */
studentRouter.put(
  "/:id",
  requireAuth,
  requirePermission("students.update"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(updateStudentSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(
            "Validation failed for student profile update",
            "VALIDATION_ERROR",
            undefined,
            validation.fieldErrors
          )
        );
      }

      const updated = await studentService.updateStudent(
        getTenantContext(req),
        req.params.id,
        validation.data
      );
      return res.json(successResponse(updated, "Student profile updated successfully."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/students/:id/status
 * Controlled status change
 */
studentRouter.post(
  "/:id/status",
  requireAuth,
  requirePermission("students.update"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(updateStudentStatusSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(
            "Validation failed for status change",
            "VALIDATION_ERROR",
            undefined,
            validation.fieldErrors
          )
        );
      }

      const updated = await studentService.updateStudentStatus(
        getTenantContext(req),
        req.params.id,
        validation.data.status,
        validation.data.reason
      );
      return res.json(successResponse(updated, "Student status updated successfully."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/students/:id/promote
 * Academic promotion to next class
 */
studentRouter.post(
  "/:id/promote",
  requireAuth,
  requirePermission("students.update"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(promoteStudentSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(
            "Validation failed for student promotion",
            "VALIDATION_ERROR",
            undefined,
            validation.fieldErrors
          )
        );
      }

      const updated = await studentService.promoteStudent(
        getTenantContext(req),
        req.params.id,
        validation.data
      );
      return res.json(successResponse(updated, "Student promoted successfully."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/students/:id/transfer
 * Campus or class transfer
 */
studentRouter.post(
  "/:id/transfer",
  requireAuth,
  requirePermission("students.update"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(transferStudentSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(
            "Validation failed for student transfer",
            "VALIDATION_ERROR",
            undefined,
            validation.fieldErrors
          )
        );
      }

      const updated = await studentService.transferStudent(
        getTenantContext(req),
        req.params.id,
        validation.data
      );
      return res.json(successResponse(updated, "Student transfer completed successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 4. GUARDIAN RELATIONSHIPS FOR STUDENT
// -----------------------------------------------------------------------------

/**
 * POST /api/students/:id/guardians
 * Link a guardian to a student
 */
studentRouter.post(
  "/:id/guardians",
  requireAuth,
  requirePermission("students.update"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(linkStudentGuardianSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(
            "Validation failed for linking guardian",
            "VALIDATION_ERROR",
            undefined,
            validation.fieldErrors
          )
        );
      }

      const updated = await studentService.linkGuardianToStudent(
        getTenantContext(req),
        req.params.id,
        validation.data
      );
      return res.json(successResponse(updated, "Guardian linked to student successfully."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/students/:id/guardians/:guardianId
 */
studentRouter.delete(
  "/:id/guardians/:guardianId",
  requireAuth,
  requirePermission("students.update"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await studentService.unlinkGuardianFromStudent(
        getTenantContext(req),
        req.params.id,
        req.params.guardianId
      );
      return res.json(successResponse(updated, "Guardian unlinked successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 5. DOCUMENTS
// -----------------------------------------------------------------------------

/**
 * GET /api/students/:id/documents
 */
studentRouter.get(
  "/:id/documents",
  requireAuth,
  requirePermission("students.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const docs = await studentService.getStudentDocuments(getTenantContext(req), req.params.id);
      return res.json(successResponse(docs, "Student documents retrieved successfully."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/students/:id/documents
 */
studentRouter.post(
  "/:id/documents",
  requireAuth,
  requirePermission("students.update"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(studentDocumentUploadSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(
            "Validation failed for document upload",
            "VALIDATION_ERROR",
            undefined,
            validation.fieldErrors
          )
        );
      }

      const doc = await studentService.uploadStudentDocument(
        getTenantContext(req),
        req.params.id,
        validation.data
      );
      return res.status(201).json(successResponse(doc, "Document uploaded successfully."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/students/:id/documents/:documentId
 */
studentRouter.delete(
  "/:id/documents/:documentId",
  requireAuth,
  requirePermission("students.delete"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await studentService.deleteStudentDocument(
        getTenantContext(req),
        req.params.id,
        req.params.documentId
      );
      return res.json(successResponse(result, "Document deleted successfully."));
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/students/:id/documents/:documentId/download
 */
studentRouter.get(
  "/:id/documents/:documentId/download",
  requireAuth,
  requirePermission("students.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const doc = await studentService.getStudentDocumentById(
        getTenantContext(req),
        req.params.id,
        req.params.documentId
      );

      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
      res.setHeader("Content-Type", doc.mimeType || "application/octet-stream");

      return res.json(
        successResponse(
          {
            id: doc.id,
            fileName: doc.fileName,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
            downloadReady: true,
          },
          "Document download authorized."
        )
      );
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 6. GUARDIAN REGISTRY ENDPOINTS
// -----------------------------------------------------------------------------
export const guardianRouter = Router();

guardianRouter.get(
  "/",
  requireAuth,
  requirePermission("students.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = (req.query.search as string) || undefined;

      const result = await studentService.getGuardians(getTenantContext(req), {
        page,
        limit,
        search,
      });

      return res.json(
        successResponse(result.items, "Guardian directory retrieved.", result.pagination)
      );
    } catch (err) {
      next(err);
    }
  }
);

guardianRouter.post(
  "/",
  requireAuth,
  requirePermission("students.create"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(createGuardianInputSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(
            "Validation failed for guardian creation",
            "VALIDATION_ERROR",
            undefined,
            validation.fieldErrors
          )
        );
      }

      const created = await studentService.createGuardian(getTenantContext(req), validation.data);
      return res.status(201).json(successResponse(created, "Guardian record created successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 7. ADMISSIONS PIPELINE ENDPOINTS
// -----------------------------------------------------------------------------
export const admissionRouter = Router();

admissionRouter.get(
  "/stats",
  requireAuth,
  requirePermission("admissions.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await studentService.getAdmissionsStats(getTenantContext(req));
      return res.json(successResponse(stats, "Admissions statistics retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

admissionRouter.get(
  "/",
  requireAuth,
  requirePermission("admissions.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const search = (req.query.search as string) || undefined;
      const status = (req.query.status as string) || undefined;
      const campusId = (req.query.campusId as string) || undefined;
      const academicYearId = (req.query.academicYearId as string) || undefined;
      const classId = (req.query.classId as string) || undefined;

      const result = await studentService.getAdmissionApplications(getTenantContext(req), {
        page,
        limit,
        search,
        status,
        campusId,
        academicYearId,
        classId,
      });

      return res.json(
        successResponse(result.items, "Admission applications retrieved.", result.pagination)
      );
    } catch (err) {
      next(err);
    }
  }
);

admissionRouter.post(
  "/",
  requireAuth,
  requirePermission("admissions.create"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(createAdmissionApplicationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(
            "Validation failed for admission application",
            "VALIDATION_ERROR",
            undefined,
            validation.fieldErrors
          )
        );
      }

      const created = await studentService.createAdmissionApplication(
        getTenantContext(req),
        validation.data
      );
      return res.status(201).json(
        successResponse(created, "Admission application submitted successfully.")
      );
    } catch (err) {
      next(err);
    }
  }
);

admissionRouter.get(
  "/:id",
  requireAuth,
  requirePermission("admissions.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const app = await studentService.getAdmissionApplicationById(
        getTenantContext(req),
        req.params.id
      );
      return res.json(successResponse(app, "Admission application details retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

admissionRouter.post(
  "/:id/review",
  requireAuth,
  requirePermission("admissions.approve"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(reviewAdmissionApplicationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(
            "Validation failed for application review",
            "VALIDATION_ERROR",
            undefined,
            validation.fieldErrors
          )
        );
      }

      const updated = await studentService.reviewAdmissionApplication(
        getTenantContext(req),
        req.params.id,
        validation.data
      );
      return res.json(successResponse(updated, "Application review updated successfully."));
    } catch (err) {
      next(err);
    }
  }
);

admissionRouter.post(
  "/:id/enroll",
  requireAuth,
  requirePermission("admissions.approve"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validation = validateSchema(enrollAdmissionApplicationSchema, req.body);
      if (!validation.success) {
        return res.status(400).json(
          errorResponse(
            "Validation failed for applicant enrollment",
            "VALIDATION_ERROR",
            undefined,
            validation.fieldErrors
          )
        );
      }

      const result = await studentService.enrollApprovedApplication(
        getTenantContext(req),
        req.params.id,
        validation.data
      );
      return res.status(201).json(
        successResponse(result, "Applicant successfully admitted and enrolled as student.")
      );
    } catch (err) {
      next(err);
    }
  }
);
