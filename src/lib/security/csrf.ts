import { Request, Response, NextFunction } from "express";
import { ForbiddenError } from "@/lib/errors";
import { errorResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

/**
 * Cross-Site Request Forgery (CSRF) Protection Middleware
 * Validates Origin and Referer headers on state-mutating requests (POST, PUT, PATCH, DELETE).
 * Protects cookie-authenticated sessions from unauthorized cross-site execution (CWE-352).
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Safe HTTP read methods are exempt
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }

  // Exempt auth login endpoint (unauthenticated initial credential submission)
  if (req.path === "/api/auth/login" || req.path === "/api/auth/forgot-password" || req.path === "/api/auth/reset-password") {
    return next();
  }

  // If request has Bearer authorization header, it is an explicit programmatic API call not vulnerable to ambient cookie CSRF
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return next();
  }

  // For cookie-based authenticated requests, inspect Origin / Referer
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.headers.host;

  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (host && originUrl.host !== host) {
        logger.warn("CSRF blocked: Origin mismatch", { origin: originUrl.host, host, path: req.path });
        res.status(403).json(
          errorResponse("CSRF verification failed: Cross-origin request prohibited.", "FORBIDDEN")
        );
        return;
      }
    } catch {
      res.status(403).json(errorResponse("CSRF verification failed: Malformed Origin.", "FORBIDDEN"));
      return;
    }
  } else if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (host && refererUrl.host !== host) {
        logger.warn("CSRF blocked: Referer mismatch", { referer: refererUrl.host, host, path: req.path });
        res.status(403).json(
          errorResponse("CSRF verification failed: Cross-origin referer prohibited.", "FORBIDDEN")
        );
        return;
      }
    } catch {
      res.status(403).json(errorResponse("CSRF verification failed: Malformed Referer.", "FORBIDDEN"));
      return;
    }
  }

  next();
}
