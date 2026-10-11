# ARCHITECTURE.md — System Architecture & Design Patterns

## 1. Architectural Style
The School Management System is designed as a **Modular Clean Monolith** with clear logical layers:

```text
┌────────────────────────────────────────────────────────┐
│                      UI Layer                          │
│   (React 19, Tailwind CSS v4, shadcn UI, Lucide Icons) │
└──────────────────────────┬─────────────────────────────┘
                           │ (Typed API Calls / Server Actions)
                           ▼
┌────────────────────────────────────────────────────────┐
│            Application / Service Layer                 │
│         (Business logic, Transactions, Auditing)       │
└──────────────────────────┬─────────────────────────────┘
                           │ (Context: TenantContext)
                           ▼
┌────────────────────────────────────────────────────────┐
│               Validation & Policy Layer                │
│    (Zod Schemas, RBAC Enforcement, Tenancy Guards)     │
└──────────────────────────┬─────────────────────────────┘
                           │ (Context: TenantContext)
                           ▼
┌────────────────────────────────────────────────────────┐
│             Repository & Data Access Layer             │
│            (Prisma Client v6, PostgreSQL 16)           │
└────────────────────────────────────────────────────────┘
```

## 2. Server & Client Boundaries
- **Client Application:** SPA compiled with Vite, running on React 19. All user interfaces rely on zero-pill discipline and accessible HTML5 semantics.
- **Server:** Express.js instance (`server.ts`) hosting API routes (`/api/*`), middleware, database health diagnostics, and production static file serving.
- **Data Access Repositories (`src/repositories/`):** All database operations are encapsulated in server-side repositories taking `TenantContext` as their first parameter. UI components NEVER invoke Prisma queries directly.

## 3. Database Layer Architecture
- **Engine:** PostgreSQL with relational foreign keys, cascade rules, and compound unique constraints.
- **ORM:** Prisma Client with singleton pattern in `src/lib/db.ts` to prevent connection leaks during development restarts.
- **Multi-Tenancy Strategy:** Shared database, isolated by `organizationId` and `campusId` foreign keys on every domain entity.
- **Audit Trails:** The `AuditLog` table records IP address, user agent, actor ID, and modified entity metadata.
- **Historical Non-Destructive Progression:** Models such as `StudentEnrollment` track academic promotions and class changes across terms and sessions without overwriting past enrollment data.

## 4. UI Design System Principles
- **No Pill Badges for Metadata:** Status labels and metadata are rendered unboxed with typographic separators (`·`, `/`).
- **Touch & Accessibility:** Touch targets maintain minimum 40px dimensions on desktop and 44px on mobile devices.
- **Consistent States:** Every data-fetching view provides 4 dedicated UI components:
  1. `LoadingState` / `TableLoadingSkeleton`
  2. `EmptyState`
  3. `ErrorState`
  4. Real data view with `Table` or `Card`

## 5. Attendance Management Architecture (Phase 7)
- **Service Boundaries:**
  - `attendanceService`: Encapsulates eligibility verification, daily/lesson marking, locking, audited corrections, excused absences, and institutional reports.
  - Transactions: All bulk attendance operations use `prisma.$transaction` to guarantee atomicity.
- **Audited Correction Engine:**
  - Status modifications generate immutable `AttendanceCorrection` records linking `previousStatus`, `newStatus`, `correctionReason`, and actor ID, plus an `AuditLog` entry.
- **Attendance Percentage Formula:**
  - `Attendance % = (Present + Late) / Total Recorded Sessions * 100`.
  - Unmarked sessions are never counted as present.
- **Register Sealing & Locking:**
  - Administrative locking protects registers from non-admin alterations after closure, while enabling audited administrative overrides.

