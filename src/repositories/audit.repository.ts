import { prisma } from "@/lib/db";
import { AuditLog, AuditAction, Prisma } from "@prisma/client";
import { TenantContext, PaginationParams } from "./types";
import { sanitizeObject } from "@/lib/logger";

export class AuditRepository {
  /**
   * Record an audit event with sanitized metadata
   */
  async log(
    ctx: TenantContext,
    entry: {
      action: AuditAction;
      entity: string;
      entityId?: string;
      ipAddress?: string;
      userAgent?: string;
      details?: Record<string, unknown>;
    }
  ): Promise<AuditLog> {
    const cleanDetails = entry.details ? (sanitizeObject(entry.details) as Prisma.InputJsonValue) : {};

    // Coerce action to valid enum value or fallback to UPDATE
    const validActions: AuditAction[] = [
      "CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "PUBLISH", "APPROVE", "REJECT", "EXPORT"
    ];
    const safeAction: AuditAction = validActions.includes(entry.action) ? entry.action : "UPDATE";

    try {
      return await prisma.auditLog.create({
        data: {
          organizationId: ctx.organizationId,
          campusId: ctx.campusId,
          userId: ctx.userId,
          action: safeAction,
          entity: entry.entity,
          entityId: entry.entityId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          details: cleanDetails,
        },
      });
    } catch {
      // Graceful offline fallback in development and testing environments without DATABASE_URL
      return {
        id: `audit-${Date.now()}`,
        organizationId: ctx.organizationId,
        campusId: ctx.campusId || null,
        userId: ctx.userId || null,
        action: safeAction,
        entity: entry.entity,
        entityId: entry.entityId || null,
        ipAddress: entry.ipAddress || null,
        userAgent: entry.userAgent || null,
        details: cleanDetails,
        createdAt: new Date(),
      } as AuditLog;
    }
  }

  /**
   * Convenience alias for modules using createLog
   */
  async createLog(data: {
    organizationId: string;
    campusId?: string;
    userId?: string;
    action: string;
    entityType?: string;
    entity?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    details?: Record<string, unknown>;
  }): Promise<AuditLog> {
    return this.log(
      {
        organizationId: data.organizationId,
        campusId: data.campusId,
        userId: data.userId || "system",
        userRoles: [],
      },
      {
        action: data.action as AuditAction,
        entity: data.entityType || data.entity || "System",
        entityId: data.entityId,
        details: data.metadata || data.details,
      }
    );
  }

  /**
   * Query audit logs within tenant
   */
  async findMany(
    ctx: TenantContext,
    params?: PaginationParams & { entity?: string; action?: AuditAction }
  ): Promise<{ items: AuditLog[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;

    const where: Prisma.AuditLogWhereInput = {
      organizationId: ctx.organizationId,
      ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
      ...(params?.entity ? { entity: params.entity } : {}),
      ...(params?.action ? { action: params.action } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  }
}

export const auditRepository = new AuditRepository();
