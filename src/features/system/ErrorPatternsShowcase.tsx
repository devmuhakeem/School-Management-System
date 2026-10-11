import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TableLoadingSkeleton, LoadingState } from "@/components/ui/loading-state";
import { ShieldAlert, FileQuestion, Lock, ServerCrash, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function ErrorPatternsShowcase() {
  const { addToast } = useToast();
  const [activePattern, setActivePattern] = React.useState("unauthorized");

  const patterns = [
    { id: "unauthorized", label: "401 / 403 Forbidden" },
    { id: "notfound", label: "404 Not Found" },
    { id: "apierror", label: "500 / API Error" },
    { id: "empty", label: "Empty Dataset" },
    { id: "loading", label: "Loading Skeleton" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Resilient Error & State Architecture
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Section 12 patterns ensuring users are never stranded on a blank screen
          </p>
        </div>
        <Tabs
          tabs={patterns}
          activeTab={activePattern}
          onTabChange={setActivePattern}
          variant="segmented"
        />
      </div>

      {activePattern === "unauthorized" && (
        <Card className="max-w-2xl mx-auto border-amber-200 bg-amber-50/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-2">
              <Lock className="h-6 w-6" />
            </div>
            <CardTitle>403 — Restricted Module Access</CardTitle>
            <CardDescription>
              Role-Based Access Control (RBAC) boundary enforcement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Your active security role (<strong>CAMPUS_STAFF</strong>) lacks the{" "}
              <code className="bg-amber-100/80 px-1 py-0.5 rounded text-amber-900 font-mono">
                finance.disbursement.approve
              </code>{" "}
              permission required to execute this operation.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addToast({ type: "info", title: "Redirected to Dashboard" })}
              >
                Return to Dashboard
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  addToast({
                    type: "info",
                    title: "Access Requested",
                    description: "Permission elevation request logged in audit trail.",
                  })
                }
              >
                Request Role Elevation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {activePattern === "notfound" && (
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-8">
            <EmptyState
              icon={<FileQuestion className="h-8 w-8 text-slate-400" />}
              title="404 — Student Record Not Found"
              description="The student profile with identifier 'STU-99201' does not exist in this campus database or may have been permanently archived."
              actionLabel="Return to Student Registry"
              onAction={() => addToast({ type: "info", title: "Navigated to Registry" })}
              secondaryActionLabel="Perform Global Search"
              onSecondaryAction={() => addToast({ type: "info", title: "Search Opened" })}
            />
          </CardContent>
        </Card>
      )}

      {activePattern === "apierror" && (
        <div className="max-w-2xl mx-auto space-y-4">
          <ErrorState
            title="503 — Database Service Unavailable"
            message="The PostgreSQL connection pool was exhausted or the target host did not respond within the 10000ms deadline."
            code="DATABASE_CONNECTION_TIMEOUT"
            details={{
              driver: "Prisma v6.19.3",
              target: "PostgreSQL 16",
              timeoutMs: 10000,
              remediation: "Verify DATABASE_URL environment setting and PostgreSQL service health.",
            }}
            onRetry={() =>
              addToast({
                type: "info",
                title: "Retrying connection...",
                description: "Attempting health-check probe.",
              })
            }
          />
        </div>
      )}

      {activePattern === "empty" && (
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Empty Fee Invoices (Dataset Zero-State)</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                title="No Invoices Generated"
                description="There are currently zero outstanding or paid fee invoices for the selected academic term."
                actionLabel="Generate Batch Invoices (Phase 5)"
                onAction={() => addToast({ type: "info", title: "Phase 5 feature" })}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activePattern === "loading" && (
        <div className="space-y-4">
          <Alert variant="info" title="Zero-Layout-Shift Loading Patterns">
            Pre-computed skeletons match the exact grid and row dimensions of incoming tables.
          </Alert>
          <TableLoadingSkeleton rows={4} columns={5} />
        </div>
      )}
    </div>
  );
}
