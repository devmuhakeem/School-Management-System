import { prisma } from "@/lib/db";
import { TenantContext } from "./types";
import { logger } from "@/lib/logger";

export class LibraryRepository {
  /**
   * Safe execution wrapper checking DB connectivity
   */
  private async safeDb<T>(operation: () => Promise<T>): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      logger.warn("Database operation failed in LibraryRepository, fallback to service memory state", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async getSettings(ctx: TenantContext) {
    return this.safeDb(async () => {
      return prisma.librarySetting.findFirst({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
        },
      });
    });
  }

  async getBranches(ctx: TenantContext) {
    return this.safeDb(async () => {
      return prisma.libraryBranch.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
        },
        include: {
          _count: { select: { books: true, bookCopies: true } },
        },
        orderBy: { name: "asc" },
      });
    });
  }

  async getBooks(ctx: TenantContext, params?: { category?: string; search?: string; branchId?: string }) {
    return this.safeDb(async () => {
      return prisma.book.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
          ...(params?.category ? { category: params.category } : {}),
          ...(params?.branchId ? { branchId: params.branchId } : {}),
          ...(params?.search
            ? {
                OR: [
                  { title: { contains: params.search, mode: "insensitive" } },
                  { authors: { contains: params.search, mode: "insensitive" } },
                  { isbn: { contains: params.search, mode: "insensitive" } },
                  { callNumber: { contains: params.search, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: {
          branch: true,
          copies: true,
          _count: { select: { loans: true, reservations: true } },
        },
        orderBy: { title: "asc" },
      });
    });
  }

  async getBookById(ctx: TenantContext, bookId: string) {
    return this.safeDb(async () => {
      return prisma.book.findFirst({
        where: {
          id: bookId,
          organizationId: ctx.organizationId,
        },
        include: {
          branch: true,
          copies: {
            include: {
              loans: {
                where: { status: "ACTIVE" },
                include: { member: { include: { student: true, user: true } } },
              },
            },
          },
          reservations: {
            where: { status: "PENDING" },
            include: { member: { include: { student: true, user: true } } },
          },
        },
      });
    });
  }

  async getMembers(ctx: TenantContext, params?: { memberType?: "STUDENT" | "STAFF"; search?: string }) {
    return this.safeDb(async () => {
      return prisma.libraryMember.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
          ...(params?.memberType ? { memberType: params.memberType } : {}),
        },
        include: {
          student: true,
          user: true,
          loans: { where: { status: "ACTIVE" } },
        },
        orderBy: { memberNumber: "asc" },
      });
    });
  }

  async getLoans(ctx: TenantContext, params?: { status?: string; memberId?: string }) {
    return this.safeDb(async () => {
      return prisma.bookLoan.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
          ...(params?.status ? { status: params.status as any } : {}),
          ...(params?.memberId ? { memberId: params.memberId } : {}),
        },
        include: {
          book: true,
          copy: true,
          member: {
            include: { student: true, user: true },
          },
        },
        orderBy: { checkoutDate: "desc" },
      });
    });
  }

  async getReservations(ctx: TenantContext, params?: { status?: string }) {
    return this.safeDb(async () => {
      return prisma.bookReservation.findMany({
        where: {
          organizationId: ctx.organizationId,
          ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
          ...(params?.status ? { status: params.status as any } : {}),
        },
        include: {
          book: true,
          member: {
            include: { student: true, user: true },
          },
        },
        orderBy: { reservedAt: "desc" },
      });
    });
  }
}

export const libraryRepository = new LibraryRepository();
