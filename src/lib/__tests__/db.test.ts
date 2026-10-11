import { describe, it, expect } from "vitest";
import { checkDatabaseConnection } from "../db";

describe("Database Diagnostic Utility", () => {
  it("returns structured NOT_CONFIGURED status when DATABASE_URL is missing or local default", async () => {
    const originalUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    try {
      const status = await checkDatabaseConnection();
      expect(status.connected).toBe(false);
      expect(status.status).toBe("NOT_CONFIGURED");
      expect(status.databaseType).toBe("PostgreSQL");
      expect(status.diagnosticAdvice).toBeDefined();
    } finally {
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      }
    }
  });

  it("handles unreachable database host gracefully without throwing uncaught errors", async () => {
    const originalUrl = process.env.DATABASE_URL;
    // Point to unreachable port to test error handling
    process.env.DATABASE_URL = "postgresql://dummy:dummy@127.0.0.1:59999/dummy_db?connect_timeout=1";

    try {
      const status = await checkDatabaseConnection();
      expect(status.connected).toBe(false);
      expect(status.status).toBe("UNREACHABLE");
      expect(status.configured).toBe(true);
      expect(status.timestamp).toBeDefined();
      expect(status.message).not.toContain("dummy:dummy"); // Sanitized credentials
    } finally {
      if (originalUrl) {
        process.env.DATABASE_URL = originalUrl;
      } else {
        delete process.env.DATABASE_URL;
      }
    }
  });
});
