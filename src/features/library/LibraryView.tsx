import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  Search,
  BookMarked,
  RotateCcw,
  CheckCircle2,
  Clock,
  Building,
  Sliders,
  DollarSign,
  Bookmark,
  UserCheck,
  Calendar,
  AlertTriangle,
  Barcode,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth/AuthContext";
import type {
  BookRecord,
  BookCopyRecord,
  BookLoanRecord,
  LibraryMemberRecord,
  LibraryBranchRecord,
  LibrarySettingRecord,
  BookReservationRecord,
  LibraryDashboardStats,
} from "@/services/library.service";

export function LibraryView() {
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
  const [activeTab, setActiveTab] = useState<"catalog" | "circulation" | "members" | "reservations" | "settings">("catalog");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<LibraryDashboardStats | null>(null);

  // Data lists
  const [books, setBooks] = useState<BookRecord[]>([]);
  const [loans, setLoans] = useState<BookLoanRecord[]>([]);
  const [members, setMembers] = useState<LibraryMemberRecord[]>([]);
  const [reservations, setReservations] = useState<BookReservationRecord[]>([]);
  const [branches, setBranches] = useState<LibraryBranchRecord[]>([]);
  const [settings, setSettings] = useState<LibrarySettingRecord | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [circulationFilter, setCirculationFilter] = useState<"ALL" | "ACTIVE" | "OVERDUE" | "RETURNED">("ALL");

  // Modals
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isIssueLoanOpen, setIsIssueLoanOpen] = useState(false);
  const [isAddCopyOpen, setIsAddCopyOpen] = useState(false);
  const [isRegisterMemberOpen, setIsRegisterMemberOpen] = useState(false);
  const [isReserveOpen, setIsReserveOpen] = useState(false);
  const [selectedBookForCopy, setSelectedBookForCopy] = useState<BookRecord | null>(null);
  const [fineDialogLoan, setFineDialogLoan] = useState<BookLoanRecord | null>(null);
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [fineAction, setFineAction] = useState<"COLLECT" | "WAIVE">("COLLECT");
  const [waiveReason, setWaiveReason] = useState("");

  // Form states
  const [newBook, setNewBook] = useState({
    title: "",
    authors: "",
    category: "Science",
    isbn: "",
    publisher: "",
    callNumber: "",
    shelfLocation: "",
    initialCopies: 1,
    description: "",
  });

  const [loanForm, setLoanForm] = useState({
    memberId: "",
    copyId: "",
    loanDays: 14,
    notes: "",
  });

  const [copyForm, setCopyForm] = useState({
    barcode: "",
    conditionNote: "",
  });

  const [memberForm, setMemberForm] = useState({
    memberNumber: "",
    memberType: "STUDENT" as "STUDENT" | "STAFF",
    studentId: "stu-001",
  });

  const [reserveForm, setReserveForm] = useState({
    bookId: "",
    memberId: "",
  });

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const tenantCtx = {
    organizationId: "org-apex-demo-01",
    campusId: currentCampus?.id || "campus-apex-main-01",
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashStats, bookList, loanList, memberList, resList, branchList, setRecord] =
        await Promise.all([
          apiGet("/api/library/overview"),
          apiGet("/api/library/books"),
          apiGet("/api/library/loans"),
          apiGet("/api/library/members"),
          apiGet("/api/library/reservations"),
          apiGet("/api/library/branches"),
          apiGet("/api/library/settings"),
        ]);
      setStats(dashStats);
      setBooks(bookList || []);
      setLoans(loanList || []);
      setMembers(memberList || []);
      setReservations(resList || []);
      setBranches(branchList || []);
      setSettings(setRecord || null);
    } catch (err) {
      console.error("Failed to load library data:", err);
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

  // Handlers
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBook.title || !newBook.authors) return;
    try {
      await apiPost("/api/library/books", {
        title: newBook.title,
        authors: newBook.authors,
        category: newBook.category,
        language: "English",
        isbn: newBook.isbn || undefined,
        publisher: newBook.publisher || undefined,
        callNumber: newBook.callNumber || undefined,
        shelfLocation: newBook.shelfLocation || undefined,
        initialCopies: Number(newBook.initialCopies) || 1,
        description: newBook.description || undefined,
      });
      setIsAddBookOpen(false);
      setNewBook({
        title: "",
        authors: "",
        category: "Science",
        isbn: "",
        publisher: "",
        callNumber: "",
        shelfLocation: "",
        initialCopies: 1,
        description: "",
      });
      showNotification("New book title and inventory copies registered successfully.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add book");
    }
  };

  const handleIssueLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loanForm.memberId || !loanForm.copyId) return;
    try {
      await apiPost("/api/library/loans/issue", {
        memberId: loanForm.memberId,
        copyId: loanForm.copyId,
        loanDays: Number(loanForm.loanDays) || 14,
        notes: loanForm.notes || undefined,
      });
      setIsIssueLoanOpen(false);
      setLoanForm({ memberId: "", copyId: "", loanDays: 14, notes: "" });
      showNotification("Book issued to patron successfully.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to issue book");
    }
  };

  const handleReturnLoan = async (loanId: string) => {
    if (!confirm("Confirm returning this book to catalog inventory?")) return;
    try {
      await apiPost("/api/library/loans/return", { loanId, waiveFine: false });
      showNotification("Book marked as returned and copy restored to available status.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to return book");
    }
  };

  const handleRenewLoan = async (loanId: string) => {
    try {
      await apiPost("/api/library/loans/renew", { loanId });
      showNotification("Book loan renewed for an additional borrowing period.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to renew loan");
    }
  };

  const handleCreateCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookForCopy || !copyForm.barcode) return;
    try {
      await apiPost("/api/library/copies", {
        bookId: selectedBookForCopy.id,
        barcode: copyForm.barcode,
        conditionNote: copyForm.conditionNote || undefined,
      });
      setIsAddCopyOpen(false);
      setCopyForm({ barcode: "", conditionNote: "" });
      setSelectedBookForCopy(null);
      showNotification("Accession barcode added to book copy inventory.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to add copy");
    }
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.memberNumber) return;
    try {
      await apiPost("/api/library/members", {
        memberNumber: memberForm.memberNumber,
        memberType: memberForm.memberType,
        studentId: memberForm.memberType === "STUDENT" ? memberForm.studentId : undefined,
      });
      setIsRegisterMemberOpen(false);
      setMemberForm({ memberNumber: "", memberType: "STUDENT", studentId: "stu-001" });
      showNotification("Patron library card issued successfully.");
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to register member");
    }
  };

  const handleFineAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fineDialogLoan) return;
    try {
      if (fineAction === "COLLECT") {
        await apiPost("/api/library/loans/fines/collect", {
          loanId: fineDialogLoan.id,
          amountCents: fineAmount,
          paymentMethod: "CASH",
        });
        showNotification(`Collected $${(fineAmount / 100).toFixed(2)} overdue fine.`);
      } else {
        await apiPost("/api/library/loans/fines/waive", {
          loanId: fineDialogLoan.id,
          reason: waiveReason || "Institutional waiver",
        });
        showNotification("Overdue fine waived.");
      }
      setFineDialogLoan(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Fine transaction failed");
    }
  };

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.authors.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.isbn && b.isbn.includes(searchQuery));
    const matchesCategory = selectedCategory === "ALL" || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredLoans = loans.filter((l) => {
    if (circulationFilter === "ALL") return true;
    return l.status === circulationFilter;
  });

  const categories = ["ALL", "Science", "Literature", "Mathematics", "Computer Science", "History", "General"];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Library & Resource Center
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Book cataloging, barcode accession, lending circulation, member quotas, and overdue fines
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs h-9 px-3 gap-1.5"
            onClick={() => setIsRegisterMemberOpen(true)}
          >
            <UserCheck className="h-3.5 w-3.5" />
            Issue Card
          </Button>
          <Button
            variant="outline"
            className="text-xs h-9 px-3 gap-1.5"
            onClick={() => setIsIssueLoanOpen(true)}
          >
            <BookMarked className="h-3.5 w-3.5" />
            Check Out Book
          </Button>
          <Button
            className="text-xs h-9 px-3 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => setIsAddBookOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Title
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
            <div className="text-xs text-slate-500 font-medium">Catalog Titles</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalTitles}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{stats.totalCopies} copies in stock</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Available Copies</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.availableCopies}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Ready on shelves</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Active Loans</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.activeLoans}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Checked out to patrons</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Overdue Returns</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.overdueLoans}</div>
            <div className="text-[11px] text-amber-600 mt-0.5">Requires reminder</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Registered Patrons</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalMembers}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Active library cards</div>
          </div>
          <div className="bg-white p-3.5 border border-slate-200 rounded">
            <div className="text-xs text-slate-500 font-medium">Unpaid Overdue Fines</div>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              ${(stats.totalFinesUnpaidCents / 100).toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Rate: $0.50/day</div>
          </div>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-sm font-medium">
          {[
            { id: "catalog", label: "Book Catalog", count: books.length },
            { id: "circulation", label: "Circulation & Loans", count: loans.length },
            { id: "members", label: "Patrons & Members", count: members.length },
            { id: "reservations", label: "Reservations & Holds", count: reservations.length },
            { id: "settings", label: "Branches & Settings" },
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
      {/* TAB 1: BOOK CATALOG */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "catalog" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-slate-200 rounded">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search title, author, ISBN, call number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Category:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-slate-900 text-white font-medium"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Title & Authors</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Call # / ISBN</th>
                  <th className="py-2.5 px-3">Shelf Location</th>
                  <th className="py-2.5 px-3 text-center">Copies</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      No books found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 text-[13px]">{book.title}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          by {book.authors}
                          {book.edition ? ` · ${book.edition}` : ""}
                          {book.publicationYear ? ` (${book.publicationYear})` : ""}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span>{book.category}</span>
                        <div className="text-[11px] text-slate-400">{book.language}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-slate-700 text-[11px]">{book.callNumber || "—"}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{book.isbn || "No ISBN"}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {book.shelfLocation || "General Stacks"}
                        {book.branchName && (
                          <div className="text-[10px] text-slate-400">{book.branchName}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="font-semibold text-slate-900">
                          {book.availableCopies} / {book.totalCopies}
                        </div>
                        <div className="text-[10px] text-emerald-600">
                          {book.availableCopies > 0 ? "Available" : "All Checked Out"}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            className="h-7 text-[11px] px-2"
                            onClick={() => {
                              setSelectedBookForCopy(book);
                              setIsAddCopyOpen(true);
                            }}
                          >
                            + Copy
                          </Button>
                          <Button
                            variant="outline"
                            className="h-7 text-[11px] px-2 text-indigo-600 hover:text-indigo-800"
                            onClick={() => {
                              setLoanForm((prev) => ({
                                ...prev,
                                copyId: book.copies?.find((c) => c.status === "AVAILABLE")?.id || "",
                              }));
                              setIsIssueLoanOpen(true);
                            }}
                            disabled={book.availableCopies === 0}
                          >
                            Issue
                          </Button>
                        </div>
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
      {/* TAB 2: CIRCULATION & LOANS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "circulation" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                Filter Loans:
              </span>
              {(["ALL", "ACTIVE", "OVERDUE", "RETURNED"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setCirculationFilter(filter)}
                  className={`text-xs px-2.5 py-1 rounded transition-colors ${
                    circulationFilter === filter
                      ? "bg-slate-900 text-white font-medium"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            <Button
              className="text-xs h-8 px-3 bg-indigo-600 text-white hover:bg-indigo-700 gap-1.5"
              onClick={() => setIsIssueLoanOpen(true)}
            >
              <BookMarked className="h-3.5 w-3.5" />
              Check Out Book
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Book & Barcode</th>
                  <th className="py-2.5 px-3">Borrower / Patron</th>
                  <th className="py-2.5 px-3">Checkout Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Fines</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLoans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No loan records matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLoans.map((loan) => {
                    const isOverdue = loan.status === "OVERDUE";
                    return (
                      <tr key={loan.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-900 text-[13px]">{loan.bookTitle}</div>
                          <div className="font-mono text-slate-400 text-[11px] mt-0.5">
                            Barcode: {loan.barcode}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-900">{loan.memberName}</div>
                          <div className="text-[11px] text-slate-400">
                            {loan.memberNumber} · {loan.memberType}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {new Date(loan.checkoutDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3">
                          <div className={isOverdue ? "text-amber-700 font-semibold" : "text-slate-700"}>
                            {new Date(loan.dueDate).toLocaleDateString()}
                          </div>
                          {loan.returnDate && (
                            <div className="text-[10px] text-slate-400">
                              Returned: {new Date(loan.returnDate).toLocaleDateString()}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-[11px] font-medium ${
                              loan.status === "ACTIVE"
                                ? "text-emerald-700"
                                : loan.status === "OVERDUE"
                                ? "text-amber-700 font-semibold"
                                : "text-slate-500"
                            }`}
                          >
                            {loan.status}
                          </span>
                          {loan.renewalCount > 0 && (
                            <div className="text-[10px] text-slate-400">
                              Renewed {loan.renewalCount}x
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {loan.fineAmountCents > 0 ? (
                            <div>
                              <div className="font-semibold text-rose-600">
                                ${(loan.fineAmountCents / 100).toFixed(2)}
                              </div>
                              {loan.finePaidCents >= loan.fineAmountCents ? (
                                <div className="text-[10px] text-emerald-600 font-medium">Paid in full</div>
                              ) : (
                                <div className="text-[10px] text-amber-600">
                                  ${((loan.fineAmountCents - loan.finePaidCents) / 100).toFixed(2)} due
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {loan.status !== "RETURNED" && (
                              <>
                                <Button
                                  variant="outline"
                                  className="h-7 text-[11px] px-2 text-emerald-700 hover:bg-emerald-50"
                                  onClick={() => handleReturnLoan(loan.id)}
                                >
                                  Return
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-7 text-[11px] px-2 text-indigo-700 hover:bg-indigo-50"
                                  onClick={() => handleRenewLoan(loan.id)}
                                >
                                  Renew
                                </Button>
                              </>
                            )}
                            {loan.fineAmountCents > loan.finePaidCents && (
                              <Button
                                variant="outline"
                                className="h-7 text-[11px] px-2 text-rose-700 hover:bg-rose-50"
                                onClick={() => {
                                  setFineDialogLoan(loan);
                                  setFineAmount(loan.fineAmountCents - loan.finePaidCents);
                                  setFineAction("COLLECT");
                                }}
                              >
                                Collect Fine
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 3: PATRONS & MEMBERS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "members" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Registered Library Patrons</h3>
              <p className="text-xs text-slate-500">Student matriculates and teaching staff library cards</p>
            </div>
            <Button
              className="text-xs h-8 px-3 bg-indigo-600 text-white hover:bg-indigo-700 gap-1.5"
              onClick={() => setIsRegisterMemberOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              Register Member
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Card #</th>
                  <th className="py-2.5 px-3">Patron Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Active Loans</th>
                  <th className="py-2.5 px-3">Fines Due</th>
                  <th className="py-2.5 px-3">Member Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-slate-900">{m.memberNumber}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{m.memberName}</div>
                      <div className="text-[11px] text-slate-400">{m.memberEmail || "No email on record"}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{m.memberType}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-900">{m.activeLoansCount}</span>
                      <span className="text-slate-400 text-[11px]"> / {m.memberType === "STAFF" ? 10 : 3} max</span>
                    </td>
                    <td className="py-3 px-3">
                      {m.totalFinesUnpaidCents > 0 ? (
                        <span className="font-semibold text-rose-600">
                          ${(m.totalFinesUnpaidCents / 100).toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400">$0.00</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[11px] text-emerald-700 font-medium">{m.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 4: RESERVATIONS & HOLDS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "reservations" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3 border border-slate-200 rounded">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Active Book Reservations</h3>
              <p className="text-xs text-slate-500">Patron holds on checked-out books</p>
            </div>
            <Button
              className="text-xs h-8 px-3 bg-indigo-600 text-white hover:bg-indigo-700 gap-1.5"
              onClick={() => setIsReserveOpen(true)}
            >
              <Bookmark className="h-3.5 w-3.5" />
              Place Hold
            </Button>
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-3">Book Title</th>
                  <th className="py-2.5 px-3">Patron</th>
                  <th className="py-2.5 px-3">Reserved At</th>
                  <th className="py-2.5 px-3">Expires At</th>
                  <th className="py-2.5 px-3">Hold Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      No active book reservations.
                    </td>
                  </tr>
                ) : (
                  reservations.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{res.bookTitle}</td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-900">{res.memberName}</div>
                        <div className="text-[11px] text-slate-400">{res.memberNumber}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {new Date(res.reservedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {new Date(res.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-[11px] text-indigo-700 font-medium">{res.status}</span>
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
      {/* TAB 5: BRANCHES & SETTINGS */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Branches */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building className="h-4 w-4 text-indigo-600" />
              Library Branches & Locations
            </h3>

            <div className="space-y-3">
              {branches.map((b) => (
                <div key={b.id} className="p-4 bg-white border border-slate-200 rounded space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{b.name}</span>
                    <span className="font-mono text-xs text-slate-500">{b.code}</span>
                  </div>
                  <p className="text-xs text-slate-600">{b.description}</p>
                  <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Location: {b.location || "Main Academic Wing"}</span>
                    <span>Hours: {b.openingHours || "08:00 - 17:00"}</span>
                    <span>Contact: {b.contactPhone || b.contactEmail || "Internal"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Borrowing Policies & Rules */}
          {settings && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-600" />
                Borrowing Policies & Fine Structure
              </h3>

              <div className="p-4 bg-white border border-slate-200 rounded space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Student Loan Quota:</span>
                  <span className="font-semibold text-slate-900">{settings.maxActiveLoansStudent} books</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Student Loan Duration:</span>
                  <span className="font-semibold text-slate-900">{settings.defaultLoanDaysStudent} days</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Staff Loan Quota:</span>
                  <span className="font-semibold text-slate-900">{settings.maxActiveLoansStaff} books</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Staff Loan Duration:</span>
                  <span className="font-semibold text-slate-900">{settings.defaultLoanDaysStaff} days</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Max Renewals Allowed:</span>
                  <span className="font-semibold text-slate-900">{settings.maxRenewalsAllowed} times</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Overdue Fine Rate:</span>
                  <span className="font-semibold text-rose-600">${(settings.finePerDayCents / 100).toFixed(2)} / day</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-600">Grace Period:</span>
                  <span className="font-semibold text-slate-900">{settings.gracePeriodDays} day</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-600">Hold Expiration:</span>
                  <span className="font-semibold text-slate-900">{settings.reservationExpiryDays} days</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD BOOK TITLE */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isAddBookOpen}
        onOpenChange={setIsAddBookOpen}
        title="Add New Book to Catalog"
        description="Register an educational or reference title with accession copies."
      >
        <form onSubmit={handleCreateBook} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Book Title *</label>
            <Input
              required
              placeholder="e.g. Advanced Calculus: Theory and Practice"
              value={newBook.title}
              onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Authors / Creators *</label>
              <Input
                required
                placeholder="e.g. J. Stewart, S. Watson"
                value={newBook.authors}
                onChange={(e) => setNewBook({ ...newBook, authors: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Category</label>
              <select
                className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
                value={newBook.category}
                onChange={(e) => setNewBook({ ...newBook, category: e.target.value })}
              >
                <option value="Science">Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Literature">Literature</option>
                <option value="Computer Science">Computer Science</option>
                <option value="History">History</option>
                <option value="General">General Reference</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">ISBN / Barcode</label>
              <Input
                placeholder="e.g. 978-0135159552"
                value={newBook.isbn}
                onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Initial Copies Count</label>
              <Input
                type="number"
                min="1"
                max="20"
                value={newBook.initialCopies}
                onChange={(e) => setNewBook({ ...newBook, initialCopies: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Call Number / Dewey</label>
              <Input
                placeholder="e.g. 515 STE 2020"
                value={newBook.callNumber}
                onChange={(e) => setNewBook({ ...newBook, callNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Shelf Location</label>
              <Input
                placeholder="e.g. Aisle 4, Shelf C2"
                value={newBook.shelfLocation}
                onChange={(e) => setNewBook({ ...newBook, shelfLocation: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddBookOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Save to Catalog
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: CHECK OUT BOOK LOAN */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isIssueLoanOpen}
        onOpenChange={setIsIssueLoanOpen}
        title="Check Out Book (Issue Loan)"
        description="Select patron member and available book copy accession number."
      >
        <form onSubmit={handleIssueLoan} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Patron / Member *</label>
            <select
              required
              className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
              value={loanForm.memberId}
              onChange={(e) => setLoanForm({ ...loanForm, memberId: e.target.value })}
            >
              <option value="">Select Patron Member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.memberName} ({m.memberNumber}) · {m.activeLoansCount} active loans
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Book Copy Accession *</label>
            <select
              required
              className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
              value={loanForm.copyId}
              onChange={(e) => setLoanForm({ ...loanForm, copyId: e.target.value })}
            >
              <option value="">Select Available Copy...</option>
              {books.flatMap((b) =>
                (b.copies || [])
                  .filter((c) => c.status === "AVAILABLE")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {b.title} — Barcode: {c.barcode} (Copy #{c.copyNumber})
                    </option>
                  ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Loan Period (Days)</label>
            <Input
              type="number"
              min="1"
              max="60"
              value={loanForm.loanDays}
              onChange={(e) => setLoanForm({ ...loanForm, loanDays: parseInt(e.target.value) || 14 })}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Course / Checkout Note</label>
            <Input
              placeholder="e.g. Physics coursework preparation"
              value={loanForm.notes}
              onChange={(e) => setLoanForm({ ...loanForm, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsIssueLoanOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Confirm Checkout
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ADD ACCESSION COPY */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isAddCopyOpen}
        onOpenChange={setIsAddCopyOpen}
        title={`Add Copy for: ${selectedBookForCopy?.title || ""}`}
        description="Register an additional barcode or accession copy for this title."
      >
        <form onSubmit={handleCreateCopy} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Barcode / Accession Number *</label>
            <Input
              required
              placeholder="e.g. LIB-BC-90412"
              value={copyForm.barcode}
              onChange={(e) => setCopyForm({ ...copyForm, barcode: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Condition Note</label>
            <Input
              placeholder="e.g. Brand new hardback copy"
              value={copyForm.conditionNote}
              onChange={(e) => setCopyForm({ ...copyForm, conditionNote: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsAddCopyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Register Copy
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: ISSUE PATRON CARD */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={isRegisterMemberOpen}
        onOpenChange={setIsRegisterMemberOpen}
        title="Issue Library Patron Card"
        description="Register a student or staff member for borrowing privileges."
      >
        <form onSubmit={handleRegisterMember} className="space-y-4 text-xs pt-2">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Member Card Number *</label>
            <Input
              required
              placeholder="e.g. LIB-M-008"
              value={memberForm.memberNumber}
              onChange={(e) => setMemberForm({ ...memberForm, memberNumber: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Patron Type</label>
            <select
              className="w-full h-9 border border-slate-300 rounded px-2.5 bg-white text-xs"
              value={memberForm.memberType}
              onChange={(e) => setMemberForm({ ...memberForm, memberType: e.target.value as any })}
            >
              <option value="STUDENT">Student Patron (3 loans max)</option>
              <option value="STAFF">Academic / Staff Patron (10 loans max)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setIsRegisterMemberOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Issue Membership
            </Button>
          </div>
        </form>
      </Dialog>

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: COLLECT / WAIVE FINE */}
      {/* --------------------------------------------------------------------- */}
      <Dialog
        open={!!fineDialogLoan}
        onOpenChange={(open) => !open && setFineDialogLoan(null)}
        title="Overdue Fine Management"
        description={`Loan record: ${fineDialogLoan?.bookTitle} (${fineDialogLoan?.memberName})`}
      >
        <form onSubmit={handleFineAction} className="space-y-4 text-xs pt-2">
          <div className="flex gap-4 border-b border-slate-100 pb-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="fineAction"
                checked={fineAction === "COLLECT"}
                onChange={() => setFineAction("COLLECT")}
              />
              <span className="font-semibold text-slate-800">Collect Fine Payment</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="fineAction"
                checked={fineAction === "WAIVE"}
                onChange={() => setFineAction("WAIVE")}
              />
              <span className="font-semibold text-slate-800">Waive Fine</span>
            </label>
          </div>

          {fineAction === "COLLECT" ? (
            <div>
              <label className="block text-slate-700 font-medium mb-1">Amount to Collect (Cents)</label>
              <Input
                type="number"
                min="1"
                value={fineAmount}
                onChange={(e) => setFineAmount(parseInt(e.target.value) || 0)}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Amount: ${(fineAmount / 100).toFixed(2)}
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-slate-700 font-medium mb-1">Reason for Waiver *</label>
              <Input
                required
                placeholder="e.g. Medical absence with approved note"
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={() => setFineDialogLoan(null)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700">
              Confirm {fineAction === "COLLECT" ? "Collection" : "Waiver"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
