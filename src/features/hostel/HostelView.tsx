import React, { useState, useEffect } from "react";
import {
  Building,
  Plus,
  Search,
  Bed,
  Users,
  Shield,
  Sliders,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  DoorOpen,
  ArrowRight,
  UserCheck,
  Clock,
  FileText,
  Home,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/AuthContext";
import type {
  HostelRecord,
  HostelRoomRecord,
  StudentHostelAllocationRecord,
  HostelAttendanceRecord,
  HostelGatePassRecord,
  HostelDashboardStats,
} from "@/services/hostel.service";

export function HostelView() {
  const { user, token } = useAuth();
  const currentCampus = user?.activeCampus || user?.campuses?.[0];

  const getHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const apiGet = async (url: string) => {
    const res = await fetch(url, { headers: getHeaders() });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const j = await res.json();
    return j.data;
  };

  const apiPost = async (url: string, body?: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.message || `HTTP ${res.status}`);
    }
    const j = await res.json();
    return j.data;
  };

  const apiPut = async (url: string, body?: unknown) => {
    const res = await fetch(url, {
      method: "PUT",
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || err.message || `HTTP ${res.status}`);
    }
    const j = await res.json();
    return j.data;
  };
  const [activeTab, setActiveTab] = useState<"hostels" | "rooms" | "residents" | "rollcall" | "gatepasses" | "settings">("hostels");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<HostelDashboardStats | null>(null);

  // Data lists
  const [hostels, setHostels] = useState<HostelRecord[]>([]);
  const [allocations, setAllocations] = useState<StudentHostelAllocationRecord[]>([]);
  const [attendances, setAttendances] = useState<HostelAttendanceRecord[]>([]);
  const [gatePasses, setGatePasses] = useState<HostelGatePassRecord[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedHostelFilter, setSelectedHostelFilter] = useState<string>("ALL");

  // Roll call states
  const [selectedRollCallHostel, setSelectedRollCallHostel] = useState<string>("hst-001");
  const [rollCallDate, setRollCallDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [rollCallDraft, setRollCallDraft] = useState<
    Record<string, { status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "ON_LEAVE"; checkInTime?: string; remarks?: string }>
  >({});

  // Modals
  const [isAddHostelOpen, setIsAddHostelOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isGatePassOpen, setIsGatePassOpen] = useState(false);

  // Form states
  const [newHostel, setNewHostel] = useState({
    name: "",
    code: "",
    type: "BOYS" as "BOYS" | "GIRLS" | "COED",
    wardenName: "",
    contactPhone: "",
    location: "South Campus Quad",
    description: "",
  });

  const [newRoom, setNewRoom] = useState({
    hostelId: "",
    roomNumber: "",
    floorNumber: 1,
    blockWing: "West Wing",
    roomType: "DOUBLE" as const,
    capacity: 2,
    monthlyRateCents: 20000,
    termRateCents: 60000,
  });

  const [newAllocation, setNewAllocation] = useState({
    studentId: "stu-001",
    hostelId: "hst-001",
    roomId: "room-102",
    bedId: "bed-102-b",
    emergencyContactName: "Parent on file",
    emergencyContactPhone: "+1 (555) 000-0000",
    medicalNotes: "",
  });

  const [newGatePass, setNewGatePass] = useState({
    studentId: "stu-001",
    hostelId: "hst-001",
    passType: "DAY_OUTING" as const,
    departureDate: new Date().toISOString(),
    expectedReturnDate: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    reason: "",
    destination: "",
  });

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const tenantCtx = {
    organizationId: "org-apex-demo-01",
    campusId: currentCampus?.id || "campus-apex-main-01",
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashStats, hstList, allocList, attList, gpList] = await Promise.all([
        apiGet("/api/hostel/overview"),
        apiGet("/api/hostel/buildings"),
        apiGet("/api/hostel/allocations"),
        apiGet("/api/hostel/attendance"),
        apiGet("/api/hostel/gate-passes"),
      ]);
      setStats(dashStats);
      setHostels(hstList || []);
      setAllocations(allocList || []);
      setAttendances(attList || []);
      setGatePasses(gpList || []);

      // Prepopulate roll call draft for residents in selected hostel
      const residents = (allocList || []).filter((a: any) => a.hostelId === selectedRollCallHostel && a.status === "ACTIVE");
      const initialDraft: Record<string, any> = {};
      residents.forEach((r: any) => {
        initialDraft[r.studentId] = {
          status: "PRESENT",
          checkInTime: "19:50",
          remarks: "",
        };
      });
      setRollCallDraft(initialDraft);
    } catch (err) {
      console.error("Failed to load hostel data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentCampus]);

  const showNotification = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const handleCreateHostel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostel.name || !newHostel.code) return;
    try {
      await apiPost("/api/hostel/buildings", {
        name: newHostel.name,
        code: newHostel.code,
        type: newHostel.type,
        wardenName: newHostel.wardenName || undefined,
        contactPhone: newHostel.contactPhone || undefined,
        location: newHostel.location || undefined,
        description: newHostel.description || undefined,
      });
      setIsAddHostelOpen(false);
      setNewHostel({
        name: "",
        code: "",
        type: "BOYS",
        wardenName: "",
        contactPhone: "",
        location: "South Campus Quad",
        description: "",
      });
      showNotification("Hostel residence building registered.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create hostel");
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.hostelId || !newRoom.roomNumber) return;
    try {
      await apiPost("/api/hostel/rooms", {
        hostelId: newRoom.hostelId,
        roomNumber: newRoom.roomNumber,
        floorNumber: Number(newRoom.floorNumber) || 1,
        blockWing: newRoom.blockWing || undefined,
        roomType: newRoom.roomType,
        capacity: Number(newRoom.capacity) || 2,
        monthlyRateCents: Number(newRoom.monthlyRateCents) || 20000,
        termRateCents: Number(newRoom.termRateCents) || 60000,
        amenities: [],
      });
      setIsAddRoomOpen(false);
      showNotification("Room and beds configured in dormitory.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add room");
    }
  };

  const handleCheckInStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllocation.hostelId || !newAllocation.roomId || !newAllocation.bedId) return;
    try {
      await apiPost("/api/hostel/allocations", {
        studentId: newAllocation.studentId,
        hostelId: newAllocation.hostelId,
        roomId: newAllocation.roomId,
        bedId: newAllocation.bedId,
        feeAmountCents: 60000,
        emergencyContactName: newAllocation.emergencyContactName || undefined,
        emergencyContactPhone: newAllocation.emergencyContactPhone || undefined,
        medicalNotes: newAllocation.medicalNotes || undefined,
      });
      setIsCheckInOpen(false);
      showNotification("Boarding scholar checked into assigned bed.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to allocate room");
    }
  };

  const handleCheckOutStudent = async (allocationId: string) => {
    if (!confirm("Confirm checking out this resident and freeing up bed?")) return;
    try {
      await apiPost("/api/hostel/allocations/checkout", {
        allocationId,
        notes: "Routine end-of-term checkout",
      });
      showNotification("Resident checked out and bed marked as available.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to check out resident");
    }
  };

  const handleRecordRollCall = async (e: React.FormEvent) => {
    e.preventDefault();
    const records = Object.entries(rollCallDraft).map(([studentId, data]) => ({
      studentId,
      status: data.status,
      checkInTime: data.checkInTime,
      remarks: data.remarks,
    }));
    if (records.length === 0) return;
    try {
      await apiPost("/api/hostel/attendance", {
        hostelId: selectedRollCallHostel,
        date: rollCallDate,
        records,
      });
      showNotification("Night curfew roll call attendance saved.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to record roll call");
    }
  };

  const handleCreateGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGatePass.reason || !newGatePass.destination) return;
    try {
      await apiPost("/api/hostel/gate-passes", {
        studentId: newGatePass.studentId,
        hostelId: newGatePass.hostelId,
        passType: newGatePass.passType,
        departureDate: newGatePass.departureDate,
        expectedReturnDate: newGatePass.expectedReturnDate,
        reason: newGatePass.reason,
        destination: newGatePass.destination,
      });
      setIsGatePassOpen(false);
      showNotification("Gate pass permit requested.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to request gate pass");
    }
  };

  const handleUpdateGatePassStatus = async (passId: string, status: any) => {
    try {
      await apiPut(`/api/hostel/gate-passes/${passId}/status`, {
        passId,
        status,
      });
      showNotification(`Gate pass status updated to ${status}.`);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to update gate pass");
    }
  };

  const currentHostelResidents = allocations.filter(
    (a) => a.hostelId === selectedRollCallHostel && a.status === "ACTIVE"
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Hostel & Boarding Management
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Dormitory buildings, room configurations, bed inventories, boarding scholar allocations, night curfew roll calls, and gate passes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs h-9 px-3 gap-1.5"
            onClick={() => setIsGatePassOpen(true)}
          >
            <FileText className="h-3.5 w-3.5" />
            Request Pass
          </Button>
          <Button
            variant="outline"
            className="text-xs h-9 px-3 gap-1.5"
            onClick={() => setIsCheckInOpen(true)}
          >
            <Bed className="h-3.5 w-3.5" />
            Check-In Resident
          </Button>
          <Button
            className="text-xs h-9 px-3 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setIsAddHostelOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Building
          </Button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedbackMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            {feedbackMessage}
          </span>
          <button onClick={() => setFeedbackMessage(null)} className="text-emerald-600 hover:text-emerald-900 text-xs font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Dashboard KPI Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Hostel Buildings</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalHostels}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{stats.totalRooms} rooms configured</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Bed Capacity</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalBedCapacity}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total beds institution-wide</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Occupied Beds</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.occupiedBeds}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{stats.activeAllocations} resident scholars</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Vacant Beds</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.vacantBeds}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">Available for placement</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Occupancy Rate</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {stats.overallOccupancyRate}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Capacity utilization</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Active Gate Passes</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.activeGatePasses}</div>
            <div className="text-[11px] text-amber-600 mt-0.5">{stats.pendingGatePasses} awaiting approval</div>
          </div>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-medium">
          {[
            { id: "hostels", label: "Hostel Buildings", count: hostels.length },
            { id: "rooms", label: "Rooms & Bed Layout" },
            { id: "residents", label: "Boarding Scholars", count: allocations.length },
            { id: "rollcall", label: "Curfew & Roll Call" },
            { id: "gatepasses", label: "Gate Passes & Exits", count: gatePasses.length },
            { id: "settings", label: "Boarding Policies" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2.5 border-b-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-[10px] text-slate-400 font-normal">({tab.count})</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: HOSTEL BUILDINGS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "hostels" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hostels.map((h) => (
              <div key={h.id} className="bg-white border border-slate-200 rounded p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-indigo-600">{h.code}</span>
                  <span className="text-[11px] font-semibold text-slate-600">{h.type} RESIDENCE</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{h.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{h.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-100 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400">Total Rooms</div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">{h.totalRooms}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Bed Capacity</div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">{h.totalCapacity}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400">Occupancy</div>
                    <div className="font-bold text-indigo-600 text-sm mt-0.5">
                      {h.occupiedBeds} / {h.totalCapacity}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Warden / Matron:</span>
                    <span className="font-medium text-slate-800">{h.wardenName || "Assigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Contact:</span>
                    <span className="font-medium text-slate-800">{h.contactPhone || "Internal"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Location:</span>
                    <span className="font-medium text-slate-800">{h.location || "Quad"}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700">{h.status}</span>
                  <Button
                    variant="outline"
                    className="h-7 text-[11px] px-2.5 text-indigo-600"
                    onClick={() => {
                      setNewRoom((prev) => ({ ...prev, hostelId: h.id }));
                      setIsAddRoomOpen(true);
                    }}
                  >
                    + Add Room
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: ROOMS & BED LAYOUT */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "rooms" && (
        <div className="space-y-6">
          {hostels.map((hostel) => (
            <div key={hostel.id} className="bg-white border border-slate-200 rounded p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{hostel.name}</h3>
                  <p className="text-xs text-slate-500">
                    {hostel.rooms.length} rooms · {hostel.occupiedBeds} occupied / {hostel.totalCapacity} total beds
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-7 text-[11px] px-2.5"
                  onClick={() => {
                    setNewRoom((prev) => ({ ...prev, hostelId: hostel.id }));
                    setIsAddRoomOpen(true);
                  }}
                >
                  + Add Room
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {hostel.rooms.map((room) => (
                  <div key={room.id} className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-xs">Room {room.roomNumber}</div>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {room.blockWing || `Floor ${room.floorNumber}`} · {room.roomType}
                      </span>
                    </div>

                    {/* Beds Grid */}
                    <div className="space-y-1.5 pt-1">
                      {room.beds.map((bed) => (
                        <div
                          key={bed.id}
                          className={`p-2 rounded text-xs flex items-center justify-between border ${
                            bed.status === "OCCUPIED"
                              ? "bg-indigo-50 border-indigo-200 text-indigo-900"
                              : "bg-white border-slate-200 text-slate-700"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-medium">
                            <Bed className="h-3.5 w-3.5 text-slate-500" />
                            {bed.bedNumber}
                          </div>
                          <div className="text-[11px]">
                            {bed.status === "OCCUPIED" ? (
                              <span className="font-medium text-indigo-700">{bed.currentStudentName}</span>
                            ) : (
                              <span className="text-emerald-600 font-medium">Available</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-200 flex justify-between">
                      <span>Term: ${(room.termRateCents / 100).toFixed(2)}</span>
                      <span>Amenities: {room.amenities.slice(0, 2).join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: BOARDING SCHOLARS (RESIDENTS) */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "residents" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search resident, admission #, hostel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <Button
              className="text-xs h-9 px-3 bg-indigo-600 text-white hover:bg-indigo-700 gap-1.5"
              onClick={() => setIsCheckInOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Check-In Resident
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Scholar Name</th>
                  <th className="py-2.5 px-3">Hostel & Room</th>
                  <th className="py-2.5 px-3">Bed #</th>
                  <th className="py-2.5 px-3">Emergency Contact</th>
                  <th className="py-2.5 px-3">Medical Notes</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900 text-[13px]">{alloc.studentName}</div>
                      <div className="text-[11px] text-slate-400">
                        {alloc.admissionNumber} · {alloc.gender} {alloc.className ? `· ${alloc.className}` : ""}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{alloc.hostelName}</div>
                      <div className="text-[11px] text-slate-400">Room {alloc.roomNumber}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-900">{alloc.bedNumber}</td>
                    <td className="py-3 px-3 text-slate-600">
                      <div>{alloc.emergencyContactName || "Guardian on file"}</div>
                      <div className="text-[11px] text-slate-400">{alloc.emergencyContactPhone}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {alloc.medicalNotes || "None reported"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {alloc.status === "ACTIVE" && (
                        <Button
                          variant="outline"
                          className="h-7 text-[11px] px-2 text-rose-700 hover:bg-rose-50"
                          onClick={() => handleCheckOutStudent(alloc.id)}
                        >
                          Check Out
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 4: CURFEW & NIGHT ROLL CALL */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "rollcall" && (
        <div className="space-y-4">
          <form onSubmit={handleRecordRollCall} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded">
              <div className="flex items-center gap-3">
                <select
                  className="h-9 border border-slate-300 rounded px-2.5 bg-white text-xs font-semibold"
                  value={selectedRollCallHostel}
                  onChange={(e) => setSelectedRollCallHostel(e.target.value)}
                >
                  {hostels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <Input
                    type="date"
                    className="h-9 text-xs w-36"
                    value={rollCallDate}
                    onChange={(e) => setRollCallDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs h-9 px-3"
                  onClick={() => {
                    const updated = { ...rollCallDraft };
                    currentHostelResidents.forEach((r) => {
                      updated[r.studentId] = { status: "PRESENT", checkInTime: "19:50", remarks: "" };
                    });
                    setRollCallDraft(updated);
                  }}
                >
                  Mark All Present
                </Button>
                <Button type="submit" className="text-xs h-9 px-3 bg-indigo-600 text-white hover:bg-indigo-700">
                  Save Roll Call
                </Button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                  <tr>
                    <th className="py-2.5 px-3">Resident Scholar</th>
                    <th className="py-2.5 px-3">Room / Bed</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Check-In Time</th>
                    <th className="py-2.5 px-3">Curfew Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentHostelResidents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No registered residents in this building.
                      </td>
                    </tr>
                  ) : (
                    currentHostelResidents.map((resident) => {
                      const entry = rollCallDraft[resident.studentId] || {
                        status: "PRESENT",
                        checkInTime: "19:50",
                        remarks: "",
                      };
                      return (
                        <tr key={resident.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{resident.studentName}</div>
                            <div className="text-[11px] text-slate-400">{resident.admissionNumber}</div>
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            Room {resident.roomNumber} · Bed {resident.bedNumber}
                          </td>
                          <td className="py-3 px-3">
                            <select
                              className="h-8 border border-slate-300 rounded px-2 bg-white text-xs"
                              value={entry.status}
                              onChange={(e) =>
                                setRollCallDraft({
                                  ...rollCallDraft,
                                  [resident.studentId]: {
                                    ...entry,
                                    status: e.target.value as any,
                                  },
                                })
                              }
                            >
                              <option value="PRESENT">Present</option>
                              <option value="ABSENT">Absent</option>
                              <option value="LATE">Late Return</option>
                              <option value="ON_LEAVE">Approved Leave</option>
                              <option value="EXCUSED">Excused</option>
                            </select>
                          </td>
                          <td className="py-3 px-3">
                            <Input
                              placeholder="e.g. 20:15"
                              className="h-8 text-xs w-24"
                              value={entry.checkInTime || ""}
                              onChange={(e) =>
                                setRollCallDraft({
                                  ...rollCallDraft,
                                  [resident.studentId]: {
                                    ...entry,
                                    checkInTime: e.target.value,
                                  },
                                })
                              }
                            />
                          </td>
                          <td className="py-3 px-3">
                            <Input
                              placeholder="Notes / reason for delay..."
                              className="h-8 text-xs"
                              value={entry.remarks || ""}
                              onChange={(e) =>
                                setRollCallDraft({
                                  ...rollCallDraft,
                                  [resident.studentId]: {
                                    ...entry,
                                    remarks: e.target.value,
                                  },
                                })
                              }
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </form>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 5: GATE PASSES & EXITS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "gatepasses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Student Gate Passes & Leave Permits</h3>
              <p className="text-xs text-slate-500">Day outings, weekend leaves, and campus departure verifications</p>
            </div>
            <Button
              className="text-xs h-8 px-3 bg-indigo-600 text-white hover:bg-indigo-700 gap-1.5"
              onClick={() => setIsGatePassOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Request Gate Pass
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Pass #</th>
                  <th className="py-2.5 px-3">Scholar</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Departure Date</th>
                  <th className="py-2.5 px-3">Expected Return</th>
                  <th className="py-2.5 px-3">Destination & Reason</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {gatePasses.map((pass) => (
                  <tr key={pass.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{pass.passNumber}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{pass.studentName}</div>
                      <div className="text-[11px] text-slate-400">
                        {pass.hostelName} · Room {pass.roomNumber}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{pass.passType.replace("_", " ")}</td>
                    <td className="py-3 px-3 text-slate-600">
                      {new Date(pass.departureDate).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {new Date(pass.expectedReturnDate).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{pass.destination}</div>
                      <div className="text-[11px] text-slate-400">{pass.reason}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] font-medium ${
                          pass.status === "APPROVED"
                            ? "text-indigo-700"
                            : pass.status === "OUT"
                            ? "text-amber-700 font-semibold"
                            : pass.status === "RETURNED"
                            ? "text-emerald-700"
                            : pass.status === "REQUESTED"
                            ? "text-blue-700"
                            : "text-slate-500"
                        }`}
                      >
                        {pass.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {pass.status === "REQUESTED" && (
                          <Button
                            variant="outline"
                            className="h-7 text-[11px] px-2 text-indigo-700 hover:bg-indigo-50"
                            onClick={() => handleUpdateGatePassStatus(pass.id, "APPROVED")}
                          >
                            Approve
                          </Button>
                        )}
                        {pass.status === "APPROVED" && (
                          <Button
                            variant="outline"
                            className="h-7 text-[11px] px-2 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleUpdateGatePassStatus(pass.id, "OUT")}
                          >
                            Mark Out
                          </Button>
                        )}
                        {pass.status === "OUT" && (
                          <Button
                            variant="outline"
                            className="h-7 text-[11px] px-2 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleUpdateGatePassStatus(pass.id, "RETURNED")}
                          >
                            Mark Returned
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 6: BOARDING SETTINGS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "settings" && (
        <div className="max-w-xl bg-white border border-slate-200 rounded p-5 space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-600" />
            Institutional Boarding & Residence Policies
          </h3>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Night Curfew Deadline:</span>
              <span className="font-semibold text-slate-900">20:00 (8:00 PM) Daily</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Approved Visitor Hours:</span>
              <span className="font-semibold text-slate-900">16:00 - 18:00 (Weekdays & Weekends)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Weekend Leave Privilege:</span>
              <span className="font-semibold text-emerald-700">Permitted with Approved Gate Pass</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Warden Gate Pass Approval:</span>
              <span className="font-semibold text-slate-900">Mandatory prior to campus exit</span>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD HOSTEL BUILDING */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isAddHostelOpen}
        onOpenChange={setIsAddHostelOpen}
        title="Add Hostel Residence Building"
        description="Configure a new boarding hall or residential dormitory."
      >
        <form onSubmit={handleCreateHostel} className="space-y-4 text-xs pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Building Name *</label>
              <Input
                required
                placeholder="e.g. Mandela Hall"
                value={newHostel.name}
                onChange={(e) => setNewHostel({ ...newHostel, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Building Code *</label>
              <Input
                required
                placeholder="e.g. HST-MH-03"
                value={newHostel.code}
                onChange={(e) => setNewHostel({ ...newHostel, code: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Residence Type</label>
              <select
                className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
                value={newHostel.type}
                onChange={(e) => setNewHostel({ ...newHostel, type: e.target.value as any })}
              >
                <option value="BOYS">Boys Residence</option>
                <option value="GIRLS">Girls Residence</option>
                <option value="COED">Co-Ed Residence</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Campus Location</label>
              <Input
                placeholder="e.g. North Campus Quad"
                value={newHostel.location}
                onChange={(e) => setNewHostel({ ...newHostel, location: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Warden / Matron Name</label>
              <Input
                placeholder="e.g. Arthur Pendelton"
                value={newHostel.wardenName}
                onChange={(e) => setNewHostel({ ...newHostel, wardenName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Contact Phone</label>
              <Input
                placeholder="e.g. +1 (555) 392-8811"
                value={newHostel.contactPhone}
                onChange={(e) => setNewHostel({ ...newHostel, contactPhone: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddHostelOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Register Hostel
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD ROOM */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isAddRoomOpen}
        onOpenChange={setIsAddRoomOpen}
        title="Add Room to Hostel"
        description="Configure room capacity and generate bed slots."
      >
        <form onSubmit={handleCreateRoom} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Hostel Building *</label>
            <select
              required
              className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
              value={newRoom.hostelId}
              onChange={(e) => setNewRoom({ ...newRoom, hostelId: e.target.value })}
            >
              <option value="">Select Building...</option>
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Room Number *</label>
              <Input
                required
                placeholder="e.g. 204"
                value={newRoom.roomNumber}
                onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Floor Number</label>
              <Input
                type="number"
                min="0"
                max="10"
                value={newRoom.floorNumber}
                onChange={(e) => setNewRoom({ ...newRoom, floorNumber: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Room Type</label>
              <select
                className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
                value={newRoom.roomType}
                onChange={(e) =>
                  setNewRoom({
                    ...newRoom,
                    roomType: e.target.value as any,
                    capacity: e.target.value === "SINGLE" ? 1 : e.target.value === "DOUBLE" ? 2 : 3,
                  })
                }
              >
                <option value="SINGLE">Single Occupancy</option>
                <option value="DOUBLE">Double Sharing</option>
                <option value="TRIPLE">Triple Sharing</option>
                <option value="DORMITORY">Dormitory</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Bed Capacity</label>
              <Input
                type="number"
                min="1"
                max="8"
                value={newRoom.capacity}
                onChange={(e) => setNewRoom({ ...newRoom, capacity: parseInt(e.target.value) || 2 })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddRoomOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Configure Room
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: CHECK-IN RESIDENT */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isCheckInOpen}
        onOpenChange={setIsCheckInOpen}
        title="Check-In Boarding Scholar"
        description="Allocate vacant bed to student for academic term."
      >
        <form onSubmit={handleCheckInStudent} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Hostel Building *</label>
            <select
              required
              className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
              value={newAllocation.hostelId}
              onChange={(e) => setNewAllocation({ ...newAllocation, hostelId: e.target.value })}
            >
              {hostels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} ({h.type})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Available Bed *</label>
              <select
                required
                className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
                value={newAllocation.bedId}
                onChange={(e) => {
                  const bId = e.target.value;
                  const currentH = hostels.find((h) => h.id === newAllocation.hostelId);
                  const currentR = currentH?.rooms.find((r) => r.beds.some((b) => b.id === bId));
                  setNewAllocation({
                    ...newAllocation,
                    bedId: bId,
                    roomId: currentR?.id || newAllocation.roomId,
                  });
                }}
              >
                <option value="">Select Available Bed...</option>
                {hostels
                  .find((h) => h.id === newAllocation.hostelId)
                  ?.rooms.flatMap((r) =>
                    r.beds
                      .filter((b) => b.status === "AVAILABLE")
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          Room {r.roomNumber} — Bed {b.bedNumber}
                        </option>
                      ))
                  )}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Emergency Phone</label>
              <Input
                placeholder="e.g. +1 (555) 482-9901"
                value={newAllocation.emergencyContactPhone}
                onChange={(e) => setNewAllocation({ ...newAllocation, emergencyContactPhone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Medical / Allergy Notes</label>
            <Input
              placeholder="e.g. Mild asthma; carries personal inhaler"
              value={newAllocation.medicalNotes}
              onChange={(e) => setNewAllocation({ ...newAllocation, medicalNotes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsCheckInOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Confirm Check-In
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: REQUEST GATE PASS */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isGatePassOpen}
        onOpenChange={setIsGatePassOpen}
        title="Request Student Gate Pass"
        description="Submit outing or leave permit request for boarding student."
      >
        <form onSubmit={handleCreateGatePass} className="space-y-4 text-xs pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Pass Type</label>
              <select
                className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
                value={newGatePass.passType}
                onChange={(e) => setNewGatePass({ ...newGatePass, passType: e.target.value as any })}
              >
                <option value="DAY_OUTING">Day Outing</option>
                <option value="WEEKEND_LEAVE">Weekend Leave</option>
                <option value="HOME_VISIT">Home Visit</option>
                <option value="EMERGENCY">Medical / Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Destination *</label>
              <Input
                required
                placeholder="e.g. City Health Clinic / Home"
                value={newGatePass.destination}
                onChange={(e) => setNewGatePass({ ...newGatePass, destination: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Reason for Outing / Leave *</label>
            <Input
              required
              placeholder="e.g. Medical consultation and routine checkup"
              value={newGatePass.reason}
              onChange={(e) => setNewGatePass({ ...newGatePass, reason: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsGatePassOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Submit Request
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
