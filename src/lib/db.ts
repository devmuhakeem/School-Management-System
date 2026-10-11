import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

declare global {
  // Prevent multiple instances of Prisma Client in development
  // eslint-disable-next-line no-var
  var __sms_prisma__: PrismaClient | undefined;
}

export interface DatabaseStatus {
  connected: boolean;
  status: "CONNECTED" | "NOT_CONFIGURED" | "UNREACHABLE" | "ERROR";
  latencyMs?: number;
  message: string;
  databaseType: "PostgreSQL";
  configured: boolean;
  timestamp: string;
  diagnosticAdvice?: string;
}

const isDatabaseUrlConfigured = (): boolean => {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  // Check if it's still the default dummy placeholder
  if (url.includes("localhost:5432/school_management") && process.env.NODE_ENV !== "development") {
    return false;
  }
  return true;
};

/**
 * Instantiate or reuse singleton Prisma Client
 */
export const prisma: PrismaClient =
  global.__sms_prisma__ ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "query" },
            { emit: "event", level: "error" },
            { emit: "event", level: "warn" },
          ]
        : [{ emit: "event", level: "error" }],
  });

if (process.env.NODE_ENV !== "production") {
  global.__sms_prisma__ = prisma;
}

/**
 * Safe database connection verification
 * Does NOT throw; returns structured diagnostics.
 */
export async function checkDatabaseConnection(): Promise<DatabaseStatus> {
  const timestamp = new Date().toISOString();

  if (!process.env.DATABASE_URL) {
    return {
      connected: false,
      status: "NOT_CONFIGURED",
      message: "DATABASE_URL is not configured in the environment.",
      databaseType: "PostgreSQL",
      configured: false,
      timestamp,
      diagnosticAdvice:
        "Provide a valid PostgreSQL connection string in .env (e.g., Cloud SQL or local PostgreSQL) to enable persistence.",
    };
  }

  const startTime = Date.now();
  try {
    // Execute a minimal raw ping query with safety
    await prisma.$queryRawUnsafe("SELECT 1;");
    const latencyMs = Date.now() - startTime;

    logger.info("Database connection check succeeded", { latencyMs });

    return {
      connected: true,
      status: "CONNECTED",
      latencyMs,
      message: "PostgreSQL database connected and operational.",
      databaseType: "PostgreSQL",
      configured: true,
      timestamp,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - startTime;
    const rawMessage = err instanceof Error ? err.message : String(err);

    // Sanitize any passwords or credentials from error message
    const sanitized = rawMessage
      .replace(/:\/\/.*:.*@/g, "://***:***@")
      .replace(/password=\S+/gi, "password=***");

    logger.warn("Database connection check failed", { error: sanitized });

    let advice = "Verify the database server is running and credentials are valid.";
    if (sanitized.includes("ECONNREFUSED")) {
      advice = "PostgreSQL service is not running on the configured host:port.";
    } else if (sanitized.includes("Authentication failed") || sanitized.includes("password")) {
      advice = "PostgreSQL user authentication failed. Verify username and password.";
    } else if (sanitized.includes("database") && sanitized.includes("does not exist")) {
      advice = "Target database does not exist. Run migration or create database.";
    }

    return {
      connected: false,
      status: "UNREACHABLE",
      latencyMs,
      message: `Database unreachable: ${sanitized.slice(0, 150)}`,
      databaseType: "PostgreSQL",
      configured: true,
      timestamp,
      diagnosticAdvice: advice,
    };
  }
}
