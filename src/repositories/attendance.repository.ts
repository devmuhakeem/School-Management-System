import { prisma } from "@/lib/db";
import { StudentAttendance, StaffAttendance, Prisma } from "@prisma/client";
import { TenantContext } from "./types";
import { ConflictError, NotFoundError } from "@/lib/errors";

export class AttendanceRepository {
  /**
   * Record or update student attendance (upsert to prevent duplicate entry for same date)
   */
  async recordStudentAttendance(
    ctx: TenantContext,
    data: Omit<Prisma.StudentAttendanceUncheckedCreateInput, "organizationId">
  ): Promise<StudentAttendance> {
    const student = await prisma.student.findFirst({
      where: { id: data.studentId, organizationId: ctx.organizationId },
    });
    if (!student) {
      throw new NotFoundError("Student", data.studentId);
    }

    return prisma.studentAttendance.upsert({
      where: {
        studentId_attendanceDate_attendanceType_classId_teachingGroupId: {
          studentId: data.studentId,
          attendanceDate: data.attendanceDate,
          attendanceType: data.attendanceType || "DAILY",
          classId: data.classId,
          teachingGroupId: data.teachingGroupId || "",
        },
      },
      update: {
        status: data.status,
        reason: data.reason,
        remarks: data.remarks,
        recordedById: data.recordedById,
      },
      create: {
        ...data,
        organizationId: ctx.organizationId,
      },
    });
  }

  /**
   * Find class attendance for a specific date
   */
  async findClassAttendance(
    ctx: TenantContext,
    classId: string,
    date: Date,
    sectionId?: string
  ): Promise<StudentAttendance[]> {
    return prisma.studentAttendance.findMany({
      where: {
        organizationId: ctx.organizationId,
        classId,
        attendanceDate: date,
        ...(sectionId ? { sectionId } : {}),
      },
      include: {
        student: true,
      },
      orderBy: { student: { lastName: "asc" } },
    });
  }

  /**
   * Record staff daily attendance
   */
  async recordStaffAttendance(
    ctx: TenantContext,
    data: Omit<Prisma.StaffAttendanceUncheckedCreateInput, "organizationId">
  ): Promise<StaffAttendance> {
    const staff = await prisma.staff.findFirst({
      where: { id: data.staffId, organizationId: ctx.organizationId },
    });
    if (!staff) {
      throw new NotFoundError("Staff", data.staffId);
    }

    return prisma.staffAttendance.upsert({
      where: {
        staffId_attendanceDate: {
          staffId: data.staffId,
          attendanceDate: data.attendanceDate,
        },
      },
      update: {
        status: data.status,
        checkInTime: data.checkInTime,
        checkOutTime: data.checkOutTime,
        reason: data.reason,
        remarks: data.remarks,
        recordedById: data.recordedById,
      },
      create: {
        ...data,
        organizationId: ctx.organizationId,
      },
    });
  }
}

export const attendanceRepository = new AttendanceRepository();
