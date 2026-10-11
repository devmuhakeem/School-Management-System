import React, { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Plus, CheckCircle2, ShieldAlert } from "lucide-react";

interface CampusOption {
  id: string;
  name: string;
}

interface AcademicYearOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  campusId: string;
}

interface SectionOption {
  id: string;
  name: string;
  classId: string;
}

interface SubjectOption {
  id: string;
  name: string;
  code: string;
}

interface StaffOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeNumber: string;
}

interface PeriodOption {
  id: string;
  periodNumber: number;
  name: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
}

interface RoomOption {
  id: string;
  name: string;
  code: string;
}

// =============================================================================
// 1. ALLOCATE SUBJECT TO CLASS MODAL
// =============================================================================
interface AllocateSubjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campuses: CampusOption[];
  academicYears: AcademicYearOption[];
  classes: ClassOption[];
  sections: SectionOption[];
  subjects: SubjectOption[];
  onSuccess: () => void;
}

export function AllocateSubjectModal({
  open,
  onOpenChange,
  campuses,
  academicYears,
  classes,
  sections,
  subjects,
  onSuccess,
}: AllocateSubjectModalProps) {
  const [campusId, setCampusId] = useState(campuses[0]?.id || "");
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id || "");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [ruleType, setRuleType] = useState<"CORE" | "ELECTIVE" | "OPTIONAL">("CORE");
  const [creditUnits, setCreditUnits] = useState(1);
  const [periodsPerWeek, setPeriodsPerWeek] = useState(4);
  const [syllabusNotes, setSyllabusNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredClasses = classes.filter((c) => !campusId || c.campusId === campusId);
  const filteredSections = sections.filter((s) => s.classId === classId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classId || !subjectId) {
      setError("Please select both a class and a subject.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/academics/class-subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campusId: campusId || campuses[0]?.id,
          academicYearId: academicYearId || academicYears[0]?.id,
          classId,
          sectionId: sectionId || undefined,
          subjectId,
          ruleType,
          creditUnits: Number(creditUnits),
          periodsPerWeek: Number(periodsPerWeek),
          syllabusNotes: syllabusNotes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Failed to allocate subject");
      }

      onSuccess();
      onOpenChange(false);
      setSubjectId("");
      setSyllabusNotes("");
    } catch (err: any) {
      setError(err.message || "Failed to allocate subject to class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title="Allocate Subject to Class"
      description="Configure core, elective, or optional curriculum subject allocations for an academic cohort."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Campus</label>
            <select
              value={campusId}
              onChange={(e) => {
                setCampusId(e.target.value);
                setClassId("");
                setSectionId("");
              }}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            >
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Academic Year</label>
            <select
              value={academicYearId}
              onChange={(e) => setAcademicYearId(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            >
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Cohort <span className="text-rose-500">*</span>
            </label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
              }}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
              required
            >
              <option value="">Select Class...</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Section (Optional)</label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            >
              <option value="">Entire Class (All Sections)</option>
              {filteredSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Subject <span className="text-rose-500">*</span>
          </label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            required
          >
            <option value="">Select Subject...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rule Category</label>
            <select
              value={ruleType}
              onChange={(e: any) => setRuleType(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            >
              <option value="CORE">CORE (Compulsory)</option>
              <option value="ELECTIVE">ELECTIVE (Stream-based)</option>
              <option value="OPTIONAL">OPTIONAL (Free Choice)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Credit Units</label>
            <Input
              type="number"
              min={0}
              max={20}
              value={creditUnits}
              onChange={(e) => setCreditUnits(parseInt(e.target.value, 10) || 1)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Weekly Periods</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={periodsPerWeek}
              onChange={(e) => setPeriodsPerWeek(parseInt(e.target.value, 10) || 4)}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Syllabus / Scope Notes</label>
          <textarea
            value={syllabusNotes}
            onChange={(e) => setSyllabusNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Terms 1-3 mandatory modules, practical sessions required in lab"
            className="w-full p-2 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !classId || !subjectId}>
            {loading ? "Allocating..." : "Allocate Subject"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// =============================================================================
// 2. TEACHER SUBJECT ASSIGNMENT MODAL
// =============================================================================
interface AssignTeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campuses: CampusOption[];
  academicYears: AcademicYearOption[];
  classes: ClassOption[];
  sections: SectionOption[];
  subjects: SubjectOption[];
  staff: StaffOption[];
  onSuccess: () => void;
}

export function AssignTeacherModal({
  open,
  onOpenChange,
  campuses,
  academicYears,
  classes,
  sections,
  subjects,
  staff,
  onSuccess,
}: AssignTeacherModalProps) {
  const [campusId, setCampusId] = useState(campuses[0]?.id || "");
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id || "");
  const [staffId, setStaffId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [periodsPerWeek, setPeriodsPerWeek] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredClasses = classes.filter((c) => !campusId || c.campusId === campusId);
  const filteredSections = sections.filter((s) => s.classId === classId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId || !subjectId || !classId) {
      setError("Please select teacher, subject, and class.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/academics/teacher-assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campusId: campusId || campuses[0]?.id,
          academicYearId: academicYearId || academicYears[0]?.id,
          staffId,
          subjectId,
          classId,
          sectionId: sectionId || undefined,
          periodsPerWeek: Number(periodsPerWeek),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Failed to assign teacher");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "Failed to create teaching assignment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title="Assign Teacher to Subject"
      description="Designate faculty member to instruct a specific subject for a classroom cohort."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Teacher / Faculty Member <span className="text-rose-500">*</span>
          </label>
          <select
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            required
          >
            <option value="">Select Faculty...</option>
            {staff.map((st) => (
              <option key={st.id} value={st.id}>
                {st.firstName} {st.lastName} ({st.employeeNumber})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject <span className="text-rose-500">*</span>
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
              required
            >
              <option value="">Select Subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Weekly Periods Target</label>
            <Input
              type="number"
              min={1}
              max={30}
              value={periodsPerWeek}
              onChange={(e) => setPeriodsPerWeek(parseInt(e.target.value, 10) || 4)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Cohort <span className="text-rose-500">*</span>
            </label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
              }}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
              required
            >
              <option value="">Select Class...</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            >
              <option value="">Combined Class / All Sections</option>
              {filteredSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !staffId || !subjectId || !classId}>
            {loading ? "Assigning..." : "Assign Teacher"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// =============================================================================
// 3. SCHEDULE TIMETABLE LESSON WITH REAL-TIME CONFLICT DETECTION
// =============================================================================
interface ScheduleLessonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campuses: CampusOption[];
  academicYears: AcademicYearOption[];
  classes: ClassOption[];
  sections: SectionOption[];
  subjects: SubjectOption[];
  staff: StaffOption[];
  periods: PeriodOption[];
  rooms: RoomOption[];
  onSuccess: () => void;
}

export function ScheduleLessonModal({
  open,
  onOpenChange,
  campuses,
  academicYears,
  classes,
  sections,
  subjects,
  staff,
  periods,
  rooms,
  onSuccess,
}: ScheduleLessonModalProps) {
  const [campusId, setCampusId] = useState(campuses[0]?.id || "");
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id || "");
  const [dayOfWeek, setDayOfWeek] = useState<
    "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY"
  >("MONDAY");
  const [periodId, setPeriodId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const filteredClasses = classes.filter((c) => !campusId || c.campusId === campusId);
  const filteredSections = sections.filter((s) => s.classId === classId);
  const nonBreakPeriods = periods.filter((p) => !p.isBreak);

  // Trigger real-time conflict checking when parameters change
  const runConflictCheck = async () => {
    if (!dayOfWeek || !periodId || !staffId || !classId) return;

    try {
      const res = await fetch("/api/academics/timetable/check-conflicts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campusId: campusId || campuses[0]?.id,
          academicYearId: academicYearId || academicYears[0]?.id,
          dayOfWeek,
          periodId,
          staffId,
          classId,
          sectionId: sectionId || undefined,
          roomId: roomId || undefined,
        }),
      });

      const data = await res.json();
      if (data?.data?.hasConflict) {
        setConflictWarning(data.data.conflicts.map((c: any) => `${c.type}: ${c.message}`));
      } else {
        setConflictWarning([]);
      }
    } catch {
      // Ignore background check errors
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodId || !subjectId || !staffId || !classId) {
      setError("Please complete all required schedule fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/academics/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campusId: campusId || campuses[0]?.id,
          academicYearId: academicYearId || academicYears[0]?.id,
          dayOfWeek,
          periodId,
          subjectId,
          staffId,
          classId,
          sectionId: sectionId || undefined,
          roomId: roomId || undefined,
          notes: notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Failed to schedule timetable lesson");
      }

      onSuccess();
      onOpenChange(false);
      setNotes("");
    } catch (err: any) {
      setError(err.message || "Conflict occurred while scheduling lesson");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title="Schedule Timetable Slot"
      description="Book a lesson period with real-time teacher and room collision validation."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Scheduling Conflict Detected</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {conflictWarning.length > 0 && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-none flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <p className="font-semibold">Potential Collision Detected:</p>
              <ul className="list-disc list-inside mt-0.5">
                {conflictWarning.map((cw, idx) => (
                  <li key={idx}>{cw}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Day of Week</label>
            <select
              value={dayOfWeek}
              onChange={(e: any) => {
                setDayOfWeek(e.target.value);
                setTimeout(runConflictCheck, 100);
              }}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            >
              <option value="MONDAY">Monday</option>
              <option value="TUESDAY">Tuesday</option>
              <option value="WEDNESDAY">Wednesday</option>
              <option value="THURSDAY">Thursday</option>
              <option value="FRIDAY">Friday</option>
              <option value="SATURDAY">Saturday</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lesson Period <span className="text-rose-500">*</span>
            </label>
            <select
              value={periodId}
              onChange={(e) => {
                setPeriodId(e.target.value);
                setTimeout(runConflictCheck, 100);
              }}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
              required
            >
              <option value="">Select Period...</option>
              {nonBreakPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.startTime} – {p.endTime})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Cohort <span className="text-rose-500">*</span>
            </label>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSectionId("");
                setTimeout(runConflictCheck, 100);
              }}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
              required
            >
              <option value="">Select Class...</option>
              {filteredClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
            <select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setTimeout(runConflictCheck, 100);
              }}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
            >
              <option value="">All / Unified</option>
              {filteredSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Subject <span className="text-rose-500">*</span>
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
              required
            >
              <option value="">Select Subject...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teacher Assigned <span className="text-rose-500">*</span>
            </label>
            <select
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                setTimeout(runConflictCheck, 100);
              }}
              className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
              required
            >
              <option value="">Select Teacher...</option>
              {staff.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.firstName} {st.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Classroom / Facility Room</label>
          <select
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              setTimeout(runConflictCheck, 100);
            }}
            className="w-full h-9 px-3 border border-slate-300 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 rounded-none"
          >
            <option value="">Assigned Class's Default Room</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} ({r.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Bring lab coat, double period experiment"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !periodId || !subjectId || !staffId || !classId}>
            {loading ? "Scheduling..." : "Schedule Lesson"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// =============================================================================
// 4. ADD LESSON PERIOD MODAL
// =============================================================================
interface AddPeriodModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campusId: string;
  onSuccess: () => void;
}

export function AddPeriodModal({ open, onOpenChange, campusId, onSuccess }: AddPeriodModalProps) {
  const [periodNumber, setPeriodNumber] = useState(8);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("13:20");
  const [endTime, setEndTime] = useState("14:05");
  const [isBreak, setIsBreak] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/academics/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campusId,
          periodNumber: Number(periodNumber),
          name,
          startTime,
          endTime,
          isBreak,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error?.message || "Failed to create period");
      }

      onSuccess();
      onOpenChange(false);
      setName("");
    } catch (err: any) {
      setError(err.message || "Failed to create period");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title="Add Lesson Period"
      description="Configure bell schedule order, duration, and interval flags."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-none flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Period Order #</label>
            <Input
              type="number"
              min={1}
              max={20}
              value={periodNumber}
              onChange={(e) => setPeriodNumber(parseInt(e.target.value, 10) || 1)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Period Title</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Period 6 (Afternoon Prep)"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time (24h)</label>
            <Input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">End Time (24h)</label>
            <Input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
          <input
            type="checkbox"
            id="isBreakCheck"
            checked={isBreak}
            onChange={(e) => setIsBreak(e.target.checked)}
            className="rounded-none text-slate-900"
          />
          <label htmlFor="isBreakCheck" className="text-xs font-medium text-slate-700 cursor-pointer">
            This period is an interval / recess break (No lessons scheduled)
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !name.trim()}>
            {loading ? "Saving..." : "Add Period"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
