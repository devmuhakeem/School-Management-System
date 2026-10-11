/**
 * System Roles & Granular Permissions Configuration
 * Client & Server safe configuration (no node / prisma runtime dependencies)
 */

export interface SystemPermissionDef {
  module: string;
  action: string;
  description: string;
}

export interface SystemRoleDef {
  name: string;
  description: string;
  roleType: string;
  permissions: string[];
}

export const SYSTEM_PERMISSIONS: SystemPermissionDef[] = [
  // Dashboard & General
  { module: "dashboard", action: "view", description: "Access central institution dashboard" },

  // Organizations & Campuses
  { module: "organizations", action: "read", description: "View institution organization settings" },
  { module: "organizations", action: "update", description: "Modify organization profile and settings" },
  { module: "campuses", action: "read", description: "View campus locations and directory" },
  { module: "campuses", action: "create", description: "Establish new school campus branch" },
  { module: "campuses", action: "update", description: "Update campus branch details" },
  { module: "campuses", action: "delete", description: "Archive or delete campus branch" },

  // Users & Security Roles
  { module: "users", action: "read", description: "View user directory" },
  { module: "users", action: "create", description: "Create staff and student user accounts" },
  { module: "users", action: "update", description: "Edit user profile and status" },
  { module: "users", action: "delete", description: "Deactivate or remove user accounts" },
  { module: "users", action: "manage", description: "Full user access administration" },
  { module: "roles", action: "read", description: "View security roles and permission matrix" },
  { module: "roles", action: "create", description: "Create custom security roles" },
  { module: "roles", action: "update", description: "Modify role permissions" },
  { module: "roles", action: "delete", description: "Delete non-system custom roles" },
  { module: "roles", action: "manage", description: "Full role and permission management" },

  // Students & Admissions
  { module: "students", action: "read", description: "View student directory and profiles" },
  { module: "students", action: "create", description: "Register new students" },
  { module: "students", action: "update", description: "Edit student demographics and profiles" },
  { module: "students", action: "delete", description: "Archive or delete student records" },
  { module: "admissions", action: "read", description: "View admission applications" },
  { module: "admissions", action: "create", description: "Submit admission applications" },
  { module: "admissions", action: "update", description: "Modify application details" },
  { module: "admissions", action: "approve", description: "Approve or reject applicant enrollment" },

  // Academics & Scheduling
  { module: "academics", action: "read", description: "View curriculum, classes, and subjects" },
  { module: "academics", action: "manage", description: "Create and assign terms, classes, and subjects" },
  { module: "subjects", action: "assign", description: "Allocate subjects to classes and sections" },
  { module: "teachers", action: "assign", description: "Assign faculty to subjects and form classes" },
  { module: "timetable", action: "manage", description: "Design bell schedules and manage timetable matrix" },
  { module: "curriculum", action: "manage", description: "Define curriculum frameworks and subject combinations" },

  // Attendance
  { module: "attendance", action: "read", description: "View student and staff attendance registers" },
  { module: "attendance", action: "create", description: "Record daily and lesson attendance" },
  { module: "attendance", action: "update", description: "Update existing attendance records" },
  { module: "attendance", action: "manage", description: "Manage institutional attendance workflows and rules" },
  { module: "attendance", action: "correct", description: "Submit controlled historical attendance corrections" },
  { module: "attendance", action: "lock", description: "Lock attendance registers after deadline" },
  { module: "attendance", action: "unlock", description: "Unlock previously locked attendance registers" },
  { module: "attendance", action: "reports", description: "Generate and export institutional attendance reports" },

  // Examinations & Results (Phase 8)
  { module: "exams", action: "read", description: "View exam schedules, sessions, and grade sheets" },
  { module: "exams", action: "create", description: "Create exam sessions, assessments, and schedules" },
  { module: "exams", action: "manage", description: "Manage exam configurations, schedules, and invigilators" },
  { module: "scores", action: "enter", description: "Record and submit student assessment marks" },
  { module: "scores", action: "edit", description: "Edit and correct recorded marks" },
  { module: "results", action: "compute", description: "Calculate subject totals, class positions, and term summaries" },
  { module: "results", action: "approve", description: "Review and approve term examination results" },
  { module: "results", action: "publish", description: "Publish final term results and student report cards" },
  { module: "results", action: "lock", description: "Lock approved results against further editing" },
  { module: "results", action: "unlock", description: "Unlock previously locked academic results" },
  { module: "reportcards", action: "generate", description: "Generate and export official student term report cards" },

  // Finance, Fees, Invoicing & Payments (Phase 9)
  { module: "finance", action: "read", description: "View fee structures, invoices, payments, and financial ledgers" },
  { module: "finance", action: "manage", description: "Configure fee categories, fee schedules, and tariffs" },
  { module: "invoices", action: "create", description: "Generate individual and batch tuition and institutional invoices" },
  { module: "invoices", action: "manage", description: "Void, cancel, or modify draft invoices" },
  { module: "payments", action: "record", description: "Process payments, allocate amounts, and issue official receipts" },
  { module: "fees", action: "manage", description: "Assign fees to students, cohorts, and classes" },
  { module: "discounts", action: "apply", description: "Authorize and apply fee discounts, scholarships, and waivers" },
  { module: "refunds", action: "process", description: "Authorize, audit, and process payment refunds" },
  { module: "finance", action: "reports", description: "View institutional revenue analytics, debtor aging, and audit reports" },

  // Reports & Analytics (Phase 13)
  { module: "reports", action: "read", description: "View analytics dashboards and operational reports" },
  { module: "reports", action: "generate", description: "Export student, academic, and financial reports" },
  { module: "reports", action: "export", description: "Export report datasets in CSV and JSON formats" },
  { module: "reports", action: "manage", description: "Configure reporting thresholds and catalog settings" },
  { module: "academic_reports", action: "read", description: "View academic performance and grade distribution reports" },
  { module: "attendance_reports", action: "read", description: "View attendance summaries and chronic absence reports" },
  { module: "finance_reports", action: "read", description: "View institutional revenue analytics, collections, and debtor aging" },
  { module: "admissions_reports", action: "read", description: "View admissions pipeline and enrollment demographics" },
  { module: "staff_reports", action: "read", description: "View faculty workload and department allocations" },
  { module: "library_reports", action: "read", description: "View library circulation and fine audits" },
  { module: "transport_reports", action: "read", description: "View transport fleet and route utilization" },
  { module: "hostel_reports", action: "read", description: "View boarding occupancy and gate pass reports" },
  { module: "communication_reports", action: "read", description: "View message transmission and delivery analytics" },

  // Settings & System Administration
  { module: "settings", action: "read", description: "View school settings and configurations" },
  { module: "settings", action: "manage", description: "Configure school branding and calendar" },

  // Communication, Announcements & Notifications (Phase 11)
  { module: "communication", action: "read", description: "View communication dashboard, announcements, and noticeboards" },
  { module: "communication.announcements", action: "create", description: "Draft school and targeted announcements" },
  { module: "communication.announcements", action: "publish", description: "Publish and broadcast announcements across channels" },
  { module: "communication.announcements", action: "manage", description: "Edit, schedule, archive, or cancel announcements" },
  { module: "communication.messages", action: "send", description: "Send targeted direct or group communications within scope" },
  { module: "communication.templates", action: "manage", description: "Configure reusable notification and announcement templates" },
  { module: "communication.delivery", action: "view", description: "Inspect delivery tracking logs and transmission statuses" },
  { module: "communication.preferences", action: "manage", description: "Configure delivery channels and communication preferences" },

  // Parent & Student Portals / Self-Service (Phase 10)
  { module: "portal", action: "read", description: "Access self-service portals" },
  { module: "portal.parent", action: "read", description: "Access parent and guardian portal" },
  { module: "portal.parent", action: "profile.update", description: "Update contact details and emergency info" },
  { module: "portal.parent", action: "children.read", description: "View linked children and ward profiles" },
  { module: "portal.parent", action: "attendance.read", description: "View linked student attendance register" },
  { module: "portal.parent", action: "results.read", description: "View published examination and continuous assessment results" },
  { module: "portal.parent", action: "report_cards.read", description: "View and download official published report cards" },
  { module: "portal.parent", action: "timetable.read", description: "View enrolled student timetable schedule" },
  { module: "portal.parent", action: "finance.read", description: "View student fee statements and outstanding balances" },
  { module: "portal.parent", action: "invoices.read", description: "View issued student invoices and fee item breakdowns" },
  { module: "portal.parent", action: "payments.read", description: "View payment history and recorded transactions" },
  { module: "portal.parent", action: "receipts.read", description: "View and print official payment receipts" },
  { module: "portal.parent", action: "notifications.read", description: "Access guardian notification inbox" },

  { module: "portal.student", action: "read", description: "Access student self-service portal" },
  { module: "portal.student", action: "profile.read", description: "View personal student profile" },
  { module: "portal.student", action: "profile.update", description: "Update personal contact details where permitted" },
  { module: "portal.student", action: "attendance.read", description: "View own attendance summary and historical records" },
  { module: "portal.student", action: "results.read", description: "View own published academic results" },
  { module: "portal.student", action: "report_cards.read", description: "View own published term report cards" },
  { module: "portal.student", action: "timetable.read", description: "View personal class and lesson timetable" },
  { module: "portal.student", action: "finance.read", description: "View permitted fee overview and receipts" },
  { module: "portal.student", action: "notifications.read", description: "Access student notification inbox" },

  // Library Management (Phase 12)
  { module: "library", action: "read", description: "View library catalog, branches, and member status" },
  { module: "library.catalog", action: "manage", description: "Add, update, and categorize books and inventory copies" },
  { module: "library.loans", action: "manage", description: "Issue loans, process returns, handle renewals and lost books" },
  { module: "library.members", action: "manage", description: "Register library members and issue library cards" },
  { module: "library.fines", action: "manage", description: "Assess, collect, and waive overdue fines" },
  { module: "library.settings", action: "manage", description: "Configure borrowing rules, periods, and fine rates" },

  // Transport Management (Phase 12)
  { module: "transport", action: "read", description: "View transport routes, stops, vehicles, and allocations" },
  { module: "transport.fleet", action: "manage", description: "Manage vehicles, maintenance logs, and driver records" },
  { module: "transport.routes", action: "manage", description: "Configure routes, stops, schedules, and timing" },
  { module: "transport.allocations", action: "manage", description: "Assign students to transport routes and manage seat allocations" },
  { module: "transport.settings", action: "manage", description: "Configure transport policies and fee schedules" },

  // Hostel / Boarding Management (Phase 12)
  { module: "hostel", action: "read", description: "View hostel buildings, rooms, beds, and resident allocations" },
  { module: "hostel.buildings", action: "manage", description: "Manage hostel buildings, wings, rooms, and bed configurations" },
  { module: "hostel.allocations", action: "manage", description: "Allocate rooms/beds to students and process check-in/out" },
  { module: "hostel.attendance", action: "manage", description: "Take night roll call, curfew checks, and record attendance" },
  { module: "hostel.gatepass", action: "manage", description: "Issue and approve student gate passes and leave permits" },
  { module: "hostel.settings", action: "manage", description: "Configure boarding policies, rules, and room rates" },
];

export const SYSTEM_ROLES_CONFIG: SystemRoleDef[] = [
  {
    name: "Super Administrator",
    description: "Full institutional access across all campuses, settings, and modules",
    roleType: "SUPER_ADMIN",
    permissions: SYSTEM_PERMISSIONS.map((p) => `${p.module}.${p.action}`),
  },
  {
    name: "School Administrator",
    description: "Operational management of campuses, faculty, students, and settings",
    roleType: "CAMPUS_ADMIN",
    permissions: [
      "dashboard.view", "organizations.read", "campuses.read", "campuses.update",
      "users.read", "users.create", "users.update", "roles.read",
      "students.read", "students.create", "students.update",
      "admissions.read", "admissions.create", "admissions.update", "admissions.approve",
      "academics.read", "academics.manage", "subjects.assign", "teachers.assign", "timetable.manage", "curriculum.manage",
      "attendance.read", "attendance.create", "attendance.update", "attendance.manage", "attendance.correct", "attendance.lock", "attendance.unlock", "attendance.reports",
      "exams.read", "exams.create", "exams.manage", "scores.enter", "scores.edit", "results.compute", "results.approve", "results.publish", "results.lock", "results.unlock", "reportcards.generate",
      "finance.read", "finance.manage", "invoices.create", "invoices.manage", "payments.record", "fees.manage", "discounts.apply", "refunds.process", "finance.reports",
      "communication.read", "communication.announcements.create", "communication.announcements.publish", "communication.announcements.manage", "communication.messages.send", "communication.templates.manage", "communication.delivery.view", "communication.preferences.manage",
      "library.read", "library.catalog.manage", "library.loans.manage", "library.members.manage", "library.fines.manage", "library.settings.manage",
      "transport.read", "transport.fleet.manage", "transport.routes.manage", "transport.allocations.manage", "transport.settings.manage",
      "hostel.read", "hostel.buildings.manage", "hostel.allocations.manage", "hostel.attendance.manage", "hostel.gatepass.manage", "hostel.settings.manage",
      "portal.read", "portal.parent.read", "portal.student.read",
      "reports.read", "reports.generate", "settings.read", "settings.manage",
    ],
  },
  {
    name: "Principal",
    description: "Academic leadership, staff performance, student welfare, and exam publication",
    roleType: "PRINCIPAL",
    permissions: [
      "dashboard.view", "campuses.read", "users.read",
      "students.read", "students.create", "students.update",
      "admissions.read", "admissions.approve",
      "academics.read", "academics.manage",
      "attendance.read", "attendance.create", "attendance.update", "attendance.manage", "attendance.correct", "attendance.lock", "attendance.unlock", "attendance.reports",
      "exams.read", "exams.create", "exams.manage", "scores.enter", "scores.edit", "results.compute", "results.approve", "results.publish", "results.lock", "reportcards.generate",
      "communication.read", "communication.announcements.create", "communication.announcements.publish", "communication.announcements.manage", "communication.messages.send", "communication.templates.manage", "communication.delivery.view",
      "library.read", "library.catalog.manage", "library.loans.manage", "library.fines.manage",
      "transport.read", "transport.fleet.manage", "transport.routes.manage", "transport.allocations.manage",
      "hostel.read", "hostel.buildings.manage", "hostel.allocations.manage", "hostel.attendance.manage", "hostel.gatepass.manage",
      "reports.read", "reports.generate", "reports.export", "academic_reports.read", "attendance_reports.read", "finance_reports.read", "admissions_reports.read", "staff_reports.read", "library_reports.read", "transport_reports.read", "hostel_reports.read", "communication_reports.read", "settings.read",
    ],
  },
  {
    name: "Vice Principal",
    description: "Assists Principal in academic administration and student discipline",
    roleType: "CAMPUS_ADMIN",
    permissions: [
      "dashboard.view", "campuses.read", "students.read", "students.update",
      "admissions.read", "academics.read", "academics.manage",
      "attendance.read", "attendance.create", "attendance.update", "attendance.manage", "attendance.correct", "attendance.reports",
      "exams.read", "exams.manage", "scores.enter", "scores.edit", "results.compute", "results.approve", "reportcards.generate",
      "communication.read", "communication.announcements.create", "communication.announcements.publish", "communication.messages.send",
      "library.read", "transport.read", "hostel.read",
      "reports.read", "reports.export", "academic_reports.read", "attendance_reports.read", "admissions_reports.read", "staff_reports.read",
    ],
  },
  {
    name: "Academic Teacher",
    description: "Access to classroom attendance, assignments, and exam grading",
    roleType: "TEACHER",
    permissions: [
      "dashboard.view", "students.read", "academics.read",
      "attendance.read", "attendance.create", "attendance.update",
      "exams.read", "scores.enter", "scores.edit", "reportcards.generate", "reports.read", "academic_reports.read", "attendance_reports.read",
      "communication.read", "communication.messages.send",
      "library.read", "transport.read", "hostel.read",
    ],
  },
  {
    name: "Form / Class Teacher",
    description: "Primary classroom supervisor managing attendance and report cards",
    roleType: "TEACHER",
    permissions: [
      "dashboard.view", "students.read", "students.update",
      "academics.read", "attendance.read", "attendance.create", "attendance.update",
      "exams.read", "scores.enter", "scores.edit", "results.compute", "reportcards.generate", "reports.read", "academic_reports.read", "attendance_reports.read",
      "communication.read", "communication.announcements.create", "communication.messages.send",
      "library.read", "transport.read", "hostel.read",
    ],
  },
  {
    name: "Accountant",
    description: "Fee structure management, invoice generation, and payment collection",
    roleType: "ACCOUNTANT",
    permissions: [
      "dashboard.view", "students.read",
      "finance.read", "finance.manage", "invoices.create", "invoices.manage",
      "payments.record", "fees.manage", "discounts.apply", "refunds.process", "finance.reports",
      "communication.read", "communication.messages.send",
      "library.read", "library.fines.manage", "transport.read", "hostel.read",
      "reports.read", "reports.generate", "reports.export", "finance_reports.read",
    ],
  },
  {
    name: "Librarian",
    description: "Library catalog, book circulation, and member registry",
    roleType: "LIBRARIAN",
    permissions: [
      "dashboard.view", "students.read",
      "library.read", "library.catalog.manage", "library.loans.manage", "library.members.manage", "library.fines.manage", "library.settings.manage",
      "communication.read", "reports.read", "reports.export", "library_reports.read",
    ],
  },
  {
    name: "HR Officer",
    description: "Staff records, recruitment, attendance, and leave management",
    roleType: "STAFF",
    permissions: ["dashboard.view", "users.read", "attendance.read", "communication.read", "reports.read", "staff_reports.read"],
  },
  {
    name: "Transport Officer",
    description: "Bus fleet management, route planning, and transport pickup allocations",
    roleType: "STAFF",
    permissions: [
      "dashboard.view", "students.read",
      "transport.read", "transport.fleet.manage", "transport.routes.manage", "transport.allocations.manage", "transport.settings.manage",
      "communication.read", "reports.read", "reports.export", "transport_reports.read",
    ],
  },
  {
    name: "Hostel Officer",
    description: "Dormitory allocations, room maintenance, and boarding student welfare",
    roleType: "STAFF",
    permissions: [
      "dashboard.view", "students.read", "attendance.read",
      "hostel.read", "hostel.buildings.manage", "hostel.allocations.manage", "hostel.attendance.manage", "hostel.gatepass.manage", "hostel.settings.manage",
      "communication.read", "reports.read", "reports.export", "hostel_reports.read",
    ],
  },
  {
    name: "Receptionist",
    description: "Front desk inquiries, visitor logs, and admissions information",
    roleType: "STAFF",
    permissions: ["dashboard.view", "students.read", "admissions.read", "admissions.create", "communication.read", "library.read"],
  },
  {
    name: "Parent",
    description: "Guardian portal for viewing linked student attendance, report cards, timetable, and invoices",
    roleType: "PARENT",
    permissions: [
      "dashboard.view", "students.read", "attendance.read", "reports.read", "finance.read",
      "portal.read", "portal.parent.read", "portal.parent.profile.update",
      "portal.parent.children.read", "portal.parent.attendance.read",
      "portal.parent.results.read", "portal.parent.report_cards.read",
      "portal.parent.timetable.read", "portal.parent.finance.read",
      "portal.parent.invoices.read", "portal.parent.payments.read",
      "portal.parent.receipts.read", "portal.parent.notifications.read",
      "communication.read", "library.read", "transport.read", "hostel.read",
    ],
  },
  {
    name: "Student",
    description: "Student portal for viewing personal timetable, attendance, exam grades, and report cards",
    roleType: "STUDENT",
    permissions: [
      "dashboard.view", "academics.read", "attendance.read", "exams.read",
      "portal.read", "portal.student.read", "portal.student.profile.read",
      "portal.student.profile.update", "portal.student.attendance.read",
      "portal.student.results.read", "portal.student.report_cards.read",
      "portal.student.timetable.read", "portal.student.finance.read",
      "portal.student.notifications.read",
      "communication.read", "library.read", "transport.read", "hostel.read",
    ],
  },
];
