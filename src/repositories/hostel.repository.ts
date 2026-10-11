import { prisma } from "@/lib/db";
import { TenantContext } from "./types";
import { logger } from "@/lib/logger";

export class HostelRepository {
  private async safeDb<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      logger.warn("Database operation failed in HostelRepository, fallback to memory state", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async getSettings(ctx: TenantContext) {
    return this.safeDb(async () => {
      return prisma.hostelSetting.findFirst({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
        },
      });
    });
  }

  async getHostels(ctx: TenantContext, params?: { status?: string }) {
    return this.safeDb(async () => {
      return prisma.hostel.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
          ...(params?.status ? { status: params.status as any } : {}),
        },
        include: {
          warden: true,
          rooms: {
            include: {
              beds: true,
            },
          },
          _count: { select: { allocations: true, gatePasses: true } },
        },
        orderBy: { name: "asc" },
      });
    });
  }

  async getAllocations(ctx: TenantContext, params?: { hostelId?: string; status?: string }) {
    return this.safeDb(async () => {
      return prisma.studentHostelAllocation.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
          ...(params?.hostelId ? { hostelId: params.hostelId } : {}),
          ...(params?.status ? { status: params.status as any } : {}),
        },
        include: {
          student: true,
          hostel: true,
          room: true,
          bed: true,
        },
        orderBy: { checkInDate: "desc" },
      });
    });
  }

  async getAttendances(ctx: TenantContext, params?: { hostelId?: string; date?: Date }) {
    return this.safeDb(async () => {
      return prisma.hostelAttendance.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(params?.hostelId ? { hostelId: params.hostelId } : {}),
          ...(params?.date ? { date: params.date } : {}),
        },
        include: {
          student: true,
          hostel: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });
  }

  async getGatePasses(ctx: TenantContext, params?: { hostelId?: string; status?: string }) {
    return this.safeDb(async () => {
      return prisma.hostelGatePass.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(params?.hostelId ? { hostelId: params.hostelId } : {}),
          ...(params?.status ? { status: params.status as any } : {}),
        },
        include: {
          student: true,
          hostel: true,
        },
        orderBy: { createdAt: "desc" },
      });
    });
  }
}

export const hostelRepository = new HostelRepository();
