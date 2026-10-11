import { useAuth } from "@/lib/auth/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, ArrowLeft, LogOut, Lock } from "lucide-react";

export interface UnauthorizedPageProps {
  requiredPermission?: string;
  onReturnToDashboard: () => void;
}

export function UnauthorizedPage({
  requiredPermission,
  onReturnToDashboard,
}: UnauthorizedPageProps) {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <Card className="border-amber-200 bg-white shadow-sm">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700 mb-3">
            <Lock className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">403 — Access Denied</CardTitle>
          <CardDescription>
            You do not possess the required security privileges to access this resource.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-center pt-2">
          {requiredPermission ? (
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              This module requires the security permission{" "}
              <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold">
                {requiredPermission}
              </code>
              . Your current active role does not include this capability.
            </p>
          ) : (
            <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto">
              Your institutional security profile does not have authorization to view or execute operations
              on this endpoint.
            </p>
          )}

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs space-y-1.5 max-w-sm mx-auto">
            <div className="flex justify-between">
              <span className="text-slate-500">Authenticated User:</span>
              <strong className="text-slate-800">{user?.email || "Unknown"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Assigned Roles:</span>
              <span className="font-semibold text-indigo-700">{user?.roles.join(", ") || "None"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Institution:</span>
              <span className="text-slate-700">{user?.organization.name}</span>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center gap-3 border-t border-slate-100 pt-4">
          <Button variant="outline" size="sm" onClick={onReturnToDashboard} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={() => logout()} className="gap-1.5 text-slate-600">
            <LogOut className="h-4 w-4" />
            <span>Switch Account</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
