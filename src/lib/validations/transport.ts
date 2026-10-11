import { z } from "zod";

export const VehicleStatusEnum = z.enum(["ACTIVE", "MAINTENANCE", "OUT_OF_SERVICE"]);
export const VehicleFuelTypeEnum = z.enum(["DIESEL", "PETROL", "ELECTRIC", "HYBRID", "CNG", "OTHER"]);
export const TripTypeEnum = z.enum(["ROUND_TRIP", "MORNING_ONLY", "AFTERNOON_ONLY"]);
export const AllocationStatusEnum = z.enum(["ACTIVE", "SUSPENDED", "CANCELLED"]);

export const createVehicleSchema = z.object({
  registrationNumber: z.string().trim().min(2, "Registration number is required").max(30),
  plateNumber: z.string().trim().min(2, "Plate number is required").max(30),
  vin: z.string().trim().max(50).optional().nullable(),
  make: z.string().trim().min(1, "Vehicle make is required").max(50),
  model: z.string().trim().min(1, "Vehicle model is required").max(50),
  year: z.coerce.number().int().min(1980).max(2100).optional().nullable(),
  seatingCapacity: z.coerce.number().int().min(4).max(100).default(30),
  fuelType: VehicleFuelTypeEnum.default("DIESEL"),
  status: VehicleStatusEnum.default("ACTIVE"),
  insurancePolicyNumber: z.string().trim().max(100).optional().nullable(),
  insuranceExpiry: z.string().datetime().optional().nullable(),
  fitnessExpiry: z.string().datetime().optional().nullable(),
  permitExpiry: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  campusId: z.string().uuid().optional().nullable(),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const createTransportDriverSchema = z.object({
  fullName: z.string().trim().min(2, "Driver name is required").max(100),
  phone: z.string().trim().min(4, "Phone is required").max(30),
  licenseNumber: z.string().trim().min(3, "License number is required").max(50),
  licenseType: z.string().trim().default("Heavy Commercial"),
  licenseExpiry: z.string().datetime().optional().nullable(),
  status: z.string().default("ACTIVE"),
  emergencyContact: z.string().trim().max(100).optional().nullable(),
  staffId: z.string().uuid().optional().nullable(),
  campusId: z.string().uuid().optional().nullable(),
});

export const updateTransportDriverSchema = createTransportDriverSchema.partial();

export const createTransportStopSchema = z.object({
  stopName: z.string().trim().min(2, "Stop name is required").max(100),
  stopOrder: z.coerce.number().int().min(1),
  morningPickupTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format must be HH:MM (e.g. 07:15)"),
  afternoonDropoffTime: z.string().trim().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Format must be HH:MM (e.g. 15:45)"),
  landmark: z.string().trim().max(150).optional().nullable(),
  latitude: z.coerce.number().optional().nullable(),
  longitude: z.coerce.number().optional().nullable(),
});

export const createTransportRouteSchema = z.object({
  code: z.string().trim().min(2, "Route code is required").max(20).toUpperCase(),
  name: z.string().trim().min(2, "Route name is required").max(100),
  description: z.string().trim().max(500).optional().nullable(),
  vehicleId: z.string().uuid().optional().nullable(),
  driverId: z.string().uuid().optional().nullable(),
  startLocation: z.string().trim().min(2, "Start location is required").max(150),
  endLocation: z.string().trim().min(2, "End location is required").max(150),
  totalDistanceKm: z.coerce.number().min(0).optional().nullable(),
  status: z.string().default("ACTIVE"),
  campusId: z.string().uuid().optional().nullable(),
  stops: z.array(createTransportStopSchema).optional(),
});

export const updateTransportRouteSchema = createTransportRouteSchema.omit({ stops: true }).partial();

export const createStudentTransportAllocationSchema = z.object({
  studentId: z.string().uuid("Invalid student identifier"),
  routeId: z.string().uuid("Invalid route identifier"),
  pickupStopId: z.string().uuid().optional().nullable(),
  dropoffStopId: z.string().uuid().optional().nullable(),
  tripType: TripTypeEnum.default("ROUND_TRIP"),
  seatNumber: z.string().trim().max(20).optional().nullable(),
  feeAmountCents: z.coerce.number().int().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  campusId: z.string().uuid().optional().nullable(),
});

export const updateStudentTransportAllocationSchema = z.object({
  routeId: z.string().uuid().optional(),
  pickupStopId: z.string().uuid().optional().nullable(),
  dropoffStopId: z.string().uuid().optional().nullable(),
  tripType: TripTypeEnum.optional(),
  seatNumber: z.string().trim().max(20).optional().nullable(),
  feeAmountCents: z.coerce.number().int().min(0).optional(),
  status: AllocationStatusEnum.optional(),
  endDate: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const updateTransportSettingSchema = z.object({
  campusId: z.string().uuid().optional().nullable(),
  feeCadence: z.enum(["TERM", "MONTHLY", "ANNUAL"]).default("TERM"),
  requireSeatAssignment: z.boolean().default(true),
  maxSeatsPerVehicle: z.coerce.number().int().min(10).max(100).default(50),
  morningArrivalTarget: z.string().trim().default("07:45"),
  afternoonDepartureTarget: z.string().trim().default("15:30"),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type CreateTransportDriverInput = z.infer<typeof createTransportDriverSchema>;
export type UpdateTransportDriverInput = z.infer<typeof updateTransportDriverSchema>;
export type CreateTransportRouteInput = z.infer<typeof createTransportRouteSchema>;
export type UpdateTransportRouteInput = z.infer<typeof updateTransportRouteSchema>;
export type CreateStudentTransportAllocationInput = z.infer<typeof createStudentTransportAllocationSchema>;
export type UpdateStudentTransportAllocationInput = z.infer<typeof updateStudentTransportAllocationSchema>;
export type UpdateTransportSettingInput = z.infer<typeof updateTransportSettingSchema>;
