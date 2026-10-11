import { z } from "zod";

/**
 * Standard Pagination Query Schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  search: z.string().trim().max(100).optional(),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

/**
 * ID Validation Schemas
 */
export const uuidSchema = z.string().uuid({ message: "Invalid UUID format" });
export const slugSchema = z
  .string()
  .min(2, "Slug must be at least 2 characters")
  .max(50, "Slug cannot exceed 50 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must contain only lowercase letters, numbers, and hyphens");

/**
 * Organization Foundation Validation Schema
 */
export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters").max(100),
  slug: slugSchema,
  code: z.string().trim().min(2).max(10).toUpperCase().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export type OrganizationInput = z.infer<typeof organizationSchema>;

/**
 * Campus Foundation Validation Schema
 */
export const campusSchema = z.object({
  name: z.string().trim().min(2, "Campus name must be at least 2 characters").max(100),
  code: z.string().trim().min(2).max(10).toUpperCase(),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(25).optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type CampusInput = z.infer<typeof campusSchema>;

/**
 * User Profile / Identity Validation Schema
 */
export const userSchema = z.object({
  email: z.string().trim().email("Must be a valid email address"),
  firstName: z.string().trim().min(1, "First name is required").max(50),
  lastName: z.string().trim().min(1, "Last name is required").max(50),
  phone: z.string().trim().max(25).optional(),
  role: z.enum(["SUPER_ADMIN", "CAMPUS_ADMIN", "PRINCIPAL", "TEACHER", "STAFF", "ACCOUNTANT", "LIBRARIAN", "STUDENT", "PARENT", "CUSTOM"]).default("STAFF"),
});

export type UserInput = z.infer<typeof userSchema>;

/**
 * Form Validator Helper
 * Parses data against schema, returning strongly typed { success: true, data } or { success: false, fieldErrors }
 */
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; fieldErrors: Record<string, string[]>; errorSummary: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: Record<string, string[]> = {};
  const issues = result.error.issues;
  for (const issue of issues) {
    const pathKey = issue.path.join(".") || "form";
    if (!fieldErrors[pathKey]) {
      fieldErrors[pathKey] = [];
    }
    fieldErrors[pathKey].push(issue.message);
  }

  const errorSummary = issues.map((i) => i.message).join(", ");
  return { success: false, fieldErrors, errorSummary };
}
