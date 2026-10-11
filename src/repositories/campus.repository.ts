import { prisma } from "@/lib/db";
import { Campus, Prisma } from "@prisma/client";
import { TenantContext } from "./types";
import { NotFoundError } from "@/lib/errors";

export class CampusRepository {
  /**
   * List all campuses belonging to the authenticated organization
   */
  async findMany(ctx: TenantContext): Promise<Campus[]> {
    return prisma.campus.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      orderBy: { name: "asc" },
    });
  }

  /**
   * Find campus by ID, strictly scoped to organization
   */
  async findById(ctx: TenantContext, id: string): Promise<Campus | null> {
    return prisma.campus.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
      },
    });
  }

  /**
   * Find campus by code within organization
   */
  async findByCode(ctx: TenantContext, code: string): Promise<Campus | null> {
    return prisma.campus.findUnique({
      where: {
        organizationId_code: {
          organizationId: ctx.organizationId,
          code,
        },
      },
    });
  }

  /**
   * Create a new campus under the tenant organization
   */
  async create(ctx: TenantContext, data: Omit<Prisma.CampusUncheckedCreateInput, "organizationId">): Promise<Campus> {
    return prisma.campus.create({
      data: {
        ...data,
        organizationId: ctx.organizationId,
      },
    });
  }

  /**
   * Update campus within tenant organization
   */
  async update(
    ctx: TenantContext,
    id: string,
    data: Prisma.CampusUpdateInput
  ): Promise<Campus> {
    const existing = await this.findById(ctx, id);
    if (!existing) {
      throw new NotFoundError("Campus", id);
    }

    return prisma.campus.update({
      where: { id },
      data,
    });
  }
}

export const campusRepository = new CampusRepository();
