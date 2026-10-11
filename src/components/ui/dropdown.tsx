import * as React from "react";
import { cn } from "@/lib/utils";

export interface DropdownItem {
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

export interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  className?: string;
}

export function Dropdown({ trigger, items, align = "right", className }: DropdownProps) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  return (
    <div className={cn("relative inline-block text-left", className)} ref={containerRef}>
      <div onClick={() => setOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          className={cn(
            "absolute z-50 mt-1.5 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none animate-in fade-in-50 zoom-in-95 duration-100",
            align === "right" ? "right-0" : "left-0"
          )}
          role="menu"
        >
          {items.map((item, idx) => {
            if (item.separator) {
              return <div key={idx} className="my-1 border-t border-slate-100" role="separator" />;
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  item.onClick();
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-left transition-colors cursor-pointer disabled:pointer-events-none disabled:opacity-50",
                  item.destructive
                    ? "text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                )}
                role="menuitem"
              >
                {item.icon && <span className="h-4 w-4 shrink-0 text-slate-400">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
