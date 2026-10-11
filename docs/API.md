# API.md — Application Programming Interface & Repository Data Contracts

## 1. Uniform Response Format
All HTTP responses adhere to a consistent contract defined in `src/lib/api-response.ts`.

### Successful Response:
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "meta": {
    "timestamp": "2026-09-25T10:00:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### Paginated Response:
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "timestamp": "2026-09-25T10:00:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 120,
      "totalPages": 6,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 2. Server Repository Layer Abstractions (`src/repositories/`)

Every repository enforces tenant boundary via `TenantContext`:

| Repository | Key Methods | Description |
|---|---|---|
| **OrganizationRepository** | `findById`, `findBySlug`, `create`, `update` | Manages root school organizations |
| **CampusRepository** | `findMany`, `findById`, `findByCode`, `create`, `update` | Multi-campus operations under tenant |
| **UserRepository** | `findByEmail`, `findById`, `findMany`, `create` | Identity and membership directory |
| **StudentRepository** | `findById`, `findByAdmissionNumber`, `findMany`, `create`, `enroll`, `getEnrollmentHistory` | Student registry and historical enrollment progression |
| **AcademicRepository** | `getCurrentAcademicYear`, `findAcademicYears`, `createAcademicYear`, `findClasses`, `createClass`, `findSubjects` | Academic sessions, terms, classes, sections, subjects |
| **StaffRepository** | `findById`, `findByEmployeeNumber`, `findMany`, `create`, `assignTeaching` | Faculty registry, departments, positions, teaching assignments |
| **GuardianRepository** | `findById`, `createForStudent`, `findByStudentId` | Parent/guardian contacts and student relationships |
| **AttendanceRepository**| `recordStudentAttendance`, `findClassAttendance`, `recordStaffAttendance` | Daily student and staff attendance with deduplication |
| **AuditRepository** | `log`, `findMany` | Immutable compliance and security event ledger |

---

## 3. Core API Endpoints
 
+### Authentication & Session Endpoints
+
+#### `POST /api/auth/login`
+- **Description:** Authenticates user credentials with rate-limiting and returns signed JWT with full session context.
+- **Request Body:** `{ email: string, password: string, rememberMe?: boolean }`
+- **Returns:** `{ token: string, user: SafeUser }`
+
+#### `POST /api/auth/logout`
+- **Description:** Terminates active session, clears cookies, and writes security audit event.
+- **Headers:** `Authorization: Bearer <token>`
+- **Returns:** `{ loggedOut: true }`
+
+#### `GET /api/auth/me`
+- **Description:** Retrieves currently authenticated user profile, roles, and granular permissions.
+- **Headers:** `Authorization: Bearer <token>`
+- **Returns:** `SafeUser`
+
+#### `POST /api/auth/switch-campus`
+- **Description:** Switches active campus context for multi-campus users, re-issuing an updated signed JWT.
+- **Headers:** `Authorization: Bearer <token>`
+- **Request Body:** `{ campusId: string }`
+- **Returns:** `{ token: string, activeCampus: object }`
+
+#### `GET /api/auth/demo-accounts`
+- **Description:** Lists development accounts for test verification in development mode.
+
+### Protected Sample Endpoints (RBAC Enforced)
+
+#### `GET /api/admin/roles`
+- **Guard:** `requireAuth`, `requirePermission("roles.read")`
+
+#### `POST /api/students`
+- **Guard:** `requireAuth`, `requirePermission("students.create")`
+
+#### `GET /api/finance/invoices`
+- **Guard:** `requireAuth`, `requirePermission("finance.read")`
+
+#### `GET /api/attendance`
+- **Guard:** `requireAuth`, `requirePermission("attendance.read")`
+
+### System Health & Diagnostics
- **Description:** Verifies service uptime and database operational state.
- **Returns:** Health diagnostic payload with uptime and DB status.

### `GET /api/database/status`
- **Description:** Returns detailed PostgreSQL status, latency in milliseconds, and configuration diagnostics.
- **Returns:** DatabaseStatus object.

### `POST /api/test/validation`
- **Description:** Demonstrates Zod schema validation using `organizationSchema`.
- **Request Body:** `{ name, slug, code, website }`
- **Returns:** 200 with validated data or 400 with structured `fieldErrors`.

---

## 4. Phase 7 Attendance Management Endpoints (`/api/attendance`)

All attendance endpoints require active authentication (`requireAuth`) and multi-tenant authorization (`requirePermission`).

### `GET /api/attendance/dashboard-stats`
- **Permission:** `attendance.read`
- **Query Parameters:** `campusId`, `academicYearId`, `date`
- **Returns:** Daily attendance rate (%), present, absent, late, excused, unmarked counts, and incomplete class cohorts.

### `GET /api/attendance/register`
- **Permission:** `attendance.read`
- **Query Parameters:** `classId` (required), `sectionId`, `teachingGroupId`, `lessonId`, `attendanceDate`, `attendanceType` (`DAILY` | `LESSON`)
- **Returns:** Eligible active students roster, lock status, and recorded attendance states.

### `POST /api/attendance/single`
- **Permission:** `attendance.create`
- **Body:** `{ campusId, academicYearId, classId, sectionId?, studentId, attendanceType, attendanceDate, status, arrivalTime?, reason?, remarks? }`
- **Returns:** 201 with recorded attendance entry.

### `POST /api/attendance/bulk`
- **Permission:** `attendance.create`
- **Body:** `{ campusId, academicYearId, classId, sectionId?, teachingGroupId?, attendanceType, attendanceDate, records: [{ studentId, status, arrivalTime?, reason?, remarks? }] }`
- **Returns:** 200 with bulk transaction result and committed student count.

### `POST /api/attendance/:id/correct`
- **Permission:** `attendance.correct`
- **Body:** `{ status, correctionReason, arrivalTime?, reason?, remarks? }`
- **Returns:** 200 with created `AttendanceCorrection` audit record and updated status.

### `POST /api/attendance/:id/excuse`
- **Permission:** `attendance.update`
- **Body:** `{ isExcused: true, excuseReason, remarks? }`
- **Returns:** 200 with excused attendance state.

### `POST /api/attendance/lock` / `POST /api/attendance/unlock`
- **Permission:** `attendance.lock` / `attendance.unlock`
- **Body:** `{ campusId, academicYearId, classId, sectionId?, attendanceDate, attendanceType, lockNotes? }`
- **Returns:** 200 with updated register lock state.

### `GET /api/attendance/student/:studentId`
- **Permission:** `attendance.read`
- **Query Parameters:** `academicYearId`, `termId`, `startDate`, `endDate`, `status`, `page`, `limit`
- **Returns:** Paginated student timeline with cumulative sessions and accurate percentage.

### `GET /api/attendance/class/:classId/history`
- **Permission:** `attendance.read`
- **Query Parameters:** `sectionId`, `startDate`, `endDate`, `academicYearId`
- **Returns:** Date-by-date attendance rates and status breakdown.

### `GET /api/attendance/reports`
- **Permission:** `attendance.reports`
- **Query Parameters:** `type` (`CLASS_SUMMARY` | `LESSON_ATTENDANCE`), `classId`, `sectionId`, `teachingGroupId`, `startDate`, `endDate`
- **Returns:** Aggregated attendance matrices and exportable tabular data.

---

## 5. Phase 8 Examinations, Grading & Results Endpoints (`/api/examinations`)

All examination endpoints require active authentication (`requireAuth`) and multi-tenant authorization (`requirePermission`).

- `GET /api/examinations/overview` — Institutional examination KPIs, active sessions, and grading distributions (`exams.read`)
- `GET /api/examinations/grading-schemes` — Configured grading boundary scales (`exams.read`)
- `POST /api/examinations/grading-schemes` — Register WAEC, Cambridge, or custom grading scales (`exams.manage`)
- `GET /api/examinations/component-configs` — Subject assessment component weighting configurations (`exams.read`)
- `POST /api/examinations/component-configs` — Configure component weights (e.g. Test 20%, Exam 60%) (`exams.manage`)
- `GET /api/examinations/sessions` — Terminal examination session calendar (`exams.read`)
- `POST /api/examinations/sessions` — Create exam session (`exams.create`)
- `GET /api/examinations/schedules` — Timetabled exam sittings with invigilators and room allocations (`exams.read`)
- `POST /api/examinations/schedules` — Schedule invigilated exam sitting with collision checking (`exams.create`)
- `POST /api/examinations/schedules/check-conflict` — Server-side conflict detection for room and invigilator availability (`exams.read`)
- `GET /api/examinations/assessments` — Continuous assessment and exam tasks (`exams.read`)
- `POST /api/examinations/assessments` — Create assessment (`exams.create`)
- `GET /api/examinations/scores/sheet` — Class marks recording sheet with student rosters (`scores.enter`)
- `POST /api/examinations/scores/bulk` — Rapid marks entry for student cohorts (`scores.enter`)
- `POST /api/examinations/scores/:id/correct` — Controlled mark corrections with mandatory justification audit (`scores.edit`)
- `POST /api/examinations/results/compute` — Dense rank calculation, weighted averages, and GPA derivation (`results.compute`)
- `GET /api/examinations/results/summary` — Cohort terminal results with ranks and status (`exams.read`)
- `POST /api/examinations/results/review` — Multi-stage governance: Submit, Approve, Publish, or Lock (`results.approve` / `results.publish` / `results.lock`)
- `GET /api/examinations/report-cards/:studentId` — Official printable student terminal report card with remarks (`reportcards.generate`)

---

## 6. Phase 9 Finance, Fees, Invoicing & Payments Endpoints (`/api/finance`)

All financial endpoints enforce strict tenant isolation (`TenantContext`), server-side exact monetary recalculation, and RBAC permissions.

### Overview & Revenue Metrics
- `GET /api/finance/overview` — Revenue collected, billed amounts, collection rate (%), outstanding debt, category distributions, and real-time transaction feed (`finance.read`)

### Fee Categories & Schedules
- `GET /api/finance/categories` — Configured institutional fee categories (`finance.read`)
- `POST /api/finance/categories` — Register new fee category with unique code validation (`finance.manage`)
- `PUT /api/finance/categories/:id` — Update category properties (`finance.manage`)
- `DELETE /api/finance/categories/:id` — Remove non-system category with zero item dependencies (`finance.manage`)
- `GET /api/finance/structures` — Version-controlled fee tariffs and schedules (`finance.read`)
- `POST /api/finance/structures` — Create new fee schedule with itemized tariffs (`finance.manage`)
- `PUT /api/finance/structures/:id` — Update fee schedule; automatically clones into new version (e.g. v2) if invoices have been issued (`finance.manage`)
- `POST /api/finance/structures/:id/version` — Explicitly clone schedule into new version (`finance.manage`)

### Student Fee Assignments & Invoicing
- `POST /api/finance/assignments` — Assign fee structures and custom discounts to individual students (`fees.manage`)
- `GET /api/finance/students/:studentId/assignments` — Retrieve student fee assignments (`finance.read`)
- `GET /api/finance/invoices` — Query and filter invoices by student, class, term, or status (`finance.read`)
- `GET /api/finance/invoices/:id` — Detailed invoice breakdown with itemized lines and payment allocations (`finance.read`)
- `POST /api/finance/invoices` — Generate single invoice with server-side recalculated lines and balance due (`invoices.create`)
- `POST /api/finance/invoices/batch` — Bulk generate invoices for class cohorts with duplicate prevention (`invoices.create`)
- `POST /api/finance/invoices/:id/void` — Permanently void unpaid invoice with auditable justification (`invoices.manage`)

### Concessions, Scholarships & Waivers
- `GET /api/finance/waivers` — Query granted scholarships, merit awards, and concessions (`finance.read`)
- `POST /api/finance/waivers` — Apply fixed or percentage fee concession to student invoice (`discounts.apply`)
- `POST /api/finance/waivers/:id/review` — Approve, reject, or cancel fee concessions (`discounts.apply`)

### Payments, Receipts & Credits
- `GET /api/finance/payments` — Query settled transactions and payment channel records (`finance.read`)
- `GET /api/finance/payments/:id` — View payment transaction details (`finance.read`)
- `POST /api/finance/payments` — Process payment, allocate funds across open invoices (explicit or FIFO), credit surplus overpayments to student balance, and issue sequential official receipt (`payments.record`)
- `GET /api/finance/receipts` — Query official receipts (`finance.read`)
- `GET /api/finance/receipts/:id` — Official printable settlement receipt with school header and breakdown (`finance.read`)
- `GET /api/finance/students/:studentId/credits` — Query student surplus credit balance and transaction history (`finance.read`)
- `POST /api/finance/credits/apply` — Apply student surplus credit balance to settle invoice balances (`payments.record`)

### Student Ledger & Debt Recovery
- `GET /api/finance/students/:studentId/ledger` — Complete chronological Statement of Account with running balance (`finance.read`)
- `GET /api/finance/debtors` — Aged debtor schedule with 0-30, 31-60, 61-90, 90+ days overdue aging buckets (`finance.reports`)
- `GET /api/finance/refunds` — View payment refunds history (`finance.read`)
- `POST /api/finance/refunds` — Process auditable payment refund with limit validation (`refunds.process`)


