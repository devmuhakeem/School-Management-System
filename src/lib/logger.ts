/**
 * Structured Logger for School Management System
 * Sanitizes sensitive fields to prevent credential / PII leakage
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "secret",
  "authorization",
  "cookie",
  "apikey",
  "access_token",
  "refresh_token",
  "creditcard",
  "ssn",
  "sms_token",
  "databaseurl",
]);

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /apikey/i,
  /api_key/i,
  /creditcard/i,
  /credit_card/i,
  /ssn/i,
  /auth.*header/i,
  /database.*url/i,
];

function sanitizeValue(key: string, val: unknown): unknown {
  const lowerKey = key.toLowerCase();
  if (SENSITIVE_KEYS.has(lowerKey) || SENSITIVE_KEY_PATTERNS.some((p) => p.test(lowerKey))) {
    return "[REDACTED]";
  }
  if (val && typeof val === "object") {
    return sanitizeObject(val as Record<string, unknown>);
  }
  return val;
}

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) =>
      typeof item === "object" && item !== null ? sanitizeObject(item) : item
    ) as unknown as Record<string, unknown>;
  }

  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    clean[k] = sanitizeValue(k, v);
  }
  return clean;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel = "info";

  constructor() {
    const envLevel = (process.env.LOG_LEVEL?.toLowerCase() || "info") as LogLevel;
    if (envLevel in LOG_LEVEL_PRIORITY) {
      this.level = envLevel;
    }
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>
  ): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      ...(context ? { context: sanitizeObject(context) } : {}),
    };

    return JSON.stringify(entry);
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, context));
    }
  }

  public info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, context));
    }
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, context));
    }
  }

  public error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      const errContext = {
        ...context,
        ...(error instanceof Error
          ? {
              errorName: error.name,
              errorMessage: error.message,
              ...(process.env.NODE_ENV !== "production" ? { stack: error.stack } : {}),
            }
          : { error }),
      };
      console.error(this.formatMessage("error", message, errContext));
    }
  }
}

export const logger = new Logger();
