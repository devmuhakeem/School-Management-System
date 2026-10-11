import { describe, it, expect } from "vitest";
import { sanitizeObject } from "../logger";

describe("Logger Sanitization Utility", () => {
  it("redacts sensitive fields like password, token, and secret", () => {
    const raw = {
      user: "admin",
      password: "SuperSecretPassword!",
      token: "jwt.header.payload",
      apiKey: "secret-key-123",
      email: "admin@school.internal",
      nested: {
        authorization: "Bearer 987654321",
        normalField: "visible",
      },
    };

    const sanitized = sanitizeObject(raw);

    expect(sanitized.user).toBe("admin");
    expect(sanitized.email).toBe("admin@school.internal");
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.token).toBe("[REDACTED]");
    expect(sanitized.apiKey).toBe("[REDACTED]");

    const nested = sanitized.nested as Record<string, unknown>;
    expect(nested.authorization).toBe("[REDACTED]");
    expect(nested.normalField).toBe("visible");
  });

  it("handles arrays of objects safely", () => {
    const arr = [
      { id: 1, secret: "confidential" },
      { id: 2, name: "Public Record" },
    ];

    const sanitized = sanitizeObject(arr as unknown as Record<string, unknown>) as unknown as Array<Record<string, unknown>>;
    expect(sanitized[0].secret).toBe("[REDACTED]");
    expect(sanitized[0].id).toBe(1);
    expect(sanitized[1].name).toBe("Public Record");
  });
});
