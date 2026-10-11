import * as React from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Alert } from "@/components/ui/alert";
import { Shield, Eye, EyeOff, Lock, Mail, Sparkles, Building2 } from "lucide-react";

export function LoginPage() {
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = React.useState("admin@apex-demo.internal");
  const [password, setPassword] = React.useState("Password123!");
  const [showPassword, setShowPassword] = React.useState(false);
  const [rememberMe, setRememberMe] = React.useState(true);
  const [fieldErrors, setFieldErrors] = React.useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const errors: { email?: string; password?: string } = {};
    if (!email) {
      errors.email = "Email address is required";
    } else if (!email.includes("@")) {
      errors.email = "Please enter a valid email address";
    }
    if (!password) {
      errors.password = "Password is required";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    await login(email, password);
  };

  const demoAccounts = [
    {
      role: "Super Admin",
      email: "admin@apex-demo.internal",
      desc: "Full institution & system access",
    },
    {
      role: "Principal",
      email: "principal@apex-demo.internal",
      desc: "Academic leadership & results publication",
    },
    {
      role: "Teacher",
      email: "teacher.math@apex-demo.internal",
      desc: "Classroom attendance & student grades",
    },
    {
      role: "Accountant",
      email: "accountant@apex-demo.internal",
      desc: "Fee collection & invoice generation",
    },
    {
      role: "Parent / Guardian",
      email: "parent@apex-demo.internal",
      desc: "Ward attendance, results, fees & timetable",
    },
    {
      role: "Student",
      email: "student@apex-demo.internal",
      desc: "Personal grades, attendance & timetable",
    },
  ];

  const handleSelectDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Password123!");
    clearError();
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-lg shadow-lg mb-3">
          SMS
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">SchoolOS</h1>
        <p className="mt-1 text-xs text-slate-400">
          Enterprise School Management System · Phase 3 Authentication & RBAC
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-xl rounded-xl sm:px-10 border border-slate-200">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 tracking-tight">Sign in to your portal</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your institutional credentials to access your account.
            </p>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-5" title="Authentication Error">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Email Address" required error={fieldErrors.email}>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                  }}
                  placeholder="name@school.internal"
                  autoComplete="email"
                  error={!!fieldErrors.email}
                  className="pl-9"
                />
                <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
              </div>
            </FormField>

            <FormField label="Password" required error={fieldErrors.password}>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                  }}
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  error={!!fieldErrors.password}
                  className="pl-9 pr-10"
                />
                <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            <div className="flex items-center justify-between text-xs pt-1">
              <Checkbox
                id="remember"
                label="Remember this device"
                checked={rememberMe}
                onChange={(e) => setRememberMe((e.target as HTMLInputElement).checked)}
              />
              <span className="text-slate-500 font-mono text-[11px]">BCrypt Protected</span>
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isLoading}>
              Sign In to SchoolOS
            </Button>
          </form>

          {/* Development Demo Quick-Fill Picker */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-2.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Development Demo Accounts (1-Click Test):</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemo(acc.email)}
                  className="text-left p-2 rounded border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                >
                  <p className="text-xs font-semibold text-slate-900 group-hover:text-indigo-600 flex items-center justify-between">
                    <span>{acc.role}</span>
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{acc.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 text-center mt-3 font-mono">
              Default demo password: <code>Password123!</code>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-slate-500">
          <span>Protected by strict tenant isolation & server-side RBAC</span>
        </div>
      </div>
    </div>
  );
}
