import * as React from "react";
import { AppShell } from "@/components/shell/AppShell";
import { DashboardShell } from "@/features/dashboard/DashboardShell";
import { ComponentShowcase } from "@/features/system/ComponentShowcase";
import { DatabaseStatusCard } from "@/features/system/DatabaseStatusCard";
import { ErrorPatternsShowcase } from "@/features/system/ErrorPatternsShowcase";
import { ModulePlaceholder } from "@/features/system/ModulePlaceholder";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Dialog } from "@/components/ui/dialog";
import { NAVIGATION_ITEMS } from "@/components/shell/Sidebar";
import { AuthProvider, useAuth } from "@/lib/auth/AuthContext";
import { LoginPage } from "@/features/auth/LoginPage";
import { RbacManagerView } from "@/features/auth/RbacManagerView";
import { UnauthorizedPage } from "@/features/auth/UnauthorizedPage";
import { AdministrationView } from "@/features/admin/AdministrationView";
import { AcademicsView } from "@/features/academics/AcademicsView";
import { AttendanceView } from "@/features/attendance/AttendanceView";
import { ExaminationsView } from "@/features/examinations/ExaminationsView";
import { FinanceView } from "@/features/finance/FinanceView";
import { ParentPortalView } from "@/features/portal/ParentPortalView";
import { StudentPortalView } from "@/features/portal/StudentPortalView";
import { CommunicationView } from "@/features/communication/CommunicationView";
import { LibraryView } from "@/features/library/LibraryView";
import { TransportView } from "@/features/transport/TransportView";
import { HostelView } from "@/features/hostel/HostelView";
import { ReportsView } from "@/features/reports/ReportsView";
import { LoadingSpinner } from "@/components/ui/loading-state";

function AuthenticatedApp() {
  const { isAuthenticated, isLoading, hasPermission, user } = useAuth();
  const [currentView, setCurrentView] = React.useState<string>("dashboard");
  const [dbModalOpen, setDbModalOpen] = React.useState(false);
  const [dbStatus, setDbStatus] = React.useState<"CONNECTED" | "NOT_CONFIGURED" | "UNREACHABLE" | "ERROR">("NOT_CONFIGURED");

  // Route parent/student to their designated portal on login
  React.useEffect(() => {
    if (user?.roles?.includes("Parent") && currentView === "dashboard") {
      setCurrentView("portal-parent");
    } else if (user?.roles?.includes("Student") && currentView === "dashboard") {
      setCurrentView("portal-student");
    }
  }, [user]);

  // Check database health on initial mount
  React.useEffect(() => {
    async function checkDb() {
      try {
        const res = await fetch("/api/database/status");
        if (res.ok) {
          const json = await res.json();
          if (json.data?.status) {
            setDbStatus(json.data.status);
            return;
          }
        }
      } catch {
        setDbStatus("NOT_CONFIGURED");
      }
    }
    checkDb();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <LoadingSpinner size="lg" className="border-indigo-500 border-t-transparent" />
        <p className="mt-4 text-xs font-mono text-slate-400">Verifying session credentials...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Compute title & breadcrumbs
  const activeItem = NAVIGATION_ITEMS.find((item) => item.id === currentView);
  const viewTitle = activeItem ? activeItem.label : "Foundation System";

  const breadcrumbs = [
    {
      label: "Home",
      onClick: () => setCurrentView("dashboard"),
    },
    ...(currentView !== "dashboard"
      ? [
          {
            label: viewTitle,
            active: true,
          },
        ]
      : []),
  ];

  // Check if current view requires permission that user lacks
  const isUnauthorized = activeItem?.requiredPermission && !hasPermission(activeItem.requiredPermission);

  return (
    <AppShell
      currentView={currentView}
      onSelectView={setCurrentView}
      title={viewTitle}
      breadcrumbs={breadcrumbs}
      databaseStatus={dbStatus}
      onOpenDatabaseModal={() => setDbModalOpen(true)}
    >
      {isUnauthorized ? (
        <UnauthorizedPage
          requiredPermission={activeItem?.requiredPermission}
          onReturnToDashboard={() => setCurrentView("dashboard")}
        />
      ) : (
        <>
          {currentView === "dashboard" && (
            <DashboardShell onNavigate={(view) => setCurrentView(view)} />
          )}

          {currentView === "rbac" && <RbacManagerView />}

          {currentView === "administration" && <AdministrationView />}

          {currentView === "academics" && <AcademicsView />}

          {currentView === "attendance" && <AttendanceView />}

          {currentView === "examinations" && <ExaminationsView />}

          {currentView === "finance" && <FinanceView />}

          {currentView === "communication" && <CommunicationView />}

          {currentView === "library" && <LibraryView />}

          {currentView === "transport" && <TransportView />}

          {currentView === "hostel" && <HostelView />}

          {currentView === "reports" && <ReportsView />}

          {currentView === "portal-parent" && <ParentPortalView />}

          {currentView === "portal-student" && <StudentPortalView />}

          {currentView === "settings" && <AdministrationView initialTab="settings" />}

          {currentView === "components" && <ComponentShowcase />}

          {currentView === "database" && (
            <div className="space-y-6">
              <div className="border-b border-slate-200 pb-3">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  Database Engine & Infrastructure Health
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  PostgreSQL verification, Prisma ORM schema inspection, and environment diagnostics
                </p>
              </div>
              <DatabaseStatusCard />
              <ErrorPatternsShowcase />
            </div>
          )}

          {currentView !== "dashboard" &&
            currentView !== "rbac" &&
            currentView !== "administration" &&
            currentView !== "academics" &&
            currentView !== "attendance" &&
            currentView !== "examinations" &&
            currentView !== "finance" &&
            currentView !== "communication" &&
            currentView !== "library" &&
            currentView !== "transport" &&
            currentView !== "hostel" &&
            currentView !== "reports" &&
            currentView !== "portal-parent" &&
            currentView !== "portal-student" &&
            currentView !== "settings" &&
            currentView !== "components" &&
            currentView !== "database" && (
              <ModulePlaceholder
                moduleId={currentView}
                onReturnToDashboard={() => setCurrentView("dashboard")}
                onNavigateToPrimitives={() => setCurrentView("components")}
              />
            )}
        </>
      )}

      {/* Database Diagnostic Modal */}
      <Dialog
        open={dbModalOpen}
        onOpenChange={setDbModalOpen}
        maxWidth="lg"
        title="Database Connection Diagnostic"
        description="Detailed inspection of PostgreSQL connection pool and Prisma schema configuration."
      >
        <div className="pt-2">
          <DatabaseStatusCard />
        </div>
      </Dialog>
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </ErrorBoundary>
  );
}
