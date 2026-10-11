import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/ui/toast";
import {
  Settings,
  Save,
  Globe,
  Palette,
  Bell,
  Sliders,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

export function SchoolSettingsView() {
  const { token, hasPermission } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [settings, setSettings] = React.useState({
    schoolName: "Apex International Academy",
    timezone: "America/New_York",
    locale: "en-US",
    currency: "USD",
    dateFormat: "YYYY-MM-DD",
    branding: {
      primaryColor: "#4f46e5",
      accentColor: "#06b6d4",
      themeMode: "light" as "light" | "dark" | "system",
    },
    contact: {
      primaryEmail: "admin@apex-demo.internal",
      primaryPhone: "+1 (555) 234-5678",
      postalAddress: "100 Academic Way, Metro City, NY 10001",
    },
    notifications: {
      emailAlerts: true,
      smsAlerts: false,
      attendanceDigest: true,
    },
  });

  const canManage = hasPermission("settings.manage");

  const loadSettings = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSettings((prev) => ({
            ...prev,
            ...json.data,
            branding: { ...prev.branding, ...json.data.branding },
            contact: { ...prev.contact, ...json.data.contact },
            notifications: { ...prev.notifications, ...json.data.notifications },
          }));
        }
      }
    } catch {
      setError("Failed to fetch settings from server.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(settings),
      });

      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: "Settings Saved",
          description: "Institutional configuration successfully updated.",
        });
      } else {
        setError(json.error?.message || "Failed to update configuration.");
      }
    } catch {
      setError("Network communication error.");
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="h-5 w-5 text-indigo-600" />
            <span>School Configuration & Global Parameters</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Configure system-wide parameters, regional date formatting, default locale, and institutional branding.
          </p>
        </div>

        {canManage && (
          <Button
            type="submit"
            size="sm"
            isLoading={saving}
            className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 min-h-[40px]"
          >
            <Save className="h-4 w-4" />
            <span>Save Configuration</span>
          </Button>
        )}
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General & Contacts */}
        <Card className="shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-indigo-600" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                General Institution Profile
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Primary institution title and official contact endpoints
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <FormField label="Official Institution Title" required>
              <Input
                value={settings.schoolName}
                onChange={(e) => setSettings({ ...settings, schoolName: e.target.value })}
                disabled={!canManage || saving}
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Primary Administrative Email">
                <Input
                  type="email"
                  value={settings.contact.primaryEmail}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      contact: { ...settings.contact, primaryEmail: e.target.value },
                    })
                  }
                  disabled={!canManage || saving}
                />
              </FormField>

              <FormField label="Official Phone">
                <Input
                  value={settings.contact.primaryPhone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      contact: { ...settings.contact, primaryPhone: e.target.value },
                    })
                  }
                  disabled={!canManage || saving}
                />
              </FormField>
            </div>

            <FormField label="Official Campus Address">
              <Input
                value={settings.contact.postalAddress}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    contact: { ...settings.contact, postalAddress: e.target.value },
                  })
                }
                disabled={!canManage || saving}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Regional & Localization */}
        <Card className="shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-sky-600" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Localization & Regional Standards
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Timezone computation, calendar date formatting, and official currency
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Institution Timezone">
                <Select
                  value={settings.timezone}
                  onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                  options={[
                    { value: "UTC", label: "UTC (Coordinated Universal Time)" },
                    { value: "America/New_York", label: "Eastern Time (US / NY)" },
                    { value: "America/Chicago", label: "Central Time (US / Chicago)" },
                    { value: "America/Los_Angeles", label: "Pacific Time (US / LA)" },
                    { value: "Europe/London", label: "GMT / London (UK)" },
                    { value: "Africa/Lagos", label: "West Africa Time (WAT)" },
                    { value: "Asia/Dubai", label: "Gulf Standard Time (GST)" },
                  ]}
                  disabled={!canManage || saving}
                />
              </FormField>

              <FormField label="Standard Locale">
                <Select
                  value={settings.locale}
                  onChange={(e) => setSettings({ ...settings, locale: e.target.value })}
                  options={[
                    { value: "en-US", label: "English (United States)" },
                    { value: "en-GB", label: "English (United Kingdom)" },
                    { value: "fr-FR", label: "French (France)" },
                    { value: "es-ES", label: "Spanish (Spain)" },
                  ]}
                  disabled={!canManage || saving}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Calendar Date Format">
                <Select
                  value={settings.dateFormat}
                  onChange={(e) => setSettings({ ...settings, dateFormat: e.target.value })}
                  options={[
                    { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO 8601 Standard)" },
                    { value: "DD/MM/YYYY", label: "DD/MM/YYYY (UK / International)" },
                    { value: "MM/DD/YYYY", label: "MM/DD/YYYY (US Format)" },
                  ]}
                  disabled={!canManage || saving}
                />
              </FormField>

              <FormField label="Accounting Currency">
                <Select
                  value={settings.currency}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  options={[
                    { value: "USD", label: "USD ($) United States Dollar" },
                    { value: "GBP", label: "GBP (£) British Pound" },
                    { value: "EUR", label: "EUR (€) Euro" },
                    { value: "NGN", label: "NGN (₦) Nigerian Naira" },
                    { value: "CAD", label: "CAD ($) Canadian Dollar" },
                  ]}
                  disabled={!canManage || saving}
                />
              </FormField>
            </div>
          </CardContent>
        </Card>

        {/* Branding & Palette */}
        <Card className="shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Institutional Theme & Branding
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Portal identity colors and display mode parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Primary Brand Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.branding.primaryColor}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        branding: { ...settings.branding, primaryColor: e.target.value },
                      })
                    }
                    disabled={!canManage || saving}
                    className="h-9 w-12 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <Input
                    value={settings.branding.primaryColor}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        branding: { ...settings.branding, primaryColor: e.target.value },
                      })
                    }
                    disabled={!canManage || saving}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </FormField>

              <FormField label="Accent Brand Color">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.branding.accentColor}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        branding: { ...settings.branding, accentColor: e.target.value },
                      })
                    }
                    disabled={!canManage || saving}
                    className="h-9 w-12 rounded border border-slate-300 cursor-pointer p-0.5"
                  />
                  <Input
                    value={settings.branding.accentColor}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        branding: { ...settings.branding, accentColor: e.target.value },
                      })
                    }
                    disabled={!canManage || saving}
                    className="font-mono text-xs uppercase"
                  />
                </div>
              </FormField>
            </div>

            <FormField label="Default Interface Theme">
              <Select
                value={settings.branding.themeMode}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    branding: { ...settings.branding, themeMode: e.target.value as any },
                  })
                }
                options={[
                  { value: "light", label: "Light Theme (Recommended for classrooms & offices)" },
                  { value: "dark", label: "Dark Theme" },
                  { value: "system", label: "System Sync" },
                ]}
                disabled={!canManage || saving}
              />
            </FormField>
          </CardContent>
        </Card>

        {/* Notifications & Communications */}
        <Card className="shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm font-semibold text-slate-900">
                Communication & Digest Channels
              </CardTitle>
            </div>
            <CardDescription className="text-xs">
              Automated notifications and digest dispatch rules
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <input
                  type="checkbox"
                  id="emailAlerts"
                  checked={settings.notifications.emailAlerts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        emailAlerts: e.target.checked,
                      },
                    })
                  }
                  disabled={!canManage || saving}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <label htmlFor="emailAlerts" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    System Email Dispatch
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Send automated security alerts, role assignments, and password reset notifications via SMTP.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <input
                  type="checkbox"
                  id="attendanceDigest"
                  checked={settings.notifications.attendanceDigest}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        attendanceDigest: e.target.checked,
                      },
                    })
                  }
                  disabled={!canManage || saving}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <label htmlFor="attendanceDigest" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    Daily Administrative Attendance Digest
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Compile daily roll-call summaries and unexcused absence reports for the Principal's office.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50 opacity-75">
                <input
                  type="checkbox"
                  id="smsAlerts"
                  checked={settings.notifications.smsAlerts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notifications: {
                        ...settings.notifications,
                        smsAlerts: e.target.checked,
                      },
                    })
                  }
                  disabled={!canManage || saving}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <label htmlFor="smsAlerts" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    Emergency SMS Gateway (Phase 7 Gateway Integration)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configuration placeholder for telecom SMS gateway integration in Multi-Channel Communications.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
