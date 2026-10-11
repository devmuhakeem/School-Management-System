import * as React from "react";
import {
  BarChart3,
  TrendingUp,
  GraduationCap,
  CalendarCheck2,
  Receipt,
  Building,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  RefreshCw,
  Layers,
  BookOpen,
  Bus,
  Mail,
  Users,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/lib/auth/AuthContext";
import { KpiCard } from "./components/KpiCard";
import { BarChart, LineChart, DonutChart } from "./components/ChartComponents";
import { ReportFilterBar } from "./components/ReportFilterBar";
import { ReportTableComponent } from "./components/ReportTableComponent";
import {
  ExecutiveDashboardData,
  AcademicAnalyticsData,
  AttendanceAnalyticsData,
  FinanceAnalyticsData,
  OperationsAnalyticsData,
  TabularReportResult,
} from "@/services/reporting.service";
import { ReportCatalogItem } from "@/lib/reporting/report-catalog";
import { RawReportFilterInput } from "@/lib/validations/reporting";

export function ReportsView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState<string>("executive");

  // Filter state
  const [filters, setFilters] = React.useState<RawReportFilterInput>({
    campusId: user?.activeCampus?.id || undefined,
    academicYearId: "ay-2025-26",
    termId: undefined,
    chronicThreshold: 85,
  });

  // State for modules
  const [catalog, setCatalog] = React.useState<ReportCatalogItem[]>([]);
  const [selectedReportKey, setSelectedReportKey] = React.useState<string>("student_enrollment");
  const [executiveData, setExecutiveData] = React.useState<ExecutiveDashboardData | null>(null);
  const [academicData, setAcademicData] = React.useState<AcademicAnalyticsData | null>(null);
  const [attendanceData, setAttendanceData] = React.useState<AttendanceAnalyticsData | null>(null);
  const [financeData, setFinanceData] = React.useState<FinanceAnalyticsData | null>(null);
  const [operationsData, setOperationsData] = React.useState<OperationsAnalyticsData | null>(null);
  const [tabularData, setTabularData] = React.useState<TabularReportResult | null>(null);

  const [isLoading, setIsLoading] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Helper to build query parameters
  const buildQuery = (overrideFilters?: RawReportFilterInput) => {
    const f = overrideFilters || filters;
    const params = new URLSearchParams();
    if (f.campusId) params.append("campusId", f.campusId);
    if (f.academicYearId) params.append("academicYearId", f.academicYearId);
    if (f.termId) params.append("termId", f.termId);
    if (f.startDate) params.append("startDate", f.startDate);
    if (f.endDate) params.append("endDate", f.endDate);
    if (f.classId) params.append("classId", f.classId);
    if (f.chronicThreshold) params.append("chronicThreshold", String(f.chronicThreshold));
    return params.toString();
  };

  // Fetch report catalog once
  React.useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/reports/catalog");
        if (res.ok) {
          const json = await res.json();
          setCatalog(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load report catalog", err);
      }
    }
    loadCatalog();
  }, []);

  // Fetch data for the active tab
  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const q = buildQuery();

      if (activeTab === "executive") {
        const res = await fetch(`/api/reports/dashboard?${q}`);
        if (!res.ok) throw new Error("Failed to load executive dashboard.");
        const json = await res.json();
        setExecutiveData(json.data);
      } else if (activeTab === "academics") {
        const res = await fetch(`/api/reports/academics?${q}`);
        if (!res.ok) throw new Error("Failed to load academic analytics.");
        const json = await res.json();
        setAcademicData(json.data);
      } else if (activeTab === "attendance") {
        const res = await fetch(`/api/reports/attendance?${q}`);
        if (!res.ok) throw new Error("Failed to load attendance analytics.");
        const json = await res.json();
        setAttendanceData(json.data);
      } else if (activeTab === "finance") {
        const res = await fetch(`/api/reports/finance?${q}`);
        if (!res.ok) throw new Error("Failed to load finance analytics.");
        const json = await res.json();
        setFinanceData(json.data);
      } else if (activeTab === "operations") {
        const res = await fetch(`/api/reports/operations?${q}`);
        if (!res.ok) throw new Error("Failed to load operations analytics.");
        const json = await res.json();
        setOperationsData(json.data);
      } else if (activeTab === "reports") {
        const res = await fetch(`/api/reports/data/${selectedReportKey}?${q}`);
        if (!res.ok) throw new Error(`Failed to generate report "${selectedReportKey}".`);
        const json = await res.json();
        setTabularData(json.data);
      }
    } catch (err: any) {
      setError(err.message || "Failed to retrieve reporting metrics.");
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, selectedReportKey, filters]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Export
  const handleExport = async (format: "csv" | "json") => {
    setIsExporting(true);
    try {
      const q = buildQuery();
      const exportUrl = `/api/reports/export?reportKey=${selectedReportKey}&format=${format}&${q}`;
      const res = await fetch(exportUrl);
      if (!res.ok) throw new Error("Export generation failed on server.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${selectedReportKey}-${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || "Failed to export report.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setFilters({
      campusId: user?.activeCampus?.id || undefined,
      academicYearId: "ay-2025-26",
      termId: undefined,
      chronicThreshold: 85,
    });
  };

  const activeCatalogItem = catalog.find((c) => c.key === selectedReportKey);

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Reports, Analytics & Management Dashboards
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-mono">
            Phase 13 · Cross-module business intelligence, executive metrics, and RFC 4180 audit-logged exports
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
            className="h-9 text-xs font-mono border-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Reusable Filter Bar */}
      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={handleResetFilters}
        userCampusId={user?.activeCampus?.id}
        supportedFilters={activeTab === "reports" ? activeCatalogItem?.supportedFilters : undefined}
      />

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-100 p-1 border border-slate-200">
          <TabsTrigger value="executive" className="text-xs font-medium">
            Executive Overview
          </TabsTrigger>
          <TabsTrigger value="academics" className="text-xs font-medium">
            Academics
          </TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs font-medium">
            Attendance
          </TabsTrigger>
          <TabsTrigger value="finance" className="text-xs font-medium">
            Finance & Fees
          </TabsTrigger>
          <TabsTrigger value="operations" className="text-xs font-medium">
            Operations
          </TabsTrigger>
          <TabsTrigger value="reports" className="text-xs font-medium">
            Report Catalog & Exports
          </TabsTrigger>
        </TabsList>

        {error && (
          <ErrorState
            title="Failed to Load Reporting Data"
            message={error}
            onRetry={fetchData}
          />
        )}

        {isLoading && !error ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <LoadingSpinner size="lg" className="border-indigo-600 border-t-transparent" />
            <p className="mt-3 text-xs font-mono text-slate-500">
              Aggregating operational domain records...
            </p>
          </div>
        ) : null}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 1: EXECUTIVE MANAGEMENT DASHBOARD                              */}
        {/* ------------------------------------------------------------------ */}
        {!isLoading && !error && activeTab === "executive" && executiveData && (
          <TabsContent value="executive" className="space-y-6 m-0">
            {/* High Level KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Active Scholars"
                value={executiveData.metrics.students.totalActive}
                unit="students"
                subtext={`+${executiveData.metrics.students.newAdmissions} admissions`}
                icon={<Users className="h-4 w-4" />}
              />
              <KpiCard
                title="Institution Attendance"
                value={`${executiveData.metrics.attendance.averageRate}%`}
                unit="rate"
                subtext={`${executiveData.metrics.attendance.presentCount} present today`}
                icon={<CalendarCheck2 className="h-4 w-4 text-emerald-600" />}
              />
              <KpiCard
                title="Fee Collections"
                value={`$${(executiveData.metrics.finance.totalCollectedCents / 100).toLocaleString()}`}
                unit="collected"
                subtext={`${executiveData.metrics.finance.collectionRate}% collection rate`}
                icon={<Receipt className="h-4 w-4 text-amber-600" />}
              />
              <KpiCard
                title="Campus Operations"
                value={`${executiveData.metrics.operations.hostelOccupancyRate}%`}
                unit="hostel occ."
                subtext={`${executiveData.metrics.operations.transportScholarsAssigned} bus riders`}
                icon={<Building className="h-4 w-4 text-sky-600" />}
              />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Attendance Trends */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Attendance Presence Trends (Last 5 Days)
                  </CardTitle>
                  <CardDescription className="text-xs font-mono">
                    Daily marked student attendance percentages
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <LineChart
                    data={executiveData.charts.attendanceTrends.map((t) => ({
                      label: t.date,
                      value: t.rate,
                    }))}
                    height={190}
                    valueFormatter={(v) => `${v}%`}
                  />
                </CardContent>
              </Card>

              {/* Monthly Revenue Collections */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Fee Invoiced vs Collected (Monthly)
                  </CardTitle>
                  <CardDescription className="text-xs font-mono">
                    Financial progress across historical monthly billings
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <BarChart
                    data={executiveData.charts.financialCollectionTrends.map((c) => ({
                      label: c.month,
                      value: c.collected,
                      sublabel: `$${(c.collected / 1000).toFixed(0)}k`,
                      color: "#4338ca",
                    }))}
                    height={190}
                    valueFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                </CardContent>
              </Card>

              {/* Cohort Enrollment Breakdown */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Scholars by Class Cohort
                  </CardTitle>
                  <CardDescription className="text-xs font-mono">
                    Distribution of active roster across academic classes
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <BarChart
                    data={executiveData.charts.enrollmentByClass.map((e) => ({
                      label: e.className,
                      value: e.studentsCount,
                      color: "#0f766e",
                    }))}
                    height={190}
                  />
                </CardContent>
              </Card>

              {/* Institutional Grade Distribution */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Institutional Grade Distribution
                  </CardTitle>
                  <CardDescription className="text-xs font-mono">
                    Scores resolved against active Grading Scheme boundaries
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <BarChart
                    data={executiveData.charts.gradeDistribution.map((g) => ({
                      label: `Grade ${g.grade}`,
                      value: g.count,
                      sublabel: `${g.percentage}%`,
                      color: g.grade === "F" ? "#e11d48" : "#4f46e5",
                    }))}
                    height={190}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 2: ACADEMIC ANALYTICS                                          */}
        {/* ------------------------------------------------------------------ */}
        {!isLoading && !error && activeTab === "academics" && academicData && (
          <TabsContent value="academics" className="space-y-6 m-0">
            {/* Academic KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Assessments Conducted"
                value={academicData.summary.totalAssessments}
                unit="assessments"
                subtext={`${academicData.summary.totalSubmissions} submissions`}
              />
              <KpiCard
                title="Mean Score"
                value={`${academicData.summary.averageScore}%`}
                unit="mean"
                subtext="Institutional average"
              />
              <KpiCard
                title="Overall Pass Rate"
                value={`${academicData.summary.overallPassRate}%`}
                unit="success"
                subtext={`${academicData.summary.passCount} passed / ${academicData.summary.failCount} failed`}
              />
              <KpiCard
                title="Published Term Results"
                value={academicData.summary.publishedResultsCount}
                unit="sessions"
                subtext="Results locked & published"
              />
            </div>

            {/* Grade Scale Distribution */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Dynamic Grade Distribution (Phase 8 Scheme Source of Truth)
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  Calculated against active grading scale boundaries
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {academicData.gradeDistribution.map((g) => (
                    <div
                      key={g.grade}
                      className="p-3 bg-slate-50 border border-slate-200/80 text-center font-mono"
                    >
                      <span className="text-xs font-bold text-slate-500 uppercase">
                        Grade {g.grade}
                      </span>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{g.count}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {g.percentage}% · {g.minScore}-{g.maxScore}%
                      </p>
                      <span className="inline-block mt-2 text-[10px] text-slate-600 font-medium font-sans">
                        {g.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Subject Performance Breakdown */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Subject-Level Performance Matrix
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  Mean score, assessment volume, and passing percentages across subjects
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px]">
                        <th className="py-2.5 px-3 text-left">Subject Code</th>
                        <th className="py-2.5 px-3 text-left">Subject Title</th>
                        <th className="py-2.5 px-3 text-right">Candidates</th>
                        <th className="py-2.5 px-3 text-right">Mean Score</th>
                        <th className="py-2.5 px-3 text-right">High / Low</th>
                        <th className="py-2.5 px-3 text-right">Pass Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {academicData.subjectPerformance.map((s) => (
                        <tr key={s.subjectId} className="hover:bg-slate-50/70">
                          <td className="py-2 px-3 font-bold text-indigo-700">{s.subjectCode}</td>
                          <td className="py-2 px-3 font-sans text-slate-800">{s.subjectName}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{s.studentsCount}</td>
                          <td className="py-2 px-3 text-right font-bold text-slate-900">{s.averageScore}%</td>
                          <td className="py-2 px-3 text-right text-slate-500">{s.highestScore}% / {s.lowestScore}%</td>
                          <td className="py-2 px-3 text-right font-medium text-emerald-700">{s.passRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 3: ATTENDANCE ANALYTICS & CHRONIC ABSENCE                      */}
        {/* ------------------------------------------------------------------ */}
        {!isLoading && !error && activeTab === "attendance" && attendanceData && (
          <TabsContent value="attendance" className="space-y-6 m-0">
            {/* Attendance KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Overall Attendance Rate"
                value={`${attendanceData.summary.overallAttendanceRate}%`}
                unit="presence"
                subtext={`${attendanceData.summary.presentCount} present / ${attendanceData.summary.absentCount} absent`}
              />
              <KpiCard
                title="Marked Registers"
                value={attendanceData.summary.totalRecords}
                unit="entries"
                subtext="Session rosters evaluated"
              />
              <KpiCard
                title="Tardy & Excused"
                value={`${attendanceData.summary.lateCount} / ${attendanceData.summary.excusedCount}`}
                unit="late / exc."
                subtext="Medical notes & tardiness"
              />
              <KpiCard
                title="Chronic Absence Alerts"
                value={attendanceData.summary.chronicAbsenceCount}
                unit="scholars"
                subtext={`Rate < ${attendanceData.summary.chronicThresholdUsed}% threshold`}
                icon={<AlertTriangle className="h-4 w-4 text-amber-600" />}
              />
            </div>

            {/* Daily Attendance Trend & Class Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Chronological Daily Presence Rate
                  </CardTitle>
                  <CardDescription className="text-xs font-mono">
                    Attendance percentage over the evaluation window
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <LineChart
                    data={attendanceData.dailyTrends.map((d) => ({
                      label: d.date,
                      value: d.attendanceRate,
                    }))}
                    height={190}
                    valueFormatter={(v) => `${v}%`}
                  />
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Attendance by Class Cohort
                  </CardTitle>
                  <CardDescription className="text-xs font-mono">
                    Comparison of presence rates across active cohorts
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <BarChart
                    data={attendanceData.classBreakdown.map((c) => ({
                      label: c.className,
                      value: c.attendanceRate,
                      sublabel: `${c.attendanceRate}%`,
                      color: c.attendanceRate < 90 ? "#d97706" : "#059669",
                    }))}
                    height={190}
                    valueFormatter={(v) => `${v}%`}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Chronic Absentees Alert Table */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Chronic Absence Alert Roster (Below {attendanceData.summary.chronicThresholdUsed}%)
                    </CardTitle>
                    <CardDescription className="text-xs font-mono">
                      Targeted pastoral intervention register
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {attendanceData.chronicAbsentees.length === 0 ? (
                  <p className="text-xs font-mono text-slate-500 py-6 text-center">
                    No scholars currently below the {attendanceData.summary.chronicThresholdUsed}% attendance threshold.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px]">
                          <th className="py-2.5 px-3 text-left">Admission #</th>
                          <th className="py-2.5 px-3 text-left">Scholar Name</th>
                          <th className="py-2.5 px-3 text-left">Class</th>
                          <th className="py-2.5 px-3 text-right">Attended / Total</th>
                          <th className="py-2.5 px-3 text-right">Attendance Rate</th>
                          <th className="py-2.5 px-3 text-center">Intervention Level</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendanceData.chronicAbsentees.map((a) => (
                          <tr key={a.studentId} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-bold text-slate-800">{a.admissionNumber}</td>
                            <td className="py-2 px-3 font-sans text-slate-900 font-medium">{a.studentName}</td>
                            <td className="py-2 px-3 text-slate-600">{a.className}</td>
                            <td className="py-2 px-3 text-right text-slate-700">
                              {a.attendedSessions} / {a.totalSessions}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-rose-700">
                              {a.attendanceRate}%
                            </td>
                            <td className="py-2 px-3 text-center">
                              <span className="text-[10px] font-sans font-medium text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-200">
                                {a.attendanceRate < 75 ? "Severe Alert" : "At-Risk Warning"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 4: FINANCE & FEES ANALYTICS                                    */}
        {/* ------------------------------------------------------------------ */}
        {!isLoading && !error && activeTab === "finance" && financeData && (
          <TabsContent value="finance" className="space-y-6 m-0">
            {/* Finance KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Total Billed / Invoiced"
                value={`$${(financeData.summary.totalInvoiced / 100).toLocaleString()}`}
                unit="invoiced"
                subtext="Gross receivables"
              />
              <KpiCard
                title="Total Collected"
                value={`$${(financeData.summary.totalCollected / 100).toLocaleString()}`}
                unit="collected"
                subtext={`${financeData.summary.collectionRate}% collection rate`}
                icon={<Receipt className="h-4 w-4 text-emerald-600" />}
              />
              <KpiCard
                title="Current Receivables"
                value={`$${(financeData.summary.outstandingBalance / 100).toLocaleString()}`}
                unit="balance"
                subtext="Unpaid invoice balances"
              />
              <KpiCard
                title="Overdue Arrears"
                value={`$${(financeData.summary.overdueArrears / 100).toLocaleString()}`}
                unit="overdue"
                subtext={`${financeData.agingAnalysis.debtorsCount} debtor accounts`}
                icon={<AlertTriangle className="h-4 w-4 text-rose-600" />}
              />
            </div>

            {/* Aging Bracket Breakdown */}
            <Card className="border-slate-200 shadow-2xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Fee Debtor Aging Analysis
                </CardTitle>
                <CardDescription className="text-xs font-mono">
                  Categorization of unpaid debts into aging intervals
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono">
                  <div className="p-3 bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Current (0-30 Days)
                    </span>
                    <p className="text-xl font-bold text-slate-900 mt-1">
                      ${(financeData.agingAnalysis.current30Days / 100).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      31 - 60 Days Overdue
                    </span>
                    <p className="text-xl font-bold text-amber-700 mt-1">
                      ${(financeData.agingAnalysis.days31To60 / 100).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      61 - 90 Days Overdue
                    </span>
                    <p className="text-xl font-bold text-orange-700 mt-1">
                      ${(financeData.agingAnalysis.days61To90 / 100).toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      90+ Days (Severe Arrears)
                    </span>
                    <p className="text-xl font-bold text-rose-700 mt-1">
                      ${(financeData.agingAnalysis.over90Days / 100).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Debtors List & Payment Methods */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Payment Methods */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Collections by Payment Method
                  </CardTitle>
                  <CardDescription className="text-xs font-mono">
                    Tender distribution across receipts
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <DonutChart
                    data={financeData.paymentMethodBreakdown.map((p, idx) => ({
                      label: p.method.replace("_", " "),
                      value: Math.round(p.totalCollected / 100),
                      color: ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b"][idx % 4],
                    }))}
                    totalLabel="Collected"
                  />
                </CardContent>
              </Card>

              {/* Top Debtors Table */}
              <Card className="border-slate-200 shadow-2xs lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900">
                    Outstanding Payer Balances (Top Debtors)
                  </CardTitle>
                  <CardDescription className="text-xs font-mono">
                    Prioritized accounts requiring settlement reminders
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px]">
                          <th className="py-2.5 px-3 text-left">Admission #</th>
                          <th className="py-2.5 px-3 text-left">Payer / Student</th>
                          <th className="py-2.5 px-3 text-left">Class</th>
                          <th className="py-2.5 px-3 text-right">Balance Due</th>
                          <th className="py-2.5 px-3 text-right">Days Overdue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {financeData.recentDebtors.map((d) => (
                          <tr key={d.studentId} className="hover:bg-slate-50/70">
                            <td className="py-2 px-3 font-bold text-slate-800">{d.admissionNumber}</td>
                            <td className="py-2 px-3 font-sans text-slate-900 font-medium">{d.studentName}</td>
                            <td className="py-2 px-3 text-slate-600">{d.className}</td>
                            <td className="py-2 px-3 text-right font-bold text-rose-700">
                              ${(d.balanceDue / 100).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-600">{d.daysOverdue} days</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 5: OPERATIONS ANALYTICS                                        */}
        {/* ------------------------------------------------------------------ */}
        {!isLoading && !error && activeTab === "operations" && operationsData && (
          <TabsContent value="operations" className="space-y-6 m-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Library Circulation"
                value={operationsData.library.activeLoans}
                unit="active loans"
                subtext={`${operationsData.library.overdueLoans} overdue / $${(operationsData.library.totalFinesUnpaidCents / 100).toFixed(2)} fines`}
                icon={<BookOpen className="h-4 w-4 text-indigo-600" />}
              />
              <KpiCard
                title="Transport Fleet"
                value={`${operationsData.transport.capacityUtilizationRate}%`}
                unit="capacity rate"
                subtext={`${operationsData.transport.assignedScholars} scholars on ${operationsData.transport.totalRoutes} routes`}
                icon={<Bus className="h-4 w-4 text-emerald-600" />}
              />
              <KpiCard
                title="Hostel Boarding"
                value={`${operationsData.hostel.occupancyRate}%`}
                unit="bed occupancy"
                subtext={`${operationsData.hostel.occupiedBeds} of ${operationsData.hostel.totalBedCapacity} beds`}
                icon={<Building className="h-4 w-4 text-sky-600" />}
              />
              <KpiCard
                title="Broadcast Deliveries"
                value={`${operationsData.communication.deliverySuccessRate}%`}
                unit="delivery rate"
                subtext={`${operationsData.communication.publishedAnnouncements} broadcasts`}
                icon={<Mail className="h-4 w-4 text-amber-600" />}
              />
            </div>

            {/* Operational Domain Summaries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Library Domain Card */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-indigo-600" />
                    Library Inventory & Circulation Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Total Cataloged Titles</span>
                      <span className="font-bold text-slate-900">{operationsData.library.totalBooks}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Total Physical Book Copies</span>
                      <span className="font-bold text-slate-900">{operationsData.library.totalCopies}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Available on Shelf</span>
                      <span className="font-bold text-emerald-700">{operationsData.library.availableCopies}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Active Circulating Loans</span>
                      <span className="font-bold text-indigo-700">{operationsData.library.activeLoans}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Overdue Recalls Required</span>
                      <span className="font-bold text-rose-700">{operationsData.library.overdueLoans}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transport Fleet Card */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Bus className="h-4 w-4 text-emerald-600" />
                    Transport Fleet & Route Allocation Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Active Fleet Vehicles</span>
                      <span className="font-bold text-slate-900">
                        {operationsData.transport.activeVehicles} / {operationsData.transport.totalVehicles}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Scheduled Transport Routes</span>
                      <span className="font-bold text-slate-900">{operationsData.transport.totalRoutes}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Students with Active Bus Passes</span>
                      <span className="font-bold text-indigo-700">{operationsData.transport.assignedScholars}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Total Seating Capacity</span>
                      <span className="font-bold text-slate-900">{operationsData.transport.fleetCapacity} seats</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Fleet Capacity Utilization</span>
                      <span className="font-bold text-emerald-700">{operationsData.transport.capacityUtilizationRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hostel Boarding Card */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Building className="h-4 w-4 text-sky-600" />
                    Hostel Buildings & Boarding Scholar Occupancy
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Registered Hostel Buildings</span>
                      <span className="font-bold text-slate-900">{operationsData.hostel.totalHostels}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Total Bed Capacity</span>
                      <span className="font-bold text-slate-900">{operationsData.hostel.totalBedCapacity} beds</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Occupied by Boarding Scholars</span>
                      <span className="font-bold text-indigo-700">{operationsData.hostel.occupiedBeds}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Vacant Bed Slots</span>
                      <span className="font-bold text-emerald-700">{operationsData.hostel.vacantBeds}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Pending Security Gate Passes</span>
                      <span className="font-bold text-amber-700">{operationsData.hostel.pendingGatePasses}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Communication Deliveries Card */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-amber-600" />
                    Communication Deliveries & Transmission Audit
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Total Drafted Announcements</span>
                      <span className="font-bold text-slate-900">{operationsData.communication.totalAnnouncements}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Broadcasts Published</span>
                      <span className="font-bold text-indigo-700">{operationsData.communication.publishedAnnouncements}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Multi-Channel Transmissions</span>
                      <span className="font-bold text-slate-900">{operationsData.communication.totalDeliveries}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Confirmed Received (Email/In-App)</span>
                      <span className="font-bold text-emerald-700">{operationsData.communication.successfulDeliveries}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-600">Transmission Success Rate</span>
                      <span className="font-bold text-slate-900">{operationsData.communication.deliverySuccessRate}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* TAB 6: REPORT CATALOG & EXPORT ENGINE                              */}
        {/* ------------------------------------------------------------------ */}
        {!isLoading && !error && activeTab === "reports" && (
          <TabsContent value="reports" className="space-y-6 m-0">
            {/* Catalog Selector */}
            <div className="p-4 bg-white border border-slate-200 shadow-2xs space-y-3">
              <label className="block text-xs font-bold text-slate-900 uppercase font-mono">
                Select Institutional Report to Generate
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {catalog.map((catItem) => (
                  <button
                    key={catItem.key}
                    type="button"
                    onClick={() => setSelectedReportKey(catItem.key)}
                    className={`text-left p-3 border transition-all text-xs ${
                      selectedReportKey === catItem.key
                        ? "border-indigo-600 bg-indigo-50/50 shadow-xs"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{catItem.name}</span>
                      <span className="text-[10px] font-mono text-slate-600 uppercase">
                        {catItem.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                      {catItem.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tabular Output & Export */}
            {tabularData && (
              <ReportTableComponent
                reportData={tabularData}
                onExport={handleExport}
                isExporting={isExporting}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
