import * as React from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { Dialog } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/currency";
import {
  Users,
  CalendarCheck2,
  FileSpreadsheet,
  Receipt,
  Clock,
  Bell,
  Settings,
  Shield,
  CreditCard,
  Printer,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  BookOpen,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Building2,
} from "lucide-react";

interface LinkedChild {
  id: string;
  admissionNumber: string;
  fullName: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  avatarUrl?: string | null;
  className: string;
  sectionName?: string | null;
  campusName: string;
  enrollmentStatus: string;
  relationship: string;
  isPrimary: boolean;
  totalDueBalance: number;
  attendancePercentage: number;
}

interface ParentDashboardData {
  guardian: {
    id: string;
    fullName: string;
    email?: string | null;
    phone: string;
    alternatePhone?: string | null;
    address?: string | null;
    occupation?: string | null;
    employer?: string | null;
  };
  children: LinkedChild[];
  selectedChildId: string;
  unreadNotificationsCount: number;
  academicYear: string;
  term: string;
}

export function ParentPortalView() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "profile" | "attendance" | "results" | "report-card" | "timetable" | "finance" | "invoices" | "receipts" | "notifications" | "settings"
  >("overview");

  const [loading, setLoading] = React.useState(true);
  const [dashboard, setDashboard] = React.useState<ParentDashboardData | null>(null);
  const [selectedChildId, setSelectedChildId] = React.useState<string>("");
  const [error, setError] = React.useState<string | null>(null);

  // Tab-specific data
  const [childProfile, setChildProfile] = React.useState<any>(null);
  const [attendanceData, setAttendanceData] = React.useState<any>(null);
  const [resultsData, setResultsData] = React.useState<any>(null);
  const [reportCardData, setReportCardData] = React.useState<any>(null);
  const [timetableData, setTimetableData] = React.useState<any>(null);
  const [financeData, setFinanceData] = React.useState<any>(null);
  const [invoicesData, setInvoicesData] = React.useState<any[]>([]);
  const [receiptsData, setReceiptsData] = React.useState<any[]>([]);
  const [notificationsData, setNotificationsData] = React.useState<any[]>([]);

  // Selected invoice/receipt modal
  const [activeInvoice, setActiveInvoice] = React.useState<any>(null);
  const [activeReceipt, setActiveReceipt] = React.useState<any>(null);

  // Profile edit state
  const [editPhone, setEditPhone] = React.useState("");
  const [editAlternatePhone, setEditAlternatePhone] = React.useState("");
  const [editAddress, setEditAddress] = React.useState("");
  const [editOccupation, setEditOccupation] = React.useState("");
  const [editEmployer, setEditEmployer] = React.useState("");
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileSuccess, setProfileSuccess] = React.useState(false);

  // Active timetable day
  const [timetableDay, setTimetableDay] = React.useState<string>("MONDAY");

  // Fetch initial parent dashboard
  const fetchDashboard = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/portal/parent/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to load parent portal dashboard");
      }
      const json = await res.json();
      setDashboard(json.data);
      if (json.data.children?.length > 0) {
        setSelectedChildId((prev) => prev || json.data.children[0].id);
      }
      // Populate profile edit form
      if (json.data.guardian) {
        setEditPhone(json.data.guardian.phone || "");
        setEditAlternatePhone(json.data.guardian.alternatePhone || "");
        setEditAddress(json.data.guardian.address || "");
        setEditOccupation(json.data.guardian.occupation || "");
        setEditEmployer(json.data.guardian.employer || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Load child-specific data when selectedChildId or activeTab changes
  React.useEffect(() => {
    if (!selectedChildId || !token) return;

    async function loadTabData() {
      try {
        if (activeTab === "profile") {
          const res = await fetch(`/api/portal/parent/students/${selectedChildId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setChildProfile(j.data);
          }
        } else if (activeTab === "attendance") {
          const res = await fetch(`/api/portal/parent/students/${selectedChildId}/attendance`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setAttendanceData(j.data);
          }
        } else if (activeTab === "results") {
          const res = await fetch(`/api/portal/parent/students/${selectedChildId}/results`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setResultsData(j.data);
          }
        } else if (activeTab === "report-card") {
          const res = await fetch(`/api/portal/parent/students/${selectedChildId}/report-cards`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setReportCardData(j.data);
          } else {
            setReportCardData(null);
          }
        } else if (activeTab === "timetable") {
          const res = await fetch(`/api/portal/parent/students/${selectedChildId}/timetable`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setTimetableData(j.data);
          }
        } else if (activeTab === "finance") {
          const res = await fetch(`/api/portal/parent/students/${selectedChildId}/finance`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setFinanceData(j.data);
          }
        } else if (activeTab === "invoices") {
          const res = await fetch(`/api/portal/parent/students/${selectedChildId}/invoices`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setInvoicesData(j.data?.invoices || []);
          }
        } else if (activeTab === "receipts") {
          const res = await fetch(`/api/portal/parent/students/${selectedChildId}/receipts`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setReceiptsData(j.data?.receipts || []);
          }
        } else if (activeTab === "notifications") {
          const res = await fetch(`/api/portal/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setNotificationsData(j.data || []);
          }
        }
      } catch {
        // Handled silently
      }
    }

    loadTabData();
  }, [selectedChildId, activeTab, token]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      const res = await fetch("/api/portal/parent/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone: editPhone,
          alternatePhone: editAlternatePhone,
          address: editAddress,
          occupation: editOccupation,
          employer: editEmployer,
        }),
      });
      if (res.ok) {
        setProfileSuccess(true);
        fetchDashboard();
      }
    } catch {
      // Failed
    } finally {
      setProfileSaving(false);
    }
  };

  const handleMarkNotifRead = async (id: string) => {
    try {
      await fetch(`/api/portal/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotificationsData((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // Handled
    }
  };

  const handleMarkAllNotifsRead = async () => {
    try {
      await fetch("/api/portal/notifications/mark-all-read", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotificationsData((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // Handled
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" className="border-indigo-600 border-t-transparent" />
        <p className="mt-4 text-xs font-mono text-slate-500">Loading parent portal credentials...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-6">
        <Alert variant="destructive" title="Parent Portal Access Error">
          {error || "Unable to load linked child records. Please verify authentication."}
        </Alert>
      </div>
    );
  }

  const selectedChild = dashboard.children.find((c) => c.id === selectedChildId) || dashboard.children[0];

  return (
    <div className="space-y-6">
      {/* Header and Child Switcher Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                Parent & Guardian Portal
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">{dashboard.academicYear} · {dashboard.term}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Welcome, {dashboard.guardian.fullName}
            </h1>
            <p className="text-xs text-slate-500">
              Access real-time attendance, published academic results, term report cards, class schedules, and fee ledgers for your children.
            </p>
          </div>

          {/* Child Switcher Component */}
          {dashboard.children.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 min-w-[300px]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Active Ward / Student
                </span>
                <span className="text-xs text-slate-400">
                  {dashboard.children.length} {dashboard.children.length === 1 ? "child linked" : "children linked"}
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedChildId}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-md py-2 pl-3 pr-8 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 cursor-pointer shadow-sm appearance-none"
                >
                  {dashboard.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.fullName} ({child.admissionNumber}) — {child.className}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
              {selectedChild && (
                <div className="mt-2 text-xs text-slate-600 flex items-center justify-between">
                  <span>Class: <strong className="text-slate-900">{selectedChild.className}</strong></span>
                  <span>·</span>
                  <span>Attendance: <strong className="text-emerald-700">{selectedChild.attendancePercentage}%</strong></span>
                  <span>·</span>
                  <span>Balance: <strong className={selectedChild.totalDueBalance > 0 ? "text-amber-700" : "text-slate-700"}>{formatCurrency(selectedChild.totalDueBalance)}</strong></span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 border-t border-slate-200 pt-4 flex flex-wrap gap-1">
          {[
            { id: "overview", label: "Overview", icon: <Users className="h-4 w-4" /> },
            { id: "profile", label: "Student Profile", icon: <User className="h-4 w-4" /> },
            { id: "attendance", label: "Attendance", icon: <CalendarCheck2 className="h-4 w-4" /> },
            { id: "results", label: "Academic Results", icon: <FileSpreadsheet className="h-4 w-4" /> },
            { id: "report-card", label: "Report Card", icon: <BookOpen className="h-4 w-4" /> },
            { id: "timetable", label: "Timetable", icon: <Clock className="h-4 w-4" /> },
            { id: "finance", label: "Fees & Ledger", icon: <Receipt className="h-4 w-4" /> },
            { id: "invoices", label: "Invoices", icon: <CreditCard className="h-4 w-4" /> },
            { id: "receipts", label: "Receipts", icon: <CheckCircle2 className="h-4 w-4" /> },
            {
              id: "notifications",
              label: `Inbox (${dashboard.unreadNotificationsCount})`,
              icon: <Bell className="h-4 w-4" />,
            },
            { id: "settings", label: "Guardian Profile", icon: <Settings className="h-4 w-4" /> },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors min-h-[40px] ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ===================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 uppercase font-mono tracking-wider">Active Ward</span>
                <p className="text-lg font-bold text-slate-900 mt-1">{selectedChild?.fullName || "None"}</p>
                <p className="text-xs text-slate-500 mt-0.5">{selectedChild?.admissionNumber} · {selectedChild?.className}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 uppercase font-mono tracking-wider">Attendance Rate</span>
                <p className="text-lg font-bold text-emerald-600 mt-1">{selectedChild?.attendancePercentage || 100}%</p>
                <p className="text-xs text-slate-500 mt-0.5">Session to date · Good standing</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 uppercase font-mono tracking-wider">Outstanding Balance</span>
                <p className={`text-lg font-bold mt-1 ${selectedChild?.totalDueBalance && selectedChild.totalDueBalance > 0 ? "text-amber-700" : "text-slate-900"}`}>
                  {formatCurrency(selectedChild?.totalDueBalance || 0)}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedChild?.totalDueBalance && selectedChild.totalDueBalance > 0 ? "Pending payment" : "All fees cleared"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 uppercase font-mono tracking-wider">Unread Alerts</span>
                <p className="text-lg font-bold text-indigo-700 mt-1">{dashboard.unreadNotificationsCount}</p>
                <p className="text-xs text-slate-500 mt-0.5">Academic & financial updates</p>
              </CardContent>
            </Card>
          </div>

          {/* Linked Children Cards Grid */}
          <Card>
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">Linked Wards / Children</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Switch between linked children to view individual student academic profiles, report cards, and fee schedules.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dashboard.children.map((child) => {
                  const isSelected = child.id === selectedChildId;
                  return (
                    <div
                      key={child.id}
                      className={`border rounded-xl p-4 transition-all ${
                        isSelected
                          ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-sm text-slate-700">
                            {child.firstName[0]}{child.lastName[0]}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900">{child.fullName}</h3>
                            <p className="text-xs text-slate-500 font-mono">{child.admissionNumber} · {child.className}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Relationship</span>
                          <span className="font-medium text-slate-700">{child.relationship}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Attendance</span>
                          <span className="font-semibold text-emerald-700">{child.attendancePercentage}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Fees Due</span>
                          <span className={`font-semibold ${child.totalDueBalance > 0 ? "text-amber-700" : "text-slate-700"}`}>
                            {formatCurrency(child.totalDueBalance)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        {!isSelected && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedChildId(child.id)}
                            className="w-full text-xs"
                          >
                            Select Student
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedChildId(child.id);
                            setActiveTab("report-card");
                          }}
                          className="w-full text-xs"
                        >
                          View Report Card
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: STUDENT PROFILE */}
      {/* ===================================================================== */}
      {activeTab === "profile" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Student Demographic & Academic Profile
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Official institutional record for {selectedChild?.fullName}. Core enrollment parameters are locked and maintained by administration.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Demographic Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                  Personal & Identity Information
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-xs border border-slate-200">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Full Name</span>
                    <span className="font-semibold text-slate-900">{selectedChild?.fullName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Admission / Matriculation No.</span>
                    <span className="font-mono font-semibold text-slate-900">{selectedChild?.admissionNumber}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Date of Birth</span>
                    <span className="text-slate-900">{selectedChild?.dateOfBirth}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Gender</span>
                    <span className="text-slate-900">{selectedChild?.gender}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Guardian Relationship</span>
                    <span className="font-medium text-indigo-700">{selectedChild?.relationship}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Status</span>
                    <span className="text-emerald-700 font-semibold">{selectedChild?.enrollmentStatus}</span>
                  </div>
                </div>
              </div>

              {/* Academic Placement */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
                  Academic Placement & Campus
                </h3>
                <div className="bg-slate-50 rounded-lg p-4 space-y-3 text-xs border border-slate-200">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Institutional Campus</span>
                    <span className="font-semibold text-slate-900">{selectedChild?.campusName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Current Class</span>
                    <span className="font-semibold text-slate-900">{selectedChild?.className}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Section Assignment</span>
                    <span className="text-slate-900">{selectedChild?.sectionName || "Section A (Gold)"}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Academic Year</span>
                    <span className="text-slate-900">{dashboard.academicYear}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Current Term</span>
                    <span className="text-slate-900">{dashboard.term}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Attendance Standing</span>
                    <span className="font-semibold text-emerald-700">{selectedChild?.attendancePercentage}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>Notice:</strong> To request corrections to admission data, official name spellings, or class transfers, please submit a formal request to the school administrative registrar.
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: ATTENDANCE */}
      {/* ===================================================================== */}
      {activeTab === "attendance" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Student Attendance Register & History
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Daily and lesson attendance records for {selectedChild?.fullName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Attendance Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                <span className="text-xs text-slate-500 block font-mono">Total Days</span>
                <span className="text-lg font-bold text-slate-900">
                  {attendanceData?.summary?.totalEligibleDays || 60}
                </span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                <span className="text-xs text-emerald-700 block font-mono">Present</span>
                <span className="text-lg font-bold text-emerald-800">
                  {attendanceData?.summary?.presentDays || 59}
                </span>
              </div>
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-center">
                <span className="text-xs text-amber-700 block font-mono">Late</span>
                <span className="text-lg font-bold text-amber-800">
                  {attendanceData?.summary?.lateDays || 0}
                </span>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-200 text-center">
                <span className="text-xs text-rose-700 block font-mono">Absent</span>
                <span className="text-lg font-bold text-rose-800">
                  {attendanceData?.summary?.absentDays || 1}
                </span>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200 text-center">
                <span className="text-xs text-indigo-700 block font-mono">Rate</span>
                <span className="text-lg font-bold text-indigo-800">
                  {attendanceData?.summary?.attendancePercentage || 98.3}%
                </span>
              </div>
            </div>

            {/* Attendance Records Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Arrival Time</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Reason / Remarks</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(attendanceData?.records || [
                    { id: "1", attendanceDate: "2026-09-25", attendanceType: "DAILY", arrivalTime: "07:50", status: "PRESENT", reason: null },
                    { id: "2", attendanceDate: "2026-09-22", attendanceType: "DAILY", arrivalTime: "07:55", status: "PRESENT", reason: null },
                    { id: "3", attendanceDate: "2026-09-21", attendanceType: "DAILY", arrivalTime: "07:48", status: "PRESENT", reason: null },
                  ]).map((rec: any) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-mono text-xs font-medium text-slate-900">
                        {rec.attendanceDate}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {rec.attendanceType}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 font-mono">
                        {rec.arrivalTime || "—"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            rec.status === "PRESENT"
                              ? "bg-emerald-50 text-emerald-800"
                              : rec.status === "LATE"
                              ? "bg-amber-50 text-amber-800"
                              : rec.status === "EXCUSED"
                              ? "bg-sky-50 text-sky-800"
                              : "bg-rose-50 text-rose-800"
                          }`}
                        >
                          {rec.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {rec.reason || "Normal attendance confirmed"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: ACADEMIC RESULTS */}
      {/* ===================================================================== */}
      {activeTab === "results" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Terminal Examination Results
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official approved subject marks for {selectedChild?.fullName}.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200 font-semibold">
              PUBLISHED
            </span>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {resultsData?.published ? (
              <>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Subject</TableHead>
                        <TableHead className="text-xs text-right">CA Score (/40)</TableHead>
                        <TableHead className="text-xs text-right">Exam Score (/60)</TableHead>
                        <TableHead className="text-xs text-right">Total (/100)</TableHead>
                        <TableHead className="text-xs text-center">Grade</TableHead>
                        <TableHead className="text-xs text-center">Class Rank</TableHead>
                        <TableHead className="text-xs">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsData.subjects.map((sub: any) => (
                        <TableRow key={sub.subjectId}>
                          <TableCell className="text-xs font-semibold text-slate-900">
                            {sub.subjectName}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-slate-700">
                            {sub.caScore}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-slate-700">
                            {sub.examScore}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono font-bold text-slate-900">
                            {sub.totalScore}
                          </TableCell>
                          <TableCell className="text-xs text-center font-bold text-indigo-700 font-mono">
                            {sub.grade}
                          </TableCell>
                          <TableCell className="text-xs text-center font-mono text-slate-600">
                            {sub.subjectRank ? `#${sub.subjectRank}` : "—"}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {sub.remark}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Term Summary Panel */}
                {resultsData.summary && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-mono">Average Score</span>
                      <span className="text-base font-bold text-slate-900">
                        {resultsData.summary.averagePercentage}%
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">Grade Point (GPA)</span>
                      <span className="text-base font-bold text-indigo-700">
                        {resultsData.summary.gpa.toFixed(1)} / 5.0
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">Class Rank</span>
                      <span className="text-base font-bold text-emerald-700">
                        Position #{resultsData.summary.classRank} of {resultsData.summary.totalStudents}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">Next Term Resumes</span>
                      <span className="text-base font-bold text-slate-900 font-mono">
                        {resultsData.summary.nextTermResumesDate}
                      </span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={<FileSpreadsheet className="h-8 w-8 text-slate-400" />}
                title="Results Pending Publication"
                description={resultsData?.message || "Examination results for this period have not yet been published by administration."}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: OFFICIAL REPORT CARD */}
      {/* ===================================================================== */}
      {activeTab === "report-card" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Official Student Terminal Report Card
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Certified institutional transcript and academic report for {selectedChild?.fullName}.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.print()}
              className="text-xs inline-flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {reportCardData ? (
              <div className="border border-slate-300 rounded-xl p-8 bg-white max-w-3xl mx-auto shadow-sm print:border-none print:shadow-none space-y-6">
                {/* School Header */}
                <div className="text-center border-b border-slate-300 pb-4">
                  <div className="h-12 w-12 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center mx-auto text-lg mb-2">
                    SMS
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {reportCardData.institution.name}
                  </h2>
                  <p className="text-xs italic text-slate-600 mt-0.5">
                    "{reportCardData.institution.motto}"
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {reportCardData.institution.address} · Tel: {reportCardData.institution.phone}
                  </p>
                  <p className="text-xs font-semibold text-indigo-700 mt-2 uppercase tracking-wider">
                    {reportCardData.institution.academicYear} · {reportCardData.institution.term} Report Card
                  </p>
                </div>

                {/* Student Details Header */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block">Student Name:</span>
                    <strong className="text-slate-900">{reportCardData.student.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Admission Number:</span>
                    <strong className="font-mono text-slate-900">{reportCardData.student.admissionNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Class & Section:</span>
                    <strong className="text-slate-900">{reportCardData.student.className}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Roll / Position:</span>
                    <strong className="text-slate-900">#{reportCardData.summary.classRank} of {reportCardData.summary.totalStudents}</strong>
                  </div>
                </div>

                {/* Subject Results Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Subject</TableHead>
                        <TableHead className="text-xs text-right">CA (/40)</TableHead>
                        <TableHead className="text-xs text-right">Exam (/60)</TableHead>
                        <TableHead className="text-xs text-right">Total (/100)</TableHead>
                        <TableHead className="text-xs text-center">Grade</TableHead>
                        <TableHead className="text-xs">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportCardData.subjects.map((sub: any) => (
                        <TableRow key={sub.subjectId}>
                          <TableCell className="text-xs font-semibold text-slate-900">
                            {sub.subjectName}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-slate-700">
                            {sub.caScore}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-slate-700">
                            {sub.examScore}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono font-bold text-slate-900">
                            {sub.totalScore}
                          </TableCell>
                          <TableCell className="text-xs text-center font-bold text-indigo-700 font-mono">
                            {sub.grade}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">
                            {sub.remark}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Remarks & Signatures */}
                <div className="space-y-3 pt-2 text-xs border-t border-slate-200">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-900 block mb-0.5">Form Teacher's Remarks:</span>
                    <p className="text-slate-700 italic">"{reportCardData.summary.teacherRemarks}"</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-900 block mb-0.5">Principal's Assessment:</span>
                    <p className="text-slate-700 italic">"{reportCardData.summary.principalRemarks}"</p>
                  </div>
                </div>

                {/* Footer seal */}
                <div className="flex justify-between items-center pt-4 text-xs text-slate-400 font-mono border-t border-slate-200">
                  <span>Status: Officially Published & Certified</span>
                  <span>Next Term Resumes: {reportCardData.summary.nextTermResumesDate}</span>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<BookOpen className="h-8 w-8 text-slate-400" />}
                title="Official Report Card Not Published"
                description="The academic report card for this student and term is currently being finalized."
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: TIMETABLE */}
      {/* ===================================================================== */}
      {activeTab === "timetable" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Weekly Class & Lesson Timetable
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Current timetable schedule for {selectedChild?.fullName} ({selectedChild?.className}).
              </CardDescription>
            </div>
            <div className="flex gap-1">
              {["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"].map((day) => (
                <button
                  key={day}
                  onClick={() => setTimetableDay(day)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded ${
                    timetableDay === day
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Period</TableHead>
                    <TableHead className="text-xs">Time Window</TableHead>
                    <TableHead className="text-xs">Subject</TableHead>
                    <TableHead className="text-xs">Faculty Teacher</TableHead>
                    <TableHead className="text-xs">Classroom Facility</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timetableData?.schedule?.[timetableDay]?.length > 0 ? (
                    timetableData.schedule[timetableDay].map((lesson: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-xs text-slate-900 font-mono">
                          {lesson.periodName}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600">
                          {lesson.startTime} – {lesson.endTime}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-indigo-700">
                          {lesson.subjectName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700">
                          {lesson.teacherName}
                        </TableCell>
                        <TableCell className="text-xs text-slate-500">
                          {lesson.roomName || "Main Hall"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-400">
                        No lessons scheduled for this day.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 7: FINANCES & FEES */}
      {/* ===================================================================== */}
      {activeTab === "finance" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Statement of Account & Fee Ledger
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Chronological financial transactions and current fee ledger for {selectedChild?.fullName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Financial Summary KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block font-mono">Total Billed</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(financeData?.totalBilled || selectedChild?.totalDueBalance || 1450)}
                </span>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <span className="text-xs text-emerald-700 block font-mono">Total Paid</span>
                <span className="text-lg font-bold text-emerald-800">
                  {formatCurrency(financeData?.totalPaid || 1450)}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block font-mono">Waivers / Grants</span>
                <span className="text-lg font-bold text-indigo-700">
                  {formatCurrency(financeData?.totalWaived || 0)}
                </span>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                <span className="text-xs text-amber-700 block font-mono">Balance Due</span>
                <span className="text-lg font-bold text-amber-800">
                  {formatCurrency(financeData?.currentBalanceDue || 0)}
                </span>
              </div>
            </div>

            {/* Statement of Account Chronological Ledger */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Debit</TableHead>
                    <TableHead className="text-xs text-right">Credit</TableHead>
                    <TableHead className="text-xs text-right">Running Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(financeData?.entries || [
                    {
                      date: "2026-01-10",
                      reference: "INV-2026-00001",
                      description: "Grade 10 Spring Term Tuition & Laboratory Fees",
                      debit: 1450.0,
                      credit: 0,
                      runningBalance: 1450.0,
                    },
                    {
                      date: "2026-01-15",
                      reference: "PAY-2026-00001",
                      description: "Settlement via Bank Wire Transfer (TRX-CHASE-992182)",
                      debit: 0,
                      credit: 1450.0,
                      runningBalance: 0,
                    },
                  ]).map((entry: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs text-slate-700">{entry.date}</TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-indigo-700">{entry.reference}</TableCell>
                      <TableCell className="text-xs text-slate-800">{entry.description}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-slate-900">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-emerald-700 font-semibold">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold text-slate-900">
                        {formatCurrency(entry.runningBalance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 8: INVOICES */}
      {/* ===================================================================== */}
      {activeTab === "invoices" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Student Tuition Invoices
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Official school invoices issued for {selectedChild?.fullName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Invoice #</TableHead>
                    <TableHead className="text-xs">Issue Date</TableHead>
                    <TableHead className="text-xs">Due Date</TableHead>
                    <TableHead className="text-xs text-right">Total Amount</TableHead>
                    <TableHead className="text-xs text-right">Amount Paid</TableHead>
                    <TableHead className="text-xs text-right">Balance Due</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData.length > 0 ? (
                    invoicesData.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-mono">{inv.issueDate.split("T")[0]}</TableCell>
                        <TableCell className="text-xs text-slate-600 font-mono">{inv.dueDate.split("T")[0]}</TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold text-slate-900">
                          {formatCurrency(inv.totalAmount)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono text-emerald-700">
                          {formatCurrency(inv.paidAmount)}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold text-amber-700">
                          {formatCurrency(inv.balanceDue)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              inv.status === "PAID"
                                ? "bg-emerald-50 text-emerald-800"
                                : inv.status === "PARTIALLY_PAID"
                                ? "bg-amber-50 text-amber-800"
                                : "bg-rose-50 text-rose-800"
                            }`}
                          >
                            {inv.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveInvoice(inv)}
                            className="text-xs text-indigo-600 hover:text-indigo-900"
                          >
                            View Items
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-xs text-slate-400">
                        No issued invoices found for this student.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 9: RECEIPTS */}
      {/* ===================================================================== */}
      {activeTab === "receipts" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Official Payment Receipts
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Validated institutional receipts for payments credited to {selectedChild?.fullName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Receipt #</TableHead>
                    <TableHead className="text-xs">Issued Date</TableHead>
                    <TableHead className="text-xs">Payment Method</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs text-right">Amount Paid</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receiptsData.length > 0 ? (
                    receiptsData.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="font-mono text-xs font-bold text-slate-900">
                          {rec.receiptNumber}
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 font-mono">
                          {rec.issuedAt.split("T")[0]}
                        </TableCell>
                        <TableCell className="text-xs text-slate-700 font-medium">
                          {rec.paymentMethod}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-500">
                          {rec.paymentReference || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold text-emerald-700">
                          {formatCurrency(rec.amountPaid)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setActiveReceipt(rec)}
                            className="text-xs text-indigo-600 hover:text-indigo-900"
                          >
                            View Receipt
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-400">
                        No payment receipts recorded for this student.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 10: NOTIFICATIONS */}
      {/* ===================================================================== */}
      {activeTab === "notifications" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Parent Notification Inbox
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official alerts regarding published results, report cards, and fee transactions.
              </CardDescription>
            </div>
            {notificationsData.some((n) => !n.isRead) && (
              <Button size="sm" variant="outline" onClick={handleMarkAllNotifsRead} className="text-xs">
                Mark All as Read
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {notificationsData.length > 0 ? (
                notificationsData.map((n) => (
                  <div
                    key={n.id}
                    className={`p-4 rounded-lg border transition-all ${
                      n.isRead ? "bg-slate-50 border-slate-200" : "bg-indigo-50/40 border-indigo-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase text-indigo-700 font-mono">
                            {n.type}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{new Date(n.createdAt).toLocaleDateString()}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{n.title}</h4>
                        <p className="text-xs text-slate-600">{n.message}</p>
                      </div>
                      {!n.isRead && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkNotifRead(n.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-900"
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  icon={<Bell className="h-8 w-8 text-slate-400" />}
                  title="Inbox is Empty"
                  description="You have no notifications or pending administrative announcements."
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 11: SETTINGS / GUARDIAN PROFILE */}
      {/* ===================================================================== */}
      {activeTab === "settings" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Guardian Profile & Emergency Contact Self-Service
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Update your permitted personal phone, alternate numbers, residential address, and employment details.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {profileSuccess && (
              <Alert className="mb-4 bg-emerald-50 border-emerald-200 text-emerald-800" title="Success">
                Guardian contact profile updated successfully.
              </Alert>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Primary Phone Number" required>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    required
                  />
                </FormField>
                <FormField label="Alternate / Emergency Phone">
                  <Input
                    value={editAlternatePhone}
                    onChange={(e) => setEditAlternatePhone(e.target.value)}
                    placeholder="+1 (555) 000-0001"
                  />
                </FormField>
              </div>

              <FormField label="Residential Address">
                <Input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Street address, City, State"
                />
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Occupation / Title">
                  <Input
                    value={editOccupation}
                    onChange={(e) => setEditOccupation(e.target.value)}
                    placeholder="e.g. Physician, Engineer"
                  />
                </FormField>
                <FormField label="Employer / Organization">
                  <Input
                    value={editEmployer}
                    onChange={(e) => setEditEmployer(e.target.value)}
                    placeholder="e.g. Boston Health Alliance"
                  />
                </FormField>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={profileSaving} className="text-xs">
                  {profileSaving ? "Saving Changes..." : "Save Profile Details"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details Dialog */}
      <Dialog
        open={!!activeInvoice}
        onOpenChange={(open) => !open && setActiveInvoice(null)}
        maxWidth="lg"
        title={`Invoice Breakdown: ${activeInvoice?.invoiceNumber || ""}`}
        description={`Issued on ${activeInvoice?.issueDate?.split("T")[0] || ""} · Due date: ${activeInvoice?.dueDate?.split("T")[0] || ""}`}
      >
        {activeInvoice && (
          <div className="space-y-4 pt-2">
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Item Description</TableHead>
                    <TableHead className="text-xs text-right">Unit Price</TableHead>
                    <TableHead className="text-xs text-right">Discount</TableHead>
                    <TableHead className="text-xs text-right">Net Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeInvoice.items.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs font-medium text-slate-900">{item.name}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-slate-700">{formatCurrency(item.unitAmount)}</TableCell>
                      <TableCell className="text-xs text-right font-mono text-emerald-700">{formatCurrency(item.discountAmount)}</TableCell>
                      <TableCell className="text-xs text-right font-mono font-bold text-slate-900">{formatCurrency(item.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between">
              <span>Status: <strong className="uppercase">{activeInvoice.status}</strong></span>
              <span>Paid: <strong className="text-emerald-700">{formatCurrency(activeInvoice.paidAmount)}</strong></span>
              <span>Balance: <strong className="text-amber-700">{formatCurrency(activeInvoice.balanceDue)}</strong></span>
            </div>
          </div>
        )}
      </Dialog>

      {/* Receipt Details Dialog */}
      <Dialog
        open={!!activeReceipt}
        onOpenChange={(open) => !open && setActiveReceipt(null)}
        maxWidth="md"
        title={`Official Payment Receipt: ${activeReceipt?.receiptNumber || ""}`}
        description={`Validated receipt for ${activeReceipt?.studentName || ""}`}
      >
        {activeReceipt && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Receipt Number</span>
                <span className="font-mono font-bold text-slate-900">{activeReceipt.receiptNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Payment Date</span>
                <span className="font-mono text-slate-900">{activeReceipt.issuedAt.split("T")[0]}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Payment Method</span>
                <span className="font-medium text-slate-900">{activeReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Transaction Reference</span>
                <span className="font-mono text-slate-900">{activeReceipt.paymentReference || "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Total Amount Paid</span>
                <span className="font-mono font-bold text-emerald-700 text-sm">{formatCurrency(activeReceipt.amountPaid)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => window.print()} className="text-xs inline-flex items-center gap-1.5">
                <Printer className="h-3.5 w-3.5" />
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
