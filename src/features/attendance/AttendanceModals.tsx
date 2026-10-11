import React, { useState } from "react";
import {
  ShieldAlert,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";

// =============================================================================
// 1. CORRECTION MODAL (AUDITED WORKFLOW)
// =============================================================================

interface AttendanceCorrectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  onSuccess: () => void;
}

export function AttendanceCorrectionModal({
  open,
  onOpenChange,
  record,
  onSuccess,
}: AttendanceCorrectionModalProps) {
  const [newStatus, setNewStatus] = useState<string>("PRESENT");
  const [correctionReason, setCorrectionReason] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (record) {
      setNewStatus(record.status || "PRESENT");
      setArrivalTime(record.arrivalTime || "");
      setRemarks(record.remarks || "");
      setCorrectionReason("");
      setError(null);
    }
  }, [record]);

  if (!record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      setError("Please provide a valid reason for this attendance correction (min 3 characters).");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/attendance/${record.id}/correct`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          correctionReason: correctionReason.trim(),
          arrivalTime: newStatus === "LATE" && arrivalTime ? arrivalTime : undefined,
          remarks: remarks.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to submit correction.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title="Attendance Correction (Controlled Audit)"
      description="Modify a previously recorded student attendance state. All modifications are permanently recorded in the institutional compliance audit trail."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Student:</span>
            <span className="font-semibold text-slate-800">{record.studentName || record.studentId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Session Date:</span>
            <span className="font-mono text-slate-800">{record.attendanceDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Current Recorded Status:</span>
            <span className="font-bold text-slate-900">{record.status}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            New Attendance Status *
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setNewStatus(st)}
                className={`py-2 text-xs font-medium border text-center transition-colors ${
                  newStatus === st
                    ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {newStatus === "LATE" && (
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Recorded Arrival Time (HH:MM)
            </label>
            <Input
              type="time"
              value={arrivalTime}
              onChange={(e) => setArrivalTime(e.target.value)}
              placeholder="08:15"
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Official Reason for Correction *
          </label>
          <textarea
            value={correctionReason}
            onChange={(e) => setCorrectionReason(e.target.value)}
            rows={3}
            required
            placeholder="e.g. Student was attending scheduled speech therapy session; verified by head of school."
            className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Additional Administrative Remarks
          </label>
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Optional internal remarks"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving Correction..." : "Commit Correction"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// =============================================================================
// 2. EXCUSE ABSENCE MODAL
// =============================================================================

interface ExcuseAbsenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any | null;
  onSuccess: () => void;
}

export function ExcuseAbsenceModal({
  open,
  onOpenChange,
  record,
  onSuccess,
}: ExcuseAbsenceModalProps) {
  const [excuseReason, setExcuseReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setExcuseReason("");
    setRemarks("");
    setError(null);
  }, [record]);

  if (!record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!excuseReason.trim() || excuseReason.trim().length < 3) {
      setError("Please provide a specific reason for excusing this absence.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/attendance/${record.id}/excuse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isExcused: true,
          excuseReason: excuseReason.trim(),
          remarks: remarks.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to excuse absence.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="md"
      title="Excuse Student Absence"
      description="Designate an absence as officially excused under institutional policy with formal administrative verification."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200 p-3 rounded text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Student:</span>
            <span className="font-semibold text-slate-800">{record.studentName || record.studentId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Date of Absence:</span>
            <span className="font-mono text-slate-800">{record.attendanceDate}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Reason Category & Explanation *
          </label>
          <select
            value={excuseReason}
            onChange={(e) => setExcuseReason(e.target.value)}
            required
            className="w-full text-xs p-2.5 border border-slate-300 rounded mb-2 bg-white"
          >
            <option value="">Select official excuse category...</option>
            <option value="Certified Medical Illness (Doctor's Note)">Certified Medical Illness (Doctor's Note)</option>
            <option value="Urgent Family Emergency">Urgent Family Emergency</option>
            <option value="Official Interscholastic Academic / Sports Representation">Official Interscholastic Academic / Sports Representation</option>
            <option value="Religious Observance">Religious Observance</option>
            <option value="Approved Bereavement">Approved Bereavement</option>
            <option value="Pre-authorized Educational Travel">Pre-authorized Educational Travel</option>
          </select>

          <Input
            value={excuseReason}
            onChange={(e) => setExcuseReason(e.target.value)}
            placeholder="Or type custom excuse explanation..."
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Verification & Evidence Notes
          </label>
          <Input
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="e.g. Medical certificate verified by Nurse Williams"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Recording Excuse..." : "Authorize Excused Absence"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

// =============================================================================
// 3. LOCK / UNLOCK REGISTER MODAL
// =============================================================================

interface LockAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCurrentlyLocked: boolean;
  classId: string;
  sectionId?: string | null;
  attendanceDate: string;
  attendanceType: string;
  onSuccess: () => void;
}

export function LockAttendanceModal({
  open,
  onOpenChange,
  isCurrentlyLocked,
  classId,
  sectionId,
  attendanceDate,
  attendanceType,
  onSuccess,
}: LockAttendanceModalProps) {
  const [lockNotes, setLockNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetAction = isCurrentlyLocked ? "UNLOCK" : "LOCK";

  const handleToggle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const endpoint = isCurrentlyLocked ? "/api/attendance/unlock" : "/api/attendance/lock";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          sectionId: sectionId || undefined,
          attendanceDate,
          attendanceType,
          campusId: "camp-apex-main-01",
          academicYearId: "ay-2025-26",
          lockNotes: lockNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || "Failed to update register lock status.");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="sm"
      title={isCurrentlyLocked ? "Unlock Attendance Register" : "Lock Attendance Register"}
      description={
        isCurrentlyLocked
          ? "Unlocking allows authorized faculty to re-edit attendance entries for this date."
          : "Locking seals the register against unauthorized modifications after submission."
      }
    >
      <form onSubmit={handleToggle} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            {isCurrentlyLocked ? (
              <Unlock className="h-4 w-4 text-emerald-600" />
            ) : (
              <Lock className="h-4 w-4 text-amber-600" />
            )}
            <span>Register for {attendanceDate}</span>
          </div>
          <p className="text-slate-500 text-[11px] pt-1">
            {isCurrentlyLocked
              ? "All student records for this day will become editable again by authorized teachers."
              : "Once locked, only Administrators and Principals can submit audited corrections."}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Administrative Notes (Optional)
          </label>
          <Input
            value={lockNotes}
            onChange={(e) => setLockNotes(e.target.value)}
            placeholder={isCurrentlyLocked ? "Reason for unlocking register" : "End-of-day register closure"}
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={submitting}
            className={isCurrentlyLocked ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
          >
            {submitting
              ? "Updating..."
              : isCurrentlyLocked
              ? "Confirm Unlock"
              : "Confirm Lock"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
