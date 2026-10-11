import { describe, it, expect } from "vitest";
import {
  AppError,
  ValidationError,
  NotFoundError,
  DatabaseError,
  normalizeError,
} from "../errors";

describe("Application Error Hierarchy", () => {
  it("initializes AppError with correct defaults", () => {
    const error = new AppError("Base operation failure", 500, "BASE_ERROR");
    expect(error.message).toBe("Base operation failure");
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe("BASE_ERROR");
    expect(error.isOperational).toBe(true);
  });

  it("handles ValidationError with fieldErrors map", () => {
    const fieldErrors = { email: ["Invalid email format"], name: ["Name is required"] };
    const error = new ValidationError("Form validation error", fieldErrors);

    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.fieldErrors).toEqual(fieldErrors);
  });

  it("generates descriptive NotFoundError with resource info", () => {
    const error = new NotFoundError("Student", "STU-001");
    expect(error.statusCode).toBe(404);
    expect(error.message).toContain("STU-001");
    expect(error.code).toBe("NOT_FOUND");
  });

  it("sanitizes database error strings to prevent password leakage", () => {
    const leakedMessage = "Connection failed at postgresql://admin:superSecret123@db.internal:5432/sms";
    const dbError = new DatabaseError(leakedMessage);

    expect(dbError.message).not.toContain("superSecret123");
    expect(dbError.message).toContain("://***:***@");
    expect(dbError.statusCode).toBe(503);
  });

  it("normalizes unknown exceptions into safe error responses", () => {
    const genericErr = new Error("Disk read failed");
    const normalized = normalizeError(genericErr);

    expect(normalized.statusCode).toBe(500);
    expect(normalized.payload.code).toBe("INTERNAL_SERVER_ERROR");
  });
});
