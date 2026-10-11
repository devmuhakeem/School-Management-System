import { Menu, Database, Building2 } from "lucide-react";
import { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";
import { UserMenu } from "./UserMenu";
import { NotificationDrawer } from "./NotificationDrawer";
import { Button } from "../ui/button";
import { useAuth } from "@/lib/auth/AuthContext";

export interface HeaderProps {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  onOpenMobileMenu: () => void;
  databaseStatus?: "CONNECTED" | "NOT_CONFIGURED" | "UNREACHABLE" | "ERROR";
  onOpenDatabaseModal?: () => void;
  onSelectView?: (view: string) => void;
}

export function Header({
  title,
  breadcrumbs,
  onOpenMobileMenu,
  databaseStatus = "NOT_CONFIGURED",
  onOpenDatabaseModal,
  onSelectView,
}: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 sm:px-6 backdrop-blur-xs shadow-xs">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onOpenMobileMenu}
          className="lg:hidden text-slate-700"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <div className="flex flex-col">
          <Breadcrumbs items={breadcrumbs} className="hidden sm:flex mb-0.5" />
          <h2 className="text-base font-semibold text-slate-900 tracking-tight leading-tight">
            {title}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Campus Indicator */}
        {user?.activeCampus && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800">
            <Building2 className="h-3.5 w-3.5 text-indigo-600" />
            <span className="font-medium truncate max-w-[160px]">{user.activeCampus.name}</span>
          </div>
        )}

        {/* Database Status Button */}
        <button
          type="button"
          onClick={onOpenDatabaseModal}
          className="hidden md:flex items-center gap-2 px-2.5 py-1 text-xs rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-slate-700 cursor-pointer"
          title="Click to view database connection status and diagnostics"
        >
          <Database className="h-3.5 w-3.5 text-slate-500" />
          <span className="font-medium">DB Status:</span>
          <span className="inline-flex items-center gap-1 font-mono text-[11px]">
            <span
              className={`h-2 w-2 rounded-full ${
                databaseStatus === "CONNECTED"
                  ? "bg-emerald-500"
                  : databaseStatus === "NOT_CONFIGURED"
                  ? "bg-amber-400"
                  : "bg-rose-500"
              }`}
            />
            {databaseStatus === "CONNECTED"
              ? "Live"
              : databaseStatus === "NOT_CONFIGURED"
              ? "Config Required"
              : "Unreachable"}
          </span>
        </button>

        {/* Notifications */}
        <NotificationDrawer />

        <div className="h-5 w-px bg-slate-200" aria-hidden="true" />

        {/* User Account Menu */}
        <UserMenu onSelectView={onSelectView} />
      </div>
    </header>
  );
}
