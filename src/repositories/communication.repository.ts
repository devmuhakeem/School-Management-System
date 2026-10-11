import { prisma } from "@/lib/db";
import { Announcement, NotificationTemplate, CommunicationPreference, NotificationDeliveryLog, Prisma } from "@prisma/client";
import { TenantContext } from "./types";

export class CommunicationRepository {
  /**
   * Find announcements scoped to organization and optional campus
   */
  async findAnnouncements(
    ctx: TenantContext,
    params: {
      status?: any;
      category?: string;
      campusId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Announcement[]> {
    return prisma.announcement.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...(params.campusId ? { campusId: params.campusId } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.category ? { category: params.category } : {}),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        campus: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      take: params.limit || 50,
      skip: params.offset || 0,
    });
  }

  /**
   * Find an announcement by ID
   */
  async findAnnouncementById(ctx: TenantContext, id: string): Promise<Announcement | null> {
    return prisma.announcement.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        campus: true,
        deliveryLogs: {
          take: 20,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  /**
   * Create an announcement
   */
  async createAnnouncement(
    ctx: TenantContext,
    data: Omit<Prisma.AnnouncementUncheckedCreateInput, "organizationId">
  ): Promise<Announcement> {
    return prisma.announcement.create({
      data: {
        ...data,
        organizationId: ctx.organizationId,
      },
    });
  }

  /**
   * Update an announcement
   */
  async updateAnnouncement(
    ctx: TenantContext,
    id: string,
    data: Prisma.AnnouncementUncheckedUpdateInput
  ): Promise<Announcement> {
    return prisma.announcement.update({
      where: { id },
      data,
    });
  }

  /**
   * Find notification templates for organization
   */
  async findTemplates(ctx: TenantContext, category?: string): Promise<NotificationTemplate[]> {
    return prisma.notificationTemplate.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...(category ? { category } : {}),
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Find a notification template by unique code
   */
  async findTemplateByCode(ctx: TenantContext, code: string): Promise<NotificationTemplate | null> {
    return prisma.notificationTemplate.findUnique({
      where: {
        organizationId_code: {
          organizationId: ctx.organizationId,
          code,
        },
      },
    });
  }

  /**
   * Find communication preferences for a user
   */
  async findUserPreferences(ctx: TenantContext, userId: string): Promise<CommunicationPreference[]> {
    return prisma.communicationPreference.findMany({
      where: {
        organizationId: ctx.organizationId,
        userId,
      },
    });
  }

  /**
   * Find delivery logs
   */
  async findDeliveryLogs(
    ctx: TenantContext,
    params: { announcementId?: string; recipientId?: string; limit?: number } = {}
  ): Promise<NotificationDeliveryLog[]> {
    return prisma.notificationDeliveryLog.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...(params.announcementId ? { announcementId: params.announcementId } : {}),
        ...(params.recipientId ? { recipientId: params.recipientId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: params.limit || 50,
    });
  }
}

export const communicationRepository = new CommunicationRepository();
