import { z } from "zod";

// =============================================================================
// ENUMS & TYPES
// =============================================================================

export const FeeFrequencyEnum = z.enum([
  "ONE_TIME",
  "TERM",
  "ANNUAL",
  "MONTHLY",
  "OPTIONAL",
]);
export type FeeFrequency = z.infer<typeof FeeFrequencyEnum>;

export const FeeStructureStatusEnum = z.enum([
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
]);
export type FeeStructureStatus = z.infer<typeof FeeStructureStatusEnum>;

export const InvoiceStatusEnum = z.enum([
  "DRAFT",
  "ISSUED",
  "PARTIALLY_PAID",
  "PAID",
  "OVERDUE",
  "VOID",
  "CANCELLED",
]);
export type InvoiceStatus = z.infer<typeof InvoiceStatusEnum>;

export const PaymentMethodEnum = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "POS",
  "CHEQUE",
  "ONLINE",
  "SCHOLARSHIP",
  "CREDIT_BALANCE",
  "OTHER",
]);
export type PaymentMethod = z.infer<typeof PaymentMethodEnum>;

export const PaymentStatusEnum = z.enum([
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);
export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;

export const DiscountTypeEnum = z.enum([
  "PERCENTAGE",
  "FIXED_AMOUNT",
]);
export type DiscountType = z.infer<typeof DiscountTypeEnum>;

export const WaiverCategoryEnum = z.enum([
  "MERIT_SCHOLARSHIP",
  "SIBLING_DISCOUNT",
  "STAFF_CHILD",
  "NEED_BASED",
  "EARLY_BIRD",
  "SPECIAL_CONCESSION",
  "OTHER",
]);
export type WaiverCategory = z.infer<typeof WaiverCategoryEnum>;

export const WaiverStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "APPLIED",
  "CANCELLED",
]);
export type WaiverStatus = z.infer<typeof WaiverStatusEnum>;

export const RefundStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "PROCESSED",
  "REJECTED",
]);
export type RefundStatus = z.infer<typeof RefundStatusEnum>;

// =============================================================================
// FEE CATEGORIES
// =============================================================================

export const createFeeCategorySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  code: z
    .string()
    .min(2, "Code must be at least 2 characters")
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, "Code must contain only letters, numbers, hyphens, and underscores"),
  description: z.string().max(300).optional().nullable(),
  campusId: z.string().uuid("Invalid campus ID").optional().nullable(),
});
export type CreateFeeCategoryInput = z.infer<typeof createFeeCategorySchema>;

export const updateFeeCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z
    .string()
    .min(2)
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  description: z.string().max(300).optional().nullable(),
  isActive: z.boolean().optional(),
});
export type UpdateFeeCategoryInput = z.infer<typeof updateFeeCategorySchema>;

// =============================================================================
// FEE ITEMS & STRUCTURES
// =============================================================================

export const feeItemInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Fee item name is required").max(100),
  code: z.string().max(30).optional().nullable(),
  description: z.string().max(300).optional().nullable(),
  feeCategoryId: z.string().min(1, "Fee category is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  isMandatory: z.boolean().default(true),
  frequency: FeeFrequencyEnum.default("TERM"),
});
export type FeeItemInput = z.infer<typeof feeItemInputSchema>;

export const createFeeStructureSchema = z.object({
  name: z.string().min(2, "Fee structure name is required").max(120),
  description: z.string().max(500).optional().nullable(),
  campusId: z.string().min(1, "Campus is required"),
  academicYearId: z.string().min(1, "Academic Year is required"),
  termId: z.string().optional().nullable(),
  classLevelId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  version: z.number().int().min(1).optional(),
  status: FeeStructureStatusEnum.optional().default("ACTIVE"),
  items: z.array(feeItemInputSchema).min(1, "At least one fee item is required"),
});
export type CreateFeeStructureInput = z.input<typeof createFeeStructureSchema>;

export const updateFeeStructureSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  termId: z.string().optional().nullable(),
  classLevelId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  status: FeeStructureStatusEnum.optional(),
  items: z.array(feeItemInputSchema).optional(),
});
export type UpdateFeeStructureInput = z.infer<typeof updateFeeStructureSchema>;

export const assignStudentFeeSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  feeStructureId: z.string().min(1, "Fee structure ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
  termId: z.string().optional().nullable(),
  customDiscountPercent: z.number().min(0).max(100).default(0),
  isExempt: z.boolean().default(false),
  notes: z.string().max(500).optional().nullable(),
});
export type AssignStudentFeeInput = z.infer<typeof assignStudentFeeSchema>;

// =============================================================================
// INVOICING
// =============================================================================

export const invoiceItemInputSchema = z.object({
  feeItemId: z.string().optional().nullable(),
  feeCategoryId: z.string().optional().nullable(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  unitAmount: z.number().min(0, "Unit amount cannot be negative"),
  discountAmount: z.number().min(0).default(0),
});
export type InvoiceItemInput = z.infer<typeof invoiceItemInputSchema>;

export const generateInvoiceSchema = z.object({
  campusId: z.string().min(1, "Campus ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
  termId: z.string().optional().nullable(),
  studentId: z.string().min(1, "Student ID is required"),
  feeStructureId: z.string().optional().nullable(),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(invoiceItemInputSchema).min(1, "At least one invoice item is required"),
});
export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;

export const batchGenerateInvoicesSchema = z.object({
  campusId: z.string().min(1, "Campus ID is required"),
  academicYearId: z.string().min(1, "Academic year ID is required"),
  termId: z.string().optional().nullable(),
  feeStructureId: z.string().min(1, "Fee structure ID is required"),
  classId: z.string().optional().nullable(),
  classLevelId: z.string().optional().nullable(),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().max(500).optional().nullable(),
});
export type BatchGenerateInvoicesInput = z.infer<typeof batchGenerateInvoicesSchema>;

export const voidInvoiceSchema = z.object({
  reason: z.string().min(3, "Void reason must be at least 3 characters").max(500),
});
export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>;

// =============================================================================
// PAYMENTS & ALLOCATIONS
// =============================================================================

export const paymentAllocationInputSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  invoiceItemId: z.string().optional().nullable(),
  amount: z.number().positive("Allocation amount must be greater than zero"),
});
export type PaymentAllocationInput = z.infer<typeof paymentAllocationInputSchema>;

export const recordPaymentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  campusId: z.string().min(1, "Campus ID is required"),
  amount: z.number().positive("Payment amount must be greater than zero"),
  paymentMethod: PaymentMethodEnum,
  reference: z.string().max(100).optional().nullable(),
  paymentDate: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  allocations: z.array(paymentAllocationInputSchema).optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

// =============================================================================
// WAIVERS & SCHOLARSHIPS
// =============================================================================

export const applyWaiverSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  campusId: z.string().min(1, "Campus ID is required"),
  invoiceId: z.string().optional().nullable(),
  category: WaiverCategoryEnum,
  discountType: DiscountTypeEnum.default("FIXED_AMOUNT"),
  value: z.number().positive("Waiver value must be positive"),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(500),
  notes: z.string().max(500).optional().nullable(),
});
export type ApplyWaiverInput = z.infer<typeof applyWaiverSchema>;

export const reviewWaiverSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "CANCELLED"]),
  notes: z.string().max(500).optional().nullable(),
});
export type ReviewWaiverInput = z.infer<typeof reviewWaiverSchema>;

// =============================================================================
// STUDENT CREDITS & REFUNDS
// =============================================================================

export const applyCreditBalanceSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().positive("Amount must be greater than zero"),
});
export type ApplyCreditBalanceInput = z.infer<typeof applyCreditBalanceSchema>;

export const processRefundSchema = z.object({
  paymentId: z.string().min(1, "Payment ID is required"),
  amount: z.number().positive("Refund amount must be greater than zero"),
  reason: z.string().min(3, "Refund reason is required").max(500),
  method: PaymentMethodEnum.optional().default("BANK_TRANSFER"),
  notes: z.string().max(500).optional().nullable(),
});
export type ProcessRefundInput = z.input<typeof processRefundSchema>;
