import { TenantContext } from "@/repositories/types";
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@/lib/errors";
import { auditRepository } from "@/repositories/audit.repository";
import { safeAssign, enforceCampusIsolation } from "@/lib/security";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "./admin.service";
import {
  CreateVehicleInput,
  UpdateVehicleInput,
  CreateTransportDriverInput,
  UpdateTransportDriverInput,
  CreateTransportRouteInput,
  UpdateTransportRouteInput,
  CreateStudentTransportAllocationInput,
  UpdateStudentTransportAllocationInput,
  UpdateTransportSettingInput,
} from "@/lib/validations/transport";

// =============================================================================
// DOMAIN INTERFACES
// =============================================================================

export interface TransportSettingRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  feeCadence: "TERM" | "MONTHLY" | "ANNUAL";
  requireSeatAssignment: boolean;
  maxSeatsPerVehicle: number;
  morningArrivalTarget: string;
  afternoonDepartureTarget: string;
}

export interface VehicleRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  registrationNumber: string;
  plateNumber: string;
  vin?: string | null;
  make: string;
  model: string;
  year?: number | null;
  seatingCapacity: number;
  fuelType: "DIESEL" | "PETROL" | "ELECTRIC" | "HYBRID" | "CNG" | "OTHER";
  status: "ACTIVE" | "MAINTENANCE" | "OUT_OF_SERVICE";
  insurancePolicyNumber?: string | null;
  insuranceExpiry?: string | null;
  fitnessExpiry?: string | null;
  permitExpiry?: string | null;
  notes?: string | null;
  assignedRouteId?: string | null;
  assignedRouteName?: string | null;
}

export interface TransportDriverRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  fullName: string;
  phone: string;
  licenseNumber: string;
  licenseType: string;
  licenseExpiry?: string | null;
  status: string;
  emergencyContact?: string | null;
  staffId?: string | null;
  assignedRouteId?: string | null;
  assignedRouteName?: string | null;
}

export interface TransportStopRecord {
  id: string;
  routeId: string;
  stopName: string;
  stopOrder: number;
  morningPickupTime: string;
  afternoonDropoffTime: string;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  studentPickupCount?: number;
  studentDropoffCount?: number;
}

export interface TransportRouteRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  code: string;
  name: string;
  description?: string | null;
  vehicleId?: string | null;
  vehicleName?: string | null;
  driverId?: string | null;
  driverName?: string | null;
  startLocation: string;
  endLocation: string;
  totalDistanceKm?: number | null;
  status: string;
  stops: TransportStopRecord[];
  totalAllocations?: number;
  capacity?: number;
  utilizationRate?: number;
}

export interface StudentTransportAllocationRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className?: string;
  routeId: string;
  routeName: string;
  pickupStopId?: string | null;
  pickupStopName?: string | null;
  dropoffStopId?: string | null;
  dropoffStopName?: string | null;
  tripType: "ROUND_TRIP" | "MORNING_ONLY" | "AFTERNOON_ONLY";
  seatNumber?: string | null;
  feeAmountCents: number;
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED";
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
}

export interface TransportDashboardStats {
  totalVehicles: number;
  activeVehicles: number;
  maintenanceVehicles: number;
  totalDrivers: number;
  totalRoutes: number;
  totalStops: number;
  totalAllocations: number;
  totalFleetCapacity: number;
  overallUtilizationPercentage: number;
  routesSummary: Array<{
    id: string;
    name: string;
    code: string;
    allocatedCount: number;
    capacity: number;
    utilizationRate: number;
  }>;
}

export interface RecordTripAttendanceInput {
  routeId: string;
  vehicleId: string;
  tripDate: string;
  direction: "MORNING_PICKUP" | "AFTERNOON_DROPOFF" | "SPECIAL_EVENT";
  records: Array<{
    studentId: string;
    status: "BOARDED" | "ABSENT" | "EXCUSED";
    stopId?: string;
  }>;
}

export interface TripAttendanceRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  routeId: string;
  vehicleId: string;
  tripDate: string;
  direction: "MORNING_PICKUP" | "AFTERNOON_DROPOFF" | "SPECIAL_EVENT";
  totalBoarded: number;
  totalAbsent: number;
  records: Array<{
    studentId: string;
    status: "BOARDED" | "ABSENT" | "EXCUSED";
    stopId?: string;
  }>;
  createdAt: string;
}

// =============================================================================
// IN-MEMORY RESILIENT SEED STATE
// =============================================================================

interface InMemoryTransportState {
  settings: TransportSettingRecord[];
  vehicles: VehicleRecord[];
  drivers: TransportDriverRecord[];
  routes: TransportRouteRecord[];
  allocations: StudentTransportAllocationRecord[];
  tripAttendances: TripAttendanceRecord[];
}

function initializeTransportState(): InMemoryTransportState {
  const settings: TransportSettingRecord[] = [
    {
      id: "trn-set-01",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      feeCadence: "TERM",
      requireSeatAssignment: true,
      maxSeatsPerVehicle: 50,
      morningArrivalTarget: "07:45",
      afternoonDepartureTarget: "15:30",
    },
  ];

  const vehicles: VehicleRecord[] = [
    {
      id: "veh-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      registrationNumber: "BUS-01",
      plateNumber: "KDD 394B",
      vin: "1HD1KMM19HB029384",
      make: "Toyota",
      model: "Coaster Deluxe",
      year: 2022,
      seatingCapacity: 35,
      fuelType: "DIESEL",
      status: "ACTIVE",
      insurancePolicyNumber: "POL-BR-928374",
      insuranceExpiry: "2027-04-15T00:00:00.000Z",
      fitnessExpiry: "2027-02-28T00:00:00.000Z",
      permitExpiry: "2027-06-30T00:00:00.000Z",
      assignedRouteId: "route-001",
      assignedRouteName: "North Corridor & Highland Park",
      notes: "Routine 10,000km service completed in August 2026.",
    },
    {
      id: "veh-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      registrationNumber: "BUS-02",
      plateNumber: "KDA 812F",
      vin: "1HD1KMM19HB083721",
      make: "Isuzu",
      model: "NQR School Bus",
      year: 2023,
      seatingCapacity: 45,
      fuelType: "DIESEL",
      status: "ACTIVE",
      insurancePolicyNumber: "POL-BR-492817",
      insuranceExpiry: "2027-08-30T00:00:00.000Z",
      fitnessExpiry: "2027-05-15T00:00:00.000Z",
      permitExpiry: "2027-09-30T00:00:00.000Z",
      assignedRouteId: "route-002",
      assignedRouteName: "East Suburbs & Lakeview",
      notes: "Equipped with seatbelts and speed governor.",
    },
    {
      id: "veh-003",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      registrationNumber: "VAN-01",
      plateNumber: "KDE 104M",
      vin: "1HD1KMM19HB071923",
      make: "Nissan",
      model: "Civilian Commuter",
      year: 2021,
      seatingCapacity: 20,
      fuelType: "DIESEL",
      status: "ACTIVE",
      insurancePolicyNumber: "POL-BR-102938",
      insuranceExpiry: "2027-01-20T00:00:00.000Z",
      fitnessExpiry: "2026-11-30T00:00:00.000Z",
      assignedRouteId: "route-003",
      assignedRouteName: "Central Express & Downtown",
    },
    {
      id: "veh-004",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      registrationNumber: "VAN-02",
      plateNumber: "KCG 550P",
      make: "Toyota",
      model: "HiAce Super Custom",
      year: 2019,
      seatingCapacity: 14,
      fuelType: "PETROL",
      status: "MAINTENANCE",
      notes: "Brake pad replacement and wheel alignment in progress.",
    },
  ];

  const drivers: TransportDriverRecord[] = [
    {
      id: "drv-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      fullName: "David Kimani",
      phone: "+1 (555) 782-9011",
      licenseNumber: "DL-COMM-29482",
      licenseType: "Commercial Passenger Class A",
      licenseExpiry: "2028-12-31T00:00:00.000Z",
      status: "ACTIVE",
      emergencyContact: "Mary Kimani (Spouse) - +1 (555) 782-9012",
      assignedRouteId: "route-001",
      assignedRouteName: "North Corridor & Highland Park",
    },
    {
      id: "drv-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      fullName: "Peter Ochieng",
      phone: "+1 (555) 893-1122",
      licenseNumber: "DL-COMM-84729",
      licenseType: "Commercial Passenger Class A",
      licenseExpiry: "2029-05-15T00:00:00.000Z",
      status: "ACTIVE",
      emergencyContact: "Rose Ochieng - +1 (555) 893-1123",
      assignedRouteId: "route-002",
      assignedRouteName: "East Suburbs & Lakeview",
    },
    {
      id: "drv-003",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      fullName: "Joseph Mwangi",
      phone: "+1 (555) 432-8877",
      licenseNumber: "DL-COMM-10928",
      licenseType: "Commercial Passenger Class B",
      licenseExpiry: "2028-09-10T00:00:00.000Z",
      status: "ACTIVE",
      assignedRouteId: "route-003",
      assignedRouteName: "Central Express & Downtown",
    },
  ];

  const routes: TransportRouteRecord[] = [
    {
      id: "route-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      code: "RT-NORTH-01",
      name: "North Corridor & Highland Park",
      description: "Serves residential northern sectors including Highland Park and Oakridge Estates.",
      vehicleId: "veh-001",
      vehicleName: "BUS-01 (Toyota Coaster - 35 seats)",
      driverId: "drv-001",
      driverName: "David Kimani",
      startLocation: "Highland Gate Terminal",
      endLocation: "Apex Main Campus",
      totalDistanceKm: 18.5,
      status: "ACTIVE",
      stops: [
        {
          id: "stop-001-1",
          routeId: "route-001",
          stopName: "Highland Gate West",
          stopOrder: 1,
          morningPickupTime: "06:45",
          afternoonDropoffTime: "16:20",
          landmark: "Opposite Shell Petrol Station",
          studentPickupCount: 2,
          studentDropoffCount: 2,
        },
        {
          id: "stop-001-2",
          routeId: "route-001",
          stopName: "Oakridge Roundabout",
          stopOrder: 2,
          morningPickupTime: "07:00",
          afternoonDropoffTime: "16:05",
          landmark: "Near Oakridge Medical Centre",
          studentPickupCount: 1,
          studentDropoffCount: 1,
        },
        {
          id: "stop-001-3",
          routeId: "route-001",
          stopName: "Pine Valley Junction",
          stopOrder: 3,
          morningPickupTime: "07:15",
          afternoonDropoffTime: "15:50",
          landmark: "Pine Valley Community Center",
          studentPickupCount: 1,
          studentDropoffCount: 1,
        },
        {
          id: "stop-001-4",
          routeId: "route-001",
          stopName: "Apex Main Campus Gate",
          stopOrder: 4,
          morningPickupTime: "07:35",
          afternoonDropoffTime: "15:30",
          landmark: "Main Campus Bus Dropzone",
          studentPickupCount: 0,
          studentDropoffCount: 0,
        },
      ],
      totalAllocations: 4,
      capacity: 35,
      utilizationRate: 11.4,
    },
    {
      id: "route-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      code: "RT-EAST-02",
      name: "East Suburbs & Lakeview",
      description: "Covers the eastern commuter corridor, Lakeview Mall, and Green Park areas.",
      vehicleId: "veh-002",
      vehicleName: "BUS-02 (Isuzu NQR - 45 seats)",
      driverId: "drv-002",
      driverName: "Peter Ochieng",
      startLocation: "Lakeview Mall Parking Bay",
      endLocation: "Apex Main Campus",
      totalDistanceKm: 22.0,
      status: "ACTIVE",
      stops: [
        {
          id: "stop-002-1",
          routeId: "route-002",
          stopName: "Lakeview Mall Entrance",
          stopOrder: 1,
          morningPickupTime: "06:40",
          afternoonDropoffTime: "16:25",
          landmark: "Main Entrance Gate",
          studentPickupCount: 1,
          studentDropoffCount: 1,
        },
        {
          id: "stop-002-2",
          routeId: "route-002",
          stopName: "Green Park Heights",
          stopOrder: 2,
          morningPickupTime: "07:05",
          afternoonDropoffTime: "16:00",
          landmark: "Community Church",
          studentPickupCount: 0,
          studentDropoffCount: 0,
        },
        {
          id: "stop-002-3",
          routeId: "route-002",
          stopName: "Apex Main Campus Gate",
          stopOrder: 3,
          morningPickupTime: "07:40",
          afternoonDropoffTime: "15:30",
          landmark: "Main Campus Bus Dropzone",
        },
      ],
      totalAllocations: 1,
      capacity: 45,
      utilizationRate: 2.2,
    },
    {
      id: "route-003",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      code: "RT-CENTRAL-03",
      name: "Central Express & Downtown",
      description: "Direct morning commuter express from central transport hubs to campus.",
      vehicleId: "veh-003",
      vehicleName: "VAN-01 (Nissan Civilian - 20 seats)",
      driverId: "drv-003",
      driverName: "Joseph Mwangi",
      startLocation: "Central Railway Square",
      endLocation: "Apex Main Campus",
      totalDistanceKm: 12.0,
      status: "ACTIVE",
      stops: [
        {
          id: "stop-003-1",
          routeId: "route-003",
          stopName: "Central Railway Square",
          stopOrder: 1,
          morningPickupTime: "07:00",
          afternoonDropoffTime: "16:10",
          landmark: "Station Clock Tower",
          studentPickupCount: 1,
          studentDropoffCount: 1,
        },
        {
          id: "stop-003-2",
          routeId: "route-003",
          stopName: "Apex Main Campus Gate",
          stopOrder: 2,
          morningPickupTime: "07:35",
          afternoonDropoffTime: "15:30",
          landmark: "Main Campus Bus Dropzone",
        },
      ],
      totalAllocations: 1,
      capacity: 20,
      utilizationRate: 5.0,
    },
  ];

  const allocations: StudentTransportAllocationRecord[] = [
    {
      id: "alloc-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-001",
      studentName: "Lucas Wright",
      admissionNumber: "ADM-2024-001",
      className: "Grade 10 - Blue",
      routeId: "route-001",
      routeName: "North Corridor & Highland Park",
      pickupStopId: "stop-001-1",
      pickupStopName: "Highland Gate West (06:45)",
      dropoffStopId: "stop-001-1",
      dropoffStopName: "Highland Gate West (16:20)",
      tripType: "ROUND_TRIP",
      seatNumber: "12A",
      feeAmountCents: 45000, // $450 per term
      status: "ACTIVE",
      startDate: "2025-09-01T08:00:00.000Z",
    },
    {
      id: "alloc-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-002",
      studentName: "Maya Wright",
      admissionNumber: "ADM-2024-002",
      className: "Grade 8 - Gold",
      routeId: "route-001",
      routeName: "North Corridor & Highland Park",
      pickupStopId: "stop-001-1",
      pickupStopName: "Highland Gate West (06:45)",
      dropoffStopId: "stop-001-1",
      dropoffStopName: "Highland Gate West (16:20)",
      tripType: "ROUND_TRIP",
      seatNumber: "12B",
      feeAmountCents: 45000,
      status: "ACTIVE",
      startDate: "2025-09-01T08:00:00.000Z",
    },
    {
      id: "alloc-003",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-003",
      studentName: "Tariq Hassan",
      admissionNumber: "ADM-2024-003",
      className: "Grade 10 - Blue",
      routeId: "route-001",
      routeName: "North Corridor & Highland Park",
      pickupStopId: "stop-001-2",
      pickupStopName: "Oakridge Roundabout (07:00)",
      dropoffStopId: "stop-001-2",
      dropoffStopName: "Oakridge Roundabout (16:05)",
      tripType: "ROUND_TRIP",
      seatNumber: "14A",
      feeAmountCents: 45000,
      status: "ACTIVE",
      startDate: "2025-09-01T08:00:00.000Z",
    },
    {
      id: "alloc-004",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-004",
      studentName: "Sophia Chen",
      admissionNumber: "ADM-2024-004",
      className: "Grade 9 - Ruby",
      routeId: "route-002",
      routeName: "East Suburbs & Lakeview",
      pickupStopId: "stop-002-1",
      pickupStopName: "Lakeview Mall Entrance (06:40)",
      dropoffStopId: "stop-002-1",
      dropoffStopName: "Lakeview Mall Entrance (16:25)",
      tripType: "ROUND_TRIP",
      seatNumber: "04A",
      feeAmountCents: 48000,
      status: "ACTIVE",
      startDate: "2025-09-01T08:00:00.000Z",
    },
    {
      id: "alloc-005",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-005",
      studentName: "Noah Mwangi",
      admissionNumber: "ADM-2024-005",
      className: "Grade 10 - Gold",
      routeId: "route-003",
      routeName: "Central Express & Downtown",
      pickupStopId: "stop-003-1",
      pickupStopName: "Central Railway Square (07:00)",
      dropoffStopId: "stop-003-1",
      dropoffStopName: "Central Railway Square (16:10)",
      tripType: "MORNING_ONLY",
      seatNumber: "02B",
      feeAmountCents: 26000,
      status: "ACTIVE",
      startDate: "2025-09-01T08:00:00.000Z",
    },
  ];

  return { settings, vehicles, drivers, routes, allocations, tripAttendances: [] };
}

let transportState = initializeTransportState();

// =============================================================================
// TRANSPORT SERVICE CLASS
// =============================================================================

export class TransportService {
  resetState(): void {
    transportState = initializeTransportState();
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async getSettings(ctx: TenantContext): Promise<TransportSettingRecord> {
    const setting = transportState.settings.find((s) => s.organizationId === ctx.organizationId);
    if (!setting) {
      const defaultSetting: TransportSettingRecord = {
        id: `trn-set-${Date.now()}`,
        organizationId: ctx.organizationId,
        campusId: ctx.campusId || null,
        feeCadence: "TERM",
        requireSeatAssignment: true,
        maxSeatsPerVehicle: 50,
        morningArrivalTarget: "07:45",
        afternoonDepartureTarget: "15:30",
      };
      transportState.settings.push(defaultSetting);
      return defaultSetting;
    }
    return setting;
  }

  async updateSettings(ctx: TenantContext, input: UpdateTransportSettingInput): Promise<TransportSettingRecord> {
    const setting = await this.getSettings(ctx);
    Object.assign(setting, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "TransportSetting",
      entityId: setting.id,
      details: { updatedSettings: input },
    });

    return setting;
  }

  // ---------------------------------------------------------------------------
  // Vehicles
  // ---------------------------------------------------------------------------

  async getVehicles(ctx: TenantContext, params?: { status?: string; search?: string }): Promise<VehicleRecord[]> {
    let result = transportState.vehicles.filter((v) => v.organizationId === ctx.organizationId);

    if (params?.status) {
      result = result.filter((v) => v.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (v) =>
          v.registrationNumber.toLowerCase().includes(q) ||
          v.plateNumber.toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q)
      );
    }

    return result;
  }

  async getVehicleById(ctx: TenantContext, vehicleId: string): Promise<VehicleRecord> {
    const vehicle = transportState.vehicles.find(
      (v) => v.id === vehicleId && v.organizationId === ctx.organizationId
    );
    if (!vehicle) {
      throw new NotFoundError(`Vehicle with ID "${vehicleId}" was not found.`);
    }
    return vehicle;
  }

  async createVehicle(ctx: TenantContext, input: CreateVehicleInput): Promise<VehicleRecord> {
    const existing = transportState.vehicles.find(
      (v) =>
        v.organizationId === ctx.organizationId &&
        (v.registrationNumber.toUpperCase() === input.registrationNumber.toUpperCase() ||
          Boolean(input.plateNumber && v.plateNumber && v.plateNumber.toUpperCase() === input.plateNumber.toUpperCase()))
    );
    if (existing) {
      throw new ValidationError(
        `A vehicle with registration "${input.registrationNumber}" or plate "${input.plateNumber}" already exists.`
      );
    }

    const vehicle: VehicleRecord = {
      id: `veh-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId: input.campusId || ctx.campusId || null,
      registrationNumber: input.registrationNumber.toUpperCase(),
      plateNumber: input.plateNumber.toUpperCase(),
      vin: input.vin || null,
      make: input.make,
      model: input.model,
      year: input.year || null,
      seatingCapacity: input.seatingCapacity,
      fuelType: input.fuelType,
      status: input.status,
      insurancePolicyNumber: input.insurancePolicyNumber || null,
      insuranceExpiry: input.insuranceExpiry || null,
      fitnessExpiry: input.fitnessExpiry || null,
      permitExpiry: input.permitExpiry || null,
      notes: input.notes || null,
    };

    transportState.vehicles.push(vehicle);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Vehicle",
      entityId: vehicle.id,
      details: { registrationNumber: vehicle.registrationNumber, plateNumber: vehicle.plateNumber },
    });

    return vehicle;
  }

  async updateVehicle(ctx: TenantContext, vehicleId: string, input: UpdateVehicleInput): Promise<VehicleRecord> {
    const vehicle = await this.getVehicleById(ctx, vehicleId);
    Object.assign(vehicle, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Vehicle",
      entityId: vehicle.id,
      details: { updatedFields: Object.keys(input) },
    });

    return vehicle;
  }

  // ---------------------------------------------------------------------------
  // Drivers
  // ---------------------------------------------------------------------------

  async getDrivers(ctx: TenantContext, params?: { status?: string; search?: string }): Promise<TransportDriverRecord[]> {
    let result = transportState.drivers.filter((d) => d.organizationId === ctx.organizationId);

    if (params?.status) {
      result = result.filter((d) => d.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (d) =>
          d.fullName.toLowerCase().includes(q) ||
          d.licenseNumber.toLowerCase().includes(q) ||
          d.phone.toLowerCase().includes(q)
      );
    }

    return result;
  }

  async createDriver(ctx: TenantContext, input: CreateTransportDriverInput): Promise<TransportDriverRecord> {
    const existing = transportState.drivers.find(
      (d) =>
        d.organizationId === ctx.organizationId &&
        d.licenseNumber.toUpperCase() === input.licenseNumber.toUpperCase()
    );
    if (existing) {
      throw new ValidationError(`Driver with license number "${input.licenseNumber}" already exists.`);
    }

    const driver: TransportDriverRecord = {
      id: `drv-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId: input.campusId || ctx.campusId || null,
      fullName: input.fullName,
      phone: input.phone,
      licenseNumber: input.licenseNumber.toUpperCase(),
      licenseType: input.licenseType,
      licenseExpiry: input.licenseExpiry || null,
      status: input.status,
      emergencyContact: input.emergencyContact || null,
      staffId: input.staffId || null,
    };

    transportState.drivers.push(driver);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "TransportDriver",
      entityId: driver.id,
      details: { fullName: driver.fullName, licenseNumber: driver.licenseNumber },
    });

    return driver;
  }

  async updateDriver(ctx: TenantContext, driverId: string, input: UpdateTransportDriverInput): Promise<TransportDriverRecord> {
    const driver = transportState.drivers.find(
      (d) => d.id === driverId && d.organizationId === ctx.organizationId
    );
    if (!driver) {
      throw new NotFoundError(`Driver with ID "${driverId}" was not found.`);
    }
    Object.assign(driver, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "TransportDriver",
      entityId: driver.id,
      details: { updatedFields: Object.keys(input) },
    });

    return driver;
  }

  // ---------------------------------------------------------------------------
  // Routes & Stops
  // ---------------------------------------------------------------------------

  async getRoutes(ctx: TenantContext, params?: { status?: string; search?: string }): Promise<TransportRouteRecord[]> {
    let result = transportState.routes.filter((r) => r.organizationId === ctx.organizationId);

    if (params?.status) {
      result = result.filter((r) => r.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.startLocation.toLowerCase().includes(q) ||
          r.endLocation.toLowerCase().includes(q)
      );
    }

    // Refresh dynamic allocation counts & utilization
    return result.map((route) => {
      const routeAllocations = transportState.allocations.filter(
        (a) => a.routeId === route.id && a.status === "ACTIVE"
      );
      const vehicle = transportState.vehicles.find((v) => v.id === route.vehicleId);
      const capacity = vehicle ? vehicle.seatingCapacity : 40;
      const count = routeAllocations.length;
      const utilizationRate = capacity > 0 ? parseFloat(((count / capacity) * 100).toFixed(1)) : 0;

      return {
        ...route,
        totalAllocations: count,
        capacity,
        utilizationRate,
      };
    });
  }

  async getRouteById(ctx: TenantContext, routeId: string): Promise<TransportRouteRecord> {
    const route = transportState.routes.find(
      (r) => r.id === routeId && r.organizationId === ctx.organizationId
    );
    if (!route) {
      throw new NotFoundError(`Transport route with ID "${routeId}" was not found.`);
    }

    const routeAllocations = transportState.allocations.filter(
      (a) => a.routeId === route.id && a.status === "ACTIVE"
    );
    const vehicle = transportState.vehicles.find((v) => v.id === route.vehicleId);
    const capacity = vehicle ? vehicle.seatingCapacity : 40;
    const count = routeAllocations.length;
    const utilizationRate = capacity > 0 ? parseFloat(((count / capacity) * 100).toFixed(1)) : 0;

    return {
      ...route,
      totalAllocations: count,
      capacity,
      utilizationRate,
    };
  }

  async createRoute(ctx: TenantContext, input: CreateTransportRouteInput): Promise<TransportRouteRecord> {
    const existing = transportState.routes.find(
      (r) => r.organizationId === ctx.organizationId && r.code.toUpperCase() === input.code.toUpperCase()
    );
    if (existing) {
      throw new ValidationError(`A transport route with code "${input.code}" already exists.`);
    }

    const routeId = `route-${Date.now()}`;
    const vehicle = input.vehicleId
      ? transportState.vehicles.find((v) => v.id === input.vehicleId && v.organizationId === ctx.organizationId)
      : undefined;
    const driver = input.driverId
      ? transportState.drivers.find((d) => d.id === input.driverId && d.organizationId === ctx.organizationId)
      : undefined;

    const stops: TransportStopRecord[] = (input.stops || []).map((s, index) => ({
      id: `stop-${Date.now()}-${index + 1}`,
      routeId,
      stopName: s.stopName,
      stopOrder: s.stopOrder || index + 1,
      morningPickupTime: s.morningPickupTime,
      afternoonDropoffTime: s.afternoonDropoffTime,
      landmark: s.landmark || null,
      latitude: s.latitude || null,
      longitude: s.longitude || null,
    }));

    const route: TransportRouteRecord = {
      id: routeId,
      organizationId: ctx.organizationId,
      campusId: input.campusId || ctx.campusId || null,
      code: input.code.toUpperCase(),
      name: input.name,
      description: input.description || null,
      vehicleId: vehicle?.id || null,
      vehicleName: vehicle ? `${vehicle.registrationNumber} (${vehicle.make} ${vehicle.model})` : null,
      driverId: driver?.id || null,
      driverName: driver?.fullName || null,
      startLocation: input.startLocation,
      endLocation: input.endLocation,
      totalDistanceKm: input.totalDistanceKm || null,
      status: input.status,
      stops,
      totalAllocations: 0,
      capacity: vehicle?.seatingCapacity || 35,
      utilizationRate: 0,
    };

    if (vehicle) {
      vehicle.assignedRouteId = route.id;
      vehicle.assignedRouteName = route.name;
    }
    if (driver) {
      driver.assignedRouteId = route.id;
      driver.assignedRouteName = route.name;
    }

    transportState.routes.push(route);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "TransportRoute",
      entityId: route.id,
      details: { code: route.code, name: route.name, stopCount: stops.length },
    });

    return route;
  }

  async updateRoute(ctx: TenantContext, routeId: string, input: UpdateTransportRouteInput): Promise<TransportRouteRecord> {
    const route = await this.getRouteById(ctx, routeId);

    if (input.vehicleId !== undefined) {
      const vehicle = input.vehicleId
        ? transportState.vehicles.find((v) => v.id === input.vehicleId)
        : null;
      route.vehicleId = vehicle?.id || null;
      route.vehicleName = vehicle ? `${vehicle.registrationNumber} (${vehicle.make} ${vehicle.model})` : null;
    }

    if (input.driverId !== undefined) {
      const driver = input.driverId
        ? transportState.drivers.find((d) => d.id === input.driverId)
        : null;
      route.driverId = driver?.id || null;
      route.driverName = driver?.fullName || null;
    }

    Object.assign(route, {
      ...(input.name ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.startLocation ? { startLocation: input.startLocation } : {}),
      ...(input.endLocation ? { endLocation: input.endLocation } : {}),
      ...(input.totalDistanceKm !== undefined ? { totalDistanceKm: input.totalDistanceKm } : {}),
      ...(input.status ? { status: input.status } : {}),
    });

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "TransportRoute",
      entityId: route.id,
      details: { updatedFields: Object.keys(input) },
    });

    return route;
  }

  // ---------------------------------------------------------------------------
  // Student Allocations
  // ---------------------------------------------------------------------------

  async getAllocations(
    ctx: TenantContext,
    params?: { routeId?: string; status?: string; search?: string }
  ): Promise<StudentTransportAllocationRecord[]> {
    let result = transportState.allocations.filter((a) => a.organizationId === ctx.organizationId);

    if (params?.routeId) {
      result = result.filter((a) => a.routeId === params.routeId);
    }

    if (params?.status) {
      result = result.filter((a) => a.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.studentName.toLowerCase().includes(q) ||
          a.admissionNumber.toLowerCase().includes(q) ||
          a.routeName.toLowerCase().includes(q)
      );
    }

    return result;
  }

  async createAllocation(
    ctx: TenantContext,
    input: CreateStudentTransportAllocationInput
  ): Promise<StudentTransportAllocationRecord> {
    const route = await this.getRouteById(ctx, input.routeId);

    // Check vehicle capacity
    const activeRouteAllocations = transportState.allocations.filter(
      (a) => a.routeId === route.id && a.status === "ACTIVE"
    );

    if (activeRouteAllocations.length >= (route.capacity || 40)) {
      throw new ValidationError(
        `This route has reached maximum seating capacity (${route.capacity} seats). Cannot allocate additional passengers.`
      );
    }

    // Check if student is already actively subscribed to a transport route
    const existing = transportState.allocations.find(
      (a) => a.studentId === input.studentId && a.status === "ACTIVE"
    );
    if (existing) {
      throw new ValidationError(
        `This student already has an active transport allocation on route "${existing.routeName}".`
      );
    }

    const pickupStop = input.pickupStopId
      ? route.stops.find((s) => s.id === input.pickupStopId)
      : route.stops[0];
    const dropoffStop = input.dropoffStopId
      ? route.stops.find((s) => s.id === input.dropoffStopId)
      : pickupStop;

    const allocation: StudentTransportAllocationRecord = {
      id: `alloc-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId: input.campusId || ctx.campusId || null,
      studentId: input.studentId,
      studentName: "Enrolled Student",
      admissionNumber: "ADM-ENROLLED",
      routeId: route.id,
      routeName: route.name,
      pickupStopId: pickupStop?.id || null,
      pickupStopName: pickupStop ? `${pickupStop.stopName} (${pickupStop.morningPickupTime})` : null,
      dropoffStopId: dropoffStop?.id || null,
      dropoffStopName: dropoffStop ? `${dropoffStop.stopName} (${dropoffStop.afternoonDropoffTime})` : null,
      tripType: input.tripType,
      seatNumber: input.seatNumber || `${activeRouteAllocations.length + 1}A`,
      feeAmountCents: input.feeAmountCents || 45000,
      status: "ACTIVE",
      startDate: input.startDate || new Date().toISOString(),
      endDate: input.endDate || null,
      notes: input.notes || null,
    };

    transportState.allocations.push(allocation);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "StudentTransportAllocation",
      entityId: allocation.id,
      details: { studentId: allocation.studentId, routeName: route.name, seat: allocation.seatNumber },
    });

    return allocation;
  }

  async updateAllocation(
    ctx: TenantContext,
    allocationId: string,
    input: UpdateStudentTransportAllocationInput
  ): Promise<StudentTransportAllocationRecord> {
    const allocation = transportState.allocations.find(
      (a) => a.id === allocationId && a.organizationId === ctx.organizationId
    );
    if (!allocation) {
      throw new NotFoundError(`Allocation record with ID "${allocationId}" was not found.`);
    }

    Object.assign(allocation, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "StudentTransportAllocation",
      entityId: allocation.id,
      details: { updatedFields: Object.keys(input) },
    });

    return allocation;
  }

  // ---------------------------------------------------------------------------
  // Trip Manifest Attendance
  // ---------------------------------------------------------------------------

  async recordTripAttendance(
    ctx: TenantContext,
    input: RecordTripAttendanceInput
  ): Promise<TripAttendanceRecord> {
    const route = await this.getRouteById(ctx, input.routeId);
    const vehicle = await this.getVehicleById(ctx, input.vehicleId);

    const totalBoarded = input.records.filter((r) => r.status === "BOARDED").length;
    const totalAbsent = input.records.filter((r) => r.status === "ABSENT").length;

    const record: TripAttendanceRecord = {
      id: `trip-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId: ctx.organizationId,
      campusId: ctx.campusId || null,
      routeId: route.id,
      vehicleId: vehicle.id,
      tripDate: input.tripDate,
      direction: input.direction,
      totalBoarded,
      totalAbsent,
      records: input.records,
      createdAt: new Date().toISOString(),
    };

    transportState.tripAttendances.push(record);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "TransportTripAttendance",
      entityId: record.id,
      details: {
        routeId: route.id,
        vehicleId: vehicle.id,
        direction: input.direction,
        totalBoarded,
      },
    });

    return record;
  }

  async getTripAttendances(
    ctx: TenantContext,
    routeId?: string
  ): Promise<TripAttendanceRecord[]> {
    return transportState.tripAttendances.filter((t) => {
      if (t.organizationId !== ctx.organizationId) return false;
      if (routeId && t.routeId !== routeId) return false;
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Dashboard & Statistics
  // ---------------------------------------------------------------------------

  async getDashboardStats(ctx: TenantContext): Promise<TransportDashboardStats> {
    const vehicles = transportState.vehicles.filter((v) => v.organizationId === ctx.organizationId);
    const drivers = transportState.drivers.filter((d) => d.organizationId === ctx.organizationId);
    const routes = await this.getRoutes(ctx);
    const allocations = transportState.allocations.filter((a) => a.organizationId === ctx.organizationId);

    const activeVehicles = vehicles.filter((v) => v.status === "ACTIVE").length;
    const maintenanceVehicles = vehicles.filter((v) => v.status === "MAINTENANCE").length;
    const totalStops = routes.reduce((sum, r) => sum + (r.stops?.length || 0), 0);
    const totalAllocations = allocations.filter((a) => a.status === "ACTIVE").length;
    const totalFleetCapacity = vehicles
      .filter((v) => v.status === "ACTIVE")
      .reduce((sum, v) => sum + v.seatingCapacity, 0);

    const overallUtilizationPercentage =
      totalFleetCapacity > 0
        ? parseFloat(((totalAllocations / totalFleetCapacity) * 100).toFixed(1))
        : 0;

    const routesSummary = routes.map((r) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      allocatedCount: r.totalAllocations || 0,
      capacity: r.capacity || 0,
      utilizationRate: r.utilizationRate || 0,
    }));

    return {
      totalVehicles: vehicles.length,
      activeVehicles,
      maintenanceVehicles,
      totalDrivers: drivers.length,
      totalRoutes: routes.length,
      totalStops,
      totalAllocations,
      totalFleetCapacity,
      overallUtilizationPercentage,
      routesSummary,
    };
  }
}

export const transportService = new TransportService();
