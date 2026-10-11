import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/ui/toast";
import { BookOpen, Plus, Edit2, Search, Power, CheckCircle2, Award } from "lucide-react";

export interface SubjectRecord {
  id: string;
  name: string;
  code: string;
  description?: string;
  creditUnits: number;
  isElective: boolean;
  isActive: boolean;
}

export function SubjectsView() {
  const { token, hasPermission } = useAuth();
  const { addToast } = useToast();

  const [subjects, setSubjects] = React.useState<SubjectRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [categoryFilter, setCategoryFilter] = React.useState<"all" | "core" | "elective">("all");
  const [statusFilter, setStatusFilter] = React.useState<"all" | "active" | "inactive">("all");

  // Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingSubject, setEditingSubject] = React.useState<SubjectRecord | null>(null);
  const [formData, setFormData] = React.useState({
    name: "",
    code: "",
    description: "",
    creditUnits: 3,
    isElective: false,
    isActive: true,
  });
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [dialogError, setDialogError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Status toggle confirmation
  const [confirmToggleOpen, setConfirmToggleOpen] = React.useState(false);
  const [subjectToToggle, setSubjectToToggle] = React.useState<SubjectRecord | null>(null);

  const canManage = hasPermission("academics.manage");

  const loadSubjects = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/subjects", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setSubjects(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load subjects", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const handleOpenCreate = () => {
    setEditingSubject(null);
    setFormData({
      name: "",
      code: "",
      description: "",
      creditUnits: 3,
      isElective: false,
      isActive: true,
    });
    setFieldErrors({});
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (subject: SubjectRecord) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      description: subject.description || "",
      creditUnits: subject.creditUnits,
      isElective: subject.isElective,
      isActive: subject.isActive,
    });
    setFieldErrors({});
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Subject name is required.";
    if (!formData.code.trim()) errors.code = "Subject code is required.";
    if (formData.creditUnits < 1 || formData.creditUnits > 12) {
      errors.creditUnits = "Credit units must be between 1 and 12.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setFieldErrors({});
    setDialogError(null);

    try {
      const url = editingSubject
        ? `/api/admin/subjects/${editingSubject.id}`
        : "/api/admin/subjects";
      const method = editingSubject ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (res.ok) {
        addToast({
          type: "success",
          title: editingSubject ? "Subject Updated" : "Subject Created",
          description: `${formData.name} (${formData.code}) successfully saved.`,
        });
        setDialogOpen(false);
        loadSubjects();
      } else {
        if (json.error?.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(json.error.fieldErrors)) {
            mapped[k] = Array.isArray(v) ? (v[0] as string) : String(v);
          }
          setFieldErrors(mapped);
        } else {
          setDialogError(json.error?.message || "Failed to save subject.");
        }
      }
    } catch {
      setDialogError("Network error while submitting subject.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!subjectToToggle) return;

    try {
      const res = await fetch(`/api/admin/subjects/${subjectToToggle.id}/toggle-status`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        addToast({
          type: "info",
          title: "Subject Status Changed",
          description: `${subjectToToggle.name} status updated.`,
        });
        setConfirmToggleOpen(false);
        setSubjectToToggle(null);
        loadSubjects();
      } else {
        const json = await res.json();
        addToast({
          type: "error",
          title: "Update Failed",
          description: json.error?.message || "Could not toggle subject status.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        description: "Failed to connect to backend server.",
      });
    }
  };

  // Filtered list
  const filteredSubjects = subjects.filter((s) => {
    if (categoryFilter === "core" && s.isElective) return false;
    if (categoryFilter === "elective" && !s.isElective) return false;
    if (statusFilter === "active" && !s.isActive) return false;
    if (statusFilter === "inactive" && s.isActive) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <span>Curriculum Subjects & Course Catalog</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure institutional courses, assign credit unit weights, and categorize core vs elective offerings.
          </p>
        </div>

        {canManage && (
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 min-h-[40px]"
          >
            <Plus className="h-4 w-4" />
            <span>Register Subject</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by subject name or code..."
            className="pl-9 h-10"
          />
        </div>

        {/* Functional filter buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                categoryFilter === "all"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Categories
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("core")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                categoryFilter === "core"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Core Only
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter("elective")}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                categoryFilter === "elective"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Elective Only
            </button>
          </div>

          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === "all"
                  ? "bg-white text-indigo-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("active")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === "active"
                  ? "bg-white text-emerald-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter("inactive")}
              className={`px-2.5 py-1.5 rounded-md font-medium transition-colors ${
                statusFilter === "inactive"
                  ? "bg-white text-slate-700 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Archived
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <LoadingSpinner size="md" />
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-slate-300 bg-white p-6">
          <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
          <h4 className="mt-2 text-sm font-semibold text-slate-800">No Subjects Found</h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {search || categoryFilter !== "all" || statusFilter !== "all"
              ? "No subjects match your search or filter criteria."
              : "No curriculum subjects have been registered yet. Add subjects to establish the academic catalog."}
          </p>
          {canManage && (
            <Button size="sm" onClick={handleOpenCreate} className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              <span>Add First Subject</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubjects.map((sub) => (
            <Card
              key={sub.id}
              className={`transition-shadow hover:shadow-sm ${
                !sub.isActive ? "bg-slate-50/70 border-slate-200 opacity-80" : "bg-white"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900 leading-tight">
                      {sub.name}
                    </CardTitle>
                    <div className="mt-1 text-xs text-slate-500 font-mono flex items-center gap-1.5">
                      <span>{sub.code}</span>
                      <span>·</span>
                      <span className="font-sans font-medium text-slate-600">
                        {sub.creditUnits} {sub.creditUnits === 1 ? "Unit" : "Units"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Quiet unboxed text tag for category */}
                    <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-500">
                      {sub.isElective ? "Elective" : "Core"}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-0">
                {sub.description && (
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {sub.description}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        sub.isActive ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span className="capitalize">{sub.isActive ? "Active" : "Archived"}</span>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(sub)}
                        className="h-8 px-2 text-slate-600 hover:text-slate-900"
                        title="Edit Subject"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSubjectToToggle(sub);
                          setConfirmToggleOpen(true);
                        }}
                        className={`h-8 px-2 ${
                          sub.isActive
                            ? "text-slate-500 hover:text-rose-600"
                            : "text-slate-500 hover:text-emerald-600"
                        }`}
                        title={sub.isActive ? "Archive Subject" : "Reactivate Subject"}
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editingSubject ? "Edit Curriculum Subject" : "Register Curriculum Subject"}
        description="Specify subject details, credit load weights, and requirement category."
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {dialogError && <Alert variant="destructive">{dialogError}</Alert>}

          <FormField label="Subject Name" required error={fieldErrors.name}>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Mathematics, English Language, Physics"
              disabled={submitting}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Subject Code"
              required
              error={fieldErrors.code}
              description="Unique course abbreviation"
            >
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. MTH101, PHY201"
                disabled={submitting}
                className="font-mono uppercase"
              />
            </FormField>

            <FormField
              label="Credit Units"
              required
              error={fieldErrors.creditUnits}
              description="Weight (1 - 12)"
            >
              <Input
                type="number"
                min={1}
                max={12}
                value={formData.creditUnits}
                onChange={(e) =>
                  setFormData({ ...formData, creditUnits: parseInt(e.target.value, 10) || 1 })
                }
                disabled={submitting}
              />
            </FormField>
          </div>

          <FormField label="Description" description="Curriculum outline or course objectives">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Outline course prerequisites or curriculum overview..."
              rows={3}
              disabled={submitting}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isElective"
                checked={formData.isElective}
                onChange={(e) => setFormData({ ...formData, isElective: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isElective" className="text-xs font-medium text-slate-700 cursor-pointer">
                Elective Course (Optional)
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isActive" className="text-xs font-medium text-slate-700 cursor-pointer">
                Active in Curriculum
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {editingSubject ? "Save Changes" : "Register Subject"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmToggleOpen}
        onOpenChange={setConfirmToggleOpen}
        title={subjectToToggle?.isActive ? "Archive Subject" : "Reactivate Subject"}
        description={`Are you sure you want to ${
          subjectToToggle?.isActive ? "archive" : "reactivate"
        } ${subjectToToggle?.name}? Archived subjects cannot be assigned to new academic terms.`}
        confirmLabel={subjectToToggle?.isActive ? "Archive Subject" : "Reactivate"}
        destructive={subjectToToggle?.isActive}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}
