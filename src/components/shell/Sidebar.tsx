import * as React from "react";
import {
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  Users,
  UserPlus,
  GraduationCap,
  CalendarCheck2,
  FileSpreadsheet,
  Receipt,
  MessageSquare,
  BookOpen,
  Bus,
  Building,
  Briefcase,
  BarChart3,
  Settings,
  Component,
  Database,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthContext";

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: "core" | "academic" | "operations" | "system";
  badge?: string;
  phase?: string;
  requiredPermission?: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  // Core
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    category: "core",
    phase: "Phase 1",
  },
  {
    id: "rbac",
    label: "RBAC & Permissions",
    icon: <ShieldCheck className="h-4 w-4 text-indigo-400" />,
    category: "core",
    badge: "Phase 3 Live",
    phase: "Phase 3",
  },
  // Self-Service Portals (Phase 10)
  {
    id: "portal-parent",
    label: "Parent Portal",
    icon: <Users className="h-4 w-4 text-emerald-400" />,
    category: "core",
    phase: "Phase 10",
    requiredPermission: "portal.parent.read",
  },
  {
    id: "portal-student",
    label: "Student Portal",
    icon: <GraduationCap className="h-4 w-4 text-sky-400" />,
    category: "core",
    phase: "Phase 10",
    requiredPermission: "portal.student.read",
  },
  {
    id: "components",
    label: "UI Primitives",
    icon: <Component className="h-4 w-4" />,
    category: "core",
    badge: "20 Ready",
    phase: "Phase 1",
  },
  {
    id: "database",
    label: "Database & Health",
    icon: <Database className="h-4 w-4" />,
    category: "core",
    badge: "Prisma",
    phase: "Phase 2",
  },
  // Academic & Student Life
  {
    id: "students",
    label: "Students",
    icon: <Users className="h-4 w-4" />,
    category: "academic",
    phase: "Phase 3",
    requiredPermission: "students.read",
  },
  {
    id: "admissions",
    label: "Admissions",
    icon: <UserPlus className="h-4 w-4" />,
    category: "academic",
    phase: "Phase 3",
    requiredPermission: "admissions.read",
  },
  {
    id: "academics",
    label: "Academics",
    icon: <GraduationCap className="h-4 w-4" />,
    category: "academic",
    phase: "Phase 6",
    requiredPermission: "academics.read",
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: <CalendarCheck2 className="h-4 w-4" />,
    category: "academic",
    phase: "Phase 7",
    requiredPermission: "attendance.read",
  },
  {
    id: "examinations",
    label: "Examinations",
    icon: <FileSpreadsheet className="h-4 w-4" />,
    category: "academic",
    phase: "Phase 8",
    requiredPermission: "exams.read",
  },
  // Operations & Finance
  {
    id: "finance",
    label: "Finance & Fees",
    icon: <Receipt className="h-4 w-4" />,
    category: "operations",
    phase: "Phase 9",
    requiredPermission: "finance.read",
  },
  {
    id: "communication",
    label: "Communication",
    icon: <MessageSquare className="h-4 w-4 text-indigo-400" />,
    category: "operations",
    badge: "Phase 11 Live",
    phase: "Phase 11",
    requiredPermission: "communication.read",
  },
  {
    id: "library",
    label: "Library",
    icon: <BookOpen className="h-4 w-4 text-indigo-400" />,
    category: "operations",
    badge: "Phase 12 Live",
    phase: "Phase 12",
    requiredPermission: "library.read",
  },
  {
    id: "transport",
    label: "Transport",
    icon: <Bus className="h-4 w-4 text-indigo-400" />,
    category: "operations",
    badge: "Phase 12 Live",
    phase: "Phase 12",
    requiredPermission: "transport.read",
  },
  {
    id: "hostel",
    label: "Hostel",
    icon: <Building className="h-4 w-4 text-indigo-400" />,
    category: "operations",
    badge: "Phase 12 Live",
    phase: "Phase 12",
    requiredPermission: "hostel.read",
  },
  {
    id: "hr",
    label: "Human Resources",
    icon: <Briefcase className="h-4 w-4" />,
    category: "operations",
    phase: "Phase 8",
  },
  // System & Administration
  {
    id: "administration",
    label: "Administration",
    icon: <ShieldAlert className="h-4 w-4 text-indigo-400" />,
    category: "system",
    badge: "Phase 4 Live",
    phase: "Phase 4",
    requiredPermission: "settings.manage",
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    icon: <BarChart3 className="h-4 w-4 text-indigo-400" />,
    category: "system",
    badge: "Phase 13 Live",
    phase: "Phase 13",
    requiredPermission: "reports.read",
  },
  {
    id: "settings",
    label: "System Settings",
    icon: <Settings className="h-4 w-4" />,
    category: "system",
    phase: "Phase 4",
    requiredPermission: "settings.manage",
  },
];

export interface SidebarProps {
  currentView: string;
  onSelectView: (id: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  currentView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const { user } = useAuth();

  const categories = [
    { key: "core", title: "Foundation & System" },
    { key: "academic", title: "Academic Modules" },
    { key: "operations", title: "Operations & Auxiliary" },
    { key: "system", title: "Admin & Reports" },
  ] as const;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-slate-200">
      {/* Brand Header */}
      <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-inner">
            SMS
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-tight text-white">SchoolOS</h1>
            <p className="text-[10px] text-indigo-300 font-mono">Phase 3 Live Auth</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden text-slate-400 hover:text-white p-1"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {categories.map((cat) => {
          const items = NAVIGATION_ITEMS.filter((i) => i.category === cat.key);
          if (items.length === 0) return null;

          return (
            <div key={cat.key} className="space-y-1">
              <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider select-none">
                {cat.title}
              </p>
              <div className="space-y-0.5 pt-1">
                {items.map((item) => {
                  const isActive = currentView === item.id;
                  const isReady =
                    item.phase === "Phase 1" ||
                    item.phase === "Phase 2" ||
                    item.phase === "Phase 3" ||
                    item.phase === "Phase 4";

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectView(item.id);
                        onCloseMobile();
                      }}
                      className={cn(
                        "group flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left",
                        isActive
                          ? "bg-indigo-600/90 text-white font-semibold shadow-xs"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      )}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className={cn(
                            "shrink-0 transition-colors",
                            isActive ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {item.badge ? (
                          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-1.5 py-0.5 rounded border border-indigo-800/50">
                            {item.badge}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "text-[10px] font-mono",
                              isReady
                                ? "text-emerald-400"
                                : "text-slate-500 group-hover:text-slate-400"
                            )}
                          >
                            {item.phase}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-800 p-3.5 bg-slate-950/40">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate">
            Campus: <strong className="text-slate-200">{user?.activeCampus?.name || "Main Campus"}</strong>
          </span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 shrink-0 ml-1.5" title="Auth Session Active" />
        </div>
        <p className="text-[10px] text-slate-500 mt-1 font-mono truncate">
          Tenant: {user?.organization?.name || "Apex International"}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 z-30 border-r border-slate-800 shadow-sm">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-72 shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
