import * as React from "react";
import { Search, RotateCcw, Filter, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RawReportFilterInput } from "@/lib/validations/reporting";
import { cn } from "@/lib/utils";

export interface ReportFilterBarProps {
  filters: RawReportFilterInput;
  onChange: (updated: RawReportFilterInput) => void;
  onReset: () => void;
  userCampusId?: string | null;
  supportedFilters?: string[];
  className?: string;
}

export function ReportFilterBar({
  filters,
  onChange,
  onReset,
  userCampusId,
  supportedFilters,
  className,
}: ReportFilterBarProps) {
  const isSupported = (name: string) => {
    if (!supportedFilters || supportedFilters.length === 0) return true;
    return supportedFilters.includes(name);
  };

  const handleFieldChange = (key: keyof RawReportFilterInput, value: any) => {
    onChange({
      ...filters,
      [key]: value === "ALL" || value === "" ? undefined : value,
    });
  };

  return (
    <div
      className={cn(
        "p-4 bg-white border border-slate-200 shadow-2xs space-y-3",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <Filter className="h-3.5 w-3.5 text-indigo-600" />
          <span>Active Report Criteria</span>
          {filters.campusId && (
            <span className="text-slate-400">· Campus: {filters.campusId}</span>
          )}
          {filters.academicYearId && (
            <span className="text-slate-400">· AY: {filters.academicYearId}</span>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-8 text-xs font-mono text-slate-600 hover:text-slate-900 border-slate-200"
        >
          <RotateCcw className="h-3 w-3 mr-1.5" />
          Reset Filters
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Campus Selection */}
        {isSupported("campusId") && (
          <div>
            <label className="block text-[11px] font-mono text-slate-600 mb-1">
              Campus Scope
            </label>
            <Select
              value={filters.campusId || (userCampusId || "ALL")}
              onChange={(e) => handleFieldChange("campusId", e.target.value)}
              disabled={Boolean(userCampusId)}
              options={[
                { value: "ALL", label: "All Campuses (Enterprise)" },
                { value: "campus-main", label: "Central Campus" },
                { value: "campus-north", label: "North Annex" },
              ]}
              className="h-9 text-xs"
            />
          </div>
        )}

        {/* Academic Year Selection */}
        {isSupported("academicYearId") && (
          <div>
            <label className="block text-[11px] font-mono text-slate-600 mb-1">
              Academic Year
            </label>
            <Select
              value={filters.academicYearId || "ALL"}
              onChange={(e) => handleFieldChange("academicYearId", e.target.value)}
              options={[
                { value: "ALL", label: "All Academic Years" },
                { value: "ay-2025-26", label: "2025/2026 (Current)" },
                { value: "ay-2024-25", label: "2024/2025 (Archived)" },
              ]}
              className="h-9 text-xs"
            />
          </div>
        )}

        {/* Term Selection */}
        {isSupported("termId") && (
          <div>
            <label className="block text-[11px] font-mono text-slate-600 mb-1">
              Academic Term
            </label>
            <Select
              value={filters.termId || "ALL"}
              onChange={(e) => handleFieldChange("termId", e.target.value)}
              options={[
                { value: "ALL", label: "All Terms / Annual" },
                { value: "term-1", label: "Term 1 (Michaelmas)" },
                { value: "term-2", label: "Term 2 (Hilary)" },
                { value: "term-3", label: "Term 3 (Trinity)" },
              ]}
              className="h-9 text-xs"
            />
          </div>
        )}

        {/* Start Date */}
        {isSupported("startDate") && (
          <div>
            <label className="block text-[11px] font-mono text-slate-600 mb-1">
              From Date
            </label>
            <Input
              type="date"
              value={filters.startDate || ""}
              onChange={(e) => handleFieldChange("startDate", e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>
        )}

        {/* End Date */}
        {isSupported("endDate") && (
          <div>
            <label className="block text-[11px] font-mono text-slate-600 mb-1">
              To Date
            </label>
            <Input
              type="date"
              value={filters.endDate || ""}
              onChange={(e) => handleFieldChange("endDate", e.target.value)}
              className="h-9 text-xs font-mono"
            />
          </div>
        )}

        {/* Chronic Absence Threshold */}
        {isSupported("chronicThreshold") && (
          <div>
            <label className="block text-[11px] font-mono text-slate-600 mb-1">
              Chronic Absence Threshold (%)
            </label>
            <Input
              type="number"
              min={50}
              max={99}
              value={filters.chronicThreshold !== undefined ? String(filters.chronicThreshold) : "85"}
              onChange={(e) => handleFieldChange("chronicThreshold", Number(e.target.value) || 85)}
              className="h-9 text-xs font-mono"
            />
          </div>
        )}

        {/* Class Selection */}
        {isSupported("classId") && (
          <div>
            <label className="block text-[11px] font-mono text-slate-600 mb-1">
              Class Cohort
            </label>
            <Select
              value={filters.classId || "ALL"}
              onChange={(e) => handleFieldChange("classId", e.target.value)}
              options={[
                { value: "ALL", label: "All Classes" },
                { value: "cls-jss1-2526", label: "Junior Secondary 1" },
                { value: "cls-ss1-2526", label: "Senior Secondary 1" },
                { value: "cls-ss2-2526", label: "Senior Secondary 2" },
              ]}
              className="h-9 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
