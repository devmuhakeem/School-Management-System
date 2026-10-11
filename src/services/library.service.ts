import { prisma } from "@/lib/db";
import { TenantContext } from "@/repositories/types";
import {
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { auditRepository } from "@/repositories/audit.repository";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "./admin.service";
import {
  CreateBookInput,
  UpdateBookInput,
  CreateBookCopyInput,
  CreateLibraryBranchInput,
  RegisterLibraryMemberInput,
  IssueBookLoanInput,
  ReturnBookLoanInput,
  RenewBookLoanInput,
  CreateBookReservationInput,
  CollectFineInput,
  WaiveFineInput,
  UpdateLibrarySettingInput,
} from "@/lib/validations/library";

// =============================================================================
// DOMAIN INTERFACES
// =============================================================================

export interface LibrarySettingRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  maxActiveLoansStudent: number;
  maxActiveLoansStaff: number;
  defaultLoanDaysStudent: number;
  defaultLoanDaysStaff: number;
  maxRenewalsAllowed: number;
  finePerDayCents: number;
  gracePeriodDays: number;
  reservationExpiryDays: number;
}

export interface LibraryBranchRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  name: string;
  code: string;
  location?: string | null;
  description?: string | null;
  status: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  openingHours?: string | null;
  totalBooks?: number;
  totalCopies?: number;
}

export interface BookCopyRecord {
  id: string;
  bookId: string;
  barcode: string;
  copyNumber: number;
  branchId?: string | null;
  branchName?: string;
  status: "AVAILABLE" | "BORROWED" | "RESERVED" | "LOST" | "DAMAGED" | "MAINTENANCE";
  conditionNote?: string | null;
  acquiredDate: string;
  costCents?: number | null;
}

export interface BookRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  branchId?: string | null;
  branchName?: string;
  title: string;
  subtitle?: string | null;
  isbn?: string | null;
  isbn13?: string | null;
  authors: string;
  publisher?: string | null;
  publicationYear?: number | null;
  edition?: string | null;
  category: string;
  language: string;
  callNumber?: string | null;
  deweyDecimal?: string | null;
  totalCopies: number;
  availableCopies: number;
  shelfLocation?: string | null;
  coverImageUrl?: string | null;
  description?: string | null;
  status: string;
  createdAt: string;
  copies?: BookCopyRecord[];
}

export interface LibraryMemberRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  memberNumber: string;
  memberType: "STUDENT" | "STAFF";
  userId?: string | null;
  studentId?: string | null;
  staffId?: string | null;
  memberName: string;
  memberEmail?: string;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  joinDate: string;
  expiryDate?: string | null;
  activeLoansCount: number;
  totalFinesUnpaidCents: number;
}

export interface BookLoanRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  bookId: string;
  bookTitle: string;
  copyId: string;
  barcode: string;
  memberId: string;
  memberName: string;
  memberNumber: string;
  memberType: "STUDENT" | "STAFF";
  checkoutDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: "ACTIVE" | "RETURNED" | "OVERDUE" | "LOST" | "CLAIMED_RETURNED";
  renewalCount: number;
  fineAmountCents: number;
  finePaidCents: number;
  notes?: string | null;
}

export interface BookReservationRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  bookId: string;
  bookTitle: string;
  memberId: string;
  memberName: string;
  memberNumber: string;
  reservedAt: string;
  expiresAt: string;
  status: "PENDING" | "READY_FOR_PICKUP" | "FULFILLED" | "CANCELLED" | "EXPIRED";
  notifiedAt?: string | null;
}

export interface LibraryDashboardStats {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  activeLoans: number;
  overdueLoans: number;
  totalMembers: number;
  totalFinesUnpaidCents: number;
  pendingReservations: number;
  popularCategories: Array<{ category: string; count: number }>;
  recentLoans: BookLoanRecord[];
}

// =============================================================================
// IN-MEMORY RESILIENT SEED STATE
// =============================================================================

interface InMemoryLibraryState {
  settings: LibrarySettingRecord[];
  branches: LibraryBranchRecord[];
  books: BookRecord[];
  copies: BookCopyRecord[];
  members: LibraryMemberRecord[];
  loans: BookLoanRecord[];
  reservations: BookReservationRecord[];
}

function initializeLibraryState(): InMemoryLibraryState {
  const branches: LibraryBranchRecord[] = [
    {
      id: "lib-branch-main",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      name: "Main Campus Central Library",
      code: "LIB-MAIN",
      location: "Academic Block A, 2nd Floor",
      description: "Primary institution library housing general sciences, literature, history, and periodicals.",
      status: "ACTIVE",
      contactEmail: "library@apex-demo.internal",
      contactPhone: "+1 (555) 234-8800",
      openingHours: "Mon-Fri: 07:30 - 18:00, Sat: 09:00 - 13:00",
      totalBooks: 6,
      totalCopies: 14,
    },
    {
      id: "lib-branch-sci",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      name: "STEM & Science Research Wing",
      code: "LIB-STEM",
      location: "Science Complex, Ground Floor",
      description: "Specialized collection of advanced physics, chemistry, biology, and computer science textbooks.",
      status: "ACTIVE",
      contactEmail: "stem-library@apex-demo.internal",
      contactPhone: "+1 (555) 234-8802",
      openingHours: "Mon-Fri: 08:00 - 17:00",
      totalBooks: 4,
      totalCopies: 10,
    },
  ];

  const settings: LibrarySettingRecord[] = [
    {
      id: "lib-set-01",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      maxActiveLoansStudent: 3,
      maxActiveLoansStaff: 10,
      defaultLoanDaysStudent: 14,
      defaultLoanDaysStaff: 30,
      maxRenewalsAllowed: 2,
      finePerDayCents: 50, // $0.50 per day
      gracePeriodDays: 1,
      reservationExpiryDays: 3,
    },
  ];

  const books: BookRecord[] = [
    {
      id: "book-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      branchId: "lib-branch-main",
      branchName: "Main Campus Central Library",
      title: "University Physics with Modern Physics",
      subtitle: "15th Global Edition",
      isbn: "978-0135159552",
      isbn13: "9780135159552",
      authors: "Hugh D. Young, Roger A. Freedman",
      publisher: "Pearson Education",
      publicationYear: 2020,
      edition: "15th",
      category: "Science",
      language: "English",
      callNumber: "530 YOU 2020",
      deweyDecimal: "530.1",
      totalCopies: 4,
      availableCopies: 2,
      shelfLocation: "Aisle 3, Shelf B2",
      description: "Standard foundational physics reference covering mechanics, thermodynamics, electromagnetism, and optics.",
      status: "ACTIVE",
      createdAt: "2025-01-10T08:00:00.000Z",
    },
    {
      id: "book-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      branchId: "lib-branch-main",
      branchName: "Main Campus Central Library",
      title: "To Kill a Mockingbird",
      subtitle: "50th Anniversary Critical Edition",
      isbn: "978-0061120084",
      authors: "Harper Lee",
      publisher: "Harper Perennial Modern Classics",
      publicationYear: 2006,
      edition: "Anniversary Edition",
      category: "Literature",
      language: "English",
      callNumber: "813.54 LEE",
      deweyDecimal: "813.54",
      totalCopies: 3,
      availableCopies: 2,
      shelfLocation: "Fiction Wing, Shelf F4",
      description: "Pulitzer Prize-winning masterpiece exploring racial injustice and morality in the American South.",
      status: "ACTIVE",
      createdAt: "2025-01-11T09:00:00.000Z",
    },
    {
      id: "book-003",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      branchId: "lib-branch-sci",
      branchName: "STEM & Science Research Wing",
      title: "Introduction to Algorithms",
      subtitle: "Fourth Edition (CLRS)",
      isbn: "978-0262046305",
      authors: "Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein",
      publisher: "The MIT Press",
      publicationYear: 2022,
      edition: "4th Edition",
      category: "Computer Science",
      language: "English",
      callNumber: "005.1 COR 2022",
      deweyDecimal: "005.1",
      totalCopies: 3,
      availableCopies: 2,
      shelfLocation: "CompSci Bay 1, Shelf C1",
      description: "Comprehensive textbook on contemporary computer algorithm design and complexity analysis.",
      status: "ACTIVE",
      createdAt: "2025-01-15T10:00:00.000Z",
    },
    {
      id: "book-004",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      branchId: "lib-branch-main",
      branchName: "Main Campus Central Library",
      title: "Campbell Biology",
      subtitle: "12th Standard Edition",
      isbn: "978-0135188743",
      authors: "Lisa A. Urry, Michael L. Cain, Steven A. Wasserman",
      publisher: "Pearson",
      publicationYear: 2021,
      edition: "12th Edition",
      category: "Science",
      language: "English",
      callNumber: "570 URR 2021",
      deweyDecimal: "570",
      totalCopies: 3,
      availableCopies: 3,
      shelfLocation: "Aisle 4, Shelf A1",
      description: "World leader in introductory college biology covering cellular biology, genetics, and ecology.",
      status: "ACTIVE",
      createdAt: "2025-01-20T11:00:00.000Z",
    },
    {
      id: "book-005",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      branchId: "lib-branch-main",
      branchName: "Main Campus Central Library",
      title: "Things Fall Apart",
      subtitle: "The African Trilogy, Book 1",
      isbn: "978-0385474542",
      authors: "Chinua Achebe",
      publisher: "Anchor Books",
      publicationYear: 1994,
      edition: "Modern Classic",
      category: "Literature",
      language: "English",
      callNumber: "823.914 ACH",
      deweyDecimal: "823.914",
      totalCopies: 4,
      availableCopies: 3,
      shelfLocation: "African Literature, Shelf A3",
      description: "Post-colonial milestone depicting pre-colonial life in southeastern Nigeria and British colonial invasion.",
      status: "ACTIVE",
      createdAt: "2025-01-22T08:30:00.000Z",
    },
    {
      id: "book-006",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      branchId: "lib-branch-main",
      branchName: "Main Campus Central Library",
      title: "Calculus: Early Transcendentals",
      subtitle: "9th Edition",
      isbn: "978-1337613927",
      authors: "James Stewart, Daniel K. Clegg, Saleem Watson",
      publisher: "Cengage Learning",
      publicationYear: 2020,
      edition: "9th Edition",
      category: "Mathematics",
      language: "English",
      callNumber: "515 STE 2020",
      deweyDecimal: "515",
      totalCopies: 3,
      availableCopies: 2,
      shelfLocation: "Math Bay 2, Shelf M3",
      description: "Rigorous mathematical treatment of single and multivariable differential and integral calculus.",
      status: "ACTIVE",
      createdAt: "2025-01-25T14:00:00.000Z",
    },
  ];

  const copies: BookCopyRecord[] = [
    // Book 001 copies
    { id: "copy-001-1", bookId: "book-001", barcode: "LIB-BC-00101", copyNumber: 1, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-10T08:00:00.000Z", costCents: 8500 },
    { id: "copy-001-2", bookId: "book-001", barcode: "LIB-BC-00102", copyNumber: 2, branchId: "lib-branch-main", status: "BORROWED", acquiredDate: "2025-01-10T08:00:00.000Z", costCents: 8500 },
    { id: "copy-001-3", bookId: "book-001", barcode: "LIB-BC-00103", copyNumber: 3, branchId: "lib-branch-main", status: "BORROWED", acquiredDate: "2025-01-10T08:00:00.000Z", costCents: 8500 },
    { id: "copy-001-4", bookId: "book-001", barcode: "LIB-BC-00104", copyNumber: 4, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-10T08:00:00.000Z", costCents: 8500 },

    // Book 002 copies
    { id: "copy-002-1", bookId: "book-002", barcode: "LIB-BC-00201", copyNumber: 1, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-11T09:00:00.000Z", costCents: 1500 },
    { id: "copy-002-2", bookId: "book-002", barcode: "LIB-BC-00202", copyNumber: 2, branchId: "lib-branch-main", status: "BORROWED", acquiredDate: "2025-01-11T09:00:00.000Z", costCents: 1500 },
    { id: "copy-002-3", bookId: "book-002", barcode: "LIB-BC-00203", copyNumber: 3, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-11T09:00:00.000Z", costCents: 1500 },

    // Book 003 copies
    { id: "copy-003-1", bookId: "book-003", barcode: "LIB-BC-00301", copyNumber: 1, branchId: "lib-branch-sci", status: "AVAILABLE", acquiredDate: "2025-01-15T10:00:00.000Z", costCents: 9500 },
    { id: "copy-003-2", bookId: "book-003", barcode: "LIB-BC-00302", copyNumber: 2, branchId: "lib-branch-sci", status: "BORROWED", acquiredDate: "2025-01-15T10:00:00.000Z", costCents: 9500 },
    { id: "copy-003-3", bookId: "book-003", barcode: "LIB-BC-00303", copyNumber: 3, branchId: "lib-branch-sci", status: "AVAILABLE", acquiredDate: "2025-01-15T10:00:00.000Z", costCents: 9500 },

    // Book 004 copies
    { id: "copy-004-1", bookId: "book-004", barcode: "LIB-BC-00401", copyNumber: 1, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-20T11:00:00.000Z", costCents: 8900 },
    { id: "copy-004-2", bookId: "book-004", barcode: "LIB-BC-00402", copyNumber: 2, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-20T11:00:00.000Z", costCents: 8900 },
    { id: "copy-004-3", bookId: "book-004", barcode: "LIB-BC-00403", copyNumber: 3, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-20T11:00:00.000Z", costCents: 8900 },

    // Book 005 copies
    { id: "copy-005-1", bookId: "book-005", barcode: "LIB-BC-00501", copyNumber: 1, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-22T08:30:00.000Z", costCents: 1400 },
    { id: "copy-005-2", bookId: "book-005", barcode: "LIB-BC-00502", copyNumber: 2, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-22T08:30:00.000Z", costCents: 1400 },
    { id: "copy-005-3", bookId: "book-005", barcode: "LIB-BC-00503", copyNumber: 3, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-22T08:30:00.000Z", costCents: 1400 },
    { id: "copy-005-4", bookId: "book-005", barcode: "LIB-BC-00504", copyNumber: 4, branchId: "lib-branch-main", status: "BORROWED", acquiredDate: "2025-01-22T08:30:00.000Z", costCents: 1400 },

    // Book 006 copies
    { id: "copy-006-1", bookId: "book-006", barcode: "LIB-BC-00601", copyNumber: 1, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-25T14:00:00.000Z", costCents: 7800 },
    { id: "copy-006-2", bookId: "book-006", barcode: "LIB-BC-00602", copyNumber: 2, branchId: "lib-branch-main", status: "AVAILABLE", acquiredDate: "2025-01-25T14:00:00.000Z", costCents: 7800 },
    { id: "copy-006-3", bookId: "book-006", barcode: "LIB-BC-00603", copyNumber: 3, branchId: "lib-branch-main", status: "BORROWED", acquiredDate: "2025-01-25T14:00:00.000Z", costCents: 7800 },
  ];

  const members: LibraryMemberRecord[] = [
    {
      id: "mem-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      memberNumber: "LIB-M-001",
      memberType: "STUDENT",
      studentId: "stu-001",
      userId: "u-student-01",
      memberName: "Lucas Wright",
      memberEmail: "student@apex-demo.internal",
      status: "ACTIVE",
      joinDate: "2024-09-01T08:00:00.000Z",
      expiryDate: "2026-08-31T23:59:59.000Z",
      activeLoansCount: 2,
      totalFinesUnpaidCents: 150, // $1.50 overdue fine
    },
    {
      id: "mem-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      memberNumber: "LIB-M-002",
      memberType: "STUDENT",
      studentId: "stu-002",
      memberName: "Maya Wright",
      memberEmail: "maya.wright@apex-demo.internal",
      status: "ACTIVE",
      joinDate: "2024-09-01T08:00:00.000Z",
      expiryDate: "2026-08-31T23:59:59.000Z",
      activeLoansCount: 1,
      totalFinesUnpaidCents: 0,
    },
    {
      id: "mem-003",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      memberNumber: "LIB-M-003",
      memberType: "STUDENT",
      studentId: "stu-003",
      memberName: "Tariq Hassan",
      memberEmail: "tariq.h@apex-demo.internal",
      status: "ACTIVE",
      joinDate: "2024-09-01T08:00:00.000Z",
      expiryDate: "2026-08-31T23:59:59.000Z",
      activeLoansCount: 1,
      totalFinesUnpaidCents: 0,
    },
    {
      id: "mem-004",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      memberNumber: "LIB-M-STAFF-01",
      memberType: "STAFF",
      userId: "u-teacher-01",
      memberName: "Marcus Brody",
      memberEmail: "teacher@apex-demo.internal",
      status: "ACTIVE",
      joinDate: "2024-08-15T08:00:00.000Z",
      expiryDate: "2027-08-31T23:59:59.000Z",
      activeLoansCount: 1,
      totalFinesUnpaidCents: 0,
    },
  ];

  const loans: BookLoanRecord[] = [
    {
      id: "loan-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      bookId: "book-001",
      bookTitle: "University Physics with Modern Physics",
      copyId: "copy-001-2",
      barcode: "LIB-BC-00102",
      memberId: "mem-001",
      memberName: "Lucas Wright",
      memberNumber: "LIB-M-001",
      memberType: "STUDENT",
      checkoutDate: "2026-09-10T10:00:00.000Z",
      dueDate: "2026-09-24T17:00:00.000Z", // Past due -> Overdue!
      status: "OVERDUE",
      renewalCount: 0,
      fineAmountCents: 150,
      finePaidCents: 0,
      notes: "Physics coursework preparation",
    },
    {
      id: "loan-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      bookId: "book-002",
      bookTitle: "To Kill a Mockingbird",
      copyId: "copy-002-2",
      barcode: "LIB-BC-00202",
      memberId: "mem-001",
      memberName: "Lucas Wright",
      memberNumber: "LIB-M-001",
      memberType: "STUDENT",
      checkoutDate: "2026-09-22T14:30:00.000Z",
      dueDate: "2026-10-06T17:00:00.000Z",
      status: "ACTIVE",
      renewalCount: 0,
      fineAmountCents: 0,
      finePaidCents: 0,
      notes: "English literature reading list",
    },
    {
      id: "loan-003",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      bookId: "book-003",
      bookTitle: "Introduction to Algorithms",
      copyId: "copy-003-2",
      barcode: "LIB-BC-00302",
      memberId: "mem-002",
      memberName: "Maya Wright",
      memberNumber: "LIB-M-002",
      memberType: "STUDENT",
      checkoutDate: "2026-09-20T11:00:00.000Z",
      dueDate: "2026-10-04T17:00:00.000Z",
      status: "ACTIVE",
      renewalCount: 0,
      fineAmountCents: 0,
      finePaidCents: 0,
    },
    {
      id: "loan-004",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      bookId: "book-005",
      bookTitle: "Things Fall Apart",
      copyId: "copy-005-4",
      barcode: "LIB-BC-00504",
      memberId: "mem-003",
      memberName: "Tariq Hassan",
      memberNumber: "LIB-M-003",
      memberType: "STUDENT",
      checkoutDate: "2026-09-25T16:00:00.000Z",
      dueDate: "2026-10-09T17:00:00.000Z",
      status: "ACTIVE",
      renewalCount: 0,
      fineAmountCents: 0,
      finePaidCents: 0,
    },
    {
      id: "loan-005",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      bookId: "book-006",
      bookTitle: "Calculus: Early Transcendentals",
      copyId: "copy-006-3",
      barcode: "LIB-BC-00603",
      memberId: "mem-004",
      memberName: "Marcus Brody",
      memberNumber: "LIB-M-STAFF-01",
      memberType: "STAFF",
      checkoutDate: "2026-09-01T09:00:00.000Z",
      dueDate: "2026-10-01T17:00:00.000Z",
      status: "ACTIVE",
      renewalCount: 1,
      fineAmountCents: 0,
      finePaidCents: 0,
    },
    {
      id: "loan-006",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      bookId: "book-001",
      bookTitle: "University Physics with Modern Physics",
      copyId: "copy-001-3",
      barcode: "LIB-BC-00103",
      memberId: "mem-003",
      memberName: "Tariq Hassan",
      memberNumber: "LIB-M-003",
      memberType: "STUDENT",
      checkoutDate: "2026-08-15T10:00:00.000Z",
      dueDate: "2026-08-29T17:00:00.000Z",
      returnDate: "2026-08-28T14:20:00.000Z",
      status: "RETURNED",
      renewalCount: 0,
      fineAmountCents: 0,
      finePaidCents: 0,
    },
  ];

  const reservations: BookReservationRecord[] = [
    {
      id: "res-001",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      bookId: "book-001",
      bookTitle: "University Physics with Modern Physics",
      memberId: "mem-002",
      memberName: "Maya Wright",
      memberNumber: "LIB-M-002",
      reservedAt: "2026-09-26T12:00:00.000Z",
      expiresAt: "2026-09-29T12:00:00.000Z",
      status: "PENDING",
    },
  ];

  return { settings, branches, books, copies, members, loans, reservations };
}

let libraryState = initializeLibraryState();

// =============================================================================
// LIBRARY SERVICE CLASS
// =============================================================================

export class LibraryService {
  /**
   * Resets memory state (used in testing)
   */
  resetState(): void {
    libraryState = initializeLibraryState();
  }

  // ---------------------------------------------------------------------------
  // Settings & Branches
  // ---------------------------------------------------------------------------

  async getSettings(ctx: TenantContext): Promise<LibrarySettingRecord> {
    const setting = libraryState.settings.find((s) => s.organizationId === ctx.organizationId);
    if (!setting) {
      const defaultSetting: LibrarySettingRecord = {
        id: `lib-set-${Date.now()}`,
        organizationId: ctx.organizationId,
        campusId: ctx.campusId || null,
        maxActiveLoansStudent: 3,
        maxActiveLoansStaff: 10,
        defaultLoanDaysStudent: 14,
        defaultLoanDaysStaff: 30,
        maxRenewalsAllowed: 2,
        finePerDayCents: 50,
        gracePeriodDays: 1,
        reservationExpiryDays: 3,
      };
      libraryState.settings.push(defaultSetting);
      return defaultSetting;
    }
    return setting;
  }

  async updateSettings(ctx: TenantContext, input: UpdateLibrarySettingInput): Promise<LibrarySettingRecord> {
    const setting = await this.getSettings(ctx);
    Object.assign(setting, {
      ...input,
      updatedAt: new Date().toISOString(),
    });

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "LibrarySetting",
      entityId: setting.id,
      details: { updatedSettings: input },
    });

    return setting;
  }

  async getBranches(ctx: TenantContext): Promise<LibraryBranchRecord[]> {
    return libraryState.branches.filter((b) => b.organizationId === ctx.organizationId);
  }

  async createBranch(ctx: TenantContext, input: CreateLibraryBranchInput): Promise<LibraryBranchRecord> {
    const existing = libraryState.branches.find(
      (b) => b.organizationId === ctx.organizationId && b.code.toUpperCase() === input.code.toUpperCase()
    );
    if (existing) {
      throw new ValidationError(`A library branch with code "${input.code}" already exists.`);
    }

    const branch: LibraryBranchRecord = {
      id: `lib-branch-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId: input.campusId || ctx.campusId || null,
      name: input.name,
      code: input.code.toUpperCase(),
      location: input.location || null,
      description: input.description || null,
      status: "ACTIVE",
      contactEmail: input.contactEmail || null,
      contactPhone: input.contactPhone || null,
      openingHours: input.openingHours || null,
      totalBooks: 0,
      totalCopies: 0,
    };

    libraryState.branches.push(branch);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "LibraryBranch",
      entityId: branch.id,
      details: { branchName: branch.name, code: branch.code },
    });

    return branch;
  }

  // ---------------------------------------------------------------------------
  // Book Catalog & Copies
  // ---------------------------------------------------------------------------

  async getBooks(
    ctx: TenantContext,
    params?: { category?: string; search?: string; branchId?: string }
  ): Promise<BookRecord[]> {
    let result = libraryState.books.filter((b) => b.organizationId === ctx.organizationId);

    if (params?.category) {
      result = result.filter((b) => b.category.toLowerCase() === params.category!.toLowerCase());
    }

    if (params?.branchId) {
      result = result.filter((b) => b.branchId === params.branchId);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.authors.toLowerCase().includes(q) ||
          (b.isbn && b.isbn.toLowerCase().includes(q)) ||
          (b.callNumber && b.callNumber.toLowerCase().includes(q))
      );
    }

    // Attach copies
    return result.map((book) => {
      const bookCopies = libraryState.copies.filter((c) => c.bookId === book.id);
      return {
        ...book,
        copies: bookCopies,
      };
    });
  }

  async getBookById(ctx: TenantContext, bookId: string): Promise<BookRecord> {
    const book = libraryState.books.find(
      (b) => b.id === bookId && b.organizationId === ctx.organizationId
    );
    if (!book) {
      throw new NotFoundError(`Book with identifier "${bookId}" was not found.`);
    }

    const copies = libraryState.copies.filter((c) => c.bookId === book.id);
    return {
      ...book,
      copies,
    };
  }

  async createBook(ctx: TenantContext, input: CreateBookInput): Promise<BookRecord> {
    if (input.isbn) {
      const existing = libraryState.books.find(
        (b) => b.organizationId === ctx.organizationId && b.isbn === input.isbn
      );
      if (existing) {
        throw new ValidationError(`Book with ISBN "${input.isbn}" already exists in the catalog.`);
      }
    }

    const branch = input.branchId
      ? libraryState.branches.find((b) => b.id === input.branchId && b.organizationId === ctx.organizationId)
      : libraryState.branches.find((b) => b.organizationId === ctx.organizationId);

    const bookId = `book-${Date.now()}`;
    const initialCopiesCount = input.initialCopies || 1;

    const newBook: BookRecord = {
      id: bookId,
      organizationId: ctx.organizationId,
      campusId: input.campusId || ctx.campusId || null,
      branchId: branch?.id || null,
      branchName: branch?.name,
      title: input.title,
      subtitle: input.subtitle || null,
      isbn: input.isbn || null,
      isbn13: input.isbn13 || null,
      authors: input.authors,
      publisher: input.publisher || null,
      publicationYear: input.publicationYear || null,
      edition: input.edition || null,
      category: input.category,
      language: input.language || "English",
      callNumber: input.callNumber || null,
      deweyDecimal: input.deweyDecimal || null,
      totalCopies: initialCopiesCount,
      availableCopies: initialCopiesCount,
      shelfLocation: input.shelfLocation || null,
      coverImageUrl: input.coverImageUrl || null,
      description: input.description || null,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    };

    libraryState.books.push(newBook);

    // Create initial inventory copies with unique accession numbers
    const newCopies: BookCopyRecord[] = [];
    for (let i = 1; i <= initialCopiesCount; i++) {
      const copy: BookCopyRecord = {
        id: `copy-${Date.now()}-${i}`,
        bookId,
        barcode: `LIB-BC-${Date.now().toString().slice(-5)}${i}`,
        copyNumber: i,
        branchId: branch?.id || null,
        branchName: branch?.name,
        status: "AVAILABLE",
        acquiredDate: new Date().toISOString(),
        costCents: 2500, // default nominal $25 replacement cost
      };
      libraryState.copies.push(copy);
      newCopies.push(copy);
    }

    if (branch) {
      branch.totalBooks = (branch.totalBooks || 0) + 1;
      branch.totalCopies = (branch.totalCopies || 0) + initialCopiesCount;
    }

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Book",
      entityId: newBook.id,
      details: { title: newBook.title, isbn: newBook.isbn, initialCopies: initialCopiesCount },
    });

    return {
      ...newBook,
      copies: newCopies,
    };
  }

  async updateBook(ctx: TenantContext, bookId: string, input: UpdateBookInput): Promise<BookRecord> {
    const book = await this.getBookById(ctx, bookId);

    Object.assign(book, {
      ...input,
      updatedAt: new Date().toISOString(),
    });

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Book",
      entityId: book.id,
      details: { updatedFields: Object.keys(input) },
    });

    return book;
  }

  async createBookCopy(ctx: TenantContext, input: CreateBookCopyInput): Promise<BookCopyRecord> {
    const book = libraryState.books.find(
      (b) => b.id === input.bookId && b.organizationId === ctx.organizationId
    );
    if (!book) {
      throw new NotFoundError(`Book with identifier "${input.bookId}" was not found.`);
    }

    const existingBarcode = libraryState.copies.find(
      (c) => c.barcode.toUpperCase() === input.barcode.toUpperCase()
    );
    if (existingBarcode) {
      throw new ValidationError(`Barcode "${input.barcode}" is already registered to another copy.`);
    }

    const currentCopies = libraryState.copies.filter((c) => c.bookId === book.id);
    const nextCopyNumber = currentCopies.length + 1;

    const copy: BookCopyRecord = {
      id: `copy-${Date.now()}`,
      bookId: book.id,
      barcode: input.barcode.toUpperCase(),
      copyNumber: nextCopyNumber,
      branchId: input.branchId || book.branchId,
      status: "AVAILABLE",
      conditionNote: input.conditionNote || null,
      acquiredDate: new Date().toISOString(),
      costCents: input.costCents || null,
    };

    libraryState.copies.push(copy);

    book.totalCopies += 1;
    book.availableCopies += 1;

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "BookCopy",
      entityId: copy.id,
      details: { bookTitle: book.title, barcode: copy.barcode },
    });

    return copy;
  }

  // ---------------------------------------------------------------------------
  // Members & Patrons
  // ---------------------------------------------------------------------------

  async getMembers(
    ctx: TenantContext,
    params?: { memberType?: "STUDENT" | "STAFF"; search?: string }
  ): Promise<LibraryMemberRecord[]> {
    let result = libraryState.members.filter((m) => m.organizationId === ctx.organizationId);

    if (params?.memberType) {
      result = result.filter((m) => m.memberType === params.memberType);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (m) =>
          m.memberName.toLowerCase().includes(q) ||
          m.memberNumber.toLowerCase().includes(q) ||
          (m.memberEmail && m.memberEmail.toLowerCase().includes(q))
      );
    }

    return result;
  }

  async getMemberById(ctx: TenantContext, memberId: string): Promise<LibraryMemberRecord> {
    const member = libraryState.members.find(
      (m) => m.id === memberId && m.organizationId === ctx.organizationId
    );
    if (!member) {
      throw new NotFoundError(`Library member with ID "${memberId}" was not found.`);
    }
    return member;
  }

  async registerMember(ctx: TenantContext, input: RegisterLibraryMemberInput): Promise<LibraryMemberRecord> {
    const existing = libraryState.members.find(
      (m) => m.organizationId === ctx.organizationId && m.memberNumber.toUpperCase() === input.memberNumber.toUpperCase()
    );
    if (existing) {
      throw new ValidationError(`Member number "${input.memberNumber}" is already in use.`);
    }

    // Resolve name from student / staff registry if available
    let resolvedName = `Member ${input.memberNumber}`;
    let resolvedEmail = "";

    if (input.studentId) {
      resolvedName = "Registered Student Member";
      resolvedEmail = "student@apex-demo.internal";
    }

    const member: LibraryMemberRecord = {
      id: `mem-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId: input.campusId || ctx.campusId || null,
      memberNumber: input.memberNumber.toUpperCase(),
      memberType: input.memberType,
      studentId: input.studentId || null,
      staffId: input.staffId || null,
      userId: input.userId || null,
      memberName: resolvedName,
      memberEmail: resolvedEmail,
      status: "ACTIVE",
      joinDate: new Date().toISOString(),
      expiryDate: input.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      activeLoansCount: 0,
      totalFinesUnpaidCents: 0,
    };

    libraryState.members.push(member);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "LibraryMember",
      entityId: member.id,
      details: { memberNumber: member.memberNumber, memberType: member.memberType },
    });

    return member;
  }

  // ---------------------------------------------------------------------------
  // Loans, Checkouts, Returns & Renewals
  // ---------------------------------------------------------------------------

  async getLoans(
    ctx: TenantContext,
    params?: { status?: string; memberId?: string; search?: string }
  ): Promise<BookLoanRecord[]> {
    let result = libraryState.loans.filter((l) => l.organizationId === ctx.organizationId);

    if (params?.status) {
      result = result.filter((l) => l.status === params.status);
    }

    if (params?.memberId) {
      result = result.filter((l) => l.memberId === params.memberId);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.bookTitle.toLowerCase().includes(q) ||
          l.memberName.toLowerCase().includes(q) ||
          l.barcode.toLowerCase().includes(q) ||
          l.memberNumber.toLowerCase().includes(q)
      );
    }

    return result;
  }

  async issueLoan(ctx: TenantContext, input: IssueBookLoanInput): Promise<BookLoanRecord> {
    const member = await this.getMemberById(ctx, input.memberId);
    if (member.status !== "ACTIVE") {
      throw new ValidationError(`Member account is ${member.status.toLowerCase()}. Cannot issue new books.`);
    }

    const settings = await this.getSettings(ctx);
    const maxLoans = member.memberType === "STAFF" ? settings.maxActiveLoansStaff : settings.maxActiveLoansStudent;

    if (member.activeLoansCount >= maxLoans) {
      throw new ValidationError(
        `Borrowing quota exceeded. Active loans: ${member.activeLoansCount}, Maximum allowed: ${maxLoans}.`
      );
    }

    // Check outstanding unpaid fines threshold ($10 = 1000 cents)
    if (member.totalFinesUnpaidCents > 1000) {
      throw new ValidationError(
        `Cannot issue book. Member has unpaid overdue fines of $${(member.totalFinesUnpaidCents / 100).toFixed(2)}. Please settle fines first.`
      );
    }

    const copy = libraryState.copies.find((c) => c.id === input.copyId);
    if (!copy) {
      throw new NotFoundError(`Book copy with ID "${input.copyId}" was not found.`);
    }

    const book = libraryState.books.find(
      (b) => b.id === copy.bookId && b.organizationId === ctx.organizationId
    );
    if (!book) {
      throw new NotFoundError(`Book copy with ID "${input.copyId}" was not found.`);
    }

    if (copy.status !== "AVAILABLE") {
      throw new ValidationError(`This book copy is currently marked as ${copy.status.toLowerCase()}.`);
    }

    const loanDays =
      input.loanDays || (member.memberType === "STAFF" ? settings.defaultLoanDaysStaff : settings.defaultLoanDaysStudent);
    const checkoutDate = new Date();
    const dueDate = new Date(checkoutDate.getTime() + loanDays * 24 * 60 * 60 * 1000);

    const loan: BookLoanRecord = {
      id: `loan-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId: ctx.campusId || null,
      bookId: book.id,
      bookTitle: book.title,
      copyId: copy.id,
      barcode: copy.barcode,
      memberId: member.id,
      memberName: member.memberName,
      memberNumber: member.memberNumber,
      memberType: member.memberType,
      checkoutDate: checkoutDate.toISOString(),
      dueDate: dueDate.toISOString(),
      status: "ACTIVE",
      renewalCount: 0,
      fineAmountCents: 0,
      finePaidCents: 0,
      notes: input.notes || null,
    };

    // Update statuses
    copy.status = "BORROWED";
    book.availableCopies = Math.max(0, book.availableCopies - 1);
    member.activeLoansCount += 1;

    libraryState.loans.unshift(loan);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "BookLoan",
      entityId: loan.id,
      details: {
        bookTitle: book.title,
        barcode: copy.barcode,
        memberName: member.memberName,
        dueDate: loan.dueDate,
      },
    });

    return loan;
  }

  async returnLoan(ctx: TenantContext, input: ReturnBookLoanInput): Promise<BookLoanRecord> {
    const loan = libraryState.loans.find(
      (l) => l.id === input.loanId && l.organizationId === ctx.organizationId
    );
    if (!loan) {
      throw new NotFoundError(`Loan record with ID "${input.loanId}" was not found.`);
    }

    if (loan.status === "RETURNED") {
      throw new ValidationError("This book has already been marked as returned.");
    }

    const returnDate = new Date();
    const dueDate = new Date(loan.dueDate);
    const settings = await this.getSettings(ctx);

    let accruedFineCents = 0;
    if (returnDate > dueDate && !input.waiveFine) {
      const overdueMillis = returnDate.getTime() - dueDate.getTime();
      const overdueDays = Math.ceil(overdueMillis / (1000 * 60 * 60 * 24));
      const chargeableDays = Math.max(0, overdueDays - settings.gracePeriodDays);
      accruedFineCents = chargeableDays * settings.finePerDayCents;
    }

    loan.returnDate = returnDate.toISOString();
    loan.status = "RETURNED";
    loan.fineAmountCents = accruedFineCents;
    if (input.notes) {
      loan.notes = loan.notes ? `${loan.notes} | Return note: ${input.notes}` : input.notes;
    }

    // Update copy and book availability
    const copy = libraryState.copies.find((c) => c.id === loan.copyId);
    if (copy) {
      copy.status = "AVAILABLE";
      if (input.conditionNote) {
        copy.conditionNote = input.conditionNote;
      }
    }

    const book = libraryState.books.find((b) => b.id === loan.bookId && b.organizationId === ctx.organizationId);
    if (book) {
      book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
    }

    const member = libraryState.members.find((m) => m.id === loan.memberId && m.organizationId === ctx.organizationId);
    if (member) {
      member.activeLoansCount = Math.max(0, member.activeLoansCount - 1);
      member.totalFinesUnpaidCents += accruedFineCents;
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "BookLoan",
      entityId: loan.id,
      details: {
        action: "RETURN",
        bookTitle: loan.bookTitle,
        fineAssessed: accruedFineCents,
        waived: input.waiveFine,
      },
    });

    return loan;
  }

  async renewLoan(ctx: TenantContext, input: RenewBookLoanInput): Promise<BookLoanRecord> {
    const loan = libraryState.loans.find(
      (l) => l.id === input.loanId && l.organizationId === ctx.organizationId
    );
    if (!loan) {
      throw new NotFoundError(`Loan record with ID "${input.loanId}" was not found.`);
    }

    if (loan.status !== "ACTIVE" && loan.status !== "OVERDUE") {
      throw new ValidationError(`Cannot renew loan with status "${loan.status}".`);
    }

    const settings = await this.getSettings(ctx);
    if (loan.renewalCount >= settings.maxRenewalsAllowed) {
      throw new ValidationError(
        `Maximum renewal limit reached (${settings.maxRenewalsAllowed} renewals allowed). Book must be returned.`
      );
    }

    // Check if book has pending reservations by other members
    const pendingHold = libraryState.reservations.find(
      (r) => r.bookId === loan.bookId && r.status === "PENDING" && r.memberId !== loan.memberId
    );
    if (pendingHold) {
      throw new ValidationError(
        "Cannot renew loan: this title has pending reservations by other patrons waiting for it."
      );
    }

    const additionalDays = input.additionalDays || settings.defaultLoanDaysStudent;
    const currentDue = new Date(loan.dueDate);
    const newDueDate = new Date(currentDue.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    loan.dueDate = newDueDate.toISOString();
    loan.status = "ACTIVE";
    loan.renewalCount += 1;
    if (input.notes) {
      loan.notes = loan.notes ? `${loan.notes} | Renewed: ${input.notes}` : `Renewed: ${input.notes}`;
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "BookLoan",
      entityId: loan.id,
      details: { action: "RENEW", newDueDate: loan.dueDate, renewalCount: loan.renewalCount },
    });

    return loan;
  }

  // ---------------------------------------------------------------------------
  // Fines Management
  // ---------------------------------------------------------------------------

  async collectFine(ctx: TenantContext, input: CollectFineInput): Promise<BookLoanRecord> {
    const loan = libraryState.loans.find(
      (l) => l.id === input.loanId && l.organizationId === ctx.organizationId
    );
    if (!loan) {
      throw new NotFoundError(`Loan record with ID "${input.loanId}" was not found.`);
    }

    const remainingDue = loan.fineAmountCents - loan.finePaidCents;
    if (remainingDue <= 0) {
      throw new ValidationError("No outstanding fine due on this loan record.");
    }

    const payAmount = Math.min(input.amountCents, remainingDue);
    loan.finePaidCents += payAmount;

    const member = libraryState.members.find((m) => m.id === loan.memberId);
    if (member) {
      member.totalFinesUnpaidCents = Math.max(0, member.totalFinesUnpaidCents - payAmount);
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "BookLoanFine",
      entityId: loan.id,
      details: {
        paidCents: payAmount,
        paymentMethod: input.paymentMethod,
        remainingDue: loan.fineAmountCents - loan.finePaidCents,
      },
    });

    return loan;
  }

  async waiveFine(ctx: TenantContext, input: WaiveFineInput): Promise<BookLoanRecord> {
    const loan = libraryState.loans.find(
      (l) => l.id === input.loanId && l.organizationId === ctx.organizationId
    );
    if (!loan) {
      throw new NotFoundError(`Loan record with ID "${input.loanId}" was not found.`);
    }

    const waivedAmount = loan.fineAmountCents - loan.finePaidCents;
    loan.fineAmountCents = loan.finePaidCents; // Waive remaining

    const member = libraryState.members.find((m) => m.id === loan.memberId);
    if (member) {
      member.totalFinesUnpaidCents = Math.max(0, member.totalFinesUnpaidCents - waivedAmount);
    }

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "BookLoanFine",
      entityId: loan.id,
      details: { action: "WAIVE_FINE", waivedAmount, reason: input.reason },
    });

    return loan;
  }

  // ---------------------------------------------------------------------------
  // Reservations / Holds
  // ---------------------------------------------------------------------------

  async getReservations(ctx: TenantContext, params?: { status?: string }): Promise<BookReservationRecord[]> {
    let result = libraryState.reservations.filter((r) => r.organizationId === ctx.organizationId);
    if (params?.status) {
      result = result.filter((r) => r.status === params.status);
    }
    return result;
  }

  async createReservation(ctx: TenantContext, input: CreateBookReservationInput): Promise<BookReservationRecord> {
    const member = await this.getMemberById(ctx, input.memberId);
    const book = await this.getBookById(ctx, input.bookId);

    // Check if user already holds a pending reservation for this book
    const existing = libraryState.reservations.find(
      (r) => r.bookId === book.id && r.memberId === member.id && r.status === "PENDING"
    );
    if (existing) {
      throw new ValidationError("You already have an active pending reservation hold on this title.");
    }

    const settings = await this.getSettings(ctx);
    const reservedAt = new Date();
    const expiresAt = new Date(reservedAt.getTime() + settings.reservationExpiryDays * 24 * 60 * 60 * 1000);

    const reservation: BookReservationRecord = {
      id: `res-${Date.now()}`,
      organizationId: ctx.organizationId,
      campusId: ctx.campusId || null,
      bookId: book.id,
      bookTitle: book.title,
      memberId: member.id,
      memberName: member.memberName,
      memberNumber: member.memberNumber,
      reservedAt: reservedAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
      status: "PENDING",
    };

    libraryState.reservations.push(reservation);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "BookReservation",
      entityId: reservation.id,
      details: { bookTitle: book.title, memberName: member.memberName },
    });

    return reservation;
  }

  // ---------------------------------------------------------------------------
  // Dashboard & Statistics
  // ---------------------------------------------------------------------------

  async getDashboardStats(ctx: TenantContext): Promise<LibraryDashboardStats> {
    const books = libraryState.books.filter((b) => b.organizationId === ctx.organizationId);
    const copies = libraryState.copies.filter((c) => books.some((b) => b.id === c.bookId));
    const loans = libraryState.loans.filter((l) => l.organizationId === ctx.organizationId);
    const members = libraryState.members.filter((m) => m.organizationId === ctx.organizationId);
    const reservations = libraryState.reservations.filter((r) => r.organizationId === ctx.organizationId);

    const activeLoans = loans.filter((l) => l.status === "ACTIVE").length;
    const overdueLoans = loans.filter((l) => l.status === "OVERDUE").length;
    const availableCopies = copies.filter((c) => c.status === "AVAILABLE").length;
    const totalFinesUnpaidCents = members.reduce((sum, m) => sum + m.totalFinesUnpaidCents, 0);
    const pendingReservations = reservations.filter((r) => r.status === "PENDING").length;

    // Popular categories
    const categoryCounts: Record<string, number> = {};
    books.forEach((b) => {
      categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
    });

    const popularCategories = Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    }));

    return {
      totalTitles: books.length,
      totalCopies: copies.length,
      availableCopies,
      activeLoans,
      overdueLoans,
      totalMembers: members.length,
      totalFinesUnpaidCents,
      pendingReservations,
      popularCategories,
      recentLoans: loans.slice(0, 10),
    };
  }
}

export const libraryService = new LibraryService();
