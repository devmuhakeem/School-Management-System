import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 text-xs font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200",
        secondary:
          "text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/80",
        success:
          "text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200",
        warning:
          "text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200",
        destructive:
          "text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200",
        outline:
          "text-slate-700 border border-slate-300 px-2 py-0.5 rounded",
        dot: "text-slate-700 bg-transparent p-0 border-0",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dotColor?: string;
}

export function Badge({ className, variant, dotColor, children, ...props }: BadgeProps) {
  const showDot = variant === "dot" || dotColor;

  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {showDot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            dotColor ||
              (variant === "success"
                ? "bg-emerald-600"
                : variant === "warning"
                ? "bg-amber-600"
                : variant === "destructive"
                ? "bg-rose-600"
                : "bg-slate-400")
          )}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
}
