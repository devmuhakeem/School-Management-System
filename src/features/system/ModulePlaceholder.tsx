import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Clock, Layers, ArrowLeft, Database, Shield } from "lucide-react";
import { NAVIGATION_ITEMS } from "@/components/shell/Sidebar";

export interface ModulePlaceholderProps {
  moduleId: string;
  onReturnToDashboard: () => void;
  onNavigateToPrimitives: () => void;
}

export function ModulePlaceholder({
  moduleId,
  onReturnToDashboard,
  onNavigateToPrimitives,
}: ModulePlaceholderProps) {
  const item = NAVIGATION_ITEMS.find((i) => i.id === moduleId);
  const title = item?.label || "Module";
  const phase = item?.phase || "Future Phase";

  const moduleRoadmaps: Record<string, { summary: string; models: string[]; prerequisites: string[] }> = {
    students: {
      summary: "Comprehensive student information system (SIS), enrollment records, profile demographics, guardian links, and student identity.",
      models: ["Student", "Enrollment", "Guardian", "StudentDocument", "StudentHealth"],
      prerequisites: ["Organization & Campus Foundation (Phase 1)", "Auth & RBAC (Phase 2)"],
    },
    admissions: {
      summary: "Admissions pipeline, prospective student application review, document verification, entrance exam scores, and acceptance workflow.",
      models: ["AdmissionApplication", "ApplicationStatusHistory", "AdmissionDocument"],
      prerequisites: ["Student Model (Phase 3)", "File Storage Service"],
    },
    academics: {
      summary: "Academic years, terms, grading systems, curriculum management, classes, sections, and subject assignments.",
      models: ["AcademicYear", "AcademicTerm", "GradeLevel", "Section", "Subject", "ClassSubjectTeacher"],
      prerequisites: ["Campus Foundation (Phase 1)", "Staff Roles (Phase 2)"],
    },
    attendance: {
      summary: "Daily student and staff attendance tracking, biometric integration, leave requests, and absence notification hooks.",
      models: ["AttendanceRecord", "LeaveRequest", "BiometricLog"],
      prerequisites: ["Student Model (Phase 3)", "Staff Model (Phase 2)"],
    },
    examinations: {
      summary: "Exam schedules, hall tickets, mark sheets, report cards, GPA calculations, and transcripts generation.",
      models: ["Exam", "ExamSchedule", "ExamResult", "ReportCard"],
      prerequisites: ["Academic Structure (Phase 4)", "Grading Scales"],
    },
    finance: {
      summary: "Tuition fee structures, discount policies, invoices, payment gateways, receipts, balance tracking, and ledger audits.",
      models: ["FeeCategory", "FeeStructure", "Invoice", "Payment", "Scholarship"],
      prerequisites: ["Student SIS (Phase 3)", "Campus Isolation (Phase 1)"],
    },
    communication: {
      summary: "Multi-channel announcement broadcasts, SMS alerts, parent notices, event calendars, and two-way messaging.",
      models: ["Notice", "NotificationLog", "MessageThread", "EventCalendar"],
      prerequisites: ["User Roles (Phase 1)", "Email/SMS Service Config"],
    },
    library: {
      summary: "Book cataloging, ISBN lookup, barcode generation, book issue and return workflows, and late fee tracking.",
      models: ["Book", "BookCopy", "BorrowRecord", "LibraryMember"],
      prerequisites: ["Student & Staff Directory (Phase 2 & 3)"],
    },
    transport: {
      summary: "Bus route planning, vehicle registry, driver allocation, pickup stops, and student transport assignments.",
      models: ["Vehicle", "TransportRoute", "RouteStop", "StudentTransport"],
      prerequisites: ["Campus Location (Phase 1)", "Student Registry (Phase 3)"],
    },
    hostel: {
      summary: "Dormitory rooms, bed allocations, warden assignments, meal subscriptions, and visitor logs.",
      models: ["HostelBuilding", "HostelRoom", "BedAllocation", "HostelFee"],
      prerequisites: ["Campus Structure (Phase 1)", "Student Registry (Phase 3)"],
    },
    hr: {
      summary: "Staff contracts, payroll structures, department assignments, performance evaluations, and teacher qualifications.",
      models: ["StaffProfile", "Department", "Designation", "PayrollSlip"],
      prerequisites: ["User & Roles (Phase 1)", "Audit Logging"],
    },
    reports: {
      summary: "Cross-module business intelligence, attendance trends, financial health, academic performance analytics, and CSV/PDF export.",
      models: ["ReportTemplate", "SavedQuery", "ScheduledExport"],
      prerequisites: ["All Business Modules (Phases 3-7)"],
    },
    administration: {
      summary: "Organization profile, multi-campus setup, campus switcher, audit logs browser, and global system configuration.",
      models: ["Organization", "Campus", "AuditLog", "SystemSetting"],
      prerequisites: ["Prisma Foundation (Phase 1)", "Authentication (Phase 2)"],
    },
    settings: {
      summary: "Institution branding, academic calendar defaults, email/SMS provider credentials, and security policy rules.",
      models: ["OrganizationSettings", "SecurityPolicy"],
      prerequisites: ["Phase 1 Environment Architecture"],
    },
  };

  const info = moduleRoadmaps[moduleId] || {
    summary: "This enterprise module is scheduled in accordance with the development roadmap.",
    models: ["DomainModel", "AuditTrail"],
    prerequisites: ["Phase 1 Technical Foundation"],
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onReturnToDashboard}
          className="gap-1.5 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Button>
        <Badge variant="warning">{phase} Module</Badge>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {title} Module — Scheduled for {phase}
              </CardTitle>
              <CardDescription>
                Phase 1 Technical Foundation is prepared to support this feature set
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-slate-700 leading-relaxed">
            {info.summary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Database className="h-4 w-4 text-indigo-600" />
                <span>Planned Prisma Models</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-600">
                {info.models.map((m) => (
                  <li key={m} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    <code className="font-mono text-[11px] text-slate-800">{m}</code>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Foundation Architecture Hooks</span>
              </div>
              <ul className="space-y-1 text-xs text-slate-600">
                {info.prerequisites.map((p) => (
                  <li key={p} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Per Phase 1 objectives, business modules are kept un-stubbed until their scheduled milestones.
            </p>
            <Button size="sm" onClick={onNavigateToPrimitives}>
              Explore UI Primitives
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
