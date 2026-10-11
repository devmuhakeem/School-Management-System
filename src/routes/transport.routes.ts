import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { transportService } from "@/services/transport.service";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { successResponse, errorResponse } from "@/lib/api-response";
import { validateSchema } from "@/lib/validations/common";
import {
  createVehicleSchema,
  updateVehicleSchema,
  createTransportDriverSchema,
  updateTransportDriverSchema,
  createTransportRouteSchema,
  updateTransportRouteSchema,
  createStudentTransportAllocationSchema,
  updateStudentTransportAllocationSchema,
  updateTransportSettingSchema,
} from "@/lib/validations/transport";
import { TenantContext } from "@/repositories/types";

export const transportRouter = Router();

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

transportRouter.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. Dashboard & Settings
// -----------------------------------------------------------------------------

transportRouter.get("/overview", requirePermission("transport.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const stats = await transportService.getDashboardStats(ctx);
    return res.json(successResponse(stats, "Transport dashboard metrics retrieved."));
  } catch (error) {
    next(error);
  }
});

transportRouter.get("/settings", requirePermission("transport.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const settings = await transportService.getSettings(ctx);
    return res.json(successResponse(settings, "Transport settings retrieved."));
  } catch (error) {
    next(error);
  }
});

transportRouter.put(
  "/settings",
  requirePermission("transport.settings.manage"),
  validateBody(updateTransportSettingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await transportService.updateSettings(ctx, req.body);
      return res.json(successResponse(updated, "Transport settings updated."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 2. Fleet & Vehicles
// -----------------------------------------------------------------------------

transportRouter.get("/vehicles", requirePermission("transport.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const vehicles = await transportService.getVehicles(ctx, { status, search });
    return res.json(successResponse(vehicles, "Transport fleet vehicles retrieved."));
  } catch (error) {
    next(error);
  }
});

transportRouter.get("/vehicles/:id", requirePermission("transport.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const vehicle = await transportService.getVehicleById(ctx, req.params.id);
    return res.json(successResponse(vehicle, "Vehicle details retrieved."));
  } catch (error) {
    next(error);
  }
});

transportRouter.post(
  "/vehicles",
  requirePermission("transport.fleet.manage"),
  validateBody(createVehicleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const vehicle = await transportService.createVehicle(ctx, req.body);
      return res.status(201).json(successResponse(vehicle, "Vehicle added to fleet."));
    } catch (error) {
      next(error);
    }
  }
);

transportRouter.put(
  "/vehicles/:id",
  requirePermission("transport.fleet.manage"),
  validateBody(updateVehicleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await transportService.updateVehicle(ctx, req.params.id, req.body);
      return res.json(successResponse(updated, "Vehicle details updated."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 3. Drivers
// -----------------------------------------------------------------------------

transportRouter.get("/drivers", requirePermission("transport.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const drivers = await transportService.getDrivers(ctx, { status, search });
    return res.json(successResponse(drivers, "Transport drivers retrieved."));
  } catch (error) {
    next(error);
  }
});

transportRouter.post(
  "/drivers",
  requirePermission("transport.fleet.manage"),
  validateBody(createTransportDriverSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const driver = await transportService.createDriver(ctx, req.body);
      return res.status(201).json(successResponse(driver, "Driver profile registered."));
    } catch (error) {
      next(error);
    }
  }
);

transportRouter.put(
  "/drivers/:id",
  requirePermission("transport.fleet.manage"),
  validateBody(updateTransportDriverSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await transportService.updateDriver(ctx, req.params.id, req.body);
      return res.json(successResponse(updated, "Driver profile updated."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 4. Routes & Stops
// -----------------------------------------------------------------------------

transportRouter.get("/routes", requirePermission("transport.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const routes = await transportService.getRoutes(ctx, { status, search });
    return res.json(successResponse(routes, "Transport routes retrieved."));
  } catch (error) {
    next(error);
  }
});

transportRouter.get("/routes/:id", requirePermission("transport.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const route = await transportService.getRouteById(ctx, req.params.id);
    return res.json(successResponse(route, "Route schedule and stops retrieved."));
  } catch (error) {
    next(error);
  }
});

transportRouter.post(
  "/routes",
  requirePermission("transport.routes.manage"),
  validateBody(createTransportRouteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const route = await transportService.createRoute(ctx, req.body);
      return res.status(201).json(successResponse(route, "Transport route created."));
    } catch (error) {
      next(error);
    }
  }
);

transportRouter.put(
  "/routes/:id",
  requirePermission("transport.routes.manage"),
  validateBody(updateTransportRouteSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await transportService.updateRoute(ctx, req.params.id, req.body);
      return res.json(successResponse(updated, "Transport route updated."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 5. Student Allocations
// -----------------------------------------------------------------------------

transportRouter.get("/allocations", requirePermission("transport.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const routeId = req.query.routeId as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const allocations = await transportService.getAllocations(ctx, { routeId, status, search });
    return res.json(successResponse(allocations, "Student transport allocations retrieved."));
  } catch (error) {
    next(error);
  }
});

transportRouter.post(
  "/allocations",
  requirePermission("transport.allocations.manage"),
  validateBody(createStudentTransportAllocationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const allocation = await transportService.createAllocation(ctx, req.body);
      return res.status(201).json(successResponse(allocation, "Student assigned to transport route."));
    } catch (error) {
      next(error);
    }
  }
);

transportRouter.put(
  "/allocations/:id",
  requirePermission("transport.allocations.manage"),
  validateBody(updateStudentTransportAllocationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await transportService.updateAllocation(ctx, req.params.id, req.body);
      return res.json(successResponse(updated, "Student transport allocation updated."));
    } catch (error) {
      next(error);
    }
  }
);
