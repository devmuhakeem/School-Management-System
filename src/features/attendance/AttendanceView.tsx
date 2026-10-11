import React, { useState, useEffect } from "react";
import {
  CalendarCheck2,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Unlock,
  Filter,
  Save,
  RotateCcw,
  Search,
  FileSpreadsheet,
  ChevronRight,
  BookOpen,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AttendanceCorrectionModal,
  ExcuseAbsenceModal,
  LockAttendanceModal,
} from "./AttendanceModals";

export function AttendanceView() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "daily" | "lessons" | "class-history" | "student-history" | "reports"
  >("overview");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lookups
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [teachingGroups, setTeachingGroups] = useState<any[]>([]);

  // Filters for Daily Register
  const [selectedClassId, setSelectedClassId] = useState("cls-jss1-2526");
  const [selectedSectionId, setSelectedSectionId] = useState("sec-jss1-a");
  const [selectedDate, setSelectedDate] = useState("2026-09-25");
  const [studentSearch, setStudentSearch] = useState("");

  // Daily Register State
  const [registerData, setRegisterData] = useState<any>(null);
  const [localStatuses, setLocalStatuses] = useState<Record<string, {
    status: string;
    arrivalTime?: string;
    reason?: string;
    remarks?: string;
  }>>({});

  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState<any>(null);

  // Class History State
  const [classHistory, setClassHistory] = useState<any>(null);

  // Student History State
  const [selectedStudentId, setSelectedStudentId] = useState("stu-demo-01");
  const [studentHistory, setStudentHistory] = useState<any>(null);

  // Reports State
  const [reportData, setReportData] = useState<any>(null);
  const [reportType, setReportType] = useState<"CLASS_SUMMARY" | "LESSON_ATTENDANCE">("CLASS_SUMMARY");

  // Lesson Attendance State
  const [selectedTeachingGroupId, setSelectedTeachingGroupId] = useState("tg-001");
  const [lessonRegisterData, setLessonRegisterData] = useState<any>(null);
  const [lessonStatuses, setLessonStatuses] = useState<Record<string, { status: string; remarks?: string }>>({});

  // Modals
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [excuseModalOpen, setExcuseModalOpen] = useState(false);
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [selectedRecordForModal, setSelectedRecordForModal] = useState<any>(null);

  // Initial load: admin lookups + dashboard stats
  useEffect(() => {
    async function init() {
      try {
        const [adminRes, statsRes, tgRes] = await Promise.all([
          fetch("/api/admin/dashboard").then((r) => r.json()).catch(() => ({})),
          fetch("/api/attendance/dashboard-stats?date=2026-09-25").then((r) => r.json()).catch(() => ({})),
          fetch("/api/academics/teaching-groups").then((r) => r.json()).catch(() => ({})),
        ]);

        if (adminRes?.data) {
          setClasses(adminRes.data.classes || [
            { id: "cls-jss1-2526", name: "Junior Secondary School 1" },
            { id: "cls-ss1-2526", name: "Senior Secondary School 1" },
            { id: "cls-ss2-2526", name: "Senior Secondary School 2" },
          ]);
          setSections(adminRes.data.sections || [
            { id: "sec-jss1-a", name: "Section A", classId: "cls-jss1-2526" },
            { id: "sec-jss1-b", name: "Section B", classId: "cls-jss1-2526" },
            { id: "sec-ss2-sci", name: "Science Wing", classId: "cls-ss2-2526" },
          ]);
        }
        if (statsRes?.data) {
          setDashboardStats(statsRes.data);
        }
        if (tgRes?.data) {
          setTeachingGroups(tgRes.data);
        }
      } catch {
        // Fallback defaults
      }
    }
    init();
  }, []);

  // Fetch register when class/section/date changes
  const fetchRegister = async () => {
    if (!selectedClassId || !selectedDate) return;
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const url = `/api/attendance/register?classId=${selectedClassId}${
        selectedSectionId ? `&sectionId=${selectedSectionId}` : ""
      }&attendanceDate=${selectedDate}&attendanceType=DAILY`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.data) {
        setRegisterData(json.data);

        // Prepopulate local statuses from returned roster
        const map: Record<string, any> = {};
        json.data.roster.forEach((item: any) => {
          if (item.attendance) {
            map[item.student.id] = {
              status: item.attendance.status,
              arrivalTime: item.attendance.arrivalTime || "",
              reason: item.attendance.reason || "",
              remarks: item.attendance.remarks || "",
            };
          } else {
            // Default unmarked to PRESENT for convenience
            map[item.student.id] = {
              status: "PRESENT",
              arrivalTime: "",
              reason: "",
              remarks: "",
            };
          }
        });
        setLocalStatuses(map);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "daily") {
      fetchRegister();
    }
  }, [selectedClassId, selectedSectionId, selectedDate, activeTab]);

  // Fetch Class History
  const fetchClassHistory = async () => {
    if (!selectedClassId) return;
    try {
      const res = await fetch(`/api/attendance/class/${selectedClassId}/history${
        selectedSectionId ? `?sectionId=${selectedSectionId}` : ""
      }`);
      const json = await res.json();
      if (json.data) setClassHistory(json.data);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (activeTab === "class-history") {
      fetchClassHistory();
    }
  }, [selectedClassId, selectedSectionId, activeTab]);

  // Fetch Student History
  const fetchStudentHistory = async () => {
    if (!selectedStudentId) return;
    try {
      const res = await fetch(`/api/attendance/student/${selectedStudentId}`);
      const json = await res.json();
      if (json.data) setStudentHistory(json.data);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (activeTab === "student-history") {
      fetchStudentHistory();
    }
  }, [selectedStudentId, activeTab]);

  // Fetch Reports
  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/attendance/reports?type=${reportType}${
        selectedClassId ? `&classId=${selectedClassId}` : ""
      }`);
      const json = await res.json();
      if (json.data) setReportData(json.data);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (activeTab === "reports") {
      fetchReports();
    }
  }, [reportType, selectedClassId, activeTab]);

  // Fetch Lesson Attendance Register
  const fetchLessonRegister = async () => {
    if (!selectedClassId || !selectedTeachingGroupId || !selectedDate) return;
    try {
      const res = await fetch(
        `/api/attendance/register?classId=${selectedClassId}&teachingGroupId=${selectedTeachingGroupId}&attendanceDate=${selectedDate}&attendanceType=LESSON`
      );
      const json = await res.json();
      if (json.data) {
        setLessonRegisterData(json.data);
        const map: Record<string, any> = {};
        json.data.roster.forEach((item: any) => {
          map[item.student.id] = {
            status: item.attendance?.status || "PRESENT",
            remarks: item.attendance?.remarks || "",
          };
        });
        setLessonStatuses(map);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (activeTab === "lessons") {
      fetchLessonRegister();
    }
  }, [selectedTeachingGroupId, selectedClassId, selectedDate, activeTab]);

  // Bulk set all students to a specific status
  const handleSetAll = (status: string) => {
    if (!registerData) return;
    const next: Record<string, any> = { ...localStatuses };
    registerData.roster.forEach((item: any) => {
      next[item.student.id] = {
        ...next[item.student.id],
        status,
      };
    });
    setLocalStatuses(next);
  };

  // Save Daily Register
  const handleSaveRegister = async () => {
    if (!registerData) return;
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const records = Object.entries(localStatuses).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      arrivalTime: data.status === "LATE" && data.arrivalTime ? data.arrivalTime : undefined,
      reason: data.reason || undefined,
      remarks: data.remarks || undefined,
    }));

    try {
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campusId: "camp-apex-main-01",
          academicYearId: "ay-2025-26",
          classId: selectedClassId,
          sectionId: selectedSectionId || undefined,
          attendanceType: "DAILY",
          attendanceDate: selectedDate,
          records,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to save attendance.");
      }

      setSuccessMessage(`Successfully committed attendance for ${records.length} students.`);
      fetchRegister();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to commit attendance.");
    } finally {
      setSaving(false);
    }
  };

  // Save Lesson Register
  const handleSaveLessonRegister = async () => {
    if (!lessonRegisterData) return;
    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    const records = Object.entries(lessonStatuses).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      remarks: data.remarks || undefined,
    }));

    try {
      const res = await fetch("/api/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campusId: "camp-apex-main-01",
          academicYearId: "ay-2025-26",
          classId: selectedClassId,
          sectionId: selectedSectionId || undefined,
          teachingGroupId: selectedTeachingGroupId,
          attendanceType: "LESSON",
          attendanceDate: selectedDate,
          records,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to record lesson attendance.");
      }

      setSuccessMessage(`Recorded lesson attendance for ${records.length} students.`);
      fetchLessonRegister();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record lesson attendance.");
    } finally {
      setSaving(false);
    }
  };

  const filteredRoster = registerData?.roster.filter((item: any) => {
    if (!studentSearch.trim()) return true;
    const q = studentSearch.toLowerCase();
    const fullName = `${item.student.firstName} ${item.student.lastName}`.toLowerCase();
    return (
      fullName.includes(q) ||
      item.student.admissionNumber.toLowerCase().includes(q) ||
      (item.student.rollNumber && item.student.rollNumber.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarCheck2 className="h-5 w-5 text-slate-900" />
            Attendance Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daily classroom rosters, lesson period attendance, audited historical corrections, and institutional attendance reports
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "daily" && (
            <Button
              onClick={() => setLockModalOpen(true)}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              {registerData?.isLocked ? (
                <>
                  <Unlock className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Unlock Register
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5 mr-1 text-amber-600" /> Lock Register
                </>
              )}
            </Button>
          )}

          {activeTab === "daily" && (
            <Button
              onClick={handleSaveRegister}
              disabled={saving || registerData?.isLocked}
              size="sm"
              className="text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {saving ? "Saving..." : "Save Attendance"}
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto text-xs pb-px">
        {[
          { id: "overview", label: "Dashboard & Alerts" },
          { id: "daily", label: "Daily Attendance Register" },
          { id: "lessons", label: "Subject / Lesson Attendance" },
          { id: "class-history", label: "Class History Matrix" },
          { id: "student-history", label: "Student Profile Timeline" },
          { id: "reports", label: "Attendance Reports" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "border-slate-900 text-slate-900 font-semibold"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feedback Messages */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. OVERVIEW & METRICS TAB */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded">
              <span className="text-[11px] font-medium text-slate-500">Attendance Rate</span>
              <div className="text-xl font-bold text-slate-900 mt-1 flex items-baseline gap-1">
                {dashboardStats?.attendanceRate ?? 88.5}%
              </div>
              <span className="text-[10px] text-emerald-600 mt-0.5 block flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> Today's target: 95%
              </span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded">
              <span className="text-[11px] font-medium text-slate-500">Present</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {dashboardStats?.presentCount ?? 5}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Verified in class</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded">
              <span className="text-[11px] font-medium text-slate-500">Absent</span>
              <div className="text-xl font-bold text-red-600 mt-1">
                {dashboardStats?.absentCount ?? 1}
              </div>
              <span className="text-[10px] text-red-500 mt-0.5 block">Unexcused</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded">
              <span className="text-[11px] font-medium text-slate-500">Late</span>
              <div className="text-xl font-bold text-amber-600 mt-1">
                {dashboardStats?.lateCount ?? 1}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded arrivals</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded">
              <span className="text-[11px] font-medium text-slate-500">Excused</span>
              <div className="text-xl font-bold text-slate-700 mt-1">
                {dashboardStats?.excusedCount ?? 1}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Medical / Official</span>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded">
              <span className="text-[11px] font-medium text-slate-500">Unmarked</span>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {dashboardStats?.unmarkedCount ?? 0}
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Pending rosters</span>
            </div>
          </div>

          {/* Incomplete Classes Alert */}
          {dashboardStats?.incompleteClasses && dashboardStats.incompleteClasses.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-semibold text-xs">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Attendance Pending: Classes with Unsubmitted Daily Rosters</span>
              </div>
              <p className="text-xs text-amber-800">
                The following academic cohorts have not yet submitted completed morning attendance for {dashboardStats.date}:
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {dashboardStats.incompleteClasses.map((cls: any) => (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setActiveTab("daily");
                    }}
                    className="px-2.5 py-1 text-xs bg-white border border-amber-300 text-amber-900 rounded font-medium hover:bg-amber-100 flex items-center gap-1 transition-colors"
                  >
                    <span>{cls.name}</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Access Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded space-y-3">
              <div className="flex items-center gap-2">
                <CalendarCheck2 className="h-4 w-4 text-slate-900" />
                <h3 className="text-xs font-bold text-slate-900">Classroom Morning Roll-Call</h3>
              </div>
              <p className="text-xs text-slate-500">
                Mark, edit, or bulk-populate student daily attendance. Support for late arrivals, absence reasons, and attendance locking.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("daily")}
                className="w-full text-xs"
              >
                Open Daily Register <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-900" />
                <h3 className="text-xs font-bold text-slate-900">Period & Lesson Attendance</h3>
              </div>
              <p className="text-xs text-slate-500">
                Take attendance during specialized subject periods and practical lab sessions for specific teaching cohorts.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("lessons")}
                className="w-full text-xs"
              >
                Mark Lesson Attendance <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded space-y-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-slate-900" />
                <h3 className="text-xs font-bold text-slate-900">Institutional Reports</h3>
              </div>
              <p className="text-xs text-slate-500">
                Generate student summaries, class rates, term evaluations, and drill-down into absence frequency patterns.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("reports")}
                className="w-full text-xs"
              >
                View Attendance Reports <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. DAILY ATTENDANCE REGISTER TAB */}
      {/* ========================================================================= */}
      {activeTab === "daily" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Class Tier</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-white"
              >
                <option value="">All Sections</option>
                {sections
                  .filter((s) => !selectedClassId || s.classId === selectedClassId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Session Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Search Student</label>
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Name or ID..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 bg-white"
                />
              </div>
            </div>

            <div className="flex items-end gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetAll("PRESENT")}
                disabled={registerData?.isLocked}
                className="text-xs flex-1"
              >
                All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetAll("ABSENT")}
                disabled={registerData?.isLocked}
                className="text-xs flex-1"
              >
                All Absent
              </Button>
            </div>
          </div>

          {/* Register Status Banner */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-900">
                Roster: {filteredRoster ? filteredRoster.length : 0} Students
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">
                Present: {registerData?.summary?.presentCount ?? 0}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">
                Absent: {registerData?.summary?.absentCount ?? 0}
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-600">
                Late: {registerData?.summary?.lateCount ?? 0}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {registerData?.isLocked ? (
                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
                  <Lock className="h-3 w-3" /> Register Locked
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                  <Unlock className="h-3 w-3" /> Register Open
                </span>
              )}
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                <tr>
                  <th className="p-3 w-12 text-center">Roll</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Admission ID</th>
                  <th className="p-3 w-64">Attendance Status</th>
                  <th className="p-3 w-36">Arrival Time</th>
                  <th className="p-3">Reason / Remarks</th>
                  <th className="p-3 w-28 text-right">Audited Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      Loading attendance roster...
                    </td>
                  </tr>
                ) : filteredRoster && filteredRoster.length > 0 ? (
                  filteredRoster.map((item: any) => {
                    const stId = item.student.id;
                    const cur = localStatuses[stId] || { status: "PRESENT" };

                    return (
                      <tr key={stId} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center font-mono text-slate-500">
                          {item.student.rollNumber || "—"}
                        </td>
                        <td className="p-3 font-medium text-slate-900">
                          {item.student.firstName} {item.student.lastName}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {item.student.admissionNumber}
                        </td>
                        <td className="p-3">
                          <div className="inline-flex rounded border border-slate-200 overflow-hidden bg-white">
                            {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                disabled={registerData?.isLocked}
                                onClick={() =>
                                  setLocalStatuses({
                                    ...localStatuses,
                                    [stId]: { ...cur, status: s },
                                  })
                                }
                                className={`px-2 py-1 text-[11px] font-medium transition-colors ${
                                  cur.status === s
                                    ? s === "PRESENT"
                                      ? "bg-slate-900 text-white"
                                      : s === "ABSENT"
                                      ? "bg-red-600 text-white"
                                      : s === "LATE"
                                      ? "bg-amber-600 text-white"
                                      : "bg-indigo-600 text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {s === "PRESENT" ? "P" : s === "ABSENT" ? "A" : s === "LATE" ? "L" : "E"}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          {cur.status === "LATE" ? (
                            <Input
                              type="time"
                              disabled={registerData?.isLocked}
                              value={cur.arrivalTime || ""}
                              onChange={(e) =>
                                setLocalStatuses({
                                  ...localStatuses,
                                  [stId]: { ...cur, arrivalTime: e.target.value },
                                })
                              }
                              className="h-7 text-xs bg-white"
                            />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="p-3">
                          {cur.status === "ABSENT" || cur.status === "EXCUSED" ? (
                            <Input
                              placeholder="Reason / Notes..."
                              disabled={registerData?.isLocked}
                              value={cur.reason || ""}
                              onChange={(e) =>
                                setLocalStatuses({
                                  ...localStatuses,
                                  [stId]: { ...cur, reason: e.target.value },
                                })
                              }
                              className="h-7 text-xs bg-white"
                            />
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          {item.attendance && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecordForModal({
                                    ...item.attendance,
                                    studentName: `${item.student.firstName} ${item.student.lastName}`,
                                  });
                                  setCorrectionModalOpen(true);
                                }}
                                className="text-[11px] text-slate-600 hover:text-slate-900 underline font-medium"
                              >
                                Correct
                              </button>
                              <span className="text-slate-300">·</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRecordForModal({
                                    ...item.attendance,
                                    studentName: `${item.student.firstName} ${item.student.lastName}`,
                                  });
                                  setExcuseModalOpen(true);
                                }}
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 underline font-medium"
                              >
                                Excuse
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      No active enrolled students found for the selected class and section.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LESSON ATTENDANCE TAB */}
      {/* ========================================================================= */}
      {activeTab === "lessons" && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Teaching Cohort / Group</label>
              <select
                value={selectedTeachingGroupId}
                onChange={(e) => setSelectedTeachingGroupId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded bg-white"
              >
                {teachingGroups.map((tg) => (
                  <option key={tg.id} value={tg.id}>
                    {tg.name} ({tg.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Lesson Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-white"
              />
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleSaveLessonRegister}
                disabled={saving}
                size="sm"
                className="text-xs w-full"
              >
                <Save className="h-3.5 w-3.5 mr-1" />
                {saving ? "Saving..." : "Commit Lesson Attendance"}
              </Button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                <tr>
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Admission ID</th>
                  <th className="p-3 w-64">Attendance Status</th>
                  <th className="p-3">Lesson Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lessonRegisterData?.roster && lessonRegisterData.roster.length > 0 ? (
                  lessonRegisterData.roster.map((item: any, idx: number) => {
                    const stId = item.student.id;
                    const cur = lessonStatuses[stId] || { status: "PRESENT" };

                    return (
                      <tr key={stId} className="hover:bg-slate-50/50">
                        <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-medium text-slate-900">
                          {item.student.firstName} {item.student.lastName}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {item.student.admissionNumber}
                        </td>
                        <td className="p-3">
                          <div className="inline-flex rounded border border-slate-200 overflow-hidden bg-white">
                            {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() =>
                                  setLessonStatuses({
                                    ...lessonStatuses,
                                    [stId]: { ...cur, status: s },
                                  })
                                }
                                className={`px-2.5 py-1 text-[11px] font-medium ${
                                  cur.status === s
                                    ? "bg-slate-900 text-white"
                                    : "text-slate-600 hover:bg-slate-100"
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <Input
                            placeholder="Optional notes..."
                            value={cur.remarks || ""}
                            onChange={(e) =>
                              setLessonStatuses({
                                ...lessonStatuses,
                                [stId]: { ...cur, remarks: e.target.value },
                              })
                            }
                            className="h-7 text-xs bg-white"
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-400">
                      No cohort students enrolled in this teaching group.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CLASS HISTORY MATRIX TAB */}
      {/* ========================================================================= */}
      {activeTab === "class-history" && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded flex flex-wrap gap-3 text-xs items-end">
            <div>
              <label className="block text-slate-600 font-medium mb-1">Class Tier</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="p-2 border border-slate-300 rounded bg-white"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-medium mb-1">Section</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="p-2 border border-slate-300 rounded bg-white"
              >
                <option value="">All Sections</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                <tr>
                  <th className="p-3">Session Date</th>
                  <th className="p-3">Total Marked</th>
                  <th className="p-3">Present</th>
                  <th className="p-3">Absent</th>
                  <th className="p-3">Late</th>
                  <th className="p-3">Excused</th>
                  <th className="p-3">Attendance Rate</th>
                  <th className="p-3">Register Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classHistory?.summaries && classHistory.summaries.length > 0 ? (
                  classHistory.summaries.map((day: any) => (
                    <tr key={day.date} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-medium text-slate-900">{day.date}</td>
                      <td className="p-3 text-slate-600">{day.totalMarked} students</td>
                      <td className="p-3 font-semibold text-emerald-600">{day.present}</td>
                      <td className="p-3 font-semibold text-red-600">{day.absent}</td>
                      <td className="p-3 font-semibold text-amber-600">{day.late}</td>
                      <td className="p-3 text-slate-600">{day.excused}</td>
                      <td className="p-3 font-bold text-slate-900">{day.attendanceRate}%</td>
                      <td className="p-3">
                        {day.isLocked ? (
                          <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-medium border border-amber-200">
                            Locked
                          </span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-medium border border-emerald-200">
                            Open
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedDate(day.date);
                            setActiveTab("daily");
                          }}
                          className="text-xs text-slate-900 hover:underline font-semibold"
                        >
                          View Roster →
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-6 text-center text-slate-400">
                      No attendance history recorded for this class yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. STUDENT PROFILE TIMELINE TAB */}
      {/* ========================================================================= */}
      {activeTab === "student-history" && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded flex items-center gap-3 text-xs">
            <span className="font-medium text-slate-700">Select Student Profile:</span>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="p-2 border border-slate-300 rounded bg-white"
            >
              <option value="stu-demo-01">Zainab Al-Mansoor (ADM-2025-0001)</option>
              <option value="stu-demo-02">Chukwudi Okafor (ADM-2025-0002)</option>
              <option value="stu-demo-03">Amina Bello (ADM-2025-0003)</option>
            </select>
          </div>

          {studentHistory && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-white border border-slate-200 rounded">
                <span className="text-[11px] text-slate-500 font-medium">Total Sessions</span>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {studentHistory.summary.totalSessions}
                </div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded">
                <span className="text-[11px] text-slate-500 font-medium">Days Present</span>
                <div className="text-lg font-bold text-emerald-600 mt-1">
                  {studentHistory.summary.presentCount}
                </div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded">
                <span className="text-[11px] text-slate-500 font-medium">Absences</span>
                <div className="text-lg font-bold text-red-600 mt-1">
                  {studentHistory.summary.absentCount}
                </div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded">
                <span className="text-[11px] text-slate-500 font-medium">Late Arrivals</span>
                <div className="text-lg font-bold text-amber-600 mt-1">
                  {studentHistory.summary.lateCount}
                </div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded">
                <span className="text-[11px] text-slate-500 font-medium">Excused</span>
                <div className="text-lg font-bold text-indigo-600 mt-1">
                  {studentHistory.summary.excusedCount}
                </div>
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded">
                <span className="text-[11px] text-slate-500 font-medium">Attendance %</span>
                <div className="text-lg font-bold text-slate-900 mt-1">
                  {studentHistory.summary.attendancePercentage}%
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Arrival Time</th>
                  <th className="p-3">Reason / Remarks</th>
                  <th className="p-3">Recorded At</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {studentHistory?.records && studentHistory.records.length > 0 ? (
                  studentHistory.records.map((rec: any) => (
                    <tr key={rec.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-medium text-slate-900">{rec.attendanceDate}</td>
                      <td className="p-3 text-slate-500">{rec.attendanceType}</td>
                      <td className="p-3">
                        <span
                          className={`font-semibold ${
                            rec.status === "PRESENT"
                              ? "text-emerald-700"
                              : rec.status === "ABSENT"
                              ? "text-red-700"
                              : rec.status === "LATE"
                              ? "text-amber-700"
                              : "text-indigo-700"
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-slate-600">{rec.arrivalTime || "—"}</td>
                      <td className="p-3 text-slate-600">{rec.reason || rec.remarks || "—"}</td>
                      <td className="p-3 text-slate-400 font-mono text-[11px]">
                        {new Date(rec.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedRecordForModal(rec);
                            setCorrectionModalOpen(true);
                          }}
                          className="text-[11px] text-slate-700 hover:text-slate-900 underline font-medium"
                        >
                          Audited Correction
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      No attendance timeline records found for this student.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. REPORTS TAB */}
      {/* ========================================================================= */}
      {activeTab === "reports" && (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 p-3 rounded flex flex-wrap gap-3 text-xs items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-semibold text-slate-700">Report Focus:</span>
              <div className="inline-flex rounded border border-slate-300 bg-white">
                <button
                  onClick={() => setReportType("CLASS_SUMMARY")}
                  className={`px-3 py-1.5 font-medium ${
                    reportType === "CLASS_SUMMARY"
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Class Cohort Summary
                </button>
                <button
                  onClick={() => setReportType("LESSON_ATTENDANCE")}
                  className={`px-3 py-1.5 font-medium ${
                    reportType === "LESSON_ATTENDANCE"
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Lesson Attendance
                </button>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Export / Print Report
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            {reportType === "CLASS_SUMMARY" && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <tr>
                    <th className="p-3">Admission Number</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Sessions Evaluated</th>
                    <th className="p-3">Present</th>
                    <th className="p-3">Absent</th>
                    <th className="p-3">Late</th>
                    <th className="p-3">Excused</th>
                    <th className="p-3 font-bold text-slate-900">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData?.rows && reportData.rows.length > 0 ? (
                    reportData.rows.map((row: any) => (
                      <tr key={row.studentId} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-slate-500">{row.admissionNumber}</td>
                        <td className="p-3 font-medium text-slate-900">{row.studentName}</td>
                        <td className="p-3 text-slate-600">{row.total}</td>
                        <td className="p-3 text-emerald-600 font-semibold">{row.present}</td>
                        <td className="p-3 text-red-600 font-semibold">{row.absent}</td>
                        <td className="p-3 text-amber-600 font-semibold">{row.late}</td>
                        <td className="p-3 text-slate-600">{row.excused}</td>
                        <td className="p-3 font-bold text-slate-900">{row.attendanceRate}%</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-400">
                        No report data matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {reportType === "LESSON_ATTENDANCE" && (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700">
                  <tr>
                    <th className="p-3">Session Date</th>
                    <th className="p-3">Student ID</th>
                    <th className="p-3">Cohort Group</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Lesson Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData?.records && reportData.records.length > 0 ? (
                    reportData.records.map((rec: any) => (
                      <tr key={rec.id} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-slate-900">{rec.attendanceDate}</td>
                        <td className="p-3 font-mono text-slate-600">{rec.studentId}</td>
                        <td className="p-3 text-slate-600">{rec.teachingGroupId || "General"}</td>
                        <td className="p-3 font-semibold text-slate-900">{rec.status}</td>
                        <td className="p-3 text-slate-500">{rec.remarks || "—"}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-400">
                        No lesson attendance records recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Audited Correction Modal */}
      <AttendanceCorrectionModal
        open={correctionModalOpen}
        onOpenChange={setCorrectionModalOpen}
        record={selectedRecordForModal}
        onSuccess={() => {
          fetchRegister();
          fetchStudentHistory();
        }}
      />

      {/* Excuse Absence Modal */}
      <ExcuseAbsenceModal
        open={excuseModalOpen}
        onOpenChange={setExcuseModalOpen}
        record={selectedRecordForModal}
        onSuccess={() => {
          fetchRegister();
          fetchStudentHistory();
        }}
      />

      {/* Lock Register Modal */}
      <LockAttendanceModal
        open={lockModalOpen}
        onOpenChange={setLockModalOpen}
        isCurrentlyLocked={registerData?.isLocked ?? false}
        classId={selectedClassId}
        sectionId={selectedSectionId}
        attendanceDate={selectedDate}
        attendanceType="DAILY"
        onSuccess={() => fetchRegister()}
      />
    </div>
  );
}
