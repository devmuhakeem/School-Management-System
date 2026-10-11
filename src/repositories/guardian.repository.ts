import { prisma } from "@/lib/db";
import { Guardian, StudentGuardian, Prisma } from "@prisma/client";
import { TenantContext } from "./types";
import { NotFoundError } from "@/lib/errors";

export class GuardianRepository {
  /**
   * Find guardian by ID within tenant
   */
  async findById(ctx: TenantContext, id: string): Promise<Guardian | null> {
    return prisma.guardian.findFirst({
      where: {
        id,
        organizationId: ctx.organizationId,
      },
      include: {
        studentGuardians: {
          include: { student: true },
        },
      },
    });
  }

  /**
   * Create guardian and associate with student
   */
  async createForStudent(
    ctx: TenantContext,
    studentId: string,
    guardianData: Omit<Prisma.GuardianUncheckedCreateInput, "organizationId">,
    relationship: Prisma.StudentGuardianCreateWithoutStudentInput
  ): Promise<Guardian> {
    // Verify student exists in tenant
    const student = await prisma.student.findFirst({
      where: { id: studentId, organizationId: ctx.organizationId },
    });
    if (!student) {
      throw new NotFoundError("Student", studentId);
    }

    return prisma.guardian.create({
      data: {
        ...guardianData,
        organizationId: ctx.organizationId,
        studentGuardians: {
          create: {
            studentId,
            relationship: relationship.relationship,
            isPrimary: relationship.isPrimary,
            isEmergencyContact: relationship.isEmergencyContact,
            canPickup: relationship.canPickup,
          },
        },
      },
      include: {
        studentGuardians: true,
      },
    });
  }

  /**
   * Find guardians associated with a student
   */
  async findByStudentId(
    ctx: TenantContext,
    studentId: string
  ): Promise<StudentGuardian[]> {
    return prisma.studentGuardian.findMany({
      where: {
        studentId,
        student: { organizationId: ctx.organizationId },
      },
      include: {
        guardian: true,
      },
    });
  }
}

export const guardianRepository = new GuardianRepository();
