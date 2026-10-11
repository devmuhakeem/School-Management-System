# SECURITY.md — Phase 2 Security Architecture & Tenant Isolation

## 1. Multi-Tenant Isolation Architecture
The School Management System enforces tenant isolation strictly on the server and repository layer.

```text
Incoming Request
      │
      ▼
Authentication & Session Guard
      │ (Validates JWT / Session and extracts organizationId & campusId)
      ▼
TenantContext Constructor
      │ { organizationId: "org_123", campusId: "camp_456", userId: "usr_789" }
      ▼
Server Repository Layer
      │ (Injects WHERE organizationId = ctx.organizationId into every query)
      ▼
Prisma ORM Query
      │ SELECT ... FROM students WHERE organization_id = 'org_123'
      ▼
PostgreSQL Engine
```

### Critical Tenant Isolation Rules:
1. **No Client-Supplied Tenant Overrides:** Repositories never accept `organizationId` from client query parameters or request bodies. The `organizationId` comes exclusively from verified server session state via `TenantContext`.
2. **Explicit Foreign Key Constraints:** Every domain model (`Student`, `Staff`, `Class`, `StudentAttendance`, etc.) maintains an explicit `organizationId` column indexed for multi-tenant partitioning.
3. **Compound Uniqueness Scoping:** Natural identifiers (such as student admission numbers, employee numbers, and campus codes) are constrained uniquely per organization:
   - `@@unique([organizationId, admissionNumber])`
   - `@@unique([organizationId, employeeNumber])`
   - `@@unique([organizationId, code])`
   This allows multiple schools in a multi-tenant cluster to use standard numbering without collision.

---

## 2. RBAC Data Model Matrix
The permission system utilizes a granular permission matrix defined in `Permission` and `RolePermission`:

```text
students: [read, create, update, delete]
admissions: [read, create, update, approve]
academics: [read, manage]
attendance: [read, manage]
exams: [read, manage]
results: [publish]
finance: [read, manage]
payments: [record]
fees: [manage]
reports: [read, generate]
settings: [manage]
users: [manage]
roles: [manage]
```

Roles can be assigned globally across an entire organization or scoped to a single campus via `UserRole.campusId`.

---

## 4. Phase 3: Authentication, Authorization & RBAC Architecture

### Authentication Mechanism
* **Stateless Secure Session Tokens:** Cryptographically signed JWT tokens with HMAC-SHA256 containing complete user context (`userId`, `organizationId`, `activeCampusId`, `campusIds`, `roles`, `permissions`, `status`).
* **Brute-Force & Rate Limiting:** Sliding-window rate limiter in `src/lib/auth/rate-limiter.ts` limits consecutive failed login attempts (max 5 attempts per IP/account window with 15-minute progressive backoff).
* **Constant-Time Verification:** Dummy cryptographic operations are executed on unknown account lookups to eliminate timing attacks and username enumeration.
* **Password Policy:** Strict complexity enforcement (minimum 8 characters, uppercase, lowercase, numeric digit, and special symbol) hashed using bcrypt with 12 salt rounds.

### Server-Side Route Guards (`src/lib/auth/guards.ts`)
* `requireAuth`: Validates JWT token from `Authorization: Bearer <token>` header or `sms_token` HTTP-only cookie.
* `requirePermission(permission)`: Checks if authenticated user holds the required granular capability or possesses the system-wide `Super Administrator` role.
* `requireRole(roleName)`: Verifies role membership.
* `requireOrganizationAccess(user, targetOrgId)`: Enforces strict tenant isolation, forbidding cross-organization queries.
* `requireCampusAccess(user, targetCampusId)`: Restricts operations to authorized campus branches for multi-campus schools.

---

## 5. Phase 7: Attendance Security & Multi-Tenant Isolation

### 1. Teacher Scope Restrictions
- Teachers cannot mark attendance outside their assigned classes, sections, or teaching groups.
- `verifyTeacherAttendanceAuthority()` inspects linked `Staff`, `Class.classTeacherId`, `Section.classTeacherId`, and `TeachingAssignment` mappings before permitting attendance modifications.
- Administrators (`SUPER_ADMIN`, `CAMPUS_ADMIN`, `PRINCIPAL`, `VICE_PRINCIPAL`) retain institutional authority.

### 2. Register Locking Enforcement
- Registers can be sealed via `attendance.lock`.
- Ordinary teachers are blocked by server-side guards from altering locked records.
- Any modification on locked records requires administrator unlock or audited correction authority.

### 3. Audited Correction Integrity
- Correcting historical records requires `attendance.correct` permission and a non-empty `correctionReason`.
- The system immutably stores the original status, new status, modifier ID, and timestamp in `AttendanceCorrection` and `AuditLog`.

---

## 6. Phase 14: Security Hardening & Application-Wide Audit

### 1. Comprehensive Attack Surface Defense Layer (`src/lib/security`)
* **CSV Formula Injection Neutralization (`sanitizeCsvCell`):** Prefixes formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`) with a single quote to neutralize spreadsheet command execution (CWE-1236).
* **Path & Directory Traversal Prevention (`sanitizeUploadedFileName`):** Blocks `..`, `/`, `\`, and null bytes (`\0`). Enforces a strict allowlist of standard document formats and blocks executable scripts/binaries (CWE-22/23/434).
* **Cross-Site Scripting (XSS) Sanitization (`sanitizeHtml`):** Strips `<script>`, `<iframe>`, `<object>`, `<embed>`, dangerous event handlers (`onload`, `onerror`), and `javascript:` URIs (CWE-79).
* **Mass Assignment & Parameter Tampering Protection (`safeAssign`):** Refuses modification of immutable keys (`id`, `organizationId`, `campusId`, `createdAt`, `userId`) during partial updates (CWE-915).
* **ReDoS & Search Parameter Protection (`sanitizeSearchQuery`, `escapeRegex`):** Strips control characters and constrains search lengths to prevent regular expression Denial of Service.
* **Identifier Format Validation (`sanitizeId`):** Restricts entity IDs to alphanumeric and hyphen/underscore characters.

### 2. Multi-Tenant & Campus Boundary Assertions (`src/lib/security/isolation.ts`)
* `enforceTenantIsolation(ctx, resourceOrgId)`: Blocks cross-tenant data leaks by ensuring requested entity organization matches session context.
* `enforceCampusIsolation(ctx, campusId)`: Restricts operations to authorized branch campuses for single-campus personnel.
* `assertBelongsToTenant(entity, ctx)`: Server-side assertion verifying that database entities match the user's organization context before any read or mutation.
* `assertBelongsToCampus(entity, ctx)`: Validates campus affinity or asserts super-administrative cross-campus authority.

### 3. Cross-Site Request Forgery (CSRF) Guard (`src/lib/security/csrf.ts`)
* Protects cookie-authenticated sessions against cross-site exploitation (CWE-352).
* Validates `Origin` and `Referer` headers against `Host` on state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).
* Exempts safe HTTP methods and programmatic Bearer token requests.

### 4. PII & Secret Redaction
* Structured logger `sanitizeObject` redacts passwords, tokens, API keys, cookies, SSNs, credit cards, and database connection strings.
* `normalizeError` masks database details and internal stack traces in production environments (`process.env.NODE_ENV === "production"`).

### 5. Automated Security Regression Testing
* Verified via `src/lib/__tests__/security-audit.test.ts` (24 test suites covering Multi-Tenancy, IDOR/BOLA, Portal Access, Input Sanitization, and Authentication).



