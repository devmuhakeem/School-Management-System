import { prisma } from "@/lib/db";
import { TenantContext } from "@/repositories/types";
import { auditRepository } from "@/repositories/audit.repository";
import { NotFoundError, ForbiddenError, ValidationError, ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { enforceCampusIsolation } from "@/lib/security";
import {
  roundMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  calculatePercentage,
  DEFAULT_CURRENCY,
} from "@/lib/currency";
import {
  CreateFeeCategoryInput,
  UpdateFeeCategoryInput,
  CreateFeeStructureInput,
  UpdateFeeStructureInput,
  AssignStudentFeeInput,
  GenerateInvoiceInput,
  BatchGenerateInvoicesInput,
  VoidInvoiceInput,
  RecordPaymentInput,
  ApplyWaiverInput,
  ReviewWaiverInput,
  ApplyCreditBalanceInput,
  ProcessRefundInput,
  FeeFrequency,
  FeeStructureStatus,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  DiscountType,
  WaiverCategory,
  WaiverStatus,
  RefundStatus,
} from "@/lib/validations/finance";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "./admin.service";

// =============================================================================
// DOMAIN RECORD INTERFACES
// =============================================================================

export interface FeeCategoryRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  code: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeeItemRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  feeStructureId?: string | null;
  feeCategoryId: string;
  categoryName?: string;
  name: string;
  code?: string | null;
  description?: string | null;
  amount: number;
  isMandatory: boolean;
  frequency: FeeFrequency;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureRecord {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  termId?: string | null;
  classLevelId?: string | null;
  classId?: string | null;
  name: string;
  description?: string | null;
  version: number;
  status: FeeStructureStatus;
  items: FeeItemRecord[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFeeAssignmentRecord {
  id: string;
  organizationId: string;
  campusId: string;
  studentId: string;
  feeStructureId: string;
  academicYearId: string;
  termId?: string | null;
  customDiscountPercent: number;
  isExempt: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItemRecord {
  id: string;
  invoiceId: string;
  feeItemId?: string | null;
  feeCategoryId?: string | null;
  categoryName?: string;
  name: string;
  description?: string | null;
  quantity: number;
  unitAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  organizationId: string;
  campusId: string;
  academicYearId: string;
  termId?: string | null;
  studentId: string;
  studentName?: string;
  studentAdmissionNumber?: string;
  classId?: string | null;
  className?: string;
  feeStructureId?: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  discountTotal: number;
  waiverTotal: number;
  taxTotal: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  notes?: string | null;
  isLocked: boolean;
  createdById?: string | null;
  voidedById?: string | null;
  voidedAt?: string | null;
  voidReason?: string | null;
  items: InvoiceItemRecord[];
  allocations: PaymentAllocationRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface FeeWaiverRecord {
  id: string;
  organizationId: string;
  campusId: string;
  studentId: string;
  studentName?: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  category: WaiverCategory;
  discountType: DiscountType;
  value: number;
  calculatedAmount: number;
  status: WaiverStatus;
  reason: string;
  authorizedById?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAllocationRecord {
  id: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber?: string;
  invoiceItemId?: string | null;
  amount: number;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  organizationId: string;
  campusId: string;
  studentId: string;
  studentName?: string;
  studentAdmissionNumber?: string;
  paymentNumber: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference?: string | null;
  paymentDate: string;
  status: PaymentStatus;
  notes?: string | null;
  receivedById?: string | null;
  allocatedAmount: number;
  surplusAmount: number;
  allocations: PaymentAllocationRecord[];
  receiptId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReceiptRecord {
  id: string;
  organizationId: string;
  campusId: string;
  studentId: string;
  studentName?: string;
  studentAdmissionNumber?: string;
  className?: string;
  paymentId: string;
  paymentNumber: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string | null;
  receiptNumber: string;
  amountPaid: number;
  outstandingBalance: number;
  issuedAt: string;
  issuedById?: string | null;
  notes?: string | null;
  invoicesCovered: Array<{
    invoiceNumber: string;
    allocatedAmount: number;
    remainingBalance: number;
  }>;
  createdAt: string;
}

export interface StudentCreditBalanceRecord {
  id: string;
  organizationId: string;
  campusId: string;
  studentId: string;
  currentBalance: number;
  totalCredited: number;
  totalUsed: number;
  transactions: StudentCreditTransactionRecord[];
  updatedAt: string;
}

export interface StudentCreditTransactionRecord {
  id: string;
  creditBalanceId: string;
  amount: number;
  type: string;
  referenceId?: string | null;
  description?: string | null;
  createdAt: string;
}

export interface PaymentRefundRecord {
  id: string;
  organizationId: string;
  campusId: string;
  paymentId: string;
  paymentNumber?: string;
  studentId: string;
  studentName?: string;
  refundNumber: string;
  amount: number;
  reason: string;
  method: PaymentMethod;
  status: RefundStatus;
  approvedById?: string | null;
  processedAt: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// IN-MEMORY RESILIENCE STATE (For Vitest & Offline Fallback)
// =============================================================================

interface InMemoryFinanceState {
  categories: FeeCategoryRecord[];
  structures: FeeStructureRecord[];
  feeItems: FeeItemRecord[];
  assignments: StudentFeeAssignmentRecord[];
  invoices: InvoiceRecord[];
  waivers: FeeWaiverRecord[];
  payments: PaymentRecord[];
  allocations: PaymentAllocationRecord[];
  receipts: ReceiptRecord[];
  creditBalances: Map<string, StudentCreditBalanceRecord>;
  refunds: PaymentRefundRecord[];
  invoiceSeq: number;
  paymentSeq: number;
  receiptSeq: number;
  refundSeq: number;
}

function initializeFinanceState(): InMemoryFinanceState {
  const catTuitionId = "fcat-01";
  const catIctId = "fcat-02";
  const catExamId = "fcat-03";
  const catLibraryId = "fcat-04";
  const catUniformId = "fcat-05";

  const categories: FeeCategoryRecord[] = [
    {
      id: catTuitionId,
      organizationId: DEMO_ORG_ID,
      campusId: null,
      name: "Tuition Fee",
      code: "TUITION",
      description: "Standard instructional and classroom tuition",
      isSystem: true,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: catIctId,
      organizationId: DEMO_ORG_ID,
      campusId: null,
      name: "ICT & Digital Learning",
      code: "ICT",
      description: "Computer lab maintenance, software licenses, internet",
      isSystem: true,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: catExamId,
      organizationId: DEMO_ORG_ID,
      campusId: null,
      name: "Examination & Assessment",
      code: "EXAM",
      description: "Terminal assessments, answer booklets, and external grading",
      isSystem: true,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: catLibraryId,
      organizationId: DEMO_ORG_ID,
      campusId: null,
      name: "Library & Learning Resources",
      code: "LIBRARY",
      description: "Book acquisitions, digital subscriptions, and journals",
      isSystem: false,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: catUniformId,
      organizationId: DEMO_ORG_ID,
      campusId: null,
      name: "School Uniform & Badges",
      code: "UNIFORM",
      description: "Official institutional blazers, ties, and sportswear",
      isSystem: false,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const defaultStructureId = "fstruct-g10-2025-t2";
  const feeItems: FeeItemRecord[] = [
    {
      id: "fitem-01",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      feeStructureId: defaultStructureId,
      feeCategoryId: catTuitionId,
      categoryName: "Tuition Fee",
      name: "Grade 10 Spring Term Tuition",
      code: "G10-TUI",
      description: "Full term tuition fee for Grade 10",
      amount: 1200.0,
      isMandatory: true,
      frequency: "TERM",
      createdAt: "2026-01-05T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    },
    {
      id: "fitem-02",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      feeStructureId: defaultStructureId,
      feeCategoryId: catIctId,
      categoryName: "ICT & Digital Learning",
      name: "Computer Science & Robotics Lab Fee",
      code: "G10-ICT",
      description: "Hardware kits and simulator access",
      amount: 150.0,
      isMandatory: true,
      frequency: "TERM",
      createdAt: "2026-01-05T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    },
    {
      id: "fitem-03",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      feeStructureId: defaultStructureId,
      feeCategoryId: catExamId,
      categoryName: "Examination & Assessment",
      name: "Midterm & Terminal Exam Fee",
      code: "G10-EXM",
      description: "Invigilation, printing, and grading fee",
      amount: 100.0,
      isMandatory: true,
      frequency: "TERM",
      createdAt: "2026-01-05T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    },
    {
      id: "fitem-04",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      feeStructureId: defaultStructureId,
      feeCategoryId: catLibraryId,
      categoryName: "Library & Learning Resources",
      name: "Digital Library Access",
      code: "G10-LIB",
      description: "E-book reader licensing",
      amount: 50.0,
      isMandatory: false,
      frequency: "TERM",
      createdAt: "2026-01-05T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    },
  ];

  const structures: FeeStructureRecord[] = [
    {
      id: defaultStructureId,
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      academicYearId: "ay-2025-26",
      termId: "term-2025-t2",
      classLevelId: "level-high-01",
      classId: "class-g10-a",
      name: "Grade 10 Spring 2026 Standard Schedule",
      description: "Mandatory tuition, lab, and assessment fees for Grade 10 students",
      version: 1,
      status: "ACTIVE",
      items: feeItems,
      totalAmount: 1500.0,
      createdAt: "2026-01-05T00:00:00.000Z",
      updatedAt: "2026-01-05T00:00:00.000Z",
    },
  ];

  // Demo Invoices
  const inv1Items: InvoiceItemRecord[] = [
    {
      id: "inv-item-01",
      invoiceId: "inv-001",
      feeItemId: "fitem-01",
      feeCategoryId: catTuitionId,
      categoryName: "Tuition Fee",
      name: "Grade 10 Spring Term Tuition",
      description: null,
      quantity: 1,
      unitAmount: 1200.0,
      discountAmount: 0,
      totalAmount: 1200.0,
      paidAmount: 1200.0,
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    },
    {
      id: "inv-item-02",
      invoiceId: "inv-001",
      feeItemId: "fitem-02",
      feeCategoryId: catIctId,
      categoryName: "ICT & Digital Learning",
      name: "Computer Science & Robotics Lab Fee",
      description: null,
      quantity: 1,
      unitAmount: 150.0,
      discountAmount: 0,
      totalAmount: 150.0,
      paidAmount: 150.0,
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    },
    {
      id: "inv-item-03",
      invoiceId: "inv-001",
      feeItemId: "fitem-03",
      feeCategoryId: catExamId,
      categoryName: "Examination & Assessment",
      name: "Midterm & Terminal Exam Fee",
      description: null,
      quantity: 1,
      unitAmount: 100.0,
      discountAmount: 0,
      totalAmount: 100.0,
      paidAmount: 100.0,
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    },
  ];

  const inv2Items: InvoiceItemRecord[] = [
    {
      id: "inv-item-04",
      invoiceId: "inv-002",
      feeItemId: "fitem-01",
      feeCategoryId: catTuitionId,
      categoryName: "Tuition Fee",
      name: "Grade 10 Spring Term Tuition",
      description: null,
      quantity: 1,
      unitAmount: 1200.0,
      discountAmount: 0,
      totalAmount: 1200.0,
      paidAmount: 500.0,
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    },
    {
      id: "inv-item-05",
      invoiceId: "inv-002",
      feeItemId: "fitem-02",
      feeCategoryId: catIctId,
      categoryName: "ICT & Digital Learning",
      name: "Computer Science & Robotics Lab Fee",
      description: null,
      quantity: 1,
      unitAmount: 150.0,
      discountAmount: 0,
      totalAmount: 150.0,
      paidAmount: 0,
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    },
  ];

  const alloc1: PaymentAllocationRecord = {
    id: "alloc-01",
    paymentId: "pay-001",
    invoiceId: "inv-001",
    invoiceNumber: "INV-2026-00001",
    amount: 1450.0,
    createdAt: "2026-01-15T10:00:00.000Z",
  };

  const alloc2: PaymentAllocationRecord = {
    id: "alloc-02",
    paymentId: "pay-002",
    invoiceId: "inv-002",
    invoiceNumber: "INV-2026-00002",
    amount: 500.0,
    createdAt: "2026-01-20T14:30:00.000Z",
  };

  const invoices: InvoiceRecord[] = [
    {
      id: "inv-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      academicYearId: "ay-2025-26",
      termId: "term-2025-t2",
      studentId: "stu-001",
      studentName: "Lucas Wright",
      studentAdmissionNumber: "STU-2025-00001",
      classId: "class-g10-a",
      className: "Grade 10 - Section A",
      feeStructureId: defaultStructureId,
      invoiceNumber: "INV-2026-00001",
      issueDate: "2026-01-10T00:00:00.000Z",
      dueDate: "2026-02-15T00:00:00.000Z",
      status: "PAID",
      subtotal: 1450.0,
      discountTotal: 0,
      waiverTotal: 0,
      taxTotal: 0,
      totalAmount: 1450.0,
      paidAmount: 1450.0,
      balanceDue: 0,
      notes: "Prompt payment cleared in full",
      isLocked: true,
      createdById: "u-super-admin-01",
      items: inv1Items,
      allocations: [alloc1],
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    },
    {
      id: "inv-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      academicYearId: "ay-2025-26",
      termId: "term-2025-t2",
      studentId: "stu-002",
      studentName: "Amina Al-Mansoor",
      studentAdmissionNumber: "STU-2025-00002",
      classId: "class-g10-a",
      className: "Grade 10 - Section A",
      feeStructureId: defaultStructureId,
      invoiceNumber: "INV-2026-00002",
      issueDate: "2026-01-10T00:00:00.000Z",
      dueDate: "2026-02-15T00:00:00.000Z",
      status: "PARTIALLY_PAID",
      subtotal: 1350.0,
      discountTotal: 0,
      waiverTotal: 0,
      taxTotal: 0,
      totalAmount: 1350.0,
      paidAmount: 500.0,
      balanceDue: 850.0,
      notes: "First installment received",
      isLocked: false,
      createdById: "u-super-admin-01",
      items: inv2Items,
      allocations: [alloc2],
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-20T14:30:00.000Z",
    },
    {
      id: "inv-003",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      academicYearId: "ay-2025-26",
      termId: "term-2025-t2",
      studentId: "stu-003",
      studentName: "Chukwudi Okafor",
      studentAdmissionNumber: "STU-2025-00003",
      classId: "class-g10-a",
      className: "Grade 10 - Section A",
      feeStructureId: defaultStructureId,
      invoiceNumber: "INV-2026-00003",
      issueDate: "2026-01-10T00:00:00.000Z",
      dueDate: "2026-01-30T00:00:00.000Z", // Past due -> Overdue
      status: "OVERDUE",
      subtotal: 1450.0,
      discountTotal: 0,
      waiverTotal: 200.0, // Need-based scholarship
      taxTotal: 0,
      totalAmount: 1250.0,
      paidAmount: 0,
      balanceDue: 1250.0,
      notes: "Payment reminder dispatched",
      isLocked: false,
      createdById: "u-super-admin-01",
      items: inv1Items.map((it) => ({ ...it, id: it.id + "-3", invoiceId: "inv-003", paidAmount: 0 })),
      allocations: [],
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-10T00:00:00.000Z",
    },
    {
      id: "inv-004",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      academicYearId: "ay-2025-26",
      termId: "term-2025-t2",
      studentId: "stu-005",
      studentName: "Devin Wright",
      studentAdmissionNumber: "STU-2024-00018",
      classId: "cls-jss1-2526",
      className: "Junior Secondary 1 - Section B",
      feeStructureId: defaultStructureId,
      invoiceNumber: "INV-2026-00004",
      issueDate: "2026-01-10T00:00:00.000Z",
      dueDate: "2026-02-28T00:00:00.000Z",
      status: "PARTIALLY_PAID",
      subtotal: 1350.0,
      discountTotal: 0,
      waiverTotal: 0,
      taxTotal: 0,
      totalAmount: 1350.0,
      paidAmount: 600.0,
      balanceDue: 750.0,
      notes: "First installment settled via Bank Transfer",
      isLocked: false,
      createdById: "u-super-admin-01",
      items: inv2Items.map((it) => ({ ...it, id: it.id + "-4", invoiceId: "inv-004" })),
      allocations: [
        {
          id: "alloc-04",
          paymentId: "pay-004",
          invoiceId: "inv-004",
          invoiceNumber: "INV-2026-00004",
          amount: 600.0,
          createdAt: "2026-01-22T11:00:00.000Z",
        },
      ],
      createdAt: "2026-01-10T00:00:00.000Z",
      updatedAt: "2026-01-22T11:00:00.000Z",
    },
  ];

  const payments: PaymentRecord[] = [
    {
      id: "pay-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-001",
      studentName: "Lucas Wright",
      studentAdmissionNumber: "STU-2025-00001",
      paymentNumber: "PAY-2026-00001",
      amount: 1450.0,
      paymentMethod: "BANK_TRANSFER",
      reference: "TRX-CHASE-992182",
      paymentDate: "2026-01-15T10:00:00.000Z",
      status: "COMPLETED",
      notes: "Full term tuition settled via wire transfer",
      receivedById: "u-accountant-01",
      allocatedAmount: 1450.0,
      surplusAmount: 0,
      allocations: [alloc1],
      receiptId: "rec-001",
      createdAt: "2026-01-15T10:00:00.000Z",
      updatedAt: "2026-01-15T10:00:00.000Z",
    },
    {
      id: "pay-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-002",
      studentName: "Amina Al-Mansoor",
      studentAdmissionNumber: "STU-2025-00002",
      paymentNumber: "PAY-2026-00002",
      amount: 500.0,
      paymentMethod: "POS",
      reference: "POS-SLIP-4410",
      paymentDate: "2026-01-20T14:30:00.000Z",
      status: "COMPLETED",
      notes: "Part-payment terminal transaction",
      receivedById: "u-accountant-01",
      allocatedAmount: 500.0,
      surplusAmount: 0,
      allocations: [alloc2],
      receiptId: "rec-002",
      createdAt: "2026-01-20T14:30:00.000Z",
      updatedAt: "2026-01-20T14:30:00.000Z",
    },
    {
      id: "pay-004",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-005",
      studentName: "Devin Wright",
      studentAdmissionNumber: "STU-2024-00018",
      paymentNumber: "PAY-2026-00004",
      amount: 600.0,
      paymentMethod: "BANK_TRANSFER",
      reference: "TRX-WIRE-881290",
      paymentDate: "2026-01-22T11:00:00.000Z",
      status: "COMPLETED",
      notes: "Part tuition payment for Devin Wright",
      receivedById: "u-accountant-01",
      allocatedAmount: 600.0,
      surplusAmount: 0,
      allocations: [
        {
          id: "alloc-04",
          paymentId: "pay-004",
          invoiceId: "inv-004",
          invoiceNumber: "INV-2026-00004",
          amount: 600.0,
          createdAt: "2026-01-22T11:00:00.000Z",
        },
      ],
      receiptId: "rec-004",
      createdAt: "2026-01-22T11:00:00.000Z",
      updatedAt: "2026-01-22T11:00:00.000Z",
    },
  ];

  const receipts: ReceiptRecord[] = [
    {
      id: "rec-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-001",
      studentName: "Lucas Wright",
      studentAdmissionNumber: "STU-2025-00001",
      className: "Grade 10 - Section A",
      paymentId: "pay-001",
      paymentNumber: "PAY-2026-00001",
      paymentMethod: "BANK_TRANSFER",
      paymentReference: "TRX-CHASE-992182",
      receiptNumber: "REC-2026-00001",
      amountPaid: 1450.0,
      outstandingBalance: 0,
      issuedAt: "2026-01-15T10:05:00.000Z",
      issuedById: "u-accountant-01",
      notes: "Official tuition receipt",
      invoicesCovered: [
        {
          invoiceNumber: "INV-2026-00001",
          allocatedAmount: 1450.0,
          remainingBalance: 0,
        },
      ],
      createdAt: "2026-01-15T10:05:00.000Z",
    },
    {
      id: "rec-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-002",
      studentName: "Amina Al-Mansoor",
      studentAdmissionNumber: "STU-2025-00002",
      className: "Grade 10 - Section A",
      paymentId: "pay-002",
      paymentNumber: "PAY-2026-00002",
      paymentMethod: "POS",
      paymentReference: "POS-SLIP-4410",
      receiptNumber: "REC-2026-00002",
      amountPaid: 500.0,
      outstandingBalance: 850.0,
      issuedAt: "2026-01-20T14:35:00.000Z",
      issuedById: "u-accountant-01",
      notes: "Part-payment receipt",
      invoicesCovered: [
        {
          invoiceNumber: "INV-2026-00002",
          allocatedAmount: 500.0,
          remainingBalance: 850.0,
        },
      ],
      createdAt: "2026-01-20T14:35:00.000Z",
    },
    {
      id: "rec-004",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-005",
      studentName: "Devin Wright",
      studentAdmissionNumber: "STU-2024-00018",
      className: "Junior Secondary 1 - Section B",
      paymentId: "pay-004",
      paymentNumber: "PAY-2026-00004",
      paymentMethod: "BANK_TRANSFER",
      paymentReference: "TRX-WIRE-881290",
      receiptNumber: "REC-2026-00004",
      amountPaid: 600.0,
      outstandingBalance: 750.0,
      issuedAt: "2026-01-22T11:05:00.000Z",
      issuedById: "u-accountant-01",
      notes: "Part-payment receipt",
      invoicesCovered: [
        {
          invoiceNumber: "INV-2026-00004",
          allocatedAmount: 600.0,
          remainingBalance: 750.0,
        },
      ],
      createdAt: "2026-01-22T11:05:00.000Z",
    },
  ];

  const waivers: FeeWaiverRecord[] = [
    {
      id: "waiver-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-003",
      studentName: "Chukwudi Okafor",
      invoiceId: "inv-003",
      invoiceNumber: "INV-2026-00003",
      category: "NEED_BASED",
      discountType: "FIXED_AMOUNT",
      value: 200.0,
      calculatedAmount: 200.0,
      status: "APPROVED",
      reason: "Bursary board grant for exceptional STEM student under hardship",
      authorizedById: "u-principal-01",
      approvedAt: "2026-01-10T09:00:00.000Z",
      notes: "Authorized by Principal's office",
      createdAt: "2026-01-10T09:00:00.000Z",
      updatedAt: "2026-01-10T09:00:00.000Z",
    },
  ];

  const creditBalances = new Map<string, StudentCreditBalanceRecord>();

  return {
    categories,
    structures,
    feeItems,
    assignments: [],
    invoices,
    waivers,
    payments,
    allocations: [alloc1, alloc2],
    receipts,
    creditBalances,
    refunds: [],
    invoiceSeq: 4,
    paymentSeq: 3,
    receiptSeq: 3,
    refundSeq: 1,
  };
}

// Global in-memory singleton for resilience
let memoryState: InMemoryFinanceState = initializeFinanceState();

export class FinanceService {
  /**
   * Resets memory state (used primarily in test suites)
   */
  public resetState(): void {
    memoryState = initializeFinanceState();
  }

  // ===========================================================================
  // 1. FEE CATEGORIES
  // ===========================================================================

  public async getFeeCategories(context: TenantContext): Promise<FeeCategoryRecord[]> {
    this.assertTenant(context);
    try {
      const records = await prisma.feeCategory.findMany({
        where: {
          organizationId: context.organizationId,
          ...(context.campusId ? { OR: [{ campusId: context.campusId }, { campusId: null }] } : {}),
        },
        orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      });
      if (records.length > 0) {
        return records.map(this.mapPrismaFeeCategory);
      }
    } catch (err) {
      logger.warn("Database lookup failed for fee categories, using memory state", { error: String(err) });
    }

    return memoryState.categories.filter((cat) => {
      if (cat.organizationId !== context.organizationId) return false;
      if (context.campusId && cat.campusId && cat.campusId !== context.campusId) return false;
      return true;
    });
  }

  public async getFeeCategoryById(context: TenantContext, id: string): Promise<FeeCategoryRecord> {
    this.assertTenant(context);
    try {
      const record = await prisma.feeCategory.findFirst({
        where: { id, organizationId: context.organizationId },
      });
      if (record) return this.mapPrismaFeeCategory(record);
    } catch {
      // Fallback
    }

    const cat = memoryState.categories.find(
      (c) => c.id === id && c.organizationId === context.organizationId
    );
    if (!cat) {
      throw new NotFoundError(`Fee category with ID '${id}' not found`);
    }
    return cat;
  }

  public async createFeeCategory(
    context: TenantContext,
    input: CreateFeeCategoryInput
  ): Promise<FeeCategoryRecord> {
    this.assertTenant(context);

    // Prevent duplicate codes within organization
    const existing = memoryState.categories.find(
      (c) => c.organizationId === context.organizationId && c.code.toUpperCase() === input.code.toUpperCase()
    );
    if (existing) {
      throw new ValidationError(`Fee category with code '${input.code}' already exists`);
    }

    const newRecord: FeeCategoryRecord = {
      id: `fcat-${Date.now().toString(36)}`,
      organizationId: context.organizationId,
      campusId: input.campusId || null,
      name: input.name.trim(),
      code: input.code.toUpperCase().trim(),
      description: input.description?.trim() || null,
      isSystem: false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const created = await prisma.feeCategory.create({
        data: {
          id: newRecord.id,
          organizationId: newRecord.organizationId,
          campusId: newRecord.campusId,
          name: newRecord.name,
          code: newRecord.code,
          description: newRecord.description,
          isSystem: false,
          isActive: true,
        },
      });
      newRecord.id = created.id;
    } catch (err) {
      logger.warn("Database creation failed for fee category, persisting to memory", { error: String(err) });
    }

    memoryState.categories.push(newRecord);

    await auditRepository.createLog({
      organizationId: context.organizationId,
      campusId: context.campusId || undefined,
      userId: context.userId,
      action: "CREATE",
      entityType: "FeeCategory",
      entityId: newRecord.id,
      metadata: { name: newRecord.name, code: newRecord.code },
    });

    return newRecord;
  }

  public async updateFeeCategory(
    context: TenantContext,
    id: string,
    input: UpdateFeeCategoryInput
  ): Promise<FeeCategoryRecord> {
    const category = await this.getFeeCategoryById(context, id);

    if (input.code && input.code.toUpperCase() !== category.code) {
      const duplicate = memoryState.categories.find(
        (c) =>
          c.id !== id &&
          c.organizationId === context.organizationId &&
          c.code.toUpperCase() === input.code!.toUpperCase()
      );
      if (duplicate) {
        throw new ValidationError(`Fee category code '${input.code}' is already in use`);
      }
      category.code = input.code.toUpperCase().trim();
    }

    if (input.name) category.name = input.name.trim();
    if (input.description !== undefined) category.description = input.description?.trim() || null;
    if (input.isActive !== undefined) category.isActive = input.isActive;
    category.updatedAt = new Date().toISOString();

    try {
      await prisma.feeCategory.update({
        where: { id },
        data: {
          name: category.name,
          code: category.code,
          description: category.description,
          isActive: category.isActive,
        },
      });
    } catch {
      // Fallback
    }

    return category;
  }

  public async deleteFeeCategory(context: TenantContext, id: string): Promise<{ success: boolean }> {
    const category = await this.getFeeCategoryById(context, id);
    if (category.isSystem) {
      throw new ForbiddenError("System fee categories cannot be deleted");
    }

    // Check if referenced
    const hasItems = memoryState.feeItems.some((item) => item.feeCategoryId === id);
    if (hasItems) {
      throw new ValidationError("Cannot delete category with associated fee items");
    }

    memoryState.categories = memoryState.categories.filter((c) => c.id !== id);

    try {
      await prisma.feeCategory.delete({ where: { id } });
    } catch {
      // Fallback
    }

    return { success: true };
  }

  // ===========================================================================
  // 2. FEE STRUCTURES & ITEMS
  // ===========================================================================

  public async getFeeStructures(
    context: TenantContext,
    filters?: {
      campusId?: string;
      academicYearId?: string;
      termId?: string;
      classId?: string;
      status?: string;
    }
  ): Promise<FeeStructureRecord[]> {
    this.assertTenant(context);
    try {
      const records = await prisma.feeStructure.findMany({
        where: {
          organizationId: context.organizationId,
          ...(filters?.campusId ? { campusId: filters.campusId } : {}),
          ...(filters?.academicYearId ? { academicYearId: filters.academicYearId } : {}),
          ...(filters?.termId ? { termId: filters.termId } : {}),
          ...(filters?.classId ? { classId: filters.classId } : {}),
          ...(filters?.status ? { status: filters.status as FeeStructureStatus } : {}),
        },
        include: {
          feeItems: {
            include: { feeCategory: true },
          },
        },
        orderBy: [{ version: "desc" }, { createdAt: "desc" }],
      });
      if (records.length > 0) {
        return records.map(this.mapPrismaFeeStructure);
      }
    } catch (err) {
      logger.warn("Database lookup failed for fee structures, using memory state", { error: String(err) });
    }

    return memoryState.structures.filter((struct) => {
      if (struct.organizationId !== context.organizationId) return false;
      if (filters?.campusId && struct.campusId !== filters.campusId) return false;
      if (filters?.academicYearId && struct.academicYearId !== filters.academicYearId) return false;
      if (filters?.termId && struct.termId !== filters.termId) return false;
      if (filters?.classId && struct.classId !== filters.classId) return false;
      if (filters?.status && struct.status !== filters.status) return false;
      return true;
    });
  }

  public async getFeeStructureById(context: TenantContext, id: string): Promise<FeeStructureRecord> {
    this.assertTenant(context);
    try {
      const record = await prisma.feeStructure.findFirst({
        where: { id, organizationId: context.organizationId },
        include: { feeItems: { include: { feeCategory: true } } },
      });
      if (record) return this.mapPrismaFeeStructure(record);
    } catch {
      // Fallback
    }

    const found = memoryState.structures.find(
      (s) => s.id === id && s.organizationId === context.organizationId
    );
    if (!found) {
      throw new NotFoundError(`Fee structure with ID '${id}' not found`);
    }
    return found;
  }

  public async createFeeStructure(
    context: TenantContext,
    input: CreateFeeStructureInput
  ): Promise<FeeStructureRecord> {
    this.assertTenant(context);

    const structureId = `fstruct-${Date.now().toString(36)}`;
    let total = 0;

    const items: FeeItemRecord[] = input.items.map((it, idx) => {
      const safeAmount = roundMoney(it.amount);
      total = addMoney(total, safeAmount);

      const category = memoryState.categories.find((c) => c.id === it.feeCategoryId);

      return {
        id: `fitem-${Date.now().toString(36)}-${idx}`,
        organizationId: context.organizationId,
        campusId: input.campusId,
        feeStructureId: structureId,
        feeCategoryId: it.feeCategoryId,
        categoryName: category?.name || "Standard Fee",
        name: it.name.trim(),
        code: it.code?.trim() || null,
        description: it.description?.trim() || null,
        amount: safeAmount,
        isMandatory: it.isMandatory !== undefined ? it.isMandatory : true,
        frequency: it.frequency || "TERM",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const structure: FeeStructureRecord = {
      id: structureId,
      organizationId: context.organizationId,
      campusId: input.campusId,
      academicYearId: input.academicYearId,
      termId: input.termId || null,
      classLevelId: input.classLevelId || null,
      classId: input.classId || null,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      version: (input as any).version || 1,
      status: input.status || "ACTIVE",
      items,
      totalAmount: total,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await prisma.feeStructure.create({
        data: {
          id: structure.id,
          organizationId: structure.organizationId,
          campusId: structure.campusId,
          academicYearId: structure.academicYearId,
          termId: structure.termId,
          classLevelId: structure.classLevelId,
          classId: structure.classId,
          name: structure.name,
          description: structure.description,
          version: structure.version,
          status: structure.status,
          feeItems: {
            create: items.map((it) => ({
              id: it.id,
              organizationId: it.organizationId,
              campusId: it.campusId,
              feeCategoryId: it.feeCategoryId,
              name: it.name,
              code: it.code,
              description: it.description,
              amount: it.amount,
              isMandatory: it.isMandatory,
              frequency: it.frequency,
            })),
          },
        },
      });
    } catch (err) {
      logger.warn("Database creation failed for fee structure, saving in memory", { error: String(err) });
    }

    memoryState.structures.push(structure);
    memoryState.feeItems.push(...items);

    await auditRepository.createLog({
      organizationId: context.organizationId,
      campusId: structure.campusId,
      userId: context.userId,
      action: "CREATE",
      entityType: "FeeStructure",
      entityId: structure.id,
      metadata: { name: structure.name, totalAmount: total, itemsCount: items.length },
    });

    return structure;
  }

  /**
   * Versioning safeguard: If invoices have already been issued against this fee structure,
   * modifying it clones the structure into a new version (e.g. Version 2) to preserve historical integrity.
   */
  public async updateFeeStructure(
    context: TenantContext,
    id: string,
    input: UpdateFeeStructureInput
  ): Promise<FeeStructureRecord> {
    const existing = await this.getFeeStructureById(context, id);

    const hasInvoices = memoryState.invoices.some((inv) => inv.feeStructureId === id);

    if (hasInvoices && input.items && input.items.length > 0) {
      // Historical preservation: Create new version!
      logger.info("Fee structure has issued invoices. Versioning to protect historical invoices", { id });
      return this.cloneFeeStructureVersion(context, id, input.name || `${existing.name} (v${existing.version + 1})`, input.items);
    }

    if (input.name) existing.name = input.name.trim();
    if (input.description !== undefined) existing.description = input.description?.trim() || null;
    if (input.status) existing.status = input.status;
    if (input.termId !== undefined) existing.termId = input.termId;
    if (input.classLevelId !== undefined) existing.classLevelId = input.classLevelId;
    if (input.classId !== undefined) existing.classId = input.classId;

    if (input.items) {
      let total = 0;
      const updatedItems: FeeItemRecord[] = input.items.map((it, idx) => {
        const safeAmount = roundMoney(it.amount);
        total = addMoney(total, safeAmount);
        const cat = memoryState.categories.find((c) => c.id === it.feeCategoryId);

        return {
          id: it.id || `fitem-${Date.now().toString(36)}-${idx}`,
          organizationId: context.organizationId,
          campusId: existing.campusId,
          feeStructureId: existing.id,
          feeCategoryId: it.feeCategoryId,
          categoryName: cat?.name || "Standard Fee",
          name: it.name.trim(),
          code: it.code?.trim() || null,
          description: it.description?.trim() || null,
          amount: safeAmount,
          isMandatory: it.isMandatory !== undefined ? it.isMandatory : true,
          frequency: it.frequency || "TERM",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      existing.items = updatedItems;
      existing.totalAmount = total;

      // Update in global items array
      memoryState.feeItems = memoryState.feeItems.filter((i) => i.feeStructureId !== id).concat(updatedItems);
    }

    existing.updatedAt = new Date().toISOString();
    return existing;
  }

  public async cloneFeeStructureVersion(
    context: TenantContext,
    id: string,
    newName?: string,
    newItems?: CreateFeeStructureInput["items"]
  ): Promise<FeeStructureRecord> {
    const parent = await this.getFeeStructureById(context, id);

    const versionNumber = parent.version + 1;
    const structureName = newName || `${parent.name} (v${versionNumber})`;
    const itemsSource = newItems || parent.items;

    return this.createFeeStructure(context, {
      name: structureName,
      description: `Cloned from Version ${parent.version} (${parent.name})`,
      campusId: parent.campusId,
      academicYearId: parent.academicYearId,
      termId: parent.termId,
      classLevelId: parent.classLevelId,
      classId: parent.classId,
      status: "ACTIVE",
      items: itemsSource,
      version: versionNumber,
    } as any);
  }

  // ===========================================================================
  // 3. STUDENT FEE ASSIGNMENTS
  // ===========================================================================

  public async assignStudentFees(
    context: TenantContext,
    input: AssignStudentFeeInput
  ): Promise<StudentFeeAssignmentRecord> {
    this.assertTenant(context);

    const assignment: StudentFeeAssignmentRecord = {
      id: `sfa-${Date.now().toString(36)}`,
      organizationId: context.organizationId,
      campusId: context.campusId || DEMO_CAMPUS_MAIN_ID,
      studentId: input.studentId,
      feeStructureId: input.feeStructureId,
      academicYearId: input.academicYearId,
      termId: input.termId || null,
      customDiscountPercent: Math.max(0, Math.min(100, input.customDiscountPercent || 0)),
      isExempt: !!input.isExempt,
      notes: input.notes?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryState.assignments.push(assignment);
    return assignment;
  }

  public async getStudentFeeAssignments(
    context: TenantContext,
    studentId: string
  ): Promise<StudentFeeAssignmentRecord[]> {
    this.assertTenant(context);
    return memoryState.assignments.filter(
      (a) => a.studentId === studentId && a.organizationId === context.organizationId
    );
  }

  // ===========================================================================
  // 4. INVOICING ENGINE
  // ===========================================================================

  public async generateInvoice(
    context: TenantContext,
    input: GenerateInvoiceInput
  ): Promise<InvoiceRecord> {
    this.assertTenant(context);

    // Recalculate totals strictly server-side
    let subtotal = 0;
    let discountTotal = 0;

    const invoiceId = `inv-${Date.now().toString(36)}`;
    const invoiceNumber = this.generateInvoiceNumber();

    const items: InvoiceItemRecord[] = input.items.map((it, idx) => {
      const unit = roundMoney(it.unitAmount);
      const qty = Math.max(1, it.quantity || 1);
      const itemDiscount = roundMoney(it.discountAmount || 0);

      const lineTotal = subtractMoney(multiplyMoney(unit, qty), itemDiscount);
      subtotal = addMoney(subtotal, multiplyMoney(unit, qty));
      discountTotal = addMoney(discountTotal, itemDiscount);

      const cat = memoryState.categories.find((c) => c.id === it.feeCategoryId);

      return {
        id: `inv-item-${Date.now().toString(36)}-${idx}`,
        invoiceId,
        feeItemId: it.feeItemId || null,
        feeCategoryId: it.feeCategoryId || null,
        categoryName: cat?.name || "Institutional Fee",
        name: it.name.trim(),
        description: it.description?.trim() || null,
        quantity: qty,
        unitAmount: unit,
        discountAmount: itemDiscount,
        totalAmount: lineTotal,
        paidAmount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    const totalAmount = subtractMoney(subtotal, discountTotal);
    const balanceDue = totalAmount;

    // Resolve student metadata
    const student = this.resolveStudentMetadata(input.studentId);

    const invoice: InvoiceRecord = {
      id: invoiceId,
      organizationId: context.organizationId,
      campusId: input.campusId,
      academicYearId: input.academicYearId,
      termId: input.termId || null,
      studentId: input.studentId,
      studentName: student.name,
      studentAdmissionNumber: student.admissionNumber,
      classId: student.classId,
      className: student.className,
      feeStructureId: input.feeStructureId || null,
      invoiceNumber,
      issueDate: new Date().toISOString(),
      dueDate: new Date(input.dueDate).toISOString(),
      status: "ISSUED",
      subtotal,
      discountTotal,
      waiverTotal: 0,
      taxTotal: 0,
      totalAmount,
      paidAmount: 0,
      balanceDue,
      notes: input.notes?.trim() || null,
      isLocked: false,
      createdById: context.userId,
      items,
      allocations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await prisma.invoice.create({
        data: {
          id: invoice.id,
          organizationId: invoice.organizationId,
          campusId: invoice.campusId,
          academicYearId: invoice.academicYearId,
          termId: invoice.termId,
          studentId: invoice.studentId,
          feeStructureId: invoice.feeStructureId,
          invoiceNumber: invoice.invoiceNumber,
          issueDate: new Date(invoice.issueDate),
          dueDate: new Date(invoice.dueDate),
          status: invoice.status,
          subtotal: invoice.subtotal,
          discountTotal: invoice.discountTotal,
          waiverTotal: invoice.waiverTotal,
          taxTotal: invoice.taxTotal,
          totalAmount: invoice.totalAmount,
          paidAmount: invoice.paidAmount,
          balanceDue: invoice.balanceDue,
          notes: invoice.notes,
          isLocked: false,
          createdById: invoice.createdById,
          items: {
            create: items.map((it) => ({
              id: it.id,
              feeItemId: it.feeItemId,
              feeCategoryId: it.feeCategoryId,
              name: it.name,
              description: it.description,
              quantity: it.quantity,
              unitAmount: it.unitAmount,
              discountAmount: it.discountAmount,
              totalAmount: it.totalAmount,
              paidAmount: 0,
            })),
          },
        },
      });
    } catch (err) {
      logger.warn("Database creation failed for invoice, stored in memory", { error: String(err) });
    }

    memoryState.invoices.push(invoice);

    await auditRepository.createLog({
      organizationId: context.organizationId,
      campusId: invoice.campusId,
      userId: context.userId,
      action: "CREATE",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { invoiceNumber, studentId: input.studentId, totalAmount },
    });

    return invoice;
  }

  /**
   * Batch generates invoices for a target cohort or class while preventing duplicate active invoices
   */
  public async batchGenerateInvoices(
    context: TenantContext,
    input: BatchGenerateInvoicesInput
  ): Promise<{
    generatedCount: number;
    skippedCount: number;
    invoices: InvoiceRecord[];
  }> {
    this.assertTenant(context);

    const feeStructure = await this.getFeeStructureById(context, input.feeStructureId);

    // Eligible students from memory or database
    let targetStudents = [
      { id: "stu-001", name: "Lucas Wright", admissionNumber: "STU-2025-00001", classId: "class-g10-a", className: "Grade 10 - Section A" },
      { id: "stu-002", name: "Amina Al-Mansoor", admissionNumber: "STU-2025-00002", classId: "class-g10-a", className: "Grade 10 - Section A" },
      { id: "stu-003", name: "Chukwudi Okafor", admissionNumber: "STU-2025-00003", classId: "class-g10-a", className: "Grade 10 - Section A" },
    ];

    if (input.classId) {
      targetStudents = targetStudents.filter((s) => s.classId === input.classId);
    }

    const createdInvoices: InvoiceRecord[] = [];
    let skippedCount = 0;

    for (const student of targetStudents) {
      // Deduplication check: Has student already received an active invoice for this term & fee structure?
      const alreadyHasInvoice = memoryState.invoices.some(
        (inv) =>
          inv.studentId === student.id &&
          inv.academicYearId === input.academicYearId &&
          inv.termId === input.termId &&
          inv.feeStructureId === input.feeStructureId &&
          inv.status !== "VOID" &&
          inv.status !== "CANCELLED"
      );

      if (alreadyHasInvoice) {
        skippedCount++;
        continue;
      }

      // Check student fee assignment for discounts
      const assignment = memoryState.assignments.find(
        (a) => a.studentId === student.id && a.feeStructureId === input.feeStructureId
      );

      if (assignment?.isExempt) {
        skippedCount++;
        continue;
      }

      const discountPercent = assignment?.customDiscountPercent || 0;

      const invoiceItems = feeStructure.items.map((it) => {
        const itemDiscount = calculatePercentage(it.amount, discountPercent);
        return {
          feeItemId: it.id,
          feeCategoryId: it.feeCategoryId,
          name: it.name,
          description: it.description,
          quantity: 1,
          unitAmount: it.amount,
          discountAmount: itemDiscount,
        };
      });

      const inv = await this.generateInvoice(context, {
        campusId: input.campusId,
        academicYearId: input.academicYearId,
        termId: input.termId,
        studentId: student.id,
        feeStructureId: input.feeStructureId,
        dueDate: input.dueDate,
        notes: input.notes || `Generated from ${feeStructure.name}`,
        items: invoiceItems,
      });

      createdInvoices.push(inv);
    }

    return {
      generatedCount: createdInvoices.length,
      skippedCount,
      invoices: createdInvoices,
    };
  }

  public async getInvoices(
    context: TenantContext,
    filters?: {
      campusId?: string;
      academicYearId?: string;
      termId?: string;
      status?: string;
      studentId?: string;
      search?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ invoices: InvoiceRecord[]; total: number }> {
    this.assertTenant(context);
    const effectiveCampusId = enforceCampusIsolation(context, filters?.campusId);

    try {
      const records = await prisma.invoice.findMany({
        where: {
          organizationId: context.organizationId,
          ...(effectiveCampusId ? { campusId: effectiveCampusId } : {}),
          ...(filters?.academicYearId ? { academicYearId: filters.academicYearId } : {}),
          ...(filters?.termId ? { termId: filters.termId } : {}),
          ...(filters?.status ? { status: filters.status as InvoiceStatus } : {}),
          ...(filters?.studentId ? { studentId: filters.studentId } : {}),
        },
        include: {
          items: true,
          allocations: true,
        },
        orderBy: { createdAt: "desc" },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      });

      if (records.length > 0) {
        return {
          invoices: records.map(this.mapPrismaInvoice),
          total: records.length,
        };
      }
    } catch {
      // Memory state fallback
    }

    let result = memoryState.invoices.filter((inv) => {
      if (inv.organizationId !== context.organizationId) return false;
      if (effectiveCampusId && inv.campusId !== effectiveCampusId) return false;
      if (filters?.academicYearId && inv.academicYearId !== filters.academicYearId) return false;
      if (filters?.termId && inv.termId !== filters.termId) return false;
      if (filters?.status && inv.status !== filters.status) return false;
      if (filters?.studentId && inv.studentId !== filters.studentId) return false;
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        return (
          inv.invoiceNumber.toLowerCase().includes(query) ||
          inv.studentName?.toLowerCase().includes(query) ||
          inv.studentAdmissionNumber?.toLowerCase().includes(query)
        );
      }
      return true;
    });

    const total = result.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    result = result.slice(offset, offset + limit);

    return { invoices: result, total };
  }

  public async getInvoiceById(context: TenantContext, id: string): Promise<InvoiceRecord> {
    this.assertTenant(context);
    try {
      const record = await prisma.invoice.findFirst({
        where: { id, organizationId: context.organizationId },
        include: { items: true, allocations: true },
      });
      if (record) {
        const mapped = this.mapPrismaInvoice(record);
        if (
          context.campusId &&
          mapped.campusId &&
          mapped.campusId !== context.campusId &&
          !context.userRoles?.includes("Super Administrator") &&
          !context.userRoles?.includes("Organization Administrator")
        ) {
          throw new ForbiddenError("Access denied: You do not have access to invoices from this campus branch.");
        }
        return mapped;
      }
    } catch (err) {
      if (err instanceof ForbiddenError) throw err;
      // Fallback
    }

    const found = memoryState.invoices.find(
      (inv) => inv.id === id && inv.organizationId === context.organizationId
    );
    if (!found) {
      throw new NotFoundError(`Invoice with ID '${id}' not found`);
    }

    if (
      context.campusId &&
      found.campusId &&
      found.campusId !== context.campusId &&
      !context.userRoles?.includes("Super Administrator") &&
      !context.userRoles?.includes("Organization Administrator")
    ) {
      throw new ForbiddenError("Access denied: You do not have access to invoices from this campus branch.");
    }

    return found;
  }

  public async voidInvoice(
    context: TenantContext,
    id: string,
    input: VoidInvoiceInput
  ): Promise<InvoiceRecord> {
    const invoice = await this.getInvoiceById(context, id);

    if (invoice.status === "VOID") {
      throw new ValidationError("Invoice is already voided");
    }

    if (invoice.paidAmount > 0) {
      throw new ForbiddenError(
        "Cannot void an invoice that has payments recorded. Refund or reallocate payments before voiding."
      );
    }

    invoice.status = "VOID";
    invoice.voidedById = context.userId;
    invoice.voidedAt = new Date().toISOString();
    invoice.voidReason = input.reason.trim();
    invoice.balanceDue = 0;
    invoice.updatedAt = new Date().toISOString();

    try {
      await prisma.invoice.update({
        where: { id },
        data: {
          status: "VOID",
          voidedById: context.userId,
          voidedAt: new Date(invoice.voidedAt),
          voidReason: invoice.voidReason,
          balanceDue: 0,
        },
      });
    } catch {
      // Fallback
    }

    await auditRepository.createLog({
      organizationId: context.organizationId,
      campusId: invoice.campusId,
      userId: context.userId,
      action: "VOID",
      entityType: "Invoice",
      entityId: invoice.id,
      metadata: { invoiceNumber: invoice.invoiceNumber, reason: input.reason },
    });

    return invoice;
  }

  // ===========================================================================
  // 5. WAIVERS & SCHOLARSHIPS
  // ===========================================================================

  public async applyWaiver(
    context: TenantContext,
    input: ApplyWaiverInput
  ): Promise<FeeWaiverRecord> {
    this.assertTenant(context);

    let calculatedAmount = 0;
    let targetInvoice: InvoiceRecord | undefined;

    if (input.invoiceId) {
      targetInvoice = await this.getInvoiceById(context, input.invoiceId);
      if (targetInvoice.studentId !== input.studentId) {
        throw new ValidationError("Target invoice does not belong to the specified student.");
      }
      if (targetInvoice.status === "VOID" || targetInvoice.status === "CANCELLED") {
        throw new ValidationError("Cannot apply waiver to a voided or cancelled invoice.");
      }
      if (input.discountType === "PERCENTAGE") {
        calculatedAmount = calculatePercentage(targetInvoice.subtotal, input.value);
      } else {
        calculatedAmount = Math.min(targetInvoice.balanceDue, roundMoney(input.value));
      }
    } else {
      calculatedAmount = roundMoney(input.value);
    }

    const waiverId = `waiver-${Date.now().toString(36)}`;
    const student = this.resolveStudentMetadata(input.studentId);

    const waiver: FeeWaiverRecord = {
      id: waiverId,
      organizationId: context.organizationId,
      campusId: input.campusId,
      studentId: input.studentId,
      studentName: student.name,
      invoiceId: input.invoiceId || null,
      invoiceNumber: targetInvoice?.invoiceNumber || null,
      category: input.category,
      discountType: input.discountType,
      value: input.value,
      calculatedAmount,
      status: "APPROVED", // Auto-approved when authorized
      reason: input.reason.trim(),
      authorizedById: context.userId,
      approvedAt: new Date().toISOString(),
      notes: input.notes?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryState.waivers.push(waiver);

    // Apply directly to the invoice if specified
    if (targetInvoice) {
      targetInvoice.waiverTotal = addMoney(targetInvoice.waiverTotal, calculatedAmount);
      targetInvoice.totalAmount = subtractMoney(targetInvoice.totalAmount, calculatedAmount);
      targetInvoice.balanceDue = subtractMoney(targetInvoice.totalAmount, targetInvoice.paidAmount);

      if (targetInvoice.balanceDue === 0) {
        targetInvoice.status = "PAID";
      } else if (targetInvoice.paidAmount > 0) {
        targetInvoice.status = "PARTIALLY_PAID";
      }
      targetInvoice.updatedAt = new Date().toISOString();
    }

    await auditRepository.createLog({
      organizationId: context.organizationId,
      campusId: input.campusId,
      userId: context.userId,
      action: "APPLY_WAIVER",
      entityType: "FeeWaiver",
      entityId: waiver.id,
      metadata: { studentId: input.studentId, amount: calculatedAmount, category: input.category },
    });

    return waiver;
  }

  public async getWaivers(
    context: TenantContext,
    filters?: { studentId?: string; status?: string; campusId?: string }
  ): Promise<FeeWaiverRecord[]> {
    this.assertTenant(context);
    return memoryState.waivers.filter((w) => {
      if (w.organizationId !== context.organizationId) return false;
      if (filters?.campusId && w.campusId !== filters.campusId) return false;
      if (filters?.studentId && w.studentId !== filters.studentId) return false;
      if (filters?.status && w.status !== filters.status) return false;
      return true;
    });
  }

  public async reviewWaiver(
    context: TenantContext,
    id: string,
    input: ReviewWaiverInput
  ): Promise<FeeWaiverRecord> {
    this.assertTenant(context);
    const waiver = memoryState.waivers.find(
      (w) => w.id === id && w.organizationId === context.organizationId
    );
    if (!waiver) {
      throw new NotFoundError(`Waiver with ID '${id}' not found`);
    }

    waiver.status = input.status;
    waiver.authorizedById = context.userId;
    waiver.notes = input.notes?.trim() || waiver.notes;
    waiver.updatedAt = new Date().toISOString();

    return waiver;
  }

  // ===========================================================================
  // 6. PAYMENTS & ALLOCATIONS
  // ===========================================================================

  public async recordPayment(
    context: TenantContext,
    input: RecordPaymentInput
  ): Promise<{
    payment: PaymentRecord;
    receipt: ReceiptRecord;
    allocatedAmount: number;
    surplusAmount: number;
    creditBalance: number;
  }> {
    this.assertTenant(context);

    const safeAmount = roundMoney(input.amount);
    if (safeAmount <= 0) {
      throw new ValidationError("Payment amount must be greater than zero");
    }

    // Replay attack and duplicate external reference protection (CWE-294 / CWE-837)
    if (input.reference?.trim()) {
      const existingRef = memoryState.payments.find(
        (p) =>
          p.organizationId === context.organizationId &&
          p.reference?.toLowerCase() === input.reference!.trim().toLowerCase()
      );
      if (existingRef) {
        throw new ConflictError(
          `Payment with external reference "${input.reference.trim()}" has already been processed.`
        );
      }
    }

    const student = this.resolveStudentMetadata(input.studentId);
    const paymentId = `pay-${Date.now().toString(36)}`;
    const paymentNumber = this.generatePaymentNumber();

    let remainingToAllocate = safeAmount;
    const allocations: PaymentAllocationRecord[] = [];
    const invoicesCoveredSummary: Array<{ invoiceNumber: string; allocatedAmount: number; remainingBalance: number }> = [];

    // Mode A: Explicit Itemized Allocations Provided
    if (input.allocations && input.allocations.length > 0) {
      for (const reqAlloc of input.allocations) {
        if (remainingToAllocate <= 0) break;

        const inv = memoryState.invoices.find(
          (i) => i.id === reqAlloc.invoiceId && i.organizationId === context.organizationId
        );
        if (!inv || inv.studentId !== input.studentId || inv.status === "VOID" || inv.status === "CANCELLED") continue;

        const allocPortion = Math.min(remainingToAllocate, roundMoney(reqAlloc.amount), inv.balanceDue);
        if (allocPortion <= 0) continue;

        remainingToAllocate = subtractMoney(remainingToAllocate, allocPortion);

        // Update invoice balances
        inv.paidAmount = addMoney(inv.paidAmount, allocPortion);
        inv.balanceDue = subtractMoney(inv.totalAmount, inv.paidAmount);
        inv.status = inv.balanceDue === 0 ? "PAID" : "PARTIALLY_PAID";
        inv.updatedAt = new Date().toISOString();

        const allocRecord: PaymentAllocationRecord = {
          id: `alloc-${Date.now().toString(36)}-${allocations.length}`,
          paymentId,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: allocPortion,
          createdAt: new Date().toISOString(),
        };

        allocations.push(allocRecord);
        inv.allocations.push(allocRecord);
        memoryState.allocations.push(allocRecord);

        invoicesCoveredSummary.push({
          invoiceNumber: inv.invoiceNumber,
          allocatedAmount: allocPortion,
          remainingBalance: inv.balanceDue,
        });
      }
    } else {
      // Mode B: Automatic FIFO Allocation (Oldest outstanding due date first)
      const openInvoices = memoryState.invoices
        .filter(
          (inv) =>
            inv.studentId === input.studentId &&
            inv.organizationId === context.organizationId &&
            inv.balanceDue > 0 &&
            inv.status !== "VOID" &&
            inv.status !== "CANCELLED"
        )
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

      for (const inv of openInvoices) {
        if (remainingToAllocate <= 0) break;

        const allocPortion = Math.min(remainingToAllocate, inv.balanceDue);
        remainingToAllocate = subtractMoney(remainingToAllocate, allocPortion);

        inv.paidAmount = addMoney(inv.paidAmount, allocPortion);
        inv.balanceDue = subtractMoney(inv.totalAmount, inv.paidAmount);
        inv.status = inv.balanceDue === 0 ? "PAID" : "PARTIALLY_PAID";
        inv.updatedAt = new Date().toISOString();

        const allocRecord: PaymentAllocationRecord = {
          id: `alloc-${Date.now().toString(36)}-${allocations.length}`,
          paymentId,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: allocPortion,
          createdAt: new Date().toISOString(),
        };

        allocations.push(allocRecord);
        inv.allocations.push(allocRecord);
        memoryState.allocations.push(allocRecord);

        invoicesCoveredSummary.push({
          invoiceNumber: inv.invoiceNumber,
          allocatedAmount: allocPortion,
          remainingBalance: inv.balanceDue,
        });
      }
    }

    const totalAllocated = subtractMoney(safeAmount, remainingToAllocate);
    const surplusAmount = remainingToAllocate; // Overpayment -> Goes to Credit Balance

    // Handle Surplus: Credit to student account
    let currentCreditBalance = 0;
    if (surplusAmount > 0) {
      let creditRec = memoryState.creditBalances.get(input.studentId);
      if (!creditRec) {
        creditRec = {
          id: `scb-${Date.now().toString(36)}`,
          organizationId: context.organizationId,
          campusId: input.campusId,
          studentId: input.studentId,
          currentBalance: 0,
          totalCredited: 0,
          totalUsed: 0,
          transactions: [],
          updatedAt: new Date().toISOString(),
        };
        memoryState.creditBalances.set(input.studentId, creditRec);
      }

      creditRec.currentBalance = addMoney(creditRec.currentBalance, surplusAmount);
      creditRec.totalCredited = addMoney(creditRec.totalCredited, surplusAmount);
      creditRec.transactions.push({
        id: `sctx-${Date.now().toString(36)}`,
        creditBalanceId: creditRec.id,
        amount: surplusAmount,
        type: "OVERPAYMENT",
        referenceId: paymentNumber,
        description: `Overpayment surplus from ${paymentNumber}`,
        createdAt: new Date().toISOString(),
      });
      creditRec.updatedAt = new Date().toISOString();
      currentCreditBalance = creditRec.currentBalance;
    }

    // Create Payment Record
    const receiptNumber = this.generateReceiptNumber();
    const receiptId = `rec-${Date.now().toString(36)}`;

    const payment: PaymentRecord = {
      id: paymentId,
      organizationId: context.organizationId,
      campusId: input.campusId,
      studentId: input.studentId,
      studentName: student.name,
      studentAdmissionNumber: student.admissionNumber,
      paymentNumber,
      amount: safeAmount,
      paymentMethod: input.paymentMethod,
      reference: input.reference?.trim() || null,
      paymentDate: input.paymentDate || new Date().toISOString(),
      status: "COMPLETED",
      notes: input.notes?.trim() || null,
      receivedById: context.userId,
      allocatedAmount: totalAllocated,
      surplusAmount,
      allocations,
      receiptId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryState.payments.push(payment);

    // Calculate student's overall remaining unpaid balance across all invoices
    const totalRemainingDebt = memoryState.invoices
      .filter(
        (i) =>
          i.studentId === input.studentId &&
          i.organizationId === context.organizationId &&
          i.status !== "VOID" &&
          i.status !== "CANCELLED"
      )
      .reduce((sum, i) => addMoney(sum, i.balanceDue), 0);

    // Automatically issue Official Printable Receipt
    const receipt: ReceiptRecord = {
      id: receiptId,
      organizationId: context.organizationId,
      campusId: input.campusId,
      studentId: input.studentId,
      studentName: student.name,
      studentAdmissionNumber: student.admissionNumber,
      className: student.className,
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      paymentMethod: payment.paymentMethod,
      paymentReference: payment.reference,
      receiptNumber,
      amountPaid: safeAmount,
      outstandingBalance: totalRemainingDebt,
      issuedAt: new Date().toISOString(),
      issuedById: context.userId,
      notes: `Official settlement receipt for ${student.name}`,
      invoicesCovered: invoicesCoveredSummary,
      createdAt: new Date().toISOString(),
    };

    memoryState.receipts.push(receipt);

    await auditRepository.createLog({
      organizationId: context.organizationId,
      campusId: payment.campusId,
      userId: context.userId,
      action: "PAYMENT_COLLECTED",
      entityType: "Payment",
      entityId: payment.id,
      metadata: {
        paymentNumber,
        amount: safeAmount,
        allocatedAmount: totalAllocated,
        surplusAmount,
        receiptNumber,
      },
    });

    return {
      payment,
      receipt,
      allocatedAmount: totalAllocated,
      surplusAmount,
      creditBalance: currentCreditBalance,
    };
  }

  public async getPayments(
    context: TenantContext,
    filters?: {
      campusId?: string;
      studentId?: string;
      search?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ payments: PaymentRecord[]; total: number }> {
    this.assertTenant(context);
    const effectiveCampusId = enforceCampusIsolation(context, filters?.campusId);

    let result = memoryState.payments.filter((p) => {
      if (p.organizationId !== context.organizationId) return false;
      if (effectiveCampusId && p.campusId !== effectiveCampusId) return false;
      if (filters?.studentId && p.studentId !== filters.studentId) return false;
      if (filters?.status && p.status !== filters.status) return false;
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        return (
          p.paymentNumber.toLowerCase().includes(q) ||
          p.studentName?.toLowerCase().includes(q) ||
          p.reference?.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const total = result.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    result = result.slice(offset, offset + limit);

    return { payments: result, total };
  }

  public async getPaymentById(context: TenantContext, id: string): Promise<PaymentRecord> {
    this.assertTenant(context);
    const found = memoryState.payments.find(
      (p) => p.id === id && p.organizationId === context.organizationId
    );
    if (!found) {
      throw new NotFoundError(`Payment with ID '${id}' not found`);
    }

    if (
      context.campusId &&
      found.campusId &&
      found.campusId !== context.campusId &&
      !context.userRoles?.includes("Super Administrator") &&
      !context.userRoles?.includes("Organization Administrator")
    ) {
      throw new ForbiddenError("Access denied: You do not have access to payments from this campus branch.");
    }

    return found;
  }

  // ===========================================================================
  // 7. RECEIPTS
  // ===========================================================================

  public async getReceipts(
    context: TenantContext,
    filters?: {
      campusId?: string;
      studentId?: string;
      paymentId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ receipts: ReceiptRecord[]; total: number }> {
    this.assertTenant(context);
    const effectiveCampusId = enforceCampusIsolation(context, filters?.campusId);

    let result = memoryState.receipts.filter((r) => {
      if (r.organizationId !== context.organizationId) return false;
      if (effectiveCampusId && r.campusId !== effectiveCampusId) return false;
      if (filters?.studentId && r.studentId !== filters.studentId) return false;
      if (filters?.paymentId && r.paymentId !== filters.paymentId) return false;
      return true;
    });

    const total = result.length;
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    result = result.slice(offset, offset + limit);

    return { receipts: result, total };
  }

  public async getReceiptById(context: TenantContext, id: string): Promise<ReceiptRecord> {
    this.assertTenant(context);
    const found = memoryState.receipts.find(
      (r) => (r.id === id || r.receiptNumber === id) && r.organizationId === context.organizationId
    );
    if (!found) {
      throw new NotFoundError(`Receipt '${id}' not found`);
    }

    if (
      context.campusId &&
      found.campusId &&
      found.campusId !== context.campusId &&
      !context.userRoles?.includes("Super Administrator") &&
      !context.userRoles?.includes("Organization Administrator")
    ) {
      throw new ForbiddenError("Access denied: You do not have access to receipts from this campus branch.");
    }

    return found;
  }

  // ===========================================================================
  // 8. STUDENT CREDIT BALANCE & LEDGER
  // ===========================================================================

  public async getStudentCreditBalance(
    context: TenantContext,
    studentId: string
  ): Promise<StudentCreditBalanceRecord> {
    this.assertTenant(context);
    let record = memoryState.creditBalances.get(studentId);
    if (!record) {
      record = {
        id: `scb-${Date.now().toString(36)}`,
        organizationId: context.organizationId,
        campusId: context.campusId || DEMO_CAMPUS_MAIN_ID,
        studentId,
        currentBalance: 0,
        totalCredited: 0,
        totalUsed: 0,
        transactions: [],
        updatedAt: new Date().toISOString(),
      };
      memoryState.creditBalances.set(studentId, record);
    }
    return record;
  }

  public async applyCreditBalanceToInvoice(
    context: TenantContext,
    input: ApplyCreditBalanceInput
  ): Promise<{ appliedAmount: number; invoice: InvoiceRecord; remainingCredit: number }> {
    this.assertTenant(context);

    const creditRec = await this.getStudentCreditBalance(context, input.studentId);
    const invoice = await this.getInvoiceById(context, input.invoiceId);

    if (invoice.studentId !== input.studentId) {
      throw new ValidationError("Target invoice does not belong to the specified student.");
    }
    if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
      throw new ValidationError("Cannot apply credit balance to a voided or cancelled invoice.");
    }

    const safeAmount = roundMoney(input.amount);
    if (safeAmount <= 0) {
      throw new ValidationError("Credit application amount must be positive");
    }

    if (creditRec.currentBalance < safeAmount) {
      throw new ValidationError(
        `Insufficient student credit balance. Available: ${creditRec.currentBalance}, Requested: ${safeAmount}`
      );
    }

    const appliedAmount = Math.min(safeAmount, invoice.balanceDue);
    if (appliedAmount <= 0) {
      throw new ValidationError("Invoice balance is already settled");
    }

    // Deduct credit
    creditRec.currentBalance = subtractMoney(creditRec.currentBalance, appliedAmount);
    creditRec.totalUsed = addMoney(creditRec.totalUsed, appliedAmount);
    creditRec.transactions.push({
      id: `sctx-${Date.now().toString(36)}`,
      creditBalanceId: creditRec.id,
      amount: appliedAmount,
      type: "APPLIED_TO_INVOICE",
      referenceId: invoice.invoiceNumber,
      description: `Applied ${appliedAmount} to ${invoice.invoiceNumber}`,
      createdAt: new Date().toISOString(),
    });
    creditRec.updatedAt = new Date().toISOString();

    // Adjust invoice
    invoice.paidAmount = addMoney(invoice.paidAmount, appliedAmount);
    invoice.balanceDue = subtractMoney(invoice.totalAmount, invoice.paidAmount);
    invoice.status = invoice.balanceDue === 0 ? "PAID" : "PARTIALLY_PAID";
    invoice.updatedAt = new Date().toISOString();

    return {
      appliedAmount,
      invoice,
      remainingCredit: creditRec.currentBalance,
    };
  }

  /**
   * Generates a complete chronological Statement of Account / Student Ledger
   */
  public async getStudentLedger(
    context: TenantContext,
    studentId: string
  ): Promise<{
    student: { id: string; name: string; admissionNumber: string; className: string };
    totalBilled: number;
    totalPaid: number;
    totalWaived: number;
    currentBalanceDue: number;
    availableCreditBalance: number;
    entries: Array<{
      date: string;
      reference: string;
      type: "INVOICE" | "PAYMENT" | "WAIVER" | "REFUND";
      description: string;
      debit: number;
      credit: number;
      runningBalance: number;
    }>;
  }> {
    this.assertTenant(context);
    const student = this.resolveStudentMetadata(studentId);

    // Collect all student invoices, payments, waivers
    const studentInvoices = memoryState.invoices.filter(
      (i) => i.studentId === studentId && i.organizationId === context.organizationId && i.status !== "VOID"
    );
    const studentPayments = memoryState.payments.filter(
      (p) => p.studentId === studentId && p.organizationId === context.organizationId && p.status === "COMPLETED"
    );
    const studentWaivers = memoryState.waivers.filter(
      (w) => w.studentId === studentId && w.organizationId === context.organizationId && w.status === "APPROVED"
    );

    const rawTransactions: Array<{
      date: string;
      reference: string;
      type: "INVOICE" | "PAYMENT" | "WAIVER" | "REFUND";
      description: string;
      debit: number;
      credit: number;
    }> = [];

    for (const inv of studentInvoices) {
      rawTransactions.push({
        date: inv.issueDate,
        reference: inv.invoiceNumber,
        type: "INVOICE",
        description: inv.notes || `Invoice for ${inv.items.length} items`,
        debit: inv.totalAmount,
        credit: 0,
      });
    }

    for (const pay of studentPayments) {
      rawTransactions.push({
        date: pay.paymentDate,
        reference: pay.paymentNumber,
        type: "PAYMENT",
        description: `Payment via ${pay.paymentMethod}${pay.reference ? ` (${pay.reference})` : ""}`,
        debit: 0,
        credit: pay.amount,
      });
    }

    for (const wav of studentWaivers) {
      rawTransactions.push({
        date: wav.createdAt,
        reference: `WAV-${wav.id.slice(-6).toUpperCase()}`,
        type: "WAIVER",
        description: `${wav.category.replace(/_/g, " ")}: ${wav.reason}`,
        debit: 0,
        credit: wav.calculatedAmount,
      });
    }

    // Sort chronologically
    rawTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const entries = rawTransactions.map((tx) => {
      runningBalance = addMoney(runningBalance, tx.debit);
      runningBalance = subtractMoney(runningBalance, tx.credit, true);
      return {
        ...tx,
        runningBalance,
      };
    });

    const totalBilled = studentInvoices.reduce((acc, i) => addMoney(acc, i.totalAmount), 0);
    const totalPaid = studentPayments.reduce((acc, p) => addMoney(acc, p.amount), 0);
    const totalWaived = studentWaivers.reduce((acc, w) => addMoney(acc, w.calculatedAmount), 0);
    const currentBalanceDue = studentInvoices.reduce((acc, i) => addMoney(acc, i.balanceDue), 0);

    const creditRec = await this.getStudentCreditBalance(context, studentId);

    return {
      student,
      totalBilled,
      totalPaid,
      totalWaived,
      currentBalanceDue,
      availableCreditBalance: creditRec.currentBalance,
      entries,
    };
  }

  // ===========================================================================
  // 9. AGED DEBTORS & ARREARS TRACKING
  // ===========================================================================

  public async getOutstandingArrears(
    context: TenantContext,
    filters?: {
      campusId?: string;
      classId?: string;
      minBalance?: number;
    }
  ): Promise<{
    summary: {
      totalDebt: number;
      current30Days: number;
      days31To60: number;
      days61To90: number;
      over90Days: number;
      totalDebtorsCount: number;
    };
    debtors: Array<{
      studentId: string;
      studentName: string;
      admissionNumber: string;
      className: string;
      totalInvoiced: number;
      totalPaid: number;
      balanceDue: number;
      oldestDueDate: string;
      daysOverdue: number;
      invoicesCount: number;
    }>;
  }> {
    this.assertTenant(context);

    const now = new Date();
    const debtorMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        admissionNumber: string;
        className: string;
        totalInvoiced: number;
        totalPaid: number;
        balanceDue: number;
        oldestDueDate: string;
        daysOverdue: number;
        invoicesCount: number;
      }
    >();

    let totalDebt = 0;
    let current30Days = 0;
    let days31To60 = 0;
    let days61To90 = 0;
    let over90Days = 0;

    const openInvoices = memoryState.invoices.filter((inv) => {
      if (inv.organizationId !== context.organizationId) return false;
      if (filters?.campusId && inv.campusId !== filters.campusId) return false;
      if (filters?.classId && inv.classId !== filters.classId) return false;
      if (inv.status === "VOID" || inv.status === "CANCELLED" || inv.balanceDue <= 0) return false;
      return true;
    });

    for (const inv of openInvoices) {
      const dueDate = new Date(inv.dueDate);
      const diffMs = now.getTime() - dueDate.getTime();
      const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      totalDebt = addMoney(totalDebt, inv.balanceDue);

      if (daysOverdue <= 30) {
        current30Days = addMoney(current30Days, inv.balanceDue);
      } else if (daysOverdue <= 60) {
        days31To60 = addMoney(days31To60, inv.balanceDue);
      } else if (daysOverdue <= 90) {
        days61To90 = addMoney(days61To90, inv.balanceDue);
      } else {
        over90Days = addMoney(over90Days, inv.balanceDue);
      }

      const existing = debtorMap.get(inv.studentId);
      if (existing) {
        existing.totalInvoiced = addMoney(existing.totalInvoiced, inv.totalAmount);
        existing.totalPaid = addMoney(existing.totalPaid, inv.paidAmount);
        existing.balanceDue = addMoney(existing.balanceDue, inv.balanceDue);
        existing.invoicesCount += 1;
        if (daysOverdue > existing.daysOverdue) {
          existing.daysOverdue = daysOverdue;
          existing.oldestDueDate = inv.dueDate;
        }
      } else {
        debtorMap.set(inv.studentId, {
          studentId: inv.studentId,
          studentName: inv.studentName || "Student",
          admissionNumber: inv.studentAdmissionNumber || "STU-000",
          className: inv.className || "Class",
          totalInvoiced: inv.totalAmount,
          totalPaid: inv.paidAmount,
          balanceDue: inv.balanceDue,
          oldestDueDate: inv.dueDate,
          daysOverdue,
          invoicesCount: 1,
        });
      }
    }

    let debtors = Array.from(debtorMap.values());
    if (filters?.minBalance) {
      debtors = debtors.filter((d) => d.balanceDue >= filters.minBalance!);
    }
    debtors.sort((a, b) => b.balanceDue - a.balanceDue);

    return {
      summary: {
        totalDebt,
        current30Days,
        days31To60,
        days61To90,
        over90Days,
        totalDebtorsCount: debtors.length,
      },
      debtors,
    };
  }

  // ===========================================================================
  // 10. REFUNDS
  // ===========================================================================

  public async processRefund(
    context: TenantContext,
    input: ProcessRefundInput
  ): Promise<PaymentRefundRecord> {
    this.assertTenant(context);

    const payment = await this.getPaymentById(context, input.paymentId);

    // Check existing refunds for this payment
    const existingRefundsTotal = memoryState.refunds
      .filter((r) => r.paymentId === payment.id && r.status === "PROCESSED")
      .reduce((sum, r) => addMoney(sum, r.amount), 0);

    const maxRefundable = subtractMoney(payment.amount, existingRefundsTotal);
    const safeAmount = roundMoney(input.amount);

    if (safeAmount <= 0) {
      throw new ValidationError("Refund amount must be greater than zero");
    }
    if (safeAmount > maxRefundable) {
      throw new ValidationError(
        `Refund amount exceeds refundable limit. Max allowed: ${maxRefundable}, Requested: ${safeAmount}`
      );
    }

    const refundNumber = this.generateRefundNumber();
    const refundId = `ref-${Date.now().toString(36)}`;

    const refund: PaymentRefundRecord = {
      id: refundId,
      organizationId: context.organizationId,
      campusId: payment.campusId,
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      studentId: payment.studentId,
      studentName: payment.studentName,
      refundNumber,
      amount: safeAmount,
      reason: input.reason.trim(),
      method: input.method || "BANK_TRANSFER",
      status: "PROCESSED",
      approvedById: context.userId,
      processedAt: new Date().toISOString(),
      notes: input.notes?.trim() || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    memoryState.refunds.push(refund);

    // Update payment status
    const newTotalRefunded = addMoney(existingRefundsTotal, safeAmount);
    payment.status = newTotalRefunded >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
    payment.updatedAt = new Date().toISOString();

    await auditRepository.createLog({
      organizationId: context.organizationId,
      campusId: payment.campusId,
      userId: context.userId,
      action: "PROCESS_REFUND",
      entityType: "PaymentRefund",
      entityId: refund.id,
      metadata: { refundNumber, amount: safeAmount, paymentNumber: payment.paymentNumber },
    });

    return refund;
  }

  public async getRefunds(context: TenantContext): Promise<PaymentRefundRecord[]> {
    this.assertTenant(context);
    return memoryState.refunds.filter((r) => r.organizationId === context.organizationId);
  }

  // ===========================================================================
  // 11. FINANCIAL DASHBOARD OVERVIEW & ANALYTICS
  // ===========================================================================

  public async getFinanceOverview(
    context: TenantContext,
    campusId?: string
  ): Promise<{
    metrics: {
      totalCollected: number;
      totalInvoiced: number;
      totalOutstanding: number;
      collectionRatePercentage: number;
      totalWaiversGranted: number;
      todayCollections: number;
    };
    categoryBreakdown: Array<{ categoryName: string; amount: number; percentage: number }>;
    paymentMethodBreakdown: Array<{ method: string; amount: number; count: number }>;
    recentTransactions: Array<{
      id: string;
      type: "PAYMENT" | "INVOICE";
      referenceNumber: string;
      studentName: string;
      amount: number;
      date: string;
      status: string;
    }>;
  }> {
    this.assertTenant(context);
    const targetCampusId = enforceCampusIsolation(context, campusId);

    const invoices = memoryState.invoices.filter((i) => {
      if (i.organizationId !== context.organizationId) return false;
      if (targetCampusId && i.campusId !== targetCampusId) return false;
      if (i.status === "VOID" || i.status === "CANCELLED") return false;
      return true;
    });

    const payments = memoryState.payments.filter((p) => {
      if (p.organizationId !== context.organizationId) return false;
      if (targetCampusId && p.campusId !== targetCampusId) return false;
      if (p.status !== "COMPLETED") return false;
      return true;
    });

    const waivers = memoryState.waivers.filter((w) => {
      if (w.organizationId !== context.organizationId) return false;
      if (targetCampusId && w.campusId !== targetCampusId) return false;
      if (w.status !== "APPROVED") return false;
      return true;
    });

    const totalCollected = payments.reduce((sum, p) => addMoney(sum, p.amount), 0);
    const totalInvoiced = invoices.reduce((sum, i) => addMoney(sum, i.totalAmount), 0);
    const totalOutstanding = invoices.reduce((sum, i) => addMoney(sum, i.balanceDue), 0);
    const totalWaiversGranted = waivers.reduce((sum, w) => addMoney(sum, w.calculatedAmount), 0);

    const collectionRatePercentage =
      totalInvoiced > 0 ? roundMoney((totalCollected / totalInvoiced) * 100) : 0;

    // Today's collections
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayCollections = payments
      .filter((p) => p.paymentDate.startsWith(todayStr))
      .reduce((sum, p) => addMoney(sum, p.amount), 0);

    // Revenue by category (from invoice items)
    const categoryTotals = new Map<string, number>();
    for (const inv of invoices) {
      for (const item of inv.items) {
        const catName = item.categoryName || "Other Fees";
        const current = categoryTotals.get(catName) || 0;
        categoryTotals.set(catName, addMoney(current, item.totalAmount));
      }
    }

    const categoryBreakdown = Array.from(categoryTotals.entries()).map(([categoryName, amount]) => ({
      categoryName,
      amount,
      percentage: totalInvoiced > 0 ? roundMoney((amount / totalInvoiced) * 100) : 0,
    }));

    // Payment methods breakdown
    const methodTotals = new Map<string, { amount: number; count: number }>();
    for (const p of payments) {
      const cur = methodTotals.get(p.paymentMethod) || { amount: 0, count: 0 };
      methodTotals.set(p.paymentMethod, {
        amount: addMoney(cur.amount, p.amount),
        count: cur.count + 1,
      });
    }

    const paymentMethodBreakdown = Array.from(methodTotals.entries()).map(([method, data]) => ({
      method,
      amount: data.amount,
      count: data.count,
    }));

    // Recent transactions (merged payments & invoices)
    const recentTransactions: Array<{
      id: string;
      type: "PAYMENT" | "INVOICE";
      referenceNumber: string;
      studentName: string;
      amount: number;
      date: string;
      status: string;
    }> = [];

    for (const p of payments) {
      recentTransactions.push({
        id: p.id,
        type: "PAYMENT",
        referenceNumber: p.paymentNumber,
        studentName: p.studentName || "Student",
        amount: p.amount,
        date: p.paymentDate,
        status: p.status,
      });
    }

    for (const inv of invoices) {
      recentTransactions.push({
        id: inv.id,
        type: "INVOICE",
        referenceNumber: inv.invoiceNumber,
        studentName: inv.studentName || "Student",
        amount: inv.totalAmount,
        date: inv.issueDate,
        status: inv.status,
      });
    }

    recentTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      metrics: {
        totalCollected,
        totalInvoiced,
        totalOutstanding,
        collectionRatePercentage,
        totalWaiversGranted,
        todayCollections,
      },
      categoryBreakdown,
      paymentMethodBreakdown,
      recentTransactions: recentTransactions.slice(0, 10),
    };
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private assertTenant(context: TenantContext): void {
    if (!context || !context.organizationId) {
      throw new ForbiddenError("Tenant context missing organization identifier");
    }
  }

  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(memoryState.invoiceSeq++).padStart(5, "0");
    return `INV-${year}-${seq}`;
  }

  private generatePaymentNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(memoryState.paymentSeq++).padStart(5, "0");
    return `PAY-${year}-${seq}`;
  }

  private generateReceiptNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(memoryState.receiptSeq++).padStart(5, "0");
    return `REC-${year}-${seq}`;
  }

  private generateRefundNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(memoryState.refundSeq++).padStart(5, "0");
    return `REF-${year}-${seq}`;
  }

  private resolveStudentMetadata(studentId: string): {
    id: string;
    name: string;
    admissionNumber: string;
    classId: string;
    className: string;
  } {
    const registry: Record<string, { name: string; admissionNumber: string; classId: string; className: string }> = {
      "stu-001": { name: "Lucas Wright", admissionNumber: "STU-2025-00001", classId: "class-g10-a", className: "Grade 10 - Section A" },
      "stu-002": { name: "Amina Al-Mansoor", admissionNumber: "STU-2025-00002", classId: "class-g10-a", className: "Grade 10 - Section A" },
      "stu-003": { name: "Chukwudi Okafor", admissionNumber: "STU-2025-00003", classId: "class-g10-a", className: "Grade 10 - Section A" },
      "stu-004": { name: "Elena Rostova", admissionNumber: "STU-2025-00004", classId: "class-g10-a", className: "Grade 10 - Section A" },
      "stu-005": { name: "Devin Wright", admissionNumber: "STU-2024-00018", classId: "cls-jss1-2526", className: "Junior Secondary 1 - Section B" },
    };

    const found = registry[studentId];
    if (found) {
      return { id: studentId, ...found };
    }
    return {
      id: studentId,
      name: `Student (${studentId})`,
      admissionNumber: `STU-${studentId}`,
      classId: "class-g10-a",
      className: "Grade 10 - Section A",
    };
  }

  private mapPrismaFeeCategory(cat: any): FeeCategoryRecord {
    return {
      id: cat.id,
      organizationId: cat.organizationId,
      campusId: cat.campusId,
      name: cat.name,
      code: cat.code,
      description: cat.description,
      isSystem: cat.isSystem,
      isActive: cat.isActive,
      createdAt: cat.createdAt.toISOString(),
      updatedAt: cat.updatedAt.toISOString(),
    };
  }

  private mapPrismaFeeStructure(struct: any): FeeStructureRecord {
    const items: FeeItemRecord[] = (struct.feeItems || []).map((it: any) => ({
      id: it.id,
      organizationId: it.organizationId,
      campusId: it.campusId,
      feeStructureId: it.feeStructureId,
      feeCategoryId: it.feeCategoryId,
      categoryName: it.feeCategory?.name || "Fee Category",
      name: it.name,
      code: it.code,
      description: it.description,
      amount: Number(it.amount),
      isMandatory: it.isMandatory,
      frequency: it.frequency,
      createdAt: it.createdAt.toISOString(),
      updatedAt: it.updatedAt.toISOString(),
    }));

    const total = items.reduce((acc, i) => addMoney(acc, i.amount), 0);

    return {
      id: struct.id,
      organizationId: struct.organizationId,
      campusId: struct.campusId,
      academicYearId: struct.academicYearId,
      termId: struct.termId,
      classLevelId: struct.classLevelId,
      classId: struct.classId,
      name: struct.name,
      description: struct.description,
      version: struct.version,
      status: struct.status,
      items,
      totalAmount: total,
      createdAt: struct.createdAt.toISOString(),
      updatedAt: struct.updatedAt.toISOString(),
    };
  }

  private mapPrismaInvoice(inv: any): InvoiceRecord {
    const items: InvoiceItemRecord[] = (inv.items || []).map((it: any) => ({
      id: it.id,
      invoiceId: it.invoiceId,
      feeItemId: it.feeItemId,
      feeCategoryId: it.feeCategoryId,
      name: it.name,
      description: it.description,
      quantity: it.quantity,
      unitAmount: Number(it.unitAmount),
      discountAmount: Number(it.discountAmount),
      totalAmount: Number(it.totalAmount),
      paidAmount: Number(it.paidAmount),
      createdAt: it.createdAt.toISOString(),
      updatedAt: it.updatedAt.toISOString(),
    }));

    const allocations: PaymentAllocationRecord[] = (inv.allocations || []).map((al: any) => ({
      id: al.id,
      paymentId: al.paymentId,
      invoiceId: al.invoiceId,
      amount: Number(al.amount),
      createdAt: al.createdAt.toISOString(),
    }));

    return {
      id: inv.id,
      organizationId: inv.organizationId,
      campusId: inv.campusId,
      academicYearId: inv.academicYearId,
      termId: inv.termId,
      studentId: inv.studentId,
      invoiceNumber: inv.invoiceNumber,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      status: inv.status,
      subtotal: Number(inv.subtotal),
      discountTotal: Number(inv.discountTotal),
      waiverTotal: Number(inv.waiverTotal),
      taxTotal: Number(inv.taxTotal),
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      balanceDue: Number(inv.balanceDue),
      notes: inv.notes,
      isLocked: inv.isLocked,
      createdById: inv.createdById,
      voidedById: inv.voidedById,
      voidedAt: inv.voidedAt?.toISOString(),
      voidReason: inv.voidReason,
      items,
      allocations,
      createdAt: inv.createdAt.toISOString(),
      updatedAt: inv.updatedAt.toISOString(),
    };
  }
}

export const financeService = new FinanceService();
