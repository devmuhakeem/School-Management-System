import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { financeService } from "@/services/finance.service";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { successResponse, errorResponse } from "@/lib/api-response";
import { validateSchema } from "@/lib/validations/common";
import {
  createFeeCategorySchema,
  updateFeeCategorySchema,
  createFeeStructureSchema,
  updateFeeStructureSchema,
  assignStudentFeeSchema,
  generateInvoiceSchema,
  batchGenerateInvoicesSchema,
  voidInvoiceSchema,
  recordPaymentSchema,
  applyWaiverSchema,
  reviewWaiverSchema,
  applyCreditBalanceSchema,
  processRefundSchema,
} from "@/lib/validations/finance";
import { TenantContext } from "@/repositories/types";

export const financeRouter = Router();

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const val = validateSchema(schema, req.body);
    if (!val.success) {
      return res.status(400).json(
        errorResponse("Validation failed", "VALIDATION_ERROR", undefined, val.fieldErrors)
      );
    }
    req.body = val.data;
    next();
  };
}

function getTenantContext(req: Request): TenantContext {
  const user = req.user!;
  return {
    organizationId: user.organizationId,
    campusId: user.activeCampusId || undefined,
    userId: user.userId,
    userRoles: user.roles,
  };
}

// All finance endpoints require authentication
financeRouter.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. OVERVIEW & ANALYTICS
// -----------------------------------------------------------------------------
financeRouter.get(
  "/overview",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campusId = (req.query.campusId as string) || req.user?.activeCampusId || undefined;
      const data = await financeService.getFinanceOverview(getTenantContext(req), campusId);
      return res.json(successResponse(data, "Financial overview and key metrics retrieved successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 2. FEE CATEGORIES
// -----------------------------------------------------------------------------
financeRouter.get(
  "/categories",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await financeService.getFeeCategories(getTenantContext(req));
      return res.json(successResponse(categories, "Fee categories retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.get(
  "/categories/:id",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const category = await financeService.getFeeCategoryById(getTenantContext(req), req.params.id);
      return res.json(successResponse(category, "Fee category retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.post(
  "/categories",
  requirePermission("finance.manage"),
  validateBody(createFeeCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const created = await financeService.createFeeCategory(getTenantContext(req), req.body);
      return res.status(201).json(successResponse(created, "Fee category created successfully."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.put(
  "/categories/:id",
  requirePermission("finance.manage"),
  validateBody(updateFeeCategorySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await financeService.updateFeeCategory(getTenantContext(req), req.params.id, req.body);
      return res.json(successResponse(updated, "Fee category updated successfully."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.delete(
  "/categories/:id",
  requirePermission("finance.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await financeService.deleteFeeCategory(getTenantContext(req), req.params.id);
      return res.json(successResponse(result, "Fee category deleted successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 3. FEE STRUCTURES & SCHEDULES
// -----------------------------------------------------------------------------
financeRouter.get(
  "/structures",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        campusId: req.query.campusId as string,
        academicYearId: req.query.academicYearId as string,
        termId: req.query.termId as string,
        classId: req.query.classId as string,
        status: req.query.status as string,
      };
      const structures = await financeService.getFeeStructures(getTenantContext(req), filters);
      return res.json(successResponse(structures, "Fee structures retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.get(
  "/structures/:id",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const structure = await financeService.getFeeStructureById(getTenantContext(req), req.params.id);
      return res.json(successResponse(structure, "Fee structure details retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.post(
  "/structures",
  requirePermission("finance.manage"),
  validateBody(createFeeStructureSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const structure = await financeService.createFeeStructure(getTenantContext(req), req.body);
      return res.status(201).json(successResponse(structure, "Fee structure created successfully."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.put(
  "/structures/:id",
  requirePermission("finance.manage"),
  validateBody(updateFeeStructureSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const updated = await financeService.updateFeeStructure(getTenantContext(req), req.params.id, req.body);
      return res.json(successResponse(updated, "Fee structure updated or versioned successfully."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.post(
  "/structures/:id/version",
  requirePermission("finance.manage"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cloned = await financeService.cloneFeeStructureVersion(
        getTenantContext(req),
        req.params.id,
        req.body?.name
      );
      return res.status(201).json(successResponse(cloned, "New fee structure version created."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 4. STUDENT FEE ASSIGNMENTS
// -----------------------------------------------------------------------------
financeRouter.post(
  "/assignments",
  requirePermission("fees.manage"),
  validateBody(assignStudentFeeSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignment = await financeService.assignStudentFees(getTenantContext(req), req.body);
      return res.status(201).json(successResponse(assignment, "Fee structure assigned to student."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.get(
  "/students/:studentId/assignments",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assignments = await financeService.getStudentFeeAssignments(
        getTenantContext(req),
        req.params.studentId
      );
      return res.json(successResponse(assignments, "Student fee assignments retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 5. INVOICING ENGINE
// -----------------------------------------------------------------------------
financeRouter.get(
  "/invoices",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        campusId: req.query.campusId as string,
        academicYearId: req.query.academicYearId as string,
        termId: req.query.termId as string,
        status: req.query.status as string,
        studentId: req.query.studentId as string,
        search: req.query.search as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };
      const result = await financeService.getInvoices(getTenantContext(req), filters);
      return res.json(successResponse(result, "Invoices retrieved successfully."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.get(
  "/invoices/:id",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoice = await financeService.getInvoiceById(getTenantContext(req), req.params.id);
      return res.json(successResponse(invoice, "Invoice details retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.post(
  "/invoices",
  requirePermission("invoices.create"),
  validateBody(generateInvoiceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const invoice = await financeService.generateInvoice(getTenantContext(req), req.body);
      return res.status(201).json(successResponse(invoice, "Invoice generated successfully."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.post(
  "/invoices/batch",
  requirePermission("invoices.create"),
  validateBody(batchGenerateInvoicesSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await financeService.batchGenerateInvoices(getTenantContext(req), req.body);
      return res.status(201).json(
        successResponse(
          result,
          `Batch invoicing complete. Generated: ${result.generatedCount}, Skipped: ${result.skippedCount}`
        )
      );
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.post(
  "/invoices/:id/void",
  requirePermission("invoices.manage"),
  validateBody(voidInvoiceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const voided = await financeService.voidInvoice(getTenantContext(req), req.params.id, req.body);
      return res.json(successResponse(voided, "Invoice voided successfully."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 6. WAIVERS & SCHOLARSHIPS
// -----------------------------------------------------------------------------
financeRouter.get(
  "/waivers",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        campusId: req.query.campusId as string,
        studentId: req.query.studentId as string,
        status: req.query.status as string,
      };
      const waivers = await financeService.getWaivers(getTenantContext(req), filters);
      return res.json(successResponse(waivers, "Waivers and concessions retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.post(
  "/waivers",
  requirePermission("discounts.apply"),
  validateBody(applyWaiverSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const waiver = await financeService.applyWaiver(getTenantContext(req), req.body);
      return res.status(201).json(successResponse(waiver, "Waiver applied and authorized successfully."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.post(
  "/waivers/:id/review",
  requirePermission("discounts.apply"),
  validateBody(reviewWaiverSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const reviewed = await financeService.reviewWaiver(getTenantContext(req), req.params.id, req.body);
      return res.json(successResponse(reviewed, "Waiver status updated."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 7. PAYMENTS & ALLOCATIONS
// -----------------------------------------------------------------------------
financeRouter.get(
  "/payments",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        campusId: req.query.campusId as string,
        studentId: req.query.studentId as string,
        search: req.query.search as string,
        status: req.query.status as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };
      const result = await financeService.getPayments(getTenantContext(req), filters);
      return res.json(successResponse(result, "Payments list retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.get(
  "/payments/:id",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await financeService.getPaymentById(getTenantContext(req), req.params.id);
      return res.json(successResponse(payment, "Payment details retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.post(
  "/payments",
  requirePermission("payments.record"),
  validateBody(recordPaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await financeService.recordPayment(getTenantContext(req), req.body);
      return res.status(201).json(
        successResponse(
          result,
          `Payment ${result.payment.paymentNumber} recorded successfully. Receipt ${result.receipt.receiptNumber} issued.`
        )
      );
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 8. RECEIPTS
// -----------------------------------------------------------------------------
financeRouter.get(
  "/receipts",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        campusId: req.query.campusId as string,
        studentId: req.query.studentId as string,
        paymentId: req.query.paymentId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
      };
      const result = await financeService.getReceipts(getTenantContext(req), filters);
      return res.json(successResponse(result, "Official receipts retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.get(
  "/receipts/:id",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const receipt = await financeService.getReceiptById(getTenantContext(req), req.params.id);
      return res.json(successResponse(receipt, "Official receipt retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 9. STUDENT CREDITS & LEDGERS
// -----------------------------------------------------------------------------
financeRouter.get(
  "/students/:studentId/credits",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const credit = await financeService.getStudentCreditBalance(
        getTenantContext(req),
        req.params.studentId
      );
      return res.json(successResponse(credit, "Student credit balance retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.post(
  "/credits/apply",
  requirePermission("payments.record"),
  validateBody(applyCreditBalanceSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await financeService.applyCreditBalanceToInvoice(getTenantContext(req), req.body);
      return res.json(successResponse(result, "Credit balance applied to invoice."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.get(
  "/students/:studentId/ledger",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ledger = await financeService.getStudentLedger(
        getTenantContext(req),
        req.params.studentId
      );
      return res.json(successResponse(ledger, "Student Statement of Account / Ledger retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 10. AGED DEBTORS & ARREARS
// -----------------------------------------------------------------------------
financeRouter.get(
  "/debtors",
  requirePermission("finance.reports"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        campusId: req.query.campusId as string,
        classId: req.query.classId as string,
        minBalance: req.query.minBalance ? parseFloat(req.query.minBalance as string) : undefined,
      };
      const result = await financeService.getOutstandingArrears(getTenantContext(req), filters);
      return res.json(successResponse(result, "Aged debtor schedule and arrears retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

// -----------------------------------------------------------------------------
// 11. REFUNDS
// -----------------------------------------------------------------------------
financeRouter.get(
  "/refunds",
  requirePermission("finance.read"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refunds = await financeService.getRefunds(getTenantContext(req));
      return res.json(successResponse(refunds, "Payment refunds history retrieved."));
    } catch (err) {
      next(err);
    }
  }
);

financeRouter.post(
  "/refunds",
  requirePermission("refunds.process"),
  validateBody(processRefundSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refund = await financeService.processRefund(getTenantContext(req), req.body);
      return res.status(201).json(successResponse(refund, "Refund authorized and processed successfully."));
    } catch (err) {
      next(err);
    }
  }
);
