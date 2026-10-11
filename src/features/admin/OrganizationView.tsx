import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/ui/toast";
import { Building2, Save, RefreshCw, CheckCircle2 } from "lucide-react";

export function OrganizationView() {
  const { token, hasPermission } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    name: "",
    code: "",
    slug: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    status: "ACTIVE",
  });

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  const canEdit = hasPermission("organizations.update");

  const loadOrganization = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/organization", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        const org = json.data;
        setFormData({
          name: org.name || "",
          code: org.code || "",
          slug: org.slug || "",
          email: org.email || "",
          phone: org.phone || "",
          address: org.address || "",
          website: org.website || "",
          status: org.status || "ACTIVE",
        });
      } else {
        setError("Failed to load organization settings.");
      }
    } catch (err) {
      setError("Network error loading organization.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadOrganization();
  }, [loadOrganization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;

    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = "Organization name is required";
    if (!formData.code.trim()) errors.code = "Organization code is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/organization", {
        method: "PUT",
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
          title: "Organization Updated",
          description: "Institution profile changes have been persisted successfully.",
        });
      } else {
        setError(json.error?.message || "Failed to update organization.");
        if (json.error?.fieldErrors) {
          const mapped: Record<string, string> = {};
          for (const [k, v] of Object.entries(json.error.fieldErrors)) {
            mapped[k] = Array.isArray(v) ? (v[0] as string) : String(v);
          }
          setFieldErrors(mapped);
        }
      }
    } catch (err) {
      setError("Network error while updating organization.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Organization Profile</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure institutional entity details, legal registration codes, and contact data
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={loadOrganization} className="gap-1.5 self-start">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload</span>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" title="Error">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="shadow-2xs">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-600" />
              <span>Core Institutional Identity</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Primary entity metadata utilized across all child campuses, invoices, and certificates
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Organization Legal Name" required error={fieldErrors.name}>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Apex International Academy"
                  disabled={!canEdit || saving}
                />
              </FormField>

              <FormField
                label="Institution Code"
                required
                description="Unique identifier prefix for this tenant"
                error={fieldErrors.code}
              >
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. APEX"
                  className="font-mono uppercase"
                  disabled={!canEdit || saving}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Official Contact Email" error={fieldErrors.email}>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@school.internal"
                  disabled={!canEdit || saving}
                />
              </FormField>

              <FormField label="Official Phone Number" error={fieldErrors.phone}>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  disabled={!canEdit || saving}
                />
              </FormField>
            </div>

            <FormField label="Campus Headquarters Physical Address" error={fieldErrors.address}>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address, Suite, City, State, Country"
                disabled={!canEdit || saving}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Institution Website URL" error={fieldErrors.website}>
                <Input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://www.school.internal"
                  disabled={!canEdit || saving}
                />
              </FormField>

              <FormField label="Operational Status">
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={[
                    { value: "ACTIVE", label: "Active — In Full Operation" },
                    { value: "SUSPENDED", label: "Suspended — Operations Paused" },
                    { value: "ARCHIVED", label: "Archived — Legacy Record" },
                  ]}
                  disabled={!canEdit || saving}
                />
              </FormField>
            </div>
          </CardContent>

          {canEdit && (
            <CardFooter className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <Button type="submit" disabled={saving} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                {saving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
                <span>Save Organization Details</span>
              </Button>
            </CardFooter>
          )}
        </Card>
      </form>
    </div>
  );
}
