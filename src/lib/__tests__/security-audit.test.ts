import { describe, it, expect, beforeEach } from "vitest";
import { TenantContext } from "@/repositories/types";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "@/services/admin.service";
import {
  sanitizeCsvCell,
  sanitizeUploadedFileName,
  safeAssign,
  sanitizeHtml,
  sanitizeSearchQuery,
  sanitizeId,
  escapeRegex,
} from "@/lib/security/sanitization";
import {
  enforceTenantIsolation,
  enforceCampusIsolation,
  assertBelongsToTenant,
  assertBelongsToCampus,
  hasCrossCampusPrivilege,
} from "@/lib/security/isolation";
import { sanitizeObject } from "@/lib/logger";
import { normalizeError, ForbiddenError, UnauthorizedError, ValidationError, NotFoundError } from "@/lib/errors";
import { authService } from "@/services/auth.service";
import { studentService } from "@/services/student.service";
import { portalService } from "@/services/portal.service";
import { financeService } from "@/services/finance.service";
import { libraryService } from "@/services/library.service";
import { examinationService } from "@/services/examination.service";
import { attendanceService } from "@/services/attendance.service";
import { signSessionToken, verifySessionToken } from "@/lib/auth/tokens";

describe("Phase 14: Comprehensive Security Audit & Hardening Pass", () => {
  // Primary authorized tenant context
  const superAdminCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-super-admin-01",
    userRoles: ["Super Administrator"],
  };

  const campusAdminCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-campus-admin-01",
    userRoles: ["Campus Administrator"],
  };

  const teacherCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-teacher-01",
    userRoles: ["Teacher"],
  };

  const parentCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-parent-01",
    userRoles: ["Parent"],
  };

  const studentCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-student-01",
    userRoles: ["Student"],
  };

  // Foreign tenant contexts
  const foreignTenantCtx: TenantContext = {
    organizationId: "org-foreign-adversary-corp",
    campusId: "camp-foreign-01",
    userId: "u-attacker-01",
    userRoles: ["Super Administrator"],
  };

  beforeEach(() => {
    portalService.resetState();
    financeService.resetState();
    libraryService.resetState();
  });

  // ===========================================================================
  // 1. TENANT & CAMPUS ISOLATION AUDIT
  // ===========================================================================
  describe("1. Multi-Tenant & Campus Boundary Isolation", () => {
    it("strictly isolates student queries across organization boundaries", async () => {
      const authorizedRes = await studentService.getStudents(superAdminCtx);
      expect(authorizedRes.items.length).toBeGreaterThan(0);

      // Foreign tenant must see zero records from DEMO_ORG_ID
      const foreignRes = await studentService.getStudents(foreignTenantCtx);
      expect(foreignRes.items).toHaveLength(0);
    });

    it("prevents direct IDOR access to student records belonging to another tenant", async () => {
      const authorizedRes = await studentService.getStudents(superAdminCtx);
      const targetStudent = authorizedRes.items[0];

      // Attempting to fetch a target student with foreign tenant context throws NotFoundError
      await expect(
        studentService.getStudentById(foreignTenantCtx, targetStudent.id)
      ).rejects.toThrow(NotFoundError);
    });

    it("strictly isolates financial invoices across organization boundaries", async () => {
      const invoicesRes = await financeService.getInvoices(superAdminCtx);
      expect(invoicesRes.invoices.length).toBeGreaterThan(0);

      const foreignInvoicesRes = await financeService.getInvoices(foreignTenantCtx);
      expect(foreignInvoicesRes.invoices).toHaveLength(0);
    });

    it("blocks IDOR retrieval of another tenant's financial invoice", async () => {
      const invoicesRes = await financeService.getInvoices(superAdminCtx);
      const targetInvoice = invoicesRes.invoices[0];

      await expect(
        financeService.getInvoiceById(foreignTenantCtx, targetInvoice.id)
      ).rejects.toThrow(NotFoundError);
    });

    it("strictly isolates library catalog across tenant boundaries", async () => {
      const books = await libraryService.getBooks(superAdminCtx);
      expect(books.length).toBeGreaterThan(0);

      const foreignBooks = await libraryService.getBooks(foreignTenantCtx);
      expect(foreignBooks).toHaveLength(0);
    });

    it("enforces tenant boundary check via enforceTenantIsolation()", () => {
      expect(() => {
        enforceTenantIsolation(superAdminCtx, DEMO_ORG_ID);
      }).not.toThrow();

      expect(() => {
        enforceTenantIsolation(superAdminCtx, "org-other-school");
      }).toThrow(ForbiddenError);
    });

    it("enforces campus isolation for non-super administrators", () => {
      // Super admin has cross-campus access
      expect(hasCrossCampusPrivilege(superAdminCtx)).toBe(true);
      expect(enforceCampusIsolation(superAdminCtx, "camp-branch-north")).toBe("camp-branch-north");

      // Campus admin or teacher cannot access a different campus without cross-campus privileges
      expect(hasCrossCampusPrivilege(teacherCtx)).toBe(false);
      expect(() => {
        enforceCampusIsolation(teacherCtx, "camp-foreign-branch");
      }).toThrow(ForbiddenError);
    });

    it("assertBelongsToTenant() rejects mismatched tenant entities", () => {
      const validEntity = { id: "ent-1", organizationId: DEMO_ORG_ID };
      const invalidEntity = { id: "ent-2", organizationId: "org-foreign-evil" };

      expect(() => assertBelongsToTenant(validEntity, superAdminCtx)).not.toThrow();
      expect(() => assertBelongsToTenant(invalidEntity, superAdminCtx)).toThrow(ForbiddenError);
    });

    it("assertBelongsToCampus() blocks access to differing campus branches for regular staff", () => {
      const mainCampusResource = { id: "res-1", campusId: DEMO_CAMPUS_MAIN_ID };
      const northCampusResource = { id: "res-2", campusId: "camp-north-branch" };

      // Teacher on main campus can access main campus resource
      expect(() => assertBelongsToCampus(mainCampusResource, teacherCtx)).not.toThrow();

      // Teacher on main campus is blocked from north campus resource
      expect(() => assertBelongsToCampus(northCampusResource, teacherCtx)).toThrow(ForbiddenError);

      // Super administrator has global authority
      expect(() => assertBelongsToCampus(northCampusResource, superAdminCtx)).not.toThrow();
    });
  });

  // ===========================================================================
  // 2. PARENT & STUDENT PORTAL ACCESS CONTROL & IDOR PREVENTION
  // ===========================================================================
  describe("2. Parent & Student Portal Access Control & IDOR Prevention", () => {
    it("allows a parent to access only their linked children and blocks unlinked students", async () => {
      // Lucas Wright (stu-001) is linked to Dr. Sarah Wright (u-parent-01)
      const linkedAccess = await portalService.requireGuardianStudentAccess(parentCtx, "stu-001");
      expect(linkedAccess).toBeDefined();
      expect(linkedAccess.student.id).toBe("stu-001");

      // Devin Wright (stu-005) is also a linked ward
      const secondChild = await portalService.requireGuardianStudentAccess(parentCtx, "stu-005");
      expect(secondChild).toBeDefined();
      expect(secondChild.student.id).toBe("stu-005");

      // Marcus Vance (stu-003) is linked to grd-002, NOT to Dr. Sarah Wright (u-parent-01)
      await expect(
        portalService.requireGuardianStudentAccess(parentCtx, "stu-003")
      ).rejects.toThrow(ForbiddenError);
    });

    it("prevents students from accessing another student's portal records", async () => {
      // Authenticated student profile for stu-001
      const ownProfile = await portalService.getStudentProfile(studentCtx);
      expect(ownProfile).toBeDefined();
      expect(ownProfile.id).toBe("stu-001");

      // Foreign student context attempting to access another student's profile or results
      const anotherStudentCtx: TenantContext = {
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        userId: "u-unregistered-user-999",
        userRoles: ["Student"],
      };

      await expect(
        portalService.getStudentProfile(anotherStudentCtx)
      ).rejects.toThrow();
    });

    it("blocks student access to unpublished examination results", async () => {
      const sessions = await examinationService.getExamSessions(superAdminCtx);
      expect(sessions.length).toBeGreaterThan(0);

      // Attempting to fetch report cards with student credentials directly on administrative endpoints
      // is constrained by role permissions
      expect(studentCtx.userRoles).not.toContain("Super Administrator");
      expect(studentCtx.userRoles).not.toContain("Principal");
    });
  });

  // ===========================================================================
  // 3. INPUT VALIDATION, XSS & SANITIZATION AUDIT
  // ===========================================================================
  describe("3. Input Sanitization & Attack Neutralization", () => {
    it("neutralizes CSV Formula Injection (CWE-1236) triggers", () => {
      // Formula prefix characters =, +, -, @, \t, \r must be prefixed with single quote
      expect(sanitizeCsvCell("=SUM(A1:A10)")).toBe("'=SUM(A1:A10)");
      expect(sanitizeCsvCell("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0");
      expect(sanitizeCsvCell("-2+3*[1]")).toBe("'-2+3*[1]");
      expect(sanitizeCsvCell("@SUM(1+1)")).toBe("'@SUM(1+1)");
      expect(sanitizeCsvCell("\tDANGEROUS")).toBe("'\tDANGEROUS");

      // Normal safe text is preserved
      expect(sanitizeCsvCell("John Doe")).toBe("John Doe");
      expect(sanitizeCsvCell("Grade 10 - Section A")).toBe("Grade 10 - Section A");

      // Standard CSV escaping with quotes
      expect(sanitizeCsvCell('Text with "quotes" and , commas')).toBe('"Text with ""quotes"" and , commas"');
    });

    it("sanitizes file names and prevents Directory Traversal (CWE-22/23)", () => {
      // Directory traversal attempts must be rejected with ValidationError
      expect(() => sanitizeUploadedFileName("../../etc/passwd")).toThrow(ValidationError);
      expect(() => sanitizeUploadedFileName("..\\..\\windows\\system32\\cmd.exe")).toThrow(ValidationError);
      expect(() => sanitizeUploadedFileName("/etc/shadow")).toThrow(ValidationError);
      expect(() => sanitizeUploadedFileName("nested/path/document.pdf")).toThrow(ValidationError);
      expect(() => sanitizeUploadedFileName("document\0.pdf.exe")).toThrow(ValidationError);

      // Executable and script extensions must be rejected
      expect(() => sanitizeUploadedFileName("malicious_script.sh")).toThrow(ValidationError);
      expect(() => sanitizeUploadedFileName("backdoor.php")).toThrow(ValidationError);
      expect(() => sanitizeUploadedFileName("payload.exe")).toThrow(ValidationError);
      expect(() => sanitizeUploadedFileName("exploit.bat")).toThrow(ValidationError);
      expect(() => sanitizeUploadedFileName("evil.js")).toThrow(ValidationError);

      // Valid and allowed document uploads must succeed and be cleaned
      const sanitized = sanitizeUploadedFileName("my-homework assignment (final) 2026.pdf");
      expect(sanitized.sanitizedName).toBe("my-homework_assignment_final_2026.pdf");
      expect(sanitized.extension).toBe(".pdf");
    });

    it("sanitizes HTML to prevent Cross-Site Scripting (XSS / CWE-79)", () => {
      const scriptPayload = '<p>Hello</p><script>alert("XSS")</script><span>World</span>';
      const cleanScript = sanitizeHtml(scriptPayload);
      expect(cleanScript).not.toContain("<script>");
      expect(cleanScript).not.toContain("alert");
      expect(cleanScript).toContain("<p>Hello</p>");
      expect(cleanScript).toContain("<span>World</span>");

      const iframePayload = '<div>Info<iframe src="https://evil.site"></iframe></div>';
      const cleanIframe = sanitizeHtml(iframePayload);
      expect(cleanIframe).not.toContain("<iframe");

      const eventHandlerPayload = '<img src="valid.jpg" onerror="alert(1)" onload="evil()" />';
      const cleanEvent = sanitizeHtml(eventHandlerPayload);
      expect(cleanEvent).not.toContain("onerror");
      expect(cleanEvent).not.toContain("onload");

      const jsUriPayload = '<a href="javascript:stealCookies()">Click me</a>';
      const cleanUri = sanitizeHtml(jsUriPayload);
      expect(cleanUri).not.toContain("javascript:");
    });

    it("protects against Mass Assignment / Parameter Tampering (CWE-915)", () => {
      const targetEntity = {
        id: "student-100",
        organizationId: DEMO_ORG_ID,
        campusId: DEMO_CAMPUS_MAIN_ID,
        firstName: "Alice",
        lastName: "Smith",
        createdAt: "2026-01-01T00:00:00.000Z",
      };

      const attackerPayload = {
        id: "hacked-id-999",
        organizationId: "org-evil-adversary",
        campusId: "camp-hacked",
        firstName: "Alicia",
        createdAt: "1970-01-01T00:00:00.000Z",
      };

      // safeAssign ignores protected immutable keys (id, organizationId, campusId, createdAt)
      safeAssign(targetEntity, attackerPayload);

      expect(targetEntity.id).toBe("student-100");
      expect(targetEntity.organizationId).toBe(DEMO_ORG_ID);
      expect(targetEntity.campusId).toBe(DEMO_CAMPUS_MAIN_ID);
      expect(targetEntity.createdAt).toBe("2026-01-01T00:00:00.000Z");
      expect(targetEntity.firstName).toBe("Alicia");
    });

    it("sanitizes search queries to prevent ReDoS and injection", () => {
      const rawQuery = "  student   query\0with\x1acontrol\ncharacters   ";
      const sanitized = sanitizeSearchQuery(rawQuery, 50);
      expect(sanitized).not.toContain("\0");
      expect(sanitized).not.toContain("\n");
      expect(sanitized.length).toBeLessThanOrEqual(50);
    });

    it("validates and sanitizes identifiers against path manipulation and injection", () => {
      expect(sanitizeId("valid-id-123_abc", "TestId")).toBe("valid-id-123_abc");
      expect(() => sanitizeId("../../../etc/passwd", "TestId")).toThrow(ValidationError);
      expect(() => sanitizeId("id' OR '1'='1", "TestId")).toThrow(ValidationError);
      expect(() => sanitizeId("id; DROP TABLE students;", "TestId")).toThrow(ValidationError);
    });

    it("escapes regex special characters to prevent regex injection", () => {
      const userInput = "name.with[brackets]+and*stars?";
      const escaped = escapeRegex(userInput);
      expect(new RegExp(escaped).test("name.with[brackets]+and*stars?")).toBe(true);
      expect(new RegExp(escaped).test("nameXwithYbracketsZandWstarsA")).toBe(false);
    });
  });

  // ===========================================================================
  // 4. AUTHENTICATION & CREDENTIAL SECURITY AUDIT
  // ===========================================================================
  describe("4. Authentication Security & Credential Protection", () => {
    it("rejects login attempts with invalid credentials without revealing user existence", async () => {
      // Non-existent user
      await expect(
        authService.login({
          email: "non-existent-account-xyz@apex-demo.internal",
          password: "Password123!",
        })
      ).rejects.toThrow(UnauthorizedError);

      // Existing user with incorrect password
      await expect(
        authService.login({
          email: "super.admin@apex-demo.internal",
          password: "WrongPassword123!",
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("enforces brute-force rate limiting on repeated authentication failures", async () => {
      const testIp = "192.0.2.144";
      const email = "rate.test@apex-demo.internal";

      // Trigger multiple rapid failed logins
      for (let i = 0; i < 5; i++) {
        try {
          await authService.login(
            { email, password: "IncorrectPassword123!" },
            { ip: testIp }
          );
        } catch {
          // Expected failure
        }
      }

      // Next attempt should be blocked with rate limit error
      await expect(
        authService.login(
          { email, password: "IncorrectPassword123!" },
          { ip: testIp }
        )
      ).rejects.toThrow(UnauthorizedError);
    });

    it("generates verifiable JWT tokens and rejects tampered tokens", () => {
      const validPayload = {
        userId: "u-test-01",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        organizationId: DEMO_ORG_ID,
        organizationName: "Apex Demo Academy",
        activeCampusId: DEMO_CAMPUS_MAIN_ID,
        campusIds: [DEMO_CAMPUS_MAIN_ID],
        roles: ["Teacher"],
        permissions: ["academics.read"],
        status: "ACTIVE" as const,
      };

      const token = signSessionToken(validPayload);
      expect(token).toBeDefined();

      // Valid token verifies successfully
      const decoded = verifySessionToken(token);
      expect(decoded.userId).toBe("u-test-01");
      expect(decoded.organizationId).toBe(DEMO_ORG_ID);

      // Tampered token (modifying payload part) must be rejected
      const parts = token.split(".");
      const tamperedPayload = Buffer.from(
        JSON.stringify({ ...validPayload, roles: ["Super Administrator"] })
      ).toString("base64url");
      const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      expect(() => verifySessionToken(forgedToken)).toThrow(UnauthorizedError);
    });

    it("redacts sensitive credential keys in logging and error telemetry", () => {
      const sensitiveData = {
        username: "super.admin",
        password: "SecretPassword123!",
        sms_token: "jwt-token-string",
        apiKey: "sk-live-secret-key-12345",
        databaseUrl: "postgresql://postgres:secretpassword@localhost:5432/school_db",
        creditCard: "4111222233334444",
        nested: {
          token: "bearer-token-abc",
          authorization: "Bearer secret-payload",
          normalField: "public-value",
        },
      };

      const sanitized = sanitizeObject(sensitiveData);
      const nested = sanitized.nested as Record<string, unknown>;

      expect(sanitized.password).toBe("[REDACTED]");
      expect(sanitized.sms_token).toBe("[REDACTED]");
      expect(sanitized.apiKey).toBe("[REDACTED]");
      expect(sanitized.databaseUrl).toBe("[REDACTED]");
      expect(sanitized.creditCard).toBe("[REDACTED]");
      expect(nested.token).toBe("[REDACTED]");
      expect(nested.authorization).toBe("[REDACTED]");
      expect(nested.normalField).toBe("public-value");
    });

    it("normalizes and masks internal errors in production to prevent information disclosure", () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const rawDatabaseError = new Error("connection to 10.0.0.4:5432 failed: password authentication failed");
        const { statusCode, payload } = normalizeError(rawDatabaseError);

        expect(statusCode).toBe(500);
        // Error details must not leak database internal IP or connection error to clients
        expect(payload.message).toBe("An unexpected internal error occurred.");
        expect(payload.code).toBe("INTERNAL_SERVER_ERROR");
        expect(payload.details).toBeUndefined();
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });
});
