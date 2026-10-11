import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string | string[];
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  error,
  description,
  children,
  className,
}: FormFieldProps) {
  const generatedId = React.useId();
  const inputId = htmlFor || generatedId;
  const errorMsg = Array.isArray(error) ? error[0] : error;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 select-none uppercase tracking-wider"
          >
            {label}
            {required && <span className="ml-1 text-rose-500" aria-hidden="true">*</span>}
          </label>
        </div>
      )}

      {description && (
        <p className="text-xs text-slate-500 leading-normal">{description}</p>
      )}

      <div className="relative">{children}</div>

      {errorMsg && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-xs font-medium text-rose-600 animate-in fade-in-50"
        >
          {errorMsg}
        </p>
      )}
    </div>
  );
}
