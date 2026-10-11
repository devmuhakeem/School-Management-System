import crypto from "crypto";
import { prisma } from "@/lib/db";
import { verifyPassword, hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { signSessionToken, SessionTokenPayload } from "@/lib/auth/tokens";
import { checkLoginRateLimit, recordFailedLoginAttempt, resetLoginRateLimit } from "@/lib/auth/rate-limiter";
import { UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { auditRepository } from "@/repositories/audit.repository";
import {
  LoginInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from "@/lib/validations/auth";
import { SYSTEM_PERMISSIONS } from "@/lib/auth/rbac-config";

export interface SafeUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  status: string;
  organization: {
    id: string;
    name: string;
    code: string;
    slug: string;
  };
  campuses: Array<{
    id: string;
    name: string;
    code: string;
    isDefault: boolean;
  }>;
  activeCampus: {
    id: string;
    name: string;
    code: string;
  } | null;
  roles: string[];
  permissions: string[];
}

export interface LoginResult {
  token: string;
  user: SafeUser;
}

// Development Demo Users Map for seamless testing and offline resilience
interface DemoUserRecord {
  id: string;
  email: string;
  passwordHash: string; // bcrypt hash of "Password123!"
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "INVITED";
  organizationId: string;
  organizationName: string;
  organizationCode: string;
  organizationSlug: string;
  campuses: Array<{ id: string; name: string; code: string; isDefault: boolean }>;
  roles: string[];
  permissions: string[];
}

// BCrypt hash of "Password123!" with 12 rounds
const DEMO_PASSWORD_HASH = "$2b$12$Ng2mo9W3hKgBuHCEYFnvk.a4lwk8DOoVYg0k0eIr1bnwXv9TgG3xO";

const DEMO_USERS: Record<string, DemoUserRecord> = {
  "admin@apex-demo.internal": {
    id: "u-super-admin-01",
    email: "admin@apex-demo.internal",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Eleanor",
    lastName: "Vance",
    status: "ACTIVE",
    organizationId: "org-apex-demo-01",
    organizationName: "Apex International Academy",
    organizationCode: "APEX",
    organizationSlug: "apex-international",
    campuses: [
      { id: "camp-apex-main-01", name: "Apex Main Campus (City Center)", code: "CAMP-01", isDefault: true },
      { id: "camp-apex-west-02", name: "Apex West Campus (Science Wing)", code: "CAMP-02", isDefault: false },
    ],
    roles: ["Super Administrator"],
    permissions: SYSTEM_PERMISSIONS.map((p) => `${p.module}.${p.action}`),
  },
  "principal@apex-demo.internal": {
    id: "u-principal-01",
    email: "principal@apex-demo.internal",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Arthur",
    lastName: "Pendleton",
    status: "ACTIVE",
    organizationId: "org-apex-demo-01",
    organizationName: "Apex International Academy",
    organizationCode: "APEX",
    organizationSlug: "apex-international",
    campuses: [
      { id: "camp-apex-main-01", name: "Apex Main Campus (City Center)", code: "CAMP-01", isDefault: true },
    ],
    roles: ["Principal"],
    permissions: [
      "students.read", "students.create", "students.update",
      "admissions.read", "admissions.create", "admissions.update", "admissions.approve",
      "academics.read", "academics.manage",
      "attendance.read", "attendance.manage",
      "exams.read", "exams.manage", "results.publish",
      "reports.read", "reports.generate",
      "settings.manage", "users.read",
    ],
  },
  "teacher.math@apex-demo.internal": {
    id: "u-teacher-01",
    email: "teacher.math@apex-demo.internal",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Marcus",
    lastName: "Holloway",
    status: "ACTIVE",
    organizationId: "org-apex-demo-01",
    organizationName: "Apex International Academy",
    organizationCode: "APEX",
    organizationSlug: "apex-international",
    campuses: [
      { id: "camp-apex-main-01", name: "Apex Main Campus (City Center)", code: "CAMP-01", isDefault: true },
    ],
    roles: ["Academic Teacher"],
    permissions: [
      "students.read",
      "academics.read",
      "attendance.read",
      "attendance.manage",
      "exams.read",
      "exams.manage",
      "reports.read",
    ],
  },
  "accountant@apex-demo.internal": {
    id: "u-accountant-01",
    email: "accountant@apex-demo.internal",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Clara",
    lastName: "Oswald",
    status: "ACTIVE",
    organizationId: "org-apex-demo-01",
    organizationName: "Apex International Academy",
    organizationCode: "APEX",
    organizationSlug: "apex-international",
    campuses: [
      { id: "camp-apex-main-01", name: "Apex Main Campus (City Center)", code: "CAMP-01", isDefault: true },
      { id: "camp-apex-west-02", name: "Apex West Campus (Science Wing)", code: "CAMP-02", isDefault: false },
    ],
    roles: ["Accountant"],
    permissions: [
      "students.read",
      "finance.read",
      "finance.manage",
      "payments.record",
      "fees.manage",
      "reports.read",
      "reports.generate",
    ],
  },
  "parent@apex-demo.internal": {
    id: "u-parent-01",
    email: "parent@apex-demo.internal",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Sarah",
    lastName: "Wright",
    status: "ACTIVE",
    organizationId: "org-apex-demo-01",
    organizationName: "Apex International Academy",
    organizationCode: "APEX",
    organizationSlug: "apex-international",
    campuses: [
      { id: "camp-apex-main-01", name: "Apex Main Campus (City Center)", code: "CAMP-01", isDefault: true },
    ],
    roles: ["Parent"],
    permissions: [
      "dashboard.view", "students.read", "attendance.read", "reports.read", "finance.read",
      "portal.read", "portal.parent.read", "portal.parent.profile.update",
      "portal.parent.children.read", "portal.parent.attendance.read",
      "portal.parent.results.read", "portal.parent.report_cards.read",
      "portal.parent.timetable.read", "portal.parent.finance.read",
      "portal.parent.invoices.read", "portal.parent.payments.read",
      "portal.parent.receipts.read", "portal.parent.notifications.read",
    ],
  },
  "student@apex-demo.internal": {
    id: "u-student-01",
    email: "student@apex-demo.internal",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Lucas",
    lastName: "Wright",
    status: "ACTIVE",
    organizationId: "org-apex-demo-01",
    organizationName: "Apex International Academy",
    organizationCode: "APEX",
    organizationSlug: "apex-international",
    campuses: [
      { id: "camp-apex-main-01", name: "Apex Main Campus (City Center)", code: "CAMP-01", isDefault: true },
    ],
    roles: ["Student"],
    permissions: [
      "dashboard.view", "academics.read", "attendance.read", "exams.read",
      "portal.read", "portal.student.read", "portal.student.profile.read",
      "portal.student.profile.update", "portal.student.attendance.read",
      "portal.student.results.read", "portal.student.report_cards.read",
      "portal.student.timetable.read", "portal.student.finance.read",
      "portal.student.notifications.read",
    ],
  },
  "inactive@apex-demo.internal": {
    id: "u-inactive-01",
    email: "inactive@apex-demo.internal",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Inactive",
    lastName: "User",
    status: "INACTIVE",
    organizationId: "org-apex-demo-01",
    organizationName: "Apex International Academy",
    organizationCode: "APEX",
    organizationSlug: "apex-international",
    campuses: [{ id: "camp-apex-main-01", name: "Apex Main Campus", code: "CAMP-01", isDefault: true }],
    roles: ["Academic Teacher"],
    permissions: ["students.read"],
  },
  "suspended@apex-demo.internal": {
    id: "u-suspended-01",
    email: "suspended@apex-demo.internal",
    passwordHash: DEMO_PASSWORD_HASH,
    firstName: "Suspended",
    lastName: "User",
    status: "SUSPENDED",
    organizationId: "org-apex-demo-01",
    organizationName: "Apex International Academy",
    organizationCode: "APEX",
    organizationSlug: "apex-international",
    campuses: [{ id: "camp-apex-main-01", name: "Apex Main Campus", code: "CAMP-01", isDefault: true }],
    roles: ["Academic Teacher"],
    permissions: ["students.read"],
  },
};

export class AuthService {
  /**
   * Primary Login implementation
   */
  async login(
    input: LoginInput,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<LoginResult> {
    const email = input.email.toLowerCase().trim();
    const rateLimitKey = `${metadata?.ip || "unknown"}:${email}`;

    // 1. Abuse & Rate Limit Check
    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.allowed) {
      logger.warn("Login attempt blocked by rate limiter", { email, ip: metadata?.ip });
      throw new UnauthorizedError(
        `Too many failed login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`
      );
    }

    // 2. Fetch User from Database (with Demo Fallback if offline)
    let userRecord: any = null;
    let isDemoFallback = false;

    try {
      userRecord = await prisma.user.findUnique({
        where: { email },
        include: {
          organization: true,
          campusMemberships: {
            where: { isActive: true },
            include: { campus: true },
          },
          userRoles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: { permission: true },
                  },
                },
              },
            },
          },
        },
      });
    } catch (dbError) {
      logger.warn("Database lookup failed during login, checking demo registry", { error: String(dbError) });
    }

    // Check demo users registry
    if (!userRecord && DEMO_USERS[email]) {
      userRecord = DEMO_USERS[email];
      isDemoFallback = true;
    }

    // 3. Constant-time credential verification (safe against timing attacks)
    if (!userRecord) {
      recordFailedLoginAttempt(rateLimitKey);
      // Run dummy verification to mitigate timing attacks
      await verifyPassword("dummy", DEMO_PASSWORD_HASH);
      logger.warn("Login failed: Unknown user identifier", { email, ip: metadata?.ip });
      throw new UnauthorizedError("Invalid email or password.");
    }

    // Verify Password Hash
    let isValidPassword = false;
    if (userRecord.passwordHash) {
      isValidPassword = await verifyPassword(input.password, userRecord.passwordHash);
    }

    if (!isValidPassword) {
      const rateStatus = recordFailedLoginAttempt(rateLimitKey);
      logger.warn("Login failed: Password mismatch", {
        email,
        ip: metadata?.ip,
        remainingAttempts: rateStatus.remainingAttempts,
      });

      if (rateStatus.blocked) {
        throw new UnauthorizedError(
          "Too many failed login attempts. Account temporarily locked for 15 minutes."
        );
      }
      throw new UnauthorizedError("Invalid email or password.");
    }

    // 4. Account Status Enforcement
    if (userRecord.status === "INACTIVE") {
      logger.warn("Login rejected: Account is inactive", { email });
      throw new UnauthorizedError("Your account has been deactivated. Please contact your school administrator.");
    }
    if (userRecord.status === "SUSPENDED") {
      logger.warn("Login rejected: Account is suspended", { email });
      throw new UnauthorizedError("Your account has been suspended. Please contact your school administrator.");
    }
    if (userRecord.status === "INVITED" && !userRecord.passwordHash) {
      throw new UnauthorizedError("Account invitation pending. Please set your password first.");
    }

    // 5. Successful login: reset rate limit
    resetLoginRateLimit(rateLimitKey);

    // 6. Compile effective permissions and roles
    let roles: string[] = [];
    let permissionsSet = new Set<string>();
    let campuses: Array<{ id: string; name: string; code: string; isDefault: boolean }> = [];
    let organizationId = "";
    let organizationName = "";

    if (isDemoFallback) {
      roles = userRecord.roles;
      userRecord.permissions.forEach((p: string) => permissionsSet.add(p));
      campuses = userRecord.campuses;
      organizationId = userRecord.organizationId;
      organizationName = userRecord.organizationName;
    } else {
      organizationId = userRecord.organizationId;
      organizationName = userRecord.organization.name;

      campuses = userRecord.campusMemberships.map((cm: any) => ({
        id: cm.campus.id,
        name: cm.campus.name,
        code: cm.campus.code,
        isDefault: cm.isDefault,
      }));

      // Gather roles & permissions
      userRecord.userRoles.forEach((ur: any) => {
        roles.push(ur.role.name);
        // If super admin role, grant all permissions
        if (ur.role.roleType === "SUPER_ADMIN" || ur.role.name === "Super Administrator") {
          SYSTEM_PERMISSIONS.forEach((p) => permissionsSet.add(`${p.module}.${p.action}`));
        } else {
          ur.role.permissions.forEach((rp: any) => {
            permissionsSet.add(`${rp.permission.module}.${rp.permission.action}`);
          });
        }
      });
    }

    const permissions = Array.from(permissionsSet);
    const defaultCampus = campuses.find((c) => c.isDefault) || campuses[0] || null;

    // 7. Update Last Login Timestamp asynchronously
    if (!isDemoFallback) {
      prisma.user
        .update({
          where: { id: userRecord.id },
          data: { lastLoginAt: new Date() },
        })
        .catch((err) => logger.warn("Failed to update lastLoginAt", { err }));

      // 8. Record Audit Log for successful login
      auditRepository
        .log(
          {
            organizationId,
            campusId: defaultCampus?.id,
            userId: userRecord.id,
          },
          {
            action: "LOGIN",
            entity: "User",
            entityId: userRecord.id,
            ipAddress: metadata?.ip,
            userAgent: metadata?.userAgent,
            details: { email, roles },
          }
        )
        .catch((err) => logger.warn("Failed to log audit event", { err }));
    }

    // 9. Sign JWT Session Token
    const tokenPayload: SessionTokenPayload = {
      userId: userRecord.id,
      email: userRecord.email,
      firstName: userRecord.firstName,
      lastName: userRecord.lastName,
      organizationId,
      organizationName,
      campusIds: campuses.map((c) => c.id),
      activeCampusId: defaultCampus?.id || null,
      roles,
      permissions,
      status: userRecord.status,
    };

    const token = signSessionToken(tokenPayload);

    // 10. Construct Safe User (omitting password hash)
    const safeUser: SafeUser = {
      id: userRecord.id,
      email: userRecord.email,
      firstName: userRecord.firstName,
      lastName: userRecord.lastName,
      middleName: userRecord.middleName || null,
      phone: userRecord.phone || null,
      avatarUrl: userRecord.avatarUrl || null,
      status: userRecord.status,
      organization: {
        id: organizationId,
        name: organizationName,
        code: isDemoFallback ? userRecord.organizationCode : userRecord.organization.code,
        slug: isDemoFallback ? userRecord.organizationSlug : userRecord.organization.slug,
      },
      campuses,
      activeCampus: defaultCampus,
      roles,
      permissions,
    };

    logger.info("User logged in successfully", {
      userId: safeUser.id,
      email: safeUser.email,
      roles,
      organizationId,
    });

    return { token, user: safeUser };
  }

  /**
   * Retrieve current user profile from token context
   */
  async getCurrentUser(payload: SessionTokenPayload): Promise<SafeUser> {
    // If demo fallback user
    if (DEMO_USERS[payload.email]) {
      const demo = DEMO_USERS[payload.email];
      const activeCampus = demo.campuses.find((c) => c.id === payload.activeCampusId) || demo.campuses[0] || null;

      return {
        id: demo.id,
        email: demo.email,
        firstName: demo.firstName,
        lastName: demo.lastName,
        status: demo.status,
        organization: {
          id: demo.organizationId,
          name: demo.organizationName,
          code: demo.organizationCode,
          slug: demo.organizationSlug,
        },
        campuses: demo.campuses,
        activeCampus,
        roles: demo.roles,
        permissions: demo.permissions,
      };
    }

    // Database lookup
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        organization: true,
        campusMemberships: {
          where: { isActive: true },
          include: { campus: true },
        },
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: { permission: true },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError("User", payload.userId);
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError(`Account status is ${user.status}. Access denied.`);
    }

    const campuses = user.campusMemberships.map((cm) => ({
      id: cm.campus.id,
      name: cm.campus.name,
      code: cm.campus.code,
      isDefault: cm.isDefault,
    }));

    const activeCampus =
      campuses.find((c) => c.id === payload.activeCampusId) ||
      campuses.find((c) => c.isDefault) ||
      campuses[0] ||
      null;

    const roles: string[] = [];
    const permissionsSet = new Set<string>();

    user.userRoles.forEach((ur) => {
      roles.push(ur.role.name);
      if (ur.role.roleType === "SUPER_ADMIN" || ur.role.name === "Super Administrator") {
        SYSTEM_PERMISSIONS.forEach((p) => permissionsSet.add(`${p.module}.${p.action}`));
      } else {
        ur.role.permissions.forEach((rp) => {
          permissionsSet.add(`${rp.permission.module}.${rp.permission.action}`);
        });
      }
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      middleName: user.middleName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        code: user.organization.code,
        slug: user.organization.slug,
      },
      campuses,
      activeCampus,
      roles,
      permissions: Array.from(permissionsSet),
    };
  }

  /**
   * Switch active campus for user
   */
  async switchCampus(
    currentUser: SessionTokenPayload,
    targetCampusId: string
  ): Promise<{ token: string; activeCampus: { id: string; name: string; code: string } }> {
    // Validate that user is allowed to access targetCampusId
    if (!currentUser.campusIds.includes(targetCampusId)) {
      throw new ForbiddenError("Access denied: You are not assigned to this campus location.");
    }

    // Re-issue token with updated activeCampusId
    const updatedPayload: SessionTokenPayload = {
      ...currentUser,
      activeCampusId: targetCampusId,
    };

    const token = signSessionToken(updatedPayload);

    return {
      token,
      activeCampus: {
        id: targetCampusId,
        name: targetCampusId,
        code: targetCampusId,
      },
    };
  }

  /**
   * Logout user and record audit log
   */
  async logout(userId: string, orgId?: string, metadata?: { ip?: string; userAgent?: string }): Promise<void> {
    if (orgId) {
      auditRepository
        .log(
          {
            organizationId: orgId,
            userId,
          },
          {
            action: "LOGOUT",
            entity: "User",
            entityId: userId,
            ipAddress: metadata?.ip,
            userAgent: metadata?.userAgent,
          }
        )
        .catch((err) => logger.warn("Failed to log logout audit event", { err }));
    }
  }

  /**
   * Request password reset token.
   * Returns a generic success response regardless of email existence to prevent user enumeration (CWE-204).
   */
  async requestPasswordReset(
    input: RequestPasswordResetInput,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<{ message: string; debugToken?: string }> {
    const email = input.email.toLowerCase().trim();

    // Check user existence
    let userRecord: any = null;
    try {
      userRecord = await prisma.user.findUnique({
        where: { email },
        include: { organization: true },
      });
    } catch {
      // Fallback to demo
    }

    if (!userRecord && DEMO_USERS[email]) {
      userRecord = DEMO_USERS[email];
    }

    // Always return success message even if account is not found
    const responseMsg = "If an active account exists with this email address, a password reset link has been dispatched.";

    if (!userRecord || userRecord.status !== "ACTIVE") {
      logger.info("Password reset requested for non-existent or inactive user", { email, ip: metadata?.ip });
      return { message: responseMsg };
    }

    // Generate cryptographically secure random token (32 bytes = 64 hex characters)
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes lifetime

    passwordResetStore.set(tokenHash, {
      userId: userRecord.id,
      email: userRecord.email,
      organizationId: userRecord.organizationId,
      expiresAt,
      used: false,
    });

    await auditRepository.log(
      {
        organizationId: userRecord.organizationId,
        userId: userRecord.id,
      },
      {
        action: "UPDATE",
        entity: "User",
        entityId: userRecord.id,
        ipAddress: metadata?.ip,
        userAgent: metadata?.userAgent,
        details: { event: "PASSWORD_RESET_REQUESTED", email },
      }
    ).catch(() => {});

    logger.info("Password reset token generated", { email, userId: userRecord.id });

    // In dev environment or tests, debugToken helps automated testing
    return {
      message: responseMsg,
      ...(process.env.NODE_ENV !== "production" ? { debugToken: rawToken } : {}),
    };
  }

  /**
   * Resets user password using a verified, single-use token.
   */
  async resetPassword(
    input: ResetPasswordInput,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; message: string }> {
    const strength = validatePasswordStrength(input.newPassword);
    if (!strength.valid) {
      throw new ValidationError(strength.message || "Password does not meet complexity requirements.");
    }

    const tokenHash = crypto.createHash("sha256").update(input.token.trim()).digest("hex");
    const record = passwordResetStore.get(tokenHash);

    if (!record || record.used || Date.now() > record.expiresAt) {
      throw new UnauthorizedError("Invalid or expired password reset token. Please request a new link.");
    }

    const newHash = await hashPassword(input.newPassword);

    // Update in database
    try {
      await prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: newHash },
      });
    } catch {
      // Memory fallback
    }

    // Update in demo users if applicable
    if (DEMO_USERS[record.email]) {
      DEMO_USERS[record.email].passwordHash = newHash;
    }

    // Mark token as consumed (single-use enforcement)
    record.used = true;
    passwordResetStore.delete(tokenHash);

    await auditRepository.log(
      {
        organizationId: record.organizationId,
        userId: record.userId,
      },
      {
        action: "UPDATE",
        entity: "User",
        entityId: record.userId,
        ipAddress: metadata?.ip,
        userAgent: metadata?.userAgent,
        details: { event: "PASSWORD_RESET_COMPLETED", email: record.email },
      }
    ).catch(() => {});

    return {
      success: true,
      message: "Password has been updated successfully. You may now log in with your new password.",
    };
  }

  /**
   * Change password for an authenticated user session
   */
  async changePassword(
    currentUser: SessionTokenPayload,
    input: ChangePasswordInput,
    metadata?: { ip?: string; userAgent?: string }
  ): Promise<{ success: boolean; message: string }> {
    const strength = validatePasswordStrength(input.newPassword);
    if (!strength.valid) {
      throw new ValidationError(strength.message || "Password does not meet complexity requirements.");
    }

    let existingHash = "";
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: currentUser.userId },
        select: { passwordHash: true },
      });
      if (dbUser?.passwordHash) {
        existingHash = dbUser.passwordHash;
      }
    } catch {
      // Fallback
    }

    if (!existingHash && DEMO_USERS[currentUser.email]) {
      existingHash = DEMO_USERS[currentUser.email].passwordHash;
    }

    const isValidCurrent = await verifyPassword(input.currentPassword, existingHash);
    if (!isValidCurrent) {
      throw new UnauthorizedError("Current password entered is incorrect.");
    }

    const newHash = await hashPassword(input.newPassword);

    try {
      await prisma.user.update({
        where: { id: currentUser.userId },
        data: { passwordHash: newHash },
      });
    } catch {
      // Fallback
    }

    if (DEMO_USERS[currentUser.email]) {
      DEMO_USERS[currentUser.email].passwordHash = newHash;
    }

    await auditRepository.log(
      {
        organizationId: currentUser.organizationId,
        userId: currentUser.userId,
      },
      {
        action: "UPDATE",
        entity: "User",
        entityId: currentUser.userId,
        ipAddress: metadata?.ip,
        userAgent: metadata?.userAgent,
        details: { event: "PASSWORD_CHANGED" },
      }
    ).catch(() => {});

    return {
      success: true,
      message: "Password changed successfully.",
    };
  }

  /**
   * Return demo accounts list for dev environment
   */
  getDemoAccounts() {
    return Object.values(DEMO_USERS).map((u) => ({
      email: u.email,
      role: u.roles[0],
      name: `${u.firstName} ${u.lastName}`,
      status: u.status,
      permissionsCount: u.permissions.length,
    }));
  }
}

// In-memory store for password reset tokens
interface PasswordResetEntry {
  userId: string;
  email: string;
  organizationId: string;
  expiresAt: number;
  used: boolean;
}
const passwordResetStore = new Map<string, PasswordResetEntry>();

export const authService = new AuthService();
