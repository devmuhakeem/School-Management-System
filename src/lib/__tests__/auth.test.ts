import { describe, it, expect, beforeEach } from "vitest";
import { hashPassword, verifyPassword, validatePasswordStrength } from "@/lib/auth/password";
import { signSessionToken, verifySessionToken, SessionTokenPayload } from "@/lib/auth/tokens";
import { checkLoginRateLimit, recordFailedLoginAttempt, resetLoginRateLimit } from "@/lib/auth/rate-limiter";
import { requireOrganizationAccess, requireCampusAccess } from "@/lib/auth/guards";
import { authService } from "@/services/auth.service";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

describe("Phase 3: Authentication & Security Architecture", () => {
  describe("Password Security & Hashing", () => {
    it("hashes passwords securely and verifies matching plaintexts", async () => {
      const password = "StrongPassword123!";
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith("$2")).toBe(true); // Valid bcrypt hash prefix

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPassword("WrongPassword!", hash);
      expect(isInvalid).toBe(false);
    });

    it("enforces strong password complexity requirements", () => {
      // Must be at least 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
      expect(validatePasswordStrength("weak").valid).toBe(false);
      expect(validatePasswordStrength("nocaps123!").valid).toBe(false);
      expect(validatePasswordStrength("NOLOWERS123!").valid).toBe(false);
      expect(validatePasswordStrength("NoNumber!").valid).toBe(false);
      expect(validatePasswordStrength("NoSpecialChar123").valid).toBe(false);

      const validResult = validatePasswordStrength("ValidPassword123!");
      expect(validResult.valid).toBe(true);
      expect(validResult.errors.length).toBe(0);
    });
  });

  describe("Session JWT Token Management", () => {
    const mockPayload: Omit<SessionTokenPayload, "iat" | "exp"> = {
      userId: "u-test-user-01",
      email: "test.teacher@school.internal",
      firstName: "Test",
      lastName: "Teacher",
      organizationId: "org-test-01",
      organizationName: "Apex International",
      activeCampusId: "camp-01",
      campusIds: ["camp-01", "camp-02"],
      roles: ["Academic Teacher"],
      permissions: ["students.read", "attendance.manage", "academics.read"],
      status: "ACTIVE",
    };

    it("signs and verifies valid JWT session tokens with complete authorization context", () => {
      const token = signSessionToken(mockPayload);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);

      const decoded = verifySessionToken(token);
      expect(decoded.userId).toBe(mockPayload.userId);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.firstName).toBe("Test");
      expect(decoded.lastName).toBe("Teacher");
      expect(decoded.organizationId).toBe(mockPayload.organizationId);
      expect(decoded.roles).toEqual(["Academic Teacher"]);
      expect(decoded.permissions).toContain("attendance.manage");
      expect(decoded.campusIds).toEqual(["camp-01", "camp-02"]);
      expect(decoded.activeCampusId).toBe("camp-01");
    });

    it("rejects tampered or malformed session tokens", () => {
      const token = signSessionToken(mockPayload);
      const tampered = token.slice(0, -6) + "xxxxxx";

      expect(() => verifySessionToken(tampered)).toThrow();
      expect(() => verifySessionToken("invalid-token-string")).toThrow();
    });
  });

  describe("Brute-Force & Rate Limiting Protection", () => {
    const testKey = "192.168.1.100:test@school.internal";

    beforeEach(() => {
      resetLoginRateLimit(testKey);
    });

    it("allows attempts within rate limit threshold", () => {
      const check = checkLoginRateLimit(testKey);
      expect(check.allowed).toBe(true);
      expect(check.remainingAttempts).toBeGreaterThan(0);
    });

    it("blocks access when maximum failed attempts threshold is breached", () => {
      // Exceed default 5 failed attempts
      for (let i = 0; i < 5; i++) {
        recordFailedLoginAttempt(testKey);
      }

      const check = checkLoginRateLimit(testKey);
      expect(check.allowed).toBe(false);
      expect(check.remainingAttempts).toBe(0);
      expect(check.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("resets rate limit counter upon successful authentication", () => {
      recordFailedLoginAttempt(testKey);
      recordFailedLoginAttempt(testKey);
      expect(checkLoginRateLimit(testKey).remainingAttempts).toBe(3);

      resetLoginRateLimit(testKey);
      expect(checkLoginRateLimit(testKey).remainingAttempts).toBe(5);
    });
  });

  describe("Tenant & Campus Isolation Guards", () => {
    const userPayload: SessionTokenPayload = {
      userId: "u-user-01",
      email: "principal@apex.internal",
      firstName: "Arthur",
      lastName: "Pendleton",
      organizationId: "org-apex",
      organizationName: "Apex School",
      activeCampusId: "camp-main",
      campusIds: ["camp-main"],
      roles: ["Principal"],
      permissions: ["students.read", "admissions.read"],
      status: "ACTIVE",
    };

    it("permits operations within authorized tenant organization", () => {
      expect(() => requireOrganizationAccess(userPayload, "org-apex")).not.toThrow();
    });

    it("strictly blocks cross-tenant access attempts", () => {
      expect(() => requireOrganizationAccess(userPayload, "org-other-school")).toThrow(ForbiddenError);
    });

    it("permits operations in assigned campus", () => {
      expect(() => requireCampusAccess(userPayload, "camp-main")).not.toThrow();
    });

    it("strictly blocks operations in unassigned campus branches", () => {
      expect(() => requireCampusAccess(userPayload, "camp-remote-branch")).toThrow(ForbiddenError);
    });

    it("allows Super Administrator global campus access", () => {
      const superAdminPayload: SessionTokenPayload = {
        ...userPayload,
        roles: ["Super Administrator"],
        permissions: ["all"],
      };

      expect(() => requireCampusAccess(superAdminPayload, "camp-any-location")).not.toThrow();
    });
  });

  describe("AuthService End-to-End Workflows", () => {
    it("successfully authenticates valid institutional user and returns safe user record", async () => {
      const result = await authService.login({
        email: "admin@apex-demo.internal",
        password: "Password123!",
      });

      expect(result).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe("admin@apex-demo.internal");
      expect(result.user.roles).toContain("Super Administrator");
      expect(result.user.organization.code).toBe("APEX");

      // Verify no password hash is exposed in the safe user object
      const userRaw = result.user as unknown as Record<string, unknown>;
      expect(userRaw.passwordHash).toBeUndefined();
      expect(userRaw.password).toBeUndefined();
    });

    it("rejects invalid password with generic error to prevent enumeration", async () => {
      await expect(
        authService.login({
          email: "admin@apex-demo.internal",
          password: "IncorrectPassword999!",
        })
      ).rejects.toThrow(UnauthorizedError);
    });

    it("rejects non-existent users with generic error", async () => {
      await expect(
        authService.login({
          email: "unknown.user@does-not-exist.internal",
          password: "Password123!",
        })
      ).rejects.toThrow("Invalid email or password");
    });

    it("denies access for inactive or suspended institutional accounts", async () => {
      await expect(
        authService.login({
          email: "inactive@apex-demo.internal",
          password: "Password123!",
        })
      ).rejects.toThrow(/deactivated/i);

      await expect(
        authService.login({
          email: "suspended@apex-demo.internal",
          password: "Password123!",
        })
      ).rejects.toThrow(/suspended/i);
    });

    it("supports multi-campus context switching for authorized branches", async () => {
      const loginResult = await authService.login({
        email: "admin@apex-demo.internal",
        password: "Password123!",
      });

      const tokenPayload = verifySessionToken(loginResult.token);
      expect(tokenPayload.activeCampusId).toBe("camp-apex-main-01");

      // Switch to secondary branch
      const switchResult = await authService.switchCampus(tokenPayload, "camp-apex-west-02");
      expect(switchResult.token).toBeDefined();

      const updatedPayload = verifySessionToken(switchResult.token);
      expect(updatedPayload.activeCampusId).toBe("camp-apex-west-02");
    });

    it("rejects campus switching to an unauthorized branch", async () => {
      const loginResult = await authService.login({
        email: "principal@apex-demo.internal", // Only has access to Main Campus
        password: "Password123!",
      });

      const tokenPayload = verifySessionToken(loginResult.token);
      await expect(
        authService.switchCampus(tokenPayload, "camp-unauthorized-random")
      ).rejects.toThrow(ForbiddenError);
    });
  });
});
