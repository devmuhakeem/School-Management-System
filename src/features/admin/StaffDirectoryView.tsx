import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  Users,
  Search,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Eye,
  GraduationCap,
  ShieldCheck,
} from "lucide-react";

export interface StaffItem {
  id: string;
  organizationId: string;
  campusId?: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  designation?: string;
  employmentType?: string;
  status: string;
  joinedDate?: string;
  departmentId?: string;
  positionId?: string;
  department?: { id: string; name: string };
  position?: { id: string; title: string };
  campus?: { id: string; name: string };
}

export function StaffDirectoryView() {
  const { token } = useAuth();

  const [staff, setStaff] = React.useState<StaffItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [campusFilter, setCampusFilter] = React.useState("");
  const [deptFilter, setDeptFilter] = React.useState("");

  // Campuses & Departments for filter dropdowns
  const [campuses, setCampuses] = React.useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = React.useState<Array<{ id: string; name: string }>>([]);

  // Selected Profile Modal
  const [selectedStaff, setSelectedStaff] = React.useState<StaffItem | null>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (search.trim()) queryParams.set("search", search.trim());
      if (campusFilter) queryParams.set("campusId", campusFilter);
      if (deptFilter) queryParams.set("departmentId", deptFilter);

      const [staffRes, campusesRes, deptsRes] = await Promise.all([
        fetch(`/api/admin/staff?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/campuses", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/departments", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (staffRes.ok) {
        const staffJson = await staffRes.json();
        setStaff(staffJson.data?.items || []);
      }
      if (campusesRes.ok) {
        const cJson = await campusesRes.json();
        setCampuses(cJson.data || []);
      }
      if (deptsRes.ok) {
        const dJson = await deptsRes.json();
        setDepartments(dJson.data || []);
      }
    } catch (err) {
      console.error("Failed to load staff directory", err);
    } finally {
      setLoading(false);
    }
  }, [token, search, campusFilter, deptFilter]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadData]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            <span>Staff & Faculty Administrative Directory</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Foundation employee registry with institutional assignment, position designations, and multi-campus branches.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, employee number..."
            className="pl-9 h-10"
          />
        </div>

        <div>
          <Select
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
            options={[
              { value: "", label: "All Campuses" },
              ...campuses.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>

        <div>
          <Select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            options={[
              { value: "", label: "All Departments" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-12 flex justify-center items-center">
          <LoadingSpinner size="md" />
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-12 rounded-lg border border-dashed border-slate-300 bg-white p-6">
          <Users className="mx-auto h-8 w-8 text-slate-400" />
          <h4 className="mt-2 text-sm font-semibold text-slate-800">No Staff Records Found</h4>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {search || campusFilter || deptFilter
              ? "No faculty members match your filter criteria."
              : "No staff records are registered in this organization yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-semibold select-none">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Department & Position</th>
                  <th className="px-4 py-3">Campus Branch</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Employee Name & ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 font-semibold text-xs">
                          {member.firstName[0]}
                          {member.lastName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                            {member.employeeNumber}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Department & Position */}
                    <td className="px-4 py-3">
                      <p className="text-slate-800 font-medium leading-tight">
                        {member.position?.title || member.designation || "Staff Member"}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {member.department?.name || "General Faculty"}
                      </p>
                    </td>

                    {/* Campus */}
                    <td className="px-4 py-3">
                      <span className="text-slate-700">
                        {member.campus?.name || "Main Campus"}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3">
                      <p className="text-slate-700 font-mono text-[11px]">{member.email}</p>
                      {member.phone && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{member.phone}</p>
                      )}
                    </td>

                    {/* Status - Zero Pill quiet styling */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            member.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        />
                        <span className="capitalize text-slate-700 font-medium">
                          {member.status.toLowerCase()}
                        </span>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStaff(member)}
                        className="h-8 gap-1 text-slate-600 hover:text-indigo-600"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Profile</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Profile Inspection Modal */}
      <Dialog
        open={Boolean(selectedStaff)}
        onOpenChange={(open) => !open && setSelectedStaff(null)}
        title="Institutional Staff Profile"
        description="Comprehensive employee record and administrative details."
        maxWidth="md"
      >
        {selectedStaff && (
          <div className="space-y-4 pt-2 text-xs">
            <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-indigo-600 text-white font-bold text-base shadow-xs">
                {selectedStaff.firstName[0]}
                {selectedStaff.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900">
                  {selectedStaff.firstName} {selectedStaff.lastName}
                </h4>
                <p className="text-slate-600 font-medium">
                  {selectedStaff.position?.title || selectedStaff.designation || "Staff"}
                </p>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                  <span>ID: {selectedStaff.employeeNumber}</span>
                  <span>·</span>
                  <span className="capitalize">{selectedStaff.status.toLowerCase()}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 p-3 rounded-lg border border-slate-100 bg-white">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Department
                </p>
                <p className="text-xs font-semibold text-slate-800">
                  {selectedStaff.department?.name || "General Faculty"}
                </p>
              </div>

              <div className="space-y-1 p-3 rounded-lg border border-slate-100 bg-white">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Campus Location
                </p>
                <p className="text-xs font-semibold text-slate-800">
                  {selectedStaff.campus?.name || "Apex Main Campus"}
                </p>
              </div>

              <div className="space-y-1 p-3 rounded-lg border border-slate-100 bg-white">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Official Email
                </p>
                <p className="text-xs font-mono text-slate-800 break-all">{selectedStaff.email}</p>
              </div>

              <div className="space-y-1 p-3 rounded-lg border border-slate-100 bg-white">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Phone Number
                </p>
                <p className="text-xs font-mono text-slate-800">
                  {selectedStaff.phone || "Not recorded"}
                </p>
              </div>

              <div className="space-y-1 p-3 rounded-lg border border-slate-100 bg-white">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Employment Type
                </p>
                <p className="text-xs text-slate-800">
                  {selectedStaff.employmentType || "FULL_TIME"}
                </p>
              </div>

              <div className="space-y-1 p-3 rounded-lg border border-slate-100 bg-white">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Appointment Date
                </p>
                <p className="text-xs text-slate-800">
                  {selectedStaff.joinedDate || "2024-09-01"}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedStaff(null)}
                className="text-xs"
              >
                Close Profile
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
