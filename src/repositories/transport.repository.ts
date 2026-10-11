import { prisma } from "@/lib/db";
import { TenantContext } from "./types";
import { logger } from "@/lib/logger";

export class TransportRepository {
  private async safeDb<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      logger.warn("Database operation failed in TransportRepository, fallback to memory state", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async getSettings(ctx: TenantContext) {
    return this.safeDb(async () => {
      return prisma.transportSetting.findFirst({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
        },
      });
    });
  }

  async getVehicles(ctx: TenantContext, params?: { status?: string }) {
    return this.safeDb(async () => {
      return prisma.vehicle.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
          ...(params?.status ? { status: params.status as any } : {}),
        },
        include: {
          routes: true,
        },
        orderBy: { registrationNumber: "asc" },
      });
    });
  }

  async getDrivers(ctx: TenantContext, params?: { status?: string }) {
    return this.safeDb(async () => {
      return prisma.transportDriver.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
          ...(params?.status ? { status: params.status } : {}),
        },
        include: {
          routes: true,
        },
        orderBy: { fullName: "asc" },
      });
    });
  }

  async getRoutes(ctx: TenantContext, params?: { status?: string }) {
    return this.safeDb(async () => {
      return prisma.transportRoute.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
          ...(params?.status ? { status: params.status } : {}),
        },
        include: {
          vehicle: true,
          driver: true,
          stops: { orderBy: { stopOrder: "asc" } },
          _count: { select: { allocations: true } },
        },
        orderBy: { code: "asc" },
      });
    });
  }

  async getAllocations(ctx: TenantContext, params?: { routeId?: string; status?: string }) {
    return this.safeDb(async () => {
      return prisma.studentTransportAllocation.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
          ...(params?.routeId ? { routeId: params.routeId } : {}),
          ...(params?.status ? { status: params.status as any } : {}),
        },
        include: {
          student: true,
          route: true,
          pickupStop: true,
          dropoffStop: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });
  }
}

export const transportRepository = new TransportRepository();
