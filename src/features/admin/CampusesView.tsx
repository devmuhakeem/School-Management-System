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
import { Building2, Plus, Edit2, Power, Search, MapPin, Mail, Phone } from "lucide-react";

interface CampusRecord {
  id: string;
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  status: string;
  isDefault?: boolean;
}

export function CampusesView() {
  const { token, hasPermission } = useAuth();
  const { addToast } = useToast();

  const [campuses, setCampuses] = React.useState<CampusRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");

  // Dialog State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCampus, setEditingCampus] = React.useState<CampusRecord | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  // Status Toggle Confirmation
  const [confirmToggleOpen, setConfirmToggleOpen] = React.useState(false);
  const [campusToToggle, setCampusToToggle] = React.useState<CampusRecord | null>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    code: "",
    address: "",
    city: "",
    state: "",
    country: "United States",
    postalCode: "",
    phone: "",
    email: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  const canCreate = hasPermission("campuses.create");
  const canUpdate = hasPermission("campuses.update");

  const loadCampuses = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/campuses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setCampuses(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load campuses", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadCampuses();
  }, [loadCampuses]);

  const handleOpenCreate = () => {
    setEditingCampus(null);
    setFormData({
      name: "",
      code: "",
      address: "",
      city: "",
      state: "",
      country: "United States",
      postalCode: "",
      phone: "",
      email: "",
      status: "ACTIVE",
    });
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (c: CampusRecord) => {
    setEditingCampus(c);
    setFormData({
      name: c.name,
      code: c.code,
      address: c.address || "",
      city: c.city || "",
      state: c.state || "",
      country: c.country || "United States",
      postalCode: c.postalCode || "",
      phone: c.phone || "",
      email: c.email || "",
      status: (c.status as "ACTIVE" | "INACTIVE") || "ACTIVE",
    });
    setDialogError(null);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setDialogError(null);

    try {
      const url = editingCampus
        ? `/api/admin/campuses/${editingCampus.id}`
        : "/api/admin/campuses";
      const method = editingCampus ? "PUT" : "POST";

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
          title: editingCampus ? "Campus Updated" : "Campus Established",
          description: `${formData.name} branch saved successfully.`,
        });
        setDialogOpen(false);
        loadCampuses();
      } else {
        setDialogError(json.error?.message || "Operation failed.");
      }
    } catch (err) {
      setDialogError("Network error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!campusToToggle) return;
    try {
      const res = await fetch(`/api/admin/campuses/${campusToToggle.id}/toggle-status`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        addToast({
          type: "info",
          title: "Campus Status Changed",
          description: `Campus branch status updated.`,
        });
        loadCampuses();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmToggleOpen(false);
      setCampusToToggle(null);
    }
  };

  const filtered = campuses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      (c.city && c.city.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Campus Locations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage physical school branches, branch codes, addresses, and localized operational status
          </p>
        </div>

        {canCreate && (
          <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white self-start">
            <Plus className="h-4 w-4" />
            <span>Establish New Campus</span>
          </Button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campuses by name, code, or city..."
            className="pl-9 text-xs"
          />
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Campuses Cards / Grid */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="text-center py-10 shadow-2xs">
          <CardContent className="space-y-2">
            <Building2 className="mx-auto h-8 w-8 text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-800">No Campuses Found</h3>
            <p className="text-xs text-slate-500">
              {search ? "No campus records matching search criteria." : "No campuses configured yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((campus) => {
            const isActive = campus.status === "ACTIVE";

            return (
              <Card key={campus.id} className="shadow-2xs border-slate-200 hover:border-slate-300 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-sm">{campus.name}</span>
                        {campus.isDefault && (
                          <span className="text-[10px] text-indigo-700 font-mono font-medium">· Headquarters</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-mono text-slate-700 font-semibold">{campus.code}</span>
                        <span>·</span>
                        <span className={isActive ? "text-emerald-700 font-medium" : "text-slate-400"}>
                          {isActive ? "Operational" : "Deactivated"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(campus)}
                          className="h-8 w-8 text-slate-600 hover:text-slate-900"
                          title="Edit campus branch"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {canUpdate && !campus.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setCampusToToggle(campus);
                            setConfirmToggleOpen(true);
                          }}
                          className={`h-8 w-8 ${isActive ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"}`}
                          title={isActive ? "Deactivate campus branch" : "Activate campus branch"}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-2 pt-0 text-xs text-slate-600">
                  {campus.address && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {campus.address}
                        {campus.city && `, ${campus.city}`}
                        {campus.state && `, ${campus.state}`}
                      </span>
                    </div>
                  )}
                  {campus.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate">{campus.email}</span>
                    </div>
                  )}
                  {campus.phone && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span>{campus.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Campus Form Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        maxWidth="lg"
        title={editingCampus ? `Edit Campus Branch: ${editingCampus.name}` : "Establish New Campus Branch"}
        description="Provide location, unique campus code, and branch contact information."
      >
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {dialogError && (
            <Alert variant="destructive" title="Validation Error">
              {dialogError}
            </Alert>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Campus Branch Name" required>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. West Campus (Science Wing)"
                required
              />
            </FormField>

            <FormField label="Unique Branch Code" required description="2-6 letter alphanumeric code">
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CAMP-02"
                className="font-mono uppercase"
                required
              />
            </FormField>
          </div>

          <FormField label="Street Address">
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 45 Innovation Way"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="City">
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Boston"
              />
            </FormField>
            <FormField label="State / Province">
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="MA"
              />
            </FormField>
            <FormField label="Postal Code">
              <Input
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="02215"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Branch Email">
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="west.campus@school.internal"
              />
            </FormField>

            <FormField label="Branch Phone">
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 876-5432"
              />
            </FormField>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {submitting ? <LoadingSpinner size="sm" /> : editingCampus ? "Save Changes" : "Create Campus"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirmation Dialog for Status Change */}
      <ConfirmationDialog
        open={confirmToggleOpen}
        onOpenChange={setConfirmToggleOpen}
        title={campusToToggle?.status === "ACTIVE" ? "Deactivate Campus Branch" : "Activate Campus Branch"}
        description={`Are you sure you want to ${
          campusToToggle?.status === "ACTIVE" ? "deactivate" : "activate"
        } ${campusToToggle?.name}? Deactivating will prevent new cohort creation in this branch.`}
        confirmLabel={campusToToggle?.status === "ACTIVE" ? "Deactivate Branch" : "Activate Branch"}
        destructive={campusToToggle?.status === "ACTIVE"}
        onConfirm={handleToggleStatus}
      />
    </div>
  );
}
