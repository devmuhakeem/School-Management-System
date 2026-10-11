import { Router, Request, Response, NextFunction } from "express";
import { adminService } from "@/services/admin.service";
import { TenantContext } from "@/repositories/types";
import { successResponse, errorResponse } from "@/lib/api-response";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { validateSchema } from "@/lib/validations/common";
import {
  updateOrganizationSchema,
  campusSchema,
  academicYearSchema,
  termSchema,
  classLevelSchema,
  classSchema,
  sectionSchema,
  subjectSchema,
  departmentSchema,
  positionSchema,
  updateUserStatusSchema,
  updateUserRolesSchema,
  updateUserCampusesSchema,
  schoolSettingsSchema,
} from "@/lib/validations/admin";

export const adminRouter = Router();

// Helper to extract strict server-side TenantContext
function getTenantContext(req: Request): TenantContext {
  const user = req.user!;
  return {
    organizationId: user.organizationId,
    campusId: user.activeCampusId || undefined,
    userId: user.userId,
    userRoles: user.roles,
  };
}

// All admin routes require authentication
adminRouter.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. DASHBOARD OVERVIEW STATS
// -----------------------------------------------------------------------------
adminRouter.get("/dashboard/stats", requirePermission("dashboard.view"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await adminService.getDashboardStats(getTenantContext(req));
    return res.json(successResponse(stats, "Dashboard metrics loaded."));
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 2. ORGANIZATION MANAGEMENT
// -----------------------------------------------------------------------------
adminRouter.get("/organization", requirePermission("organizations.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const org = await adminService.getOrganization(getTenantContext(req));
    return res.json(successResponse(org, "Organization details retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/organization", requirePermission("organizations.update"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(updateOrganizationSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid organization update payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const updated = await adminService.updateOrganization(getTenantContext(req), validation.data);
    return res.json(successResponse(updated, "Organization updated successfully."));
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 3. CAMPUS MANAGEMENT
// -----------------------------------------------------------------------------
adminRouter.get("/campuses", requirePermission("campuses.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campuses = await adminService.getCampuses(getTenantContext(req));
    return res.json(successResponse(campuses, "Campuses retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/campuses", requirePermission("campuses.create"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(campusSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid campus payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const created = await adminService.createCampus(getTenantContext(req), validation.data);
    return res.status(201).json(successResponse(created, "Campus created successfully."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/campuses/:id", requirePermission("campuses.update"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(campusSchema.partial(), req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid campus update payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const updated = await adminService.updateCampus(getTenantContext(req), req.params.id, validation.data);
    return res.json(successResponse(updated, "Campus updated successfully."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/campuses/:id/toggle-status", requirePermission("campuses.update"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const toggled = await adminService.toggleCampusStatus(getTenantContext(req), req.params.id);
    return res.json(successResponse(toggled, "Campus status updated."));
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 4. ACADEMIC YEARS & SESSIONS
// -----------------------------------------------------------------------------
adminRouter.get("/academic-years", requirePermission("academics.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await adminService.getAcademicYears(getTenantContext(req));
    return res.json(successResponse(list, "Academic years retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/academic-years", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(academicYearSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid academic year payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const created = await adminService.createAcademicYear(getTenantContext(req), validation.data);
    return res.status(201).json(successResponse(created, "Academic year created."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/academic-years/:id", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.updateAcademicYear(getTenantContext(req), req.params.id, req.body);
    return res.json(successResponse(updated, "Academic year updated."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/academic-years/:id/set-current", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.setCurrentAcademicYear(getTenantContext(req), req.params.id);
    return res.json(successResponse(updated, "Current academic year set successfully."));
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 5. TERMS
// -----------------------------------------------------------------------------
adminRouter.get("/terms", requirePermission("academics.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const academicYearId = typeof req.query.academicYearId === "string" ? req.query.academicYearId : undefined;
    const terms = await adminService.getTerms(getTenantContext(req), academicYearId);
    return res.json(successResponse(terms, "Terms retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/terms", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(termSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid term payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const created = await adminService.createTerm(getTenantContext(req), validation.data);
    return res.status(201).json(successResponse(created, "Term created."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/terms/:id", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.updateTerm(getTenantContext(req), req.params.id, req.body);
    return res.json(successResponse(updated, "Term updated."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/terms/:id/set-current", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.setCurrentTerm(getTenantContext(req), req.params.id);
    return res.json(successResponse(updated, "Current term activated."));
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 6. CLASS LEVELS, CLASSES & SECTIONS
// -----------------------------------------------------------------------------
adminRouter.get("/class-levels", requirePermission("academics.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campusId = typeof req.query.campusId === "string" ? req.query.campusId : undefined;
    const levels = await adminService.getClassLevels(getTenantContext(req), campusId);
    return res.json(successResponse(levels, "Class levels retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/class-levels", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(classLevelSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid class level payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const created = await adminService.createClassLevel(getTenantContext(req), validation.data);
    return res.status(201).json(successResponse(created, "Class level created."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/class-levels/:id", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.updateClassLevel(getTenantContext(req), req.params.id, req.body);
    return res.json(successResponse(updated, "Class level updated."));
  } catch (error) {
    next(error);
  }
});

adminRouter.delete("/class-levels/:id", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = await adminService.deleteClassLevel(getTenantContext(req), req.params.id);
    return res.json(successResponse(deleted, "Class level deleted."));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/classes", requirePermission("academics.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const academicYearId = typeof req.query.academicYearId === "string" ? req.query.academicYearId : undefined;
    const campusId = typeof req.query.campusId === "string" ? req.query.campusId : undefined;
    const classes = await adminService.getClasses(getTenantContext(req), academicYearId, campusId);
    return res.json(successResponse(classes, "Classes retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/classes", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(classSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid class payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const created = await adminService.createClass(getTenantContext(req), validation.data);
    return res.status(201).json(successResponse(created, "Class created."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/classes/:id", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.updateClass(getTenantContext(req), req.params.id, req.body);
    return res.json(successResponse(updated, "Class updated."));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/sections", requirePermission("academics.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const classId = typeof req.query.classId === "string" ? req.query.classId : undefined;
    const sections = await adminService.getSections(getTenantContext(req), classId);
    return res.json(successResponse(sections, "Sections retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/sections", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(sectionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid section payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const created = await adminService.createSection(getTenantContext(req), validation.data);
    return res.status(201).json(successResponse(created, "Section created."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/sections/:id", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.updateSection(getTenantContext(req), req.params.id, req.body);
    return res.json(successResponse(updated, "Section updated."));
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 7. SUBJECTS
// -----------------------------------------------------------------------------
adminRouter.get("/subjects", requirePermission("academics.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campusId = typeof req.query.campusId === "string" ? req.query.campusId : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const subjects = await adminService.getSubjects(getTenantContext(req), campusId, search);
    return res.json(successResponse(subjects, "Subjects retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/subjects", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(subjectSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid subject payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const created = await adminService.createSubject(getTenantContext(req), validation.data);
    return res.status(201).json(successResponse(created, "Subject created."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/subjects/:id", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.updateSubject(getTenantContext(req), req.params.id, req.body);
    return res.json(successResponse(updated, "Subject updated."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/subjects/:id/toggle-status", requirePermission("academics.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.toggleSubjectStatus(getTenantContext(req), req.params.id);
    return res.json(successResponse(updated, "Subject status toggled."));
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 8. DEPARTMENTS & POSITIONS
// -----------------------------------------------------------------------------
adminRouter.get("/departments", requirePermission("settings.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campusId = typeof req.query.campusId === "string" ? req.query.campusId : undefined;
    const departments = await adminService.getDepartments(getTenantContext(req), campusId);
    return res.json(successResponse(departments, "Departments retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/departments", requirePermission("settings.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(departmentSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid department payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const created = await adminService.createDepartment(getTenantContext(req), validation.data);
    return res.status(201).json(successResponse(created, "Department created."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/departments/:id", requirePermission("settings.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.updateDepartment(getTenantContext(req), req.params.id, req.body);
    return res.json(successResponse(updated, "Department updated."));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/positions", requirePermission("settings.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const campusId = typeof req.query.campusId === "string" ? req.query.campusId : undefined;
    const positions = await adminService.getPositions(getTenantContext(req), campusId);
    return res.json(successResponse(positions, "Positions retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.post("/positions", requirePermission("settings.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(positionSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid position payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const created = await adminService.createPosition(getTenantContext(req), validation.data);
    return res.status(201).json(successResponse(created, "Position created."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/positions/:id", requirePermission("settings.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await adminService.updatePosition(getTenantContext(req), req.params.id, req.body);
    return res.json(successResponse(updated, "Position updated."));
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 9. STAFF DIRECTORY FOUNDATION
// -----------------------------------------------------------------------------
adminRouter.get("/staff", requirePermission("users.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      departmentId: typeof req.query.departmentId === "string" ? req.query.departmentId : undefined,
      positionId: typeof req.query.positionId === "string" ? req.query.positionId : undefined,
      campusId: typeof req.query.campusId === "string" ? req.query.campusId : undefined,
      search: typeof req.query.search === "string" ? req.query.search : undefined,
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
    };

    const staffData = await adminService.getStaffDirectory(getTenantContext(req), filters);
    return res.json(successResponse(staffData.items, "Staff directory retrieved.", staffData.meta));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/staff/:id", requirePermission("users.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const staffProfile = await adminService.getStaffProfile(getTenantContext(req), req.params.id);
    return res.json(successResponse(staffProfile, "Staff profile retrieved."));
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 10. USER ADMINISTRATION & ROLES
// -----------------------------------------------------------------------------
adminRouter.get("/users", requirePermission("users.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const users = await adminService.getUsers(getTenantContext(req), search);
    return res.json(successResponse(users, "User accounts retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/users/:id/status", requirePermission("users.update"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(updateUserStatusSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid user status payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const updated = await adminService.updateUserStatus(getTenantContext(req), req.params.id, validation.data.status);
    return res.json(successResponse(updated, "User account status updated."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/users/:id/roles", requirePermission("roles.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(updateUserRolesSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid user roles payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const updated = await adminService.updateUserRoles(getTenantContext(req), req.params.id, validation.data.roles);
    return res.json(successResponse(updated, "User roles updated."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/users/:id/campuses", requirePermission("campuses.update"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(updateUserCampusesSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid user campuses payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const updated = await adminService.updateUserCampuses(getTenantContext(req), req.params.id, validation.data.campusIds);
    return res.json(successResponse(updated, "User campus access updated."));
  } catch (error) {
    next(error);
  }
});

adminRouter.get("/roles-list", requirePermission("roles.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await adminService.getRoles(getTenantContext(req));
    return res.json(successResponse(roles, "System roles retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/roles/:id/permissions", requirePermission("roles.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];
    const updated = await adminService.updateRolePermissions(getTenantContext(req), req.params.id, permissions);
    return res.json(successResponse(updated, "Role permissions updated."));
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------------------------
// 11. SCHOOL SETTINGS
// -----------------------------------------------------------------------------
adminRouter.get("/settings", requirePermission("settings.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await adminService.getSettings(getTenantContext(req));
    return res.json(successResponse(settings, "School settings retrieved."));
  } catch (error) {
    next(error);
  }
});

adminRouter.put("/settings", requirePermission("settings.manage"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(schoolSettingsSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse("Invalid settings payload", "VALIDATION_ERROR", undefined, validation.fieldErrors)
      );
    }

    const updated = await adminService.updateSettings(getTenantContext(req), validation.data);
    return res.json(successResponse(updated, "School settings updated."));
  } catch (error) {
    next(error);
  }
});
