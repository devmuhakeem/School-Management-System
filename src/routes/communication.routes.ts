import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { communicationService } from "@/services/communication.service";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { successResponse, errorResponse } from "@/lib/api-response";
import { validateSchema } from "@/lib/validations/common";
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  sendDirectMessageSchema,
  createTemplateSchema,
  updateTemplateSchema,
  updatePreferencesSchema,
  queryAnnouncementsSchema,
  queryNotificationsSchema,
} from "@/lib/validations/communication";
import { TenantContext } from "@/repositories/types";

export const communicationRouter = Router();

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

// All communication routes require an authenticated user
communicationRouter.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. DASHBOARD & OVERVIEW
// -----------------------------------------------------------------------------
communicationRouter.get(
  "/overview",
  requirePermission("communication.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const campusId = (req.query.campusId as string) || req.user?.activeCampusId || undefined;
      const stats = await communicationService.getCommunicationStats(ctx, campusId);
      return res.json(successResponse(stats, "Communication dashboard metrics retrieved."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 2. ANNOUNCEMENTS ENDPOINTS
// -----------------------------------------------------------------------------
communicationRouter.get(
  "/announcements",
  requirePermission("communication.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const queryVal = validateSchema(queryAnnouncementsSchema, req.query);
      const params = queryVal.success ? queryVal.data : { includeExpired: false, page: 1, limit: 20 };
      const result = await communicationService.getAnnouncements(ctx, params);
      return res.json(successResponse(result, "Announcements retrieved."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.get(
  "/announcements/:id",
  requirePermission("communication.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const announcement = await communicationService.getAnnouncementById(ctx, req.params.id);
      return res.json(successResponse(announcement, "Announcement details retrieved."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.post(
  "/announcements",
  requirePermission("communication.announcements.create"),
  validateBody(createAnnouncementSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const announcement = await communicationService.createAnnouncement(ctx, req.body);
      return res.status(201).json(successResponse(announcement, "Announcement created successfully."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.patch(
  "/announcements/:id",
  requirePermission("communication.announcements.manage"),
  validateBody(updateAnnouncementSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const announcement = await communicationService.updateAnnouncement(ctx, req.params.id, req.body);
      return res.json(successResponse(announcement, "Announcement updated successfully."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.post(
  "/announcements/:id/publish",
  requirePermission("communication.announcements.publish"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const announcement = await communicationService.publishAnnouncement(ctx, req.params.id);
      return res.json(successResponse(announcement, "Announcement published and broadcast successfully."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.post(
  "/announcements/:id/archive",
  requirePermission("communication.announcements.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const announcement = await communicationService.archiveAnnouncement(ctx, req.params.id);
      return res.json(successResponse(announcement, "Announcement archived successfully."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.post(
  "/announcements/:id/cancel",
  requirePermission("communication.announcements.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const announcement = await communicationService.cancelAnnouncement(ctx, req.params.id);
      return res.json(successResponse(announcement, "Announcement cancelled successfully."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.delete(
  "/announcements/:id",
  requirePermission("communication.announcements.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const result = await communicationService.deleteAnnouncement(ctx, req.params.id);
      return res.json(successResponse(result, "Draft announcement removed."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 3. TARGETED DIRECT MESSAGING
// -----------------------------------------------------------------------------
communicationRouter.post(
  "/messages/send",
  requirePermission("communication.messages.send"),
  validateBody(sendDirectMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const result = await communicationService.sendDirectMessage(ctx, req.body);
      return res.status(201).json(successResponse(result, "Direct message dispatched successfully."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 4. USER IN-APP NOTIFICATIONS
// -----------------------------------------------------------------------------
communicationRouter.get(
  "/notifications",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const queryVal = validateSchema(queryNotificationsSchema, req.query);
      const params = queryVal.success ? queryVal.data : { unreadOnly: false, limit: 50 };
      const items = await communicationService.getNotifications(ctx, params);
      return res.json(successResponse(items, "Notifications retrieved."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.patch(
  "/notifications/:id/read",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const result = await communicationService.markNotificationAsRead(ctx, req.params.id);
      return res.json(successResponse(result, "Notification marked as read."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.post(
  "/notifications/read-all",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const result = await communicationService.markAllNotificationsAsRead(ctx);
      return res.json(successResponse(result, "All notifications marked as read."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 5. NOTIFICATION TEMPLATES
// -----------------------------------------------------------------------------
communicationRouter.get(
  "/templates",
  requirePermission("communication.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const category = req.query.category as string | undefined;
      const templates = await communicationService.getTemplates(ctx, category);
      return res.json(successResponse(templates, "Templates retrieved."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.post(
  "/templates",
  requirePermission("communication.templates.manage"),
  validateBody(createTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const template = await communicationService.createTemplate(ctx, req.body);
      return res.status(201).json(successResponse(template, "Template created successfully."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.patch(
  "/templates/:id",
  requirePermission("communication.templates.manage"),
  validateBody(updateTemplateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const template = await communicationService.updateTemplate(ctx, req.params.id, req.body);
      return res.json(successResponse(template, "Template updated successfully."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.delete(
  "/templates/:id",
  requirePermission("communication.templates.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const result = await communicationService.deleteTemplate(ctx, req.params.id);
      return res.json(successResponse(result, "Template deleted."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 6. COMMUNICATION PREFERENCES
// -----------------------------------------------------------------------------
communicationRouter.get(
  "/preferences",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const prefs = await communicationService.getPreferences(ctx);
      return res.json(successResponse(prefs, "Preferences retrieved."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.put(
  "/preferences",
  validateBody(updatePreferencesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await communicationService.updatePreferences(ctx, req.body);
      return res.json(successResponse(updated, "Preferences updated successfully."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 7. DELIVERY LOGS & SCHEDULED EXECUTIONS
// -----------------------------------------------------------------------------
communicationRouter.get(
  "/delivery-logs",
  requirePermission("communication.delivery.view"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const announcementId = req.query.announcementId as string | undefined;
      const channel = req.query.channel as string | undefined;
      const status = req.query.status as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

      const logs = await communicationService.getDeliveryLogs(ctx, {
        announcementId,
        channel,
        status,
        limit,
      });
      return res.json(successResponse(logs, "Delivery logs retrieved."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.post(
  "/delivery-logs/:id/retry",
  requirePermission("communication.delivery.view"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const retried = await communicationService.retryFailedDelivery(ctx, req.params.id);
      return res.json(successResponse(retried, "Delivery retry initiated."));
    } catch (error) {
      next(error);
    }
  }
);

communicationRouter.post(
  "/scheduled/process",
  requirePermission("communication.announcements.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const result = await communicationService.processScheduledAnnouncements(ctx);
      return res.json(successResponse(result, "Scheduled and expiring announcements processed."));
    } catch (error) {
      next(error);
    }
  }
);
