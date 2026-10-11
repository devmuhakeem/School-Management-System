import * as React from "react";
import { AdminOverview } from "./AdminOverview";
import { OrganizationView } from "./OrganizationView";
import { CampusesView } from "./CampusesView";
import { AcademicYearsView } from "./AcademicYearsView";
import { ClassesAndLevelsView } from "./ClassesAndLevelsView";
import { SubjectsView } from "./SubjectsView";
import { DepartmentsAndPositionsView } from "./DepartmentsAndPositionsView";
import { StaffDirectoryView } from "./StaffDirectoryView";
import { UsersAdminView } from "./UsersAdminView";
import { SchoolSettingsView } from "./SchoolSettingsView";
import {
  LayoutDashboard,
  Building2,
  Calendar,
  Layers,
  BookOpen,
  Briefcase,
  Users,
  Shield,
  Settings,
  Building,
} from "lucide-react";

export type AdminTab =
  | "overview"
  | "organization"
  | "campuses"
  | "academic"
  | "classes"
  | "subjects"
  | "departments"
  | "staff"
  | "users"
  | "settings";

export interface AdministrationViewProps {
  initialTab?: AdminTab;
}

export function AdministrationView({ initialTab = "overview" }: AdministrationViewProps) {
  const [activeTab, setActiveTab] = React.useState<AdminTab>(initialTab);

  const tabs: Array<{ id: AdminTab; label: string; icon: React.ReactNode }> = [
    { id: "overview", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "organization", label: "Organization", icon: <Building className="h-4 w-4" /> },
    { id: "campuses", label: "Campuses", icon: <Building2 className="h-4 w-4" /> },
    { id: "academic", label: "Academic Sessions & Terms", icon: <Calendar className="h-4 w-4" /> },
    { id: "classes", label: "Classes & Levels", icon: <Layers className="h-4 w-4" /> },
    { id: "subjects", label: "Subjects & Curriculum", icon: <BookOpen className="h-4 w-4" /> },
    { id: "departments", label: "Departments & Positions", icon: <Briefcase className="h-4 w-4" /> },
    { id: "staff", label: "Staff Directory", icon: <Users className="h-4 w-4" /> },
    { id: "users", label: "Users & Security", icon: <Shield className="h-4 w-4" /> },
    { id: "settings", label: "School Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Horizontal Administration Subnavigation */}
      <div className="border-b border-slate-200 bg-white -mx-4 -mt-4 sm:-mx-6 sm:-mt-6 px-4 sm:px-6 pt-2 sticky top-16 z-10 shadow-2xs">
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar py-1" aria-label="Administration Sections">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md whitespace-nowrap transition-colors cursor-pointer min-h-[40px] ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold border-b-2 border-indigo-600 rounded-b-none"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <span className={isActive ? "text-indigo-600" : "text-slate-400"}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="pt-2">
        {activeTab === "overview" && (
          <AdminOverview onSelectTab={(tabId) => setActiveTab(tabId as AdminTab)} />
        )}
        {activeTab === "organization" && <OrganizationView />}
        {activeTab === "campuses" && <CampusesView />}
        {activeTab === "academic" && <AcademicYearsView />}
        {activeTab === "classes" && <ClassesAndLevelsView />}
        {activeTab === "subjects" && <SubjectsView />}
        {activeTab === "departments" && <DepartmentsAndPositionsView />}
        {activeTab === "staff" && <StaffDirectoryView />}
        {activeTab === "users" && <UsersAdminView />}
        {activeTab === "settings" && <SchoolSettingsView />}
      </div>
    </div>
  );
}
