import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { successResponse, errorResponse } from "./src/lib/api-response.js";
import { checkDatabaseConnection } from "./src/lib/db.js";
import { logger } from "./src/lib/logger.js";
import { normalizeError } from "./src/lib/errors.js";
import { organizationSchema, validateSchema } from "./src/lib/validations/common.js";
import { loginSchema, switchCampusSchema } from "./src/lib/validations/auth.js";
import { authService } from "./src/services/auth.service.js";
import { adminRouter } from "./src/routes/admin.routes.js";
import { studentRouter, guardianRouter, admissionRouter } from "./src/routes/student.routes.js";
import { academicRouter } from "./src/routes/academic.routes.js";
import { attendanceRouter } from "./src/routes/attendance.routes.js";
import { examinationRouter } from "./src/routes/examination.routes.js";
import { financeRouter } from "./src/routes/finance.routes.js";
import { portalRouter } from "./src/routes/portal.routes.js";
import { communicationRouter } from "./src/routes/communication.routes.js";
import { libraryRouter } from "./src/routes/library.routes.js";
import { transportRouter } from "./src/routes/transport.routes.js";
import { hostelRouter } from "./src/routes/hostel.routes.js";
import { reportingRouter } from "./src/routes/reporting.routes.js";
import {
  requireAuth,
  requirePermission,
  requireRole,
  authenticateRequest,
  requireOrganizationAccess,
  requireCampusAccess,
} from "./src/lib/auth/guards.js";
import { csrfProtection } from "./src/lib/security/csrf.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security Headers Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(csrfProtection);

// Request logging middleware (excluding internal assets and vite queries)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith("/@") && !req.path.includes(".")) {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }
  next();
});

// -----------------------------------------------------------------------------
// Authentication Endpoints (Phase 3)
// -----------------------------------------------------------------------------

/**
 * POST /api/auth/login
 * Authenticates user credentials with rate limiting and returns signed JWT
 */
app.post("/api/auth/login", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(loginSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse(
          "Invalid login form submission",
          "VALIDATION_ERROR",
          undefined,
          validation.fieldErrors
        )
      );
    }

    const result = await authService.login(validation.data, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // Set secure HTTP-only cookie if needed
    res.cookie("sms_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json(successResponse(result, "Authentication successful."));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Terminates session and logs audit event
 */
app.post("/api/auth/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    let userId: string | undefined;
    let orgId: string | undefined;

    try {
      const user = authenticateRequest(req);
      userId = user.userId;
      orgId = user.organizationId;
    } catch {
      // Ignore if token already invalid
    }

    if (userId) {
      await authService.logout(userId, orgId, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });
    }

    res.clearCookie("sms_token");
    res.clearCookie("sms_session");

    return res.json(successResponse({ loggedOut: true }, "Logged out successfully."));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile, roles, and permissions
 */
app.get("/api/auth/me", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const profile = await authService.getCurrentUser(user);
    return res.json(successResponse(profile, "Current user session verified."));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/switch-campus
 * Switches active campus context for multi-campus users
 */
app.post("/api/auth/switch-campus", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validation = validateSchema(switchCampusSchema, req.body);
    if (!validation.success) {
      return res.status(400).json(
        errorResponse(
          "Invalid campus switch request",
          "VALIDATION_ERROR",
          undefined,
          validation.fieldErrors
        )
      );
    }

    const result = await authService.switchCampus(req.user!, validation.data.campusId);

    res.cookie("sms_token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json(successResponse(result, "Campus context switched successfully."));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/demo-accounts
 * List development accounts for quick testing in dev mode
 */
app.get("/api/auth/demo-accounts", (req: Request, res: Response) => {
  return res.json(
    successResponse(
      authService.getDemoAccounts(),
      "Development demo accounts for testing."
    )
  );
});

// -----------------------------------------------------------------------------
// Administration & School Configuration Routes (Phase 4)
// -----------------------------------------------------------------------------
app.use("/api/admin", adminRouter);

// -----------------------------------------------------------------------------
// Student Information System & Admissions Pipeline (Phase 5)
// -----------------------------------------------------------------------------
app.use("/api/students", studentRouter);
app.use("/api/guardians", guardianRouter);
app.use("/api/admissions", admissionRouter);

// -----------------------------------------------------------------------------
// Academics, Curriculum & Teaching Management (Phase 6)
// -----------------------------------------------------------------------------
app.use("/api/academics", academicRouter);

// -----------------------------------------------------------------------------
// Attendance Management (Phase 7)
// -----------------------------------------------------------------------------
app.use("/api/attendance", attendanceRouter);

// -----------------------------------------------------------------------------
// Examinations, Assessments, Grading & Results (Phase 8)
// -----------------------------------------------------------------------------
app.use("/api/examinations", examinationRouter);

// -----------------------------------------------------------------------------
// Finance, Fees, Invoicing & Payments (Phase 9)
// -----------------------------------------------------------------------------
app.use("/api/finance", financeRouter);

// -----------------------------------------------------------------------------
// Parent & Student Portals / Self-Service (Phase 10)
// -----------------------------------------------------------------------------
app.use("/api/portal", portalRouter);

// -----------------------------------------------------------------------------
// Communication, Announcements & Notifications (Phase 11)
// -----------------------------------------------------------------------------
app.use("/api/communication", communicationRouter);

// -----------------------------------------------------------------------------
// Library, Transport & Hostel Management (Phase 12)
// -----------------------------------------------------------------------------
app.use("/api/library", libraryRouter);
app.use("/api/transport", transportRouter);
app.use("/api/hostel", hostelRouter);

// -----------------------------------------------------------------------------
// Reports, Analytics & Management Dashboards (Phase 13)
// -----------------------------------------------------------------------------
app.use("/api/reports", reportingRouter);

// -----------------------------------------------------------------------------
// Protected Sample Routes Demonstrating RBAC & Tenant Isolation
// -----------------------------------------------------------------------------

/**
 * GET /api/admin/roles
 * Requires permission: roles.read
 */
app.get(
  "/api/admin/roles",
  requireAuth,
  requirePermission("roles.read"),
  (req: Request, res: Response) => {
    return res.json(
      successResponse(
        {
          allowed: true,
          tenant: req.user!.organizationName,
          user: req.user!.email,
          message: "You possess roles.read permission.",
        },
        "Authorized roles query."
      )
    );
  }
);

/**
 * GET /api/attendance
 * Requires permission: attendance.read
 */
app.get(
  "/api/attendance",
  requireAuth,
  requirePermission("attendance.read"),
  (req: Request, res: Response) => {
    return res.json(
      successResponse(
        {
          allowed: true,
          records: [],
          campus: req.user!.activeCampusId,
        },
        "Attendance records query authorized."
      )
    );
  }
);

// -----------------------------------------------------------------------------
// Foundation Health & Diagnostic Endpoints
// -----------------------------------------------------------------------------

app.get("/api/health", async (req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();
  return res.json(
    successResponse({
      status: "HEALTHY",
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      timestamp: new Date().toISOString(),
      database: dbStatus,
      version: "1.0.0-phase3",
    })
  );
});

app.get("/api/database/status", async (req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();
  return res.json(
    successResponse(
      dbStatus,
      dbStatus.connected
        ? "PostgreSQL database connected and operational."
        : "Database connection pending or unavailable."
    )
  );
});

app.post("/api/test/validation", (req: Request, res: Response) => {
  const validation = validateSchema(organizationSchema, req.body);
  if (!validation.success) {
    return res.status(400).json(
      errorResponse(
        "Payload validation failed",
        "VALIDATION_ERROR",
        undefined,
        validation.fieldErrors
      )
    );
  }

  return res.json(
    successResponse(
      validation.data,
      "Payload passed schema validation successfully."
    )
  );
});

// -----------------------------------------------------------------------------
// Development vs Production Serving
// -----------------------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      logger.info("Vite development server middleware mounted");
    } catch (err) {
      logger.warn("Could not mount Vite middleware, continuing with API only", { err });
    }
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  // Global Error Handler
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    logger.error("Unhandled API error caught in express middleware", err);
    const { statusCode, payload } = normalizeError(err);
    res
      .status(statusCode)
      .json(errorResponse(payload.message, payload.code, payload.details, payload.fieldErrors));
  });

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`School Management System Server listening on port ${PORT}`);
  });
}

// Start server when executed directly
if (typeof process !== "undefined" && process?.argv?.[1]?.endsWith("server.ts")) {
  startServer().catch((err) => {
    logger.error("Fatal startup error", err);
    process.exit(1);
  });
}

export { app, startServer };
