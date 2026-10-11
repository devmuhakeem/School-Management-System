import { prisma } from "@/lib/db";
import { User, Prisma } from "@prisma/client";
import { TenantContext, PaginationParams } from "./types";
import { NotFoundError } from "@/lib/errors";

export class UserRepository {
  /**
   * Find user by unique email globally (for authentication)
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organizationMemberships: {
          include: { organization: true },
        },
        campusMemberships: {
          include: { campus: true },
        },
        userRoles: {
          include: { role: true },
        },
      },
    });
  }

  /**
   * Find user by ID scoped to tenant organization
   */
  async findById(ctx: TenantContext, id: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });
  }

  /**
   * List users within organization with pagination and optional search
   */
  async findMany(
    ctx: TenantContext,
    params?: PaginationParams
  ): Promise<{ items: User[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const search = params?.search?.trim();

    const where: Prisma.UserWhereInput = {
      organizationId: ctx.organizationId,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Create new user within tenant
   */
  async create(
    ctx: TenantContext,
    data: Omit<Prisma.UserUncheckedCreateInput, "organizationId">
  ): Promise<User> {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        organizationId: ctx.organizationId,
        organizationMemberships: {
          create: {
            organizationId: ctx.organizationId,
            isDefault: true,
          },
        },
      },
    });
  }
}

export const userRepository = new UserRepository();
