import { z } from "zod";

/**
 * Enums matching Prisma domain model
 */
export const GenderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);
export const StudentStatusEnum = z.enum([
  "ACTIVE",
  "INACTIVE",
  "GRADUATED",
  "SUSPENDED",
  "TRANSFERRED",
  "WITHDRAWN",
]);
export const EnrollmentStatusEnum = z.enum([
  "ENROLLED",
  "PROMOTED",
  "REPEATING",
  "TRANSFERRED",
  "DROPPED",
]);
export const GuardianRelationshipEnum = z.enum([
  "FATHER",
  "MOTHER",
  "LEGAL_GUARDIAN",
  "STEP_FATHER",
  "STEP_MOTHER",
  "GRANDPARENT",
  "SIBLING",
  "RELATIVE",
  "OTHER",
]);
export const AdmissionStatusEnum = z.enum([
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
]);

/**
 * 1. Student Creation Schema
 */
export const createStudentWithEnrollmentSchema = z.object({
  campusId: z.string().min(1, "Campus is required"),
  admissionNumber: z
    .string()
    .trim()
    .min(2, "Admission number must be at least 2 characters")
    .max(35)
    .toUpperCase()
    .optional(), // if omitted, server will generate one
  autoGenerateAdmissionNumber: z.boolean().default(true),
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: GenderEnum,
  nationality: z.string().trim().max(60).default("Not Specified"),
  religion: z.string().trim().max(60).optional().or(z.literal("")),
  bloodGroup: z.string().trim().max(10).optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  admissionDate: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  medicalNotes: z.string().trim().max(500).optional().or(z.literal("")),
  emergencyNotes: z.string().trim().max(500).optional().or(z.literal("")),
  // Academic placement
  academicYearId: z.string().min(1, "Academic year is required"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional().or(z.literal("")),
  rollNumber: z.string().trim().max(20).optional().or(z.literal("")),
  // Guardian details (optional initial guardian)
  guardian: z
    .object({
      existingGuardianId: z.string().optional().or(z.literal("")),
      firstName: z.string().trim().min(1, "Guardian first name is required").max(60),
      lastName: z.string().trim().min(1, "Guardian last name is required").max(60),
      relationship: GuardianRelationshipEnum.default("LEGAL_GUARDIAN"),
      phone: z.string().trim().min(5, "Valid phone number is required").max(30),
      email: z.string().trim().email().optional().or(z.literal("")),
      address: z.string().trim().max(255).optional().or(z.literal("")),
      occupation: z.string().trim().max(100).optional().or(z.literal("")),
      isPrimary: z.boolean().default(true),
      isEmergencyContact: z.boolean().default(true),
      canPickup: z.boolean().default(true),
    })
    .optional(),
});

export type CreateStudentWithEnrollmentInput = z.infer<
  typeof createStudentWithEnrollmentSchema
>;

/**
 * 2. Update Student Profile Schema
 */
export const updateStudentSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: GenderEnum,
  nationality: z.string().trim().max(60).optional().or(z.literal("")),
  religion: z.string().trim().max(60).optional().or(z.literal("")),
  bloodGroup: z.string().trim().max(10).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  medicalNotes: z.string().trim().max(500).optional().or(z.literal("")),
  emergencyNotes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;

/**
 * 3. Status Change Schema
 */
export const updateStudentStatusSchema = z.object({
  status: StudentStatusEnum,
  reason: z.string().trim().min(3, "Reason for status change is required").max(300),
});

export type UpdateStudentStatusInput = z.infer<typeof updateStudentStatusSchema>;

/**
 * 4. Promotion Schema
 */
export const promoteStudentSchema = z.object({
  toAcademicYearId: z.string().min(1, "Target academic year is required"),
  toClassId: z.string().min(1, "Target class is required"),
  toSectionId: z.string().optional().or(z.literal("")),
  rollNumber: z.string().trim().max(20).optional().or(z.literal("")),
  remarks: z.string().trim().max(255).optional().or(z.literal("")),
});

export type PromoteStudentInput = z.infer<typeof promoteStudentSchema>;

/**
 * 5. Campus / Class Transfer Schema
 */
export const transferStudentSchema = z.object({
  toCampusId: z.string().min(1, "Destination campus is required"),
  toClassId: z.string().min(1, "Destination class is required"),
  toSectionId: z.string().optional().or(z.literal("")),
  effectiveDate: z.string().optional(),
  reason: z.string().trim().min(3, "Reason for transfer is required").max(300),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type TransferStudentInput = z.infer<typeof transferStudentSchema>;

/**
 * 6. Guardian Schemas
 */
export const createGuardianInputSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Last name is required").max(60),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().min(5, "Contact phone is required").max(30),
  alternatePhone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  occupation: z.string().trim().max(100).optional().or(z.literal("")),
  employer: z.string().trim().max(100).optional().or(z.literal("")),
});

export type CreateGuardianDto = z.infer<typeof createGuardianInputSchema>;

export const linkStudentGuardianSchema = z.object({
  guardianId: z.string().min(1, "Guardian is required"),
  relationship: GuardianRelationshipEnum.default("OTHER"),
  isPrimary: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(true),
  canPickup: z.boolean().default(true),
});

export type LinkStudentGuardianInput = z.infer<typeof linkStudentGuardianSchema>;

/**
 * 7. Admission Application Schemas
 */
export const createAdmissionApplicationSchema = z.object({
  campusId: z.string().min(1, "Campus is required"),
  academicYearId: z.string().min(1, "Academic year is required"),
  classId: z.string().min(1, "Requested class is required"),
  firstName: z.string().trim().min(1, "Applicant first name is required").max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal("")),
  lastName: z.string().trim().min(1, "Applicant last name is required").max(60),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: GenderEnum,
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  guardianName: z.string().trim().min(1, "Guardian name is required").max(120),
  guardianRelationship: GuardianRelationshipEnum.default("OTHER"),
  guardianEmail: z.string().trim().email().optional().or(z.literal("")),
  guardianPhone: z.string().trim().min(5, "Guardian phone is required").max(30),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type CreateAdmissionApplicationInput = z.infer<
  typeof createAdmissionApplicationSchema
>;

export const reviewAdmissionApplicationSchema = z.object({
  status: z.enum(["UNDER_REVIEW", "APPROVED", "REJECTED", "WITHDRAWN"]),
  reviewNotes: z.string().trim().max(500).optional().or(z.literal("")),
  rejectionReason: z.string().trim().max(300).optional().or(z.literal("")),
});

export type ReviewAdmissionApplicationInput = z.infer<
  typeof reviewAdmissionApplicationSchema
>;

export const enrollAdmissionApplicationSchema = z.object({
  admissionNumber: z.string().trim().max(35).optional().or(z.literal("")),
  sectionId: z.string().optional().or(z.literal("")),
  rollNumber: z.string().trim().max(20).optional().or(z.literal("")),
});

export type EnrollAdmissionApplicationInput = z.infer<
  typeof enrollAdmissionApplicationSchema
>;

/**
 * 8. Student Document Schemas
 */
export const studentDocumentUploadSchema = z.object({
  fileName: z.string().trim().min(1, "File name is required").max(150),
  documentType: z.enum([
    "BIRTH_CERTIFICATE",
    "TRANSCRIPT",
    "MEDICAL_RECORD",
    "PASSPORT_PHOTO",
    "IDENTIFICATION",
    "IMMUNIZATION",
    "OTHER",
  ]),
  mimeType: z.string().trim().min(1).max(80),
  sizeBytes: z.number().int().min(1).max(10 * 1024 * 1024), // Max 10MB
  base64Data: z.string().optional(),
});

export type StudentDocumentUploadInput = z.infer<
  typeof studentDocumentUploadSchema
>;
