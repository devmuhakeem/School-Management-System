import * as React from "react";
import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number | string;
  disabled?: boolean;
}

export interface TabsProps {
  tabs?: TabItem[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  value?: string;
  onValueChange?: (tabId: string) => void;
  children?: React.ReactNode;
  className?: string;
  variant?: "segmented" | "underline";
}

interface TabsContextType {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabsContext = React.createContext<TabsContextType | null>(null);

export function Tabs({
  tabs,
  activeTab,
  onTabChange,
  value,
  onValueChange,
  children,
  className,
  variant = "segmented",
}: TabsProps) {
  const currentTab = value ?? activeTab ?? "";
  const handleTabChange = onValueChange ?? onTabChange ?? (() => {});

  if (children) {
    return (
      <TabsContext.Provider value={{ activeTab: currentTab, onTabChange: handleTabChange }}>
        <div className={className}>{children}</div>
      </TabsContext.Provider>
    );
  }

  if (variant === "underline") {
    return (
      <div
        className={cn("flex space-x-6 border-b border-slate-200 overflow-x-auto", className)}
        role="tablist"
      >
        {tabs?.map((tab) => {
          const isActive = tab.id === currentTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                "flex items-center gap-2 py-3 px-1 border-b-2 text-sm font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap",
                isActive
                  ? "border-slate-900 text-slate-900 font-semibold"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              )}
            >
              {tab.icon && <span className="h-4 w-4 shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="text-xs text-slate-400 font-normal">
                  ({tab.count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/60 overflow-x-auto",
        className
      )}
      role="tablist"
    >
      {tabs?.map((tab) => {
        const isActive = tab.id === currentTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => handleTabChange(tab.id)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap select-none",
              isActive
                ? "bg-white text-slate-900 shadow-xs font-semibold"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            {tab.icon && <span className="h-3.5 w-3.5 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-slate-400 font-normal">
                ({tab.count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200/60 overflow-x-auto",
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  disabled,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const ctx = React.useContext(TabsContext);
  const isActive = ctx?.activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => ctx?.onTabChange(value)}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap select-none",
        isActive
          ? "bg-white text-slate-900 shadow-xs font-semibold"
          : "text-slate-600 hover:text-slate-900",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsContext);
  if (ctx?.activeTab !== value) return null;

  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  );
}
