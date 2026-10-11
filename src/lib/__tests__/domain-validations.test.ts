import { describe, it, expect } from "vitest";
import {
  createOrganizationSchema,
  createCampusSchema,
  createStudentSchema,
  enrollStudentSchema,
  createGuardianSchema,
  createStaffSchema,
  createAcademicYearSchema,
  recordStudentAttendanceSchema,
} from "../validations/domain";

describe("Phase 2 Domain Validation Schemas", () => {
  it("validates organization schema with valid and invalid slugs", () => {
    const valid = {
      name: "Summit Ridge Academy",
      slug: "summit-ridge",
      code: "SRA",
      email: "contact@summit.edu",
    };
    expect(createOrganizationSchema.safeParse(valid).success).toBe(true);

    const invalidSlug = {
      ...valid,
      slug: "Invalid Slug With Spaces",
    };
    expect(createOrganizationSchema.safeParse(invalidSlug).success).toBe(false);
  });

  it("validates campus schema and requires code uppercase transform", () => {
    const validCampus = {
      name: "Highland North Campus",
      code: "hnc-01",
      city: "Springfield",
    };
    const parsed = createCampusSchema.safeParse(validCampus);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.code).toBe("HNC-01");
    }
  });

  it("enforces academic year date sequence (endDate > startDate)", () => {
    const invalidYear = {
      name: "2025/2026 Academic Session",
      code: "AY-25-26",
      startDate: new Date("2026-06-30"),
      endDate: new Date("2025-09-01"), // Before startDate!
    };
    const res = createAcademicYearSchema.safeParse(invalidYear);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain("End date must occur after start date");
    }
  });

  it("validates student registration payload with required fields", () => {
    const student = {
      campusId: crypto.randomUUID(),
      admissionNumber: "stu-2026-044",
      firstName: "Maya",
      lastName: "Lin",
      dateOfBirth: "2011-04-12",
      gender: "FEMALE" as const,
      nationality: "United States",
      admissionDate: "2026-09-01",
    };
    const parsed = createStudentSchema.safeParse(student);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.admissionNumber).toBe("STU-2026-044");
      expect(parsed.data.dateOfBirth).toBeInstanceOf(Date);
    }
  });

  it("validates student enrollment history payload", () => {
    const enrollment = {
      studentId: crypto.randomUUID(),
      campusId: crypto.randomUUID(),
      academicYearId: crypto.randomUUID(),
      classId: crypto.randomUUID(),
      rollNumber: "10-B-12",
      status: "ENROLLED" as const,
    };
    expect(enrollStudentSchema.safeParse(enrollment).success).toBe(true);
  });

  it("validates guardian relationship and emergency contact defaults", () => {
    const guardian = {
      firstName: "David",
      lastName: "Lin",
      phone: "+1-555-449-0011",
      relationship: "FATHER" as const,
    };
    const parsed = createGuardianSchema.safeParse(guardian);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.isEmergencyContact).toBe(true);
      expect(parsed.data.canPickup).toBe(true);
      expect(parsed.data.isPrimary).toBe(false);
    }
  });

  it("validates staff creation schema with employee number", () => {
    const staff = {
      campusId: crypto.randomUUID(),
      employeeNumber: "emp-8821",
      userId: crypto.randomUUID(),
      firstName: "Sarah",
      lastName: "Connor",
      gender: "FEMALE" as const,
      email: "sarah.connor@school.internal",
      employmentType: "FULL_TIME" as const,
    };
    const parsed = createStaffSchema.safeParse(staff);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.employeeNumber).toBe("EMP-8821");
    }
  });

  it("validates student attendance marking payload", () => {
    const attendance = {
      studentId: crypto.randomUUID(),
      campusId: crypto.randomUUID(),
      academicYearId: crypto.randomUUID(),
      classId: crypto.randomUUID(),
      attendanceDate: "2026-09-25",
      status: "PRESENT" as const,
    };
    expect(recordStudentAttendanceSchema.safeParse(attendance).success).toBe(true);
  });
});
