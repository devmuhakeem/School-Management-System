import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  icon?: React.ReactNode;
  className?: string;
}

export function KpiCard({
  title,
  value,
  unit,
  subtext,
  trend,
  icon,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("bg-white border-slate-200 transition-shadow hover:shadow-xs", className)}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          {icon && (
            <div className="text-slate-400 p-1 bg-slate-50 border border-slate-200/60">
              {icon}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-900">
            {value}
          </span>
          {unit && (
            <span className="text-xs font-medium text-slate-500">
              {unit}
            </span>
          )}
        </div>

        {(trend || subtext) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-mono">
            {trend && (
              <span
                className={cn(
                  "font-medium",
                  trend.isPositive ? "text-emerald-700" : "text-amber-700"
                )}
              >
                {trend.value}
              </span>
            )}
            {trend && trend.label && <span>· {trend.label}</span>}
            {subtext && <span>{trend ? `· ${subtext}` : subtext}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
