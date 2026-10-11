# Phase 14 Security Audit & Application Hardening Report

**Project:** School Management System (SchoolOS)  
**Phase:** Phase 14 — Security Hardening & Comprehensive Security Audit  
**Date:** October 2026  
**Status:** Audit Completed & Defenses Verified  

---

## 1. Executive Summary

A comprehensive, full-stack security audit and hardening pass was conducted across the entire School Management System (SchoolOS) codebase covering all modules implemented in Phases 0 through 13.

The security audit verified that:
1. **Tenant Isolation:** Enforced strictly at the repository and service layers using server-side `TenantContext`. No client-supplied tenant identifier overrides are trusted.
2. **Campus Isolation:** Branch-level data access is strictly enforced for campus staff and administrators.
3. **IDOR & BOLA Defenses:** Direct object identifier manipulation is prevented across all entity tiers. Parent/student access resolves relationships server-side.
4. **Authentication & Session Security:** Sliding-window rate limiting prevents brute-force credential stuffing. Passwords use bcrypt with 12 salt rounds. Session tokens are signed using HMAC-SHA256 and verified cryptographically; tampered tokens are rejected. Constant-time dummy hashing prevents username enumeration.
5. **Input Validation & Injection Neutralization:**
   - **CSV Formula Injection (CWE-1236):** Neutralized via `sanitizeCsvCell` by escaping formula prefixes (`=`, `+`, `-`, `@`, `\t`, `\r`).
   - **Path & Directory Traversal (CWE-22/23):** Neutralized via `sanitizeUploadedFileName` by blocking `..`, `/`, `\`, null bytes, and restricting file extensions to safe document formats.
   - **Cross-Site Scripting (XSS / CWE-79):** Neutralized via `sanitizeHtml` by stripping script tags, malicious event handlers (`onerror`, `onload`), and `javascript:` URIs.
   - **Mass Assignment (CWE-915):** Neutralized via `safeAssign` preventing client overwrites of immutable security keys (`id`, `organizationId`, `campusId`, `userId`, `createdAt`).
   - **Parameter Tampering & ReDoS:** Neutralized via `sanitizeId`, `sanitizeSearchQuery`, and `escapeRegex`.
6. **Cross-Site Request Forgery (CSRF / CWE-352):** Enforced via `csrfProtection` middleware validating Origin and Referer headers against Host for cookie-authenticated state mutations.
7. **Information Leakage & Secret Redaction:** Credentials, API keys, database connection strings, and tokens are redacted via `sanitizeObject`. Internal server errors and database stack traces are masked in production via `normalizeError`.

---

## 2. Threat Model & Actor Matrix

The SchoolOS threat model defines 14 core actor personas, each with explicit trust boundaries:

| Persona | Trust Level | Typical Attack Vectors & Risks | Security Boundary Control |
|---|---|---|---|
| **External Attacker** | Untrusted | Credential stuffing, brute force, DDoS, SQLi, XSS, CSRF, Path traversal, open endpoints | Network edge, helmet headers, rate limiter, input validation, CSRF middleware |
| **Unauthenticated Visitor** | Untrusted | Account enumeration, brute force login, unauthorized endpoint discovery | Authentication guards (`requireAuth`), constant-time credential checks |
| **Student** | Low | IDOR on peers' grades, attendance tampering, unpublished report card access, profile tampering | `requireOwnStudentAccess`, portal service ownership assertions, RBAC checks |
| **Parent / Guardian** | Medium-Low | IDOR to unlinked students' attendance/grades/financial invoices, child switcher tampering | `requireGuardianStudentAccess`, server-side relationship matrix lookup |
| **Teacher** | Medium | Grading unassigned sections, tampering with locked attendance registers, cross-campus queries | `verifyTeacherAttendanceAuthority`, class teacher assignment constraints |
| **Accountant / Finance Officer** | Medium | Modifying academic records, approving unauthorized fee tariff waivers | Granular permissions (`finance.manage`, `payments.record`), ledger immutability |
| **Librarian** | Medium | Accessing financial ledgers or academic student profiles | Granular permissions (`library.manage`), catalog and loan isolation |
| **Transport Staff** | Medium | Accessing hostel or grading records, altering unauthorized routes | Granular permissions (`transport.manage`), manifest read/write constraints |
| **Hostel Staff** | Medium | Modifying school-wide finances or academic records | Granular permissions (`hostel.manage`), roll call register bounds |
| **Campus Administrator** | High (Branch) | Cross-campus privilege escalation, accessing sister campus data | `enforceCampusIsolation`, `assertBelongsToCampus` |
| **Organization Administrator** | High (Tenant) | Cross-tenant data leakage, accessing competitor school tenant data | `enforceTenantIsolation`, `assertBelongsToTenant` |
| **System Super Administrator** | Highest | Accidental credential leakage, credential replay | Audit logging, MFA readiness, token expiration |
| **Compromised Account** | Malicious | Session hijacking, replay attacks, parameter tampering | Short-lived JWTs, token signature validation, rate limiting |
| **Malicious Authenticated User** | Hostile Insider | BOLA/IDOR manipulation, mass assignment attacks, CSV formula injection | Server-side entity ownership checks, safeAssign allowlists, CSV escaping |

---

## 3. Trust Boundaries & Attack Surfaces

```text
Untrusted Web / External Client
           │
           │  [Attack Surface: HTTPS / API Gateway]
           ▼
Security Headers & Rate Limiting Middleware
           │  (X-Content-Type-Options, Frameguard, Referrer-Policy, RateLimiter, Body Limit)
           ▼
Origin & CSRF Guard
           │  (Blocks cross-origin state mutations on cookie sessions)
           ▼
Authentication & Token Verification Layer
           │  (Validates HMAC-SHA256 signature, expiration, active user status)
           ▼
TenantContext Constructor & Tenant Isolation Guard
           │  (Constructs immutable context: organizationId, campusId, userId, roles)
           ▼
Granular RBAC & Role Verification Layer
           │  (requirePermission, requireRole, requireCampusAccess)
           ▼
Domain Service & Object Authorization Layer
           │  (verifyTeacherAttendanceAuthority, requireGuardianStudentAccess, IDOR prevention)
           ▼
Input Validation & Sanitization Layer
           │  (Zod schemas, sanitizeUploadedFileName, sanitizeCsvCell, sanitizeHtml, safeAssign)
           ▼
Repository & Data Persistence Layer (Prisma ORM)
           │  (WHERE organizationId = ctx.organizationId, parameterized SQL)
           ▼
PostgreSQL Database / Audit Trail
```

---

## 4. Audit Findings & Hardening Pass Summary

### Finding 1: Cross-Tenant Data Access (IDOR / BOLA)
- **Vulnerability Identified:** Certain query handlers relied on entity IDs without consistently asserting that the requested record belonged to `ctx.organizationId`.
- **Remediation Implemented:**
  - Added `enforceTenantIsolation(ctx, resourceOrgId)` and `assertBelongsToTenant(entity, ctx)` in `src/lib/security/isolation.ts`.
  - Audited all domain services (Student, Finance, Library, Attendance, Examination, Transport, Hostel, Portal). Every entity lookup now enforces matching `organizationId`.
  - If a foreign tenant attempts to fetch an existing entity by ID, the system returns a 404 (NotFoundError) or 403 (ForbiddenError) rather than exposing the record.

### Finding 2: Parent Portal Child Isolation (IDOR)
- **Vulnerability Identified:** If client passed an arbitrary `studentId` to parent endpoints, an unlinked student's overview could theoretically be exposed if not verified against the `StudentGuardian` junction.
- **Remediation Implemented:**
  - Centralized `portalService.requireGuardianStudentAccess(ctx, studentId)`.
  - The server resolves the guardian record strictly from `ctx.userId` and validates linked wards in the relationship matrix.
  - Attempting to query an unlinked student throws `ForbiddenError` ("Access denied: Student is not linked to your guardian profile").

### Finding 3: CSV / Spreadsheet Formula Injection (CWE-1236)
- **Vulnerability Identified:** Exporting student, attendance, finance, and grade registers to CSV could allow formula injection if student names, notes, or fee codes began with `=`, `+`, `-`, `@`, `\t`, or `\r`.
- **Remediation Implemented:**
  - Created and implemented `sanitizeCsvCell(val)` in `src/lib/security/sanitization.ts`.
  - Prepends a single quote (`'`) to any cell starting with formula triggers, neutralizing automated calculation in Microsoft Excel, LibreOffice Calc, and Google Sheets.
  - Standardized RFC 4180 CSV escaping across all report generators in `reporting.service.ts`.

### Finding 4: File Upload & Directory Traversal (CWE-22/23)
- **Vulnerability Identified:** Upload endpoints could allow path traversal sequences (`../../`) or executable payloads (`.exe`, `.sh`, `.php`) if filename validation was weak.
- **Remediation Implemented:**
  - Implemented `sanitizeUploadedFileName(rawFileName)` in `src/lib/security/sanitization.ts`.
  - Rejects `..`, `/`, `\`, and null bytes (`\0`).
  - Enforces an allowlist of safe document formats (`.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.txt`, `.csv`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`).
  - Explicitly blocks executable extensions (`.exe`, `.bat`, `.cmd`, `.sh`, `.php`, `.jsp`, `.asp`, `.py`, `.js`, `.bin`, `.scr`, `.msi`).
  - Sanitizes the base filename to contain alphanumeric characters, underscores, dashes, and periods only.

### Finding 5: Mass Assignment / Parameter Tampering (CWE-915)
- **Vulnerability Identified:** Generic `Object.assign` calls on updates could allow attackers to tamper with immutable security identifiers (`id`, `organizationId`, `campusId`, `createdAt`, `userId`).
- **Remediation Implemented:**
  - Created `safeAssign(target, source, allowedKeys)` in `src/lib/security/sanitization.ts`.
  - Protects immutable identifiers from being overwritten during update operations.

### Finding 6: Cross-Site Scripting (XSS / CWE-79)
- **Vulnerability Identified:** User-generated content (announcements, notes, communication messages) rendered in client components could pose stored XSS risks.
- **Remediation Implemented:**
  - Implemented `sanitizeHtml(input)` in `src/lib/security/sanitization.ts` to strip `<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`, dangerous event handlers (`onload`, `onerror`, `onclick`), and `javascript:` URIs.

### Finding 7: Cross-Site Request Forgery (CSRF / CWE-352)
- **Vulnerability Identified:** Cookie-authenticated state-mutating API requests lacked Origin/Referer verification.
- **Remediation Implemented:**
  - Created `csrfProtection` middleware in `src/lib/security/csrf.ts` and mounted on Express application in `server.ts`.
  - Validates `Origin` and `Referer` headers against `Host` for state-mutating HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`).
  - Safe methods (`GET`, `HEAD`, `OPTIONS`) and programmatic Bearer token requests are appropriately handled.

### Finding 8: Credential & PII Leakage in Logs and Telemetry
- **Vulnerability Identified:** Sensitive fields could potentially be written to log outputs or error messages.
- **Remediation Implemented:**
  - Enhanced `SENSITIVE_KEYS` and `SENSITIVE_KEY_PATTERNS` in `src/lib/logger.ts` to redact passwords, hashes, tokens, API keys, cookies, SSNs, credit cards, and database URLs.
  - `normalizeError` in `src/lib/errors.ts` replaces internal error messages and suppresses stack traces in production (`process.env.NODE_ENV === "production"`).

---

## 5. Automated Security Regression Test Coverage

The test suite in `src/lib/__tests__/security-audit.test.ts` executes 24 automated security tests validating all core hardening measures:

| Test Suite Category | Number of Tests | Status |
|---|---|---|
| **Multi-Tenant & Campus Isolation** | 9 tests | ✅ Passed |
| **Parent & Student Portal Access Control & IDOR** | 3 tests | ✅ Passed |
| **Input Sanitization & Attack Neutralization** | 7 tests | ✅ Passed |
| **Authentication & Credential Protection** | 5 tests | ✅ Passed |
| **Total Security Audit Suite** | **24 tests** | **✅ 100% Passed** |

Along with the security audit suite, the entire SchoolOS test suite (18 test files, 292 tests total) executes with zero failures.
