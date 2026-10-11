# DATABASE.md — Phase 2 Database & Core Domain Model

## 1. Overview & Engine Specification
* **Database Engine:** PostgreSQL (v15+)
* **ORM:** Prisma v6
* **Multi-Tenancy Model:** Shared database with discriminator columns (`organizationId`, `campusId`) enforced on every domain entity.
* **Migration Status:** Migration `20260925000000_phase2_core_domain_model` generated and reproducible in `prisma/migrations/`.

---

## 2. Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    Organization ||--o{ Campus : "has campuses"
    Organization ||--o{ User : "members"
    Organization ||--o{ Role : "defines roles"
    Organization ||--o{ AcademicYear : "academic sessions"
    Organization ||--o{ Department : "departments"
    Organization ||--o{ Student : "enrolled students"
    Organization ||--o{ Guardian : "guardians"
    Organization ||--o{ Staff : "employees"
    Organization ||--o{ AuditLog : "audit records"

    Campus ||--o{ ClassLevel : "curriculum levels"
    Campus ||--o{ Class : "academic classes"
    Campus ||--o{ Subject : "taught subjects"
    Campus ||--o{ Student : "student branch"
    Campus ||--o{ Staff : "staff branch"

    AcademicYear ||--o{ Term : "divided into terms"
    AcademicYear ||--o{ Class : "active session"

    ClassLevel ||--o{ Class : "groups classes"
    Class ||--o{ Section : "subdivided into"
    Class ||--o{ StudentEnrollment : "class cohorts"

    Student ||--o{ StudentEnrollment : "enrollment history"
    Student ||--o{ StudentGuardian : "parent links"
    Student ||--o{ StudentAttendance : "daily register"

    Guardian ||--o{ StudentGuardian : "student links"

    Staff ||--o{ TeachingAssignment : "teaching schedule"
    Staff ||--o{ StaffAttendance : "staff register"

    Role ||--o{ RolePermission : "permission mappings"
    Permission ||--o{ RolePermission : "assigned to"
    User ||--o{ UserRole : "assigned roles"
```

---

## 3. Core Models & Entity Reference

### 1. Multi-Tenant Organization & Campus
| Model | Description | Primary Key | Key Unique Constraints |
|---|---|---|---|
| **Organization** | Root tenant entity representing an educational group or school trust | `id` (UUID) | `slug`, `code` |
| **Campus** | Physical branch location under an Organization | `id` (UUID) | `[organizationId, code]` |
| **OrganizationMembership**| Association linking users to organizations | `id` (UUID) | `[userId, organizationId]` |
| **CampusMembership** | Association linking users to active campuses | `id` (UUID) | `[userId, campusId]` |

### 2. User & RBAC Foundation
| Model | Description | Key Fields / Relations |
|---|---|---|
| **User** | Central identity entity for staff, students, and parents | `email` (unique), `passwordHash`, `status`, `firstName`, `lastName` |
| **Role** | Security roles (e.g. `SUPER_ADMIN`, `CAMPUS_ADMIN`, `TEACHER`, `STUDENT`) | Unique `[organizationId, name]` |
| **Permission** | Granular module/action permissions (e.g. `students.read`, `finance.manage`) | Unique `[module, action]` |
| **RolePermission** | Join table mapping permissions to roles | Composite PK `[roleId, permissionId]` |
| **UserRole** | Assigns roles to users, optionally scoped to a `campusId` | Unique `[userId, roleId, organizationId, campusId]` |

### 3. Academic Structure
| Model | Description | Unique Constraints & Foreign Keys |
|---|---|---|
| **AcademicYear** | Session calendar (e.g. 2025/2026) | Unique `[organizationId, code]`, index `[organizationId, isCurrent]` |
| **Term** | Division within academic year (Term 1, Term 2) | Unique `[academicYearId, termNumber]`, unique `[academicYearId, name]` |
| **ClassLevel** | Grade tiers (e.g. Grade 10, JSS 1) | Unique `[campusId, code]`, ordered by `sequenceOrder` |
| **Class** | Cohort of students for an academic year | Unique `[campusId, academicYearId, code]` |
| **Section** | Physical classroom stream (e.g. Section A) | Unique `[classId, code]` |
| **Subject** | Academic discipline (e.g. Mathematics) | Unique `[campusId, code]` |

### 4. Student & Historical Enrollment
| Model | Description | Unique Constraints & Integrity Rules |
|---|---|---|
| **Student** | Permanent student identity across all academic years | Unique `[organizationId, admissionNumber]`. Deletion restricted when enrollments exist. |
| **StudentEnrollment** | Historical audit of which class, section, and year a student attended | Unique `[studentId, academicYearId, classId]`. Prevents duplicate enrollments while preserving year-on-year promotion history. |

### 5. Guardians & Family Links
| Model | Description | Relationships |
|---|---|---|
| **Guardian** | Parent or legal guardian profile | Many-to-many relationship with students via `StudentGuardian` |
| **StudentGuardian** | Pivot table tracking relationship type, emergency contact, and pickup authorization | Unique `[studentId, guardianId]` |

### 6. Staff & Faculty
| Model | Description | Relationships |
|---|---|---|
| **Department** | Academic or administrative division | Unique `[campusId, code]` |
| **Position** | Job title and role rank | Unique `[campusId, code]` |
| **Staff** | Employee profile linked to central `User` identity | Unique `[organizationId, employeeNumber]`, unique `[organizationId, userId]` |
| **TeachingAssignment** | Links a teacher to a subject, class, section, and academic term | Unique `[academicYearId, staffId, subjectId, classId, sectionId]` |

### 7. Attendance Architecture (Phase 7 Enhanced)
| Model | Description | Unique Constraints & Integrity Rules |
|---|---|---|
| **StudentAttendance** | Daily classroom & subject/lesson attendance record | Compound unique `[studentId, attendanceDate, attendanceType, classId, teachingGroupId]`. Supports arrival time for late records, excused flags, lock status, and auditable user metadata. |
| **AttendanceCorrection** | Immutable audit trail tracking historical status corrections | Links `attendanceId`, `studentId`, `previousStatus`, `newStatus`, `correctionReason`, and `correctedById`. |
| **StaffAttendance** | Staff check-in / check-out daily attendance | Unique `[staffId, attendanceDate]` |

### 8. System & Compliance
| Model | Description | Indexes & Usage |
|---|---|---|
| **Notification** | In-app alerts and delivery state | Indexed `[recipientId, isRead, createdAt]` |
| **FileAttachment** | Storage metadata for S3/GCS uploaded documents | Indexed `[organizationId, entityType, entityId]` |
| **AuditLog** | Immutable security trail with sanitized JSON metadata | Indexed `[organizationId, createdAt]`, `[userId, createdAt]` |

---

## 4. Deletion & Data Retention Strategy
To protect historical academic records and compliance audits:
1. **Cascade Deletes:** Restricted strictly to direct child composition (e.g., deleting an Organization cascades to Campuses; deleting a Class cascades to Sections).
2. **Restricted Deletes:** Foreign keys linking Students to historical Enrollments, Attendances, and Staff use `onDelete: Restrict` or `onDelete: SetNull` to prevent accidental loss of historical records.
3. **Soft-Delete Statuses:** Models feature `status` fields (`StudentStatus.TRANSFERRED`, `StaffStatus.TERMINATED`, `CampusStatus.ARCHIVED`) to archive records rather than purging rows.

---

## 5. Migration & Seed Workflow Commands

```bash
# 1. Generate Prisma Client
npm run db:generate

# 2. Run development seed data
npm run db:seed

# 3. Create a new migration during development
npx prisma migrate dev --name <migration_name>

# 4. Apply migrations in production
npx prisma migrate deploy
```
