import * as React from "react";
import {
  Megaphone,
  Plus,
  Send,
  FileText,
  Settings,
  Clock,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Archive,
  RefreshCw,
  Search,
  Filter,
  Users,
  Radio,
  Mail,
  MessageSquare,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  Calendar,
  Layers,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/ui/loading-state";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  AnnouncementRecord,
  CommunicationDashboardStats,
  NotificationTemplateRecord,
  CommunicationPreferenceRecord,
  NotificationDeliveryLogRecord,
} from "@/services/communication.service";
import { ANNOUNCEMENT_CATEGORIES } from "@/lib/validations/communication";

export function CommunicationView() {
  const { user, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "announcements" | "direct" | "templates" | "preferences" | "delivery"
  >("overview");

  // State
  const [stats, setStats] = React.useState<CommunicationDashboardStats | null>(null);
  const [announcements, setAnnouncements] = React.useState<AnnouncementRecord[]>([]);
  const [templates, setTemplates] = React.useState<NotificationTemplateRecord[]>([]);
  const [preferences, setPreferences] = React.useState<CommunicationPreferenceRecord[]>([]);
  const [deliveryLogs, setDeliveryLogs] = React.useState<NotificationDeliveryLogRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [statusMessage, setStatusMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Modals
  const [composeModalOpen, setComposeModalOpen] = React.useState(false);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = React.useState<AnnouncementRecord | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);

  // Compose form state
  const [formTitle, setFormTitle] = React.useState("");
  const [formSummary, setFormSummary] = React.useState("");
  const [formContent, setFormContent] = React.useState("");
  const [formCategory, setFormCategory] = React.useState("General");
  const [formPriority, setFormPriority] = React.useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [formScope, setFormScope] = React.useState<"ALL" | "CAMPUS" | "ROLES" | "CLASS">("ALL");
  const [formRoles, setFormRoles] = React.useState<string[]>(["PARENT", "STUDENT"]);
  const [formChannels, setFormChannels] = React.useState<("IN_APP" | "EMAIL" | "SMS")[]>(["IN_APP", "EMAIL"]);
  const [formPublishNow, setFormPublishNow] = React.useState(true);
  const [formScheduledDate, setFormScheduledDate] = React.useState("");
  const [formExpiryDate, setFormExpiryDate] = React.useState("");
  const [formIsPinned, setFormIsPinned] = React.useState(false);
  const [formChangeNote, setFormChangeNote] = React.useState("");
  const [formNotifyMaterial, setFormNotifyMaterial] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Direct Message form state
  const [dmRecipientType, setDmRecipientType] = React.useState<"ROLE" | "CLASS" | "GUARDIAN_OF_STUDENT">("ROLE");
  const [dmRole, setDmRole] = React.useState<string>("PARENT");
  const [dmTitle, setDmTitle] = React.useState("");
  const [dmMessage, setDmMessage] = React.useState("");
  const [dmChannels, setDmChannels] = React.useState<("IN_APP" | "EMAIL" | "SMS")[]>(["IN_APP", "EMAIL"]);
  const [dmPriority, setDmPriority] = React.useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");
  const [selectedTemplateCode, setSelectedTemplateCode] = React.useState<string>("");

  // Load dashboard overview & announcements
  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const [statsRes, annRes, tmplRes, prefRes, delRes] = await Promise.all([
        fetch("/api/communication/overview"),
        fetch("/api/communication/announcements?limit=50"),
        fetch("/api/communication/templates"),
        fetch("/api/communication/preferences"),
        fetch("/api/communication/delivery-logs?limit=50"),
      ]);

      if (statsRes.ok) {
        const j = await statsRes.json();
        setStats(j.data);
      }
      if (annRes.ok) {
        const j = await annRes.json();
        setAnnouncements(j.data?.items || []);
      }
      if (tmplRes.ok) {
        const j = await tmplRes.json();
        setTemplates(j.data || []);
      }
      if (prefRes.ok) {
        const j = await prefRes.json();
        setPreferences(j.data || []);
      }
      if (delRes.ok) {
        const j = await delRes.json();
        setDeliveryLogs(j.data || []);
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to connect to communication services." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Open Compose Modal for New Announcement
  const handleOpenNewAnnouncement = () => {
    setIsEditing(false);
    setSelectedAnnouncement(null);
    setFormTitle("");
    setFormSummary("");
    setFormContent("");
    setFormCategory("General");
    setFormPriority("NORMAL");
    setFormScope("ALL");
    setFormRoles(["PARENT", "STUDENT"]);
    setFormChannels(["IN_APP", "EMAIL"]);
    setFormPublishNow(true);
    setFormScheduledDate("");
    setFormExpiryDate("");
    setFormIsPinned(false);
    setFormChangeNote("");
    setFormNotifyMaterial(false);
    setComposeModalOpen(true);
  };

  // Open Compose Modal for Editing existing announcement
  const handleOpenEdit = (ann: AnnouncementRecord) => {
    setIsEditing(true);
    setSelectedAnnouncement(ann);
    setFormTitle(ann.title);
    setFormSummary(ann.summary || "");
    setFormContent(ann.content);
    setFormCategory(ann.category);
    setFormPriority(ann.priority);
    setFormScope((ann.targetAudience.scope as any) || "ALL");
    setFormRoles(ann.targetAudience.roles || ["PARENT", "STUDENT"]);
    setFormChannels(ann.channels || ["IN_APP"]);
    setFormPublishNow(ann.status === "PUBLISHED");
    setFormScheduledDate(ann.scheduledPublishDate ? ann.scheduledPublishDate.substring(0, 16) : "");
    setFormExpiryDate(ann.expiryDate ? ann.expiryDate.substring(0, 16) : "");
    setFormIsPinned(ann.isPinned);
    setFormChangeNote("");
    setFormNotifyMaterial(false);
    setComposeModalOpen(true);
  };

  // Submit announcement (Create or Update)
  const handleSubmitAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      setStatusMessage({ type: "error", text: "Title and content are required." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const payload: any = {
      title: formTitle.trim(),
      summary: formSummary.trim() || undefined,
      content: formContent.trim(),
      category: formCategory,
      priority: formPriority,
      channels: formChannels,
      targetAudience: {
        scope: formScope,
        roles: formScope === "ROLES" ? formRoles : undefined,
        audienceLabel: formScope === "ALL" ? "Entire Institution" : `${formScope} Broadcast`,
      },
      isPinned: formIsPinned,
      scheduledPublishDate: !formPublishNow && formScheduledDate ? new Date(formScheduledDate).toISOString() : null,
      expiryDate: formExpiryDate ? new Date(formExpiryDate).toISOString() : null,
    };

    try {
      if (isEditing && selectedAnnouncement) {
        payload.changeLogNote = formChangeNote || "Content update";
        payload.notifyOnMaterialChange = formNotifyMaterial;
        const res = await fetch(`/api/communication/announcements/${selectedAnnouncement.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || "Failed to update announcement");
        }
        setStatusMessage({ type: "success", text: "Announcement updated successfully." });
      } else {
        payload.publishNow = formPublishNow;
        const res = await fetch("/api/communication/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error?.message || "Failed to create announcement");
        }
        setStatusMessage({
          type: "success",
          text: formPublishNow ? "Announcement broadcasted immediately across channels." : "Announcement saved successfully.",
        });
      }
      setComposeModalOpen(false);
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Publish a draft announcement
  const handlePublish = async (id: string) => {
    try {
      const res = await fetch(`/api/communication/announcements/${id}/publish`, { method: "POST" });
      if (res.ok) {
        setStatusMessage({ type: "success", text: "Announcement published and broadcast successfully." });
        loadData();
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to publish announcement." });
    }
  };

  // Archive announcement
  const handleArchive = async (id: string) => {
    try {
      const res = await fetch(`/api/communication/announcements/${id}/archive`, { method: "POST" });
      if (res.ok) {
        setStatusMessage({ type: "success", text: "Announcement archived." });
        loadData();
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to archive announcement." });
    }
  };

  // Delete draft announcement
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this draft announcement?")) return;
    try {
      const res = await fetch(`/api/communication/announcements/${id}`, { method: "DELETE" });
      if (res.ok) {
        setStatusMessage({ type: "success", text: "Draft deleted." });
        loadData();
      } else {
        const err = await res.json();
        setStatusMessage({ type: "error", text: err.error?.message || "Could not delete announcement" });
      }
    } catch {
      setStatusMessage({ type: "error", text: "Delete failed." });
    }
  };

  // Process scheduled announcements
  const handleProcessScheduled = async () => {
    try {
      const res = await fetch("/api/communication/scheduled/process", { method: "POST" });
      if (res.ok) {
        const j = await res.json();
        setStatusMessage({
          type: "success",
          text: `Processed scheduled jobs: ${j.data.published} published, ${j.data.expired} expired.`,
        });
        loadData();
      }
    } catch {
      setStatusMessage({ type: "error", text: "Failed to run scheduled job processing." });
    }
  };

  // Send Direct Message
  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmTitle.trim() || !dmMessage.trim()) {
      setStatusMessage({ type: "error", text: "Subject and message are required." });
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const payload: any = {
      recipientType: dmRecipientType,
      role: dmRecipientType === "ROLE" ? dmRole : undefined,
      title: dmTitle.trim(),
      message: dmMessage.trim(),
      channels: dmChannels,
      priority: dmPriority,
    };

    try {
      const res = await fetch("/api/communication/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || "Failed to dispatch message");
      }

      const j = await res.json();
      setStatusMessage({
        type: "success",
        text: `Targeted message transmitted to ${j.data.deliveredCount} recipients.`,
      });
      setDmTitle("");
      setDmMessage("");
      loadData();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load template into direct message
  const handleApplyTemplate = (tmplCode: string) => {
    setSelectedTemplateCode(tmplCode);
    const tmpl = templates.find((t) => t.code === tmplCode);
    if (tmpl) {
      setDmTitle(tmpl.subject);
      setDmMessage(tmpl.body);
    }
  };

  // Toggle user preference
  const handleTogglePreference = async (category: string, channel: "IN_APP" | "EMAIL" | "SMS", currentEnabled: boolean) => {
    if (category === "Emergency" && currentEnabled) {
      setStatusMessage({ type: "error", text: "Emergency alerts are mandatory and cannot be disabled." });
      return;
    }

    const updated = preferences.map((p) =>
      p.category === category && p.channel === channel ? { ...p, enabled: !currentEnabled } : p
    );
    setPreferences(updated);

    try {
      const res = await fetch("/api/communication/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: [{ category, channel, enabled: !currentEnabled }],
        }),
      });
      if (res.ok) {
        const j = await res.json();
        setPreferences(j.data);
      }
    } catch {
      // rollback
      loadData();
    }
  };

  // Filter announcements for the list
  const filteredAnnouncements = announcements.filter((a) => {
    if (statusFilter !== "ALL" && a.status !== statusFilter) return false;
    if (categoryFilter !== "ALL" && a.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.summary && a.summary.toLowerCase().includes(q)) ||
        a.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (isLoading && !stats) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500">
        <LoadingSpinner size="lg" className="border-indigo-600 border-t-transparent" />
        <p className="mt-3 text-xs font-mono">Loading SchoolOS Communication Infrastructure...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              School Communication & Notification Center
            </h1>
            <span className="text-xs text-indigo-600 font-medium">Phase 11</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Institutional announcements, targeted broadcasts, template automation, and delivery monitoring
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasPermission("communication.announcements.manage") && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleProcessScheduled}
              className="text-xs"
              title="Process scheduled broadcasts and expiry checks"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Run Scheduler
            </Button>
          )}

          {hasPermission("communication.announcements.create") && (
            <Button
              size="sm"
              onClick={handleOpenNewAnnouncement}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Announcement
            </Button>
          )}
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3 text-xs rounded-lg flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold ml-4"
          >
            ×
          </button>
        </div>
      )}

      {/* Navigation Segmented Controls (Buttons, not pills) */}
      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-700 font-semibold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Dashboard Overview
        </button>

        <button
          onClick={() => setActiveTab("announcements")}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "announcements"
              ? "border-indigo-600 text-indigo-700 font-semibold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Announcements ({stats?.totalAnnouncements ?? 0})
        </button>

        {hasPermission("communication.messages.send") && (
          <button
            onClick={() => setActiveTab("direct")}
            className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "direct"
                ? "border-indigo-600 text-indigo-700 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Direct & Group Messaging
          </button>
        )}

        <button
          onClick={() => setActiveTab("templates")}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "templates"
              ? "border-indigo-600 text-indigo-700 font-semibold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          Notification Templates ({templates.length})
        </button>

        <button
          onClick={() => setActiveTab("preferences")}
          className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "preferences"
              ? "border-indigo-600 text-indigo-700 font-semibold"
              : "border-transparent text-slate-600 hover:text-slate-900"
          }`}
        >
          My Communication Channels
        </button>

        {hasPermission("communication.delivery.view") && (
          <button
            onClick={() => setActiveTab("delivery")}
            className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "delivery"
                ? "border-indigo-600 text-indigo-700 font-semibold"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            Delivery Tracking Logs ({deliveryLogs.length})
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && stats && (
        <div className="space-y-6">
          {/* Key Metrics Cards (Zero-pill, clean typographic layout) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Published Broadcasts</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900">{stats.publishedAnnouncements}</span>
                  <span className="text-xs text-slate-500">of {stats.totalAnnouncements} total</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span>{stats.draftAnnouncements} draft</span>
                  <span aria-hidden="true">·</span>
                  <span>{stats.scheduledAnnouncements} scheduled</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Notifications Dispatched</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-indigo-700">{stats.totalNotificationsSent}</span>
                  <span className="text-xs text-emerald-600 font-medium">{stats.deliverySuccessRate}% delivered</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span>Multi-channel delivery active</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Unread In-App Alerts</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-slate-900">{stats.unreadNotificationsCount}</span>
                  <span className="text-xs text-slate-500">pending user read</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span>Read/Unread tracking enabled</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200">
              <CardContent className="p-4">
                <p className="text-xs text-slate-500 font-medium">Transmission Failures</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className={`text-2xl font-bold ${stats.failedDeliveriesCount > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                    {stats.failedDeliveriesCount}
                  </span>
                  <span className="text-xs text-slate-500">errors recorded</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span>{stats.failedDeliveriesCount === 0 ? "All pipelines healthy" : "Requires retry"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Noticeboard Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Active Noticeboard Highlights</h3>
                <button
                  onClick={() => setActiveTab("announcements")}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View All Announcements →
                </button>
              </div>

              <div className="space-y-3">
                {stats.recentAnnouncements.map((ann) => (
                  <Card key={ann.id} className="border-slate-200 hover:border-slate-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            {ann.isPinned && <span className="font-semibold text-indigo-700">Pinned</span>}
                            {ann.isPinned && <span aria-hidden="true">·</span>}
                            <span>{ann.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>Priority: {ann.priority}</span>
                            <span aria-hidden="true">·</span>
                            <span>Status: {ann.status}</span>
                          </div>

                          <h4
                            onClick={() => {
                              setSelectedAnnouncement(ann);
                              setDetailModalOpen(true);
                            }}
                            className="text-sm font-bold text-slate-900 hover:text-indigo-600 cursor-pointer"
                          >
                            {ann.title}
                          </h4>

                          <p className="text-xs text-slate-600 line-clamp-2">
                            {ann.summary || ann.content}
                          </p>

                          <div className="pt-2 text-[11px] text-slate-500 flex items-center gap-2">
                            <span>By {ann.authorName || "Administration"}</span>
                            <span aria-hidden="true">·</span>
                            <span>{ann.campusName || "All Campuses"}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {ann.publishDate
                                ? `Published ${new Date(ann.publishDate).toLocaleDateString()}`
                                : `Created ${new Date(ann.createdAt).toLocaleDateString()}`}
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAnnouncement(ann);
                            setDetailModalOpen(true);
                          }}
                          className="shrink-0 text-xs text-slate-600"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Read
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Recent Communication Transmissions */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Recent Transmission Activity</h3>
              <Card className="border-slate-200">
                <CardContent className="p-4 divide-y divide-slate-100">
                  {stats.recentActivity.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No recent transmission logs</p>
                  ) : (
                    stats.recentActivity.map((act) => (
                      <div key={act.id} className="py-2.5 first:pt-0 last:pb-0 text-xs">
                        <p className="font-semibold text-slate-800 truncate">{act.title}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">{act.description}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                          <span>Status: {act.status}</span>
                          <span>{new Date(act.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Scope & Role Security Card */}
              <Card className="border-slate-200 bg-slate-50/50">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <ShieldAlert className="h-4 w-4 text-indigo-600" />
                    <span>Server-Authorized Scoping</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    All broadcasts resolve recipients securely through verified enrollment, teacher allocations, and guardian records. Direct user ID spoofing is blocked at the gateway.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ANNOUNCEMENTS DIRECTORY */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-9 bg-white"
                />
              </div>

              {/* Category selector */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs h-9 px-2.5 border border-slate-300 rounded-md bg-white text-slate-700"
              >
                <option value="ALL">All Categories</option>
                {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Status segmented controls */}
            <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto">
              {["ALL", "PUBLISHED", "DRAFT", "SCHEDULED", "EXPIRED", "ARCHIVED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                    statusFilter === st
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
                  }`}
                >
                  {st.charAt(0) + st.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Announcements List */}
          <div className="space-y-3">
            {filteredAnnouncements.length === 0 ? (
              <Card className="border-slate-200 p-8 text-center text-slate-500">
                <Megaphone className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-800">No Announcements Found</p>
                <p className="text-xs text-slate-500 mt-1">Try adjusting your category or status filters.</p>
              </Card>
            ) : (
              filteredAnnouncements.map((ann) => (
                <Card key={ann.id} className="border-slate-200 hover:border-slate-300 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Clean unboxed metadata with typographic separators */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {ann.isPinned && <span className="font-bold text-indigo-700">Pinned</span>}
                          {ann.isPinned && <span aria-hidden="true">·</span>}
                          <span>{ann.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>Priority: {ann.priority}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-semibold text-slate-700">Status: {ann.status}</span>
                          <span aria-hidden="true">·</span>
                          <span>{ann.campusName || "All Campuses"}</span>
                        </div>

                        <h3
                          onClick={() => {
                            setSelectedAnnouncement(ann);
                            setDetailModalOpen(true);
                          }}
                          className="text-base font-bold text-slate-900 hover:text-indigo-600 cursor-pointer"
                        >
                          {ann.title}
                        </h3>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          {ann.summary || ann.content}
                        </p>

                        <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                          <span>Author: {ann.authorName || "Administration"}</span>
                          <span aria-hidden="true">·</span>
                          <span>Channels: {ann.channels.join(", ")}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {ann.publishDate
                              ? `Published ${new Date(ann.publishDate).toLocaleDateString()}`
                              : ann.scheduledPublishDate
                              ? `Scheduled for ${new Date(ann.scheduledPublishDate).toLocaleDateString()}`
                              : `Draft created ${new Date(ann.createdAt).toLocaleDateString()}`}
                          </span>
                          {ann.version > 1 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-indigo-600 font-medium">v{ann.version} edited</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAnnouncement(ann);
                            setDetailModalOpen(true);
                          }}
                          className="text-xs text-slate-700"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>

                        {hasPermission("communication.announcements.manage") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(ann)}
                            className="text-xs"
                          >
                            <Edit className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                        )}

                        {hasPermission("communication.announcements.publish") && ann.status !== "PUBLISHED" && ann.status !== "ARCHIVED" && (
                          <Button
                            size="sm"
                            onClick={() => handlePublish(ann.id)}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Publish
                          </Button>
                        )}

                        {hasPermission("communication.announcements.manage") && ann.status === "PUBLISHED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(ann.id)}
                            className="text-xs text-slate-500"
                            title="Archive announcement"
                          >
                            <Archive className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {hasPermission("communication.announcements.manage") && ann.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(ann.id)}
                            className="text-xs text-red-600 hover:text-red-700"
                            title="Delete draft"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: DIRECT & GROUP MESSAGING */}
      {activeTab === "direct" && hasPermission("communication.messages.send") && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-slate-200">
            <CardHeader className="border-b border-slate-100 pb-3">
              <CardTitle className="text-base font-bold text-slate-900">
                Compose Targeted Communication
              </CardTitle>
              <p className="text-xs text-slate-500">
                Transmit messages to verified roles, form classes, or student guardians with server-enforced scoping.
              </p>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSendDirectMessage} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Recipient Target Scope
                    </label>
                    <select
                      value={dmRecipientType}
                      onChange={(e) => setDmRecipientType(e.target.value as any)}
                      className="w-full text-xs h-9 px-3 border border-slate-300 rounded-md bg-white text-slate-800"
                    >
                      <option value="ROLE">Specific User Role</option>
                      <option value="CLASS">Grade 10 Class (All Enrolled Students & Parents)</option>
                      <option value="GUARDIAN_OF_STUDENT">All Enrolled Student Guardians</option>
                    </select>
                  </div>

                  {dmRecipientType === "ROLE" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Select Target Role
                      </label>
                      <select
                        value={dmRole}
                        onChange={(e) => setDmRole(e.target.value)}
                        className="w-full text-xs h-9 px-3 border border-slate-300 rounded-md bg-white text-slate-800"
                      >
                        <option value="PARENT">Parents / Guardians</option>
                        <option value="STUDENT">Enrolled Students</option>
                        <option value="TEACHER">Teaching Faculty</option>
                        <option value="STAFF">All Administrative Staff</option>
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject / Title
                  </label>
                  <Input
                    placeholder="e.g. Schedule Update for Physics Practical"
                    value={dmTitle}
                    onChange={(e) => setDmTitle(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Message Body
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Type targeted message content..."
                    value={dmMessage}
                    onChange={(e) => setDmMessage(e.target.value)}
                    className="w-full text-xs p-3 border border-slate-300 rounded-md focus-visible:ring-2 focus-visible:ring-indigo-500 font-sans"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Transmission Channels
                    </label>
                    <div className="flex items-center gap-4 text-xs text-slate-700 mt-2">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dmChannels.includes("IN_APP")}
                          onChange={(e) => {
                            if (e.target.checked) setDmChannels((prev) => [...prev, "IN_APP"]);
                            else if (dmChannels.length > 1) setDmChannels((prev) => prev.filter((c) => c !== "IN_APP"));
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>In-App Alert</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dmChannels.includes("EMAIL")}
                          onChange={(e) => {
                            if (e.target.checked) setDmChannels((prev) => [...prev, "EMAIL"]);
                            else if (dmChannels.length > 1) setDmChannels((prev) => prev.filter((c) => c !== "EMAIL"));
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>Email Dispatch</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={dmPriority}
                      onChange={(e) => setDmPriority(e.target.value as any)}
                      className="w-full text-xs h-9 px-3 border border-slate-300 rounded-md bg-white text-slate-800"
                    >
                      <option value="NORMAL">Normal Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="URGENT">Urgent / Safety Critical</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 flex items-center justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {isSubmitting ? "Transmitting..." : "Send Targeted Message"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Quick Template Picker Sidecar */}
          <div className="space-y-4">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-100 pb-2">
                <CardTitle className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Quick Insert Template
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 divide-y divide-slate-100">
                {templates.map((tmpl) => (
                  <div key={tmpl.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1">
                    <p className="text-xs font-bold text-slate-800">{tmpl.name}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{tmpl.subject}</p>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl.code)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <span>Insert template text</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-slate-50/50">
              <CardContent className="p-4 space-y-2">
                <h4 className="text-xs font-bold text-slate-900">Audience Isolation Enforcement</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Teachers sending communications to a class only target students and parents linked to that specific assigned class. Multi-tenant rules guarantee zero cross-campus leakage.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: NOTIFICATION TEMPLATES */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configured Notification Templates</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Standardized templates with token replacement for automated academic, attendance, and financial alerts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <Card key={tmpl.id} className="border-slate-200">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{tmpl.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{tmpl.code}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-0.5">{tmpl.name}</h4>
                    </div>
                  </div>

                  <div className="text-xs bg-slate-50 p-2.5 rounded border border-slate-100 font-mono text-slate-700">
                    <p className="font-semibold text-slate-900 mb-1">Subject: {tmpl.subject}</p>
                    <p className="text-slate-600 font-sans text-xs leading-relaxed">{tmpl.body}</p>
                  </div>

                  <div className="pt-2 text-[11px] text-slate-500 flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-700">Supported Tokens:</span>
                    {tmpl.variables.map((v) => (
                      <span key={v} className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-mono text-[10px]">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: COMMUNICATION PREFERENCES */}
      {activeTab === "preferences" && (
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Communication & Delivery Preferences
            </CardTitle>
            <p className="text-xs text-slate-500">
              Configure delivery channels per alert category. Emergency safety broadcasts are mandatory and cannot be disabled.
            </p>
          </CardHeader>
          <CardContent className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-3 font-semibold">Alert Category</th>
                    <th className="py-2.5 px-3 font-semibold">In-App Alerts</th>
                    <th className="py-2.5 px-3 font-semibold">Email Digest / Direct</th>
                    <th className="py-2.5 px-3 font-semibold">SMS / Push</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {["General", "Academic", "Finance", "Attendance", "Emergency"].map((cat) => {
                    const inAppPref = preferences.find((p) => p.category === cat && p.channel === "IN_APP");
                    const emailPref = preferences.find((p) => p.category === cat && p.channel === "EMAIL");
                    const smsPref = preferences.find((p) => p.category === cat && p.channel === "SMS");

                    const isEmergency = cat === "Emergency";

                    return (
                      <tr key={cat} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">
                          <p className="font-bold text-slate-900">{cat}</p>
                          <p className="text-[11px] text-slate-500">
                            {cat === "Emergency"
                              ? "Campus lockdowns, weather warnings, severe alerts"
                              : cat === "Academic"
                              ? "Report cards, exam dates, syllabus notes"
                              : cat === "Finance"
                              ? "Invoice statements, receipts, fee tariffs"
                              : cat === "Attendance"
                              ? "Daily absence warnings, truancy notifications"
                              : "Noticeboard updates, sports and cultural events"}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isEmergency || (inAppPref ? inAppPref.enabled : true)}
                            disabled={isEmergency}
                            onChange={() => handleTogglePreference(cat, "IN_APP", inAppPref?.enabled ?? true)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isEmergency || (emailPref ? emailPref.enabled : true)}
                            disabled={isEmergency}
                            onChange={() => handleTogglePreference(cat, "EMAIL", emailPref?.enabled ?? true)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            checked={isEmergency || (smsPref ? smsPref.enabled : false)}
                            disabled={isEmergency}
                            onChange={() => handleTogglePreference(cat, "SMS", smsPref?.enabled ?? false)}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 6: DELIVERY LOGS */}
      {activeTab === "delivery" && hasPermission("communication.delivery.view") && (
        <Card className="border-slate-200">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="text-base font-bold text-slate-900">
              Notification Delivery & Transmission Audit Log
            </CardTitle>
            <p className="text-xs text-slate-500">
              Full transmission history across in-app, email, and SMS channels with delivery timestamps and retry hooks.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                    <th className="py-2.5 px-4 font-semibold">Subject / Message</th>
                    <th className="py-2.5 px-3 font-semibold">Recipient</th>
                    <th className="py-2.5 px-3 font-semibold">Channel</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold">Attempts</th>
                    <th className="py-2.5 px-4 font-semibold">Dispatched At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deliveryLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No delivery records available
                      </td>
                    </tr>
                  ) : (
                    deliveryLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-4">
                          <p className="font-semibold text-slate-900 truncate max-w-xs">{log.subject || "Notification"}</p>
                          {log.errorMessage && (
                            <p className="text-[11px] text-red-600 mt-0.5">{log.errorMessage}</p>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="text-slate-800">{log.recipientName || log.recipientAddress}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{log.recipientAddress}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-slate-700 font-medium">{log.channel}</span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`font-semibold ${
                              log.status === "DELIVERED" || log.status === "READ"
                                ? "text-emerald-700"
                                : log.status === "FAILED"
                                ? "text-red-700"
                                : "text-slate-600"
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{log.attempts}</td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {new Date(log.createdAt).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL: COMPOSE ANNOUNCEMENT (CREATE / EDIT) */}
      <Dialog
        open={composeModalOpen}
        onOpenChange={setComposeModalOpen}
        maxWidth="lg"
        title={isEditing ? `Edit Announcement (v${selectedAnnouncement?.version ?? 1})` : "Compose Institutional Announcement"}
        description="Craft an authorized announcement. Drafts can be saved for review or scheduled for future delivery."
      >
        <form onSubmit={handleSubmitAnnouncement} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Announcement Title
            </label>
            <Input
              placeholder="e.g. End of Term Examination Schedule & Guidelines"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full text-xs h-9 px-3 border border-slate-300 rounded-md bg-white text-slate-800"
              >
                {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={formPriority}
                onChange={(e) => setFormPriority(e.target.value as any)}
                className="w-full text-xs h-9 px-3 border border-slate-300 rounded-md bg-white text-slate-800"
              >
                <option value="LOW">Low (Informational)</option>
                <option value="NORMAL">Normal (Standard)</option>
                <option value="HIGH">High (Important Notice)</option>
                <option value="URGENT">Urgent (Immediate Attention)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Summary / Excerpt (Optional)
            </label>
            <Input
              placeholder="Brief 1-2 sentence overview for notifications and preview cards"
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Content
            </label>
            <textarea
              rows={6}
              placeholder="Enter full announcement text, instructions, and dates..."
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              className="w-full text-xs p-3 border border-slate-300 rounded-md focus-visible:ring-2 focus-visible:ring-indigo-500 font-sans"
              required
            />
          </div>

          {/* Target Audience Controls */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Target Audience & Scoping</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Scope Boundary</label>
                <select
                  value={formScope}
                  onChange={(e) => setFormScope(e.target.value as any)}
                  className="w-full text-xs h-8 px-2 border border-slate-300 rounded bg-white"
                >
                  <option value="ALL">Entire Organization (All Campuses)</option>
                  <option value="CAMPUS">Active Campus Only</option>
                  <option value="ROLES">Specific Roles (Filter below)</option>
                </select>
              </div>

              {formScope === "ROLES" && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Roles</label>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-700">
                    {["PARENT", "STUDENT", "TEACHER", "STAFF"].map((r) => (
                      <label key={r} className="flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formRoles.includes(r)}
                          onChange={(e) => {
                            if (e.target.checked) setFormRoles((prev) => [...prev, r]);
                            else if (formRoles.length > 1) setFormRoles((prev) => prev.filter((item) => item !== r));
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span>{r}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Delivery & Schedule Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Broadcast Timing
              </label>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formPublishNow}
                    onChange={() => setFormPublishNow(true)}
                    name="timing"
                    className="text-indigo-600"
                  />
                  <span>Publish Immediately Now</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formPublishNow}
                    onChange={() => setFormPublishNow(false)}
                    name="timing"
                    className="text-indigo-600"
                  />
                  <span>Save as Draft or Schedule for Later</span>
                </label>
              </div>

              {!formPublishNow && (
                <div className="mt-2">
                  <Input
                    type="datetime-local"
                    value={formScheduledDate}
                    onChange={(e) => setFormScheduledDate(e.target.value)}
                    className="text-xs h-8"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Leave empty to store as a quiet draft.</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expiry Date (Optional)
              </label>
              <Input
                type="datetime-local"
                value={formExpiryDate}
                onChange={(e) => setFormExpiryDate(e.target.value)}
                className="text-xs h-8"
              />
              <div className="mt-3 flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  <span>Pin to top of noticeboards</span>
                </label>
              </div>
            </div>
          </div>

          {/* If Editing a published announcement */}
          {isEditing && selectedAnnouncement?.status === "PUBLISHED" && (
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Change Log Audit Note (Version Control)
              </label>
              <Input
                placeholder="e.g. Corrected examination room number from B2 to B4"
                value={formChangeNote}
                onChange={(e) => setFormChangeNote(e.target.value)}
                className="text-xs h-8"
              />
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formNotifyMaterial}
                  onChange={(e) => setFormNotifyMaterial(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Material update: re-notify all recipients of this change</span>
              </label>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setComposeModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSubmitting
                ? "Processing..."
                : isEditing
                ? "Save Changes"
                : formPublishNow
                ? "Publish & Broadcast"
                : "Save Announcement"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* MODAL: ANNOUNCEMENT DETAIL VIEW */}
      {selectedAnnouncement && (
        <Dialog
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          maxWidth="lg"
          title={selectedAnnouncement.title}
          description={`${selectedAnnouncement.category} · Priority: ${selectedAnnouncement.priority} · Status: ${selectedAnnouncement.status}`}
        >
          <div className="space-y-4 pt-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 border-b border-slate-100 pb-3">
              <span>Author: {selectedAnnouncement.authorName || "Administration"}</span>
              <span aria-hidden="true">·</span>
              <span>Scope: {selectedAnnouncement.campusName || "All Campuses"}</span>
              <span aria-hidden="true">·</span>
              <span>
                {selectedAnnouncement.publishDate
                  ? `Published ${new Date(selectedAnnouncement.publishDate).toLocaleDateString()}`
                  : `Created ${new Date(selectedAnnouncement.createdAt).toLocaleDateString()}`}
              </span>
              {selectedAnnouncement.version > 1 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-indigo-700">v{selectedAnnouncement.version}</span>
                </>
              )}
            </div>

            <div className="text-xs text-slate-800 leading-relaxed whitespace-pre-line bg-slate-50 p-4 rounded-lg border border-slate-100">
              {selectedAnnouncement.content}
            </div>

            {/* Version Audit Log if edited */}
            {selectedAnnouncement.editHistory && selectedAnnouncement.editHistory.length > 0 && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <h4 className="text-xs font-bold text-slate-900">Revision History</h4>
                <div className="space-y-1.5 text-xs text-slate-600">
                  {selectedAnnouncement.editHistory.map((h, i) => (
                    <div key={i} className="flex items-center justify-between bg-white p-2 rounded border border-slate-100">
                      <span>v{h.version}: {h.changeLogNote || "Content updated"}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(h.editedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-slate-100 pt-4 flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDetailModalOpen(false)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
