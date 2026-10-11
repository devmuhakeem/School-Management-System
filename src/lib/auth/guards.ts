import { Request, Response, NextFunction } from "express";
import { verifySessionToken, SessionTokenPayload } from "./tokens";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { errorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

declare global {
  namespace Express {
    interface Request {
      user?: SessionTokenPayload;
    }
  }
}

/**
 * Extracts session JWT token from Authorization header or cookies
 */
export function extractAuthToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  // Fallback to cookie
  if (req.cookies && (req.cookies.sms_token || req.cookies.sms_session)) {
    return (req.cookies.sms_token || req.cookies.sms_session) as string;
  }

  return null;
}

/**
 * Authenticates request and attaches user context to req.user
 * Throws UnauthorizedError if token is missing or invalid
 */
export function authenticateRequest(req: Request): SessionTokenPayload {
  const token = extractAuthToken(req);
  if (!token) {
    throw new UnauthorizedError("Authentication required. No session token provided.");
  }

  const payload = verifySessionToken(token);

  if (payload.status !== "ACTIVE") {
    throw new UnauthorizedError(`Account is ${payload.status}. Authentication denied.`);
  }

  req.user = payload;
  return payload;
}

/**
 * Express Middleware: Require valid authenticated session
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    authenticateRequest(req);
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication required";
    res.status(401).json(errorResponse(message, "UNAUTHORIZED"));
  }
}

/**
 * Express Middleware: Require specific granular permission (e.g. 'students.create')
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user || authenticateRequest(req);

      // Super Administrator has implicit full system access within organization
      if (user.roles.includes("Super Administrator") || user.permissions.includes(permission)) {
        return next();
      }

      logger.warn("Permission denied", {
        userId: user.userId,
        email: user.email,
        requiredPermission: permission,
        userRoles: user.roles,
      });

      res.status(403).json(
        errorResponse(
          `Access denied: Missing required permission '${permission}'.`,
          "FORBIDDEN",
          { requiredPermission: permission, userRoles: user.roles }
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication required";
      res.status(401).json(errorResponse(message, "UNAUTHORIZED"));
    }
  };
}

/**
 * Express Middleware: Require specific role (e.g. 'Principal' or 'Accountant')
 */
export function requireRole(roleName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const user = req.user || authenticateRequest(req);

      if (user.roles.includes(roleName) || user.roles.includes("Super Administrator")) {
        return next();
      }

      logger.warn("Role requirement not met", {
        userId: user.userId,
        requiredRole: roleName,
        userRoles: user.roles,
      });

      res.status(403).json(
        errorResponse(
          `Access denied: User must possess role '${roleName}'.`,
          "FORBIDDEN",
          { requiredRole: roleName, userRoles: user.roles }
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication required";
      res.status(401).json(errorResponse(message, "UNAUTHORIZED"));
    }
  };
}

/**
 * Enforces Tenant Organization Isolation
 * Validates that authenticated user belongs to target organization
 */
export function requireOrganizationAccess(user: SessionTokenPayload, targetOrgId: string): void {
  if (user.organizationId !== targetOrgId) {
    logger.warn("Tenant isolation boundary violation detected", {
      actorOrgId: user.organizationId,
      targetOrgId,
      userId: user.userId,
    });
    throw new ForbiddenError("Access denied: Tenant isolation policy violation.");
  }
}

/**
 * Enforces Campus Boundary
 * Validates that authenticated user has membership or assignment in target campus
 */
export function requireCampusAccess(user: SessionTokenPayload, targetCampusId: string): void {
  // If user has organization-wide super role or belongs to the target campus
  const hasAccess =
    user.roles.includes("Super Administrator") ||
    user.campusIds.includes(targetCampusId) ||
    user.activeCampusId === targetCampusId;

  if (!hasAccess) {
    logger.warn("Campus boundary violation detected", {
      allowedCampuses: user.campusIds,
      targetCampusId,
      userId: user.userId,
    });
    throw new ForbiddenError("Access denied: You do not have access to this campus branch.");
  }
}
