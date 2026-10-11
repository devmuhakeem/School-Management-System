import { prisma } from "@/lib/db";
import { Student, StudentEnrollment, Prisma } from "@prisma/client";
import { TenantContext, PaginationParams } from "./types";
import { NotFoundError } from "@/lib/errors";

export class StudentRepository {
  /**
   * Find student by ID scoped to tenant
   */
  async findById(ctx: TenantContext, id: string): Promise<Student | null> {
    return prisma.student.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
        ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
      },
      include: {
        campus: true,
        studentGuardians: {
          include: { guardian: true },
        },
        enrollments: {
          include: {
            academicYear: true,
            term: true,
            class: true,
            section: true,
          },
          orderBy: { enrollmentDate: "desc" },
        },
      },
    });
  }

  /**
   * Find student by unique admission number within organization
   */
  async findByAdmissionNumber(
    ctx: TenantContext,
    admissionNumber: string
  ): Promise<Student | null> {
    return prisma.student.findUnique({
      where: {
        organizationId_admissionNumber: {
          organizationId: ctx.organizationId,
          admissionNumber,
        },
      },
      include: {
        campus: true,
      },
    });
  }

  /**
   * List students with filtering by campus, class, and status
   */
  async findMany(
    ctx: TenantContext,
    params?: PaginationParams & {
      status?: Prisma.EnumStudentStatusFilter;
      classId?: string;
    }
  ): Promise<{ items: Student[]; total: number }> {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const search = params?.search?.trim();

    const where: Prisma.StudentWhereInput = {
      organizationId: ctx.organizationId,
      ...(ctx.campusId ? { campusId: ctx.campusId } : {}),
      ...(params?.status ? { status: params.status } : {}),
      ...(params?.classId
        ? {
            enrollments: {
              some: {
                classId: params.classId,
                status: "ENROLLED",
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { admissionNumber: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { lastName: "asc" },
        include: {
          campus: true,
        },
      }),
      prisma.student.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Register a new student with initial enrollment record
   */
  async create(
    ctx: TenantContext,
    studentData: Omit<Prisma.StudentUncheckedCreateInput, "organizationId">,
    initialEnrollment?: {
      academicYearId: string;
      termId?: string;
      classId: string;
      sectionId?: string;
      rollNumber?: string;
    }
  ): Promise<Student> {
    return prisma.student.create({
      data: {
        ...studentData,
        organizationId: ctx.organizationId,
        ...(initialEnrollment
          ? {
              enrollments: {
                create: {
                  organizationId: ctx.organizationId,
                  campusId: studentData.campusId,
                  academicYearId: initialEnrollment.academicYearId,
                  termId: initialEnrollment.termId,
                  classId: initialEnrollment.classId,
                  sectionId: initialEnrollment.sectionId,
                  rollNumber: initialEnrollment.rollNumber,
                },
              },
            }
          : {}),
      },
      include: {
        enrollments: true,
      },
    });
  }

  /**
   * Enroll or promote student to another class/term
   */
  async enroll(
    ctx: TenantContext,
    enrollmentData: Omit<Prisma.StudentEnrollmentUncheckedCreateInput, "organizationId">
  ): Promise<StudentEnrollment> {
    // Verify student exists and belongs to tenant
    const student = await this.findById(ctx, enrollmentData.studentId);
    if (!student) {
      throw new NotFoundError("Student", enrollmentData.studentId);
    }

    return prisma.studentEnrollment.create({
      data: {
        ...enrollmentData,
        organizationId: ctx.organizationId,
      },
    });
  }

  /**
   * Retrieve historical enrollments for student
   */
  async getEnrollmentHistory(
    ctx: TenantContext,
    studentId: string
  ): Promise<StudentEnrollment[]> {
    return prisma.studentEnrollment.findMany({
      where: {
        studentId,
        organizationId: ctx.organizationId,
      },
      include: {
        academicYear: true,
        term: true,
        class: true,
        section: true,
      },
      orderBy: { enrollmentDate: "desc" },
    });
  }
}

export const studentRepository = new StudentRepository();
