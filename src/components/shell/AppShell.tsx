import * as React from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BreadcrumbItem } from "./Breadcrumbs";
import { ToastProvider } from "../ui/toast";

export interface AppShellProps {
  currentView: string;
  onSelectView: (view: string) => void;
  title: string;
  breadcrumbs: BreadcrumbItem[];
  children: React.ReactNode;
  databaseStatus?: "CONNECTED" | "NOT_CONFIGURED" | "UNREACHABLE" | "ERROR";
  onOpenDatabaseModal?: () => void;
}

export function AppShell({
  currentView,
  onSelectView,
  title,
  breadcrumbs,
  children,
  databaseStatus,
  onOpenDatabaseModal,
}: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={onSelectView}
          isOpenMobile={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64 transition-all">
          <Header
            title={title}
            breadcrumbs={breadcrumbs}
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            databaseStatus={databaseStatus}
            onOpenDatabaseModal={onOpenDatabaseModal}
            onSelectView={onSelectView}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>

          <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center sm:flex sm:justify-between text-xs text-slate-500">
            <p>School Management System · Phase 3 Authentication & RBAC Complete</p>
            <p className="mt-1 sm:mt-0 font-mono text-[11px] text-slate-400">
              Clean Monolith · PostgreSQL · Prisma ORM · Role-Based Security
            </p>
          </footer>
        </div>
      </div>
    </ToastProvider>
  );
}
