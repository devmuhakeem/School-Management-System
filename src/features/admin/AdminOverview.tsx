import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  Building2,
  Calendar,
  GraduationCap,
  Layers,
  BookOpen,
  Briefcase,
  Users,
  Shield,
  Clock,
  ArrowRight,
  Settings,
} from "lucide-react";

export interface AdminStats {
  organizationName: string;
  organizationCode: string;
  campusesCount: number;
  currentAcademicYear: string | null;
  currentTerm: string | null;
  classLevelsCount: number;
  classesCount: number;
  subjectsCount: number;
  departmentsCount: number;
  staffCount: number;
  usersCount: number;
}

export interface AdminOverviewProps {
  onSelectTab: (tabId: string) => void;
}

export function AdminOverview({ onSelectTab }: AdminOverviewProps) {
  const { token } = useAuth();
  const [stats, setStats] = React.useState<AdminStats | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/admin/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          setStats(json.data);
        }
      } catch (err) {
        console.error("Failed to load admin stats", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [token]);

  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  const statItems = [
    {
      title: "Campus Locations",
      value: stats?.campusesCount ?? 0,
      label: "Operational Branches",
      tab: "campuses",
      icon: <Building2 className="h-5 w-5 text-indigo-600" />,
    },
    {
      title: "Current Academic Session",
      value: stats?.currentAcademicYear || "Not Configured",
      label: stats?.currentTerm ? `Active Term: ${stats.currentTerm}` : "Calendar Pending",
      tab: "academic",
      icon: <Calendar className="h-5 w-5 text-emerald-600" />,
      isText: true,
    },
    {
      title: "Class Levels & Tiers",
      value: stats?.classLevelsCount ?? 0,
      label: `${stats?.classesCount ?? 0} Active Cohorts`,
      tab: "classes",
      icon: <Layers className="h-5 w-5 text-sky-600" />,
    },
    {
      title: "Curriculum Subjects",
      value: stats?.subjectsCount ?? 0,
      label: "Credit Courses",
      tab: "subjects",
      icon: <BookOpen className="h-5 w-5 text-amber-600" />,
    },
    {
      title: "Academic Departments",
      value: stats?.departmentsCount ?? 0,
      label: "Faculty Divisions",
      tab: "departments",
      icon: <Briefcase className="h-5 w-5 text-rose-600" />,
    },
    {
      title: "Registered Staff",
      value: stats?.staffCount ?? 0,
      label: `${stats?.usersCount ?? 0} System Accounts`,
      tab: "staff",
      icon: <Users className="h-5 w-5 text-indigo-600" />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {stats?.organizationName || "Institution Administration"}
              </h2>
              <span className="font-mono text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                {stats?.organizationCode || "ORG"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Central control plane for institutional structure, multi-campus setup, academic calendar,
              faculty departments, curricula, and staff accounts.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectTab("settings")}
              className="gap-1.5"
            >
              <Settings className="h-4 w-4" />
              <span>School Settings</span>
            </Button>
            <Button
              size="sm"
              onClick={() => onSelectTab("campuses")}
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Building2 className="h-4 w-4" />
              <span>Manage Campuses</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Grid of Key Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statItems.map((item, idx) => (
          <Card
            key={idx}
            className="hover:border-indigo-300 transition-all cursor-pointer group shadow-2xs"
            onClick={() => onSelectTab(item.tab)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">{item.title}</span>
                <div className="p-2 rounded-md bg-slate-50 border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                  {item.icon}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-slate-900">
                {item.value}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                <span>{item.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Launchpad Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic Setup Sequence */}
        <Card className="shadow-2xs">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-indigo-600" />
              <span>Academic Onboarding & Configuration Sequence</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Complete the foundational academic layers required before student enrollment in Phase 5
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { step: "1", title: "Academic Year & Sessions", desc: "Define calendar dates, start/end boundaries, and active status.", tab: "academic" },
              { step: "2", title: "Terms & Semesters", desc: "Configure grading terms (e.g. Fall, Spring, Summer) with date ranges.", tab: "academic" },
              { step: "3", title: "Class Levels & Cohorts", desc: "Establish progression sequence (e.g. Nursery, JSS1, SS3).", tab: "classes" },
              { step: "4", title: "Classes & Section Arms", desc: "Allocate physical section arms (e.g. Diamond, Emerald) and class capacities.", tab: "classes" },
              { step: "5", title: "Course Catalog & Subjects", desc: "Register core and elective subjects with credit unit weights.", tab: "subjects" },
            ].map((step) => (
              <div
                key={step.step}
                onClick={() => onSelectTab(step.tab)}
                className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold text-indigo-700">
                  {step.step}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{step.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 shrink-0 self-center transition-all" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Institutional Governance */}
        <Card className="shadow-2xs">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span>Administrative Governance & Directory</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Staff hierarchy, organizational branches, security roles, and user memberships
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                title: "Organization Profile",
                desc: "Legal school identity, registration codes, official contacts, and branding.",
                tab: "organization",
                icon: <Building2 className="h-4 w-4 text-indigo-600" />,
              },
              {
                title: "Multi-Campus Branch Infrastructure",
                desc: "Configure physical campuses, locations, and unique campus codes.",
                tab: "campuses",
                icon: <Building2 className="h-4 w-4 text-sky-600" />,
              },
              {
                title: "Academic & Administrative Departments",
                desc: "Organize faculty into departments and define job positions.",
                tab: "departments",
                icon: <Briefcase className="h-4 w-4 text-amber-600" />,
              },
              {
                title: "Staff & Faculty Registry",
                desc: "Manage faculty directory, qualifications, and employee numbers.",
                tab: "staff",
                icon: <Users className="h-4 w-4 text-rose-600" />,
              },
              {
                title: "User Accounts & Role Permissions",
                desc: "Account status controls, role assignments, and campus boundary scopes.",
                tab: "users",
                icon: <Shield className="h-4 w-4 text-emerald-600" />,
              },
            ].map((gov, idx) => (
              <div
                key={idx}
                onClick={() => onSelectTab(gov.tab)}
                className="flex items-center gap-3 p-2.5 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <div className="p-2 rounded-md bg-slate-50 border border-slate-200 group-hover:bg-white shrink-0">
                  {gov.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                    {gov.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug truncate">{gov.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-indigo-600 shrink-0 transition-all" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
