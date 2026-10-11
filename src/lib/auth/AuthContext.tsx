import * as React from "react";
import { SafeUser } from "@/services/auth.service";

interface AuthContextType {
  user: SafeUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  switchCampus: (campusId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roleName: string) => boolean;
  canAccessCampus: (campusId: string) => boolean;
  clearError: () => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "sms_auth_token";
const USER_KEY = "sms_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = React.useState<string | null>(() => {
    return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  });

  const [user, setUser] = React.useState<SafeUser | null>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(USER_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  // Validate session on mount
  React.useEffect(() => {
    async function verifySession() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setUser(json.data);
            localStorage.setItem(USER_KEY, JSON.stringify(json.data));
          }
        } else {
          // Token expired or invalid
          setToken(null);
          setUser(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      } catch (err) {
        console.warn("Could not verify session with server, keeping cached user", err);
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, [token]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        const errorMsg = json.error?.message || "Invalid credentials. Please try again.";
        setError(errorMsg);
        setIsLoading(false);
        return false;
      }

      if (json.data?.token && json.data?.user) {
        setToken(json.data.token);
        setUser(json.data.user);
        localStorage.setItem(TOKEN_KEY, json.data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(json.data.user));
        setIsLoading(false);
        return true;
      }

      setError("Unexpected response format from authentication server.");
      setIsLoading(false);
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error during authentication.");
      setIsLoading(false);
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (err) {
      console.warn("Server logout request failed", err);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setIsLoading(false);
    }
  };

  const switchCampus = async (campusId: string): Promise<void> => {
    if (!token) return;

    try {
      const res = await fetch("/api/auth/switch-campus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ campusId }),
      });

      const json = await res.json();
      if (res.ok && json.data?.token) {
        setToken(json.data.token);
        localStorage.setItem(TOKEN_KEY, json.data.token);

        // Update active campus in user object
        if (user) {
          const matchedCampus = user.campuses.find((c) => c.id === campusId) || null;
          const updatedUser: SafeUser = {
            ...user,
            activeCampus: matchedCampus,
          };
          setUser(updatedUser);
          localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        }
      }
    } catch (err) {
      console.error("Failed to switch campus context", err);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Super Administrator has all permissions
    if (user.roles.includes("Super Administrator")) return true;
    return user.permissions.includes(permission);
  };

  const hasRole = (roleName: string): boolean => {
    if (!user) return false;
    if (user.roles.includes("Super Administrator")) return true;
    return user.roles.includes(roleName);
  };

  const canAccessCampus = (campusId: string): boolean => {
    if (!user) return false;
    if (user.roles.includes("Super Administrator")) return true;
    return user.campuses.some((c) => c.id === campusId);
  };

  const clearError = () => setError(null);

  const value = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    error,
    login,
    logout,
    switchCampus,
    hasPermission,
    hasRole,
    canAccessCampus,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
