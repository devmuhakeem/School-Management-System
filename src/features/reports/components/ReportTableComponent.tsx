import * as React from "react";
import { FileSpreadsheet, FileJson, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TabularReportResult } from "@/services/reporting.service";
import { cn } from "@/lib/utils";

export interface ReportTableComponentProps {
  reportData: TabularReportResult;
  onExport: (format: "csv" | "json") => void;
  isExporting?: boolean;
  className?: string;
}

export function ReportTableComponent({
  reportData,
  onExport,
  isExporting = false,
  className,
}: ReportTableComponentProps) {
  const [sortField, setSortField] = React.useState<string | null>(null);
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [page, setPage] = React.useState(1);
  const pageSize = 15;

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(key);
      setSortOrder("asc");
    }
  };

  const sortedRows = React.useMemo(() => {
    if (!sortField) return reportData.rows;
    return [...reportData.rows].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      // Numerical comparison if both numbers or string numbers
      const numA = typeof valA === "number" ? valA : parseFloat(String(valA).replace(/[^0-9.-]/g, ""));
      const numB = typeof valB === "number" ? valB : parseFloat(String(valB).replace(/[^0-9.-]/g, ""));

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortOrder === "asc" ? numA - numB : numB - numA;
      }

      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      return sortOrder === "asc" ? strA.localeCompare(strB) : strB.localeCompare(strA);
    });
  }, [reportData.rows, sortField, sortOrder]);

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = sortedRows.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className={cn("bg-white border border-slate-200 shadow-2xs space-y-3", className)}>
      {/* Table Header & Export Actions */}
      <div className="p-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 tracking-tight">
            {reportData.reportName}
          </h3>
          <p className="text-xs font-mono text-slate-500 mt-0.5">
            {reportData.totalRecords} records evaluated · Showing page {page} of {totalPages}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport("csv")}
            disabled={isExporting || reportData.totalRecords === 0}
            className="h-8 text-xs font-mono border-slate-200"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onExport("json")}
            disabled={isExporting || reportData.totalRecords === 0}
            className="h-8 text-xs font-mono border-slate-200"
          >
            <FileJson className="h-3.5 w-3.5 mr-1.5 text-indigo-600" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 border-b border-slate-200">
              {reportData.columns.map((col) => (
                <TableHead
                  key={col.key}
                  onClick={() => handleSort(col.key)}
                  className={cn(
                    "text-xs font-mono uppercase tracking-wider text-slate-600 cursor-pointer select-none hover:text-slate-900 hover:bg-slate-100 transition-colors py-2.5",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1",
                      col.align === "right" && "justify-end",
                      col.align === "center" && "justify-center"
                    )}
                  >
                    <span>{col.header}</span>
                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={reportData.columns.length}
                  className="text-center py-10 text-xs font-mono text-slate-400"
                >
                  No records matching active criteria.
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row, idx) => (
                <TableRow
                  key={idx}
                  className="hover:bg-slate-50/70 border-b border-slate-100 transition-colors text-xs font-mono"
                >
                  {reportData.columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        "py-2.5 px-4 text-slate-700",
                        col.align === "right" && "text-right font-medium",
                        col.align === "center" && "text-center"
                      )}
                    >
                      {row[col.key] !== undefined && row[col.key] !== null
                        ? String(row[col.key])
                        : "-"}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}

            {/* Summary Row */}
            {reportData.summaryRow && paginatedRows.length > 0 && (
              <TableRow className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-xs font-mono">
                {reportData.columns.map((col) => (
                  <TableCell
                    key={`sum-${col.key}`}
                    className={cn(
                      "py-2.5 px-4 text-slate-900",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center"
                    )}
                  >
                    {reportData.summaryRow![col.key] !== undefined
                      ? String(reportData.summaryRow![col.key])
                      : "-"}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-3 flex items-center justify-between border-t border-slate-100 text-xs font-mono text-slate-500">
          <span>
            Showing {(page - 1) * pageSize + 1} -{" "}
            {Math.min(page * pageSize, sortedRows.length)} of {sortedRows.length}
          </span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-7 text-xs border-slate-200"
            >
              Previous
            </Button>
            <span className="px-2 font-medium text-slate-700">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-7 text-xs border-slate-200"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
