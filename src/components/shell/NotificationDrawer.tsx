import * as React from "react";
import { Bell, Info, ShieldAlert, CheckCheck, Megaphone, FileText } from "lucide-react";
import { Button } from "../ui/button";

interface LiveNotification {
  id: string;
  type: string;
  priority?: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
}

export function NotificationDrawer() {
  const [open, setOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<LiveNotification[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close when clicking outside
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  // Fetch notifications on mount and whenever opened
  const loadNotifications = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // Try communication endpoint first, fallback to portal
      const res = await fetch("/api/communication/notifications?limit=20");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
      } else {
        const fallbackRes = await fetch("/api/portal/notifications?limit=20");
        if (fallbackRes.ok) {
          const json = await fallbackRes.json();
          setNotifications(json.data || []);
        }
      }
    } catch {
      // Quiet fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  React.useEffect(() => {
    if (open) {
      loadNotifications();
    }
  }, [open, loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch(`/api/communication/notifications/${id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch {
      // optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch("/api/communication/notifications/read-all", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  };

  const getIcon = (type: string, priority?: string) => {
    if (priority === "URGENT" || priority === "HIGH") {
      return <ShieldAlert className="h-4 w-4 text-amber-600 mt-0.5" />;
    }
    if (type === "ANNOUNCEMENT") {
      return <Megaphone className="h-4 w-4 text-indigo-600 mt-0.5" />;
    }
    if (type === "ACADEMIC" || type === "EXAMINATION") {
      return <FileText className="h-4 w-4 text-sky-600 mt-0.5" />;
    }
    return <Info className="h-4 w-4 text-slate-500 mt-0.5" />;
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-slate-600 hover:text-slate-900"
        aria-label={`Notifications, ${unreadCount} unread`}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-88 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-xl z-50 animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Notifications
              </h4>
              <p className="text-[11px] text-slate-500">
                {unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}` : "All alerts caught up"}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1.5 py-1"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                <Bell className="h-5 w-5 mx-auto text-slate-300 mb-1" />
                <p>No alerts in your inbox</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                  className={`flex items-start gap-3 p-3.5 hover:bg-slate-50 transition-colors cursor-pointer ${
                    !n.isRead ? "bg-indigo-50/30" : ""
                  }`}
                >
                  <div className="shrink-0">{getIcon(n.type, n.priority)}</div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs leading-tight truncate ${!n.isRead ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    <div className="text-[10px] text-slate-400 pt-0.5 flex items-center gap-1.5">
                      <span>{n.type}</span>
                      <span aria-hidden="true">·</span>
                      <span>{new Date(n.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-100 p-2.5 text-center bg-slate-50/50 rounded-b-lg">
            <p className="text-[11px] text-slate-500">
              SchoolOS Live Communication & Notification Center
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
