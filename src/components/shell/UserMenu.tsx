import * as React from "react";
import { Dropdown } from "../ui/dropdown";
import { Shield, LogOut, Key, Building2, Check } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { useToast } from "../ui/toast";

export interface UserMenuProps {
  onSelectView?: (view: string) => void;
}

export function UserMenu({ onSelectView }: UserMenuProps) {
  const { user, logout, switchCampus } = useAuth();
  const { addToast } = useToast();

  if (!user) {
    return null;
  }

  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";
  const primaryRole = user.roles?.[0] || "User";

  const items = [
    {
      label: (
        <div className="py-0.5">
          <p className="font-medium text-slate-900 text-xs">{user.firstName} {user.lastName}</p>
          <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          <p className="text-[10px] text-indigo-600 font-mono mt-0.5">{primaryRole}</p>
        </div>
      ),
      onClick: () => {
        if (onSelectView) onSelectView("rbac");
      },
    },
    { separator: true, label: "", onClick: () => {} },
    {
      label: "RBAC & Permissions Matrix",
      icon: <Shield className="h-4 w-4 text-indigo-600" />,
      onClick: () => {
        if (onSelectView) {
          onSelectView("rbac");
        } else {
          addToast({
            type: "info",
            title: "RBAC Manager",
            description: "Opening Role-Based Access Control matrix.",
          });
        }
      },
    },
    {
      label: "Database & Health Status",
      icon: <Key className="h-4 w-4 text-slate-500" />,
      onClick: () => {
        if (onSelectView) onSelectView("database");
      },
    },
    ...(user.campuses && user.campuses.length > 1
      ? [
          { separator: true, label: "", onClick: () => {} },
          {
            label: (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Switch Campus Branch
              </span>
            ),
            onClick: () => {},
            disabled: true,
          },
          ...user.campuses.map((campus) => ({
            label: (
              <div className="flex items-center justify-between w-full">
                <span className="text-xs truncate">{campus.name}</span>
                {user.activeCampus?.id === campus.id && (
                  <Check className="h-3.5 w-3.5 text-indigo-600 shrink-0 ml-2" />
                )}
              </div>
            ),
            icon: <Building2 className="h-4 w-4 text-slate-400" />,
            onClick: () => {
              switchCampus(campus.id);
              addToast({
                type: "success",
                title: "Campus Switched",
                description: `Active campus set to ${campus.name}`,
              });
            },
          })),
        ]
      : []),
    { separator: true, label: "", onClick: () => {} },
    {
      label: "Sign Out",
      icon: <LogOut className="h-4 w-4" />,
      destructive: true,
      onClick: async () => {
        await logout();
        addToast({
          type: "info",
          title: "Signed Out",
          description: "Your session has been securely ended.",
        });
      },
    },
  ];

  const trigger = (
    <div className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors select-none cursor-pointer">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white font-semibold text-xs shadow-xs">
        {initials}
      </div>
      <div className="hidden md:block text-left">
        <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[120px]">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">
          {primaryRole}
        </p>
      </div>
    </div>
  );

  return <Dropdown trigger={trigger} items={items} align="right" />;
}
