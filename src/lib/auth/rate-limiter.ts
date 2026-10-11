import { Request, Response, NextFunction } from "express";
import { errorResponse } from "@/lib/api-response";

/**
 * In-memory sliding window rate limiter for authentication endpoints
 * Protects against brute-force password guessing and abuse
 */

interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  blockedUntil?: number;
}

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale records periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.firstAttemptAt > WINDOW_MS && (!record.blockedUntil || now > record.blockedUntil)) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function checkLoginRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  if (record.blockedUntil && now < record.blockedUntil) {
    const remainingMs = record.blockedUntil - now;
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(remainingMs / 1000),
    };
  }

  // If window expired, reset
  if (now - record.firstAttemptAt > WINDOW_MS) {
    rateLimitStore.delete(identifier);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_ATTEMPTS - record.attempts);
  return {
    allowed: record.attempts < MAX_ATTEMPTS,
    remainingAttempts: remaining,
  };
}

export function recordFailedLoginAttempt(identifier: string): {
  remainingAttempts: number;
  blocked: boolean;
} {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    rateLimitStore.set(identifier, {
      attempts: 1,
      firstAttemptAt: now,
    });
    return {
      remainingAttempts: MAX_ATTEMPTS - 1,
      blocked: false,
    };
  }

  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    return {
      remainingAttempts: 0,
      blocked: true,
    };
  }

  return {
    remainingAttempts: MAX_ATTEMPTS - record.attempts,
    blocked: false,
  };
}

export function resetLoginRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Express Middleware: Sliding Window Rate Limiter
 * Enforces request throttling on sensitive endpoints (login, password reset, report exports)
 */
export function createExpressRateLimiter(options: RateLimiterOptions) {
  const store = new Map<string, { count: number; resetTime: number }>();

  // Periodically clean up expired entries
  setInterval(() => {
    const now = Date.now();
    for (const [key, data] of store.entries()) {
      if (now > data.resetTime) {
        store.delete(key);
      }
    }
  }, Math.min(options.windowMs, 60000));

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = options.keyGenerator ? options.keyGenerator(req) : `${req.ip || "127.0.0.1"}_${req.baseUrl || req.path}`;
    const now = Date.now();
    const entry = store.get(key);

    if (!entry || now > entry.resetTime) {
      store.set(key, { count: 1, resetTime: now + options.windowMs });
      res.setHeader("X-RateLimit-Limit", String(options.max));
      res.setHeader("X-RateLimit-Remaining", String(options.max - 1));
      return next();
    }

    if (entry.count >= options.max) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("X-RateLimit-Limit", String(options.max));
      res.setHeader("X-RateLimit-Remaining", "0");
      res.status(429).json(
        errorResponse(
          options.message || "Too many requests. Please slow down and try again later.",
          "RATE_LIMIT_EXCEEDED",
          { retryAfterSeconds: retryAfter }
        )
      );
      return;
    }

    entry.count += 1;
    res.setHeader("X-RateLimit-Limit", String(options.max));
    res.setHeader("X-RateLimit-Remaining", String(options.max - entry.count));
    next();
  };
}

/**
 * Pre-configured rate limiter for authentication endpoints (login, password reset, campus switch)
 * 10 attempts per 15-minute window per IP
 */
export const authRateLimiter = createExpressRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: "Too many authentication attempts. Please wait 15 minutes before trying again.",
  keyGenerator: (req) => `${req.ip || "127.0.0.1"}_auth`,
});

/**
 * Pre-configured rate limiter for general API routes
 * 500 requests per 15-minute window per IP
 */
export const apiRateLimiter = createExpressRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: "API rate limit reached. Please throttle your requests.",
  keyGenerator: (req) => `${req.ip || "127.0.0.1"}_api`,
});

/**
 * Pre-configured rate limiter for report exports
 * 30 exports per 15-minute window per IP/user
 */
export const exportRateLimiter = createExpressRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Report export rate limit exceeded. Please wait a few minutes before requesting more exports.",
  keyGenerator: (req) => `${req.user?.userId || req.ip || "127.0.0.1"}_export`,
});
