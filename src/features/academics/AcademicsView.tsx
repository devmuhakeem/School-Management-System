import React, { useState, useEffect } from "react";
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  Building2,
  Users,
  AlertTriangle,
  Plus,
  Trash2,
  Filter,
  CheckCircle2,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AllocateSubjectModal,
  AssignTeacherModal,
  ScheduleLessonModal,
  AddPeriodModal,
} from "./AcademicModals";

export function AcademicsView() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "allocations" | "teachers" | "timetable" | "workload" | "curriculum" | "schedule"
  >("overview");

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);

  // Reference options
  const [campuses, setCampuses] = useState<any[]>([]);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [periods, setPeriods] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);

  // Domain state
  const [classSubjects, setClassSubjects] = useState<any[]>([]);
  const [teachingAssignments, setTeachingAssignments] = useState<any[]>([]);
  const [timetableLessons, setTimetableLessons] = useState<any[]>([]);
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [combinations, setCombinations] = useState<any[]>([]);
  const [workloadData, setWorkloadData] = useState<any[]>([]);

  // Filters
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedDay, setSelectedDay] = useState("ALL");

  // Modals
  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [assignTeacherModalOpen, setAssignTeacherModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [periodModalOpen, setPeriodModalOpen] = useState(false);

  // Fetch foundational lookups and stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        statsRes,
        adminRes,
        periodsRes,
        roomsRes,
        curriculumsRes,
        combinationsRes,
        csRes,
        taRes,
        ttRes,
        wlRes,
      ] = await Promise.all([
        fetch("/api/academics/stats").then((r) => r.json()),
        fetch("/api/admin/dashboard").then((r) => r.json()).catch(() => ({})),
        fetch("/api/academics/periods").then((r) => r.json()),
        fetch("/api/academics/rooms").then((r) => r.json()),
        fetch("/api/academics/curriculums").then((r) => r.json()),
        fetch("/api/academics/combinations").then((r) => r.json()),
        fetch("/api/academics/class-subjects").then((r) => r.json()),
        fetch("/api/academics/teacher-assignments").then((r) => r.json()),
        fetch("/api/academics/timetable").then((r) => r.json()),
        fetch("/api/academics/teacher-workload").then((r) => r.json()),
      ]);

      if (statsRes?.data) setStats(statsRes.data);
      if (periodsRes?.data) setPeriods(periodsRes.data);
      if (roomsRes?.data) setRooms(roomsRes.data);
      if (curriculumsRes?.data) setCurriculums(curriculumsRes.data);
      if (combinationsRes?.data) setCombinations(combinationsRes.data);
      if (csRes?.data) setClassSubjects(csRes.data);
      if (taRes?.data) setTeachingAssignments(taRes.data);
      if (ttRes?.data) setTimetableLessons(ttRes.data);
      if (wlRes?.data) setWorkloadData(wlRes.data);

      // Lookups from admin
      if (adminRes?.data) {
        setCampuses(adminRes.data.campuses || []);
        setAcademicYears(adminRes.data.academicYears || []);
        setClasses(adminRes.data.classes || []);
        setSections(adminRes.data.sections || []);
        setSubjects(adminRes.data.subjects || []);
        setStaff(adminRes.data.staff || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteClassSubject = async (id: string) => {
    try {
      await fetch(`/api/academics/class-subjects/${id}`, { method: "DELETE" });
      fetchData();
    } catch {
      // Ignore
    }
  };

  const handleDeleteTeachingAssignment = async (id: string) => {
    try {
      await fetch(`/api/academics/teacher-assignments/${id}`, { method: "DELETE" });
      fetchData();
    } catch {
      // Ignore
    }
  };

  const handleDeleteTimetableLesson = async (id: string) => {
    try {
      await fetch(`/api/academics/timetable/${id}`, { method: "DELETE" });
      fetchData();
    } catch {
      // Ignore
    }
  };

  // Helper resolvers
  const getSubjectName = (id: string) => {
    const s = subjects.find((sub) => sub.id === id);
    return s ? `${s.name} (${s.code})` : id;
  };

  const getClassName = (id: string) => {
    const c = classes.find((cls) => cls.id === id);
    return c ? c.name : id;
  };

  const getStaffName = (id: string) => {
    const st = staff.find((s) => s.id === id);
    return st ? `${st.firstName} ${st.lastName}` : id;
  };

  const getRoomName = (id?: string | null) => {
    if (!id) return "Default Room";
    const r = rooms.find((rm) => rm.id === id);
    return r ? `${r.name}` : id;
  };

  const days: Array<"MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY"> = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-slate-900" />
            Academics & Teaching Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Curriculum frameworks, subject allocations, faculty assignments, bell schedules, and timetable matrix
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "allocations" && (
            <Button onClick={() => setAllocateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Allocate Subject
            </Button>
          )}
          {activeTab === "teachers" && (
            <Button onClick={() => setAssignTeacherModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Assign Teacher
            </Button>
          )}
          {activeTab === "timetable" && (
            <Button onClick={() => setScheduleModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Schedule Lesson Slot
            </Button>
          )}
          {activeTab === "schedule" && (
            <Button onClick={() => setPeriodModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Lesson Period
            </Button>
          )}
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto text-xs font-semibold">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "overview"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> Overview
        </button>

        <button
          onClick={() => setActiveTab("allocations")}
          className={`px-3.5 py-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "allocations"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" /> Subject Allocations
        </button>

        <button
          onClick={() => setActiveTab("teachers")}
          className={`px-3.5 py-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "teachers"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Users className="h-3.5 w-3.5" /> Teacher Assignments
        </button>

        <button
          onClick={() => setActiveTab("timetable")}
          className={`px-3.5 py-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "timetable"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" /> Timetable Matrix
        </button>

        <button
          onClick={() => setActiveTab("workload")}
          className={`px-3.5 py-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "workload"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" /> Faculty Workload
        </button>

        <button
          onClick={() => setActiveTab("curriculum")}
          className={`px-3.5 py-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "curriculum"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> Curriculum & Streams
        </button>

        <button
          onClick={() => setActiveTab("schedule")}
          className={`px-3.5 py-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === "schedule"
              ? "border-slate-900 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Clock className="h-3.5 w-3.5" /> Bell Schedule & Rooms
        </button>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 1. OVERVIEW & ANALYTICS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border border-slate-200 bg-white">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Subject Allocations
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {classSubjects.length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Core & elective courses</p>
            </div>

            <div className="p-4 border border-slate-200 bg-white">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Faculty Teaching
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {teachingAssignments.length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Active subject assignments</p>
            </div>

            <div className="p-4 border border-slate-200 bg-white">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Scheduled Lessons
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {timetableLessons.length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Weekly timetable slots</p>
            </div>

            <div className="p-4 border border-slate-200 bg-white">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                Physical Facilities
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {rooms.length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Classrooms & labs mapped</p>
            </div>
          </div>

          {/* Quick Access Matrix Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Curriculum & Subject Allocation
                </h3>
                <button
                  onClick={() => setActiveTab("allocations")}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                >
                  Manage <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Subjects are mapped per cohort level with credit units, weekly period targets, and compulsory/elective rules.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {classSubjects.slice(0, 4).map((cs) => (
                  <div key={cs.id} className="text-xs flex items-center justify-between py-1">
                    <span className="font-medium text-slate-800">{getSubjectName(cs.subjectId)}</span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {getClassName(cs.classId)} · {cs.ruleType} · {cs.periodsPerWeek} periods/wk
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Timetable Engine & Collision Guard
                </h3>
                <button
                  onClick={() => setActiveTab("timetable")}
                  className="text-xs text-slate-600 hover:text-slate-900 font-medium flex items-center gap-1"
                >
                  Inspect Matrix <ChevronRight className="h-3 w-3" />
                </button>
              </div>
              <p className="text-xs text-slate-500">
                Full-featured weekly scheduler with real-time prevention against teacher double-booking, room overlap, and class collisions.
              </p>
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                {timetableLessons.slice(0, 4).map((tt) => (
                  <div key={tt.id} className="text-xs flex items-center justify-between py-1">
                    <span className="font-medium text-slate-800">{getSubjectName(tt.subjectId)}</span>
                    <span className="text-slate-400 font-mono text-[11px]">
                      {tt.dayOfWeek} · {getStaffName(tt.staffId)} · {getRoomName(tt.roomId)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 2. CLASS SUBJECT ALLOCATIONS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "allocations" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 border border-slate-200">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="h-8 px-2 border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none"
              >
                <option value="">All Classes & Cohorts</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Button size="sm" onClick={() => setAllocateModalOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Allocate Subject
            </Button>
          </div>

          <div className="border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                  <th className="py-2.5 px-3">Subject Name</th>
                  <th className="py-2.5 px-3">Class Cohort</th>
                  <th className="py-2.5 px-3">Section Scope</th>
                  <th className="py-2.5 px-3">Category Rule</th>
                  <th className="py-2.5 px-3">Weekly Periods</th>
                  <th className="py-2.5 px-3">Credit Units</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classSubjects
                  .filter((cs) => !selectedClassId || cs.classId === selectedClassId)
                  .map((cs) => (
                    <tr key={cs.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {getSubjectName(cs.subjectId)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{getClassName(cs.classId)}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {cs.sectionId ? "Section Specific" : "Entire Class Cohort"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {cs.ruleType === "CORE" && <span className="text-slate-900 font-bold">CORE · Compulsory</span>}
                        {cs.ruleType === "ELECTIVE" && <span className="text-amber-800 font-medium">ELECTIVE · Stream</span>}
                        {cs.ruleType === "OPTIONAL" && <span className="text-slate-500">OPTIONAL · Free Choice</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-mono">{cs.periodsPerWeek} periods/wk</td>
                      <td className="py-2.5 px-3 text-slate-700 font-mono">{cs.creditUnits} credits</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteClassSubject(cs.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove allocation"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                {classSubjects.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No subjects allocated to this class cohort. Click "Allocate Subject" to begin.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 3. TEACHER ASSIGNMENTS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "teachers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 border border-slate-200">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="h-8 px-2 border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none"
              >
                <option value="">All Faculty Staff</option>
                {staff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.firstName} {st.lastName}
                  </option>
                ))}
              </select>
            </div>

            <Button size="sm" onClick={() => setAssignTeacherModalOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Assign Teacher
            </Button>
          </div>

          <div className="border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                  <th className="py-2.5 px-3">Faculty Teacher</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Class Cohort</th>
                  <th className="py-2.5 px-3">Section</th>
                  <th className="py-2.5 px-3">Weekly Load</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachingAssignments
                  .filter((ta) => !selectedTeacherId || ta.staffId === selectedTeacherId)
                  .map((ta) => (
                    <tr key={ta.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {getStaffName(ta.staffId)}
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">{getSubjectName(ta.subjectId)}</td>
                      <td className="py-2.5 px-3 text-slate-700">{getClassName(ta.classId)}</td>
                      <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                        {ta.sectionId ? "Specific Section" : "All Sections"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-mono">{ta.periodsPerWeek} periods/wk</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleDeleteTeachingAssignment(ta.id)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                          title="Remove assignment"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                {teachingAssignments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No teacher assignments recorded. Click "Assign Teacher" to link faculty to subjects.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 4. TIMETABLE MATRIX & CONFLICT INSPECTOR */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "timetable" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 border border-slate-200">
            <div className="flex items-center gap-3">
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="h-8 px-2 border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                className="h-8 px-2 border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none"
              >
                <option value="">All Teachers</option>
                {staff.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.firstName} {st.lastName}
                  </option>
                ))}
              </select>
            </div>

            <Button size="sm" onClick={() => setScheduleModalOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Schedule Lesson Slot
            </Button>
          </div>

          {/* Timetable Weekly Matrix Grid */}
          <div className="border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                  <th className="py-2.5 px-3 w-36 border-r border-slate-200">Period / Time</th>
                  {days.map((d) => (
                    <th key={d} className="py-2.5 px-3 border-r border-slate-200 last:border-r-0">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {periods.map((p) => {
                  if (p.isBreak) {
                    return (
                      <tr key={p.id} className="bg-slate-50/70">
                        <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-600 font-mono text-[11px]">
                          {p.name}
                          <span className="block text-slate-400 font-normal">
                            {p.startTime} – {p.endTime}
                          </span>
                        </td>
                        <td
                          colSpan={days.length}
                          className="py-2 px-3 text-center text-slate-400 italic text-[11px]"
                        >
                          Interval Recess / Dining Break
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                        <span className="font-semibold block">{p.name}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {p.startTime} – {p.endTime}
                        </span>
                      </td>

                      {days.map((day) => {
                        const matchingLessons = timetableLessons.filter(
                          (l) =>
                            l.periodId === p.id &&
                            l.dayOfWeek === day &&
                            (!selectedClassId || l.classId === selectedClassId) &&
                            (!selectedTeacherId || l.staffId === selectedTeacherId)
                        );

                        return (
                          <td
                            key={day}
                            className="py-2 px-2.5 border-r border-slate-200 last:border-r-0 align-top h-16"
                          >
                            {matchingLessons.map((l) => (
                              <div
                                key={l.id}
                                className="p-1.5 border border-slate-200 bg-white mb-1 relative group text-[11px]"
                              >
                                <p className="font-bold text-slate-900 truncate">
                                  {getSubjectName(l.subjectId)}
                                </p>
                                <p className="text-slate-600 truncate">{getClassName(l.classId)}</p>
                                <p className="text-slate-400 text-[10px] font-mono mt-0.5">
                                  {getStaffName(l.staffId)} · {getRoomName(l.roomId)}
                                </p>

                                <button
                                  onClick={() => handleDeleteTimetableLesson(l.id)}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity p-0.5"
                                  title="Delete slot"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            ))}

                            {matchingLessons.length === 0 && (
                              <span className="text-[10px] text-slate-300 font-mono">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 5. FACULTY WORKLOAD TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "workload" && (
        <div className="space-y-4">
          <div className="border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              Faculty Workload Distribution & Weekly Period Capacity
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Institutional teaching guidelines recommend 15 to 24 lesson periods per faculty member per week.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
                    <th className="py-2.5 px-3">Faculty Staff Member</th>
                    <th className="py-2.5 px-3">Weekly Assigned Periods</th>
                    <th className="py-2.5 px-3">Target Periods</th>
                    <th className="py-2.5 px-3">Classes Taught</th>
                    <th className="py-2.5 px-3">Unique Subjects</th>
                    <th className="py-2.5 px-3">Workload Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workloadData.map((wl) => (
                    <tr key={wl.staffId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {getStaffName(wl.staffId)}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                        {wl.weeklyPeriods} periods
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">20 periods/wk</td>
                      <td className="py-2.5 px-3 text-slate-700">{wl.classCount} classes</td>
                      <td className="py-2.5 px-3 text-slate-700">{wl.subjectCount} subjects</td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {wl.status === "OPTIMAL" && (
                          <span className="text-emerald-800 font-bold">OPTIMAL · 15–24 Periods</span>
                        )}
                        {wl.status === "UNDERLOADED" && (
                          <span className="text-amber-700 font-medium">UNDERLOADED · &lt; 15 Periods</span>
                        )}
                        {wl.status === "OVERLOADED" && (
                          <span className="text-rose-700 font-bold">OVERLOADED · &gt; 24 Periods</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {workloadData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No workload data calculated yet. Assign subjects to faculty staff.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 6. CURRICULUM & STREAMS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "curriculum" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Curriculum Frameworks
            </h3>
            <p className="text-xs text-slate-500">
              Institutional academic frameworks approved for curriculum delivery and grading models.
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              {curriculums.map((c) => (
                <div key={c.id} className="p-3 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{c.name}</span>
                    <span className="text-[11px] font-mono text-slate-500">v{c.version}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{c.description}</p>
                  <p className="text-[10px] text-slate-400 font-mono pt-1">
                    Code: {c.code} · Type: {c.type}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4" /> Subject Combinations & Academic Streams
            </h3>
            <p className="text-xs text-slate-500">
              Specialized academic tracks (Science, Arts, Commercial) defining compulsory and elective subject groupings.
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              {combinations.map((comb) => (
                <div key={comb.id} className="p-3 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900">{comb.name}</span>
                    <span className="text-[11px] font-mono text-slate-700">{comb.stream} Stream</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{comb.description}</p>
                  <div className="text-[11px] text-slate-400 font-mono pt-1">
                    Compulsory: {comb.compulsorySubjectIds.length} subjects · Electives: {comb.electiveSubjectIds.length} subjects
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------- */}
      {/* 7. BELL SCHEDULE & ROOMS TAB */}
      {/* ---------------------------------------------------------------------- */}
      {activeTab === "schedule" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4" /> Daily Bell Schedule (Periods)
              </h3>
              <Button size="sm" variant="outline" onClick={() => setPeriodModalOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add Period
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Configured daily bell periods governing class schedules, morning assemblies, and meal breaks.
            </p>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              {periods.map((p) => (
                <div
                  key={p.id}
                  className={`p-2.5 border text-xs flex items-center justify-between ${
                    p.isBreak ? "border-amber-200 bg-amber-50/50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div>
                    <span className="font-semibold text-slate-900">{p.name}</span>
                    <span className="text-slate-400 text-[11px] font-mono ml-2">
                      {p.startTime} – {p.endTime}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {p.isBreak ? "Recess / Break" : `Period #${p.periodNumber}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 bg-white p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Physical Facilities & Laboratories
            </h3>
            <p className="text-xs text-slate-500">
              Classrooms, science laboratories, ICT computing centers, and lecture halls for timetable allocation.
            </p>

            <div className="space-y-1.5 pt-2 border-t border-slate-100">
              {rooms.map((r) => (
                <div key={r.id} className="p-2.5 border border-slate-200 bg-white text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-slate-900">{r.name}</span>
                    <span className="text-slate-400 text-[11px] font-mono ml-2">{r.code}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {r.roomType} · Cap: {r.capacity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <AllocateSubjectModal
        open={allocateModalOpen}
        onOpenChange={setAllocateModalOpen}
        campuses={campuses}
        academicYears={academicYears}
        classes={classes}
        sections={sections}
        subjects={subjects}
        onSuccess={fetchData}
      />

      <AssignTeacherModal
        open={assignTeacherModalOpen}
        onOpenChange={setAssignTeacherModalOpen}
        campuses={campuses}
        academicYears={academicYears}
        classes={classes}
        sections={sections}
        subjects={subjects}
        staff={staff}
        onSuccess={fetchData}
      />

      <ScheduleLessonModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        campuses={campuses}
        academicYears={academicYears}
        classes={classes}
        sections={sections}
        subjects={subjects}
        staff={staff}
        periods={periods}
        rooms={rooms}
        onSuccess={fetchData}
      />

      <AddPeriodModal
        open={periodModalOpen}
        onOpenChange={setPeriodModalOpen}
        campusId={campuses[0]?.id || ""}
        onSuccess={fetchData}
      />
    </div>
  );
}
