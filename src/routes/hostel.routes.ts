import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { hostelService } from "@/services/hostel.service";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { successResponse, errorResponse } from "@/lib/api-response";
import { validateSchema } from "@/lib/validations/common";
import {
  createHostelSchema,
  updateHostelSchema,
  createHostelRoomSchema,
  createStudentHostelAllocationSchema,
  checkoutStudentHostelAllocationSchema,
  recordHostelAttendanceSchema,
  createHostelGatePassSchema,
  updateGatePassStatusSchema,
  updateHostelSettingSchema,
} from "@/lib/validations/hostel";
import { TenantContext } from "@/repositories/types";

export const hostelRouter = Router();

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

hostelRouter.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. Dashboard & Settings
// -----------------------------------------------------------------------------

hostelRouter.get("/overview", requirePermission("hostel.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const stats = await hostelService.getDashboardStats(ctx);
    return res.json(successResponse(stats, "Hostel dashboard metrics retrieved."));
  } catch (error) {
    next(error);
  }
});

hostelRouter.get("/settings", requirePermission("hostel.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const settings = await hostelService.getSettings(ctx);
    return res.json(successResponse(settings, "Hostel settings retrieved."));
  } catch (error) {
    next(error);
  }
});

hostelRouter.put(
  "/settings",
  requirePermission("hostel.settings.manage"),
  validateBody(updateHostelSettingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await hostelService.updateSettings(ctx, req.body);
      return res.json(successResponse(updated, "Hostel boarding policies updated."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 2. Hostel Buildings & Rooms
// -----------------------------------------------------------------------------

hostelRouter.get("/buildings", requirePermission("hostel.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const hostels = await hostelService.getHostels(ctx, { status, search });
    return res.json(successResponse(hostels, "Hostel buildings retrieved."));
  } catch (error) {
    next(error);
  }
});

hostelRouter.get("/buildings/:id", requirePermission("hostel.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const hostel = await hostelService.getHostelById(ctx, req.params.id);
    return res.json(successResponse(hostel, "Hostel building details retrieved."));
  } catch (error) {
    next(error);
  }
});

hostelRouter.post(
  "/buildings",
  requirePermission("hostel.buildings.manage"),
  validateBody(createHostelSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const hostel = await hostelService.createHostel(ctx, req.body);
      return res.status(201).json(successResponse(hostel, "Hostel building registered."));
    } catch (error) {
      next(error);
    }
  }
);

hostelRouter.put(
  "/buildings/:id",
  requirePermission("hostel.buildings.manage"),
  validateBody(updateHostelSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await hostelService.updateHostel(ctx, req.params.id, req.body);
      return res.json(successResponse(updated, "Hostel building updated."));
    } catch (error) {
      next(error);
    }
  }
);

hostelRouter.post(
  "/rooms",
  requirePermission("hostel.buildings.manage"),
  validateBody(createHostelRoomSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const room = await hostelService.createRoom(ctx, req.body);
      return res.status(201).json(successResponse(room, "Hostel room and beds configured."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 3. Allocations & Checkouts
// -----------------------------------------------------------------------------

hostelRouter.get("/allocations", requirePermission("hostel.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const hostelId = req.query.hostelId as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const allocations = await hostelService.getAllocations(ctx, { hostelId, status, search });
    return res.json(successResponse(allocations, "Student hostel allocations retrieved."));
  } catch (error) {
    next(error);
  }
});

hostelRouter.post(
  "/allocations",
  requirePermission("hostel.allocations.manage"),
  validateBody(createStudentHostelAllocationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const allocation = await hostelService.createAllocation(ctx, req.body);
      return res.status(201).json(successResponse(allocation, "Student allocated to hostel bed."));
    } catch (error) {
      next(error);
    }
  }
);

hostelRouter.post(
  "/allocations/checkout",
  requirePermission("hostel.allocations.manage"),
  validateBody(checkoutStudentHostelAllocationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const result = await hostelService.checkoutAllocation(ctx, req.body);
      return res.json(successResponse(result, "Student checked out and bed vacated."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 4. Night Roll Call & Curfew Attendance
// -----------------------------------------------------------------------------

hostelRouter.get("/attendance", requirePermission("hostel.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const hostelId = req.query.hostelId as string | undefined;
    const date = req.query.date as string | undefined;
    const attendances = await hostelService.getAttendances(ctx, { hostelId, date });
    return res.json(successResponse(attendances, "Hostel roll call attendance retrieved."));
  } catch (error) {
    next(error);
  }
});

hostelRouter.post(
  "/attendance",
  requirePermission("hostel.attendance.manage"),
  validateBody(recordHostelAttendanceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const records = await hostelService.recordAttendance(ctx, req.body);
      return res.status(201).json(successResponse(records, "Night roll call attendance recorded."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 5. Gate Passes & Leaves
// -----------------------------------------------------------------------------

hostelRouter.get("/gate-passes", requirePermission("hostel.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const hostelId = req.query.hostelId as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const passes = await hostelService.getGatePasses(ctx, { hostelId, status, search });
    return res.json(successResponse(passes, "Hostel gate passes retrieved."));
  } catch (error) {
    next(error);
  }
});

hostelRouter.post(
  "/gate-passes",
  requirePermission("hostel.gatepass.manage"),
  validateBody(createHostelGatePassSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const pass = await hostelService.createGatePass(ctx, req.body);
      return res.status(201).json(successResponse(pass, "Gate pass request registered."));
    } catch (error) {
      next(error);
    }
  }
);

hostelRouter.put(
  "/gate-passes/:id/status",
  requirePermission("hostel.gatepass.manage"),
  validateBody(updateGatePassStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await hostelService.updateGatePassStatus(ctx, req.body);
      return res.json(successResponse(updated, "Gate pass status updated."));
    } catch (error) {
      next(error);
    }
  }
);
