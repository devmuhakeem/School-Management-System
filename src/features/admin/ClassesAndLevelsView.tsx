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
import { Layers, Plus, Edit2, Users, DoorOpen, Trash2 } from "lucide-react";

interface ClassLevel {
  id: string;
  name: string;
  code: string;
  sequenceOrder: number;
  description?: string;
}

interface Section {
  id: string;
  name: string;
  code: string;
  roomNumber?: string;
  capacity: number;
}

interface ClassRecord {
  id: string;
  name: string;
  code: string;
  capacity: number;
  classLevelId: string;
  academicYearId: string;
  level?: ClassLevel;
  sections?: Section[];
}

export function ClassesAndLevelsView() {
  const { token, hasPermission } = useAuth();
  const { addToast } = useToast();

  const [levels, setLevels] = React.useState<ClassLevel[]>([]);
  const [classes, setClasses] = React.useState<ClassRecord[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Level Dialog
  const [levelDialogOpen, setLevelDialogOpen] = React.useState(false);
  const [editingLevel, setEditingLevel] = React.useState<ClassLevel | null>(null);
  const [levelForm, setLevelForm] = React.useState({ name: "", code: "", sequenceOrder: 1, description: "" });
  const [levelError, setLevelError] = React.useState<string | null>(null);

  // Class Dialog
  const [classDialogOpen, setClassDialogOpen] = React.useState(false);
  const [editingClass, setEditingClass] = React.useState<ClassRecord | null>(null);
  const [classForm, setClassForm] = React.useState({
    name: "",
    code: "",
    capacity: 35,
    classLevelId: "",
    academicYearId: "ay-2025-26",
  });
  const [classError, setClassError] = React.useState<string | null>(null);

  // Section Dialog
  const [sectionDialogOpen, setSectionDialogOpen] = React.useState(false);
  const [targetClassId, setTargetClassId] = React.useState<string | null>(null);
  const [sectionForm, setSectionForm] = React.useState({ name: "", code: "", roomNumber: "", capacity: 30 });
  const [sectionError, setSectionError] = React.useState<string | null>(null);

  const [submitting, setSubmitting] = React.useState(false);

  const canManage = hasPermission("academics.manage");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [levelsRes, classesRes] = await Promise.all([
        fetch("/api/admin/class-levels", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/classes", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (levelsRes.ok && classesRes.ok) {
        const levelsJson = await levelsRes.json();
        const classesJson = await classesRes.json();
        setLevels(levelsJson.data || []);
        setClasses(classesJson.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Level Actions
  const handleOpenCreateLevel = () => {
    setEditingLevel(null);
    setLevelForm({
      name: "",
      code: "",
      sequenceOrder: levels.length + 1,
      description: "",
    });
    setLevelError(null);
    setLevelDialogOpen(true);
  };

  const handleOpenEditLevel = (lvl: ClassLevel) => {
    setEditingLevel(lvl);
    setLevelForm({
      name: lvl.name,
      code: lvl.code,
      sequenceOrder: lvl.sequenceOrder,
      description: lvl.description || "",
    });
    setLevelError(null);
    setLevelDialogOpen(true);
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setLevelError(null);

    try {
      const url = editingLevel ? `/api/admin/class-levels/${editingLevel.id}` : "/api/admin/class-levels";
      const method = editingLevel ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(levelForm),
      });

      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: editingLevel ? "Class Level Updated" : "Class Level Created",
          description: `${levelForm.name} saved.`,
        });
        setLevelDialogOpen(false);
        loadData();
      } else {
        setLevelError(json.error?.message || "Failed to save level.");
      }
    } catch {
      setLevelError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  // Class Actions
  const handleOpenCreateClass = () => {
    setEditingClass(null);
    setClassForm({
      name: "",
      code: "",
      capacity: 35,
      classLevelId: levels[0]?.id || "",
      academicYearId: "ay-2025-26",
    });
    setClassError(null);
    setClassDialogOpen(true);
  };

  const handleOpenEditClass = (cls: ClassRecord) => {
    setEditingClass(cls);
    setClassForm({
      name: cls.name,
      code: cls.code,
      capacity: cls.capacity,
      classLevelId: cls.classLevelId,
      academicYearId: cls.academicYearId,
    });
    setClassError(null);
    setClassDialogOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setClassError(null);

    try {
      const url = editingClass ? `/api/admin/classes/${editingClass.id}` : "/api/admin/classes";
      const method = editingClass ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(classForm),
      });

      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: editingClass ? "Class Updated" : "Class Created",
          description: `${classForm.name} saved.`,
        });
        setClassDialogOpen(false);
        loadData();
      } else {
        setClassError(json.error?.message || "Failed to save class.");
      }
    } catch {
      setClassError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  // Section Actions
  const handleOpenAddSection = (classId: string) => {
    setTargetClassId(classId);
    setSectionForm({ name: "", code: "", roomNumber: "", capacity: 30 });
    setSectionError(null);
    setSectionDialogOpen(true);
  };

  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClassId) return;

    setSubmitting(true);
    setSectionError(null);

    try {
      const res = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ classId: targetClassId, ...sectionForm }),
      });

      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: "Section Created",
          description: `${sectionForm.name} added to class.`,
        });
        setSectionDialogOpen(false);
        loadData();
      } else {
        setSectionError(json.error?.message || "Failed to create section.");
      }
    } catch {
      setSectionError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Class Levels, Classes & Sections</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure student progression tiers, cohort classes, capacity quotas, and section arms
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 self-start">
            <Button onClick={handleOpenCreateLevel} variant="outline" size="sm" className="gap-1.5 text-xs">
              <Plus className="h-4 w-4" />
              <span>New Class Level</span>
            </Button>
            <Button onClick={handleOpenCreateClass} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              <Plus className="h-4 w-4" />
              <span>Create Class</span>
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Class Levels Column */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Class Levels ({levels.length})
              </h3>
            </div>

            <div className="space-y-2">
              {levels.map((lvl) => (
                <div
                  key={lvl.id}
                  className="p-3 bg-white border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs">{lvl.name}</span>
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-600 font-bold">
                          {lvl.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Order #{lvl.sequenceOrder} {lvl.description && `· ${lvl.description}`}
                      </p>
                    </div>

                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEditLevel(lvl)}
                        className="h-7 w-7 text-slate-400 hover:text-slate-800"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Classes & Sections Column */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Classes & Section Arms ({classes.length})
            </h3>

            {classes.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <p className="text-xs text-slate-500">No classes configured yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {classes.map((cls) => (
                  <Card key={cls.id} className="shadow-2xs border-slate-200">
                    <CardHeader className="py-3 px-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 text-sm">{cls.name}</span>
                            <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                              {cls.code}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            Capacity: {cls.capacity} students · Tier: {cls.level?.name || "General"}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditClass(cls)}
                              className="text-xs text-slate-600"
                            >
                              <Edit2 className="h-3 w-3 mr-1" />
                              <span>Edit</span>
                            </Button>
                          )}
                          {canManage && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenAddSection(cls.id)}
                              className="text-xs gap-1"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Add Section</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    {/* Sections */}
                    <CardContent className="py-2.5 px-4 bg-slate-50/50 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-1.5 text-[11px] font-medium text-slate-600">
                        <DoorOpen className="h-3.5 w-3.5 text-slate-400" />
                        <span>Section Arms ({cls.sections?.length || 0}):</span>
                      </div>

                      {(!cls.sections || cls.sections.length === 0) ? (
                        <p className="text-xs text-slate-400 italic">No section arms created.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cls.sections.map((sec) => (
                            <div
                              key={sec.id}
                              className="p-2.5 rounded bg-white border border-slate-200 text-xs flex items-center justify-between"
                            >
                              <div>
                                <span className="font-semibold text-slate-800">{sec.name}</span>
                                <span className="font-mono text-[10px] text-slate-500 ml-1.5">({sec.code})</span>
                                {sec.roomNumber && (
                                  <p className="text-[11px] text-slate-400 mt-0.5">{sec.roomNumber}</p>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 font-mono">
                                Cap: {sec.capacity}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Class Level Dialog */}
      <Dialog
        open={levelDialogOpen}
        onOpenChange={setLevelDialogOpen}
        title={editingLevel ? "Edit Class Level" : "Create Class Level"}
        description="Progression tier in the academic hierarchy (e.g. JSS1, Grade 10)."
      >
        <form onSubmit={handleSaveLevel} className="space-y-4 pt-2">
          {levelError && <Alert variant="destructive" title="Error">{levelError}</Alert>}

          <FormField label="Level Name" required description="e.g. Senior Secondary 2">
            <Input
              value={levelForm.name}
              onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Level Code" required description="e.g. SS2">
              <Input
                value={levelForm.code}
                onChange={(e) => setLevelForm({ ...levelForm, code: e.target.value.toUpperCase() })}
                required
              />
            </FormField>

            <FormField label="Sequence Order" required description="Linear promotion ranking">
              <Input
                type="number"
                min={1}
                value={levelForm.sequenceOrder}
                onChange={(e) => setLevelForm({ ...levelForm, sequenceOrder: parseInt(e.target.value, 10) || 1 })}
                required
              />
            </FormField>
          </div>

          <FormField label="Description">
            <Input
              value={levelForm.description}
              onChange={(e) => setLevelForm({ ...levelForm, description: e.target.value })}
              placeholder="Optional notes or phase details"
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setLevelDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {submitting ? <LoadingSpinner size="sm" /> : "Save Level"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Class Dialog */}
      <Dialog
        open={classDialogOpen}
        onOpenChange={setClassDialogOpen}
        title={editingClass ? "Edit Class" : "Create New Class"}
        description="Cohort class tied to a class level and academic session."
      >
        <form onSubmit={handleSaveClass} className="space-y-4 pt-2">
          {classError && <Alert variant="destructive" title="Error">{classError}</Alert>}

          <FormField label="Class Name" required description="e.g. Grade 10 - 2026/2027 Cohort">
            <Input
              value={classForm.name}
              onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
              required
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Class Code" required description="e.g. G10-2627">
              <Input
                value={classForm.code}
                onChange={(e) => setClassForm({ ...classForm, code: e.target.value.toUpperCase() })}
                required
              />
            </FormField>

            <FormField label="Student Capacity" required>
              <Input
                type="number"
                min={1}
                max={200}
                value={classForm.capacity}
                onChange={(e) => setClassForm({ ...classForm, capacity: parseInt(e.target.value, 10) || 35 })}
                required
              />
            </FormField>
          </div>

          <FormField label="Parent Class Level" required>
            <Select
              value={classForm.classLevelId}
              onChange={(e) => setClassForm({ ...classForm, classLevelId: e.target.value })}
              options={levels.map((l) => ({ value: l.id, label: `${l.name} (${l.code})` }))}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setClassDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {submitting ? <LoadingSpinner size="sm" /> : "Save Class"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Section Dialog */}
      <Dialog
        open={sectionDialogOpen}
        onOpenChange={setSectionDialogOpen}
        title="Add Section Arm to Class"
        description="Configure stream or arm (e.g. Section A, Diamond, Gold)."
      >
        <form onSubmit={handleSaveSection} className="space-y-4 pt-2">
          {sectionError && <Alert variant="destructive" title="Error">{sectionError}</Alert>}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Section Arm Name" required description="e.g. Section A or Diamond">
              <Input
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                required
              />
            </FormField>

            <FormField label="Section Code" required description="e.g. SEC-A">
              <Input
                value={sectionForm.code}
                onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value.toUpperCase() })}
                required
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Physical Room Number">
              <Input
                value={sectionForm.roomNumber}
                onChange={(e) => setSectionForm({ ...sectionForm, roomNumber: e.target.value })}
                placeholder="Room 101"
              />
            </FormField>

            <FormField label="Arm Capacity">
              <Input
                type="number"
                min={1}
                max={100}
                value={sectionForm.capacity}
                onChange={(e) => setSectionForm({ ...sectionForm, capacity: parseInt(e.target.value, 10) || 30 })}
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setSectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {submitting ? <LoadingSpinner size="sm" /> : "Create Section"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
