import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { libraryService } from "@/services/library.service";
import { requireAuth, requirePermission } from "@/lib/auth/guards";
import { successResponse, errorResponse } from "@/lib/api-response";
import { validateSchema } from "@/lib/validations/common";
import {
  createBookSchema,
  updateBookSchema,
  createBookCopySchema,
  createLibraryBranchSchema,
  registerLibraryMemberSchema,
  issueBookLoanSchema,
  returnBookLoanSchema,
  renewBookLoanSchema,
  createBookReservationSchema,
  collectFineSchema,
  waiveFineSchema,
  updateLibrarySettingSchema,
} from "@/lib/validations/library";
import { TenantContext } from "@/repositories/types";

export const libraryRouter = Router();

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

libraryRouter.use(requireAuth);

// -----------------------------------------------------------------------------
// 1. Dashboard & Settings
// -----------------------------------------------------------------------------

libraryRouter.get("/overview", requirePermission("library.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const stats = await libraryService.getDashboardStats(ctx);
    return res.json(successResponse(stats, "Library dashboard metrics retrieved."));
  } catch (error) {
    next(error);
  }
});

libraryRouter.get("/settings", requirePermission("library.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const settings = await libraryService.getSettings(ctx);
    return res.json(successResponse(settings, "Library settings retrieved."));
  } catch (error) {
    next(error);
  }
});

libraryRouter.put(
  "/settings",
  requirePermission("library.settings.manage"),
  validateBody(updateLibrarySettingSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await libraryService.updateSettings(ctx, req.body);
      return res.json(successResponse(updated, "Library borrowing settings updated."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 2. Branches
// -----------------------------------------------------------------------------

libraryRouter.get("/branches", requirePermission("library.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const branches = await libraryService.getBranches(ctx);
    return res.json(successResponse(branches, "Library branches retrieved."));
  } catch (error) {
    next(error);
  }
});

libraryRouter.post(
  "/branches",
  requirePermission("library.settings.manage"),
  validateBody(createLibraryBranchSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const branch = await libraryService.createBranch(ctx, req.body);
      return res.status(201).json(successResponse(branch, "Library branch established."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 3. Books & Copies Catalog
// -----------------------------------------------------------------------------

libraryRouter.get("/books", requirePermission("library.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const branchId = req.query.branchId as string | undefined;
    const books = await libraryService.getBooks(ctx, { category, search, branchId });
    return res.json(successResponse(books, "Library catalog titles retrieved."));
  } catch (error) {
    next(error);
  }
});

libraryRouter.get("/books/:id", requirePermission("library.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const book = await libraryService.getBookById(ctx, req.params.id);
    return res.json(successResponse(book, "Book details retrieved."));
  } catch (error) {
    next(error);
  }
});

libraryRouter.post(
  "/books",
  requirePermission("library.catalog.manage"),
  validateBody(createBookSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const book = await libraryService.createBook(ctx, req.body);
      return res.status(201).json(successResponse(book, "Book catalog entry created."));
    } catch (error) {
      next(error);
    }
  }
);

libraryRouter.put(
  "/books/:id",
  requirePermission("library.catalog.manage"),
  validateBody(updateBookSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const updated = await libraryService.updateBook(ctx, req.params.id, req.body);
      return res.json(successResponse(updated, "Book catalog entry updated."));
    } catch (error) {
      next(error);
    }
  }
);

libraryRouter.post(
  "/copies",
  requirePermission("library.catalog.manage"),
  validateBody(createBookCopySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const copy = await libraryService.createBookCopy(ctx, req.body);
      return res.status(201).json(successResponse(copy, "Accession copy barcode registered."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 4. Members / Patrons
// -----------------------------------------------------------------------------

libraryRouter.get("/members", requirePermission("library.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const memberType = req.query.memberType as "STUDENT" | "STAFF" | undefined;
    const search = req.query.search as string | undefined;
    const members = await libraryService.getMembers(ctx, { memberType, search });
    return res.json(successResponse(members, "Library members retrieved."));
  } catch (error) {
    next(error);
  }
});

libraryRouter.post(
  "/members",
  requirePermission("library.members.manage"),
  validateBody(registerLibraryMemberSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const member = await libraryService.registerMember(ctx, req.body);
      return res.status(201).json(successResponse(member, "Library membership card issued."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 5. Circulation, Loans & Fines
// -----------------------------------------------------------------------------

libraryRouter.get("/loans", requirePermission("library.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const status = req.query.status as string | undefined;
    const memberId = req.query.memberId as string | undefined;
    const search = req.query.search as string | undefined;
    const loans = await libraryService.getLoans(ctx, { status, memberId, search });
    return res.json(successResponse(loans, "Circulation loan transactions retrieved."));
  } catch (error) {
    next(error);
  }
});

libraryRouter.post(
  "/loans/issue",
  requirePermission("library.loans.manage"),
  validateBody(issueBookLoanSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const loan = await libraryService.issueLoan(ctx, req.body);
      return res.status(201).json(successResponse(loan, "Book checkout loan issued successfully."));
    } catch (error) {
      next(error);
    }
  }
);

libraryRouter.post(
  "/loans/return",
  requirePermission("library.loans.manage"),
  validateBody(returnBookLoanSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const loan = await libraryService.returnLoan(ctx, req.body);
      return res.json(successResponse(loan, "Book returned successfully."));
    } catch (error) {
      next(error);
    }
  }
);

libraryRouter.post(
  "/loans/renew",
  requirePermission("library.loans.manage"),
  validateBody(renewBookLoanSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const loan = await libraryService.renewLoan(ctx, req.body);
      return res.json(successResponse(loan, "Book loan renewed."));
    } catch (error) {
      next(error);
    }
  }
);

libraryRouter.post(
  "/loans/collect-fine",
  requirePermission("library.fines.manage"),
  validateBody(collectFineSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const loan = await libraryService.collectFine(ctx, req.body);
      return res.json(successResponse(loan, "Overdue fine collected."));
    } catch (error) {
      next(error);
    }
  }
);

libraryRouter.post(
  "/loans/waive-fine",
  requirePermission("library.fines.manage"),
  validateBody(waiveFineSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const loan = await libraryService.waiveFine(ctx, req.body);
      return res.json(successResponse(loan, "Overdue fine waived."));
    } catch (error) {
      next(error);
    }
  }
);

// -----------------------------------------------------------------------------
// 6. Reservations / Holds
// -----------------------------------------------------------------------------

libraryRouter.get("/reservations", requirePermission("library.read"), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ctx = getTenantContext(req);
    const status = req.query.status as string | undefined;
    const reservations = await libraryService.getReservations(ctx, { status });
    return res.json(successResponse(reservations, "Library book holds retrieved."));
  } catch (error) {
    next(error);
  }
});

libraryRouter.post(
  "/reservations",
  requirePermission("library.loans.manage"),
  validateBody(createBookReservationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ctx = getTenantContext(req);
      const reservation = await libraryService.createReservation(ctx, req.body);
      return res.status(201).json(successResponse(reservation, "Book reservation placed."));
    } catch (error) {
      next(error);
    }
  }
);
