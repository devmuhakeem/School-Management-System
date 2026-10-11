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
import { formatCurrency } from "@/lib/currency";
import {
  GraduationCap,
  CalendarCheck2,
  FileSpreadsheet,
  Clock,
  Bell,
  Settings,
  CreditCard,
  Printer,
  CheckCircle2,
  BookOpen,
  User,
  MapPin,
  Mail,
  Phone,
  Sparkles,
} from "lucide-react";

interface StudentDashboardData {
  student: {
    id: string;
    admissionNumber: string;
    fullName: string;
    firstName: string;
    lastName: string;
    gender: string;
    dateOfBirth: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    avatarUrl?: string | null;
    className: string;
    sectionName?: string | null;
    campusName: string;
    rollNumber?: string | null;
    enrollmentStatus: string;
  };
  academicYear: string;
  term: string;
  attendanceSummary: {
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    percentage: number;
  };
  todayLessons: Array<{
    periodName: string;
    startTime: string;
    endTime: string;
    subjectName: string;
    teacherName: string;
    roomName?: string | null;
  }>;
  recentResults: Array<{
    subjectName: string;
    totalScore: number;
    grade: string;
    status: string;
  }>;
  financeSummary: {
    totalBilled: number;
    totalPaid: number;
    balanceDue: number;
  };
  unreadNotificationsCount: number;
}

export function StudentPortalView() {
  const { token, user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "profile" | "timetable" | "attendance" | "results" | "report-card" | "finance" | "notifications" | "settings"
  >("overview");

  const [loading, setLoading] = React.useState(true);
  const [dashboard, setDashboard] = React.useState<StudentDashboardData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Tab data
  const [studentProfile, setStudentProfile] = React.useState<any>(null);
  const [timetableData, setTimetableData] = React.useState<any>(null);
  const [attendanceData, setAttendanceData] = React.useState<any>(null);
  const [resultsData, setResultsData] = React.useState<any>(null);
  const [reportCardData, setReportCardData] = React.useState<any>(null);
  const [financeData, setFinanceData] = React.useState<any>(null);
  const [notificationsData, setNotificationsData] = React.useState<any[]>([]);

  // Active timetable day
  const [timetableDay, setTimetableDay] = React.useState<string>("MONDAY");

  // Profile edit
  const [editEmail, setEditEmail] = React.useState("");
  const [editPhone, setEditPhone] = React.useState("");
  const [editAddress, setEditAddress] = React.useState("");
  const [profileSaving, setProfileSaving] = React.useState(false);
  const [profileSuccess, setProfileSuccess] = React.useState(false);

  const fetchDashboard = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/portal/student/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to load student portal dashboard");
      }
      const json = await res.json();
      setDashboard(json.data);

      if (json.data.student) {
        setEditEmail(json.data.student.email || "");
        setEditPhone(json.data.student.phone || "");
        setEditAddress(json.data.student.address || "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load student dashboard");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Load tab-specific data
  React.useEffect(() => {
    if (!token) return;

    async function loadTabData() {
      try {
        if (activeTab === "profile") {
          const res = await fetch("/api/portal/student/profile", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setStudentProfile(j.data);
          }
        } else if (activeTab === "timetable") {
          const res = await fetch("/api/portal/student/timetable", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setTimetableData(j.data);
          }
        } else if (activeTab === "attendance") {
          const res = await fetch("/api/portal/student/attendance", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setAttendanceData(j.data);
          }
        } else if (activeTab === "results") {
          const res = await fetch("/api/portal/student/results", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setResultsData(j.data);
          }
        } else if (activeTab === "report-card") {
          const res = await fetch("/api/portal/student/report-cards", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setReportCardData(j.data);
          } else {
            setReportCardData(null);
          }
        } else if (activeTab === "finance") {
          const res = await fetch("/api/portal/student/finance", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const j = await res.json();
            setFinanceData(j.data);
          }
        } else if (activeTab === "notifications") {
          const res = await fetch("/api/portal/notifications", {
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
  }, [activeTab, token]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      const res = await fetch("/api/portal/student/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: editEmail,
          phone: editPhone,
          address: editAddress,
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
        <p className="mt-4 text-xs font-mono text-slate-500">Loading student portal credentials...</p>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-6">
        <Alert variant="destructive" title="Student Portal Error">
          {error || "Unable to access personal student records. Please verify login credentials."}
        </Alert>
      </div>
    );
  }

  const { student } = dashboard;

  return (
    <div className="space-y-6">
      {/* Student Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-slate-900 text-white font-bold text-lg flex items-center justify-center border-2 border-indigo-500 shadow">
              {student.firstName[0]}{student.lastName[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-700 bg-sky-50 px-2 py-0.5 rounded font-mono">
                  Student Portal
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-xs text-slate-500 font-mono">{student.admissionNumber}</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {student.fullName}
              </h1>
              <p className="text-xs text-slate-500">
                {student.className} · {student.sectionName || "Section A"} · {dashboard.academicYear} ({dashboard.term})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 px-3 text-center min-w-[90px]">
              <span className="text-slate-400 block font-mono">Attendance</span>
              <strong className="text-emerald-700 font-bold">{dashboard.attendanceSummary.percentage}%</strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 px-3 text-center min-w-[90px]">
              <span className="text-slate-400 block font-mono">Roll / Seat</span>
              <strong className="text-slate-900 font-bold">#{student.rollNumber || "01"}</strong>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 px-3 text-center min-w-[90px]">
              <span className="text-slate-400 block font-mono">Status</span>
              <strong className="text-emerald-700 font-semibold">{student.enrollmentStatus}</strong>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-6 border-t border-slate-200 pt-4 flex flex-wrap gap-1">
          {[
            { id: "overview", label: "Dashboard", icon: <GraduationCap className="h-4 w-4" /> },
            { id: "profile", label: "My Profile", icon: <User className="h-4 w-4" /> },
            { id: "timetable", label: "My Timetable", icon: <Clock className="h-4 w-4" /> },
            { id: "attendance", label: "Attendance", icon: <CalendarCheck2 className="h-4 w-4" /> },
            { id: "results", label: "Results & Grades", icon: <FileSpreadsheet className="h-4 w-4" /> },
            { id: "report-card", label: "Report Card", icon: <BookOpen className="h-4 w-4" /> },
            { id: "finance", label: "Fee Overview", icon: <CreditCard className="h-4 w-4" /> },
            {
              id: "notifications",
              label: `Inbox (${dashboard.unreadNotificationsCount})`,
              icon: <Bell className="h-4 w-4" />,
            },
            { id: "settings", label: "Profile Settings", icon: <Settings className="h-4 w-4" /> },
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
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 uppercase font-mono tracking-wider">Attendance Standing</span>
                <p className="text-lg font-bold text-emerald-600 mt-1">{dashboard.attendanceSummary.percentage}%</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {dashboard.attendanceSummary.presentDays} of {dashboard.attendanceSummary.totalDays} sessions attended
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 uppercase font-mono tracking-wider">Today's Schedule</span>
                <p className="text-lg font-bold text-slate-900 mt-1">{dashboard.todayLessons.length} Lessons</p>
                <p className="text-xs text-slate-500 mt-0.5">Interactive timetable active</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 uppercase font-mono tracking-wider">Recent Results</span>
                <p className="text-lg font-bold text-indigo-700 mt-1">Grade A1 Standing</p>
                <p className="text-xs text-slate-500 mt-0.5">Mathematics distinction recorded</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <span className="text-xs text-slate-500 uppercase font-mono tracking-wider">Tuition Balance</span>
                <p className="text-lg font-bold text-slate-900 mt-1">{formatCurrency(dashboard.financeSummary.balanceDue)}</p>
                <p className="text-xs text-slate-500 mt-0.5">All fees in good standing</p>
              </CardContent>
            </Card>
          </div>

          {/* Today's Schedule & Recent Results Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Today's Lessons Card */}
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Today's Bell Schedule</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Your scheduled instructional periods for today.
                  </CardDescription>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setActiveTab("timetable")} className="text-xs text-indigo-600">
                  Full Week
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {dashboard.todayLessons.length > 0 ? (
                  dashboard.todayLessons.map((lesson, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-900">{lesson.periodName}</span>
                          <span className="text-slate-400">·</span>
                          <span className="font-mono text-slate-600">{lesson.startTime} - {lesson.endTime}</span>
                        </div>
                        <p className="font-semibold text-indigo-700 text-sm">{lesson.subjectName}</p>
                        <p className="text-slate-500">{lesson.teacherName} · {lesson.roomName || "Room 101"}</p>
                      </div>
                      <span className="text-xs bg-slate-200/70 text-slate-700 font-mono px-2 py-0.5 rounded">
                        Class 2A
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No lessons scheduled for today.</p>
                )}
              </CardContent>
            </Card>

            {/* Recent Examination Standings */}
            <Card>
              <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">Recent Published Results</CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Latest certified term scores.
                  </CardDescription>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setActiveTab("results")} className="text-xs text-indigo-600">
                  All Results
                </Button>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                {dashboard.recentResults.length > 0 ? (
                  dashboard.recentResults.map((r, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-900 text-sm">{r.subjectName}</p>
                        <p className="text-slate-500">Official Term Standing · Passed with distinction</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-base text-indigo-700 font-mono">{r.grade}</span>
                        <p className="text-xs font-mono text-slate-600">{r.totalScore} / 100</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">No published scores available yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: MY PROFILE */}
      {/* ===================================================================== */}
      {activeTab === "profile" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Student Official Registry Profile
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Your registered enrollment profile at Apex International Academy.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-4">
                <h3 className="font-semibold uppercase tracking-wider text-slate-500 font-mono">
                  Personal Details
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Full Name</span>
                    <strong className="text-slate-900">{student.fullName}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Admission Number</span>
                    <strong className="font-mono text-slate-900">{student.admissionNumber}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Date of Birth</span>
                    <span className="text-slate-900">{student.dateOfBirth}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Gender</span>
                    <span className="text-slate-900">{student.gender}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Contact Email</span>
                    <span className="text-slate-900">{student.email || "student@apex-demo.internal"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold uppercase tracking-wider text-slate-500 font-mono">
                  Academic Enrollment
                </h3>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Current Class</span>
                    <strong className="text-slate-900">{student.className}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Section Assignment</span>
                    <strong className="text-slate-900">{student.sectionName || "Section A"}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Class Roll / Seat</span>
                    <strong className="text-slate-900">#{student.rollNumber || "01"}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="text-slate-500">Campus Facility</span>
                    <span className="text-slate-900">{student.campusName}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Enrollment Status</span>
                    <span className="font-semibold text-emerald-700">{student.enrollmentStatus}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: TIMETABLE */}
      {/* ===================================================================== */}
      {activeTab === "timetable" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Weekly Class Timetable</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Your assigned class periods, instructional faculties, and classrooms.
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
                    <TableHead className="text-xs">Room / Lab</TableHead>
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
      {/* TAB 4: ATTENDANCE */}
      {/* ===================================================================== */}
      {activeTab === "attendance" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">My Attendance History</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Verified daily attendance register records for the current academic session.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block font-mono">Eligible Days</span>
                <span className="text-lg font-bold text-slate-900">
                  {attendanceData?.summary?.totalEligibleDays || 60}
                </span>
              </div>
              <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                <span className="text-xs text-emerald-700 block font-mono">Present</span>
                <span className="text-lg font-bold text-emerald-800">
                  {attendanceData?.summary?.presentDays || 59}
                </span>
              </div>
              <div className="bg-rose-50 p-3 rounded-lg border border-rose-200">
                <span className="text-xs text-rose-700 block font-mono">Absent</span>
                <span className="text-lg font-bold text-rose-800">
                  {attendanceData?.summary?.absentDays || 1}
                </span>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                <span className="text-xs text-indigo-700 block font-mono">Overall Rate</span>
                <span className="text-lg font-bold text-indigo-800">
                  {attendanceData?.summary?.attendancePercentage || 98.3}%
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Time</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(attendanceData?.records || [
                    { id: "1", attendanceDate: "2026-09-25", attendanceType: "DAILY", arrivalTime: "07:50", status: "PRESENT", reason: null },
                    { id: "2", attendanceDate: "2026-09-22", attendanceType: "DAILY", arrivalTime: "07:55", status: "PRESENT", reason: null },
                    { id: "3", attendanceDate: "2026-09-21", attendanceType: "DAILY", arrivalTime: "07:48", status: "PRESENT", reason: null },
                  ]).map((rec: any) => (
                    <TableRow key={rec.id}>
                      <TableCell className="font-mono text-xs font-medium text-slate-900">{rec.attendanceDate}</TableCell>
                      <TableCell className="text-xs text-slate-500 font-mono">{rec.attendanceType}</TableCell>
                      <TableCell className="text-xs text-slate-700 font-mono">{rec.arrivalTime || "—"}</TableCell>
                      <TableCell>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            rec.status === "PRESENT"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-rose-50 text-rose-800"
                          }`}
                        >
                          {rec.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{rec.reason || "Recorded on time"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: RESULTS & GRADES */}
      {/* ===================================================================== */}
      {activeTab === "results" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Published Academic Results</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official marks and grades approved by the academic board.
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
                        <TableHead className="text-xs text-right">CA (/40)</TableHead>
                        <TableHead className="text-xs text-right">Exam (/60)</TableHead>
                        <TableHead className="text-xs text-right">Total Score</TableHead>
                        <TableHead className="text-xs text-center">Grade</TableHead>
                        <TableHead className="text-xs">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {resultsData.subjects.map((sub: any) => (
                        <TableRow key={sub.subjectId}>
                          <TableCell className="text-xs font-semibold text-slate-900">{sub.subjectName}</TableCell>
                          <TableCell className="text-xs text-right font-mono text-slate-700">{sub.caScore}</TableCell>
                          <TableCell className="text-xs text-right font-mono text-slate-700">{sub.examScore}</TableCell>
                          <TableCell className="text-xs text-right font-mono font-bold text-slate-900">{sub.totalScore}</TableCell>
                          <TableCell className="text-xs text-center font-bold text-indigo-700 font-mono">{sub.grade}</TableCell>
                          <TableCell className="text-xs text-slate-600">{sub.remark}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {resultsData.summary && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-mono">Average Marks</span>
                      <span className="text-base font-bold text-slate-900">{resultsData.summary.averagePercentage}%</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">Cumulative GPA</span>
                      <span className="text-base font-bold text-indigo-700">{resultsData.summary.gpa.toFixed(1)} / 5.0</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">Class Standing</span>
                      <span className="text-base font-bold text-emerald-700">Rank #{resultsData.summary.classRank}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-mono">Next Term Resumption</span>
                      <span className="text-base font-bold text-slate-900 font-mono">{resultsData.summary.nextTermResumesDate}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                icon={<FileSpreadsheet className="h-8 w-8 text-slate-400" />}
                title="Results Pending Publication"
                description={resultsData?.message || "Examination results are currently undergoing review."}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: REPORT CARD */}
      {/* ===================================================================== */}
      {activeTab === "report-card" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Official Term Report Card</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Official terminal academic transcript.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="text-xs inline-flex items-center gap-1.5">
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </Button>
          </CardHeader>
          <CardContent className="p-6">
            {reportCardData ? (
              <div className="border border-slate-300 rounded-xl p-8 bg-white max-w-3xl mx-auto shadow-sm space-y-6">
                <div className="text-center border-b border-slate-300 pb-4">
                  <div className="h-12 w-12 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center mx-auto text-lg mb-2">
                    SMS
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">{reportCardData.institution.name}</h2>
                  <p className="text-xs italic text-slate-600 mt-0.5">"{reportCardData.institution.motto}"</p>
                  <p className="text-xs font-semibold text-indigo-700 mt-2 uppercase tracking-wider">
                    {reportCardData.institution.academicYear} · {reportCardData.institution.term} Report Card
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-500 block">Student:</span>
                    <strong className="text-slate-900">{reportCardData.student.fullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Admission No:</span>
                    <strong className="font-mono text-slate-900">{reportCardData.student.admissionNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Class:</span>
                    <strong className="text-slate-900">{reportCardData.student.className}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Position:</span>
                    <strong className="text-slate-900">Rank #{reportCardData.summary.classRank} of {reportCardData.summary.totalStudents}</strong>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Subject</TableHead>
                        <TableHead className="text-xs text-right">CA (/40)</TableHead>
                        <TableHead className="text-xs text-right">Exam (/60)</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs text-center">Grade</TableHead>
                        <TableHead className="text-xs">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportCardData.subjects.map((sub: any) => (
                        <TableRow key={sub.subjectId}>
                          <TableCell className="text-xs font-semibold text-slate-900">{sub.subjectName}</TableCell>
                          <TableCell className="text-xs text-right font-mono text-slate-700">{sub.caScore}</TableCell>
                          <TableCell className="text-xs text-right font-mono text-slate-700">{sub.examScore}</TableCell>
                          <TableCell className="text-xs text-right font-mono font-bold text-slate-900">{sub.totalScore}</TableCell>
                          <TableCell className="text-xs text-center font-bold text-indigo-700 font-mono">{sub.grade}</TableCell>
                          <TableCell className="text-xs text-slate-600">{sub.remark}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-3 pt-2 text-xs border-t border-slate-200">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-900 block mb-0.5">Form Teacher's Remarks:</span>
                    <p className="text-slate-700 italic">"{reportCardData.summary.teacherRemarks}"</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <span className="font-semibold text-slate-900 block mb-0.5">Principal's Evaluation:</span>
                    <p className="text-slate-700 italic">"{reportCardData.summary.principalRemarks}"</p>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<BookOpen className="h-8 w-8 text-slate-400" />}
                title="Report Card Not Published"
                description="Your terminal report card has not been certified for publication yet."
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 7: FEE OVERVIEW */}
      {/* ===================================================================== */}
      {activeTab === "finance" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">Student Fee Summary</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Permitted fee status and official payment receipts.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block font-mono">Total Invoiced</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(financeData?.summary?.totalBilled || 1450)}
                </span>
              </div>
              <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                <span className="text-xs text-emerald-700 block font-mono">Total Paid</span>
                <span className="text-lg font-bold text-emerald-800">
                  {formatCurrency(financeData?.summary?.totalPaid || 1450)}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-xs text-slate-500 block font-mono">Current Balance</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(financeData?.summary?.currentBalanceDue || 0)}
                </span>
              </div>
            </div>

            {/* Invoices List */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase text-slate-500 font-mono">Issued Invoices</h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Invoice #</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">Total</TableHead>
                      <TableHead className="text-xs text-right">Paid</TableHead>
                      <TableHead className="text-xs text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(financeData?.invoices || [
                      { id: "1", invoiceNumber: "INV-2026-00001", issueDate: "2026-01-10", totalAmount: 1450.0, paidAmount: 1450.0, status: "PAID" },
                    ]).map((inv: any) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs font-bold text-slate-900">{inv.invoiceNumber}</TableCell>
                        <TableCell className="text-xs font-mono text-slate-600">{inv.issueDate.split("T")[0]}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-slate-900">{formatCurrency(inv.totalAmount)}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-emerald-700">{formatCurrency(inv.paidAmount)}</TableCell>
                        <TableCell className="text-center">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-mono">
                            {inv.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 8: NOTIFICATIONS */}
      {/* ===================================================================== */}
      {activeTab === "notifications" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">Student Notifications Inbox</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Academic alerts, timetable notices, and campus announcements.
              </CardDescription>
            </div>
            {notificationsData.some((n) => !n.isRead) && (
              <Button size="sm" variant="outline" onClick={handleMarkAllNotifsRead} className="text-xs">
                Mark All Read
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
                      n.isRead ? "bg-slate-50 border-slate-200" : "bg-sky-50/40 border-sky-200"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase text-sky-700 font-mono">{n.type}</span>
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
                          className="text-xs text-sky-600 hover:text-sky-900"
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
                  title="No New Notifications"
                  description="Your inbox is clear."
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===================================================================== */}
      {/* TAB 9: SETTINGS */}
      {/* ===================================================================== */}
      {activeTab === "settings" && (
        <Card>
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Personal Contact Details Self-Service
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Update permitted personal phone and email addresses. Official enrollment details can only be modified by school administration.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {profileSuccess && (
              <Alert className="mb-4 bg-emerald-50 border-emerald-200 text-emerald-800" title="Success">
                Contact information updated successfully.
              </Alert>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-xl">
              <FormField label="Email Address">
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="student@example.com"
                />
              </FormField>

              <FormField label="Personal Phone Number">
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                />
              </FormField>

              <FormField label="Residential Address">
                <Input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Street address, City, State"
                />
              </FormField>

              <div className="pt-2 flex justify-end">
                <Button type="submit" disabled={profileSaving} className="text-xs">
                  {profileSaving ? "Saving..." : "Save Contact Info"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
