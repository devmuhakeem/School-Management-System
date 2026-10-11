import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 text-sm [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4",
  {
    variants: {
      variant: {
        default: "bg-slate-50 text-slate-800 border-slate-200 [&>svg]:text-slate-600",
        info: "bg-sky-50 text-sky-950 border-sky-200 [&>svg]:text-sky-600",
        success: "bg-emerald-50 text-emerald-950 border-emerald-200 [&>svg]:text-emerald-600",
        warning: "bg-amber-50 text-amber-950 border-amber-200 [&>svg]:text-amber-600",
        destructive: "bg-rose-50 text-rose-950 border-rose-200 [&>svg]:text-rose-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface AlertProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title">,
    VariantProps<typeof alertVariants> {
  title?: React.ReactNode;
  icon?: React.ReactNode;
  onDismiss?: () => void;
}

export function Alert({
  className,
  variant = "default",
  title,
  icon,
  children,
  onDismiss,
  ...props
}: AlertProps) {
  const defaultIcons = {
    default: <Info className="h-4 w-4" />,
    info: <Info className="h-4 w-4" />,
    success: <CheckCircle2 className="h-4 w-4" />,
    warning: <AlertTriangle className="h-4 w-4" />,
    destructive: <AlertCircle className="h-4 w-4" />,
  };

  const renderedIcon = icon || defaultIcons[variant || "default"];

  return (
    <div
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    >
      {renderedIcon}
      <div className="space-y-1 pr-6">
        {title && <h5 className="font-semibold leading-none tracking-tight">{title}</h5>}
        {children && <div className="text-xs leading-relaxed opacity-90">{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
          aria-label="Dismiss alert"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
