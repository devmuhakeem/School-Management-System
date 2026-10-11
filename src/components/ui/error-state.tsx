import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertOctagon, RotateCcw } from "lucide-react";
import { Button } from "./button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string;
  details?: unknown;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "An unexpected error occurred",
  message = "We were unable to complete this operation. Please try again or contact support if the issue persists.",
  code,
  details,
  onRetry,
  className,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = React.useState(false);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-lg border border-rose-200 bg-rose-50/30",
        className
      )}
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
        <AlertOctagon className="h-6 w-6" />
      </div>

      <h4 className="text-base font-semibold text-slate-900 mb-1">{title}</h4>
      <p className="text-xs text-slate-600 max-w-md mb-2 leading-relaxed">
        {message}
      </p>

      {code && (
        <p className="text-[11px] font-mono text-slate-500 mb-3">
          Error Reference: <span className="font-semibold text-slate-700">{code}</span>
        </p>
      )}

      <div className="flex items-center gap-2 mt-2">
        {onRetry && (
          <Button size="sm" onClick={onRetry} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Retry Operation</span>
          </Button>
        )}
        {details !== undefined && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDetails((p) => !p)}
          >
            {showDetails ? "Hide Diagnostics" : "View Diagnostics"}
          </Button>
        )}
      </div>

      {showDetails && details !== undefined && (
        <div className="mt-4 w-full max-w-lg text-left bg-slate-900 text-slate-200 text-xs p-3 rounded font-mono overflow-auto max-h-40">
          <pre>{typeof details === "string" ? details : JSON.stringify(details, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
