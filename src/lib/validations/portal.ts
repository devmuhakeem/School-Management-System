import { z } from "zod";

// =============================================================================
// PHASE 10: PORTAL VALIDATION SCHEMES
// =============================================================================

export const updateParentProfileSchema = z.object({
  phone: z.string().min(5, "Phone number is too short").max(30, "Phone number is too long").optional(),
  alternatePhone: z.string().max(30, "Alternate phone number is too long").optional().nullable(),
  address: z.string().max(255, "Address must be under 255 characters").optional().nullable(),
  occupation: z.string().max(100, "Occupation must be under 100 characters").optional().nullable(),
  employer: z.string().max(100, "Employer name must be under 100 characters").optional().nullable(),
});

export type UpdateParentProfileInput = z.infer<typeof updateParentProfileSchema>;

export const updateStudentProfileSchema = z.object({
  phone: z.string().max(30, "Phone number is too long").optional().nullable(),
  email: z.string().email("Invalid email address format").optional().nullable(),
  address: z.string().max(255, "Address must be under 255 characters").optional().nullable(),
  medicalNotes: z.string().max(500, "Medical notes must be under 500 characters").optional().nullable(),
  emergencyNotes: z.string().max(500, "Emergency notes must be under 500 characters").optional().nullable(),
});

export type UpdateStudentProfileInput = z.infer<typeof updateStudentProfileSchema>;

export const portalDateFilterSchema = z.object({
  academicYearId: z.string().optional(),
  termId: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD").optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export type PortalDateFilterInput = z.infer<typeof portalDateFilterSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters long"),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New password and confirmation must match",
    path: ["confirmPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
