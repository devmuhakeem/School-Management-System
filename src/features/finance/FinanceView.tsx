import React, { useState, useEffect } from "react";
import {
  Receipt,
  DollarSign,
  CreditCard,
  FileText,
  Percent,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Printer,
  ChevronRight,
  TrendingUp,
  Ban,
  Wallet,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/currency";

export function FinanceView() {
  const [activeTab, setActiveTab] = useState<
    "overview" | "invoices" | "payments" | "structures" | "waivers" | "debtors" | "ledger"
  >("overview");

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Data states
  const [overview, setOverview] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [structures, setStructures] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [waivers, setWaivers] = useState<any[]>([]);
  const [debtorsData, setDebtorsData] = useState<any>(null);
  const [selectedStudentLedger, setSelectedStudentLedger] = useState<any>(null);
  const [selectedLedgerStudentId, setSelectedLedgerStudentId] = useState<string>("stu-001");

  // Filters
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("ALL");
  const [paymentSearch, setPaymentSearch] = useState("");

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [singleInvoiceModalOpen, setSingleInvoiceModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [waiverModalOpen, setWaiverModalOpen] = useState(false);
  const [structureModalOpen, setStructureModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [voidModalOpen, setVoidModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);

  // Form states
  const [batchClassId, setBatchClassId] = useState("class-g10-a");
  const [batchStructureId, setBatchStructureId] = useState("");
  const [batchDueDate, setBatchDueDate] = useState("2026-03-31");

  const [paymentForm, setPaymentForm] = useState({
    studentId: "stu-002",
    amount: "500",
    method: "BANK_TRANSFER",
    reference: "",
    notes: "",
    invoiceId: "",
  });

  const [waiverForm, setWaiverForm] = useState({
    studentId: "stu-003",
    category: "NEED_BASED",
    discountType: "FIXED_AMOUNT",
    value: "200",
    reason: "",
    invoiceId: "",
  });

  const [voidReason, setVoidReason] = useState("");
  const [refundForm, setRefundForm] = useState({
    paymentId: "",
    amount: "",
    reason: "",
  });

  const [newCategoryForm, setNewCategoryForm] = useState({
    name: "",
    code: "",
    description: "",
  });

  const [newStructureForm, setNewStructureForm] = useState({
    name: "",
    description: "",
    classLevelId: "level-high-01",
    classId: "class-g10-a",
    academicYearId: "ay-2025-26",
    termId: "term-2025-t2",
    items: [
      { name: "Tuition", feeCategoryId: "fcat-01", amount: "1000", isMandatory: true, frequency: "TERM" },
      { name: "ICT Lab", feeCategoryId: "fcat-02", amount: "150", isMandatory: true, frequency: "TERM" },
    ],
  });

  // Students lookup
  const studentsList = [
    { id: "stu-001", name: "Lucas Wright", admissionNumber: "STU-2025-00001", class: "Grade 10-A" },
    { id: "stu-002", name: "Amina Al-Mansoor", admissionNumber: "STU-2025-00002", class: "Grade 10-A" },
    { id: "stu-003", name: "Chukwudi Okafor", admissionNumber: "STU-2025-00003", class: "Grade 10-A" },
    { id: "stu-004", name: "Elena Rostova", admissionNumber: "STU-2025-00004", class: "Grade 10-A" },
    { id: "stu-005", name: "Marcus Brody", admissionNumber: "STU-2025-00005", class: "Grade 10-A" },
  ];

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [ovRes, invRes, payRes, recRes, strRes, catRes, wavRes, debRes, ledRes] =
        await Promise.all([
          fetch("/api/finance/overview"),
          fetch("/api/finance/invoices"),
          fetch("/api/finance/payments"),
          fetch("/api/finance/receipts"),
          fetch("/api/finance/structures"),
          fetch("/api/finance/categories"),
          fetch("/api/finance/waivers"),
          fetch("/api/finance/debtors"),
          fetch(`/api/finance/students/${selectedLedgerStudentId}/ledger`),
        ]);

      if (ovRes.ok) {
        const json = await ovRes.json();
        setOverview(json.data);
      }
      if (invRes.ok) {
        const json = await invRes.json();
        setInvoices(json.data?.invoices || []);
      }
      if (payRes.ok) {
        const json = await payRes.json();
        setPayments(json.data?.payments || []);
      }
      if (recRes.ok) {
        const json = await recRes.json();
        setReceipts(json.data?.receipts || []);
      }
      if (strRes.ok) {
        const json = await strRes.json();
        setStructures(json.data || []);
        if (json.data && json.data.length > 0) {
          setBatchStructureId(json.data[0].id);
        }
      }
      if (catRes.ok) {
        const json = await catRes.json();
        setCategories(json.data || []);
      }
      if (wavRes.ok) {
        const json = await wavRes.json();
        setWaivers(json.data || []);
      }
      if (debRes.ok) {
        const json = await debRes.json();
        setDebtorsData(json.data);
      }
      if (ledRes.ok) {
        const json = await ledRes.json();
        setSelectedStudentLedger(json.data);
      }
    } catch (err: any) {
      setErrorMessage("Could not connect to finance server. Loading local state.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStudentLedgerChange = async (studentId: string) => {
    setSelectedLedgerStudentId(studentId);
    try {
      const res = await fetch(`/api/finance/students/${studentId}/ledger`);
      if (res.ok) {
        const json = await res.json();
        setSelectedStudentLedger(json.data);
      }
    } catch {
      // Fallback
    }
  };

  // Batch Invoice Submit
  const handleBatchInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/finance/invoices/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campusId: "camp-main-01",
          academicYearId: "ay-2025-26",
          termId: "term-2025-t2",
          feeStructureId: batchStructureId,
          classId: batchClassId,
          dueDate: batchDueDate,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setSuccessMessage(json.message || "Batch invoices generated successfully.");
        setBatchModalOpen(false);
        fetchData();
      } else {
        setErrorMessage(json.message || "Failed to generate batch invoices.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  // Record Payment Submit
  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const payload: any = {
        studentId: paymentForm.studentId,
        campusId: "camp-main-01",
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.method,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined,
      };

      if (paymentForm.invoiceId) {
        payload.allocations = [
          {
            invoiceId: paymentForm.invoiceId,
            amount: parseFloat(paymentForm.amount),
          },
        ];
      }

      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        setSuccessMessage(json.message || "Payment recorded and official receipt generated.");
        setPaymentModalOpen(false);
        if (json.data?.receipt) {
          setSelectedReceipt(json.data.receipt);
        }
        fetchData();
      } else {
        setErrorMessage(json.message || "Payment recording failed.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  // Apply Waiver Submit
  const handleApplyWaiverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/finance/waivers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: waiverForm.studentId,
          campusId: "camp-main-01",
          invoiceId: waiverForm.invoiceId || undefined,
          category: waiverForm.category,
          discountType: waiverForm.discountType,
          value: parseFloat(waiverForm.value),
          reason: waiverForm.reason,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        setSuccessMessage("Waiver authorized and applied to student invoice.");
        setWaiverModalOpen(false);
        fetchData();
      } else {
        setErrorMessage(json.message || "Failed to apply waiver.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error.");
    } finally {
      setActionLoading(false);
    }
  };

  // Void Invoice
  const handleVoidInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/finance/invoices/${selectedInvoice.id}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: voidReason }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMessage(`Invoice ${selectedInvoice.invoiceNumber} has been voided.`);
        setVoidModalOpen(false);
        setSelectedInvoice(null);
        fetchData();
      } else {
        setErrorMessage(json.message || "Failed to void invoice.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error voiding invoice.");
    } finally {
      setActionLoading(false);
    }
  };

  // Process Refund
  const handleProcessRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/finance/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: refundForm.paymentId,
          amount: parseFloat(refundForm.amount),
          reason: refundForm.reason,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMessage("Payment refund processed successfully.");
        setRefundModalOpen(false);
        fetchData();
      } else {
        setErrorMessage(json.message || "Failed to process refund.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error processing refund.");
    } finally {
      setActionLoading(false);
    }
  };

  // Create Category Submit
  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch("/api/finance/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCategoryForm),
      });
      const json = await res.json();
      if (res.ok) {
        setSuccessMessage("Fee category registered.");
        setCategoryModalOpen(false);
        setNewCategoryForm({ name: "", code: "", description: "" });
        fetchData();
      } else {
        setErrorMessage(json.message || "Category creation failed.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error registering category.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (invoiceStatusFilter !== "ALL" && inv.status !== invoiceStatusFilter) return false;
    if (invoiceSearch) {
      const q = invoiceSearch.toLowerCase();
      return (
        inv.invoiceNumber?.toLowerCase().includes(q) ||
        inv.studentName?.toLowerCase().includes(q) ||
        inv.studentAdmissionNumber?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Payments
  const filteredPayments = payments.filter((p) => {
    if (paymentSearch) {
      const q = paymentSearch.toLowerCase();
      return (
        p.paymentNumber?.toLowerCase().includes(q) ||
        p.studentName?.toLowerCase().includes(q) ||
        p.reference?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb Context */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-slate-500">
            <span>Finance & Institutional Accounts</span>
            <span>/</span>
            <span className="text-slate-900 font-semibold">Phase 9 Compliant</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            School Financial Engine & Treasury
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Tariff structures, batch invoicing, double-entry ledgers, automated concessions, and aged debtor recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-9 gap-1.5 text-xs font-medium"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={() => setPaymentModalOpen(true)}
            className="h-9 gap-1.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* Global Alerts */}
      {successMessage && (
        <div className="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50 text-emerald-900 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center justify-between p-3 border border-rose-200 bg-rose-50 text-rose-900 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Anti-AI Slop Navigation: Clean Horizontal Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto text-xs font-medium gap-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "overview"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          Financial Overview
        </button>

        <button
          onClick={() => setActiveTab("invoices")}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "invoices"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          Invoices & Billing ({invoices.length})
        </button>

        <button
          onClick={() => setActiveTab("payments")}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "payments"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          Collections & Receipts ({payments.length})
        </button>

        <button
          onClick={() => setActiveTab("structures")}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "structures"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          Fee Schedules & Tariffs ({structures.length})
        </button>

        <button
          onClick={() => setActiveTab("waivers")}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "waivers"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          Scholarships & Waivers ({waivers.length})
        </button>

        <button
          onClick={() => setActiveTab("debtors")}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "debtors"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          Aged Debtors & Arrears
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`px-4 py-2.5 border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "ledger"
              ? "border-slate-900 text-slate-900 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
          }`}
        >
          Statement of Account (Ledger)
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW TAB */}
      {/* ========================================================================= */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Top 6 KPI Metric Cards (Zero-Pill, Typographic) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-mono uppercase text-slate-500">Total Invoiced</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {formatCurrency(overview?.metrics?.totalInvoiced || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Active term billings</span>
            </div>

            <div className="border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-mono uppercase text-slate-500">Collected Revenue</span>
              <p className="text-xl font-bold text-emerald-700 mt-1">
                {formatCurrency(overview?.metrics?.totalCollected || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Settled funds received</span>
            </div>

            <div className="border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-mono uppercase text-slate-500">Outstanding Arrears</span>
              <p className="text-xl font-bold text-rose-700 mt-1">
                {formatCurrency(overview?.metrics?.totalOutstanding || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Unpaid institutional debt</span>
            </div>

            <div className="border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-mono uppercase text-slate-500">Collection Rate</span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {overview?.metrics?.collectionRatePercentage || 0}%
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Realized recovery ratio</span>
            </div>

            <div className="border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-mono uppercase text-slate-500">Waivers Granted</span>
              <p className="text-xl font-bold text-slate-800 mt-1">
                {formatCurrency(overview?.metrics?.totalWaiversGranted || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Scholarships & concessions</span>
            </div>

            <div className="border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-mono uppercase text-slate-500">Today's Collections</span>
              <p className="text-xl font-bold text-emerald-800 mt-1">
                {formatCurrency(overview?.metrics?.todayCollections || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Daily till reconciliations</span>
            </div>
          </div>

          {/* Collection Progress & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Distribution by Fee Category */}
            <div className="border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold text-slate-900">Revenue by Fee Category</h3>
                <span className="text-xs text-slate-500 font-mono">Terminal Allocations</span>
              </div>

              <div className="space-y-2.5">
                {(overview?.categoryBreakdown || []).map((cat: any, idx: number) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-700">
                      <span className="font-medium">{cat.categoryName}</span>
                      <span className="font-mono text-slate-900">
                        {formatCurrency(cat.amount)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 overflow-hidden">
                      <div
                        className="bg-slate-900 h-1.5 transition-all duration-300"
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {(!overview?.categoryBreakdown || overview.categoryBreakdown.length === 0) && (
                  <p className="text-xs text-slate-400 py-4 text-center">No category billings yet recorded.</p>
                )}
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="border border-slate-200 bg-white p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-semibold text-slate-900">Payment Channel Breakdown</h3>
                <span className="text-xs text-slate-500 font-mono">Settled Transactions</span>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {(overview?.paymentMethodBreakdown || []).map((pm: any, idx: number) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-400" />
                      <span className="font-medium text-slate-800">{pm.method.replace(/_/g, " ")}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-slate-900 block font-mono">
                        {formatCurrency(pm.amount)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{pm.count} transaction(s)</span>
                    </div>
                  </div>
                ))}
                {(!overview?.paymentMethodBreakdown || overview.paymentMethodBreakdown.length === 0) && (
                  <p className="text-xs text-slate-400 py-4 text-center">No payments logged yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Financial Transactions Feed */}
          <div className="border border-slate-200 bg-white">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Recent Financial Transactions</h3>
              <span className="text-xs text-slate-500 font-mono">Real-time ledger entries</span>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {(overview?.recentTransactions || []).map((tx: any) => (
                <div key={tx.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-7 h-7 flex items-center justify-center font-bold text-[10px] ${
                        tx.type === "PAYMENT" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {tx.type === "PAYMENT" ? "PAY" : "INV"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{tx.referenceNumber}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-700">{tx.studentName}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(tx.date).toLocaleDateString()} · Status: {tx.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-semibold font-mono block ${
                        tx.type === "PAYMENT" ? "text-emerald-700" : "text-slate-900"
                      }`}
                    >
                      {tx.type === "PAYMENT" ? "+" : ""}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. INVOICES & BILLING TAB */}
      {/* ========================================================================= */}
      {activeTab === "invoices" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search invoice number, student name, matric..."
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
                className="w-full text-xs bg-transparent border-0 focus:ring-0 p-0 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Segmented Filter */}
              <div className="flex items-center border border-slate-200 text-xs">
                {["ALL", "ISSUED", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setInvoiceStatusFilter(st)}
                    className={`px-2.5 py-1.5 transition-colors ${
                      invoiceStatusFilter === st
                        ? "bg-slate-900 text-white font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {st.replace(/_/g, " ")}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchModalOpen(true)}
                className="h-8 text-xs gap-1 border-slate-300"
              >
                <Layers className="h-3.5 w-3.5" />
                Batch Billing
              </Button>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Student & Class</th>
                  <th className="py-2.5 px-3">Issue Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Subtotal</th>
                  <th className="py-2.5 px-3 text-right">Concession</th>
                  <th className="py-2.5 px-3 text-right">Total</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-900 block">{inv.studentName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {inv.studentAdmissionNumber} · {inv.className || "Class G10"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatCurrency(inv.subtotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                      {inv.waiverTotal > 0 || inv.discountTotal > 0
                        ? `-${formatCurrency(inv.waiverTotal + inv.discountTotal)}`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                      {formatCurrency(inv.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                      {formatCurrency(inv.paidAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(inv.balanceDue)}
                    </td>
                    <td className="py-2.5 px-3">
                      {/* Zero-Pill Text Badges */}
                      <span
                        className={`text-[10px] font-mono font-semibold ${
                          inv.status === "PAID"
                            ? "text-emerald-700"
                            : inv.status === "PARTIALLY_PAID"
                            ? "text-amber-700"
                            : inv.status === "OVERDUE"
                            ? "text-rose-700"
                            : inv.status === "VOID"
                            ? "text-slate-400 line-through"
                            : "text-slate-700"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(inv)}
                          className="h-7 px-2 text-[11px]"
                        >
                          View
                        </Button>

                        {inv.balanceDue > 0 && inv.status !== "VOID" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setPaymentForm({
                                ...paymentForm,
                                studentId: inv.studentId,
                                amount: String(inv.balanceDue),
                                invoiceId: inv.id,
                              });
                              setPaymentModalOpen(true);
                            }}
                            className="h-7 px-2 text-[11px] text-emerald-800 border-emerald-300"
                          >
                            Pay
                          </Button>
                        )}

                        {inv.paidAmount === 0 && inv.status !== "VOID" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setVoidModalOpen(true);
                            }}
                            className="h-7 px-2 text-[11px] text-rose-600 hover:text-rose-800"
                          >
                            Void
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                      No invoices match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. COLLECTIONS & PAYMENTS TAB */}
      {/* ========================================================================= */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search payment number, transaction reference..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                className="w-full text-xs bg-transparent border-0 focus:ring-0 p-0 text-slate-900 placeholder:text-slate-400"
              />
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => setPaymentModalOpen(true)}
              className="h-8 text-xs gap-1 bg-slate-900 text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Collect Payment
            </Button>
          </div>

          <div className="border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">Payment #</th>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3">Reference / Transaction ID</th>
                  <th className="py-2.5 px-3">Payment Date</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  <th className="py-2.5 px-3 text-right">Allocated</th>
                  <th className="py-2.5 px-3 text-right">Surplus Credit</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Official Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => {
                  const receipt = receipts.find((r) => r.paymentId === p.id);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                        {p.paymentNumber}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-medium text-slate-900 block">{p.studentName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {p.studentAdmissionNumber}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-700">
                        {p.paymentMethod.replace(/_/g, " ")}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {p.reference || "N/A"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                        {formatCurrency(p.allocatedAmount)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {p.surplusAmount > 0 ? (
                          <span className="text-amber-800 font-semibold">
                            +{formatCurrency(p.surplusAmount)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-mono font-semibold ${
                            p.status === "COMPLETED"
                              ? "text-emerald-700"
                              : p.status === "REFUNDED"
                              ? "text-rose-700"
                              : "text-amber-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {receipt && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedReceipt(receipt)}
                              className="h-7 px-2 text-[11px] gap-1"
                            >
                              <Printer className="h-3 w-3" />
                              Receipt
                            </Button>
                          )}

                          {p.status === "COMPLETED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRefundForm({
                                  paymentId: p.id,
                                  amount: String(p.amount),
                                  reason: "",
                                });
                                setRefundModalOpen(true);
                              }}
                              className="h-7 px-2 text-[11px] text-slate-500 hover:text-rose-700"
                            >
                              Refund
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FEE SCHEDULES & TARIFF STRUCTURES TAB */}
      {/* ========================================================================= */}
      {activeTab === "structures" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Institutional Fee Schedules</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Version-controlled tariff blueprints. Updates create immutable versions to preserve historical records.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCategoryModalOpen(true)}
                className="h-8 text-xs gap-1"
              >
                <Plus className="h-3 w-3" />
                New Category
              </Button>
            </div>
          </div>

          {/* Structures List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {structures.map((struct) => (
              <div key={struct.id} className="border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{struct.name}</h4>
                      <span className="font-mono text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 border border-slate-200">
                        v{struct.version}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{struct.description || "Term fee schedule"}</p>
                  </div>

                  <span className="text-base font-bold font-mono text-slate-900">
                    {formatCurrency(struct.totalAmount)}
                  </span>
                </div>

                <div className="border-t border-slate-100 pt-2 text-xs space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1">
                    Itemized Components ({struct.items?.length || 0})
                  </span>
                  {(struct.items || []).map((it: any) => (
                    <div key={it.id} className="flex items-center justify-between text-slate-700">
                      <span>
                        {it.name}{" "}
                        <span className="text-[10px] text-slate-400">({it.categoryName})</span>
                      </span>
                      <span className="font-mono font-medium">{formatCurrency(it.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Registered Categories List */}
          <div className="border border-slate-200 bg-white p-4 space-y-3">
            <h4 className="text-xs font-mono uppercase text-slate-500 font-semibold">
              Configured Fee Categories ({categories.length})
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
              {categories.map((c) => (
                <div key={c.id} className="border border-slate-100 bg-slate-50/50 p-2.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{c.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">{c.code}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{c.description || "General category"}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. WAIVERS & SCHOLARSHIPS TAB */}
      {/* ========================================================================= */}
      {activeTab === "waivers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Scholarships & Institutional Concessions</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Authorized bursary awards, merit grants, sibling concessions, and faculty dependent relief.
              </p>
            </div>

            <Button
              variant="default"
              size="sm"
              onClick={() => setWaiverModalOpen(true)}
              className="h-8 text-xs gap-1 bg-slate-900 text-white"
            >
              <Percent className="h-3.5 w-3.5" />
              Apply Concession
            </Button>
          </div>

          <div className="border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Concession Category</th>
                  <th className="py-2.5 px-3">Type & Value</th>
                  <th className="py-2.5 px-3 text-right">Relief Amount</th>
                  <th className="py-2.5 px-3">Target Invoice</th>
                  <th className="py-2.5 px-3">Justification Reason</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date Granted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {waivers.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-900">{w.studentName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-700">
                      {w.category.replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {w.discountType === "PERCENTAGE" ? `${w.value}%` : formatCurrency(w.value)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(w.calculatedAmount)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {w.invoiceNumber || "Account-Wide"}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">{w.reason}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] font-mono font-bold text-emerald-700">{w.status}</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. AGED DEBTORS & ARREARS SCHEDULE TAB */}
      {/* ========================================================================= */}
      {activeTab === "debtors" && (
        <div className="space-y-6">
          {/* Aging Schedule Buckets */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-mono uppercase text-slate-500">Total Arrears</span>
              <p className="text-xl font-bold text-rose-700 mt-1">
                {formatCurrency(debtorsData?.summary?.totalDebt || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">
                {debtorsData?.summary?.totalDebtorsCount || 0} student(s) in debt
              </span>
            </div>

            <div className="border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-mono uppercase text-slate-500">Current (0–30 Days)</span>
              <p className="text-xl font-bold text-slate-800 mt-1">
                {formatCurrency(debtorsData?.summary?.current30Days || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Standard grace period</span>
            </div>

            <div className="border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-mono uppercase text-slate-500">31–60 Days</span>
              <p className="text-xl font-bold text-amber-700 mt-1">
                {formatCurrency(debtorsData?.summary?.days31To60 || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">First reminder dispatched</span>
            </div>

            <div className="border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-mono uppercase text-slate-500">61–90 Days</span>
              <p className="text-xl font-bold text-orange-700 mt-1">
                {formatCurrency(debtorsData?.summary?.days61To90 || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Second notice stage</span>
            </div>

            <div className="border border-slate-200 bg-white p-3.5">
              <span className="text-[11px] font-mono uppercase text-slate-500">90+ Days Overdue</span>
              <p className="text-xl font-bold text-rose-800 mt-1">
                {formatCurrency(debtorsData?.summary?.over90Days || 0)}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Critical debt recovery</span>
            </div>
          </div>

          {/* Debtors Schedule Table */}
          <div className="border border-slate-200 bg-white overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 font-mono uppercase text-[10px]">
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Admission Number</th>
                  <th className="py-2.5 px-3">Class</th>
                  <th className="py-2.5 px-3 text-right">Total Invoiced</th>
                  <th className="py-2.5 px-3 text-right">Total Settled</th>
                  <th className="py-2.5 px-3 text-right">Outstanding Arrears</th>
                  <th className="py-2.5 px-3">Oldest Due Date</th>
                  <th className="py-2.5 px-3">Aging Duration</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(debtorsData?.debtors || []).map((d: any) => (
                  <tr key={d.studentId} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{d.studentName}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">{d.admissionNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{d.className}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      {formatCurrency(d.totalInvoiced)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                      {formatCurrency(d.totalPaid)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700">
                      {formatCurrency(d.balanceDue)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600">
                      {new Date(d.oldestDueDate).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      <span
                        className={`text-[10px] font-bold ${
                          d.daysOverdue > 60
                            ? "text-rose-700"
                            : d.daysOverdue > 30
                            ? "text-amber-700"
                            : "text-slate-700"
                        }`}
                      >
                        {d.daysOverdue} days overdue
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          handleStudentLedgerChange(d.studentId);
                          setActiveTab("ledger");
                        }}
                        className="h-7 px-2 text-[11px]"
                      >
                        Ledger
                      </Button>
                    </td>
                  </tr>
                ))}
                {(!debtorsData?.debtors || debtorsData.debtors.length === 0) && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                      No overdue arrears currently recorded across campuses.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. STUDENT LEDGER / STATEMENT OF ACCOUNT TAB */}
      {/* ========================================================================= */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 border border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono uppercase text-slate-500">Select Student Account:</span>
              <select
                value={selectedLedgerStudentId}
                onChange={(e) => handleStudentLedgerChange(e.target.value)}
                className="text-xs border border-slate-300 px-3 py-1.5 bg-white font-medium text-slate-900"
              >
                {studentsList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.admissionNumber}) — {s.class}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="h-8 text-xs gap-1"
            >
              <Printer className="h-3 w-3" />
              Print Statement
            </Button>
          </div>

          {selectedStudentLedger && (
            <div className="border border-slate-200 bg-white p-6 space-y-6">
              {/* Statement Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b border-slate-200 pb-4 gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">APEX INTERNATIONAL SCHOOL</h2>
                  <p className="text-xs text-slate-500">Official Student Financial Statement of Account</p>
                  <div className="mt-3 text-xs space-y-0.5">
                    <p>
                      <strong className="text-slate-700">Student:</strong>{" "}
                      {selectedStudentLedger.student?.name}
                    </p>
                    <p>
                      <strong className="text-slate-700">Matric/Admission:</strong>{" "}
                      {selectedStudentLedger.student?.admissionNumber}
                    </p>
                    <p>
                      <strong className="text-slate-700">Class:</strong>{" "}
                      {selectedStudentLedger.student?.className}
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="border border-slate-200 bg-slate-50 p-3 text-right">
                    <span className="text-[10px] font-mono uppercase text-slate-500 block">
                      Current Net Outstanding
                    </span>
                    <span className="text-2xl font-bold font-mono text-slate-900">
                      {formatCurrency(selectedStudentLedger.currentBalanceDue)}
                    </span>
                    {selectedStudentLedger.availableCreditBalance > 0 && (
                      <span className="text-xs text-emerald-700 font-mono block mt-1">
                        Surplus Credit: {formatCurrency(selectedStudentLedger.availableCreditBalance)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Running Ledger Entries */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono uppercase text-[10px]">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Reference #</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3 text-right">Debit (Invoiced)</th>
                      <th className="py-2 px-3 text-right">Credit (Paid / Waived)</th>
                      <th className="py-2 px-3 text-right">Running Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {(selectedStudentLedger.entries || []).map((entry: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 text-slate-600">
                          {new Date(entry.date).toLocaleDateString()}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-900">{entry.reference}</td>
                        <td className="py-2 px-3 font-sans text-slate-700">{entry.description}</td>
                        <td className="py-2 px-3 text-right text-slate-900">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right text-emerald-700">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(entry.runningBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: INVOICE DETAILS PREVIEW */}
      {/* ========================================================================= */}
      {selectedInvoice && !voidModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="font-mono text-xs text-slate-500 uppercase">Official Tuition Invoice</span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Bill To</span>
                <span className="font-bold text-slate-900 block">{selectedInvoice.studentName}</span>
                <span className="text-slate-500 font-mono">
                  {selectedInvoice.studentAdmissionNumber} · {selectedInvoice.className}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Billing Dates</span>
                <span className="text-slate-700 block">
                  Issued: {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                </span>
                <span className="text-slate-900 font-semibold font-mono block">
                  Due: {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono uppercase text-[10px]">
                    <th className="py-2 px-3">Item Description</th>
                    <th className="py-2 px-3 text-right">Qty</th>
                    <th className="py-2 px-3 text-right">Unit Price</th>
                    <th className="py-2 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="py-2 px-3 font-medium text-slate-800">{it.name}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">{it.quantity}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-600">
                        {formatCurrency(it.unitAmount)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(it.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations Summary */}
            <div className="border-t border-slate-200 pt-3 text-xs space-y-1 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>{formatCurrency(selectedInvoice.subtotal)}</span>
              </div>
              {selectedInvoice.waiverTotal > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Concessions / Waivers:</span>
                  <span>-{formatCurrency(selectedInvoice.waiverTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-1 text-sm">
                <span>Total Amount Due:</span>
                <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-emerald-800">
                <span>Amount Settled:</span>
                <span>{formatCurrency(selectedInvoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between text-rose-700 font-bold text-sm">
                <span>Balance Remaining:</span>
                <span>{formatCurrency(selectedInvoice.balanceDue)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 text-xs gap-1"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Invoice
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setSelectedInvoice(null)}
                className="h-8 text-xs bg-slate-900 text-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL RECEIPT PREVIEW */}
      {/* ========================================================================= */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="font-mono text-[10px] text-emerald-700 uppercase font-bold tracking-wider">
                  Payment Cleared
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  RECEIPT {selectedReceipt.receiptNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="border border-slate-200 bg-slate-50/50 p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Student:</span>
                <span className="font-bold text-slate-900">{selectedReceipt.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Admission #:</span>
                <span className="font-mono text-slate-800">{selectedReceipt.studentAdmissionNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-mono text-slate-800">
                  {selectedReceipt.paymentMethod?.replace(/_/g, " ")}
                </span>
              </div>
              {selectedReceipt.paymentReference && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Ref:</span>
                  <span className="font-mono text-slate-800">{selectedReceipt.paymentReference}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Date Issued:</span>
                <span className="font-mono text-slate-800">
                  {new Date(selectedReceipt.issuedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                <span className="text-slate-900">Total Paid:</span>
                <span className="text-emerald-800 font-mono">
                  {formatCurrency(selectedReceipt.amountPaid)}
                </span>
              </div>
              <div className="flex justify-between text-slate-700 font-mono text-xs">
                <span>Remaining Account Debt:</span>
                <span>{formatCurrency(selectedReceipt.outstandingBalance)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 pt-3 flex justify-between items-center text-[10px] text-slate-400 font-mono">
              <span>Cashier / Bursar Authorized</span>
              <span>Electronic Audit Hash Verified</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 text-xs gap-1"
              >
                <Printer className="h-3.5 w-3.5" />
                Print Receipt
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setSelectedReceipt(null)}
                className="h-8 text-xs bg-slate-900 text-white"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: BATCH INVOICING */}
      {/* ========================================================================= */}
      {batchModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleBatchInvoiceSubmit}
            className="bg-white border border-slate-200 max-w-md w-full p-5 space-y-4"
          >
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-base font-bold text-slate-900">Batch Invoice Generation</h3>
              <p className="text-xs text-slate-500">
                Emit tuition invoices for an entire cohort with automatic deduplication.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Target Class Cohort</label>
                <select
                  value={batchClassId}
                  onChange={(e) => setBatchClassId(e.target.value)}
                  className="w-full border border-slate-300 p-2 text-xs bg-white text-slate-900"
                >
                  <option value="class-g10-a">Grade 10 - Section A (High School)</option>
                  <option value="cls-jss1-2526">Junior Secondary 1 - Section A</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Fee Schedule Structure</label>
                <select
                  value={batchStructureId}
                  onChange={(e) => setBatchStructureId(e.target.value)}
                  className="w-full border border-slate-300 p-2 text-xs bg-white text-slate-900"
                >
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (v{s.version}) — {formatCurrency(s.totalAmount)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Payment Due Date</label>
                <input
                  type="date"
                  required
                  value={batchDueDate}
                  onChange={(e) => setBatchDueDate(e.target.value)}
                  className="w-full border border-slate-300 p-2 text-xs bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBatchModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={actionLoading}
                className="h-8 text-xs bg-slate-900 text-white"
              >
                {actionLoading ? "Generating..." : "Generate Batch"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RECORD PAYMENT */}
      {/* ========================================================================= */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleRecordPaymentSubmit}
            className="bg-white border border-slate-200 max-w-md w-full p-5 space-y-4"
          >
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-base font-bold text-slate-900">Record Fee Collection</h3>
              <p className="text-xs text-slate-500">
                Log funds received. Overpayments will automatically credit the student's ledger.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Student</label>
                <select
                  value={paymentForm.studentId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, studentId: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs bg-white text-slate-900"
                >
                  {studentsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs bg-white text-slate-900"
                >
                  <option value="BANK_TRANSFER">Bank Wire / Electronic Transfer</option>
                  <option value="POS">Point of Sale (Debit/Credit Card)</option>
                  <option value="CASH">Cash Over-The-Counter</option>
                  <option value="CHEQUE">Bank Cheque / Draft</option>
                  <option value="ONLINE">Online Portal</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Reference / Teller Number</label>
                <input
                  type="text"
                  placeholder="e.g. TRX-CHASE-88992"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPaymentModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={actionLoading}
                className="h-8 text-xs bg-emerald-800 text-white hover:bg-emerald-900"
              >
                {actionLoading ? "Processing..." : "Confirm & Issue Receipt"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: APPLY WAIVER */}
      {/* ========================================================================= */}
      {waiverModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleApplyWaiverSubmit}
            className="bg-white border border-slate-200 max-w-md w-full p-5 space-y-4"
          >
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-base font-bold text-slate-900">Apply Fee Concession or Scholarship</h3>
              <p className="text-xs text-slate-500">
                Grant authorized bursary relief with mandatory auditable justification.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Student</label>
                <select
                  value={waiverForm.studentId}
                  onChange={(e) => setWaiverForm({ ...waiverForm, studentId: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs bg-white text-slate-900"
                >
                  {studentsList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Concession Category</label>
                <select
                  value={waiverForm.category}
                  onChange={(e) => setWaiverForm({ ...waiverForm, category: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs bg-white text-slate-900"
                >
                  <option value="MERIT_SCHOLARSHIP">Merit Scholarship (Dean Award)</option>
                  <option value="NEED_BASED">Need-Based Financial Aid</option>
                  <option value="STAFF_CHILD">Faculty / Staff Dependent Relief</option>
                  <option value="SIBLING_DISCOUNT">Sibling Enrollment Concession</option>
                  <option value="EARLY_BIRD">Early Settlement Discount</option>
                  <option value="SPECIAL_CONCESSION">Special Board Concession</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Type</label>
                  <select
                    value={waiverForm.discountType}
                    onChange={(e) => setWaiverForm({ ...waiverForm, discountType: e.target.value })}
                    className="w-full border border-slate-300 p-2 text-xs bg-white text-slate-900"
                  >
                    <option value="FIXED_AMOUNT">Fixed Amount ($)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="font-medium text-slate-700 block mb-1">Value</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={waiverForm.value}
                    onChange={(e) => setWaiverForm({ ...waiverForm, value: e.target.value })}
                    className="w-full border border-slate-300 p-2 text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Reason / Board Authorization</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Official bursary grant reason..."
                  value={waiverForm.reason}
                  onChange={(e) => setWaiverForm({ ...waiverForm, reason: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setWaiverModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={actionLoading}
                className="h-8 text-xs bg-slate-900 text-white"
              >
                {actionLoading ? "Applying..." : "Grant Relief"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VOID INVOICE */}
      {/* ========================================================================= */}
      {voidModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleVoidInvoiceSubmit}
            className="bg-white border border-slate-200 max-w-md w-full p-5 space-y-4"
          >
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-base font-bold text-rose-700">Void Invoice</h3>
              <p className="text-xs text-slate-500">
                Voiding {selectedInvoice.invoiceNumber} will cancel the debt. This action is permanently audited.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Mandatory Void Justification</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this invoice is being voided..."
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setVoidModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={actionLoading}
                className="h-8 text-xs bg-rose-700 text-white hover:bg-rose-800"
              >
                {actionLoading ? "Voiding..." : "Confirm Void"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROCESS REFUND */}
      {/* ========================================================================= */}
      {refundModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleProcessRefundSubmit}
            className="bg-white border border-slate-200 max-w-md w-full p-5 space-y-4"
          >
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-base font-bold text-slate-900">Process Payment Refund</h3>
              <p className="text-xs text-slate-500">
                Authorize an auditable refund against this transaction.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Refund Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={refundForm.amount}
                  onChange={(e) => setRefundForm({ ...refundForm, amount: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Reason for Refund</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Justification for refund..."
                  value={refundForm.reason}
                  onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRefundModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={actionLoading}
                className="h-8 text-xs bg-slate-900 text-white"
              >
                {actionLoading ? "Processing..." : "Process Refund"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NEW CATEGORY */}
      {/* ========================================================================= */}
      {categoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCreateCategorySubmit}
            className="bg-white border border-slate-200 max-w-md w-full p-5 space-y-4"
          >
            <div className="border-b border-slate-200 pb-2">
              <h3 className="text-base font-bold text-slate-900">New Fee Category</h3>
              <p className="text-xs text-slate-500">Create a configurable revenue category.</p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium text-slate-700 block mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Laboratory Fee"
                  value={newCategoryForm.name}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Code (Uppercase, No spaces)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SCI_LAB"
                  value={newCategoryForm.code}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, code: e.target.value.toUpperCase() })}
                  className="w-full border border-slate-300 p-2 text-xs font-mono text-slate-900"
                />
              </div>

              <div>
                <label className="font-medium text-slate-700 block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Category notes..."
                  value={newCategoryForm.description}
                  onChange={(e) => setNewCategoryForm({ ...newCategoryForm, description: e.target.value })}
                  className="w-full border border-slate-300 p-2 text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCategoryModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={actionLoading}
                className="h-8 text-xs bg-slate-900 text-white"
              >
                {actionLoading ? "Creating..." : "Save Category"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
