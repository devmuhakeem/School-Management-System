import { z } from "zod";

export const BookCopyStatusEnum = z.enum([
  "AVAILABLE",
  "BORROWED",
  "RESERVED",
  "LOST",
  "DAMAGED",
  "MAINTENANCE",
]);

export const BookLoanStatusEnum = z.enum([
  "ACTIVE",
  "RETURNED",
  "OVERDUE",
  "LOST",
  "CLAIMED_RETURNED",
]);

export const ReservationStatusEnum = z.enum([
  "PENDING",
  "READY_FOR_PICKUP",
  "FULFILLED",
  "CANCELLED",
  "EXPIRED",
]);

export const LibraryMemberTypeEnum = z.enum(["STUDENT", "STAFF"]);
export const LibraryMemberStatusEnum = z.enum(["ACTIVE", "SUSPENDED", "EXPIRED"]);

export const createLibraryBranchSchema = z.object({
  name: z.string().trim().min(2, "Branch name is required").max(100),
  code: z.string().trim().min(2, "Code is required").max(20).toUpperCase(),
  location: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  campusId: z.string().uuid().optional().nullable(),
  contactEmail: z.string().email().optional().nullable().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().nullable(),
  openingHours: z.string().trim().max(100).optional().nullable(),
});

export const updateLibraryBranchSchema = createLibraryBranchSchema.partial();

export const createBookSchema = z.object({
  title: z.string().trim().min(1, "Book title is required").max(250),
  subtitle: z.string().trim().max(250).optional().nullable(),
  isbn: z.string().trim().max(30).optional().nullable(),
  isbn13: z.string().trim().max(30).optional().nullable(),
  authors: z.string().trim().min(1, "Author is required").max(250),
  publisher: z.string().trim().max(150).optional().nullable(),
  publicationYear: z.coerce.number().int().min(1000).max(2100).optional().nullable(),
  edition: z.string().trim().max(50).optional().nullable(),
  category: z.string().trim().min(1, "Category is required").max(100),
  language: z.string().trim().default("English"),
  callNumber: z.string().trim().max(50).optional().nullable(),
  deweyDecimal: z.string().trim().max(50).optional().nullable(),
  shelfLocation: z.string().trim().max(100).optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  description: z.string().trim().max(2000).optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
  campusId: z.string().uuid().optional().nullable(),
  initialCopies: z.coerce.number().int().min(1).max(50).default(1),
});

export const updateBookSchema = createBookSchema.omit({ initialCopies: true }).partial();

export const createBookCopySchema = z.object({
  bookId: z.string().uuid(),
  barcode: z.string().trim().min(2, "Barcode / Accession number is required").max(50),
  branchId: z.string().uuid().optional().nullable(),
  conditionNote: z.string().trim().max(250).optional().nullable(),
  costCents: z.coerce.number().int().min(0).optional().nullable(),
});

export const updateBookCopySchema = z.object({
  status: BookCopyStatusEnum.optional(),
  conditionNote: z.string().trim().max(250).optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
});

export const registerLibraryMemberSchema = z.object({
  memberType: LibraryMemberTypeEnum.default("STUDENT"),
  memberNumber: z.string().trim().min(2).max(50),
  studentId: z.string().uuid().optional().nullable(),
  staffId: z.string().uuid().optional().nullable(),
  userId: z.string().uuid().optional().nullable(),
  campusId: z.string().uuid().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
});

export const updateLibraryMemberSchema = z.object({
  status: LibraryMemberStatusEnum.optional(),
  expiryDate: z.string().datetime().optional().nullable(),
});

export const issueBookLoanSchema = z.object({
  memberId: z.string().uuid("Invalid member identifier"),
  copyId: z.string().uuid("Invalid book copy identifier"),
  loanDays: z.coerce.number().int().min(1).max(90).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const returnBookLoanSchema = z.object({
  loanId: z.string().uuid(),
  conditionNote: z.string().trim().max(250).optional(),
  waiveFine: z.boolean().default(false),
  notes: z.string().trim().max(500).optional(),
});

export const renewBookLoanSchema = z.object({
  loanId: z.string().uuid(),
  additionalDays: z.coerce.number().int().min(1).max(60).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const createBookReservationSchema = z.object({
  bookId: z.string().uuid(),
  memberId: z.string().uuid(),
  notes: z.string().trim().max(500).optional(),
});

export const collectFineSchema = z.object({
  loanId: z.string().uuid(),
  amountCents: z.coerce.number().int().positive(),
  paymentMethod: z.string().default("CASH"),
  notes: z.string().trim().max(250).optional(),
});

export const waiveFineSchema = z.object({
  loanId: z.string().uuid(),
  reason: z.string().trim().min(3).max(250),
});

export const updateLibrarySettingSchema = z.object({
  campusId: z.string().uuid().optional().nullable(),
  maxActiveLoansStudent: z.coerce.number().int().min(1).max(20).default(3),
  maxActiveLoansStaff: z.coerce.number().int().min(1).max(50).default(10),
  defaultLoanDaysStudent: z.coerce.number().int().min(1).max(60).default(14),
  defaultLoanDaysStaff: z.coerce.number().int().min(1).max(120).default(30),
  maxRenewalsAllowed: z.coerce.number().int().min(0).max(10).default(2),
  finePerDayCents: z.coerce.number().int().min(0).max(10000).default(50),
  gracePeriodDays: z.coerce.number().int().min(0).max(14).default(1),
  reservationExpiryDays: z.coerce.number().int().min(1).max(30).default(3),
});

export type CreateLibraryBranchInput = z.infer<typeof createLibraryBranchSchema>;
export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type CreateBookCopyInput = z.infer<typeof createBookCopySchema>;
export type RegisterLibraryMemberInput = z.infer<typeof registerLibraryMemberSchema>;
export type IssueBookLoanInput = z.infer<typeof issueBookLoanSchema>;
export type ReturnBookLoanInput = z.infer<typeof returnBookLoanSchema>;
export type RenewBookLoanInput = z.infer<typeof renewBookLoanSchema>;
export type CreateBookReservationInput = z.infer<typeof createBookReservationSchema>;
export type CollectFineInput = z.infer<typeof collectFineSchema>;
export type WaiveFineInput = z.infer<typeof waiveFineSchema>;
export type UpdateLibrarySettingInput = z.infer<typeof updateLibrarySettingSchema>;
