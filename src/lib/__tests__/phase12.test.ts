import { describe, it, expect, beforeEach } from "vitest";
import { libraryService } from "@/services/library.service";
import { transportService } from "@/services/transport.service";
import { hostelService } from "@/services/hostel.service";
import { TenantContext } from "@/repositories/types";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "@/services/admin.service";
import { ValidationError, NotFoundError } from "@/lib/errors";

describe("Phase 12: Library, Transport & Hostel Management Architecture", () => {
  const adminCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-super-admin-01",
    userRoles: ["Super Administrator"],
  };

  const foreignTenantCtx: TenantContext = {
    organizationId: "org-foreign-academy",
    userId: "u-foreign-user",
    userRoles: ["Super Administrator"],
  };

  beforeEach(() => {
    libraryService.resetState();
    transportService.resetState();
    hostelService.resetState();
  });

  // ===========================================================================
  // MODULE A: LIBRARY MANAGEMENT
  // ===========================================================================
  describe("Module A: Library Management", () => {
    it("retrieves catalog titles and respects tenant isolation", async () => {
      const books = await libraryService.getBooks(adminCtx);
      expect(books.length).toBeGreaterThan(0);
      expect(books[0]).toHaveProperty("title");
      expect(books[0]).toHaveProperty("totalCopies");

      const foreignBooks = await libraryService.getBooks(foreignTenantCtx);
      expect(foreignBooks).toHaveLength(0);
    });

    it("registers new book titles and creates corresponding inventory copies", async () => {
      const newBook = await libraryService.createBook(adminCtx, {
        title: "Chemistry: A Molecular Approach",
        authors: "Nivaldo J. Tro",
        category: "Science",
        language: "English",
        isbn: "978-0134874371",
        publisher: "Pearson",
        callNumber: "540 TRO 2020",
        shelfLocation: "Aisle 2, Shelf B1",
        initialCopies: 3,
      });

      expect(newBook.id).toBeDefined();
      expect(newBook.title).toBe("Chemistry: A Molecular Approach");
      expect(newBook.totalCopies).toBe(3);
      expect(newBook.availableCopies).toBe(3);
      expect(newBook.copies).toHaveLength(3);

      // Verify book can be retrieved by ID
      const retrieved = await libraryService.getBookById(adminCtx, newBook.id);
      expect(retrieved.id).toBe(newBook.id);
      expect(retrieved.copies).toHaveLength(3);
    });

    it("prevents registering duplicate ISBN numbers within same organization", async () => {
      await expect(
        libraryService.createBook(adminCtx, {
          title: "Duplicate Physics",
          authors: "Anonymous",
          category: "Science",
          language: "English",
          initialCopies: 1,
          isbn: "978-0135159552", // ISBN from seed data (University Physics)
        })
      ).rejects.toThrow(ValidationError);
    });

    it("adds an individual accession copy with unique barcode to an existing book", async () => {
      const books = await libraryService.getBooks(adminCtx);
      const targetBook = books[0];
      const initialTotal = targetBook.totalCopies;

      const copy = await libraryService.createBookCopy(adminCtx, {
        bookId: targetBook.id,
        barcode: "LIB-BC-SPECIAL-01",
        conditionNote: "Brand new replacement copy",
        costCents: 4500,
      });

      expect(copy.barcode).toBe("LIB-BC-SPECIAL-01");
      expect(copy.status).toBe("AVAILABLE");

      const updated = await libraryService.getBookById(adminCtx, targetBook.id);
      expect(updated.totalCopies).toBe(initialTotal + 1);
    });

    it("issues a book loan to an eligible patron and decreases available copies", async () => {
      const books = await libraryService.getBooks(adminCtx);
      const availableBook = books.find((b) => b.availableCopies > 0)!;
      const availableCopy = availableBook.copies!.find((c) => c.status === "AVAILABLE")!;
      const members = await libraryService.getMembers(adminCtx);
      const studentMember = members.find((m) => m.memberType === "STUDENT" && m.activeLoansCount < 3)!;

      const initialAvailable = availableBook.availableCopies;
      const initialActiveLoans = studentMember.activeLoansCount;

      const loan = await libraryService.issueLoan(adminCtx, {
        memberId: studentMember.id,
        copyId: availableCopy.id,
        loanDays: 14,
        notes: "Class research",
      });

      expect(loan.id).toBeDefined();
      expect(loan.status).toBe("ACTIVE");
      expect(loan.bookTitle).toBe(availableBook.title);
      expect(loan.barcode).toBe(availableCopy.barcode);

      // Verify book availability decreased
      const updatedBook = await libraryService.getBookById(adminCtx, availableBook.id);
      expect(updatedBook.availableCopies).toBe(initialAvailable - 1);

      // Verify member active loans count increased
      const updatedMember = await libraryService.getMemberById(adminCtx, studentMember.id);
      expect(updatedMember.activeLoansCount).toBe(initialActiveLoans + 1);
    });

    it("enforces patron loan limits and blocks borrowing when quota is exceeded", async () => {
      const members = await libraryService.getMembers(adminCtx);
      const studentMember = members.find((m) => m.memberType === "STUDENT")!;
      // Force set active loans to max
      studentMember.activeLoansCount = 3;

      const books = await libraryService.getBooks(adminCtx);
      const availableCopy = books.find((b) => b.availableCopies > 0)!.copies![0];

      await expect(
        libraryService.issueLoan(adminCtx, {
          memberId: studentMember.id,
          copyId: availableCopy.id,
        })
      ).rejects.toThrow(ValidationError);
    });

    it("processes book return, updates availability and assesses fines if overdue", async () => {
      const loans = await libraryService.getLoans(adminCtx, { status: "ACTIVE" });
      const activeLoan = loans[0];

      const returned = await libraryService.returnLoan(adminCtx, {
        loanId: activeLoan.id,
        conditionNote: "Returned in good condition",
        waiveFine: false,
      });

      expect(returned.status).toBe("RETURNED");
      expect(returned.returnDate).toBeDefined();

      // Verify book copy is available again
      const book = await libraryService.getBookById(adminCtx, activeLoan.bookId);
      const copy = book.copies!.find((c) => c.id === activeLoan.copyId);
      expect(copy?.status).toBe("AVAILABLE");
    });

    it("supports loan renewal within configured policy limits", async () => {
      const loans = await libraryService.getLoans(adminCtx, { status: "ACTIVE" });
      const loan = loans[0];
      const initialDue = new Date(loan.dueDate).getTime();
      const initialRenewalCount = loan.renewalCount;

      const renewed = await libraryService.renewLoan(adminCtx, {
        loanId: loan.id,
        additionalDays: 14,
      });

      expect(renewed.renewalCount).toBe(initialRenewalCount + 1);
      const newDue = new Date(renewed.dueDate).getTime();
      expect(newDue).toBeGreaterThan(initialDue);
    });

    it("collects and waives overdue fines with audit logging", async () => {
      const loans = await libraryService.getLoans(adminCtx);
      const overdueLoan = loans.find((l) => l.fineAmountCents > 0)!;
      expect(overdueLoan).toBeDefined();

      const paid = await libraryService.collectFine(adminCtx, {
        loanId: overdueLoan.id,
        amountCents: 100,
        paymentMethod: "CASH",
      });
      expect(paid.finePaidCents).toBe(100);

      const waived = await libraryService.waiveFine(adminCtx, {
        loanId: overdueLoan.id,
        reason: "Academic scholarship concession",
      });
      expect(waived.fineAmountCents).toBe(waived.finePaidCents);
    });

    it("creates book reservations and maintains hold queue", async () => {
      const books = await libraryService.getBooks(adminCtx);
      const book = books[0];
      const members = await libraryService.getMembers(adminCtx);
      const patron = members[2]; // Tariq Hassan

      const res = await libraryService.createReservation(adminCtx, {
        bookId: book.id,
        memberId: patron.id,
      });

      expect(res.id).toBeDefined();
      expect(res.status).toBe("PENDING");
      expect(res.bookTitle).toBe(book.title);
      expect(res.memberNumber).toBe(patron.memberNumber);
    });
  });

  // ===========================================================================
  // MODULE B: TRANSPORT MANAGEMENT
  // ===========================================================================
  describe("Module B: Transport Management", () => {
    it("retrieves transport fleet, routes, and dashboard metrics", async () => {
      const stats = await transportService.getDashboardStats(adminCtx);
      expect(stats.totalVehicles).toBeGreaterThan(0);
      expect(stats.totalRoutes).toBeGreaterThan(0);
      expect(stats.totalFleetCapacity).toBeGreaterThan(0);

      const foreignStats = await transportService.getDashboardStats(foreignTenantCtx);
      expect(foreignStats.totalVehicles).toBe(0);
    });

    it("registers new fleet vehicles with registration number and plate verification", async () => {
      const vehicle = await transportService.createVehicle(adminCtx, {
        registrationNumber: "BUS-05",
        plateNumber: "KDF 991L",
        make: "Mercedes-Benz",
        model: "Sprinter Commuter",
        seatingCapacity: 24,
        fuelType: "DIESEL",
        status: "ACTIVE",
        insurancePolicyNumber: "POL-BR-991283",
      });

      expect(vehicle.id).toBeDefined();
      expect(vehicle.registrationNumber).toBe("BUS-05");
      expect(vehicle.plateNumber).toBe("KDF 991L");
      expect(vehicle.seatingCapacity).toBe(24);

      // Verify uniqueness validation
      await expect(
        transportService.createVehicle(adminCtx, {
          registrationNumber: "BUS-05",
          plateNumber: "KDF 991L",
          make: "Duplicate",
          model: "Bus",
          seatingCapacity: 24,
          fuelType: "DIESEL",
          status: "ACTIVE",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("registers commercial transport drivers with license tracking", async () => {
      const driver = await transportService.createDriver(adminCtx, {
        fullName: "Samuel Mworia",
        phone: "+1 (555) 882-9933",
        licenseNumber: "DL-COMM-99381",
        licenseType: "Commercial Passenger Class A",
        status: "ACTIVE",
        emergencyContact: "Esther Mworia - +1 (555) 882-9934",
      });

      expect(driver.id).toBeDefined();
      expect(driver.fullName).toBe("Samuel Mworia");
      expect(driver.licenseNumber).toBe("DL-COMM-99381");
    });

    it("creates transport routes with sequential stops and timetables", async () => {
      const route = await transportService.createRoute(adminCtx, {
        code: "RT-SOUTH-04",
        name: "South Hills & Green Valley",
        startLocation: "Green Valley Plaza",
        endLocation: "Apex Main Campus",
        totalDistanceKm: 20.5,
        status: "ACTIVE",
        stops: [
          {
            stopName: "Green Valley Central",
            stopOrder: 1,
            morningPickupTime: "06:40",
            afternoonDropoffTime: "16:20",
            landmark: "Plaza Roundabout",
          },
          {
            stopName: "Sunny Ridge Estate",
            stopOrder: 2,
            morningPickupTime: "07:05",
            afternoonDropoffTime: "15:55",
          },
          {
            stopName: "Apex Main Campus Gate",
            stopOrder: 3,
            morningPickupTime: "07:35",
            afternoonDropoffTime: "15:30",
          },
        ],
      });

      expect(route.id).toBeDefined();
      expect(route.code).toBe("RT-SOUTH-04");
      expect(route.stops).toHaveLength(3);
      expect(route.stops[0].morningPickupTime).toBe("06:40");
    });

    it("allocates students to transport routes and assigns seats", async () => {
      const routes = await transportService.getRoutes(adminCtx);
      const targetRoute = routes[0];

      const allocation = await transportService.createAllocation(adminCtx, {
        studentId: "stu-new-rider-01",
        routeId: targetRoute.id,
        pickupStopId: targetRoute.stops[0].id,
        tripType: "ROUND_TRIP",
        seatNumber: "18A",
        feeAmountCents: 45000,
      });

      expect(allocation.id).toBeDefined();
      expect(allocation.routeId).toBe(targetRoute.id);
      expect(allocation.seatNumber).toBe("18A");
      expect(allocation.status).toBe("ACTIVE");
    });

    it("prevents double active allocations for the same student", async () => {
      const routes = await transportService.getRoutes(adminCtx);
      const studentId = "stu-001"; // Already allocated in seed

      await expect(
        transportService.createAllocation(adminCtx, {
          studentId,
          routeId: routes[1].id,
          tripType: "ROUND_TRIP",
          feeAmountCents: 45000,
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ===========================================================================
  // MODULE C: HOSTEL & BOARDING MANAGEMENT
  // ===========================================================================
  describe("Module C: Hostel Management", () => {
    it("retrieves hostel buildings, rooms, and occupancy statistics", async () => {
      const stats = await hostelService.getDashboardStats(adminCtx);
      expect(stats.totalHostels).toBeGreaterThan(0);
      expect(stats.totalBedCapacity).toBeGreaterThan(0);
      expect(stats.occupiedBeds).toBeGreaterThan(0);
      expect(stats.vacantBeds).toBeGreaterThan(0);

      const foreignStats = await hostelService.getDashboardStats(foreignTenantCtx);
      expect(foreignStats.totalHostels).toBe(0);
    });

    it("creates a new hostel building with gender designation and warden assignment", async () => {
      const hostel = await hostelService.createHostel(adminCtx, {
        name: "Bishop Tutu Honors Hall",
        code: "HST-BTH-04",
        type: "BOYS",
        wardenName: "Dr. Clement Vance",
        contactPhone: "+1 (555) 777-1122",
        location: "East Campus Residential Quad",
        description: "Senior scholars residence for sixth-form students.",
      });

      expect(hostel.id).toBeDefined();
      expect(hostel.name).toBe("Bishop Tutu Honors Hall");
      expect(hostel.type).toBe("BOYS");
      expect(hostel.code).toBe("HST-BTH-04");
    });

    it("configures rooms with automatic bed slot generation", async () => {
      const hostels = await hostelService.getHostels(adminCtx);
      const targetHostel = hostels[0];

      const room = await hostelService.createRoom(adminCtx, {
        hostelId: targetHostel.id,
        roomNumber: "305",
        floorNumber: 3,
        blockWing: "North Wing",
        roomType: "DOUBLE",
        capacity: 2,
        monthlyRateCents: 22000,
        termRateCents: 66000,
        amenities: ["Wi-Fi", "Desk"],
      });

      expect(room.id).toBeDefined();
      expect(room.roomNumber).toBe("305");
      expect(room.capacity).toBe(2);
      expect(room.beds).toHaveLength(2);
      expect(room.beds[0].bedNumber).toBe("305-A");
      expect(room.beds[1].bedNumber).toBe("305-B");
      expect(room.beds[0].status).toBe("AVAILABLE");
    });

    it("checks in boarding scholar to an available bed and marks bed occupied", async () => {
      const hostels = await hostelService.getHostels(adminCtx);
      // Find a hostel with an available bed
      let targetHostel: any;
      let targetRoom: any;
      let targetBed: any;

      for (const h of hostels) {
        for (const r of h.rooms) {
          const vacant = r.beds.find((b) => b.status === "AVAILABLE");
          if (vacant) {
            targetHostel = h;
            targetRoom = r;
            targetBed = vacant;
            break;
          }
        }
        if (targetBed) break;
      }

      expect(targetBed).toBeDefined();

      const alloc = await hostelService.createAllocation(adminCtx, {
        studentId: "stu-new-boarder-01",
        hostelId: targetHostel.id,
        roomId: targetRoom.id,
        bedId: targetBed.id,
        feeAmountCents: 22000,
        emergencyContactName: "Mary Jenkins",
        emergencyContactPhone: "+1 (555) 444-2211",
      });

      expect(alloc.id).toBeDefined();
      expect(alloc.bedId).toBe(targetBed.id);
      expect(alloc.status).toBe("ACTIVE");

      // Verify bed is now occupied
      const updatedHostel = await hostelService.getHostelById(adminCtx, targetHostel.id);
      const updatedRoom = updatedHostel.rooms.find((r) => r.id === targetRoom.id);
      const updatedBed = updatedRoom?.beds.find((b) => b.id === targetBed.id);
      expect(updatedBed?.status).toBe("OCCUPIED");
    });

    it("prevents double-booking an already occupied bed", async () => {
      const allocations = await hostelService.getAllocations(adminCtx, { status: "ACTIVE" });
      const activeAlloc = allocations[0];

      await expect(
        hostelService.createAllocation(adminCtx, {
          studentId: "stu-other-student",
          hostelId: activeAlloc.hostelId,
          roomId: activeAlloc.roomId,
          bedId: activeAlloc.bedId,
          feeAmountCents: 22000,
        })
      ).rejects.toThrow(ValidationError);
    });

    it("processes student checkout and frees up the bed for new assignment", async () => {
      const allocations = await hostelService.getAllocations(adminCtx, { status: "ACTIVE" });
      const alloc = allocations[0];

      const checkedOut = await hostelService.checkoutAllocation(adminCtx, {
        allocationId: alloc.id,
        notes: "Student transferred to day scholar",
      });

      expect(checkedOut.status).toBe("CHECKED_OUT");
      expect(checkedOut.checkOutDate).toBeDefined();

      // Verify bed is available again
      const hostel = await hostelService.getHostelById(adminCtx, alloc.hostelId);
      const room = hostel.rooms.find((r) => r.id === alloc.roomId);
      const bed = room?.beds.find((b) => b.id === alloc.bedId);
      expect(bed?.status).toBe("AVAILABLE");
    });

    it("records daily curfew and roll call attendance for residents", async () => {
      const hostels = await hostelService.getHostels(adminCtx);
      const targetHostel = hostels[0];
      const residents = await hostelService.getAllocations(adminCtx, {
        hostelId: targetHostel.id,
        status: "ACTIVE",
      });

      const today = "2026-09-30";
      const records = residents.map((r, i) => ({
        studentId: r.studentId,
        status: i === 0 ? ("PRESENT" as const) : ("LATE" as const),
        checkInTime: i === 0 ? "19:40" : "20:25",
        remarks: i === 0 ? "Present" : "Late from sports training",
      }));

      const saved = await hostelService.recordAttendance(adminCtx, {
        hostelId: targetHostel.id,
        date: today,
        records,
      });

      expect(saved.length).toBe(residents.length);
      expect(saved[0].status).toBe("PRESENT");
      expect(saved[1].status).toBe("LATE");
    });

    it("manages student gate passes and leave permit workflows", async () => {
      const hostels = await hostelService.getHostels(adminCtx);
      const residents = await hostelService.getAllocations(adminCtx, { status: "ACTIVE" });
      const resident = residents[0];

      // Request gate pass
      const pass = await hostelService.createGatePass(adminCtx, {
        studentId: resident.studentId,
        hostelId: resident.hostelId,
        passType: "DAY_OUTING",
        departureDate: "2026-10-01T10:00:00.000Z",
        expectedReturnDate: "2026-10-01T17:00:00.000Z",
        reason: "Visit city ophthalmology specialist",
        destination: "City Eye Clinic, West End",
      });

      expect(pass.id).toBeDefined();
      expect(pass.status).toBe("REQUESTED");
      expect(pass.passNumber).toMatch(/^GP-\d{4}-\d+/);

      // Approve gate pass
      const approved = await hostelService.updateGatePassStatus(adminCtx, {
        passId: pass.id,
        status: "APPROVED",
      });
      expect(approved.status).toBe("APPROVED");
      expect(approved.approvedByName).toBeDefined();

      // Mark student as OUT
      const out = await hostelService.updateGatePassStatus(adminCtx, {
        passId: pass.id,
        status: "OUT",
      });
      expect(out.status).toBe("OUT");

      // Mark student as RETURNED
      const returned = await hostelService.updateGatePassStatus(adminCtx, {
        passId: pass.id,
        status: "RETURNED",
        actualReturnDate: "2026-10-01T16:45:00.000Z",
      });
      expect(returned.status).toBe("RETURNED");
      expect(returned.actualReturnDate).toBeDefined();
    });
  });
});
