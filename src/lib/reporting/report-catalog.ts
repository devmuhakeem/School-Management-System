export type ReportCategory =
  | "MANAGEMENT"
  | "ACADEMICS"
  | "ATTENDANCE"
  | "FINANCE"
  | "STUDENTS"
  | "STAFF"
  | "OPERATIONS";

export interface ReportCatalogItem {
  key: string;
  name: string;
  description: string;
  category: ReportCategory;
  requiredPermission: string;
  supportedFilters: string[];
  exportable: boolean;
}

export const REPORT_CATALOG: ReportCatalogItem[] = [
  {
    key: "executive_overview",
    name: "Executive Operational Overview",
    description: "Multi-dimensional institutional summary combining academics, attendance, finances, SIS, and campus operations.",
    category: "MANAGEMENT",
    requiredPermission: "reports.read",
    supportedFilters: ["campusId", "academicYearId", "termId", "startDate", "endDate"],
    exportable: true,
  },
  {
    key: "student_enrollment",
    name: "Student Enrollment by Class & Section",
    description: "Detailed enrollment counts across class levels, active cohort divisions, and student statuses.",
    category: "STUDENTS",
    requiredPermission: "admissions_reports.read",
    supportedFilters: ["campusId", "academicYearId", "classId", "status", "gender"],
    exportable: true,
  },
  {
    key: "admissions_pipeline",
    name: "Admissions Pipeline & Conversion",
    description: "Application stages from draft submission to review, interview, approval, and final enrollment.",
    category: "STUDENTS",
    requiredPermission: "admissions_reports.read",
    supportedFilters: ["campusId", "academicYearId", "startDate", "endDate", "status"],
    exportable: true,
  },
  {
    key: "student_demographics",
    name: "Aggregate Demographic Summary",
    description: "Gender distribution, nationality groups, and class level demographics without exposing personal contact details.",
    category: "STUDENTS",
    requiredPermission: "admissions_reports.read",
    supportedFilters: ["campusId", "classId"],
    exportable: true,
  },
  {
    key: "academic_performance",
    name: "Academic Performance Summary",
    description: "Consolidated assessment completion rates, cohort score averages, and published results status.",
    category: "ACADEMICS",
    requiredPermission: "academic_reports.read",
    supportedFilters: ["campusId", "academicYearId", "termId", "classId"],
    exportable: true,
  },
  {
    key: "grade_distribution",
    name: "Grade Distribution Analysis",
    description: "Frequency distribution of letter grades and marks resolved against the active institutional grading scale.",
    category: "ACADEMICS",
    requiredPermission: "academic_reports.read",
    supportedFilters: ["campusId", "academicYearId", "termId", "classId", "subjectId"],
    exportable: true,
  },
  {
    key: "subject_performance",
    name: "Subject-Level Performance Matrix",
    description: "Mean scores, score ranges, pass/fail counts, and assessment progress across all curriculum subjects.",
    category: "ACADEMICS",
    requiredPermission: "academic_reports.read",
    supportedFilters: ["campusId", "academicYearId", "termId", "classId", "subjectId"],
    exportable: true,
  },
  {
    key: "class_performance",
    name: "Class Academic Summary & Completion",
    description: "Class-by-class academic ranking, term mark averages, and result lock statuses.",
    category: "ACADEMICS",
    requiredPermission: "academic_reports.read",
    supportedFilters: ["campusId", "academicYearId", "termId", "classId"],
    exportable: true,
  },
  {
    key: "attendance_summary",
    name: "Attendance Registers Summary",
    description: "Aggregated attendance presence, absence, tardiness, and excused rates across school sessions.",
    category: "ATTENDANCE",
    requiredPermission: "attendance_reports.read",
    supportedFilters: ["campusId", "academicYearId", "classId", "sectionId", "startDate", "endDate"],
    exportable: true,
  },
  {
    key: "attendance_trends",
    name: "Chronological Attendance Trends",
    description: "Daily and weekly attendance presence percentages tracked over time to identify seasonal variations.",
    category: "ATTENDANCE",
    requiredPermission: "attendance_reports.read",
    supportedFilters: ["campusId", "classId", "startDate", "endDate"],
    exportable: true,
  },
  {
    key: "chronic_absence",
    name: "Chronic Absence Operational Alert",
    description: "Students falling below the configurable attendance threshold (default < 85%) for pastoral intervention.",
    category: "ATTENDANCE",
    requiredPermission: "attendance_reports.read",
    supportedFilters: ["campusId", "classId", "chronicThreshold"],
    exportable: true,
  },
  {
    key: "finance_collections",
    name: "Revenue Collections & Cash Flow",
    description: "Invoiced totals, actual fee receipts, outstanding balances, and daily payment receipts.",
    category: "FINANCE",
    requiredPermission: "finance_reports.read",
    supportedFilters: ["campusId", "academicYearId", "termId", "startDate", "endDate"],
    exportable: true,
  },
  {
    key: "finance_aging",
    name: "Fee Debtor Aging Analysis",
    description: "Outstanding balances categorized into aging intervals: Current (0-30d), 31-60d, 61-90d, and 90+ days.",
    category: "FINANCE",
    requiredPermission: "finance_reports.read",
    supportedFilters: ["campusId", "classId"],
    exportable: true,
  },
  {
    key: "fee_categories",
    name: "Collections by Fee Tariff Category",
    description: "Financial breakdown by category (Tuition, Development, Examination, Transport, Boarding).",
    category: "FINANCE",
    requiredPermission: "finance_reports.read",
    supportedFilters: ["campusId"],
    exportable: true,
  },
  {
    key: "payment_methods",
    name: "Collections by Payment Method",
    description: "Distribution of receipts across Cash, Bank Transfer, Card/POS, and Online payment methods.",
    category: "FINANCE",
    requiredPermission: "finance_reports.read",
    supportedFilters: ["campusId", "startDate", "endDate"],
    exportable: true,
  },
  {
    key: "staff_workload",
    name: "Faculty Workload & Assignments",
    description: "Teaching staff allocations across departments, subject assignments, and form class supervision.",
    category: "STAFF",
    requiredPermission: "staff_reports.read",
    supportedFilters: ["campusId"],
    exportable: true,
  },
  {
    key: "library_circulation",
    name: "Library Circulation & Patron Audits",
    description: "Book checkout volume, active patron loans, overdue borrowing infractions, and fine settlement totals.",
    category: "OPERATIONS",
    requiredPermission: "library_reports.read",
    supportedFilters: ["campusId"],
    exportable: true,
  },
  {
    key: "transport_operations",
    name: "Transport Fleet & Route Utilization",
    description: "Vehicle seating capacity utilization, active passenger rosters, and sequential stop timetables.",
    category: "OPERATIONS",
    requiredPermission: "transport_reports.read",
    supportedFilters: ["campusId"],
    exportable: true,
  },
  {
    key: "hostel_occupancy",
    name: "Hostel Occupancy & Boarding Rolls",
    description: "Dormitory bed utilization, residential gender distribution, night roll call rates, and active gate passes.",
    category: "OPERATIONS",
    requiredPermission: "hostel_reports.read",
    supportedFilters: ["campusId"],
    exportable: true,
  },
  {
    key: "communication_delivery",
    name: "Communication Broadcasts & Delivery",
    description: "Announcement distribution logs, transmission delivery rates across email/in-app, and failure tracking.",
    category: "OPERATIONS",
    requiredPermission: "communication_reports.read",
    supportedFilters: ["startDate", "endDate"],
    exportable: true,
  },
];
