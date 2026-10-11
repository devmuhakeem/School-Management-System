import * as React from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { SYSTEM_ROLES_CONFIG, SYSTEM_PERMISSIONS } from "@/lib/auth/rbac-config";
import { ShieldCheck, Lock, CheckCircle2, XCircle, Key, UserCheck, Layers, RefreshCw } from "lucide-react";

export function RbacManagerView() {
  const { user, token, hasPermission, hasRole } = useAuth();
  const { addToast } = useToast();

  const [selectedRole, setSelectedRole] = React.useState<string>("Super Administrator");
  const [testEndpointResult, setTestEndpointResult] = React.useState<{
    endpoint: string;
    status: number;
    message: string;
    success: boolean;
  } | null>(null);
  const [testingEndpoint, setTestingEndpoint] = React.useState(false);

  const activeRoleConfig = SYSTEM_ROLES_CONFIG.find((r) => r.name === selectedRole) || SYSTEM_ROLES_CONFIG[0];

  const testApi = async (endpoint: string, method: string = "GET", requiredPerm: string = "") => {
    setTestingEndpoint(true);
    setTestEndpointResult(null);

    try {
      const res = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const json = await res.json();

      if (res.ok) {
        setTestEndpointResult({
          endpoint,
          status: res.status,
          message: json.message || "Authorized: You possess the required permission.",
          success: true,
        });
        addToast({
          type: "success",
          title: "Access Authorized",
          description: `Server allowed ${method} ${endpoint} (User has ${requiredPerm}).`,
        });
      } else {
        setTestEndpointResult({
          endpoint,
          status: res.status,
          message: json.error?.message || "Forbidden: Missing required permission.",
          success: false,
        });
        addToast({
          type: "error",
          title: "403 Access Denied",
          description: json.error?.message || `Server blocked request: Missing ${requiredPerm}.`,
        });
      }
    } catch (err) {
      setTestEndpointResult({
        endpoint,
        status: 500,
        message: err instanceof Error ? err.message : "Network error",
        success: false,
      });
    } finally {
      setTestingEndpoint(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Role-Based Access Control (RBAC) Architecture
            </h2>
            <Badge variant="default" className="bg-emerald-600 text-white font-mono text-[10px]">
              Phase 3 Live
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Database-backed permission matrix, server guards, tenant isolation, and live endpoint testing
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-100 p-1.5 rounded-lg border border-slate-200">
          <UserCheck className="h-4 w-4 text-indigo-600" />
          <span className="text-slate-600">Active User:</span>
          <strong className="text-slate-900">{user?.firstName} {user?.lastName}</strong>
          <span className="text-slate-400">·</span>
          <span className="font-semibold text-indigo-700">{user?.roles[0]}</span>
        </div>
      </div>

      {/* Live Server-Side Authorization Testing Panel */}
      <Card className="border-indigo-200/80 bg-indigo-50/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-600 text-white rounded-md">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm">Live Server Enforcement Testbed</CardTitle>
                <CardDescription className="text-xs">
                  Trigger protected API endpoints with your current JWT token to verify real server-side authorization
                </CardDescription>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Section 15 & 26 Compliance</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Admin Roles API</span>
                <span className="text-[10px] font-mono text-slate-500">roles.read</span>
              </div>
              <p className="text-[11px] text-slate-500">Requires roles.read permission.</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                disabled={testingEndpoint}
                onClick={() => testApi("/api/admin/roles", "GET", "roles.read")}
              >
                Test GET /api/admin/roles
              </Button>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Student Create API</span>
                <span className="text-[10px] font-mono text-slate-500">students.create</span>
              </div>
              <p className="text-[11px] text-slate-500">Requires students.create permission.</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                disabled={testingEndpoint}
                onClick={() => testApi("/api/students", "POST", "students.create")}
              >
                Test POST /api/students
              </Button>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Finance Invoices API</span>
                <span className="text-[10px] font-mono text-slate-500">finance.read</span>
              </div>
              <p className="text-[11px] text-slate-500">Requires finance.read permission.</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                disabled={testingEndpoint}
                onClick={() => testApi("/api/finance/invoices", "GET", "finance.read")}
              >
                Test GET /api/finance/invoices
              </Button>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">Attendance API</span>
                <span className="text-[10px] font-mono text-slate-500">attendance.read</span>
              </div>
              <p className="text-[11px] text-slate-500">Requires attendance.read permission.</p>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                disabled={testingEndpoint}
                onClick={() => testApi("/api/attendance", "GET", "attendance.read")}
              >
                Test GET /api/attendance
              </Button>
            </div>
          </div>

          {testEndpointResult && (
            <Alert
              variant={testEndpointResult.success ? "success" : "destructive"}
              title={`Server Response: HTTP ${testEndpointResult.status}`}
            >
              <div className="space-y-1">
                <p>{testEndpointResult.message}</p>
                <p className="text-[11px] font-mono opacity-80">
                  Endpoint: {testEndpointResult.endpoint}
                </p>
              </div>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Roles & Permissions Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: 14 System Roles List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">14 PRD System Roles</CardTitle>
            <CardDescription className="text-xs">
              Select a role to inspect its granular permission set
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 space-y-1 max-h-[480px] overflow-y-auto">
            {SYSTEM_ROLES_CONFIG.map((role) => {
              const isSelected = selectedRole === role.name;
              const userHasThisRole = user?.roles.includes(role.name);

              return (
                <button
                  key={role.name}
                  type="button"
                  onClick={() => setSelectedRole(role.name)}
                  className={`w-full text-left p-2.5 rounded-md text-xs transition-colors cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? "bg-slate-900 text-white font-semibold shadow-xs"
                      : "hover:bg-slate-100 text-slate-800"
                  }`}
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <p className="truncate">{role.name}</p>
                    <p className={`text-[10px] truncate ${isSelected ? "text-slate-300" : "text-slate-400"}`}>
                      {role.permissions.length} permissions
                    </p>
                  </div>
                  {userHasThisRole && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-medium shrink-0">
                      Your Role
                    </span>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Right column: Role Details & Permissions Mapping */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{activeRoleConfig.name}</CardTitle>
                <CardDescription className="text-xs">{activeRoleConfig.description}</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-[11px]">
                {activeRoleConfig.roleType}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-800">
                  Granular Permissions Granted ({activeRoleConfig.permissions.length}):
                </span>
                <span className="text-[11px] text-slate-400">
                  Database Table: <code>role_permissions</code>
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-56 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-lg">
                {activeRoleConfig.permissions.map((perm) => (
                  <span
                    key={perm}
                    className="inline-flex items-center gap-1 text-[11px] font-mono bg-white text-slate-800 px-2 py-0.5 rounded border border-slate-200 shadow-2xs"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    <span>{perm}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <span className="text-xs font-semibold text-slate-800">
                Evaluation for Current User ({user?.email}):
              </span>
              <div className="p-3 rounded-lg border border-slate-200 bg-white text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Assigned Roles:</span>
                  <span className="font-semibold text-slate-900">{user?.roles.join(", ")}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Effective Permissions Count:</span>
                  <span className="font-mono font-semibold text-indigo-700">
                    {user?.roles.includes("Super Administrator") ? "All 35+ System Permissions" : `${user?.permissions.length} granted`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Tenant Boundary:</span>
                  <span className="font-mono text-[11px] text-slate-700">{user?.organization.name} ({user?.organization.code})</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
