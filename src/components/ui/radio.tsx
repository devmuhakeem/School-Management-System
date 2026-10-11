import * as React from "react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  label: React.ReactNode;
  value: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

export function RadioGroup({
  name,
  options,
  value,
  defaultValue,
  onChange,
  className,
  error,
  disabled,
}: RadioGroupProps) {
  const [internalVal, setInternalVal] = React.useState(defaultValue || options[0]?.value);
  const currentVal = value !== undefined ? value : internalVal;

  return (
    <div className={cn("space-y-2", className)} role="radiogroup">
      {options.map((opt) => {
        const inputId = `${name}-${opt.value}`;
        const isChecked = currentVal === opt.value;
        const isDisabled = disabled || opt.disabled;

        return (
          <div key={opt.value} className="flex items-start gap-2.5">
            <div className="flex h-5 items-center">
              <input
                type="radio"
                id={inputId}
                name={name}
                value={opt.value}
                checked={isChecked}
                disabled={isDisabled}
                onChange={() => {
                  setInternalVal(opt.value);
                  onChange?.(opt.value);
                }}
                className={cn(
                  "h-4 w-4 border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer transition-colors",
                  error && "border-rose-500"
                )}
              />
            </div>
            <div className="text-sm select-none">
              <label
                htmlFor={inputId}
                className={cn(
                  "font-medium text-slate-900 cursor-pointer",
                  isDisabled && "cursor-not-allowed opacity-50"
                )}
              >
                {opt.label}
              </label>
              {opt.description && (
                <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
