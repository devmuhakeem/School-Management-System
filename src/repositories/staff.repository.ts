import { prisma } from "@/lib/db";
import { Staff, Department, Position, TeachingAssignment, Prisma } from "@prisma/client";
import { TenantContext, PaginationParams } from "./types";
import { NotFoundError } from "@/lib/errors";

export class StaffRepository {
  /**
   * Find staff member by ID scoped to tenant
   */
  async findById(ctx: TenantContext, id: string): Promise<Staff | null> {
    return prisma.staff.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
        ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
      },
      include: {
        department: true,
        position: true,
        user: true,
        teachingAssignments: {
          include: {
            subject: true,
            class: true,
            section: true,
          },
        },
      },
    });
  }

  /**
   * Find staff by employeeNumber within organization
   */
  async findByEmployeeNumber(
    ctx: TenantContext,
    employeeNumber: string
  ): Promise<Staff | null> {
    return prisma.staff.findUnique({
      where: {
        organizationId_employeeNumber: {
          organizationId: ctx.organizationId,
          employeeNumber,
        },
      },
      include: {
        department: true,
        position: true,
      },
    });
  }

  /**
   * List staff with pagination, department filtering, and search
   */
  async findMany(
    ctx: TenantContext,
    params?: PaginationParams & { departmentId?: string }
  ): Promise<{ items: Staff[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const search = params?.search?.trim();

    const where: Prisma.StaffWhereInput = {
      organizationId: ctx.organizationId,
      ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
      ...(params?.departmentId ? { departmentId: params.departmentId } : {}),
      ...(search
        ? {
            OR: [
              { employeeNumber: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.staff.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastName: "asc" },
        include: {
          department: true,
          position: true,
        },
      }),
      prisma.staff.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Create staff member with tenant scoping
   */
  async create(
    ctx: TenantContext,
    data: Omit<Prisma.StaffUncheckedCreateInput, "organizationId">
  ): Promise<Staff> {
    return prisma.staff.create({
      data: {
        ...data,
        organizationId: ctx.organizationId,
      },
      include: {
        department: true,
        position: true,
      },
    });
  }

  /**
   * Assign subject/class teaching assignment to staff
   */
  async assignTeaching(
    ctx: TenantContext,
    assignmentData: Omit<Prisma.TeachingAssignmentUncheckedCreateInput, "organizationId">
  ): Promise<TeachingAssignment> {
    const staff = await this.findById(ctx, assignmentData.staffId);
    if (!staff) {
      throw new NotFoundError("Staff", assignmentData.staffId);
    }

    return prisma.teachingAssignment.create({
      data: {
        ...assignmentData,
        organizationId: ctx.organizationId,
      },
      include: {
        subject: true,
        class: true,
      },
    });
  }
}

export const staffRepository = new StaffRepository();
