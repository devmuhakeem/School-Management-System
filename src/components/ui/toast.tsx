import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastItem = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    const duration = toast.duration ?? 4500;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    // Graceful fallback if outside provider
    return {
      toasts: [],
      addToast: (t: Omit<ToastItem, "id">) => console.log("[Toast fallback]", t),
      removeToast: () => {},
    };
  }
  return context;
}

export function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex max-h-screen w-full flex-col-reverse gap-2 sm:max-w-sm pointer-events-none"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-4 shadow-lg transition-all animate-in slide-in-from-bottom-5 duration-200",
              isSuccess && "border-emerald-200 text-emerald-950",
              isError && "border-rose-200 text-rose-950",
              !isSuccess && !isError && "border-slate-200 text-slate-900"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              {isError && <AlertCircle className="h-4 w-4 text-rose-600" />}
              {!isSuccess && !isError && <Info className="h-4 w-4 text-slate-600" />}
            </div>
            <div className="flex-1 space-y-1">
              <h5 className="text-sm font-semibold leading-tight">{toast.title}</h5>
              {toast.description && (
                <p className="text-xs text-slate-600 leading-normal">{toast.description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onRemove(toast.id)}
              className="shrink-0 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
              aria-label="Close notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
