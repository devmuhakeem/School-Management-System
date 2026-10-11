import { TenantContext } from "@/repositories/types";
import {
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { auditRepository } from "@/repositories/audit.repository";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "./admin.service";
import {
  CreateHostelInput,
  UpdateHostelInput,
  CreateHostelRoomInput,
  UpdateHostelRoomInput,
  CreateHostelBedSchema,
  CreateStudentHostelAllocationInput,
  CheckoutStudentHostelAllocationSchema,
  RecordHostelAttendanceInput,
  CreateHostelGatePassInput,
  UpdateGatePassStatusInput,
  UpdateHostelSettingInput,
} from "@/lib/validations/hostel";
import { z } from "zod";

type CreateHostelBedInput = z.infer<typeof CreateHostelBedSchema>;
type CheckoutAllocationInput = z.infer<typeof CheckoutStudentHostelAllocationSchema>;

// =============================================================================
// DOMAIN INTERFACES
// =============================================================================

export interface HostelSettingRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  curfewTime: string;
  allowWeekendLeave: boolean;
  gatePassApprovalRequired: boolean;
  visitorHours: string;
}

export interface HostelBedRecord {
  id: string;
  roomId: string;
  bedNumber: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
  currentStudentId?: string | null;
  currentStudentName?: string | null;
}

export interface HostelRoomRecord {
  id: string;
  hostelId: string;
  roomNumber: string;
  floorNumber: number;
  blockWing?: string | null;
  roomType: "SINGLE" | "DOUBLE" | "TRIPLE" | "DORMITORY" | "SUITE";
  capacity: number;
  occupiedCount: number;
  monthlyRateCents: number;
  termRateCents: number;
  amenities: string[];
  status: string;
  beds: HostelBedRecord[];
}

export interface HostelRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  code: string;
  type: "BOYS" | "GIRLS" | "COED" | "STAFF";
  wardenId?: string | null;
  wardenName?: string | null;
  contactPhone?: string | null;
  location?: string | null;
  totalRooms: number;
  totalCapacity: number;
  occupiedBeds: number;
  status: string;
  description?: string | null;
  rooms: HostelRoomRecord[];
}

export interface StudentHostelAllocationRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  gender: string;
  className?: string;
  hostelId: string;
  hostelName: string;
  roomId: string;
  roomNumber: string;
  bedId: string;
  bedNumber: string;
  checkInDate: string;
  checkOutDate?: string | null;
  feeAmountCents: number;
  status: "ACTIVE" | "CHECKED_OUT" | "VACATED" | "CANCELLED";
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  medicalNotes?: string | null;
  notes?: string | null;
}

export interface HostelAttendanceRecord {
  id: string;
  organizationId: string;
  hostelId: string;
  hostelName: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  roomNumber: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "ON_LEAVE";
  checkInTime?: string | null;
  remarks?: string | null;
  recordedByName?: string;
}

export interface HostelGatePassRecord {
  id: string;
  organizationId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  hostelId: string;
  hostelName: string;
  roomNumber: string;
  passNumber: string;
  passType: "DAY_OUTING" | "WEEKEND_LEAVE" | "HOME_VISIT" | "EMERGENCY";
  departureDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string | null;
  reason: string;
  destination: string;
  approvedByName?: string | null;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "OUT" | "RETURNED" | "OVERDUE";
  remarks?: string | null;
  createdAt: string;
}

export interface HostelDashboardStats {
  totalHostels: number;
  totalRooms: number;
  totalBedCapacity: number;
  occupiedBeds: number;
  vacantBeds: number;
  overallOccupancyRate: number;
  activeAllocations: number;
  activeGatePasses: number;
  pendingGatePasses: number;
  lastRollCallSummary: {
    totalChecked: number;
    present: number;
    absent: number;
    late: number;
    onLeave: number;
  };
  hostelSummaries: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    occupiedBeds: number;
    totalCapacity: number;
    occupancyRate: number;
  }>;
}

// =============================================================================
// IN-MEMORY RESILIENT SEED STATE
// =============================================================================

interface InMemoryHostelState {
  settings: HostelSettingRecord[];
  hostels: HostelRecord[];
  allocations: StudentHostelAllocationRecord[];
  attendances: HostelAttendanceRecord[];
  gatePasses: HostelGatePassRecord[];
}

function initializeHostelState(): InMemoryHostelState {
  const settings: HostelSettingRecord[] = [
    {
      id: "hst-set-01",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      curfewTime: "20:00",
      allowWeekendLeave: true,
      gatePassApprovalRequired: true,
      visitorHours: "16:00 - 18:00",
    },
  ];

  const mandelaRooms: HostelRoomRecord[] = [
    {
      id: "room-101",
      hostelId: "hst-001",
      roomNumber: "101",
      floorNumber: 1,
      blockWing: "West Wing",
      roomType: "DOUBLE",
      capacity: 2,
      occupiedCount: 2,
      monthlyRateCents: 20000,
      termRateCents: 60000,
      amenities: ["Ceiling Fan", "Attached Shower", "Study Desks", "Steel Lockers"],
      status: "FULL",
      beds: [
        { id: "bed-101-a", roomId: "room-101", bedNumber: "101-A", status: "OCCUPIED", currentStudentId: "stu-001", currentStudentName: "Lucas Wright" },
        { id: "bed-101-b", roomId: "room-101", bedNumber: "101-B", status: "OCCUPIED", currentStudentId: "stu-003", currentStudentName: "Tariq Hassan" },
      ],
    },
    {
      id: "room-102",
      hostelId: "hst-001",
      roomNumber: "102",
      floorNumber: 1,
      blockWing: "West Wing",
      roomType: "DOUBLE",
      capacity: 2,
      occupiedCount: 1,
      monthlyRateCents: 20000,
      termRateCents: 60000,
      amenities: ["Ceiling Fan", "Attached Shower", "Study Desks", "Steel Lockers"],
      status: "AVAILABLE",
      beds: [
        { id: "bed-102-a", roomId: "room-102", bedNumber: "102-A", status: "OCCUPIED", currentStudentId: "stu-005", currentStudentName: "Noah Mwangi" },
        { id: "bed-102-b", roomId: "room-102", bedNumber: "102-B", status: "AVAILABLE" },
      ],
    },
    {
      id: "room-201",
      hostelId: "hst-001",
      roomNumber: "201",
      floorNumber: 2,
      blockWing: "East Wing",
      roomType: "SINGLE",
      capacity: 1,
      occupiedCount: 0,
      monthlyRateCents: 35000,
      termRateCents: 105000,
      amenities: ["Air Conditioning", "En-suite Bath", "Executive Study Desk", "Bookshelf"],
      status: "AVAILABLE",
      beds: [
        { id: "bed-201-a", roomId: "room-201", bedNumber: "201-A", status: "AVAILABLE" },
      ],
    },
  ];

  const victoriaRooms: HostelRoomRecord[] = [
    {
      id: "room-vic-101",
      hostelId: "hst-002",
      roomNumber: "101",
      floorNumber: 1,
      blockWing: "North Wing",
      roomType: "DOUBLE",
      capacity: 2,
      occupiedCount: 2,
      monthlyRateCents: 20000,
      termRateCents: 60000,
      amenities: ["Ceiling Fan", "Attached Shower", "Study Desks", "Full Mirrors"],
      status: "FULL",
      beds: [
        { id: "bed-vic-101-a", roomId: "room-vic-101", bedNumber: "101-A", status: "OCCUPIED", currentStudentId: "stu-002", currentStudentName: "Maya Wright" },
        { id: "bed-vic-101-b", roomId: "room-vic-101", bedNumber: "101-B", status: "OCCUPIED", currentStudentId: "stu-004", currentStudentName: "Sophia Chen" },
      ],
    },
    {
      id: "room-vic-102",
      hostelId: "hst-002",
      roomNumber: "102",
      floorNumber: 1,
      blockWing: "North Wing",
      roomType: "TRIPLE",
      capacity: 3,
      occupiedCount: 0,
      monthlyRateCents: 16000,
      termRateCents: 48000,
      amenities: ["Ceiling Fan", "Common Bath Access", "Study Desks"],
      status: "AVAILABLE",
      beds: [
        { id: "bed-vic-102-a", roomId: "room-vic-102", bedNumber: "102-A", status: "AVAILABLE" },
        { id: "bed-vic-102-b", roomId: "room-vic-102", bedNumber: "102-B", status: "AVAILABLE" },
        { id: "bed-vic-102-c", roomId: "room-vic-102", bedNumber: "102-C", status: "AVAILABLE" },
      ],
    },
  ];

  const hostels: HostelRecord[] = [
    {
      id: "hst-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      name: "Nelson Mandela Boys Residence",
      code: "HST-NMB-01",
      type: "BOYS",
      wardenName: "Mr. Arthur Pendelton",
      contactPhone: "+1 (555) 392-8811",
      location: "South Campus Residential Quad",
      totalRooms: 3,
      totalCapacity: 5,
      occupiedBeds: 3,
      status: "ACTIVE",
      description: "Junior and Senior Boys boarding residence with dedicated common room and study hall.",
      rooms: mandelaRooms,
    },
    {
      id: "hst-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      name: "Victoria Girls Residence",
      code: "HST-VGR-02",
      type: "GIRLS",
      wardenName: "Mrs. Beatrice Mutesi",
      contactPhone: "+1 (555) 392-8822",
      location: "North Campus Residential Quad",
      totalRooms: 2,
      totalCapacity: 5,
      occupiedBeds: 2,
      status: "ACTIVE",
      description: "Girls boarding hall equipped with 24/7 security, matron station, and recreation garden.",
      rooms: victoriaRooms,
    },
  ];

  const allocations: StudentHostelAllocationRecord[] = [
    {
      id: "hall-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-001",
      studentName: "Lucas Wright",
      admissionNumber: "ADM-2024-001",
      gender: "MALE",
      className: "Grade 10 - Blue",
      hostelId: "hst-001",
      hostelName: "Nelson Mandela Boys Residence",
      roomId: "room-101",
      roomNumber: "101",
      bedId: "bed-101-a",
      bedNumber: "101-A",
      checkInDate: "2025-09-01T08:00:00.000Z",
      feeAmountCents: 60000,
      status: "ACTIVE",
      emergencyContactName: "Dr. Sarah Wright (Mother)",
      emergencyContactPhone: "+1 (555) 482-9901",
      medicalNotes: "Mild asthma; carries personal inhaler.",
    },
    {
      id: "hall-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-003",
      studentName: "Tariq Hassan",
      admissionNumber: "ADM-2024-003",
      gender: "MALE",
      className: "Grade 10 - Blue",
      hostelId: "hst-001",
      hostelName: "Nelson Mandela Boys Residence",
      roomId: "room-101",
      roomNumber: "101",
      bedId: "bed-101-b",
      bedNumber: "101-B",
      checkInDate: "2025-09-01T08:00:00.000Z",
      feeAmountCents: 60000,
      status: "ACTIVE",
      emergencyContactName: "Zainab Hassan (Guardian)",
      emergencyContactPhone: "+1 (555) 782-4412",
    },
    {
      id: "hall-003",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-005",
      studentName: "Noah Mwangi",
      admissionNumber: "ADM-2024-005",
      gender: "MALE",
      className: "Grade 10 - Gold",
      hostelId: "hst-001",
      hostelName: "Nelson Mandela Boys Residence",
      roomId: "room-102",
      roomNumber: "102",
      bedId: "bed-102-a",
      bedNumber: "102-A",
      checkInDate: "2025-09-01T08:00:00.000Z",
      feeAmountCents: 60000,
      status: "ACTIVE",
      emergencyContactName: "Grace Mwangi",
      emergencyContactPhone: "+1 (555) 912-3344",
    },
    {
      id: "hall-004",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-002",
      studentName: "Maya Wright",
      admissionNumber: "ADM-2024-002",
      gender: "FEMALE",
      className: "Grade 8 - Gold",
      hostelId: "hst-002",
      hostelName: "Victoria Girls Residence",
      roomId: "room-vic-101",
      roomNumber: "101",
      bedId: "bed-vic-101-a",
      bedNumber: "101-A",
      checkInDate: "2025-09-01T08:00:00.000Z",
      feeAmountCents: 60000,
      status: "ACTIVE",
      emergencyContactName: "Dr. Sarah Wright",
      emergencyContactPhone: "+1 (555) 482-9901",
    },
    {
      id: "hall-005",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      studentId: "stu-004",
      studentName: "Sophia Chen",
      admissionNumber: "ADM-2024-004",
      gender: "FEMALE",
      className: "Grade 9 - Ruby",
      hostelId: "hst-002",
      hostelName: "Victoria Girls Residence",
      roomId: "room-vic-101",
      roomNumber: "101",
      bedId: "bed-vic-101-b",
      bedNumber: "101-B",
      checkInDate: "2025-09-01T08:00:00.000Z",
      feeAmountCents: 60000,
      status: "ACTIVE",
      emergencyContactName: "Li Chen",
      emergencyContactPhone: "+1 (555) 304-8921",
    },
  ];

  const attendances: HostelAttendanceRecord[] = [
    {
      id: "att-001",
      organizationId: DEMO_ORG_ID,
      hostelId: "hst-001",
      hostelName: "Nelson Mandela Boys Residence",
      studentId: "stu-001",
      studentName: "Lucas Wright",
      admissionNumber: "ADM-2024-001",
      roomNumber: "101",
      date: "2026-09-27",
      status: "PRESENT",
      checkInTime: "19:45",
      remarks: "Present in room for 20:00 roll call",
      recordedByName: "Arthur Pendelton",
    },
    {
      id: "att-002",
      organizationId: DEMO_ORG_ID,
      hostelId: "hst-001",
      hostelName: "Nelson Mandela Boys Residence",
      studentId: "stu-003",
      studentName: "Tariq Hassan",
      admissionNumber: "ADM-2024-003",
      roomNumber: "101",
      date: "2026-09-27",
      status: "PRESENT",
      checkInTime: "19:50",
      recordedByName: "Arthur Pendelton",
    },
    {
      id: "att-003",
      organizationId: DEMO_ORG_ID,
      hostelId: "hst-001",
      hostelName: "Nelson Mandela Boys Residence",
      studentId: "stu-005",
      studentName: "Noah Mwangi",
      admissionNumber: "ADM-2024-005",
      roomNumber: "102",
      date: "2026-09-27",
      status: "LATE",
      checkInTime: "20:25",
      remarks: "Late return from school library study session",
      recordedByName: "Arthur Pendelton",
    },
    {
      id: "att-004",
      organizationId: DEMO_ORG_ID,
      hostelId: "hst-002",
      hostelName: "Victoria Girls Residence",
      studentId: "stu-002",
      studentName: "Maya Wright",
      admissionNumber: "ADM-2024-002",
      roomNumber: "101",
      date: "2026-09-27",
      status: "PRESENT",
      checkInTime: "19:30",
      recordedByName: "Beatrice Mutesi",
    },
    {
      id: "att-005",
      organizationId: DEMO_ORG_ID,
      hostelId: "hst-002",
      hostelName: "Victoria Girls Residence",
      studentId: "stu-004",
      studentName: "Sophia Chen",
      admissionNumber: "ADM-2024-004",
      roomNumber: "101",
      date: "2026-09-27",
      status: "ON_LEAVE",
      remarks: "Approved weekend family visit (GP-2026-002)",
      recordedByName: "Beatrice Mutesi",
    },
  ];

  const gatePasses: HostelGatePassRecord[] = [
    {
      id: "gp-001",
      organizationId: DEMO_ORG_ID,
      studentId: "stu-001",
      studentName: "Lucas Wright",
      admissionNumber: "ADM-2024-001",
      hostelId: "hst-001",
      hostelName: "Nelson Mandela Boys Residence",
      roomNumber: "101",
      passNumber: "GP-2026-001",
      passType: "DAY_OUTING",
      departureDate: "2026-09-26T10:00:00.000Z",
      expectedReturnDate: "2026-09-26T17:00:00.000Z",
      actualReturnDate: "2026-09-26T16:40:00.000Z",
      reason: "Dental appointment and family lunch",
      destination: "City Health Clinic, Downtown",
      approvedByName: "Arthur Pendelton",
      status: "RETURNED",
      createdAt: "2026-09-25T14:00:00.000Z",
    },
    {
      id: "gp-002",
      organizationId: DEMO_ORG_ID,
      studentId: "stu-004",
      studentName: "Sophia Chen",
      admissionNumber: "ADM-2024-004",
      hostelId: "hst-002",
      hostelName: "Victoria Girls Residence",
      roomNumber: "101",
      passNumber: "GP-2026-002",
      passType: "WEEKEND_LEAVE",
      departureDate: "2026-09-26T16:00:00.000Z",
      expectedReturnDate: "2026-09-28T18:00:00.000Z",
      reason: "Grandparent 80th birthday family reunion",
      destination: "144 Meadowlane Road, Springfield",
      approvedByName: "Beatrice Mutesi",
      status: "OUT",
      createdAt: "2026-09-24T09:30:00.000Z",
    },
    {
      id: "gp-003",
      organizationId: DEMO_ORG_ID,
      studentId: "stu-003",
      studentName: "Tariq Hassan",
      admissionNumber: "ADM-2024-003",
      hostelId: "hst-001",
      hostelName: "Nelson Mandela Boys Residence",
      roomNumber: "101",
      passNumber: "GP-2026-003",
      passType: "DAY_OUTING",
      departureDate: "2026-09-29T13:00:00.000Z",
      expectedReturnDate: "2026-09-29T18:00:00.000Z",
      reason: "Inter-school science olympiad preparation session",
      destination: "National Museum Science Library",
      approvedByName: null,
      status: "REQUESTED",
      createdAt: "2026-09-28T10:00:00.000Z",
    },
  ];

  return { settings, hostels, allocations, attendances, gatePasses };
}

let hostelState = initializeHostelState();

// =============================================================================
// HOSTEL SERVICE CLASS
// =============================================================================

export class HostelService {
  resetState(): void {
    hostelState = initializeHostelState();
  }

  // ---------------------------------------------------------------------------
  // Settings
  // ---------------------------------------------------------------------------

  async getSettings(ctx: TenantContext): Promise<HostelSettingRecord> {
    const setting = hostelState.settings.find((s) => s.organizationId === ctx.organizationId);
    if (!setting) {
      const defaultSetting: HostelSettingRecord = {
        id: `hst-set-${Date.now()}`,
        organizationId: ctx.organizationId,
        campusId: ctx.campusId || null,
        curfewTime: "20:00",
        allowWeekendLeave: true,
        gatePassApprovalRequired: true,
        visitorHours: "16:00 - 18:00",
      };
      hostelState.settings.push(defaultSetting);
      return defaultSetting;
    }
    return setting;
  }

  async updateSettings(ctx: TenantContext, input: UpdateHostelSettingInput): Promise<HostelSettingRecord> {
    const setting = await this.getSettings(ctx);
    Object.assign(setting, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "HostelSetting",
      entityId: setting.id,
      details: { updatedSettings: input },
    });

    return setting;
  }

  // ---------------------------------------------------------------------------
  // Hostels & Rooms
  // ---------------------------------------------------------------------------

  async getHostels(ctx: TenantContext, params?: { status?: string; search?: string }): Promise<HostelRecord[]> {
    let result = hostelState.hostels.filter((h) => h.organizationId === ctx.organizationId);

    if (params?.status) {
      result = result.filter((h) => h.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.code.toLowerCase().includes(q) ||
          (h.wardenName && h.wardenName.toLowerCase().includes(q))
      );
    }

    // Recalculate dynamic occupancy per room and hostel
    return result.map((hostel) => {
      let totalBeds = 0;
      let occupiedCount = 0;

      const updatedRooms = hostel.rooms.map((room) => {
        const roomBeds = room.beds;
        const roomOccupied = roomBeds.filter((b) => b.status === "OCCUPIED").length;
        totalBeds += roomBeds.length;
        occupiedCount += roomOccupied;

        return {
          ...room,
          capacity: roomBeds.length,
          occupiedCount: roomOccupied,
          status: roomOccupied >= roomBeds.length && roomBeds.length > 0 ? "FULL" : "AVAILABLE",
        };
      });

      return {
        ...hostel,
        totalRooms: hostel.rooms.length,
        totalCapacity: totalBeds,
        occupiedBeds: occupiedCount,
        rooms: updatedRooms,
      };
    });
  }

  async getHostelById(ctx: TenantContext, hostelId: string): Promise<HostelRecord> {
    const hostel = hostelState.hostels.find(
      (h) => h.id === hostelId && h.organizationId === ctx.organizationId
    );
    if (!hostel) {
      throw new NotFoundError(`Hostel building with ID "${hostelId}" was not found.`);
    }

    let totalBeds = 0;
    let occupiedCount = 0;

    const updatedRooms = hostel.rooms.map((room) => {
      const roomBeds = room.beds;
      const roomOccupied = roomBeds.filter((b) => b.status === "OCCUPIED").length;
      totalBeds += roomBeds.length;
      occupiedCount += roomOccupied;

      return {
        ...room,
        capacity: roomBeds.length,
        occupiedCount: roomOccupied,
        status: roomOccupied >= roomBeds.length && roomBeds.length > 0 ? "FULL" : "AVAILABLE",
      };
    });

    return {
      ...hostel,
      totalRooms: hostel.rooms.length,
      totalCapacity: totalBeds,
      occupiedBeds: occupiedCount,
      rooms: updatedRooms,
    };
  }

  async createHostel(ctx: TenantContext, input: CreateHostelInput): Promise<HostelRecord> {
    const existing = hostelState.hostels.find(
      (h) => h.organizationId === ctx.organizationId && h.code.toUpperCase() === input.code.toUpperCase()
    );
    if (existing) {
      throw new ValidationError(`A hostel building with code "${input.code}" already exists.`);
    }

    const hostel: HostelRecord = {
      id: `hst-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId: input.campusId || ctx.campusId || null,
      name: input.name,
      code: input.code.toUpperCase(),
      type: input.type,
      wardenName: input.wardenName || null,
      wardenId: input.wardenId || null,
      contactPhone: input.contactPhone || null,
      location: input.location || null,
      totalRooms: 0,
      totalCapacity: 0,
      occupiedBeds: 0,
      status: "ACTIVE",
      description: input.description || null,
      rooms: [],
    };

    hostelState.hostels.push(hostel);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Hostel",
      entityId: hostel.id,
      details: { name: hostel.name, code: hostel.code, type: hostel.type },
    });

    return hostel;
  }

  async updateHostel(ctx: TenantContext, hostelId: string, input: UpdateHostelInput): Promise<HostelRecord> {
    const hostel = hostelState.hostels.find(
      (h) => h.id === hostelId && h.organizationId === ctx.organizationId
    );
    if (!hostel) {
      throw new NotFoundError(`Hostel building with ID "${hostelId}" was not found.`);
    }
    Object.assign(hostel, input);

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Hostel",
      entityId: hostel.id,
      details: { updatedFields: Object.keys(input) },
    });

    return this.getHostelById(ctx, hostelId);
  }

  async createRoom(ctx: TenantContext, input: CreateHostelRoomInput): Promise<HostelRoomRecord> {
    const hostel = hostelState.hostels.find(
      (h) => h.id === input.hostelId && h.organizationId === ctx.organizationId
    );
    if (!hostel) {
      throw new NotFoundError(`Hostel building with ID "${input.hostelId}" was not found.`);
    }

    const existingRoom = hostel.rooms.find(
      (r) => r.roomNumber.toUpperCase() === input.roomNumber.toUpperCase()
    );
    if (existingRoom) {
      throw new ValidationError(`Room number "${input.roomNumber}" already exists in ${hostel.name}.`);
    }

    const roomId = `room-${Date.now()}`;
    const bedsCount = input.capacity || 2;
    const beds: HostelBedRecord[] = [];

    for (let i = 1; i <= bedsCount; i++) {
      const suffix = String.fromCharCode(64 + i); // 'A', 'B', 'C'
      beds.push({
        id: `bed-${Date.now()}-${i}`,
        roomId,
        bedNumber: `${input.roomNumber}-${suffix}`,
        status: "AVAILABLE",
      });
    }

    const room: HostelRoomRecord = {
      id: roomId,
      hostelId: hostel.id,
      roomNumber: input.roomNumber,
      floorNumber: input.floorNumber,
      blockWing: input.blockWing || null,
      roomType: input.roomType,
      capacity: bedsCount,
      occupiedCount: 0,
      monthlyRateCents: input.monthlyRateCents || 0,
      termRateCents: input.termRateCents || 0,
      amenities: input.amenities || [],
      status: "AVAILABLE",
      beds,
    };

    hostel.rooms.push(room);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "HostelRoom",
      entityId: room.id,
      details: { hostelName: hostel.name, roomNumber: room.roomNumber, capacity: room.capacity },
    });

    return room;
  }

  // ---------------------------------------------------------------------------
  // Student Hostel Allocations
  // ---------------------------------------------------------------------------

  async getAllocations(
    ctx: TenantContext,
    params?: { hostelId?: string; status?: string; search?: string }
  ): Promise<StudentHostelAllocationRecord[]> {
    let result = hostelState.allocations.filter((a) => a.organizationId === ctx.organizationId);

    if (params?.hostelId) {
      result = result.filter((a) => a.hostelId === params.hostelId);
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
          a.hostelName.toLowerCase().includes(q) ||
          a.roomNumber.toLowerCase().includes(q)
      );
    }

    return result;
  }

  async createAllocation(
    ctx: TenantContext,
    input: CreateStudentHostelAllocationInput
  ): Promise<StudentHostelAllocationRecord> {
    const hostel = await this.getHostelById(ctx, input.hostelId);
    const room = hostel.rooms.find((r) => r.id === input.roomId);
    if (!room) {
      throw new NotFoundError(`Room with ID "${input.roomId}" was not found in this hostel.`);
    }

    const bed = room.beds.find((b) => b.id === input.bedId);
    if (!bed) {
      throw new NotFoundError(`Bed with ID "${input.bedId}" was not found in Room ${room.roomNumber}.`);
    }

    if (bed.status === "OCCUPIED") {
      throw new ValidationError(`Bed ${bed.bedNumber} is already occupied.`);
    }

    // Check if student already has an active allocation
    const existing = hostelState.allocations.find(
      (a) => a.studentId === input.studentId && a.status === "ACTIVE"
    );
    if (existing) {
      throw new ValidationError(
        `This student is already residing in ${existing.hostelName}, Room ${existing.roomNumber}, Bed ${existing.bedNumber}.`
      );
    }

    const allocation: StudentHostelAllocationRecord = {
      id: `hall-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId: input.campusId || ctx.campusId || null,
      studentId: input.studentId,
      studentName: "Boarding Scholar",
      admissionNumber: "ADM-BOARDING",
      gender: hostel.type === "BOYS" ? "MALE" : hostel.type === "GIRLS" ? "FEMALE" : "OTHER",
      className: "Senior High",
      hostelId: hostel.id,
      hostelName: hostel.name,
      roomId: room.id,
      roomNumber: room.roomNumber,
      bedId: bed.id,
      bedNumber: bed.bedNumber,
      checkInDate: input.checkInDate || new Date().toISOString(),
      checkOutDate: input.checkOutDate || null,
      feeAmountCents: input.feeAmountCents || room.termRateCents || 60000,
      status: "ACTIVE",
      emergencyContactName: input.emergencyContactName || null,
      emergencyContactPhone: input.emergencyContactPhone || null,
      medicalNotes: input.medicalNotes || null,
      notes: input.notes || null,
    };

    // Mark bed occupied
    bed.status = "OCCUPIED";
    bed.currentStudentId = allocation.studentId;
    bed.currentStudentName = allocation.studentName;

    hostelState.allocations.unshift(allocation);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "StudentHostelAllocation",
      entityId: allocation.id,
      details: {
        studentId: allocation.studentId,
        hostelName: hostel.name,
        roomNumber: room.roomNumber,
        bedNumber: bed.bedNumber,
      },
    });

    return allocation;
  }

  async checkoutAllocation(
    ctx: TenantContext,
    input: CheckoutAllocationInput
  ): Promise<StudentHostelAllocationRecord> {
    const allocation = hostelState.allocations.find(
      (a) => a.id === input.allocationId && a.organizationId === ctx.organizationId
    );
    if (!allocation) {
      throw new NotFoundError(`Hostel allocation record with ID "${input.allocationId}" was not found.`);
    }

    if (allocation.status !== "ACTIVE") {
      throw new ValidationError(`Allocation is already in "${allocation.status}" status.`);
    }

    allocation.status = "CHECKED_OUT";
    allocation.checkOutDate = input.checkOutDate || new Date().toISOString();
    if (input.notes) {
      allocation.notes = allocation.notes ? `${allocation.notes} | Checkout: ${input.notes}` : input.notes;
    }

    // Free up bed in hostel room
    for (const hostel of hostelState.hostels) {
      for (const room of hostel.rooms) {
        const bed = room.beds.find((b) => b.id === allocation.bedId);
        if (bed) {
          bed.status = "AVAILABLE";
          bed.currentStudentId = null;
          bed.currentStudentName = null;
          break;
        }
      }
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "StudentHostelAllocation",
      entityId: allocation.id,
      details: { action: "CHECKOUT", studentName: allocation.studentName, bedNumber: allocation.bedNumber },
    });

    return allocation;
  }

  // ---------------------------------------------------------------------------
  // Night Roll Call & Curfew Attendance
  // ---------------------------------------------------------------------------

  async getAttendances(
    ctx: TenantContext,
    params?: { hostelId?: string; date?: string }
  ): Promise<HostelAttendanceRecord[]> {
    let result = hostelState.attendances.filter((a) => a.organizationId === ctx.organizationId);

    if (params?.hostelId) {
      result = result.filter((a) => a.hostelId === params.hostelId);
    }

    if (params?.date) {
      result = result.filter((a) => a.date === params.date);
    }

    return result;
  }

  async recordAttendance(ctx: TenantContext, input: RecordHostelAttendanceInput): Promise<HostelAttendanceRecord[]> {
    const hostel = await this.getHostelById(ctx, input.hostelId);
    const recordedList: HostelAttendanceRecord[] = [];

    for (const rec of input.records) {
      const studentAlloc = hostelState.allocations.find(
        (a) => a.hostelId === hostel.id && a.studentId === rec.studentId && a.status === "ACTIVE"
      );

      // Check if existing record for today
      let existing = hostelState.attendances.find(
        (a) => a.hostelId === hostel.id && a.studentId === rec.studentId && a.date === input.date
      );

      if (existing) {
        existing.status = rec.status;
        existing.checkInTime = rec.checkInTime || existing.checkInTime;
        existing.remarks = rec.remarks || existing.remarks;
        recordedList.push(existing);
      } else {
        const newRecord: HostelAttendanceRecord = {
          id: `att-${Date.now()}-${rec.studentId}`,
          organizationId: ctx.organizationId,
          hostelId: hostel.id,
          hostelName: hostel.name,
          studentId: rec.studentId,
          studentName: studentAlloc?.studentName || "Resident Student",
          admissionNumber: studentAlloc?.admissionNumber || "ADM-RESIDENT",
          roomNumber: studentAlloc?.roomNumber || "Unassigned",
          date: input.date,
          status: rec.status,
          checkInTime: rec.checkInTime || null,
          remarks: rec.remarks || null,
          recordedByName: ctx.userId || "Duty Warden",
        };
        hostelState.attendances.unshift(newRecord);
        recordedList.push(newRecord);
      }
    }

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "HostelAttendance",
      entityId: `${hostel.id}-${input.date}`,
      details: { hostelName: hostel.name, date: input.date, recordsCount: input.records.length },
    });

    return recordedList;
  }

  // ---------------------------------------------------------------------------
  // Gate Passes & Leaves
  // ---------------------------------------------------------------------------

  async getGatePasses(
    ctx: TenantContext,
    params?: { hostelId?: string; status?: string; search?: string }
  ): Promise<HostelGatePassRecord[]> {
    let result = hostelState.gatePasses.filter((g) => g.organizationId === ctx.organizationId);

    if (params?.hostelId) {
      result = result.filter((g) => g.hostelId === params.hostelId);
    }

    if (params?.status) {
      result = result.filter((g) => g.status === params.status);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (g) =>
          g.studentName.toLowerCase().includes(q) ||
          g.passNumber.toLowerCase().includes(q) ||
          g.destination.toLowerCase().includes(q)
      );
    }

    return result;
  }

  async createGatePass(ctx: TenantContext, input: CreateHostelGatePassInput): Promise<HostelGatePassRecord> {
    const hostel = await this.getHostelById(ctx, input.hostelId);
    const alloc = hostelState.allocations.find(
      (a) => a.hostelId === hostel.id && a.studentId === input.studentId && a.status === "ACTIVE"
    );

    const passNumber = `GP-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

    const gatePass: HostelGatePassRecord = {
      id: `gp-${Date.now()}`,
      organizationId: ctx.organizationId,
      studentId: input.studentId,
      studentName: alloc?.studentName || "Resident Scholar",
      admissionNumber: alloc?.admissionNumber || "ADM-SCHOLAR",
      hostelId: hostel.id,
      hostelName: hostel.name,
      roomNumber: alloc?.roomNumber || "101",
      passNumber,
      passType: input.passType,
      departureDate: input.departureDate,
      expectedReturnDate: input.expectedReturnDate,
      reason: input.reason,
      destination: input.destination,
      status: "REQUESTED",
      remarks: input.remarks || null,
      createdAt: new Date().toISOString(),
    };

    hostelState.gatePasses.unshift(gatePass);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "HostelGatePass",
      entityId: gatePass.id,
      details: { passNumber: gatePass.passNumber, studentName: gatePass.studentName, type: gatePass.passType },
    });

    return gatePass;
  }

  async updateGatePassStatus(
    ctx: TenantContext,
    input: UpdateGatePassStatusInput
  ): Promise<HostelGatePassRecord> {
    const gatePass = hostelState.gatePasses.find(
      (g) => g.id === input.passId && g.organizationId === ctx.organizationId
    );
    if (!gatePass) {
      throw new NotFoundError(`Gate pass with ID "${input.passId}" was not found.`);
    }

    gatePass.status = input.status;
    if (input.status === "APPROVED") {
      gatePass.approvedByName = ctx.userId ? "Hostel Warden" : "Hostel Warden";
    }
    if (input.status === "RETURNED") {
      gatePass.actualReturnDate = input.actualReturnDate || new Date().toISOString();
    }
    if (input.remarks) {
      gatePass.remarks = gatePass.remarks ? `${gatePass.remarks} | ${input.remarks}` : input.remarks;
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "HostelGatePass",
      entityId: gatePass.id,
      details: { action: "STATUS_CHANGE", passNumber: gatePass.passNumber, newStatus: input.status },
    });

    return gatePass;
  }

  // ---------------------------------------------------------------------------
  // Dashboard & Statistics
  // ---------------------------------------------------------------------------

  async getDashboardStats(ctx: TenantContext): Promise<HostelDashboardStats> {
    const hostels = await this.getHostels(ctx);
    const allocations = hostelState.allocations.filter((a) => a.organizationId === ctx.organizationId);
    const gatePasses = hostelState.gatePasses.filter((g) => g.organizationId === ctx.organizationId);
    const attendances = hostelState.attendances.filter((a) => a.organizationId === ctx.organizationId);

    const totalRooms = hostels.reduce((sum, h) => sum + h.totalRooms, 0);
    const totalBedCapacity = hostels.reduce((sum, h) => sum + h.totalCapacity, 0);
    const occupiedBeds = hostels.reduce((sum, h) => sum + h.occupiedBeds, 0);
    const vacantBeds = Math.max(0, totalBedCapacity - occupiedBeds);
    const overallOccupancyRate =
      totalBedCapacity > 0 ? parseFloat(((occupiedBeds / totalBedCapacity) * 100).toFixed(1)) : 0;

    const activeAllocations = allocations.filter((a) => a.status === "ACTIVE").length;
    const activeGatePasses = gatePasses.filter((g) => g.status === "OUT").length;
    const pendingGatePasses = gatePasses.filter((g) => g.status === "REQUESTED").length;

    // Last roll call summary
    const today = new Date().toISOString().slice(0, 10);
    const todayAtt = attendances.filter((a) => a.date === today || a.date === "2026-09-27");

    const lastRollCallSummary = {
      totalChecked: todayAtt.length,
      present: todayAtt.filter((a) => a.status === "PRESENT").length,
      absent: todayAtt.filter((a) => a.status === "ABSENT").length,
      late: todayAtt.filter((a) => a.status === "LATE").length,
      onLeave: todayAtt.filter((a) => a.status === "ON_LEAVE").length,
    };

    const hostelSummaries = hostels.map((h) => ({
      id: h.id,
      name: h.name,
      code: h.code,
      type: h.type,
      occupiedBeds: h.occupiedBeds,
      totalCapacity: h.totalCapacity,
      occupancyRate:
        h.totalCapacity > 0 ? parseFloat(((h.occupiedBeds / h.totalCapacity) * 100).toFixed(1)) : 0,
    }));

    return {
      totalHostels: hostels.length,
      totalRooms,
      totalBedCapacity,
      occupiedBeds,
      vacantBeds,
      overallOccupancyRate,
      activeAllocations,
      activeGatePasses,
      pendingGatePasses,
      lastRollCallSummary,
      hostelSummaries,
    };
  }
}

export const hostelService = new HostelService();
