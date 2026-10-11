import React, { useState, useEffect } from "react";
import {
  Bus,
  Plus,
  Search,
  Users,
  MapPin,
  Clock,
  Shield,
  Sliders,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  UserCheck,
  Fuel,
  Wrench,
  Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/AuthContext";
import type {
  VehicleRecord,
  TransportDriverRecord,
  TransportRouteRecord,
  StudentTransportAllocationRecord,
  TransportDashboardStats,
} from "@/services/transport.service";

export function TransportView() {
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
  const [activeTab, setActiveTab] = useState<"fleet" | "drivers" | "routes" | "allocations" | "settings">("routes");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<TransportDashboardStats | null>(null);

  // Data lists
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [drivers, setDrivers] = useState<TransportDriverRecord[]>([]);
  const [routes, setRoutes] = useState<TransportRouteRecord[]>([]);
  const [allocations, setAllocations] = useState<StudentTransportAllocationRecord[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>("ALL");

  // Modals
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddRouteOpen, setIsAddRouteOpen] = useState(false);
  const [isAddAllocationOpen, setIsAddAllocationOpen] = useState(false);

  // Form states
  const [newVehicle, setNewVehicle] = useState({
    registrationNumber: "",
    plateNumber: "",
    make: "",
    model: "",
    seatingCapacity: 35,
    fuelType: "DIESEL" as const,
    insurancePolicyNumber: "",
    notes: "",
  });

  const [newDriver, setNewDriver] = useState({
    fullName: "",
    phone: "",
    licenseNumber: "",
    licenseType: "Commercial Passenger Class A",
    emergencyContact: "",
  });

  const [newRoute, setNewRoute] = useState({
    code: "",
    name: "",
    startLocation: "",
    endLocation: "Apex Main Campus",
    totalDistanceKm: 15,
    vehicleId: "",
    driverId: "",
    description: "",
  });

  const [newAllocation, setNewAllocation] = useState({
    studentId: "stu-001",
    routeId: "",
    pickupStopId: "",
    tripType: "ROUND_TRIP" as const,
    seatNumber: "",
    feeAmountCents: 45000,
  });

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const tenantCtx = {
    organizationId: "org-apex-demo-01",
    campusId: currentCampus?.id || "campus-apex-main-01",
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashStats, vehList, drvList, rtList, allocList] = await Promise.all([
        apiGet("/api/transport/overview"),
        apiGet("/api/transport/vehicles"),
        apiGet("/api/transport/drivers"),
        apiGet("/api/transport/routes"),
        apiGet("/api/transport/allocations"),
      ]);
      setStats(dashStats);
      setVehicles(vehList || []);
      setDrivers(drvList || []);
      setRoutes(rtList || []);
      setAllocations(allocList || []);
    } catch (err) {
      console.error("Failed to load transport data:", err);
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

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.registrationNumber || !newVehicle.plateNumber) return;
    try {
      await apiPost("/api/transport/vehicles", {
        registrationNumber: newVehicle.registrationNumber,
        plateNumber: newVehicle.plateNumber,
        make: newVehicle.make || "Toyota",
        model: newVehicle.model || "Coaster",
        seatingCapacity: Number(newVehicle.seatingCapacity) || 35,
        fuelType: newVehicle.fuelType,
        status: "ACTIVE",
        insurancePolicyNumber: newVehicle.insurancePolicyNumber || undefined,
        notes: newVehicle.notes || undefined,
      });
      setIsAddVehicleOpen(false);
      setNewVehicle({
        registrationNumber: "",
        plateNumber: "",
        make: "",
        model: "",
        seatingCapacity: 35,
        fuelType: "DIESEL",
        insurancePolicyNumber: "",
        notes: "",
      });
      showNotification("Vehicle added to institution transport fleet.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add vehicle");
    }
  };

  const handleCreateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDriver.fullName || !newDriver.licenseNumber) return;
    try {
      await apiPost("/api/transport/drivers", {
        fullName: newDriver.fullName,
        phone: newDriver.phone,
        licenseNumber: newDriver.licenseNumber,
        licenseType: newDriver.licenseType,
        status: "ACTIVE",
        emergencyContact: newDriver.emergencyContact || undefined,
      });
      setIsAddDriverOpen(false);
      setNewDriver({
        fullName: "",
        phone: "",
        licenseNumber: "",
        licenseType: "Commercial Passenger Class A",
        emergencyContact: "",
      });
      showNotification("Driver profile registered successfully.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to register driver");
    }
  };

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoute.code || !newRoute.name) return;
    try {
      await apiPost("/api/transport/routes", {
        code: newRoute.code,
        name: newRoute.name,
        startLocation: newRoute.startLocation || "North Suburbs Terminal",
        endLocation: newRoute.endLocation,
        totalDistanceKm: Number(newRoute.totalDistanceKm) || 15,
        vehicleId: newRoute.vehicleId || undefined,
        driverId: newRoute.driverId || undefined,
        description: newRoute.description || undefined,
        status: "ACTIVE",
        stops: [
          {
            stopName: `${newRoute.startLocation || "Origin"} Station`,
            stopOrder: 1,
            morningPickupTime: "06:45",
            afternoonDropoffTime: "16:20",
          },
          {
            stopName: "Apex Main Campus Gate",
            stopOrder: 2,
            morningPickupTime: "07:35",
            afternoonDropoffTime: "15:30",
          },
        ],
      });
      setIsAddRouteOpen(false);
      setNewRoute({
        code: "",
        name: "",
        startLocation: "",
        endLocation: "Apex Main Campus",
        totalDistanceKm: 15,
        vehicleId: "",
        driverId: "",
        description: "",
      });
      showNotification("Transport route and timetable configured.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create route");
    }
  };

  const handleCreateAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAllocation.routeId) return;
    try {
      await apiPost("/api/transport/allocations", {
        studentId: newAllocation.studentId,
        routeId: newAllocation.routeId,
        pickupStopId: newAllocation.pickupStopId || undefined,
        tripType: newAllocation.tripType,
        seatNumber: newAllocation.seatNumber || undefined,
        feeAmountCents: Number(newAllocation.feeAmountCents) || 45000,
      });
      setIsAddAllocationOpen(false);
      setNewAllocation({
        studentId: "stu-001",
        routeId: "",
        pickupStopId: "",
        tripType: "ROUND_TRIP",
        seatNumber: "",
        feeAmountCents: 45000,
      });
      showNotification("Student allocated to transport route.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to allocate transport");
    }
  };

  const filteredAllocations = allocations.filter((a) => {
    if (selectedRouteFilter !== "ALL" && a.routeId !== selectedRouteFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        a.studentName.toLowerCase().includes(q) ||
        a.admissionNumber.toLowerCase().includes(q) ||
        a.routeName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Bus className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Transport & Fleet Management
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            School bus fleet, driver rosters, route scheduling, sequential stops, and student passenger allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs h-9 px-3 gap-1.5"
            onClick={() => setIsAddDriverOpen(true)}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Add Driver
          </Button>
          <Button
            variant="outline"
            className="text-xs h-9 px-3 gap-1.5"
            onClick={() => setIsAddVehicleOpen(true)}
          >
            <Bus className="h-3.5 w-3.5" />
            Add Vehicle
          </Button>
          <Button
            className="text-xs h-9 px-3 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setIsAddRouteOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            New Route
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
            <div className="text-xs text-slate-500 font-medium">Fleet Size</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalVehicles}</div>
            <div className="text-[11px] text-emerald-600 mt-0.5">{stats.activeVehicles} active on road</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Bus Routes</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.totalRoutes}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{stats.totalStops} scheduled stops</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Licensed Drivers</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalDrivers}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Commercial Class</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Student Riders</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalAllocations}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active subscriptions</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Fleet Seating</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalFleetCapacity}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Total vehicle capacity</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Capacity Utilization</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {stats.overallUtilizationPercentage}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Seat efficiency</div>
          </div>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-medium">
          {[
            { id: "routes", label: "Routes & Schedules", count: routes.length },
            { id: "allocations", label: "Student Allocations", count: allocations.length },
            { id: "fleet", label: "Vehicles & Fleet", count: vehicles.length },
            { id: "drivers", label: "Drivers & Staff", count: drivers.length },
            { id: "settings", label: "Transport Settings" },
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
      {/* TAB 1: ROUTES & SCHEDULES */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "routes" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {routes.map((route) => (
              <div
                key={route.id}
                className="bg-white border border-slate-200 rounded p-4 space-y-3.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-600">{route.code}</span>
                    <span className="text-[11px] font-semibold text-emerald-700">{route.status}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-1">{route.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{route.description}</p>

                  <div className="text-[11px] text-slate-600 space-y-1 pt-2 border-t border-slate-100 mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assigned Bus:</span>
                      <span className="font-medium text-slate-800">{route.vehicleName || "Not assigned"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Driver:</span>
                      <span className="font-medium text-slate-800">{route.driverName || "Not assigned"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Total Distance:</span>
                      <span className="font-medium text-slate-800">{route.totalDistanceKm || 15} km</span>
                    </div>
                  </div>

                  {/* Sequential Route Stops Timeline */}
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-2">
                      Stops & Schedule ({route.stops.length} stops)
                    </div>
                    <div className="space-y-2">
                      {route.stops.map((stop, idx) => (
                        <div key={stop.id} className="flex items-start gap-2 text-xs">
                          <div className="h-5 w-5 rounded-full bg-slate-100 text-slate-600 text-[10px] flex items-center justify-center font-bold shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">{stop.stopName}</div>
                            <div className="text-[10px] text-slate-400">
                              Pickup: {stop.morningPickupTime} · Dropoff: {stop.afternoonDropoffTime}
                              {stop.landmark ? ` · ${stop.landmark}` : ""}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-900">
                      {route.totalAllocations || 0}
                    </span>
                    <span className="text-slate-400 text-xs"> / {route.capacity || 35} seats</span>
                  </div>
                  <Button
                    variant="outline"
                    className="h-7 text-[11px] px-2.5 text-indigo-600"
                    onClick={() => {
                      setNewAllocation((prev) => ({ ...prev, routeId: route.id }));
                      setIsAddAllocationOpen(true);
                    }}
                  >
                    + Assign Student
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: STUDENT ALLOCATIONS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "allocations" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search student, admission #, route..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                className="h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
                value={selectedRouteFilter}
                onChange={(e) => setSelectedRouteFilter(e.target.value)}
              >
                <option value="ALL">All Routes</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>

              <Button
                className="text-xs h-9 px-3 bg-indigo-600 text-white hover:bg-indigo-700 gap-1.5 whitespace-nowrap"
                onClick={() => setIsAddAllocationOpen(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Assign Student
              </Button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Assigned Route</th>
                  <th className="py-2.5 px-3">Pickup Stop</th>
                  <th className="py-2.5 px-3">Trip Type</th>
                  <th className="py-2.5 px-3">Seat #</th>
                  <th className="py-2.5 px-3">Term Fee</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAllocations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No student transport subscriptions found.
                    </td>
                  </tr>
                ) : (
                  filteredAllocations.map((alloc) => (
                    <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 text-[13px]">{alloc.studentName}</div>
                        <div className="text-[11px] text-slate-400">
                          {alloc.admissionNumber} {alloc.className ? `· ${alloc.className}` : ""}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800">{alloc.routeName}</td>
                      <td className="py-3 px-3 text-slate-600">
                        {alloc.pickupStopName || "Default Route Origin"}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span>{alloc.tripType.replace("_", " ")}</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-900">
                        {alloc.seatNumber || "Unassigned"}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        ${(alloc.feeAmountCents / 100).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-[11px] font-medium text-emerald-700">{alloc.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: VEHICLES & FLEET */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "fleet" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">School Bus Fleet Registry</h3>
              <p className="text-xs text-slate-500">Registered institutional transport vehicles and roadworthiness certificates</p>
            </div>
            <Button
              className="text-xs h-8 px-3 bg-indigo-600 text-white hover:bg-indigo-700 gap-1.5"
              onClick={() => setIsAddVehicleOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Add Vehicle
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Vehicle Code</th>
                  <th className="py-2.5 px-3">Plate & Make/Model</th>
                  <th className="py-2.5 px-3">Seating Capacity</th>
                  <th className="py-2.5 px-3">Fuel Type</th>
                  <th className="py-2.5 px-3">Assigned Route</th>
                  <th className="py-2.5 px-3">Insurance Policy</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{v.registrationNumber}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {v.plateNumber} · {v.make} {v.model}
                      </div>
                      <div className="text-[11px] text-slate-400">Year: {v.year || "N/A"}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{v.seatingCapacity} seats</td>
                    <td className="py-3 px-3 text-slate-600">{v.fuelType}</td>
                    <td className="py-3 px-3 text-slate-700">{v.assignedRouteName || "Standby / Unassigned"}</td>
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {v.insurancePolicyNumber || "Cover Active"}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`text-[11px] font-medium ${
                          v.status === "ACTIVE"
                            ? "text-emerald-700"
                            : v.status === "MAINTENANCE"
                            ? "text-amber-700 font-semibold"
                            : "text-rose-700"
                        }`}
                      >
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 4: DRIVERS & STAFF */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "drivers" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Transport Staff & Commercial Drivers</h3>
              <p className="text-xs text-slate-500">Commercial licensing, road certifications, and assigned routes</p>
            </div>
            <Button
              className="text-xs h-8 px-3 bg-indigo-600 text-white hover:bg-indigo-700 gap-1.5"
              onClick={() => setIsAddDriverOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Register Driver
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Driver Name</th>
                  <th className="py-2.5 px-3">Contact Phone</th>
                  <th className="py-2.5 px-3">Commercial License</th>
                  <th className="py-2.5 px-3">Assigned Route</th>
                  <th className="py-2.5 px-3">Emergency Contact</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{d.fullName}</td>
                    <td className="py-3 px-3 font-mono text-slate-700">{d.phone}</td>
                    <td className="py-3 px-3">
                      <div className="font-mono text-slate-800">{d.licenseNumber}</div>
                      <div className="text-[11px] text-slate-400">{d.licenseType}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{d.assignedRouteName || "Relief Driver"}</td>
                    <td className="py-3 px-3 text-slate-500">{d.emergencyContact || "On File"}</td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-[11px] text-emerald-700 font-medium">{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 5: TRANSPORT SETTINGS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "settings" && (
        <div className="max-w-xl bg-white border border-slate-200 rounded p-5 space-y-4 text-xs">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-indigo-600" />
            Institutional Transport Policies
          </h3>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Transport Fee Cadence:</span>
              <span className="font-semibold text-slate-900">Per Academic Term</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Seat Assignment Policy:</span>
              <span className="font-semibold text-slate-900">Mandatory (Reserved per Student)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Target Morning Arrival Time:</span>
              <span className="font-semibold text-slate-900">07:45 AM</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-600">Target Afternoon Departure Time:</span>
              <span className="font-semibold text-slate-900">03:30 PM</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Maximum Bus Capacity Threshold:</span>
              <span className="font-semibold text-slate-900">50 Seats</span>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD VEHICLE */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isAddVehicleOpen}
        onOpenChange={setIsAddVehicleOpen}
        title="Add Vehicle to Transport Fleet"
        description="Register school bus, shuttle van, or executive transport unit."
      >
        <form onSubmit={handleCreateVehicle} className="space-y-4 text-xs pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Vehicle Fleet Code *</label>
              <Input
                required
                placeholder="e.g. BUS-03"
                value={newVehicle.registrationNumber}
                onChange={(e) => setNewVehicle({ ...newVehicle, registrationNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">License Plate Number *</label>
              <Input
                required
                placeholder="e.g. KDF 412X"
                value={newVehicle.plateNumber}
                onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Make / Manufacturer</label>
              <Input
                placeholder="e.g. Toyota"
                value={newVehicle.make}
                onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Model</label>
              <Input
                placeholder="e.g. Coaster"
                value={newVehicle.model}
                onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Seating Capacity</label>
              <Input
                type="number"
                min="4"
                max="80"
                value={newVehicle.seatingCapacity}
                onChange={(e) => setNewVehicle({ ...newVehicle, seatingCapacity: parseInt(e.target.value) || 30 })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Fuel Type</label>
              <select
                className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
                value={newVehicle.fuelType}
                onChange={(e) => setNewVehicle({ ...newVehicle, fuelType: e.target.value as any })}
              >
                <option value="DIESEL">Diesel</option>
                <option value="PETROL">Petrol</option>
                <option value="ELECTRIC">Electric</option>
                <option value="HYBRID">Hybrid</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Insurance Policy Number</label>
            <Input
              placeholder="e.g. POL-BR-928374"
              value={newVehicle.insurancePolicyNumber}
              onChange={(e) => setNewVehicle({ ...newVehicle, insurancePolicyNumber: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddVehicleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Register Vehicle
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD DRIVER */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isAddDriverOpen}
        onOpenChange={setIsAddDriverOpen}
        title="Register Commercial Transport Driver"
        description="Add a driver with valid passenger endorsement credentials."
      >
        <form onSubmit={handleCreateDriver} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Full Legal Name *</label>
            <Input
              required
              placeholder="e.g. David Kimani"
              value={newDriver.fullName}
              onChange={(e) => setNewDriver({ ...newDriver, fullName: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Contact Phone *</label>
              <Input
                required
                placeholder="e.g. +1 (555) 782-9011"
                value={newDriver.phone}
                onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Driver License Number *</label>
              <Input
                required
                placeholder="e.g. DL-COMM-29482"
                value={newDriver.licenseNumber}
                onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Emergency Contact Info</label>
            <Input
              placeholder="e.g. Spouse / Next of kin phone"
              value={newDriver.emergencyContact}
              onChange={(e) => setNewDriver({ ...newDriver, emergencyContact: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddDriverOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Register Driver
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD ROUTE */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isAddRouteOpen}
        onOpenChange={setIsAddRouteOpen}
        title="Create New Transport Route"
        description="Establish commuter corridor with timing and vehicle assignment."
      >
        <form onSubmit={handleCreateRoute} className="space-y-4 text-xs pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Route Code *</label>
              <Input
                required
                placeholder="e.g. RT-WEST-04"
                value={newRoute.code}
                onChange={(e) => setNewRoute({ ...newRoute, code: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Route Name *</label>
              <Input
                required
                placeholder="e.g. West District & Sunset Hills"
                value={newRoute.name}
                onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Start Location</label>
              <Input
                placeholder="e.g. Sunset Hills Junction"
                value={newRoute.startLocation}
                onChange={(e) => setNewRoute({ ...newRoute, startLocation: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Total Distance (km)</label>
              <Input
                type="number"
                value={newRoute.totalDistanceKm}
                onChange={(e) => setNewRoute({ ...newRoute, totalDistanceKm: parseFloat(e.target.value) || 15 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Assign Vehicle</label>
              <select
                className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
                value={newRoute.vehicleId}
                onChange={(e) => setNewRoute({ ...newRoute, vehicleId: e.target.value })}
              >
                <option value="">Select Fleet Bus...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registrationNumber} ({v.plateNumber} - {v.seatingCapacity} seats)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Assign Driver</label>
              <select
                className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
                value={newRoute.driverId}
                onChange={(e) => setNewRoute({ ...newRoute, driverId: e.target.value })}
              >
                <option value="">Select Driver...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddRouteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Save Route
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ASSIGN STUDENT TO ROUTE */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isAddAllocationOpen}
        onOpenChange={setIsAddAllocationOpen}
        title="Assign Student to Route"
        description="Allocate pickup stop, trip type, and seat reservation."
      >
        <form onSubmit={handleCreateAllocation} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Select Route *</label>
            <select
              required
              className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
              value={newAllocation.routeId}
              onChange={(e) => setNewAllocation({ ...newAllocation, routeId: e.target.value })}
            >
              <option value="">Select Route...</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} - {r.name} ({r.totalAllocations || 0}/{r.capacity || 35} seats)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Trip Type</label>
              <select
                className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
                value={newAllocation.tripType}
                onChange={(e) => setNewAllocation({ ...newAllocation, tripType: e.target.value as any })}
              >
                <option value="ROUND_TRIP">Both Morning & Afternoon</option>
                <option value="MORNING_ONLY">Morning Pickup Only</option>
                <option value="AFTERNOON_ONLY">Afternoon Dropoff Only</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Seat Number</label>
              <Input
                placeholder="e.g. 15B"
                value={newAllocation.seatNumber}
                onChange={(e) => setNewAllocation({ ...newAllocation, seatNumber: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Term Subscription Fee (Cents)</label>
            <Input
              type="number"
              value={newAllocation.feeAmountCents}
              onChange={(e) => setNewAllocation({ ...newAllocation, feeAmountCents: parseInt(e.target.value) || 45000 })}
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Fee: ${(newAllocation.feeAmountCents / 100).toFixed(2)} per term
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddAllocationOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Confirm Subscription
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
