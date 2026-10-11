import { describe, it, expect, beforeEach } from "vitest";
import { financeService } from "@/services/finance.service";
import { TenantContext } from "@/repositories/types";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "@/services/admin.service";
import {
  roundMoney,
  addMoney,
  subtractMoney,
  multiplyMoney,
  calculatePercentage,
  formatCurrency,
} from "@/lib/currency";

describe("Phase 9: School Finance, Fees, Invoicing & Payments", () => {
  const orgA: TenantContext = {
    organizationId: "org-apex-demo-01",
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-accountant-01",
    userRoles: ["Accountant"],
  };

  const orgB: TenantContext = {
    organizationId: "org-isolated-competitor",
    campusId: "camp-competitor-01",
    userId: "u-competitor-admin",
    userRoles: ["Super Administrator"],
  };

  beforeEach(() => {
    financeService.resetState();
  });

  // ===========================================================================
  // 1. CURRENCY & FLOATING POINT SAFETY
  // ===========================================================================
  describe("Financial Currency & Exact Arithmetic", () => {
    it("eliminates floating-point drift in monetary operations", () => {
      // Classic JS float bug: 0.1 + 0.2 = 0.30000000000000004
      expect(addMoney(0.1, 0.2)).toBe(0.3);
      expect(subtractMoney(1.0, 0.9)).toBe(0.1);
      expect(roundMoney(1234.567)).toBe(1234.57);
      expect(multiplyMoney(10.5, 3)).toBe(31.5);
    });

    it("calculates percentage concessions accurately with 2 decimal rounding", () => {
      // 15% discount on 1,250.75 = 187.6125 -> 187.61
      expect(calculatePercentage(1250.75, 15)).toBe(187.61);
      expect(calculatePercentage(1000, 25)).toBe(250);
      expect(calculatePercentage(500, 0)).toBe(0);
    });

    it("formats various currencies correctly without hardcoding symbols", () => {
      expect(formatCurrency(1500, "USD", "en-US")).toContain("1,500.00");
      expect(formatCurrency(250000, "NGN", "en-NG")).toBeDefined();
      expect(formatCurrency(0, "USD")).toContain("0.00");
    });
  });

  // ===========================================================================
  // 2. MULTI-TENANCY ISOLATION
  // ===========================================================================
  describe("Multi-Tenancy & Tenant Context Isolation", () => {
    it("prevents Organization B from accessing Organization A fee categories", async () => {
      const orgACats = await financeService.getFeeCategories(orgA);
      expect(orgACats.length).toBeGreaterThan(0);

      const orgBCats = await financeService.getFeeCategories(orgB);
      expect(orgBCats.length).toBe(0);
    });

    it("rejects unauthorized cross-tenant invoice inspection", async () => {
      const invoicesA = await financeService.getInvoices(orgA);
      expect(invoicesA.invoices.length).toBeGreaterThan(0);

      const targetId = invoicesA.invoices[0].id;
      await expect(financeService.getInvoiceById(orgB, targetId)).rejects.toThrow();
    });

    it("rejects operations when tenant context lacks organization ID", async () => {
      const invalidContext = {} as TenantContext;
      await expect(financeService.getFeeCategories(invalidContext)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // 3. FEE CATEGORIES & STRUCTURES
  // ===========================================================================
  describe("Fee Categories & Fee Structure Versioning", () => {
    it("creates fee categories and prevents duplicate codes in same tenant", async () => {
      const created = await financeService.createFeeCategory(orgA, {
        name: "Sports & Athletics",
        code: "SPORTS",
        description: "Gymnasium, track, and field maintenance",
      });
      expect(created.id).toBeDefined();
      expect(created.code).toBe("SPORTS");

      // Attempt duplicate code
      await expect(
        financeService.createFeeCategory(orgA, {
          name: "Another Sports Fee",
          code: "SPORTS",
        })
      ).rejects.toThrow(/already exists/i);
    });

    it("prevents deletion of protected system fee categories", async () => {
      const categories = await financeService.getFeeCategories(orgA);
      const systemCategory = categories.find((c) => c.isSystem);
      expect(systemCategory).toBeDefined();

      await expect(financeService.deleteFeeCategory(orgA, systemCategory!.id)).rejects.toThrow(
        /system fee categories cannot be deleted/i
      );
    });

    it("creates a fee structure with strict server-side total calculation", async () => {
      const structure = await financeService.createFeeStructure(orgA, {
        name: "Junior Secondary Grade 7 Fee Schedule",
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classLevelId: "level-jss-01",
        items: [
          {
            name: "Tuition",
            feeCategoryId: "fcat-01",
            amount: 800.0,
            isMandatory: true,
            frequency: "TERM",
          },
          {
            name: "Computer Lab",
            feeCategoryId: "fcat-02",
            amount: 120.0,
            isMandatory: true,
            frequency: "TERM",
          },
          {
            name: "Exam Fee",
            feeCategoryId: "fcat-03",
            amount: 80.0,
            isMandatory: true,
            frequency: "TERM",
          },
        ],
      });

      expect(structure.version).toBe(1);
      expect(structure.items.length).toBe(3);
      expect(structure.totalAmount).toBe(1000.0);
    });

    it("preserves historical invoices by versioning fee structures upon modification", async () => {
      const structures = await financeService.getFeeStructures(orgA);
      const targetStructure = structures[0];
      expect(targetStructure).toBeDefined();

      // Modifying items on a structure with issued invoices creates Version 2
      const updated = await financeService.updateFeeStructure(orgA, targetStructure.id, {
        name: "Grade 10 Spring 2026 Revised Schedule",
        items: [
          {
            name: "Revised Tuition",
            feeCategoryId: "fcat-01",
            amount: 1300.0,
            isMandatory: true,
            frequency: "TERM",
          },
        ],
      });

      expect(updated.version).toBe(2);
      expect(updated.totalAmount).toBe(1300.0);

      // Verify original Version 1 remains intact
      const original = await financeService.getFeeStructureById(orgA, targetStructure.id);
      expect(original.version).toBe(1);
      expect(original.totalAmount).toBe(1500.0);
    });
  });

  // ===========================================================================
  // 4. INVOICING ENGINE & DEDUPLICATION
  // ===========================================================================
  describe("Invoicing Engine, Server-Side Recalculation & Deduplication", () => {
    it("generates an individual student invoice and recalculates totals server-side", async () => {
      const invoice = await financeService.generateInvoice(orgA, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        studentId: "stu-004",
        dueDate: "2026-03-01",
        items: [
          {
            name: "Tuition Component",
            feeCategoryId: "fcat-01",
            quantity: 1,
            unitAmount: 1000.0,
            discountAmount: 100.0,
          },
          {
            name: "Science Materials",
            feeCategoryId: "fcat-02",
            quantity: 2,
            unitAmount: 75.0,
            discountAmount: 0,
          },
        ],
      });

      expect(invoice.invoiceNumber).toMatch(/^INV-\d{4}-\d{5}$/);
      expect(invoice.subtotal).toBe(1150.0); // 1000 + 150
      expect(invoice.discountTotal).toBe(100.0);
      expect(invoice.totalAmount).toBe(1050.0); // 1150 - 100
      expect(invoice.balanceDue).toBe(1050.0);
      expect(invoice.status).toBe("ISSUED");
    });

    it("batch generates invoices for enrolled class students while skipping duplicates", async () => {
      const structures = await financeService.getFeeStructures(orgA);
      const struct = structures[0];

      const batchResult = await financeService.batchGenerateInvoices(orgA, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        feeStructureId: struct.id,
        classId: "class-g10-a",
        dueDate: "2026-03-15",
      });

      // stu-001, stu-002, stu-003 already have active invoices seeded for this term & structure
      expect(batchResult.skippedCount).toBeGreaterThanOrEqual(3);
      expect(batchResult.generatedCount).toBe(0);
    });

    it("prevents voiding an invoice that already has collected payments", async () => {
      // inv-001 has payments recorded and status PAID
      await expect(
        financeService.voidInvoice(orgA, "inv-001", {
          reason: "Accidental charge",
        })
      ).rejects.toThrow(/payments recorded/i);
    });

    it("allows voiding an unpaid invoice with mandatory audit reason", async () => {
      // Create a fresh unpaid invoice
      const freshInvoice = await financeService.generateInvoice(orgA, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        studentId: "stu-005",
        dueDate: "2026-03-01",
        items: [
          {
            name: "Test Charge",
            quantity: 1,
            unitAmount: 300.0,
            discountAmount: 0,
          },
        ],
      });

      const voided = await financeService.voidInvoice(orgA, freshInvoice.id, {
        reason: "Administrative cancellation due to double billing error",
      });

      expect(voided.status).toBe("VOID");
      expect(voided.balanceDue).toBe(0);
      expect(voided.voidReason).toContain("double billing");
    });
  });

  // ===========================================================================
  // 5. WAIVERS, CONCESSIONS & SCHOLARSHIPS
  // ===========================================================================
  describe("Fee Waivers, Concessions & Scholarships", () => {
    it("applies fixed amount waiver and rebalances invoice balanceDue", async () => {
      const invoice = await financeService.generateInvoice(orgA, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        studentId: "stu-005",
        dueDate: "2026-03-01",
        items: [
          {
            name: "Tuition",
            quantity: 1,
            unitAmount: 1000.0,
            discountAmount: 0,
          },
        ],
      });

      const waiver = await financeService.applyWaiver(orgA, {
        studentId: "stu-005",
        campusId: DEMO_CAMPUS_MAIN_ID,
        invoiceId: invoice.id,
        category: "MERIT_SCHOLARSHIP",
        discountType: "FIXED_AMOUNT",
        value: 300.0,
        reason: "Academic excellence dean award",
      });

      expect(waiver.calculatedAmount).toBe(300.0);

      const refreshed = await financeService.getInvoiceById(orgA, invoice.id);
      expect(refreshed.waiverTotal).toBe(300.0);
      expect(refreshed.totalAmount).toBe(700.0); // 1000 - 300
      expect(refreshed.balanceDue).toBe(700.0);
    });

    it("applies percentage waiver and automatically marks invoice PAID when 100% scholarship", async () => {
      const invoice = await financeService.generateInvoice(orgA, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        studentId: "stu-005",
        dueDate: "2026-03-01",
        items: [
          {
            name: "Tuition",
            quantity: 1,
            unitAmount: 800.0,
            discountAmount: 0,
          },
        ],
      });

      await financeService.applyWaiver(orgA, {
        studentId: "stu-005",
        campusId: DEMO_CAMPUS_MAIN_ID,
        invoiceId: invoice.id,
        category: "STAFF_CHILD",
        discountType: "PERCENTAGE",
        value: 100, // 100% full waiver
        reason: "Faculty dependent full scholarship",
      });

      const refreshed = await financeService.getInvoiceById(orgA, invoice.id);
      expect(refreshed.totalAmount).toBe(0);
      expect(refreshed.balanceDue).toBe(0);
      expect(refreshed.status).toBe("PAID");
    });
  });

  // ===========================================================================
  // 6. PAYMENTS, ALLOCATIONS, RECEIPTS & OVERPAYMENTS
  // ===========================================================================
  describe("Payments, Multi-Invoice Allocation & Overpayment Credit", () => {
    it("processes exact payment, marks invoice PAID, and issues official receipt", async () => {
      // inv-002 has 850 balanceDue
      const paymentResult = await financeService.recordPayment(orgA, {
        studentId: "stu-002",
        campusId: DEMO_CAMPUS_MAIN_ID,
        amount: 850.0,
        paymentMethod: "BANK_TRANSFER",
        reference: "WIRE-REF-88992",
        allocations: [{ invoiceId: "inv-002", amount: 850.0 }],
      });

      expect(paymentResult.payment.paymentNumber).toMatch(/^PAY-\d{4}-\d{5}$/);
      expect(paymentResult.receipt.receiptNumber).toMatch(/^REC-\d{4}-\d{5}$/);
      expect(paymentResult.allocatedAmount).toBe(850.0);
      expect(paymentResult.surplusAmount).toBe(0);

      const invoice = await financeService.getInvoiceById(orgA, "inv-002");
      expect(invoice.balanceDue).toBe(0);
      expect(invoice.status).toBe("PAID");
    });

    it("processes partial payment and updates invoice status to PARTIALLY_PAID", async () => {
      // inv-003 has 1250 balanceDue
      const result = await financeService.recordPayment(orgA, {
        studentId: "stu-003",
        campusId: DEMO_CAMPUS_MAIN_ID,
        amount: 400.0,
        paymentMethod: "CASH",
        allocations: [{ invoiceId: "inv-003", amount: 400.0 }],
      });

      expect(result.allocatedAmount).toBe(400.0);
      expect(result.surplusAmount).toBe(0);

      const invoice = await financeService.getInvoiceById(orgA, "inv-003");
      expect(invoice.balanceDue).toBe(850.0); // 1250 - 400
      expect(invoice.status).toBe("PARTIALLY_PAID");
    });

    it("automatically handles overpayment surplus by crediting student balance", async () => {
      // inv-003 has 850 balance due remaining (after previous test)
      // Student pays 1,000.0 -> 850 settles invoice, 150 surplus credits student
      const result = await financeService.recordPayment(orgA, {
        studentId: "stu-003",
        campusId: DEMO_CAMPUS_MAIN_ID,
        amount: 1000.0,
        paymentMethod: "POS",
        allocations: [{ invoiceId: "inv-003", amount: 850.0 }],
      });

      expect(result.allocatedAmount).toBe(850.0);
      expect(result.surplusAmount).toBe(150.0);
      expect(result.creditBalance).toBe(150.0);

      const creditRec = await financeService.getStudentCreditBalance(orgA, "stu-003");
      expect(creditRec.currentBalance).toBe(150.0);
      expect(creditRec.transactions.length).toBeGreaterThan(0);
    });

    it("allows applying student credit balance toward a new invoice", async () => {
      // First seed 150.0 credit balance via overpayment for stu-003
      await financeService.recordPayment(orgA, {
        studentId: "stu-003",
        campusId: DEMO_CAMPUS_MAIN_ID,
        amount: 1400.0,
        paymentMethod: "POS",
        allocations: [{ invoiceId: "inv-003", amount: 1250.0 }], // leaves 150 surplus
      });

      // Create fresh invoice for stu-003 (who now has 150 credit)
      const invoice = await financeService.generateInvoice(orgA, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        studentId: "stu-003",
        dueDate: "2026-04-01",
        items: [
          {
            name: "Graduation Gown",
            quantity: 1,
            unitAmount: 150.0,
            discountAmount: 0,
          },
        ],
      });

      const applyRes = await financeService.applyCreditBalanceToInvoice(orgA, {
        studentId: "stu-003",
        invoiceId: invoice.id,
        amount: 150.0,
      });

      expect(applyRes.appliedAmount).toBe(150.0);
      expect(applyRes.remainingCredit).toBe(0);

      const refreshed = await financeService.getInvoiceById(orgA, invoice.id);
      expect(refreshed.balanceDue).toBe(0);
      expect(refreshed.status).toBe("PAID");
    });
  });

  // ===========================================================================
  // 7. REFUNDS & AUDITING
  // ===========================================================================
  describe("Payment Refunds & Auditable Rollbacks", () => {
    it("processes an auditable payment refund and prevents exceeding original payment", async () => {
      // pay-002 is 500.0
      const refund = await financeService.processRefund(orgA, {
        paymentId: "pay-002",
        amount: 200.0,
        reason: "Partial refund due to lab session cancellation",
      });

      expect(refund.refundNumber).toMatch(/^REF-\d{4}-\d{5}$/);
      expect(refund.amount).toBe(200.0);

      const payment = await financeService.getPaymentById(orgA, "pay-002");
      expect(payment.status).toBe("PARTIALLY_REFUNDED");

      // Attempting to refund more than remaining (300) should fail
      await expect(
        financeService.processRefund(orgA, {
          paymentId: "pay-002",
          amount: 350.0,
          reason: "Excessive refund attempt",
        })
      ).rejects.toThrow(/exceeds refundable limit/i);
    });
  });

  // ===========================================================================
  // 8. AGED DEBTORS & ARREARS
  // ===========================================================================
  describe("Aged Debtors & Arrears Schedule", () => {
    it("categorizes outstanding debt into aged buckets (0-30, 31-60, 61-90, 90+)", async () => {
      const report = await financeService.getOutstandingArrears(orgA);
      expect(report.summary.totalDebtorsCount).toBeGreaterThan(0);
      expect(report.summary.totalDebt).toBeGreaterThan(0);
      expect(report.debtors.length).toBeGreaterThan(0);

      const topDebtor = report.debtors[0];
      expect(topDebtor.studentName).toBeDefined();
      expect(topDebtor.balanceDue).toBeGreaterThan(0);
      expect(topDebtor.oldestDueDate).toBeDefined();
    });
  });

  // ===========================================================================
  // 9. STUDENT LEDGER (STATEMENT OF ACCOUNT)
  // ===========================================================================
  describe("Student Ledger & Statement of Account", () => {
    it("generates an accurate chronological statement of account with running balance", async () => {
      const ledger = await financeService.getStudentLedger(orgA, "stu-001");
      expect(ledger.student.name).toBe("Lucas Wright");
      expect(ledger.totalBilled).toBe(1450.0);
      expect(ledger.totalPaid).toBe(1450.0);
      expect(ledger.currentBalanceDue).toBe(0);
      expect(ledger.entries.length).toBeGreaterThanOrEqual(2);

      // Verify running balance terminates at 0
      const lastEntry = ledger.entries[ledger.entries.length - 1];
      expect(lastEntry.runningBalance).toBe(0);
    });
  });

  // ===========================================================================
  // 10. FINANCIAL DASHBOARD OVERVIEW
  // ===========================================================================
  describe("Financial Dashboard Overview & Metrics", () => {
    it("computes revenue collection rate and revenue category breakdown", async () => {
      const overview = await financeService.getFinanceOverview(orgA);

      expect(overview.metrics.totalCollected).toBeGreaterThan(0);
      expect(overview.metrics.totalInvoiced).toBeGreaterThan(0);
      expect(overview.metrics.collectionRatePercentage).toBeGreaterThan(0);
      expect(overview.categoryBreakdown.length).toBeGreaterThan(0);
      expect(overview.paymentMethodBreakdown.length).toBeGreaterThan(0);
      expect(overview.recentTransactions.length).toBeGreaterThan(0);
    });
  });
});
