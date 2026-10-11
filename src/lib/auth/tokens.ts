import jwt from "jsonwebtoken";
import { UnauthorizedError } from "@/lib/errors";

const AUTH_SECRET = process.env.AUTH_SECRET || "development-insecure-secret-key-change-in-production-min32chars";
const AUTH_EXPIRY = process.env.AUTH_EXPIRY || "24h";

export interface SessionTokenPayload {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  organizationName: string;
  campusIds: string[];
  activeCampusId: string | null;
  roles: string[];
  permissions: string[];
  status: string;
}

export interface DecodedSessionToken extends SessionTokenPayload {
  iat: number;
  exp: number;
}

/**
 * Sign session JWT token
 * Automatically strips existing iat/exp if a decoded payload is passed
 */
export function signSessionToken(payload: SessionTokenPayload): string {
  const { iat, exp, ...cleanPayload } = payload as Partial<DecodedSessionToken>;
  return jwt.sign(cleanPayload, AUTH_SECRET, {
    expiresIn: AUTH_EXPIRY as jwt.SignOptions["expiresIn"],
    algorithm: "HS256",
  });
}

/**
 * Verify and decode session JWT token
 * Throws UnauthorizedError if invalid, expired, or tampered
 */
export function verifySessionToken(token: string): DecodedSessionToken {
  try {
    const decoded = jwt.verify(token, AUTH_SECRET, {
      algorithms: ["HS256"],
    }) as DecodedSessionToken;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError("Session has expired. Please log in again.");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError("Invalid authentication token signature.");
    }
    throw new UnauthorizedError("Authentication verification failed.");
  }
}
