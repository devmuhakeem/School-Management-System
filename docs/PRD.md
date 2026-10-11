# Product Requirements Document (PRD)

## 1. Executive Summary
The **School Management System (SchoolOS)** is a multi-campus, multi-tenant enterprise platform engineered to administer all operational, academic, financial, and communication activities of educational institutions.

## 2. Core Personas
* **Super Administrator:** Manages organizations, campuses, global security, and billing.
* **Campus Principal / Administrator:** Oversees academic calendars, faculty allocations, and disciplinary records.
* **Academic Staff / Teachers:** Records attendance, inputs assessment marks, and manages class schedules.
* **Finance Officer:** Configures fee structures, generates tuition invoices, and reconciles receipts.
* **Students & Guardians:** Access attendance records, academic report cards, notices, and payment portals.

## 3. High-Level System Scope
1. **Multi-Tenancy & Multi-Campus Hierarchy:** Isolated data per organization and branch campus.
2. **Student Information Management (SIS):** Lifecycle from enrollment to graduation.
3. **Academic Engine:** Terms, subjects, curricula, timetables, and examinations.
4. **Attendance & Biometrics:** Daily classroom attendance and RFID/biometric device sync.
5. **Fee Management & Finance:** Invoicing, concessions, online payments, and receipts.
6. **Communication Hub:** SMS, email, and notices.
7. **Auxiliary Operations:** Library management, bus routing, and hostel room booking.
8. **HR & Payroll:** Staff profiles, attendance, leaves, and salary slips.

## 4. Phase 1 Objectives & Boundary
* **In Scope:**
  - Strict TypeScript and package configuration.
  - PostgreSQL Prisma database schema with foundational models (Organization, Campus, User, Role, Permission, AuditLog).
  - 20 Accessible UI primitives conforming to design constitution.
  - Application Shell (responsive sidebar, header, navigation roadmap).
  - Centralized error handling, structured logging, and standard API responses.
  - Automated testing foundation (Vitest).
* **Out of Scope for Phase 1:**
  - Real business records and fake data.
  - Active authentication tokens or mock login routes.
  - Student, Academic, and Finance transaction flows.
