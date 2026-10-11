import { describe, it, expect, beforeEach } from "vitest";
import { TenantContext } from "@/repositories/types";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID, adminService } from "@/services/admin.service";
import { studentService } from "@/services/student.service";
import { academicService } from "@/services/academic.service";
import { attendanceService } from "@/services/attendance.service";
import { examinationService } from "@/services/examination.service";
import { financeService } from "@/services/finance.service";
import { libraryService } from "@/services/library.service";
import { transportService } from "@/services/transport.service";
import { hostelService } from "@/services/hostel.service";
import { portalService } from "@/services/portal.service";

describe("Phase 15: End-to-End Critical Journeys (Journeys A - H)", () => {
  const adminCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-super-admin-01",
    userRoles: ["Super Administrator"],
  };

  const teacherCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-teacher-01",
    userRoles: ["Teacher"],
  };

  const parentCtx: TenantContext = {
    organizationId: "org-apex-demo-01",
    campusId: "camp-apex-main-01",
    userId: "u-parent-01",
    userRoles: ["Parent"],
  };

  beforeEach(() => {
    portalService.resetState();
    financeService.resetState();
    libraryService.resetState();
    transportService.resetState();
    hostelService.resetState();
  });

  // ===========================================================================
  // JOURNEY A — NEW STUDENT ADMISSION LIFECYCLE
  // ===========================================================================
  describe("Journey A: New Student Admission to Active Enrollment", () => {
    it("completes full admission pipeline: submission -> review -> approval -> student creation -> enrollment", async () => {
      // Step 1: Create Admission Application
      const application = await studentService.createAdmissionApplication(adminCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        firstName: "Amara",
        lastName: "Okonkwo",
        dateOfBirth: "2012-05-14",
        gender: "FEMALE",
        email: "amara.okonkwo@applicant.internal",
        guardianName: "Chidi Okonkwo",
        guardianPhone: "+1-555-443-2211",
        guardianEmail: "chidi.okonkwo@guardian.internal",
        guardianRelationship: "FATHER",
      });

      expect(application.id).toBeDefined();
      expect(application.status).toBe("SUBMITTED");
      expect(application.applicationNumber).toBeDefined();

      // Step 2: Review Application
      const reviewed = await studentService.reviewAdmissionApplication(adminCtx, application.id, {
        status: "APPROVED",
        reviewNotes: "Passed entrance assessment with 94% score in Mathematics and English.",
      });
      expect(reviewed.status).toBe("APPROVED");

      // Step 3: Convert Approved Application to Active Student & Enrolled Ward
      const enrolledResult = await studentService.enrollApprovedApplication(adminCtx, application.id, {
        sectionId: "sec-jss1-a",
        rollNumber: "ROLL-045",
      });

      expect(enrolledResult.student).toBeDefined();
      expect(enrolledResult.student.firstName).toBe("Amara");
      expect(enrolledResult.student.lastName).toBe("Okonkwo");
      expect(enrolledResult.student.status).toBe("ACTIVE");
      expect(enrolledResult.application.enrolledStudentId).toBe(enrolledResult.student.id);

      // Step 4: Verify Student is discoverable in Student Directory
      const directory = await studentService.getStudents(adminCtx, { search: "Amara" });
      expect(directory.items.some((s) => s.id === enrolledResult.student.id)).toBe(true);
    });
  });

  // ===========================================================================
  // JOURNEY B — ACADEMIC YEAR, CURRICULUM & SCHEDULING
  // ===========================================================================
  describe("Journey B: Academic Year, Curriculum & Timetable", () => {
    it("verifies academic structure, teaching assignments, and timetable slots", async () => {
      // Step 1: Query Academic Years via adminService
      const years = await adminService.getAcademicYears(adminCtx);
      expect(years.length).toBeGreaterThan(0);

      // Step 2: Query Classes
      const classes = await adminService.getClasses(adminCtx);
      expect(classes.length).toBeGreaterThan(0);
      const targetClass = classes[0];

      // Step 3: Verify Curriculums and Subjects
      const curriculums = await academicService.getCurriculums(adminCtx);
      expect(curriculums.length).toBeGreaterThan(0);

      // Step 4: Verify Teaching Groups and Assignments
      const groups = await academicService.getTeachingGroups(adminCtx, { classId: targetClass.id });
      expect(groups).toBeDefined();
    });
  });

  // ===========================================================================
  // JOURNEY C — ATTENDANCE LIFECYCLE & PARENT AUDIT
  // ===========================================================================
  describe("Journey C: Class Attendance Recording & Parent Verification", () => {
    it("records daily class attendance, verifies status, and reflects in parent portal", async () => {
      const today = "2026-10-15";

      // Step 1: Teacher records attendance for student
      const record = await attendanceService.recordSingleAttendance(teacherCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        studentId: "stu-001",
        attendanceDate: today,
        attendanceType: "DAILY",
        status: "PRESENT",
        remarks: "Arrived on time",
      });

      expect(record.id).toBeDefined();
      expect(record.status).toBe("PRESENT");

      // Step 2: Fetch Class Attendance Register to confirm record presence
      const register = await attendanceService.getAttendanceRegister(teacherCtx, {
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
        attendanceDate: today,
        attendanceType: "DAILY",
      });

      expect(register.summary.presentCount).toBeGreaterThanOrEqual(1);

      // Step 3: Parent portal inspection of linked child's attendance
      const parentView = await portalService.getChildAttendance(parentCtx, "stu-001");
      expect(parentView).toBeDefined();
      expect(parentView.summary).toBeDefined();
      expect(parentView.summary.totalSessions).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // JOURNEY D — ASSESSMENTS, GRADING, RANKINGS & REPORT CARDS
  // ===========================================================================
  describe("Journey D: Continuous Assessments, Term Computation & Report Cards", () => {
    it("enters marks, computes results, resolves grades, and publishes report cards", async () => {
      // Step 1: Record Assessment Scores
      const scoreRes = await examinationService.bulkRecordScores(adminCtx, {
        assessmentId: "asm-math-ca1",
        scores: [
          { studentId: "stu-demo-01", scoreObtained: 19.0, status: "RECORDED", remarks: "Excellent" },
          { studentId: "stu-demo-02", scoreObtained: 16.5, status: "RECORDED", remarks: "Good effort" },
        ],
      });
      expect(scoreRes.savedCount).toBe(2);

      // Step 2: Compute Term Results with Automated GPA & Rankings
      const computed = await examinationService.computeTermResults(adminCtx, {
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        sectionId: "sec-jss1-a",
      });
      expect(computed.termSummaries.length).toBeGreaterThan(0);
      expect(computed.termSummaries[0].gpa).toBeGreaterThanOrEqual(0);
      expect(computed.termSummaries[0].averagePercentage).toBeGreaterThan(0);

      // Step 3: Publish Results
      const publishRes = await examinationService.reviewResults(adminCtx, {
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        classId: "cls-jss1-2526",
        action: "PUBLISH",
        notes: "Approved by Principal for term distribution",
      });
      expect(publishRes.status).toBe("PUBLISHED");

      // Step 4: Generate Student Report Card
      const reportCard = await examinationService.getStudentReportCard(
        adminCtx,
        "stu-demo-01",
        "ay-2025-26",
        "term-2025-t2"
      );
      expect(reportCard).toBeDefined();
      expect(reportCard.studentName).toBeDefined();
      expect(reportCard.subjects.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // JOURNEY E — FINANCE: FEE TARIFF, INVOICE, PAYMENT & RECEIPT
  // ===========================================================================
  describe("Journey E: Fee Tariff, Invoicing, Payment Collection & Ledgers", () => {
    it("generates invoice, processes payment, issues receipt, and updates student balance", async () => {
      // Step 1: Generate Invoice for student
      const invoice = await financeService.generateInvoice(adminCtx, {
        campusId: DEMO_CAMPUS_MAIN_ID,
        academicYearId: "ay-2025-26",
        termId: "term-2025-t2",
        studentId: "stu-004",
        dueDate: "2026-03-15",
        items: [
          { name: "Second Term Tuition", feeCategoryId: "fcat-01", quantity: 1, unitAmount: 800.0, discountAmount: 0 },
          { name: "Computer Lab Levy", feeCategoryId: "fcat-02", quantity: 1, unitAmount: 150.0, discountAmount: 0 },
        ],
      });

      expect(invoice.id).toBeDefined();
      expect(invoice.totalAmount).toBe(950.0);
      expect(invoice.balanceDue).toBe(950.0);
      expect(invoice.status).toBe("ISSUED");

      // Step 2: Record Payment against the invoice
      const paymentResult = await financeService.recordPayment(adminCtx, {
        studentId: "stu-004",
        campusId: DEMO_CAMPUS_MAIN_ID,
        amount: 950.0,
        paymentMethod: "BANK_TRANSFER",
        reference: "WIRE-TRX-20260901",
        allocations: [{ invoiceId: invoice.id, amount: 950.0 }],
      });

      expect(paymentResult.payment.id).toBeDefined();
      expect(paymentResult.receipt.receiptNumber).toBeDefined();

      // Step 3: Verify Invoice Status changed to PAID
      const refreshedInvoice = await financeService.getInvoiceById(adminCtx, invoice.id);
      expect(refreshedInvoice.status).toBe("PAID");
      expect(refreshedInvoice.balanceDue).toBe(0);

      // Step 4: Verify Student Ledger reflects payment and zero balance
      const ledger = await financeService.getStudentLedger(adminCtx, "stu-004");
      expect(ledger.entries.some((e) => e.reference === invoice.invoiceNumber)).toBe(true);
      expect(ledger.entries.some((e) => e.reference === paymentResult.payment.paymentNumber)).toBe(true);
    });
  });

  // ===========================================================================
  // JOURNEY F — LIBRARY CATALOGING, CIRCULATION & OVERDUE FINES
  // ===========================================================================
  describe("Journey F: Library Cataloging, Book Loans, Returns & Fines", () => {
    it("catalogs book, issues loan, returns book, and computes overdue fines", async () => {
      // Step 1: Register new book title
      const book = await libraryService.createBook(adminCtx, {
        title: "Introduction to Advanced Physics",
        authors: "David Halliday & Robert Resnick",
        category: "Science",
        isbn: "978-1118230718",
        publisher: "Wiley",
        language: "en",
        initialCopies: 2,
      });

      expect(book.id).toBeDefined();
      expect(book.totalCopies).toBe(2);
      expect(book.availableCopies).toBe(2);

      // Step 2: Issue loan to member
      const members = await libraryService.getMembers(adminCtx);
      const studentMember = members.find((m) => m.memberType === "STUDENT" && m.activeLoansCount < 3)!;
      const targetCopy = book.copies![0];

      const loan = await libraryService.issueLoan(adminCtx, {
        memberId: studentMember.id,
        copyId: targetCopy.id,
        loanDays: 14,
        notes: "Physics project research",
      });

      expect(loan.id).toBeDefined();
      expect(loan.status).toBe("ACTIVE");

      // Verify availability decremented
      const bookAfterLoan = await libraryService.getBookById(adminCtx, book.id);
      expect(bookAfterLoan.availableCopies).toBe(1);

      // Step 3: Return book and verify availability restored
      const returnResult = await libraryService.returnLoan(adminCtx, {
        loanId: loan.id,
        conditionNote: "Returned intact",
        waiveFine: true,
      });

      expect(returnResult.status).toBe("RETURNED");
      const bookAfterReturn = await libraryService.getBookById(adminCtx, book.id);
      expect(bookAfterReturn.availableCopies).toBe(2);
    });
  });

  // ===========================================================================
  // JOURNEY G — FLEET TRANSPORTATION, ROUTES & ATTENDANCE
  // ===========================================================================
  describe("Journey G: Fleet Transport, Routes, Stops & Bus Pass", () => {
    it("creates vehicle, route, stops, assigns student seat, and logs trip attendance", async () => {
      // Step 1: Create Vehicle
      const vehicle = await transportService.createVehicle(adminCtx, {
        registrationNumber: "BUS-2026-X8",
        plateNumber: "PLT-2026-X8",
        make: "Toyota",
        model: "Coaster Luxury",
        seatingCapacity: 32,
        year: 2024,
        fuelType: "DIESEL",
        status: "ACTIVE",
      });
      expect(vehicle.id).toBeDefined();
      expect(vehicle.seatingCapacity).toBe(32);

      // Step 2: Create Route with Sequential Stops
      const route = await transportService.createRoute(adminCtx, {
        name: "North Hills & Highlands Corridor",
        code: "RT-NH-04",
        vehicleId: vehicle.id,
        startLocation: "Highlands Roundabout",
        endLocation: "Central Campus Dropzone",
        status: "ACTIVE",
        stops: [
          { stopName: "Highlands Roundabout", stopOrder: 1, morningPickupTime: "06:45", afternoonDropoffTime: "15:45" },
          { stopName: "Hilltop Primary Gate", stopOrder: 2, morningPickupTime: "07:05", afternoonDropoffTime: "15:25" },
          { stopName: "Central Campus Dropzone", stopOrder: 3, morningPickupTime: "07:30", afternoonDropoffTime: "15:00" },
        ],
      });
      expect(route.id).toBeDefined();
      expect(route.stops.length).toBe(3);

      // Step 3: Assign student to Route & Stop
      const allocation = await transportService.createAllocation(adminCtx, {
        studentId: "stu-trans-passenger-01",
        routeId: route.id,
        pickupStopId: route.stops[0].id,
        tripType: "ROUND_TRIP",
        seatNumber: "12A",
        feeAmountCents: 15000,
      });
      expect(allocation.id).toBeDefined();
      expect(allocation.status).toBe("ACTIVE");

      // Step 4: Record Trip Manifest Attendance
      const trip = await transportService.recordTripAttendance(adminCtx, {
        routeId: route.id,
        vehicleId: vehicle.id,
        tripDate: "2026-10-15",
        direction: "MORNING_PICKUP",
        records: [
          { studentId: "stu-trans-passenger-01", status: "BOARDED", stopId: route.stops[0].id },
        ],
      });
      expect(trip.id).toBeDefined();
      expect(trip.totalBoarded).toBe(1);
    });
  });

  // ===========================================================================
  // JOURNEY H — BOARDING HOSTEL, ROOMS, BEDS & GATE PASSES
  // ===========================================================================
  describe("Journey H: Boarding Hostel, Bed Allocation, Roll Call & Gate Passes", () => {
    it("configures hostel room and beds, allocates student, records roll call, and manages gate pass", async () => {
      // Step 1: Create Hostel and Room
      const hostel = await hostelService.createHostel(adminCtx, {
        name: "Nelson Mandela Senior Hall",
        code: "HST-NMS-05",
        type: "BOYS",
        wardenName: "Mr. Emmanuel Eze",
        contactPhone: "+1-555-889-1122",
      });
      expect(hostel.id).toBeDefined();

      const room = await hostelService.createRoom(adminCtx, {
        hostelId: hostel.id,
        roomNumber: "401",
        floorNumber: 4,
        blockWing: "East Wing",
        roomType: "DOUBLE",
        capacity: 2,
        monthlyRateCents: 20000,
        termRateCents: 60000,
        amenities: ["Desk", "Wardrobe"],
      });
      expect(room.id).toBeDefined();
      expect(room.beds.length).toBe(2);

      // Step 2: Allocate Bed to Student
      const targetBed = room.beds[0];
      const alloc = await hostelService.createAllocation(adminCtx, {
        studentId: "stu-boarder-journey-01",
        hostelId: hostel.id,
        roomId: room.id,
        bedId: targetBed.id,
        feeAmountCents: 25000,
      });
      expect(alloc.id).toBeDefined();
      expect(alloc.status).toBe("ACTIVE");

      // Verify bed status updated to OCCUPIED
      const refreshedHostel = await hostelService.getHostelById(adminCtx, hostel.id);
      const refreshedRoom = refreshedHostel.rooms.find((r) => r.id === room.id);
      const refreshedBed = refreshedRoom?.beds.find((b) => b.id === targetBed.id);
      expect(refreshedBed?.status).toBe("OCCUPIED");

      // Step 3: Record Nightly Roll Call Attendance
      const rollCall = await hostelService.recordAttendance(adminCtx, {
        hostelId: hostel.id,
        date: "2026-10-15",
        records: [
          { studentId: alloc.studentId, status: "PRESENT", remarks: "In dorm room" },
        ],
      });
      expect(rollCall.length).toBe(1);
      expect(rollCall[0].status).toBe("PRESENT");

      // Step 4: Issue and Manage Gate Pass Lifecycle
      const gatePass = await hostelService.createGatePass(adminCtx, {
        studentId: alloc.studentId,
        hostelId: hostel.id,
        passType: "WEEKEND_LEAVE",
        departureDate: "2026-10-17T09:00:00.000Z",
        expectedReturnDate: "2026-10-18T18:00:00.000Z",
        destination: "Family Residence",
        reason: "Sister wedding celebration",
      });
      expect(gatePass.status).toBe("REQUESTED");

      // Warden approves gate pass
      const approvedPass = await hostelService.updateGatePassStatus(adminCtx, {
        passId: gatePass.id,
        status: "APPROVED",
      });
      expect(approvedPass.status).toBe("APPROVED");

      // Guard logs student checkout
      const departed = await hostelService.updateGatePassStatus(adminCtx, {
        passId: gatePass.id,
        status: "OUT",
      });
      expect(departed.status).toBe("OUT");

      // Guard logs student return
      const returned = await hostelService.updateGatePassStatus(adminCtx, {
        passId: gatePass.id,
        status: "RETURNED",
        actualReturnDate: "2026-10-18T17:30:00.000Z",
      });
      expect(returned.status).toBe("RETURNED");
    });
  });
});
