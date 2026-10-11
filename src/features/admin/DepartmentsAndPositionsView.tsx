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
import { Briefcase, Plus, Edit2, Search, Building2, UserCheck, Shield } from "lucide-react";

export interface PositionRecord {
  id: string;
  departmentId?: string | null;
  campusId?: string;
  title: string;
  code: string;
  description?: string;
}

export interface DepartmentRecord {
  id: string;
  organizationId: string;
  campusId?: string;
  name: string;
  code: string;
  description?: string;
  headOfDepartmentId?: string | null;
  positions?: PositionRecord[];
}

export function DepartmentsAndPositionsView() {
  const { token, hasPermission } = useAuth();
  const { addToast } = useToast();

  const [departments, setDepartments] = React.useState<DepartmentRecord[]>([]);
  const [positions, setPositions] = React.useState<PositionRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<"departments" | "positions">("departments");
  const [search, setSearch] = React.useState("");

  // Department Dialog
  const [deptDialogOpen, setDeptDialogOpen] = React.useState(false);
  const [editingDept, setEditingDept] = React.useState<DepartmentRecord | null>(null);
  const [deptForm, setDeptForm] = React.useState({
    name: "",
    code: "",
    description: "",
  });
  const [deptErrors, setDeptErrors] = React.useState<Record<string, string>>({});
  const [deptDialogError, setDeptDialogError] = React.useState<string | null>(null);

  // Position Dialog
  const [posDialogOpen, setPosDialogOpen] = React.useState(false);
  const [editingPos, setEditingPos] = React.useState<PositionRecord | null>(null);
  const [posForm, setPosForm] = React.useState({
    title: "",
    code: "",
    description: "",
    departmentId: "",
  });
  const [posErrors, setPosErrors] = React.useState<Record<string, string>>({});
  const [posDialogError, setPosDialogError] = React.useState<string | null>(null);

  const [submitting, setSubmitting] = React.useState(false);

  const canManage = hasPermission("settings.manage");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [deptRes, posRes] = await Promise.all([
        fetch("/api/admin/departments", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/positions", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (deptRes.ok && posRes.ok) {
        const deptJson = await deptRes.json();
        const posJson = await posRes.json();
        setDepartments(deptJson.data || []);
        setPositions(posJson.data || []);
      }
    } catch (err) {
      console.error("Failed to load departments or positions", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Department Submit
  const handleDeptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const errors: Record<string, string> = {};
    if (!deptForm.name.trim()) errors.name = "Department name is required.";
    if (!deptForm.code.trim()) errors.code = "Department code is required.";

    if (Object.keys(errors).length > 0) {
      setDeptErrors(errors);
      return;
    }

    setSubmitting(true);
    setDeptErrors({});
    setDeptDialogError(null);

    try {
      const url = editingDept
        ? `/api/admin/departments/${editingDept.id}`
        : "/api/admin/departments";
      const method = editingDept ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(deptForm),
      });

      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: editingDept ? "Department Updated" : "Department Created",
          description: `${deptForm.name} saved successfully.`,
        });
        setDeptDialogOpen(false);
        loadData();
      } else {
        if (json.error?.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(json.error.fieldErrors)) {
            mapped[k] = Array.isArray(v) ? (v[0] as string) : String(v);
          }
          setDeptErrors(mapped);
        } else {
          setDeptDialogError(json.error?.message || "Failed to save department.");
        }
      }
    } catch {
      setDeptDialogError("Network error while submitting department.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Position Submit
  const handlePosSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    const errors: Record<string, string> = {};
    if (!posForm.title.trim()) errors.title = "Position title is required.";
    if (!posForm.code.trim()) errors.code = "Position code is required.";

    if (Object.keys(errors).length > 0) {
      setPosErrors(errors);
      return;
    }

    setSubmitting(true);
    setPosErrors({});
    setPosDialogError(null);

    try {
      const url = editingPos ? `/api/admin/positions/${editingPos.id}` : "/api/admin/positions";
      const method = editingPos ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(posForm),
      });

      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: editingPos ? "Position Updated" : "Position Created",
          description: `${posForm.title} saved successfully.`,
        });
        setPosDialogOpen(false);
        loadData();
      } else {
        if (json.error?.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(json.error.fieldErrors)) {
            mapped[k] = Array.isArray(v) ? (v[0] as string) : String(v);
          }
          setPosErrors(mapped);
        } else {
          setPosDialogError(json.error?.message || "Failed to save position.");
        }
      }
    } catch {
      setPosDialogError("Network error while submitting position.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredDepartments = departments.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
  });

  const filteredPositions = positions.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            <span>Departments & Staff Positions</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Define organizational hierarchy, academic faculties, administrative units, and faculty job roles.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            {activeTab === "departments" ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditingDept(null);
                  setDeptForm({ name: "", code: "", description: "" });
                  setDeptErrors({});
                  setDeptDialogError(null);
                  setDeptDialogOpen(true);
                }}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white min-h-[40px]"
              >
                <Plus className="h-4 w-4" />
                <span>New Department</span>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setEditingPos(null);
                  setPosForm({ title: "", code: "", description: "", departmentId: departments[0]?.id || "" });
                  setPosErrors({});
                  setPosDialogError(null);
                  setPosDialogOpen(true);
                }}
                className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white min-h-[40px]"
              >
                <Plus className="h-4 w-4" />
                <span>New Position</span>
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Segmented Control & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("departments")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "departments"
                ? "bg-white text-indigo-700 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Departments ({departments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("positions")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "positions"
                ? "bg-white text-indigo-700 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Job Positions ({positions.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="pl-9 h-10"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <LoadingSpinner size="md" />
        </div>
      ) : activeTab === "departments" ? (
        filteredDepartments.length === 0 ? (
          <div className="text-center py-12 rounded-lg border border-dashed border-slate-300 bg-white p-6">
            <Building2 className="mx-auto h-8 w-8 text-slate-400" />
            <h4 className="mt-2 text-sm font-semibold text-slate-800">No Departments Found</h4>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Create academic and administrative departments to structure faculty assignments and reporting lines.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepartments.map((dept) => {
              const deptPositions = positions.filter((p) => p.departmentId === dept.id);

              return (
                <Card key={dept.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold text-slate-900 leading-tight">
                          {dept.name}
                        </CardTitle>
                        <div className="mt-1 text-xs text-slate-500 font-mono flex items-center gap-1.5">
                          <span>{dept.code}</span>
                          <span>·</span>
                          <span className="font-sans font-medium text-indigo-600">
                            {deptPositions.length} {deptPositions.length === 1 ? "Role" : "Roles"}
                          </span>
                        </div>
                      </div>

                      {canManage && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingDept(dept);
                            setDeptForm({
                              name: dept.name,
                              code: dept.code,
                              description: dept.description || "",
                            });
                            setDeptErrors({});
                            setDeptDialogError(null);
                            setDeptDialogOpen(true);
                          }}
                          className="h-8 px-2 text-slate-600 hover:text-slate-900"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-0">
                    <p className="text-xs text-slate-600 leading-relaxed min-h-[32px]">
                      {dept.description || "No division description specified."}
                    </p>

                    {deptPositions.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                          Associated Positions
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {deptPositions.map((pos) => (
                            <span
                              key={pos.id}
                              className="text-xs text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200"
                            >
                              {pos.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )
      ) : filteredPositions.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-slate-300 bg-white p-6">
          <Briefcase className="mx-auto h-8 w-8 text-slate-400" />
          <h4 className="mt-2 text-sm font-semibold text-slate-800">No Positions Configured</h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Configure positions like Principal, Teacher, Lab Assistant, or Bursar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPositions.map((pos) => {
            const dept = departments.find((d) => d.id === pos.departmentId);

            return (
              <Card key={pos.id} className="hover:shadow-sm transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-slate-900 leading-tight">
                        {pos.title}
                      </CardTitle>
                      <div className="mt-1 text-xs text-slate-500 font-mono flex items-center gap-1.5">
                        <span>{pos.code}</span>
                        <span>·</span>
                        <span className="font-sans text-slate-700">
                          {dept ? dept.name : "Institutional"}
                        </span>
                      </div>
                    </div>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPos(pos);
                          setPosForm({
                            title: pos.title,
                            code: pos.code,
                            description: pos.description || "",
                            departmentId: pos.departmentId || "",
                          });
                          setPosErrors({});
                          setPosDialogError(null);
                          setPosDialogOpen(true);
                        }}
                        className="h-8 px-2 text-slate-600 hover:text-slate-900"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {pos.description || "Designated staff position and institutional responsibility."}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Department Modal */}
      <Dialog
        open={deptDialogOpen}
        onOpenChange={setDeptDialogOpen}
        title={editingDept ? "Edit Department" : "Create New Department"}
        description="Specify division name, department code, and organizational scope."
        maxWidth="md"
      >
        <form onSubmit={handleDeptSubmit} className="space-y-4 pt-2">
          {deptDialogError && <Alert variant="destructive">{deptDialogError}</Alert>}

          <FormField label="Department Name" required error={deptErrors.name}>
            <Input
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="e.g. Science & Mathematics Faculty, Administration"
              disabled={submitting}
            />
          </FormField>

          <FormField
            label="Department Code"
            required
            error={deptErrors.code}
            description="Unique abbreviation (e.g. SCI, ADM, HUM)"
          >
            <Input
              value={deptForm.code}
              onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
              placeholder="e.g. SCI"
              disabled={submitting}
              className="font-mono uppercase"
            />
          </FormField>

          <FormField label="Description">
            <textarea
              value={deptForm.description}
              onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
              placeholder="Outline department scope or faculty focus..."
              rows={3}
              disabled={submitting}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeptDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {editingDept ? "Save Department" : "Create Department"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Position Modal */}
      <Dialog
        open={posDialogOpen}
        onOpenChange={setPosDialogOpen}
        title={editingPos ? "Edit Position" : "Create Position"}
        description="Establish job titles, role codes, and parent departments."
        maxWidth="md"
      >
        <form onSubmit={handlePosSubmit} className="space-y-4 pt-2">
          {posDialogError && <Alert variant="destructive">{posDialogError}</Alert>}

          <FormField label="Position Title" required error={posErrors.title}>
            <Input
              value={posForm.title}
              onChange={(e) => setPosForm({ ...posForm, title: e.target.value })}
              placeholder="e.g. Senior Mathematics Teacher, Head of Department"
              disabled={submitting}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              label="Position Code"
              required
              error={posErrors.code}
              description="e.g. TCH-SR, HOD-SCI"
            >
              <Input
                value={posForm.code}
                onChange={(e) => setPosForm({ ...posForm, code: e.target.value.toUpperCase() })}
                placeholder="e.g. TCH-SR"
                disabled={submitting}
                className="font-mono uppercase"
              />
            </FormField>

            <FormField label="Assigned Department">
              <Select
                value={posForm.departmentId}
                onChange={(e) => setPosForm({ ...posForm, departmentId: e.target.value })}
                options={[
                  { value: "", label: "General Institution" },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
                disabled={submitting}
              />
            </FormField>
          </div>

          <FormField label="Description">
            <textarea
              value={posForm.description}
              onChange={(e) => setPosForm({ ...posForm, description: e.target.value })}
              placeholder="Outline responsibilities or role prerequisites..."
              rows={3}
              disabled={submitting}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPosDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {editingPos ? "Save Position" : "Create Position"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
