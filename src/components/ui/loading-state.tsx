import * as React from "react";
import { cn } from "@/lib/utils";

export interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingSpinner({
  className,
  size = "md",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-10 w-10 border-3",
  }[size];

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-slate-200 border-t-slate-800",
        sizeClasses,
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function LoadingState({
  message = "Loading...",
  className,
  size = "md",
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center space-y-3",
        className
      )}
      role="status"
    >
      <LoadingSpinner size={size} />
      {message && <p className="text-sm font-medium text-slate-600">{message}</p>}
    </div>
  );
}

export function TableLoadingSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full space-y-3 p-4 bg-white border border-slate-200 rounded-lg", className)}>
      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
        <div className="h-5 w-40 bg-slate-200 animate-pulse rounded" />
        <div className="h-8 w-24 bg-slate-100 animate-pulse rounded" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4 py-2 border-b border-slate-50 last:border-0">
            {Array.from({ length: columns }).map((__, c) => (
              <div
                key={c}
                className={cn(
                  "h-4 bg-slate-100 animate-pulse rounded",
                  c === 0 ? "w-1/4" : "flex-1"
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
