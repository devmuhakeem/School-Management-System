import { ApiErrorPayload } from "./api-response";

/**
 * Base Application Error
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_SERVER_ERROR",
    details?: unknown,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string = "Validation failed",
    fieldErrors?: Record<string, string[]>,
    details?: unknown
  ) {
    super(message, 400, "VALIDATION_ERROR", details);
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Unauthorized Error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required", details?: unknown) {
    super(message, 401, "UNAUTHORIZED", details);
  }
}

/**
 * Forbidden Error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = "Access denied: insufficient permissions", details?: unknown) {
    super(message, 403, "FORBIDDEN", details);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = "Resource", identifier?: string | number) {
    const msg = identifier !== undefined
      ? `${resource} with identifier '${identifier}' was not found`
      : `${resource} was not found`;
    super(msg, 404, "NOT_FOUND", { resource, identifier });
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string = "Resource conflict detected", details?: unknown) {
    super(message, 409, "CONFLICT", details);
  }
}

/**
 * Database Error (500 or 503)
 * Sanitizes any raw database error string to protect sensitive credentials
 */
export class DatabaseError extends AppError {
  constructor(message: string = "Database operation failed", details?: unknown) {
    // Sanitize any password or database url leaks
    const sanitizedMsg = String(message)
      .replace(/:\/\/.*:.*@/g, "://***:***@")
      .replace(/password=\S+/gi, "password=***");

    super(sanitizedMsg, 503, "DATABASE_ERROR", details);
  }
}

/**
 * Type guard for AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Normalize any thrown exception into a structured, safe HTTP error payload
 */
export function normalizeError(error: unknown): {
  statusCode: number;
  payload: ApiErrorPayload;
} {
  if (isAppError(error)) {
    return {
      statusCode: error.statusCode,
      payload: {
        message: error.message,
        code: error.code,
        ...(error.details !== undefined ? { details: error.details } : {}),
        ...(error instanceof ValidationError && error.fieldErrors
          ? { fieldErrors: error.fieldErrors }
          : {}),
      },
    };
  }

  if (error instanceof Error) {
    // Sanitize general errors
    const safeMessage = process.env.NODE_ENV === "production"
      ? "An unexpected internal error occurred."
      : error.message;

    return {
      statusCode: 500,
      payload: {
        message: safeMessage,
        code: "INTERNAL_SERVER_ERROR",
      },
    };
  }

  return {
    statusCode: 500,
    payload: {
      message: "An unexpected unknown error occurred.",
      code: "UNKNOWN_ERROR",
    },
  };
}
