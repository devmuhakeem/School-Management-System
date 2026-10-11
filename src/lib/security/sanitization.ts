import path from "path";
import { ValidationError } from "@/lib/errors";

/**
 * Sanitizes cell values to prevent CSV / Spreadsheet Formula Injection (CWE-1236).
 * Prepends a single quote to cells beginning with formula triggers: =, +, -, @, tab, or carriage return.
 */
export function sanitizeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  let str = String(val);

  // If cell starts with formula characters, prefix with single quote to neutralize execution in Excel/Sheets
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Standard RFC 4180 CSV escaping
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Prohibited file extensions for document uploads (executable scripts, binary payloads, web shells)
 */
const PROHIBITED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".bash", ".zsh", ".bin", ".dll", ".so",
  ".vbs", ".js", ".mjs", ".cjs", ".ts", ".py", ".rb", ".php", ".phtml",
  ".pl", ".cgi", ".jsp", ".asp", ".aspx", ".html", ".htm", ".xhtml",
  ".jar", ".war", ".ear", ".msi", ".com", ".scr", ".app",
]);

/**
 * Allowed document file extensions for school operations
 */
const ALLOWED_DOCUMENT_EXTENSIONS = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".webp", ".txt", ".csv",
  ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
]);

/**
 * Sanitizes and validates uploaded file names.
 * Protects against Directory Traversal (CWE-22/23), null-byte injections, and executable uploads.
 */
export function sanitizeUploadedFileName(rawFileName: string): {
  sanitizedName: string;
  extension: string;
} {
  if (!rawFileName || typeof rawFileName !== "string") {
    throw new ValidationError("File name is required and must be a valid string.");
  }

  // 1. Check for directory traversal sequences
  if (
    rawFileName.includes("..") ||
    rawFileName.includes("/") ||
    rawFileName.includes("\\") ||
    rawFileName.includes("\0")
  ) {
    throw new ValidationError(
      "Invalid file name: directory traversal or null-byte characters detected."
    );
  }

  // 2. Extract base name and extension safely
  const baseName = path.basename(rawFileName.trim());
  const ext = path.extname(baseName).toLowerCase();

  if (!ext) {
    throw new ValidationError("File must have a valid file extension.");
  }

  // 3. Reject executable or dangerous file extensions
  if (PROHIBITED_EXTENSIONS.has(ext)) {
    throw new ValidationError(
      `File extension "${ext}" is blocked for security reasons. Executable scripts and binaries are not permitted.`
    );
  }

  // 4. Validate allowed file extensions
  if (!ALLOWED_DOCUMENT_EXTENSIONS.has(ext)) {
    throw new ValidationError(
      `File extension "${ext}" is not supported. Please upload a standard document or image.`
    );
  }

  // 5. Sanitize characters in base name (alphanumeric, dashes, underscores, dots only)
  const nameWithoutExt = path.basename(baseName, ext);
  const cleanBase = nameWithoutExt
    .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 100);

  const finalName = `${cleanBase}${ext}`;
  return {
    sanitizedName: finalName,
    extension: ext,
  };
}

/**
 * Immutable security keys that should never be overwritten during update operations
 */
const PROTECTED_KEYS = new Set([
  "id",
  "organizationId",
  "campusId",
  "createdAt",
  "userId",
  "createdBy",
  "createdById",
]);

/**
 * Safely copies allowed fields from source into target object without overwriting immutable identifiers
 * Protects against Mass Assignment / Parameter Tampering (CWE-915)
 */
export function safeAssign<T extends Record<string, unknown>>(
  target: T,
  source: Record<string, unknown>,
  allowedKeys?: Array<keyof T>
): T {
  if (!source || typeof source !== "object") return target;

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;

    // Reject immutable security identifiers
    if (PROTECTED_KEYS.has(key)) {
      continue;
    }

    // If an allowlist is provided, verify inclusion
    if (allowedKeys && !allowedKeys.includes(key as keyof T)) {
      continue;
    }

    (target as Record<string, unknown>)[key] = value;
  }

  return target;
}

/**
 * Escapes characters with special meaning in regular expressions (prevents ReDoS and Regex Injection)
 */
export function escapeRegex(str: string): string {
  if (!str || typeof str !== "string") return "";
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Strips dangerous HTML tags, attributes, event handlers, and javascript: protocols to prevent XSS (CWE-79).
 */
export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";

  return input
    // Strip script, style, iframe, object, embed, form tags and contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "")
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "")
    // Strip dangerous event handler attributes (onload, onerror, onclick, etc.)
    .replace(/\s*on\w+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\s*on\w+\s*=\s*[^>\s]+/gi, "")
    // Strip javascript: and vbscript: URIs
    .replace(/javascript:[^"'>\s]*/gi, "")
    .replace(/vbscript:[^"'>\s]*/gi, "")
    // Strip data: URIs in src or href
    .replace(/(src|href)\s*=\s*(['"])data:[^'"]*\2/gi, "");
}

/**
 * Sanitizes search queries to prevent ReDoS, control character injection, or excessively large strings.
 */
export function sanitizeSearchQuery(query?: string | null, maxLength: number = 100): string {
  if (!query || typeof query !== "string") return "";
  return query
    .replace(/[\0\x08\x09\x1a\n\r]/g, " ")
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates that an identifier contains only safe alphanumeric, dash, and underscore characters.
 * Protects against path traversal and SQL/NoSQL parameter manipulation.
 */
export function sanitizeId(id: string, paramName: string = "Identifier"): string {
  if (!id || typeof id !== "string") {
    throw new ValidationError(`${paramName} must be a non-empty string.`);
  }
  const trimmed = id.trim();
  if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
    throw new ValidationError(`Invalid ${paramName}: contains unauthorized characters.`);
  }
  return trimmed;
}
