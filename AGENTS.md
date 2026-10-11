# AGENTS.md — Development & Engineering Guidelines

## Project Identity
**Project:** School Management System (SchoolOS)
**Current Stage:** Phase 15 Completed — Comprehensive Testing, QA & Release Readiness
**Next Stage:** Phase 16 — Production Deployment & Release
**Architecture Model:** Clean Monolith with PostgreSQL & Express/Vite Full-Stack Foundation

---

## 1. Operating Rules for AI & Human Engineers

### A. Phase Boundary Discipline
* Strictly complete only the assigned phase.
* Never implement future business modules ahead of schedule.
* Never create fake backend functionality, stub buttons that pretend to work, or fake production records.
* Never weaken TypeScript compiler flags or disable ESLint rules to bypass errors.

### B. Security & Credentials
* NEVER commit `.env` or production secrets.
* Secrets and database connection strings MUST be masked in all logs and API responses using `sanitizeObject()` from `src/lib/logger.ts` and `DatabaseError` in `src/lib/errors.ts`.
* All queries in the repository layer MUST enforce tenant isolation via `TenantContext`.

### C. Zero-Pill & Design Constitution
* Static metadata tags must not be enclosed in rounded pill capsules or heavy colored badges.
* Use quiet, unboxed text separated by subtle typographic characters (`·`, `/`).
* Interactive filters and segmented controls are functional buttons, not candy badges.
* Minimum touch targets: 40px (desktop) / 44px (mobile).
* WCAG AA contrast (4.5:1 text, 3:1 large elements) and visible focus rings (`focus-visible:ring-2`) on all interactive primitives.

---

## 2. Directory Layout & Folder Conventions

```text
/
├── prisma/
│   ├── migrations/           # Reproducible PostgreSQL DDL migrations
│   ├── schema.prisma         # Prisma ORM schema & comprehensive domain models
│   └── seed.ts               # Safe development seed script
├── src/
│   ├── components/
│   │   ├── shell/            # Application shell (Sidebar, Header, Breadcrumbs, etc.)
│   │   ├── ui/               # 20 Reusable accessible UI primitives
│   │   └── ErrorBoundary.tsx # Top-level runtime crash protector
│   ├── features/
│   │   ├── dashboard/        # Dashboard view & Phase 1-2 compliance widgets
│   │   └── system/           # Diagnostic tools, UI Showcase, Error Patterns
│   ├── lib/
│   │   ├── __tests__/        # Vitest unit & integration test suites
│   │   ├── api-response.ts   # Uniform API response constructors
│   │   ├── db.ts             # Prisma client singleton & connection diagnostics
│   │   ├── errors.ts         # Typed application error hierarchy & normalizer
│   │   ├── logger.ts         # Structured logging with credential redaction
│   │   ├── utils.ts          # Class merging (cn) and formatting helpers
│   │   └── validations/      # Zod request & domain validation schemas
│   ├── repositories/         # Server-side data access layer with tenant isolation
│   ├── App.tsx               # Main application container
│   ├── index.css             # Tailwind CSS entrypoint
│   └── main.tsx              # React client root mount
├── docs/                     # Architectural source of truth documentation
├── server.ts                 # Full-stack Express server with Vite middleware
├── package.json              # Scripts and project dependencies
├── tsconfig.json             # Strict TypeScript configuration
└── vitest.config.ts          # Unit test configuration
```

---

## 3. Standard Scripts & Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Runs the development server on `http://0.0.0.0:3000` |
| `npm run build` | Compiles production assets via Vite |
| `npm run typecheck` | Validates TypeScript types across the entire project |
| `npm run lint` | Runs type & syntax linting via `tsc --noEmit` |
| `npm test` | Executes unit tests via Vitest |
| `npm run db:generate` | Generates the typed Prisma Client from `prisma/schema.prisma` |
| `npm run db:seed` | Seeds development data for testing |
| `npm start` | Launches full-stack Express production server |

---

## 4. Phase Roadmap Reference

* **Phase 1 (Complete):** Project Foundation (Prisma schema, UI primitives, App Shell, Logger, Errors, Tests)
* **Phase 2 (Complete):** Database & Core Domain Model (PostgreSQL, Multi-Tenancy, Academic, Student, Staff, Attendance, RBAC)
* **Phase 3 (Complete):** Authentication, Authorization & Role-Based Access Control (Sessions, JWT, Guards, Permissions, Multi-Campus Isolation)
* **Phase 4 (Complete):** Administration & School Configuration (Multi-Campus Infrastructure, Academic Calendar, Cohort Levels, Course Catalog, Faculty Departments, Staff Registry, User Security Governance, Global Parameters)
* **Phase 5 (Complete):** Student Information System (SIS) & Admissions Pipeline
* **Phase 6 (Complete):** Academics & Teaching Management (Curriculum, Courses, Teaching Groups, Timetables, Room Assignments)
* **Phase 7 (Complete):** Attendance Management (Daily Class, Subject Session, Real-time Roster, Medical Excuses, Truancy Alerts)
* **Phase 8 (Complete):** Examinations, Assessments, Grading & Results (Continuous Assessment, Grading Schemes, Exam Sessions, Rank Calculation, Report Cards)
* **Phase 9 (Complete):** Finance, Fees, Invoicing & Payments (Fee Tariffs, Versioned Structures, Student Invoicing, Waivers/Discounts, Multi-method Payments, FIFO Allocations, Receipts, Arrears & Refund Ledgers)
* **Phase 10 (Complete):** Parent & Student Portals / Self-Service (Dedicated Parent/Guardian Portal, Multi-Ward Switcher, Strict StudentGuardian Access Control & IDOR Prevention, Student Portal, Academic Results & Published Report Cards, Attendance Logs, Class Timetables, Fee Invoices & Receipts, Safe Profile Updates, In-App Notifications & Inbox)
* **Phase 11 (Complete):** Communication, Announcements & Notifications (School-wide & Targeted Announcements, Controlled Audience Resolution, Draft/Publish Workflows, Versioned Edits, In-App Notification Center, Email Delivery Abstraction, Notification Templates, Communication Preferences, Mandatory Emergency Alerts, Delivery Logs & Transmission Tracking, Scheduled Broadcast Processing)
* **Phase 12 (Complete):** Library, Transport & Hostel Management (Library Settings & Multi-Branch Architecture, Dewey Decimal/ISBN Book Cataloging & Physical Copy Accession Barcodes, Patron Memberships, Loan Circulation, Returns, Renewals, Holds & Automated Overdue Fine Calculations with Phase 9 Finance Integration; Fleet Vehicle Registry, Driver Licensing, Sequential Route Stop Sequences, Timetables, Student Seat Allocations & Bus Passes; Hostel Buildings, Dormitory Wing & Room Management, Automated Bed Slot Generation, Boarding Scholar Check-in/Check-out, Nightly Roll Call Attendance & Gate Pass Security Governance)
* **Phase 13 (Complete):** Reports, Executive Analytics & Data Export Engines (Institutional KPIs, Demographic Breakdowns, Attendance Analytics, Fee Collection Trends, Resource Utilization, Multi-format Export Pipelines)
* **Phase 14 (Complete):** Security Hardening & Threat Model Audit (Multi-Tenant Isolation Verification, IDOR/BOLA Protection, CSV Injection Neutralization, Path Traversal Sanitization, Rate Limiting, CSRF Defense, Secret Redaction)
* **Phase 15 (Complete):** Comprehensive Testing, Quality Assurance, Regression Testing & Release Readiness (19 test suites, 300 automated tests passing, 8 End-to-End Persona Journeys, Zero TypeScript Errors, Clean Production Build)
* **Phase 16:** Production Deployment & Operations
