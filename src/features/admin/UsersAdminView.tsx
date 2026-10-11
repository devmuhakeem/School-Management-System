import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "@/components/ui/toast";
import { SYSTEM_ROLES_CONFIG } from "@/lib/auth/rbac-config";
import {
  Users,
  Search,
  Shield,
  ShieldCheck,
  Building2,
  Lock,
  UserCheck,
  UserX,
  Edit2,
  Key,
  Check,
} from "lucide-react";

export interface UserItem {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | "INVITED";
  roles: string[];
  campusIds: string[];
}

export function UsersAdminView() {
  const { token, user: currentUser, hasPermission } = useAuth();
  const { addToast } = useToast();

  const [users, setUsers] = React.useState<UserItem[]>([]);
  const [campuses, setCampuses] = React.useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [activeTab, setActiveTab] = React.useState<"users" | "roles">("users");

  // Status Change Dialog
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<UserItem | null>(null);
  const [targetStatus, setTargetStatus] = React.useState<UserItem["status"]>("ACTIVE");

  // Edit Roles Dialog
  const [rolesDialogOpen, setRolesDialogOpen] = React.useState(false);
  const [userForRoles, setUserForRoles] = React.useState<UserItem | null>(null);
  const [selectedRoles, setSelectedRoles] = React.useState<string[]>([]);

  // Edit Campuses Dialog
  const [campusDialogOpen, setCampusDialogOpen] = React.useState(false);
  const [userForCampuses, setUserForCampuses] = React.useState<UserItem | null>(null);
  const [selectedCampuses, setSelectedCampuses] = React.useState<string[]>([]);

  const [submitting, setSubmitting] = React.useState(false);
  const [dialogError, setDialogError] = React.useState<string | null>(null);

  const canManageUsers = hasPermission("users.update");
  const canManageRoles = hasPermission("roles.manage");

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, campusesRes] = await Promise.all([
        fetch("/api/admin/users", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/admin/campuses", { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (usersRes.ok && campusesRes.ok) {
        const usersJson = await usersRes.json();
        const campusesJson = await campusesRes.json();
        setUsers(usersJson.data || []);
        setCampuses(campusesJson.data || []);
      }
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Status Update
  const handleUpdateStatus = async () => {
    if (!selectedUser || !canManageUsers) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: targetStatus }),
      });

      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: "User Status Updated",
          description: `${selectedUser.firstName} ${selectedUser.lastName} is now ${targetStatus}.`,
        });
        setStatusDialogOpen(false);
        loadData();
      } else {
        addToast({
          type: "error",
          title: "Update Failed",
          description: json.error?.message || "Failed to update user status.",
        });
      }
    } catch {
      addToast({
        type: "error",
        title: "Network Error",
        description: "Failed to communicate with authentication service.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Roles Update
  const handleUpdateRoles = async () => {
    if (!userForRoles || !canManageRoles) return;

    if (selectedRoles.length === 0) {
      setDialogError("At least one institutional role must be assigned.");
      return;
    }

    setSubmitting(true);
    setDialogError(null);
    try {
      const res = await fetch(`/api/admin/users/${userForRoles.id}/roles`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roles: selectedRoles }),
      });

      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: "Roles Updated",
          description: `Assigned ${selectedRoles.length} roles to ${userForRoles.firstName}.`,
        });
        setRolesDialogOpen(false);
        loadData();
      } else {
        setDialogError(json.error?.message || "Failed to update assigned roles.");
      }
    } catch {
      setDialogError("Network error while submitting role updates.");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Campus Membership Update
  const handleUpdateCampuses = async () => {
    if (!userForCampuses || !canManageUsers) return;

    setSubmitting(true);
    setDialogError(null);
    try {
      const res = await fetch(`/api/admin/users/${userForCampuses.id}/campuses`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ campusIds: selectedCampuses }),
      });

      const json = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: "Campus Access Updated",
          description: `Campus memberships updated for ${userForCampuses.firstName}.`,
        });
        setCampusDialogOpen(false);
        loadData();
      } else {
        setDialogError(json.error?.message || "Failed to update campus memberships.");
      }
    } catch {
      setDialogError("Network error while updating campus access.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.roles.some((r) => r.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <span>User Accounts & Security Governance</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Institutional authentication accounts, role assignments, status lifecycle, and multi-campus boundaries.
          </p>
        </div>
      </div>

      {/* Tabs and Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "users"
                ? "bg-white text-indigo-700 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            User Accounts ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("roles")}
            className={`px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === "roles"
                ? "bg-white text-indigo-700 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            System Roles & Permissions ({SYSTEM_ROLES_CONFIG.length})
          </button>
        </div>

        {activeTab === "users" && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search user, email, role..."
                className="pl-9 h-10"
              />
            </div>

            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs">
              {["all", "ACTIVE", "INACTIVE", "SUSPENDED"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-md font-medium transition-colors capitalize ${
                    statusFilter === st
                      ? "bg-white text-indigo-700 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st === "all" ? "All" : st.toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Table / View */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <LoadingSpinner size="md" />
        </div>
      ) : activeTab === "users" ? (
        filteredUsers.length === 0 ? (
          <div className="text-center py-12 rounded-lg border border-dashed border-slate-300 bg-white p-6">
            <Users className="mx-auto h-8 w-8 text-slate-400" />
            <h4 className="mt-2 text-sm font-semibold text-slate-800">No Users Match Criteria</h4>
            <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
              Refine your search term or status filter to locate accounts.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold select-none">
                    <th className="px-4 py-3">Account Identity</th>
                    <th className="px-4 py-3">Assigned Roles</th>
                    <th className="px-4 py-3">Campus Boundaries</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    const assignedCampuses = campuses.filter((c) => u.campusIds.includes(c.id));

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Identity */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-600 text-white font-semibold text-xs shadow-xs">
                              {u.firstName[0]}
                              {u.lastName[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 leading-tight flex items-center gap-1.5">
                                <span>{u.firstName} {u.lastName}</span>
                                {isSelf && (
                                  <span className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-mono">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500 mt-0.5">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Assigned Roles - Zero Pill quiet formatting */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap items-center gap-1">
                            {u.roles.map((r, idx) => (
                              <span key={idx} className="text-slate-800 font-medium">
                                {r}
                                {idx < u.roles.length - 1 && <span className="text-slate-400 mx-1">·</span>}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Campus Boundaries */}
                        <td className="px-4 py-3">
                          <span className="text-slate-700">
                            {assignedCampuses.length === 0
                              ? "All Campuses (Unrestricted)"
                              : assignedCampuses.map((c) => c.name).join(", ")}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                u.status === "ACTIVE"
                                  ? "bg-emerald-500"
                                  : u.status === "SUSPENDED"
                                  ? "bg-rose-500"
                                  : "bg-amber-400"
                              }`}
                            />
                            <span className="capitalize text-slate-700 font-medium">
                              {u.status.toLowerCase()}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {canManageRoles && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setUserForRoles(u);
                                  setSelectedRoles([...u.roles]);
                                  setDialogError(null);
                                  setRolesDialogOpen(true);
                                }}
                                className="h-7 text-xs px-2 text-slate-700"
                                title="Assign or modify roles"
                              >
                                <Shield className="h-3 w-3 mr-1 text-indigo-600" />
                                <span>Roles</span>
                              </Button>
                            )}

                            {canManageUsers && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setUserForCampuses(u);
                                  setSelectedCampuses([...u.campusIds]);
                                  setDialogError(null);
                                  setCampusDialogOpen(true);
                                }}
                                className="h-7 text-xs px-2 text-slate-700"
                                title="Configure campus access"
                              >
                                <Building2 className="h-3 w-3 mr-1 text-slate-500" />
                                <span>Campus</span>
                              </Button>
                            )}

                            {canManageUsers && !isSelf && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(u);
                                  setTargetStatus(u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
                                  setStatusDialogOpen(true);
                                }}
                                className={`h-7 px-2 text-xs ${
                                  u.status === "ACTIVE"
                                    ? "text-slate-500 hover:text-rose-600"
                                    : "text-slate-500 hover:text-emerald-600"
                                }`}
                              >
                                {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Roles & Permissions Tab */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SYSTEM_ROLES_CONFIG.map((role) => {
            const usersWithRole = users.filter((u) => u.roles.includes(role.name));

            return (
              <Card key={role.name} className="shadow-2xs">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-sm font-semibold text-slate-900 leading-tight">
                        {role.name}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {role.description}
                      </CardDescription>
                    </div>
                    <div className="p-1.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <span className="font-medium">Assigned Users</span>
                    <span className="font-bold text-slate-900">{usersWithRole.length} Accounts</span>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Granted Permissions ({role.permissions.length})
                    </p>
                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                      {role.permissions.map((perm) => (
                        <span
                          key={perm}
                          className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                        >
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Status Confirmation Modal */}
      <ConfirmationDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        title={targetStatus === "ACTIVE" ? "Reactivate User Account" : "Deactivate User Account"}
        description={`Are you sure you want to ${
          targetStatus === "ACTIVE" ? "reactivate" : "deactivate"
        } account ${selectedUser?.email}? Deactivating will immediately invalidate active login tokens.`}
        confirmLabel={targetStatus === "ACTIVE" ? "Reactivate" : "Deactivate Account"}
        destructive={targetStatus !== "ACTIVE"}
        onConfirm={handleUpdateStatus}
      />

      {/* Role Assignment Modal */}
      <Dialog
        open={rolesDialogOpen}
        onOpenChange={setRolesDialogOpen}
        title={`Assign Roles: ${userForRoles?.firstName} ${userForRoles?.lastName}`}
        description="Select institutional permissions and access levels for this account."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          {dialogError && <Alert variant="destructive">{dialogError}</Alert>}

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {SYSTEM_ROLES_CONFIG.map((role) => {
              const isChecked = selectedRoles.includes(role.name);

              return (
                <div
                  key={role.name}
                  onClick={() => {
                    if (isChecked) {
                      setSelectedRoles(selectedRoles.filter((r) => r !== role.name));
                    } else {
                      setSelectedRoles([...selectedRoles, role.name]);
                    }
                  }}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                    isChecked
                      ? "border-indigo-300 bg-indigo-50/50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-900">{role.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{role.description}</p>
                    <p className="text-[10px] text-indigo-600 font-mono mt-1">
                      {role.permissions.length} granular permissions
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRolesDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={submitting}
              onClick={handleUpdateRoles}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save Roles
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Campus Access Modal */}
      <Dialog
        open={campusDialogOpen}
        onOpenChange={setCampusDialogOpen}
        title={`Campus Boundaries: ${userForCampuses?.firstName} ${userForCampuses?.lastName}`}
        description="Restrict account authority to specific branch locations, or leave empty for all branches."
        maxWidth="md"
      >
        <div className="space-y-4 pt-2">
          {dialogError && <Alert variant="destructive">{dialogError}</Alert>}

          <p className="text-xs text-slate-600">
            Selected campuses restrict which branches this user can access or switch between:
          </p>

          <div className="space-y-2">
            {campuses.map((c) => {
              const isChecked = selectedCampuses.includes(c.id);

              return (
                <div
                  key={c.id}
                  onClick={() => {
                    if (isChecked) {
                      setSelectedCampuses(selectedCampuses.filter((id) => id !== c.id));
                    } else {
                      setSelectedCampuses([...selectedCampuses, c.id]);
                    }
                  }}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                    isChecked
                      ? "border-indigo-300 bg-indigo-50/50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                  />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-slate-900">{c.name}</p>
                    <p className="text-[11px] font-mono text-slate-500">ID: {c.id}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCampusDialogOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              isLoading={submitting}
              onClick={handleUpdateCampuses}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Save Campus Access
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
