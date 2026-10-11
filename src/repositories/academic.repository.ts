import { prisma } from "@/lib/db";
import { AcademicYear, Term, Class, Section, Subject, Prisma } from "@prisma/client";
import { TenantContext } from "./types";
import { NotFoundError } from "@/lib/errors";

export class AcademicRepository {
  /**
   * Find current active academic year for tenant
   */
  async getCurrentAcademicYear(ctx: TenantContext): Promise<AcademicYear | null> {
    return prisma.academicYear.findFirst({
      where: {
        organizationId: ctx.organizationId,
        isCurrent: true,
      },
      include: {
        terms: {
          orderBy: { termNumber: "asc" },
        },
      },
    });
  }

  /**
   * List all academic years
   */
  async findAcademicYears(ctx: TenantContext): Promise<AcademicYear[]> {
    return prisma.academicYear.findMany({
      where: {
        organizationId: ctx.organizationId,
      },
      include: {
        terms: true,
      },
      orderBy: { startDate: "desc" },
    });
  }

  /**
   * Create an academic year with initial terms
   */
  async createAcademicYear(
    ctx: TenantContext,
    data: Omit<Prisma.AcademicYearUncheckedCreateInput, "organizationId">,
    terms?: Array<{ name: string; termNumber: number; startDate: Date; endDate: Date }>
  ): Promise<AcademicYear> {
    return prisma.academicYear.create({
      data: {
        ...data,
        organizationId: ctx.organizationId,
        ...(terms
          ? {
              terms: {
                create: terms,
              },
            }
          : {}),
      },
      include: {
        terms: true,
      },
    });
  }

  /**
   * Find classes in campus for an academic year
   */
  async findClasses(
    ctx: TenantContext,
    academicYearId: string
  ): Promise<Class[]> {
    return prisma.class.findMany({
      where: {
        organizationId: ctx.organizationId,
        academicYearId,
        ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
      },
      include: {
        classLevel: true,
        sections: true,
      },
      orderBy: { classLevel: { sequenceOrder: "asc" } },
    });
  }

  /**
   * Create a class with initial sections
   */
  async createClass(
    ctx: TenantContext,
    data: Omit<Prisma.ClassUncheckedCreateInput, "organizationId">,
    sectionNames?: string[]
  ): Promise<Class> {
    return prisma.class.create({
      data: {
        ...data,
        organizationId: ctx.organizationId,
        ...(sectionNames
          ? {
              sections: {
                create: sectionNames.map((name, i) => ({
                  name,
                  code: `SEC-${String.fromCharCode(65 + i)}`,
                })),
              },
            }
          : {}),
      },
      include: {
        sections: true,
      },
    });
  }

  /**
   * List subjects available in campus
   */
  async findSubjects(ctx: TenantContext): Promise<Subject[]> {
    return prisma.subject.findMany({
      where: {
        organizationId: ctx.organizationId,
        ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
      },
      orderBy: { name: "asc" },
    });
  }
}

export const academicRepository = new AcademicRepository();
