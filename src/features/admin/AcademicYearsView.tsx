import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/ui/toast";
import { Calendar, Plus, CheckCircle2, Clock, Edit2, CalendarDays, ArrowRight } from "lucide-react";

interface TermRecord {
  id: string;
  name: string;
  termNumber: number;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: string;
}

interface AcademicYearRecord {
  id: string;
  name: string;
  code: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: string;
  terms?: TermRecord[];
}

function safeFormatDate(val?: string | null): string {
  if (!val) return "";
  return String(val).split("T")[0] || "";
}

export function AcademicYearsView() {
  const { token, hasPermission } = useAuth();
  const { addToast } = useToast();

  const [years, setYears] = React.useState<AcademicYearRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Year Dialog
  const [yearDialogOpen, setYearDialogOpen] = React.useState(false);
  const [editingYear, setEditingYear] = React.useState<AcademicYearRecord | null>(null);
  const [yearForm, setYearForm] = React.useState({
    name: "",
    code: "",
    startDate: "",
    endDate: "",
    isCurrent: false,
    status: "UPCOMING",
  });
  const [yearError, setYearError] = React.useState<string | null>(null);

  // Term Dialog
  const [termDialogOpen, setTermDialogOpen] = React.useState(false);
  const [targetYearId, setTargetYearId] = React.useState<string | null>(null);
  const [termForm, setTermForm] = React.useState({
    name: "",
    termNumber: 1,
    startDate: "",
    endDate: "",
    isCurrent: false,
    status: "UPCOMING",
  });
  const [termError, setTermError] = React.useState<string | null>(null);

  const [submitting, setSubmitting] = React.useState(false);

  const canManage = hasPermission("academics.manage");

  const loadAcademicYears = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/academic-years", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setYears(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadAcademicYears();
  }, [loadAcademicYears]);

  const handleOpenCreateYear = () => {
    setEditingYear(null);
    setYearForm({
      name: "",
      code: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 31536000000).toISOString().split("T")[0],
      isCurrent: false,
      status: "UPCOMING",
    });
    setYearError(null);
    setYearDialogOpen(true);
  };

  const handleOpenEditYear = (ay: AcademicYearRecord) => {
    setEditingYear(ay);
    setYearForm({
      name: ay.name,
      code: ay.code,
      startDate: safeFormatDate(ay.startDate),
      endDate: safeFormatDate(ay.endDate),
      isCurrent: ay.isCurrent,
      status: ay.status,
    });
    setYearError(null);
    setYearDialogOpen(true);
  };

  const handleSaveYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(yearForm.startDate) >= new Date(yearForm.endDate)) {
      setYearError("Start date must be before end date.");
      return;
    }

    setSubmitting(true);
    setYearError(null);

    try {
      const url = editingYear ? `/api/admin/academic-years/${editingYear.id}` : "/api/admin/academic-years";
      const method = editingYear ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(yearForm),
      });

      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: editingYear ? "Academic Year Updated" : "Academic Year Created",
          description: `${yearForm.name} saved successfully.`,
        });
        setYearDialogOpen(false);
        loadAcademicYears();
      } else {
        setYearError(json.error?.message || "Failed to save academic year.");
      }
    } catch {
      setYearError("Network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetCurrentYear = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/admin/academic-years/${id}/set-current`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast({
          type: "success",
          title: "Active Session Configured",
          description: `${name} is now the active operational academic year.`,
        });
        loadAcademicYears();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAddTerm = (yearId: string) => {
    setTargetYearId(yearId);
    setTermForm({
      name: "",
      termNumber: 1,
      startDate: "",
      endDate: "",
      isCurrent: false,
      status: "UPCOMING",
    });
    setTermError(null);
    setTermDialogOpen(true);
  };

  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetYearId) return;

    if (new Date(termForm.startDate) >= new Date(termForm.endDate)) {
      setTermError("Term start date must precede end date.");
      return;
    }

    setSubmitting(true);
    setTermError(null);

    try {
      const res = await fetch("/api/admin/terms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          academicYearId: targetYearId,
          ...termForm,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: "Academic Term Added",
          description: `${termForm.name} added to session.`,
        });
        setTermDialogOpen(false);
        loadAcademicYears();
      } else {
        setTermError(json.error?.message || "Failed to add term.");
      }
    } catch {
      setTermError("Network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetCurrentTerm = async (termId: string, name: string) => {
    try {
      const res = await fetch(`/api/admin/terms/${termId}/set-current`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast({
          type: "success",
          title: "Active Term Activated",
          description: `${name} is now the current grading term.`,
        });
        loadAcademicYears();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Academic Calendar & Sessions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure school sessions, terms, active calendar windows, and official grading periods
          </p>
        </div>

        {canManage && (
          <Button onClick={handleOpenCreateYear} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white self-start">
            <Plus className="h-4 w-4" />
            <span>New Academic Year</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : years.length === 0 ? (
        <Card className="text-center py-10 shadow-2xs">
          <CardContent className="space-y-2">
            <Calendar className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-800">No Academic Sessions Configured</h3>
            <p className="text-xs text-slate-500">
              Establish your first academic year (e.g. 2026/2027) to begin curriculum and cohort configuration.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {years.map((ay) => (
            <Card
              key={ay.id}
              className={`shadow-2xs border transition-colors ${
                ay.isCurrent ? "border-emerald-300 bg-emerald-50/15" : "border-slate-200"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 text-sm">{ay.name}</h3>
                      <span className="font-mono text-xs text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                        {ay.code}
                      </span>
                      {ay.isCurrent && (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 font-mono">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Active Session</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{safeFormatDate(ay.startDate)} to {safeFormatDate(ay.endDate)}</span>
                      <span>·</span>
                      <span className="capitalize">{ay.status.toLowerCase()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage && !ay.isCurrent && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetCurrentYear(ay.id, ay.name)}
                        className="text-xs text-slate-700"
                      >
                        Set as Current Year
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditYear(ay)}
                        className="text-xs text-slate-600"
                      >
                        <Edit2 className="h-3.5 w-3.5 mr-1" />
                        <span>Edit</span>
                      </Button>
                    )}
                    {canManage && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleOpenAddTerm(ay.id)}
                        className="text-xs gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Term</span>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="border-t border-slate-100 pt-3">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Terms & Semesters ({ay.terms?.length || 0})
                  </h4>

                  {(!ay.terms || ay.terms.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">No terms configured for this academic year yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                      {ay.terms.map((term) => (
                        <div
                          key={term.id}
                          className={`p-3 rounded-md border text-xs space-y-1 ${
                            term.isCurrent
                              ? "bg-white border-emerald-400 shadow-2xs"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{term.name}</span>
                            {term.isCurrent ? (
                              <span className="text-[10px] text-emerald-700 font-mono font-semibold">Active Term</span>
                            ) : canManage && ay.isCurrent ? (
                              <button
                                type="button"
                                onClick={() => handleSetCurrentTerm(term.id, term.name)}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                              >
                                Activate
                              </button>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-between">
                            <span>Term #{term.termNumber}</span>
                            <span className="capitalize">{term.status.toLowerCase()}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono">
                            {safeFormatDate(term.startDate)} · {safeFormatDate(term.endDate)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Year Dialog */}
      <Dialog
        open={yearDialogOpen}
        onOpenChange={setYearDialogOpen}
        title={editingYear ? "Edit Academic Year" : "Create New Academic Year"}
        description="Specify the academic session name, code, and calendar dates."
      >
        <form onSubmit={handleSaveYear} className="space-y-4 pt-2">
          {yearError && <Alert variant="destructive" title="Validation Error">{yearError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Session Name" required description="e.g. 2026/2027 Academic Session">
              <Input
                value={yearForm.name}
                onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Session Code" required description="e.g. AY-2026-27">
              <Input
                value={yearForm.code}
                onChange={(e) => setYearForm({ ...yearForm, code: e.target.value.toUpperCase() })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Start Date" required>
              <Input
                type="date"
                value={yearForm.startDate}
                onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                required
              />
            </FormField>

            <FormField label="End Date" required>
              <Input
                type="date"
                value={yearForm.endDate}
                onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Status">
              <Select
                value={yearForm.status}
                onChange={(e) => setYearForm({ ...yearForm, status: e.target.value })}
                options={[
                  { value: "UPCOMING", label: "Upcoming Session" },
                  { value: "ACTIVE", label: "Active Operational Session" },
                  { value: "COMPLETED", label: "Completed Session" },
                  { value: "ARCHIVED", label: "Archived" },
                ]}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setYearDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {submitting ? <LoadingSpinner size="sm" /> : editingYear ? "Save Changes" : "Create Session"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Term Dialog */}
      <Dialog
        open={termDialogOpen}
        onOpenChange={setTermDialogOpen}
        title="Add Term / Semester to Academic Year"
        description="Configure term number, title, and calendar dates."
      >
        <form onSubmit={handleSaveTerm} className="space-y-4 pt-2">
          {termError && <Alert variant="destructive" title="Validation Error">{termError}</Alert>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Term Title" required description="e.g. First Term or Fall Semester">
              <Input
                value={termForm.name}
                onChange={(e) => setTermForm({ ...termForm, name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Term Sequence Number" required description="1, 2, 3, etc.">
              <Input
                type="number"
                min={1}
                max={6}
                value={termForm.termNumber}
                onChange={(e) => setTermForm({ ...termForm, termNumber: parseInt(e.target.value, 10) || 1 })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Term Start Date" required>
              <Input
                type="date"
                value={termForm.startDate}
                onChange={(e) => setTermForm({ ...termForm, startDate: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Term End Date" required>
              <Input
                type="date"
                value={termForm.endDate}
                onChange={(e) => setTermForm({ ...termForm, endDate: e.target.value })}
                required
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setTermDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {submitting ? <LoadingSpinner size="sm" /> : "Add Term"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
