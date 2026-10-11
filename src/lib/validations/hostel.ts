import { z } from "zod";

export const HostelGenderTypeEnum = z.enum(["BOYS", "GIRLS", "COED", "STAFF"]);
export const HostelRoomTypeEnum = z.enum(["SINGLE", "DOUBLE", "TRIPLE", "DORMITORY", "SUITE"]);
export const HostelBedStatusEnum = z.enum(["AVAILABLE", "OCCUPIED", "RESERVED", "MAINTENANCE"]);
export const HostelAllocationStatusEnum = z.enum(["ACTIVE", "CHECKED_OUT", "VACATED", "CANCELLED"]);
export const HostelAttendanceStatusEnum = z.enum(["PRESENT", "ABSENT", "LATE", "EXCUSED", "ON_LEAVE"]);
export const GatePassTypeEnum = z.enum(["DAY_OUTING", "WEEKEND_LEAVE", "HOME_VISIT", "EMERGENCY"]);
export const GatePassStatusEnum = z.enum(["REQUESTED", "APPROVED", "REJECTED", "OUT", "RETURNED", "OVERDUE"]);

export const createHostelSchema = z.object({
  name: z.string().trim().min(2, "Hostel name is required").max(100),
  code: z.string().trim().min(2, "Hostel code is required").max(20).toUpperCase(),
  type: HostelGenderTypeEnum.default("COED"),
  wardenName: z.string().trim().max(100).optional().nullable(),
  wardenId: z.string().uuid().optional().nullable(),
  contactPhone: z.string().trim().max(30).optional().nullable(),
  location: z.string().trim().max(150).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
  campusId: z.string().uuid().optional().nullable(),
});

export const updateHostelSchema = createHostelSchema.partial();

export const createHostelRoomSchema = z.object({
  hostelId: z.string().uuid("Invalid hostel identifier"),
  roomNumber: z.string().trim().min(1, "Room number is required").max(20),
  floorNumber: z.coerce.number().int().min(0).max(50).default(1),
  blockWing: z.string().trim().max(50).optional().nullable(),
  roomType: HostelRoomTypeEnum.default("DOUBLE"),
  capacity: z.coerce.number().int().min(1).max(20).default(2),
  monthlyRateCents: z.coerce.number().int().min(0).default(0),
  termRateCents: z.coerce.number().int().min(0).default(0),
  amenities: z.array(z.string()).optional().default([]),
});

export const updateHostelRoomSchema = createHostelRoomSchema.partial();

export const createHostelBedSchema = z.object({
  roomId: z.string().uuid("Invalid room identifier"),
  bedNumber: z.string().trim().min(1, "Bed number is required").max(20),
});

export const createStudentHostelAllocationSchema = z.object({
  studentId: z.string().uuid("Invalid student identifier"),
  hostelId: z.string().uuid("Invalid hostel identifier"),
  roomId: z.string().uuid("Invalid room identifier"),
  bedId: z.string().uuid("Invalid bed identifier"),
  checkInDate: z.string().datetime().optional(),
  checkOutDate: z.string().datetime().optional().nullable(),
  feeAmountCents: z.coerce.number().int().min(0).default(0),
  emergencyContactName: z.string().trim().max(100).optional().nullable(),
  emergencyContactPhone: z.string().trim().max(30).optional().nullable(),
  medicalNotes: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  campusId: z.string().uuid().optional().nullable(),
});

export const checkoutStudentHostelAllocationSchema = z.object({
  allocationId: z.string().uuid("Invalid allocation identifier"),
  checkOutDate: z.string().datetime().optional(),
  notes: z.string().trim().max(500).optional(),
});

export const recordHostelAttendanceSchema = z.object({
  hostelId: z.string().uuid("Invalid hostel identifier"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD"),
  records: z.array(
    z.object({
      studentId: z.string().uuid("Invalid student identifier"),
      status: HostelAttendanceStatusEnum.default("PRESENT"),
      checkInTime: z.string().trim().optional().nullable(),
      remarks: z.string().trim().max(250).optional().nullable(),
    })
  ).min(1, "At least one attendance record is required"),
});

export const createHostelGatePassSchema = z.object({
  studentId: z.string().uuid("Invalid student identifier"),
  hostelId: z.string().uuid("Invalid hostel identifier"),
  passType: GatePassTypeEnum.default("DAY_OUTING"),
  departureDate: z.string().datetime(),
  expectedReturnDate: z.string().datetime(),
  reason: z.string().trim().min(3, "Reason is required").max(300),
  destination: z.string().trim().min(2, "Destination is required").max(150),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const updateGatePassStatusSchema = z.object({
  passId: z.string().uuid("Invalid gate pass identifier"),
  status: GatePassStatusEnum,
  actualReturnDate: z.string().datetime().optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
});

export const updateHostelSettingSchema = z.object({
  campusId: z.string().uuid().optional().nullable(),
  curfewTime: z.string().trim().default("20:00"),
  allowWeekendLeave: z.boolean().default(true),
  gatePassApprovalRequired: z.boolean().default(true),
  visitorHours: z.string().trim().default("16:00 - 18:00"),
});

export const CreateHostelBedSchema = createHostelBedSchema;
export const CheckoutStudentHostelAllocationSchema = checkoutStudentHostelAllocationSchema;

export type CreateHostelInput = z.infer<typeof createHostelSchema>;
export type UpdateHostelInput = z.infer<typeof updateHostelSchema>;
export type CreateHostelRoomInput = z.infer<typeof createHostelRoomSchema>;
export type UpdateHostelRoomInput = z.infer<typeof updateHostelRoomSchema>;
export type CreateHostelBedInput = z.infer<typeof createHostelBedSchema>;
export type CreateStudentHostelAllocationInput = z.infer<typeof createStudentHostelAllocationSchema>;
export type CheckoutStudentHostelAllocationInput = z.infer<typeof checkoutStudentHostelAllocationSchema>;
export type RecordHostelAttendanceInput = z.infer<typeof recordHostelAttendanceSchema>;
export type CreateHostelGatePassInput = z.infer<typeof createHostelGatePassSchema>;
export type UpdateGatePassStatusInput = z.infer<typeof updateGatePassStatusSchema>;
export type UpdateHostelSettingInput = z.infer<typeof updateHostelSettingSchema>;
