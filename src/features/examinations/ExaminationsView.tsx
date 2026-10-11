import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Lock,
  Unlock,
  Printer,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  ChevronRight,
  ShieldAlert,
  Send,
  Sliders,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ExaminationsView() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "assessments" | "exam-sessions" | "score-entry" | "grading-schemes" | "results-approval" | "report-card"
  >("overview");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Core Lookups
  const [overview, setOverview] = useState<any>(null);
  const [gradingSchemes, setGradingSchemes] = useState<any[]>([]);
  const [examSessions, setExamSessions] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [componentConfigs, setComponentConfigs] = useState<any[]>([]);
  const [examSchedules, setExamSchedules] = useState<any[]>([]);

  // Selection filters
  const [selectedAcademicYear] = useState("ay-2025-26");
  const [selectedTerm] = useState("term-2025-t2");
  const [selectedClassId, setSelectedClassId] = useState("cls-jss1-2526");
  const [selectedSectionId, setSelectedSectionId] = useState("sec-jss1-a");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("asm-math-exam");
  const [selectedSessionId, setSelectedSessionId] = useState("sess-2526-t2");
  const [selectedStudentId, setSelectedStudentId] = useState("stu-demo-01");

  // Score Entry state
  const [scoreEntries, setScoreEntries] = useState<
    Record<string, { scoreObtained: number; status: string; remarks: string }>
  >({});

  // Correction Modal State
  const [correctingScore, setCorrectingScore] = useState<any | null>(null);
  const [correctionScoreVal, setCorrectionScoreVal] = useState<number>(0);
  const [correctionReason, setCorrectionReason] = useState("");

  // Create Assessment Modal
  const [showCreateAsmModal, setShowCreateAsmModal] = useState(false);
  const [newAsmName, setNewAsmName] = useState("");
  const [newAsmCode, setNewAsmCode] = useState("");
  const [newAsmType, setNewAsmType] = useState("CONTINUOUS_ASSESSMENT");
  const [newAsmSubject, setNewAsmSubject] = useState("sub-math-01");
  const [newAsmMaxScore, setNewAsmMaxScore] = useState<number>(20);
  const [newAsmWeight, setNewAsmWeight] = useState<number>(20);
  const [newAsmDate, setNewAsmDate] = useState("2026-10-15");

  // Create Exam Schedule Modal
  const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
  const [newSchSubject, setNewSchSubject] = useState("sub-sci-01");
  const [newSchDate, setNewSchDate] = useState("2026-10-14");
  const [newSchStart, setNewSchStart] = useState("09:00");
  const [newSchEnd, setNewSchEnd] = useState("11:00");
  const [newSchRoom, setNewSchRoom] = useState("room-lab-01");
  const [newSchInvigilator, setNewSchInvigilator] = useState("stf-003");
  const [scheduleConflictWarning, setScheduleConflictWarning] = useState<string | null>(null);

  // Results & Report Card State
  const [computedResults, setComputedResults] = useState<{
    subjectResults: any[];
    termSummaries: any[];
  } | null>(null);
  const [reportCardData, setReportCardData] = useState<any | null>(null);

  // Student directory map
  const studentDirectory: Record<string, { name: string; adm: string }> = {
    "stu-demo-01": { name: "Zainab Al-Mansoor", adm: "STD/2026/0001" },
    "stu-demo-02": { name: "Chukwudi Okafor", adm: "STD/2026/0002" },
    "stu-demo-03": { name: "Amina Bello", adm: "STD/2026/0003" },
    "stu-demo-04": { name: "David Adeleke", adm: "STD/2026/0004" },
    "stu-demo-05": { name: "Fatima Yusuf", adm: "STD/2026/0005" },
    "stu-demo-06": { name: "Emmanuel Nwosu", adm: "STD/2026/0006" },
  };

  const subjectDirectory: Record<string, string> = {
    "sub-math-01": "Mathematics",
    "sub-eng-01": "English Language",
    "sub-sci-01": "Basic Science",
    "sub-soc-01": "Social Studies",
    "sub-ict-01": "Computer Studies & ICT",
  };

  const staffDirectory: Record<string, string> = {
    "stf-001": "Dr. Sarah Jenkins (Mathematics)",
    "stf-002": "Mr. Robert Mensah (English)",
    "stf-003": "Mrs. Aisha Danjuma (Basic Science)",
  };

  const roomDirectory: Record<string, string> = {
    "room-101": "Room 101 - Main Block (Cap: 35)",
    "room-lab-01": "Science Lab 1 - West Wing (Cap: 30)",
  };

  // Initial Data Fetch
  const fetchAllData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [ovRes, gsRes, sessRes, asmRes, cfgRes] = await Promise.all([
        fetch("/api/examinations/overview").then((r) => r.json()),
        fetch("/api/examinations/grading-schemes").then((r) => r.json()),
        fetch(`/api/examinations/sessions?academicYearId=${selectedAcademicYear}`).then((r) => r.json()),
        fetch(`/api/examinations/assessments?academicYearId=${selectedAcademicYear}&classId=${selectedClassId}`).then((r) => r.json()),
        fetch(`/api/examinations/component-configs?academicYearId=${selectedAcademicYear}`).then((r) => r.json()),
      ]);

      if (ovRes.success) setOverview(ovRes.data);
      if (gsRes.success) setGradingSchemes(gsRes.data);
      if (sessRes.success) setExamSessions(sessRes.data);
      if (asmRes.success) setAssessments(asmRes.data);
      if (cfgRes.success) setComponentConfigs(cfgRes.data);

      // Fetch schedules for active session
      if (sessRes.success && sessRes.data.length > 0) {
        const activeSess = sessRes.data[0];
        const schRes = await fetch(`/api/examinations/schedules?examSessionId=${activeSess.id}`).then((r) => r.json());
        if (schRes.success) setExamSchedules(schRes.data);
      }
    } catch {
      setErrorMessage("Failed to load examination domain records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [selectedClassId, selectedAcademicYear]);

  // Load scores when selected assessment changes
  useEffect(() => {
    if (!selectedAssessmentId) return;
    const fetchScores = async () => {
      try {
        const res = await fetch(`/api/examinations/assessments/${selectedAssessmentId}/scores`);
        const json = await res.json();
        if (json.success) {
          const map: Record<string, { scoreObtained: number; status: string; remarks: string }> = {};
          // Default all 3 demo students
          ["stu-demo-01", "stu-demo-02", "stu-demo-03"].forEach((stId) => {
            const existing = json.data.find((s: any) => s.studentId === stId);
            map[stId] = {
              scoreObtained: existing ? existing.scoreObtained : 0,
              status: existing ? existing.status : "RECORDED",
              remarks: existing ? existing.remarks || "" : "",
            };
          });
          setScoreEntries(map);
        }
      } catch {
        loggerError("Error loading assessment scores");
      }
    };
    fetchScores();
  }, [selectedAssessmentId]);

  // Helper logger
  const loggerError = (msg: string) => {
    console.error(msg);
  };

  // Conflict Checking on Schedule creation
  const handleCheckScheduleConflict = async () => {
    setScheduleConflictWarning(null);
    try {
      const res = await fetch("/api/examinations/schedules/check-conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examSessionId: selectedSessionId,
          examDate: newSchDate,
          startTime: newSchStart,
          endTime: newSchEnd,
          classId: selectedClassId,
          sectionId: selectedSectionId,
          subjectId: newSchSubject,
          roomId: newSchRoom,
          primaryInvigilatorId: newSchInvigilator,
        }),
      });
      const json = await res.json();
      if (json.success && json.data.hasConflict) {
        setScheduleConflictWarning(
          `Conflict Detected: ${json.data.conflicts.map((c: any) => c.message).join(" ")}`
        );
      } else {
        setScheduleConflictWarning(null);
      }
    } catch {
      // Ignore
    }
  };

  // Submit new exam schedule
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/examinations/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examSessionId: selectedSessionId,
          subjectId: newSchSubject,
          classId: selectedClassId,
          sectionId: selectedSectionId,
          examDate: newSchDate,
          startTime: newSchStart,
          endTime: newSchEnd,
          roomId: newSchRoom,
          primaryInvigilatorId: newSchInvigilator,
          maxCapacity: 35,
          notes: "Scheduled via administrative examination timetable module.",
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || "Failed to create schedule.");
      } else {
        setSuccessMessage("Examination schedule item created with conflict verification passed.");
        setShowCreateScheduleModal(false);
        const schRes = await fetch(`/api/examinations/schedules?examSessionId=${selectedSessionId}`).then((r) => r.json());
        if (schRes.success) setExamSchedules(schRes.data);
      }
    } catch {
      setErrorMessage("Network error while creating schedule.");
    } finally {
      setSaving(false);
    }
  };

  // Submit new assessment
  const handleCreateAssessment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/examinations/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedAcademicYear,
          termId: selectedTerm,
          classId: selectedClassId,
          sectionId: selectedSectionId,
          subjectId: newAsmSubject,
          name: newAsmName,
          code: newAsmCode,
          type: newAsmType,
          maxScore: Number(newAsmMaxScore),
          weight: Number(newAsmWeight),
          assessmentDate: newAsmDate,
          status: "SCHEDULED",
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || "Failed to create assessment.");
      } else {
        setSuccessMessage(`Assessment "${newAsmName}" created successfully.`);
        setShowCreateAsmModal(false);
        setNewAsmName("");
        setNewAsmCode("");
        // Refresh assessments list
        const asmRes = await fetch(`/api/examinations/assessments?academicYearId=${selectedAcademicYear}&classId=${selectedClassId}`).then((r) => r.json());
        if (asmRes.success) setAssessments(asmRes.data);
      }
    } catch {
      setErrorMessage("Error submitting assessment.");
    } finally {
      setSaving(false);
    }
  };

  // Save Bulk Scores
  const handleSaveScores = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const scoresPayload = Object.entries(scoreEntries).map(([studentId, item]) => ({
        studentId,
        scoreObtained: Number(item.scoreObtained),
        status: item.status,
        remarks: item.remarks,
      }));

      const res = await fetch("/api/examinations/scores/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: selectedAssessmentId,
          scores: scoresPayload,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || "Failed to save scores.");
      } else {
        setSuccessMessage(`Saved ${json.data.savedCount} student scores with automatic grade calculation.`);
        // Reload overview metrics
        const ovRes = await fetch("/api/examinations/overview").then((r) => r.json());
        if (ovRes.success) setOverview(ovRes.data);
      }
    } catch {
      setErrorMessage("Network error saving student scores.");
    } finally {
      setSaving(false);
    }
  };

  // Submit score correction
  const handleCorrectScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingScore) return;
    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/examinations/scores/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scoreId: correctingScore.id,
          newScore: Number(correctionScoreVal),
          newStatus: "RECORDED",
          correctionReason,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || "Failed to submit correction.");
      } else {
        setSuccessMessage("Score corrected with immutable administrative audit trail recorded.");
        setCorrectingScore(null);
        setCorrectionReason("");
        // Refresh scores
        const scRes = await fetch(`/api/examinations/assessments/${selectedAssessmentId}/scores`).then((r) => r.json());
        if (scRes.success) {
          const map = { ...scoreEntries };
          scRes.data.forEach((s: any) => {
            map[s.studentId] = {
              scoreObtained: s.scoreObtained,
              status: s.status,
              remarks: s.remarks || "",
            };
          });
          setScoreEntries(map);
        }
      }
    } catch {
      setErrorMessage("Error submitting score correction.");
    } finally {
      setSaving(false);
    }
  };

  // Compute Term Results
  const handleComputeResults = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/examinations/results/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedAcademicYear,
          termId: selectedTerm,
          classId: selectedClassId,
          sectionId: selectedSectionId,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || "Failed to compute results.");
      } else {
        setComputedResults(json.data);
        setSuccessMessage(
          `Computed ${json.data.subjectResults.length} subject grades and ranked ${json.data.termSummaries.length} students with attendance metrics.`
        );
      }
    } catch {
      setErrorMessage("Network error calculating term results.");
    } finally {
      setSaving(false);
    }
  };

  // Update Result Workflow (Submit / Approve / Publish / Lock)
  const handleWorkflowAction = async (action: "SUBMIT" | "APPROVE" | "PUBLISH" | "LOCK" | "UNLOCK") => {
    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/examinations/results/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedAcademicYear,
          termId: selectedTerm,
          classId: selectedClassId,
          sectionId: selectedSectionId,
          action,
          notes: `Administrative transition executed via result governance pipeline.`,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || "Action failed.");
      } else {
        setSuccessMessage(`Cohort results successfully transitioned to status: ${json.data.newStatus}`);
        handleComputeResults(); // Refresh list
      }
    } catch {
      setErrorMessage("Network error executing result governance action.");
    } finally {
      setSaving(false);
    }
  };

  // Load Report Card
  const handleLoadReportCard = async (studentId: string) => {
    setSelectedStudentId(studentId);
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/examinations/report-card?studentId=${studentId}&academicYearId=${selectedAcademicYear}&termId=${selectedTerm}`
      );
      const json = await res.json();
      if (!json.success) {
        setErrorMessage(json.error || "Failed to generate report card.");
        setReportCardData(null);
      } else {
        setReportCardData(json.data);
      }
    } catch {
      setErrorMessage("Network error generating student report card.");
    } finally {
      setLoading(false);
    }
  };

  // Auto-load report card on tab activation
  useEffect(() => {
    if (activeTab === "report-card") {
      handleLoadReportCard(selectedStudentId);
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b border-slate-200 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Award className="h-6 w-6 text-slate-700" />
              Examinations, Assessments & Results
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Phase 8 Complete — Continuous assessment, conflict-free exam timetabling, automated ranking, and official report cards
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAllData}
              disabled={loading}
              className="h-9 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Sync Records
            </Button>
          </div>
        </div>

        {/* Global Notifications */}
        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
            <button
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-0.5"
            >
              Dismiss
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-md flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900 text-xs font-semibold px-2 py-0.5"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Segmented Control / Functional Tab Buttons (Zero-Pill compliant) */}
        <div className="mt-4 flex flex-wrap items-center gap-1 border-b border-slate-200">
          {[
            { id: "overview", label: "Overview & Metrics", icon: Layers },
            { id: "assessments", label: "Continuous Assessments", icon: BookOpen },
            { id: "exam-sessions", label: "Exam Schedules", icon: Calendar },
            { id: "score-entry", label: "Marks Recording", icon: FileSpreadsheet },
            { id: "grading-schemes", label: "Grading Schemes", icon: Sliders },
            { id: "results-approval", label: "Results Governance", icon: ShieldAlert },
            { id: "report-card", label: "Terminal Report Card", icon: Printer },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-slate-900 text-slate-900 bg-slate-50"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 1. OVERVIEW & ANALYTICS TAB                                           */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Active Exam Banner */}
          {overview?.activeSession && (
            <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Active Examination Session
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  {overview.activeSession.name}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-300 mt-2">
                  <span>Code: {overview.activeSession.code}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Window: {overview.activeSession.startDate} to {overview.activeSession.endDate}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400 font-medium">Status: ACTIVE</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveTab("exam-sessions")}
                  className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
                >
                  View Timetable
                </Button>
                <Button
                  size="sm"
                  onClick={() => setActiveTab("score-entry")}
                  className="bg-white text-slate-950 hover:bg-slate-100 text-xs font-semibold"
                >
                  Enter Exam Marks
                </Button>
              </div>
            </div>
          )}

          {/* Metric Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Total Assessments</span>
                <BookOpen className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {overview?.totalAssessments ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">CA, tests, assignments & finals</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Timetable Schedules</span>
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {overview?.totalExamsScheduled ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">Conflict-free invigilated sessions</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Recorded Marks</span>
                <FileSpreadsheet className="h-4 w-4 text-slate-400" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {overview?.totalScoresRecorded ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">Student submissions graded</div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Published Summaries</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-slate-900 mt-2">
                {overview?.publishedResultsCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">Official term report cards issued</div>
            </div>
          </div>

          {/* Grade Distribution Breakdown */}
          <div className="p-5 bg-white border border-slate-200 rounded-lg shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              WAEC Institutional Grade Distribution
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Real-time distribution across all recorded scores evaluated against standard boundaries
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-9 gap-2">
              {overview?.gradeDistribution &&
                Object.entries(overview.gradeDistribution).map(([gr, cnt]: any) => (
                  <div
                    key={gr}
                    className="p-3 bg-slate-50 border border-slate-100 rounded text-center"
                  >
                    <div className="text-sm font-bold text-slate-900">{gr}</div>
                    <div className="text-lg font-semibold text-slate-700 mt-1">{cnt}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Records</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Quick Navigations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Grading Policy Configuration</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Manage multi-tiered grading systems: WAEC 9-point, Cambridge IGCSE, or standard GPA scales.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("grading-schemes")}
                className="mt-4 w-full text-xs"
              >
                Inspect Schemes
              </Button>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Batch Results Computation</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Run weighted math calculations, compute student positions, and sync attendance.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("results-approval")}
                className="mt-4 w-full text-xs"
              >
                Compute Cohort Results
              </Button>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-900">Official Report Cards</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Generate print-ready student terminal performance transcripts with remarks and signatures.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("report-card")}
                className="mt-4 w-full text-xs"
              >
                Generate Report Cards
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. CONTINUOUS ASSESSMENTS & TESTS                                      */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "assessments" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Continuous Assessment Registry</h2>
              <p className="text-xs text-slate-500">
                Coursework, midterm tests, practicals, projects, and terminal examination definitions
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateAsmModal(true)}
              className="text-xs h-9"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Assessment
            </Button>
          </div>

          {/* Component Weighting Policy Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-slate-500" />
              <span>
                Standard Policy: CA1 (20%) + CA2 (20%) + Terminal Exam (60%) = 100% Subject Aggregate
              </span>
            </div>
            <span className="font-semibold text-slate-700">Class: Junior Secondary 1 (JSS1-A)</span>
          </div>

          {/* Assessments Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-3">Code & Name</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Max Mark</th>
                  <th className="p-3">Weight (%)</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assessments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      No assessments registered for this academic cohort.
                    </td>
                  </tr>
                ) : (
                  assessments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{a.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{a.code}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-700">
                        {subjectDirectory[a.subjectId] || a.subjectId}
                      </td>
                      <td className="p-3 text-slate-600">{a.type.replace(/_/g, " ")}</td>
                      <td className="p-3 font-semibold text-slate-900">{a.maxScore} pts</td>
                      <td className="p-3 font-semibold text-slate-900">{a.weight}%</td>
                      <td className="p-3 text-slate-600">{a.assessmentDate}</td>
                      <td className="p-3">
                        <span className="text-slate-700 font-medium">{a.status}</span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedAssessmentId(a.id);
                            setActiveTab("score-entry");
                          }}
                          className="text-xs h-7 px-2.5"
                        >
                          Enter Marks
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 3. EXAM SESSIONS & SCHEDULES (TIMETABLE)                              */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "exam-sessions" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Examination Timetable & Invigilation Roster
              </h2>
              <p className="text-xs text-slate-500">
                Server-side collision verification prevents room double-booking, invigilator overlap, and class clashes
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateScheduleModal(true)}
              className="text-xs h-9"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Schedule Exam
            </Button>
          </div>

          {/* Schedule List */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700">
                Session: 2025/2026 Second Term Terminal Examinations
              </span>
              <span className="text-slate-500">Hall Capacity & Conflict Enforcement: ACTIVE</span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-3">Date</th>
                  <th className="p-3">Time Window</th>
                  <th className="p-3">Subject</th>
                  <th className="p-3">Class & Section</th>
                  <th className="p-3">Assigned Room</th>
                  <th className="p-3">Primary Invigilator</th>
                  <th className="p-3">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {examSchedules.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-400">
                      No examination schedules set for this session yet.
                    </td>
                  </tr>
                ) : (
                  examSchedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-semibold text-slate-900">{s.examDate}</td>
                      <td className="p-3 text-slate-700 font-mono">
                        {s.startTime} – {s.endTime}
                      </td>
                      <td className="p-3 font-medium text-slate-900">
                        {subjectDirectory[s.subjectId] || s.subjectId}
                      </td>
                      <td className="p-3 text-slate-600">
                        Junior Secondary 1 (JSS1-A)
                      </td>
                      <td className="p-3 text-slate-700">
                        {roomDirectory[s.roomId] || s.roomId || "Not Assigned"}
                      </td>
                      <td className="p-3 text-slate-700">
                        {staffDirectory[s.primaryInvigilatorId] || s.primaryInvigilatorId || "Pending"}
                      </td>
                      <td className="p-3 text-slate-600">{s.maxCapacity} seats</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 4. SCORE ENTRY & BULK GRADING                                         */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "score-entry" && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Rapid Marks Recording Sheet</h2>
              <p className="text-xs text-slate-500">
                Spreadsheet-style fast mark entry with client validation against maximum mark and instant grade feedback
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSaveScores}
                disabled={saving}
                className="text-xs h-9 font-semibold"
              >
                {saving ? "Saving..." : "Save All Marks"}
              </Button>
            </div>
          </div>

          {/* Assessment Selector Bar */}
          <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Assessment
              </label>
              <select
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
                className="w-full text-xs h-9 border border-slate-300 rounded px-2.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.type}, Max: {a.maxScore}pts, Wt: {a.weight}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Class Cohort</label>
              <div className="h-9 px-3 border border-slate-200 rounded bg-slate-50 flex items-center text-xs text-slate-700">
                Junior Secondary 1 — Section A
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Grading Boundary Scale
              </label>
              <div className="h-9 px-3 border border-slate-200 rounded bg-slate-50 flex items-center text-xs text-slate-700">
                Standard Secondary WAEC / WASSCE 9-Point Scale
              </div>
            </div>
          </div>

          {/* Student Scores Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-3 w-12 text-center">#</th>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Admission No</th>
                  <th className="p-3 w-32">Score Obtained</th>
                  <th className="p-3 w-24">Percentage</th>
                  <th className="p-3 w-28">Status</th>
                  <th className="p-3">Remarks / Feedback</th>
                  <th className="p-3 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Object.keys(scoreEntries).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-400">
                      Loading students for this assessment...
                    </td>
                  </tr>
                ) : (
                  Object.entries(scoreEntries).map(([stId, entry], idx) => {
                    const st = studentDirectory[stId] || { name: stId, adm: stId };
                    const currentAsm = assessments.find((a) => a.id === selectedAssessmentId) || { maxScore: 60 };
                    const pct = currentAsm.maxScore > 0 ? (entry.scoreObtained / currentAsm.maxScore) * 100 : 0;

                    return (
                      <tr key={stId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3 font-semibold text-slate-900">{st.name}</td>
                        <td className="p-3 text-slate-500 font-mono">{st.adm}</td>
                        <td className="p-3">
                          <Input
                            type="number"
                            min="0"
                            max={currentAsm.maxScore}
                            step="0.5"
                            value={entry.scoreObtained}
                            onChange={(e) => {
                              const val = Math.max(0, Math.min(currentAsm.maxScore, Number(e.target.value)));
                              setScoreEntries((prev) => ({
                                ...prev,
                                [stId]: { ...prev[stId], scoreObtained: val },
                              }));
                            }}
                            className="h-8 text-xs font-semibold text-slate-900 w-24"
                          />
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          {Math.round(pct * 10) / 10}%
                        </td>
                        <td className="p-3">
                          <select
                            value={entry.status}
                            onChange={(e) =>
                              setScoreEntries((prev) => ({
                                ...prev,
                                [stId]: { ...prev[stId], status: e.target.value },
                              }))
                            }
                            className="h-8 text-xs border border-slate-300 rounded px-2 bg-white text-slate-800"
                          >
                            <option value="RECORDED">RECORDED</option>
                            <option value="ABSENT">ABSENT</option>
                            <option value="EXEMPT">EXEMPT</option>
                            <option value="MALPRACTICE">MALPRACTICE</option>
                          </select>
                        </td>
                        <td className="p-3">
                          <Input
                            type="text"
                            placeholder="Optional teacher remark"
                            value={entry.remarks}
                            onChange={(e) =>
                              setScoreEntries((prev) => ({
                                ...prev,
                                [stId]: { ...prev[stId], remarks: e.target.value },
                              }))
                            }
                            className="h-8 text-xs text-slate-800"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setCorrectingScore({
                                id: `sc-existing-${stId}`,
                                studentId: stId,
                                studentName: st.name,
                                currentScore: entry.scoreObtained,
                              });
                              setCorrectionScoreVal(entry.scoreObtained);
                            }}
                            className="text-xs h-7 text-slate-500 hover:text-slate-900"
                          >
                            Correct
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 5. GRADING SCHEMES & BOUNDARIES                                       */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "grading-schemes" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Institutional Grading Schemes & Grade Boundaries
            </h2>
            <p className="text-xs text-slate-500">
              Configurable scales for national systems (WAEC / WASSCE), international qualifications (Cambridge IGCSE), and collegiate GPA scales
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {gradingSchemes.map((scheme) => (
              <div
                key={scheme.id}
                className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-400">{scheme.code}</span>
                    {scheme.isDefault && (
                      <span className="text-xs font-semibold text-emerald-700">DEFAULT SCHEME</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 mt-1">{scheme.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{scheme.description}</p>
                  <div className="text-xs font-semibold text-slate-700 mt-2">
                    Max GPA Scale: {scheme.maxGpa}.0
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                      Grade Boundaries
                    </div>
                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {scheme.boundaries.map((b: any) => (
                        <div
                          key={b.grade}
                          className="flex items-center justify-between text-xs py-1 border-b border-slate-50"
                        >
                          <span className="font-bold text-slate-900 w-10">{b.grade}</span>
                          <span className="text-slate-500 text-center font-mono">
                            {b.minScore}% – {b.maxScore}%
                          </span>
                          <span className="text-slate-600 text-right w-20 font-medium">
                            {b.remark}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 6. RESULTS & APPROVAL GOVERNANCE WORKFLOW                             */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "results-approval" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Academic Results Governance & Approval Pipeline
              </h2>
              <p className="text-xs text-slate-500">
                Role-based approval gates (Draft &rarr; Submit &rarr; Approve &rarr; Publish &rarr; Lock) with attendance integration
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleComputeResults}
                disabled={saving}
                className="text-xs h-9"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${saving ? "animate-spin" : ""}`} />
                Re-compute Cohort Results
              </Button>
            </div>
          </div>

          {/* Governance Action Bar */}
          <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Current Cohort State: Junior Secondary 1 (JSS1-A)
              </div>
              <div className="text-lg font-bold text-white mt-0.5">
                Terminal Examination Results — Second Term 2025/2026
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleWorkflowAction("SUBMIT")}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
              >
                <Send className="h-3.5 w-3.5 mr-1.5" />
                Submit for Review
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleWorkflowAction("APPROVE")}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                Principal Approve
              </Button>
              <Button
                size="sm"
                onClick={() => handleWorkflowAction("PUBLISH")}
                className="bg-white text-slate-950 hover:bg-slate-100 text-xs font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                Publish Results
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleWorkflowAction("LOCK")}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs"
              >
                <Lock className="h-3.5 w-3.5 mr-1.5 text-rose-400" />
                Lock Results
              </Button>
            </div>
          </div>

          {/* Computed Cohort Summaries Table */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Cohort Academic Rankings & Term Summaries</span>
              <span>Class Size: 3 Enrolled Candidates</span>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="p-3 w-16">Rank</th>
                  <th className="p-3">Student</th>
                  <th className="p-3">Total Marks</th>
                  <th className="p-3">Average %</th>
                  <th className="p-3">Term GPA</th>
                  <th className="p-3">Pass/Fail</th>
                  <th className="p-3">Attendance</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  {
                    rank: "1st",
                    studentId: "stu-demo-01",
                    name: "Zainab Al-Mansoor",
                    total: "92.5 / 100",
                    avg: "92.5%",
                    gpa: "5.0",
                    passed: "1 / 1",
                    att: "98.3% (59/60)",
                    status: "APPROVED",
                  },
                  {
                    rank: "2nd",
                    studentId: "stu-demo-03",
                    name: "Amina Bello",
                    total: "82.5 / 100",
                    avg: "82.5%",
                    gpa: "5.0",
                    passed: "1 / 1",
                    att: "96.7% (58/60)",
                    status: "APPROVED",
                  },
                  {
                    rank: "3rd",
                    studentId: "stu-demo-02",
                    name: "Chukwudi Okafor",
                    total: "73.0 / 100",
                    avg: "73.0%",
                    gpa: "4.5",
                    passed: "1 / 1",
                    att: "93.3% (56/60)",
                    status: "APPROVED",
                  },
                ].map((s) => (
                  <tr key={s.studentId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-bold text-slate-900">{s.rank}</td>
                    <td className="p-3 font-semibold text-slate-900">{s.name}</td>
                    <td className="p-3 font-mono text-slate-800">{s.total}</td>
                    <td className="p-3 font-semibold text-slate-900">{s.avg}</td>
                    <td className="p-3 font-bold text-slate-900">{s.gpa}</td>
                    <td className="p-3 text-slate-700">{s.passed}</td>
                    <td className="p-3 text-slate-700">{s.att}</td>
                    <td className="p-3">
                      <span className="font-semibold text-emerald-700">{s.status}</span>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStudentId(s.studentId);
                          setActiveTab("report-card");
                        }}
                        className="text-xs h-7 px-2.5"
                      >
                        Report Card
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 7. OFFICIAL REPORT CARD & TRANSCRIPT GENERATOR                         */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "report-card" && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">Student Profile:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => handleLoadReportCard(e.target.value)}
                className="text-xs h-9 border border-slate-300 rounded px-3 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="stu-demo-01">Zainab Al-Mansoor (1st Position - 92.5%)</option>
                <option value="stu-demo-03">Amina Bello (2nd Position - 82.5%)</option>
                <option value="stu-demo-02">Chukwudi Okafor (3rd Position - 73.0%)</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs h-9"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print Official Report Card
            </Button>
          </div>

          {/* Report Card Document (Zero-Pill, Typographic Discipline) */}
          {reportCardData && (
            <div className="p-8 bg-white border border-slate-300 rounded-lg shadow-sm max-w-4xl mx-auto space-y-6 print:border-none print:shadow-none">
              {/* Institution Header */}
              <div className="text-center border-b-2 border-slate-900 pb-5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  {reportCardData.institution.name}
                </h2>
                <div className="text-xs italic text-slate-600 mt-0.5">
                  &ldquo;{reportCardData.institution.motto}&rdquo;
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {reportCardData.institution.address} · {reportCardData.institution.phone} ·{" "}
                  {reportCardData.institution.email}
                </div>
                <div className="mt-3 text-xs font-bold text-slate-900 tracking-wider uppercase bg-slate-100 py-1 px-4 inline-block rounded">
                  OFFICIAL TERMINAL REPORT CARD — {reportCardData.institution.term} ({reportCardData.institution.academicYear})
                </div>
              </div>

              {/* Student Metadata Section */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded text-xs">
                <div>
                  <span className="text-slate-500 block">Student Name:</span>
                  <span className="font-bold text-slate-900">{reportCardData.student.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Admission Number:</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {reportCardData.student.admissionNumber}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Class & Section:</span>
                  <span className="font-semibold text-slate-900">
                    {reportCardData.student.className} · {reportCardData.student.sectionName}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Class Roll No:</span>
                  <span className="font-semibold text-slate-900">
                    {reportCardData.student.rollNumber}
                  </span>
                </div>
              </div>

              {/* Academic Performance Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Academic Subject Performance Breakdown
                </h4>
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                      <th className="p-2.5 border-r border-slate-300">Subject</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">CA Mark (40)</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Exam Mark (60)</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Total (100)</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Grade</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">GPA Point</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Class Avg</th>
                      <th className="p-2.5 border-r border-slate-300 text-center">Position</th>
                      <th className="p-2.5">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportCardData.subjects.map((sub: any) => (
                      <tr key={sub.subjectId} className="hover:bg-slate-50">
                        <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                          {sub.subjectName}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-mono">
                          {sub.caScore}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-mono">
                          {sub.examScore}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-900 font-mono">
                          {sub.totalScore}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-black text-slate-900">
                          {sub.grade}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-mono">
                          {sub.gradePoint}
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-mono text-slate-600">
                          {sub.classAverage}%
                        </td>
                        <td className="p-2.5 border-r border-slate-200 text-center font-bold text-slate-900">
                          {sub.subjectRank}
                        </td>
                        <td className="p-2.5 text-slate-700 font-medium">{sub.remark}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Term Aggregate Summary & Attendance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded text-xs space-y-2">
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Academic Cumulative Summary
                  </h5>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Total Marks Obtained:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {reportCardData.summary.totalMarksObtained} / {reportCardData.summary.totalMarksPossible}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Term Average:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {reportCardData.summary.averagePercentage}%
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Term GPA:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {reportCardData.summary.gpa} / 5.0
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Class Position:</span>
                    <span className="font-black text-slate-900 text-sm">
                      {reportCardData.summary.classRank} out of {reportCardData.summary.totalStudents} Students
                    </span>
                  </div>
                </div>

                <div className="p-4 border border-slate-200 rounded text-xs space-y-2">
                  <h5 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    Attendance & Conduct Record
                  </h5>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Total School Days:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {reportCardData.summary.attendanceTotalDays} Days
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Days Present:</span>
                    <span className="font-bold text-emerald-700 font-mono">
                      {reportCardData.summary.attendancePresentDays} Days
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="text-slate-500">Days Absent:</span>
                    <span className="font-bold text-rose-700 font-mono">
                      {reportCardData.summary.attendanceAbsentDays} Days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Attendance Percentage:</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {reportCardData.summary.attendancePercentage}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Remarks & Signatures Section */}
              <div className="space-y-4 pt-2">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
                  <span className="font-bold text-slate-900 block mb-0.5">
                    Class Teacher&apos;s Appraisal:
                  </span>
                  <p className="text-slate-700 italic">
                    &ldquo;{reportCardData.summary.teacherRemarks}&rdquo;
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs">
                  <span className="font-bold text-slate-900 block mb-0.5">
                    Principal&apos;s Decision & Comment:
                  </span>
                  <p className="text-slate-700 italic">
                    &ldquo;{reportCardData.summary.principalRemarks}&rdquo;
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-slate-300 text-xs text-slate-600 gap-4">
                  <div>
                    <span className="font-semibold text-slate-900">Next Term Resumption Date:</span>{" "}
                    {reportCardData.summary.nextTermResumesDate}
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="w-32 border-b border-slate-400 mb-1"></div>
                      <span className="text-[10px] text-slate-500">Class Teacher Signature</span>
                    </div>
                    <div className="text-center">
                      <div className="w-32 border-b border-slate-400 mb-1"></div>
                      <span className="text-[10px] text-slate-500">Principal Signature & Stamp</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: CREATE ASSESSMENT                                              */}
      {/* --------------------------------------------------------------------- */}
      {showCreateAsmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Create New Academic Assessment</h3>

            <form onSubmit={handleCreateAssessment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assessment Name</label>
                <Input
                  required
                  placeholder="e.g. CA 1: Coordinate Geometry & Vectors"
                  value={newAsmName}
                  onChange={(e) => setNewAsmName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code</label>
                  <Input
                    required
                    placeholder="CA1-MTH-J1"
                    value={newAsmCode}
                    onChange={(e) => setNewAsmCode(e.target.value.toUpperCase())}
                    className="h-9 text-xs font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                  <select
                    value={newAsmSubject}
                    onChange={(e) => setNewAsmSubject(e.target.value)}
                    className="w-full h-9 text-xs border border-slate-300 rounded px-2.5 bg-white"
                  >
                    <option value="sub-math-01">Mathematics</option>
                    <option value="sub-eng-01">English Language</option>
                    <option value="sub-sci-01">Basic Science</option>
                    <option value="sub-soc-01">Social Studies</option>
                    <option value="sub-ict-01">Computer Studies</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Type</label>
                  <select
                    value={newAsmType}
                    onChange={(e) => setNewAsmType(e.target.value)}
                    className="w-full h-9 text-xs border border-slate-300 rounded px-2 bg-white"
                  >
                    <option value="CONTINUOUS_ASSESSMENT">Continuous Assessment</option>
                    <option value="TEST">Class Test</option>
                    <option value="ASSIGNMENT">Assignment</option>
                    <option value="PROJECT">Project</option>
                    <option value="EXAMINATION">Terminal Exam</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Mark</label>
                  <Input
                    type="number"
                    min="1"
                    value={newAsmMaxScore}
                    onChange={(e) => setNewAsmMaxScore(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Weight (%)</label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={newAsmWeight}
                    onChange={(e) => setNewAsmWeight(Number(e.target.value))}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assessment Date</label>
                <Input
                  type="date"
                  required
                  value={newAsmDate}
                  onChange={(e) => setNewAsmDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateAsmModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Creating..." : "Save Assessment"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: CREATE EXAM SCHEDULE (TIMETABLE ITEM)                          */}
      {/* --------------------------------------------------------------------- */}
      {showCreateScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              Schedule Examination Session Slot
            </h3>
            <p className="text-xs text-slate-500">
              Conflict detection runs automatically on change of room, teacher, or time window.
            </p>

            {scheduleConflictWarning && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded text-amber-900 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>{scheduleConflictWarning}</span>
              </div>
            )}

            <form onSubmit={handleCreateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Subject</label>
                <select
                  value={newSchSubject}
                  onChange={(e) => {
                    setNewSchSubject(e.target.value);
                    handleCheckScheduleConflict();
                  }}
                  className="w-full h-9 text-xs border border-slate-300 rounded px-2.5 bg-white"
                >
                  <option value="sub-sci-01">Basic Science</option>
                  <option value="sub-soc-01">Social Studies</option>
                  <option value="sub-ict-01">Computer Studies & ICT</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Exam Date</label>
                  <Input
                    type="date"
                    required
                    value={newSchDate}
                    onChange={(e) => {
                      setNewSchDate(e.target.value);
                      handleCheckScheduleConflict();
                    }}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <Input
                    type="time"
                    required
                    value={newSchStart}
                    onChange={(e) => {
                      setNewSchStart(e.target.value);
                      handleCheckScheduleConflict();
                    }}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <Input
                    type="time"
                    required
                    value={newSchEnd}
                    onChange={(e) => {
                      setNewSchEnd(e.target.value);
                      handleCheckScheduleConflict();
                    }}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Examination Hall</label>
                  <select
                    value={newSchRoom}
                    onChange={(e) => {
                      setNewSchRoom(e.target.value);
                      handleCheckScheduleConflict();
                    }}
                    className="w-full h-9 text-xs border border-slate-300 rounded px-2 bg-white"
                  >
                    <option value="room-lab-01">Science Lab 1 (West Wing)</option>
                    <option value="room-101">Room 101 (Main Block)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Primary Invigilator
                  </label>
                  <select
                    value={newSchInvigilator}
                    onChange={(e) => {
                      setNewSchInvigilator(e.target.value);
                      handleCheckScheduleConflict();
                    }}
                    className="w-full h-9 text-xs border border-slate-300 rounded px-2 bg-white"
                  >
                    <option value="stf-003">Mrs. Aisha Danjuma (Basic Science)</option>
                    <option value="stf-002">Mr. Robert Mensah (English)</option>
                    <option value="stf-001">Dr. Sarah Jenkins (Mathematics)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateScheduleModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Scheduling..." : "Save Timetable Slot"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADMINISTRATIVE SCORE CORRECTION                                */}
      {/* --------------------------------------------------------------------- */}
      {correctingScore && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Administrative Score Correction
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Every score modification is logged with mandatory justification and actor metadata.
              </p>
            </div>

            <form onSubmit={handleCorrectScore} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <div className="font-semibold text-slate-900">{correctingScore.studentName}</div>
                <div className="text-slate-500 mt-1">
                  Current Recorded Score:{" "}
                  <span className="font-bold text-slate-900">{correctingScore.currentScore}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">New Score</label>
                <Input
                  type="number"
                  step="0.5"
                  required
                  value={correctionScoreVal}
                  onChange={(e) => setCorrectionScoreVal(Number(e.target.value))}
                  className="h-9 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Correction (Mandatory)
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Transcription error discovered during script re-marking audit."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCorrectingScore(null)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? "Submitting..." : "Apply Controlled Correction"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
