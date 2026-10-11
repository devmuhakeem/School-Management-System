import { prisma } from "@/lib/db";
import { TenantContext } from "@/repositories/types";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  UnauthorizedError,
} from "@/lib/errors";
import { logger } from "@/lib/logger";
import { auditRepository } from "@/repositories/audit.repository";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID } from "./admin.service";
import { emailProvider } from "@/lib/communication/email-provider";
import {
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
  SendDirectMessageInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  UpdatePreferencesInput,
  QueryAnnouncementsParams,
  QueryNotificationsParams,
  AnnouncementPriority,
  AnnouncementStatus,
  DeliveryChannel,
  DeliveryStatus,
  TargetAudience,
} from "@/lib/validations/communication";

// =============================================================================
// DOMAIN MODELS & TYPES
// =============================================================================

export interface AnnouncementRecord {
  id: string;
  organizationId: string;
  campusId?: string | null;
  campusName?: string;
  title: string;
  slug: string;
  summary?: string | null;
  content: string;
  category: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  authorId: string;
  authorName?: string;
  authorRole?: string;
  targetAudience: TargetAudience;
  channels: DeliveryChannel[];
  publishDate?: string | null;
  scheduledPublishDate?: string | null;
  expiryDate?: string | null;
  archivedDate?: string | null;
  version: number;
  editHistory: Array<{
    version: number;
    title: string;
    content: string;
    editedById: string;
    editedAt: string;
    changeLogNote?: string;
  }>;
  attachmentUrls: string[];
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  recipientCount?: number;
  deliveryStats?: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    read: number;
  };
}

export interface NotificationRecord {
  id: string;
  organizationId: string;
  recipientId: string;
  recipientName?: string;
  recipientEmail?: string;
  announcementId?: string | null;
  type: string;
  priority: AnnouncementPriority;
  title: string;
  message: string;
  link?: string | null;
  relatedEntity?: string | null;
  relatedEntityId?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationTemplateRecord {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  category: string;
  type: string;
  subject: string;
  body: string;
  variables: string[];
  channels: DeliveryChannel[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CommunicationPreferenceRecord {
  id: string;
  organizationId: string;
  userId: string;
  category: string;
  channel: DeliveryChannel;
  enabled: boolean;
  updatedAt: string;
}

export interface NotificationDeliveryLogRecord {
  id: string;
  organizationId: string;
  notificationId?: string | null;
  announcementId?: string | null;
  recipientId: string;
  recipientName?: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  recipientAddress: string;
  subject?: string | null;
  errorMessage?: string | null;
  attempts: number;
  sentAt?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface CommunicationDashboardStats {
  totalAnnouncements: number;
  publishedAnnouncements: number;
  draftAnnouncements: number;
  scheduledAnnouncements: number;
  expiredAnnouncements: number;
  totalNotificationsSent: number;
  unreadNotificationsCount: number;
  failedDeliveriesCount: number;
  deliverySuccessRate: number;
  recentAnnouncements: AnnouncementRecord[];
  recentActivity: Array<{
    id: string;
    type: "ANNOUNCEMENT" | "NOTIFICATION" | "DELIVERY";
    title: string;
    description: string;
    timestamp: string;
    status: string;
  }>;
}

// =============================================================================
// IN-MEMORY STORE FOR DEV & TEST RESILIENCE
// =============================================================================

interface InMemoryCommState {
  announcements: AnnouncementRecord[];
  templates: NotificationTemplateRecord[];
  preferences: CommunicationPreferenceRecord[];
  deliveryLogs: NotificationDeliveryLogRecord[];
  notifications: NotificationRecord[];
}

function initializeCommState(): InMemoryCommState {
  const announcements: AnnouncementRecord[] = [
    {
      id: "ann-001",
      organizationId: DEMO_ORG_ID,
      campusId: null, // Entire school
      campusName: "All Campuses",
      title: "Welcome to 2025/2026 Academic Session — Term 2 Resumption",
      slug: "welcome-term-2-resumption-2025-2026",
      summary: "Important administrative guidelines and academic schedule for the upcoming school term.",
      content:
        "We are pleased to welcome all faculty, students, and parents to the Second Term of the 2025/2026 Academic Session. Classes resume promptly at 08:00 AM on Monday. All students are required to be in full school uniform.",
      category: "Academic",
      priority: "NORMAL",
      status: "PUBLISHED",
      authorId: "u-principal-01",
      authorName: "Dr. Arthur Bell (Principal)",
      authorRole: "Principal",
      targetAudience: {
        scope: "ALL",
        audienceLabel: "Entire Institution (All Campuses)",
      },
      channels: ["IN_APP", "EMAIL"],
      publishDate: "2026-09-20T08:00:00.000Z",
      scheduledPublishDate: null,
      expiryDate: "2026-10-30T23:59:59.000Z",
      archivedDate: null,
      version: 1,
      editHistory: [],
      attachmentUrls: [],
      isPinned: true,
      createdAt: "2026-09-19T10:00:00.000Z",
      updatedAt: "2026-09-20T08:00:00.000Z",
      recipientCount: 4,
      deliveryStats: { total: 4, sent: 4, delivered: 4, failed: 0, read: 3 },
    },
    {
      id: "ann-002",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      campusName: "Apex Main Campus",
      title: "Parent-Teacher Conference (PTC) & Term Progress Reviews",
      slug: "parent-teacher-conference-term-progress-reviews",
      summary: "Consultation schedule for Junior and Senior Secondary classes in the Multipurpose Auditorium.",
      content:
        "The mid-term Parent-Teacher Conference is scheduled for Saturday, 18th October from 09:00 AM to 03:00 PM. Individual teacher booking slots will be distributed via ward diaries and student portals.",
      category: "Events",
      priority: "HIGH",
      status: "PUBLISHED",
      authorId: "u-principal-01",
      authorName: "Dr. Arthur Bell (Principal)",
      authorRole: "Principal",
      targetAudience: {
        scope: "ROLES",
        roles: ["PARENT", "TEACHER"],
        campusId: DEMO_CAMPUS_MAIN_ID,
        audienceLabel: "Main Campus Parents & Teachers",
      },
      channels: ["IN_APP", "EMAIL"],
      publishDate: "2026-09-24T09:00:00.000Z",
      scheduledPublishDate: null,
      expiryDate: "2026-10-19T00:00:00.000Z",
      archivedDate: null,
      version: 1,
      editHistory: [],
      attachmentUrls: [],
      isPinned: false,
      createdAt: "2026-09-24T08:30:00.000Z",
      updatedAt: "2026-09-24T09:00:00.000Z",
      recipientCount: 2,
      deliveryStats: { total: 2, sent: 2, delivered: 2, failed: 0, read: 2 },
    },
    {
      id: "ann-003",
      organizationId: DEMO_ORG_ID,
      campusId: DEMO_CAMPUS_MAIN_ID,
      campusName: "Apex Main Campus",
      title: "Annual Inter-House Sports & Athletic Championships 2026",
      slug: "annual-inter-house-sports-2026",
      summary: "Draft coordination memo for physical education coaches, house masters, and student captains.",
      content:
        "Draft coordination itinerary for track and field events, relay heats, marching band rehearsals, and safety arrangements. Feedback from house masters requested by Wednesday.",
      category: "Events",
      priority: "LOW",
      status: "DRAFT",
      authorId: "u-super-admin-01",
      authorName: "System Administrator",
      authorRole: "Super Administrator",
      targetAudience: {
        scope: "CAMPUS",
        campusId: DEMO_CAMPUS_MAIN_ID,
        audienceLabel: "Main Campus Staff & Students",
      },
      channels: ["IN_APP"],
      publishDate: null,
      scheduledPublishDate: null,
      expiryDate: null,
      archivedDate: null,
      version: 1,
      editHistory: [],
      attachmentUrls: [],
      isPinned: false,
      createdAt: "2026-09-27T11:00:00.000Z",
      updatedAt: "2026-09-27T11:00:00.000Z",
    },
    {
      id: "ann-004",
      organizationId: DEMO_ORG_ID,
      campusId: null,
      campusName: "All Campuses",
      title: "Mid-Term National Public Holiday Notice",
      slug: "mid-term-national-holiday-notice-2026",
      summary: "School closure on Monday October 6 for official public observance.",
      content:
        "In accordance with federal public holiday schedules, all school facilities and administrative offices will be closed on Monday, 6th October. Boarding houses will remain fully staffed with regular dining and security operations.",
      category: "Holiday",
      priority: "NORMAL",
      status: "SCHEDULED",
      authorId: "u-super-admin-01",
      authorName: "System Administrator",
      authorRole: "Super Administrator",
      targetAudience: {
        scope: "ALL",
        audienceLabel: "All Students, Parents & Staff",
      },
      channels: ["IN_APP", "EMAIL"],
      publishDate: null,
      scheduledPublishDate: "2026-10-01T07:00:00.000Z",
      expiryDate: "2026-10-07T00:00:00.000Z",
      archivedDate: null,
      version: 1,
      editHistory: [],
      attachmentUrls: [],
      isPinned: false,
      createdAt: "2026-09-27T14:00:00.000Z",
      updatedAt: "2026-09-27T14:00:00.000Z",
    },
  ];

  const templates: NotificationTemplateRecord[] = [
    {
      id: "tmpl-001",
      organizationId: DEMO_ORG_ID,
      name: "Report Card Publication Notice",
      code: "ACADEMIC_REPORT_PUBLISHED",
      category: "Academic",
      type: "ACADEMIC",
      subject: "Official Academic Report Card Published — {{student_name}}",
      body: "Dear {{parent_name}}, the official academic report card for {{student_name}} ({{class_name}}) for {{term_name}} has been published and is now available in your Parent Portal.",
      variables: ["parent_name", "student_name", "class_name", "term_name"],
      channels: ["IN_APP", "EMAIL"],
      isActive: true,
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    },
    {
      id: "tmpl-002",
      organizationId: DEMO_ORG_ID,
      name: "Fee Statement & Invoice Reminder",
      code: "FINANCE_INVOICE_ISSUED",
      category: "Finance",
      type: "FINANCE",
      subject: "Fee Invoice {{invoice_number}} Issued for {{student_name}}",
      body: "Dear {{parent_name}}, an invoice in the amount of {{amount}} for {{student_name}} has been generated for {{fee_item}}. The payment deadline is {{due_date}}.",
      variables: ["parent_name", "student_name", "invoice_number", "amount", "fee_item", "due_date"],
      channels: ["IN_APP", "EMAIL"],
      isActive: true,
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    },
    {
      id: "tmpl-003",
      organizationId: DEMO_ORG_ID,
      name: "Unexcused Absence Alert",
      code: "ATTENDANCE_ABSENCE_ALERT",
      category: "Attendance",
      type: "ATTENDANCE",
      subject: "Daily Attendance Alert — {{student_name}} Marked Absent",
      body: "Dear {{parent_name}}, {{student_name}} was marked absent from school today, {{date}}. If this is an excused absence, please submit a medical excuse note via the portal.",
      variables: ["parent_name", "student_name", "date"],
      channels: ["IN_APP", "EMAIL", "SMS"],
      isActive: true,
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    },
    {
      id: "tmpl-004",
      organizationId: DEMO_ORG_ID,
      name: "Urgent Institutional / Weather Alert",
      code: "EMERGENCY_CAMPUS_ALERT",
      category: "Emergency",
      type: "EMERGENCY",
      subject: "URGENT NOTICE: {{headline}}",
      body: "Important School Alert: {{message}}. Please monitor official communication channels for updates.",
      variables: ["headline", "message"],
      channels: ["IN_APP", "EMAIL", "SMS"],
      isActive: true,
      createdAt: "2026-09-15T00:00:00.000Z",
      updatedAt: "2026-09-15T00:00:00.000Z",
    },
  ];

  const notifications: NotificationRecord[] = [
    {
      id: "notif-001",
      organizationId: DEMO_ORG_ID,
      recipientId: "u-parent-01",
      recipientName: "Dr. Sarah Wright",
      recipientEmail: "parent@apex-demo.internal",
      announcementId: "ann-001",
      type: "ANNOUNCEMENT",
      priority: "NORMAL",
      title: "Welcome to 2025/2026 Academic Session — Term 2 Resumption",
      message: "We are pleased to welcome all faculty, students, and parents to the Second Term of the 2025/2026 Academic Session.",
      link: "/portal/parent",
      relatedEntity: "Announcement",
      relatedEntityId: "ann-001",
      isRead: false,
      createdAt: "2026-09-20T08:00:00.000Z",
    },
    {
      id: "notif-002",
      organizationId: DEMO_ORG_ID,
      recipientId: "u-parent-01",
      recipientName: "Dr. Sarah Wright",
      recipientEmail: "parent@apex-demo.internal",
      announcementId: "ann-002",
      type: "EVENT",
      priority: "HIGH",
      title: "Parent-Teacher Conference (PTC) & Term Progress Reviews",
      message: "The mid-term Parent-Teacher Conference is scheduled for Saturday, 18th October from 09:00 AM to 03:00 PM.",
      link: "/portal/parent",
      relatedEntity: "Announcement",
      relatedEntityId: "ann-002",
      isRead: true,
      readAt: "2026-09-25T10:00:00.000Z",
      createdAt: "2026-09-24T09:00:00.000Z",
    },
    {
      id: "notif-003",
      organizationId: DEMO_ORG_ID,
      recipientId: "u-student-01",
      recipientName: "Lucas Wright",
      recipientEmail: "student@apex-demo.internal",
      announcementId: "ann-001",
      type: "ANNOUNCEMENT",
      priority: "NORMAL",
      title: "Welcome to 2025/2026 Academic Session — Term 2 Resumption",
      message: "Classes resume promptly at 08:00 AM on Monday. All students are required to be in full school uniform.",
      link: "/portal/student",
      relatedEntity: "Announcement",
      relatedEntityId: "ann-001",
      isRead: false,
      createdAt: "2026-09-20T08:00:00.000Z",
    },
    {
      id: "notif-004",
      organizationId: DEMO_ORG_ID,
      recipientId: "u-teacher-01",
      recipientName: "Marcus Sterling (Teacher)",
      recipientEmail: "teacher.math@apex-demo.internal",
      announcementId: "ann-002",
      type: "EVENT",
      priority: "HIGH",
      title: "Parent-Teacher Conference (PTC) Roster Released",
      message: "Please review your conference schedule and room assignment for the upcoming PTC session.",
      link: "/communication",
      relatedEntity: "Announcement",
      relatedEntityId: "ann-002",
      isRead: true,
      readAt: "2026-09-24T12:00:00.000Z",
      createdAt: "2026-09-24T09:00:00.000Z",
    },
  ];

  const deliveryLogs: NotificationDeliveryLogRecord[] = [
    {
      id: "del-001",
      organizationId: DEMO_ORG_ID,
      notificationId: "notif-001",
      announcementId: "ann-001",
      recipientId: "u-parent-01",
      recipientName: "Dr. Sarah Wright",
      channel: "IN_APP",
      status: "DELIVERED",
      recipientAddress: "u-parent-01",
      subject: "Welcome to 2025/2026 Academic Session — Term 2 Resumption",
      attempts: 1,
      sentAt: "2026-09-20T08:00:01.000Z",
      deliveredAt: "2026-09-20T08:00:01.000Z",
      createdAt: "2026-09-20T08:00:00.000Z",
    },
    {
      id: "del-002",
      organizationId: DEMO_ORG_ID,
      notificationId: "notif-001",
      announcementId: "ann-001",
      recipientId: "u-parent-01",
      recipientName: "Dr. Sarah Wright",
      channel: "EMAIL",
      status: "DELIVERED",
      recipientAddress: "parent@apex-demo.internal",
      subject: "Welcome to 2025/2026 Academic Session — Term 2 Resumption",
      attempts: 1,
      sentAt: "2026-09-20T08:00:02.000Z",
      deliveredAt: "2026-09-20T08:00:05.000Z",
      createdAt: "2026-09-20T08:00:00.000Z",
    },
    {
      id: "del-003",
      organizationId: DEMO_ORG_ID,
      notificationId: "notif-002",
      announcementId: "ann-002",
      recipientId: "u-parent-01",
      recipientName: "Dr. Sarah Wright",
      channel: "IN_APP",
      status: "READ",
      recipientAddress: "u-parent-01",
      subject: "Parent-Teacher Conference (PTC) & Term Progress Reviews",
      attempts: 1,
      sentAt: "2026-09-24T09:00:01.000Z",
      deliveredAt: "2026-09-24T09:00:01.000Z",
      readAt: "2026-09-25T10:00:00.000Z",
      createdAt: "2026-09-24T09:00:00.000Z",
    },
    {
      id: "del-004",
      organizationId: DEMO_ORG_ID,
      notificationId: "notif-003",
      announcementId: "ann-001",
      recipientId: "u-student-01",
      recipientName: "Lucas Wright",
      channel: "IN_APP",
      status: "DELIVERED",
      recipientAddress: "u-student-01",
      subject: "Welcome to 2025/2026 Academic Session — Term 2 Resumption",
      attempts: 1,
      sentAt: "2026-09-20T08:00:01.000Z",
      deliveredAt: "2026-09-20T08:00:01.000Z",
      createdAt: "2026-09-20T08:00:00.000Z",
    },
  ];

  const preferences: CommunicationPreferenceRecord[] = [
    {
      id: "pref-001",
      organizationId: DEMO_ORG_ID,
      userId: "u-parent-01",
      category: "Academic",
      channel: "IN_APP",
      enabled: true,
      updatedAt: "2026-09-20T00:00:00.000Z",
    },
    {
      id: "pref-002",
      organizationId: DEMO_ORG_ID,
      userId: "u-parent-01",
      category: "Academic",
      channel: "EMAIL",
      enabled: true,
      updatedAt: "2026-09-20T00:00:00.000Z",
    },
    {
      id: "pref-003",
      organizationId: DEMO_ORG_ID,
      userId: "u-parent-01",
      category: "Finance",
      channel: "EMAIL",
      enabled: true,
      updatedAt: "2026-09-20T00:00:00.000Z",
    },
  ];

  return { announcements, templates, preferences, deliveryLogs, notifications };
}

const commState = initializeCommState();

// Helper slug generator
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// =============================================================================
// COMMUNICATION SERVICE
// =============================================================================

export class CommunicationService {
  // ---------------------------------------------------------------------------
  // 1. ANNOUNCEMENTS WORKFLOW
  // ---------------------------------------------------------------------------

  /**
   * Retrieves announcements adhering to tenant isolation and caller authorization
   */
  public async getAnnouncements(
    ctx: TenantContext,
    params: QueryAnnouncementsParams
  ): Promise<{ items: AnnouncementRecord[]; total: number; page: number; limit: number }> {
    const isStaffOrAdmin =
      ctx.userRoles?.some((r) =>
        ["Super Administrator", "School Administrator", "Principal", "Vice Principal", "Academic Teacher", "Form / Class Teacher", "Accountant"].includes(r)
      ) ?? false;

    // Filter in-memory state
    let filtered = commState.announcements.filter(
      (a) => a.organizationId === ctx.organizationId
    );

    // Campus scoping
    if (params.campusId) {
      filtered = filtered.filter((a) => !a.campusId || a.campusId === params.campusId);
    } else if (ctx.campusId && !ctx.userRoles?.includes("Super Administrator")) {
      filtered = filtered.filter((a) => !a.campusId || a.campusId === ctx.campusId);
    }

    // Role-based visibility:
    // Non-staff (parents, students) only see PUBLISHED announcements that are active
    const nowIso = new Date().toISOString();
    if (!isStaffOrAdmin) {
      filtered = filtered.filter((a) => {
        if (a.status !== "PUBLISHED") return false;
        if (a.publishDate && a.publishDate > nowIso) return false;
        if (!params.includeExpired && a.expiryDate && a.expiryDate < nowIso) return false;

        // Check audience
        const target = a.targetAudience;
        if (!target || target.scope === "ALL") return true;

        if (target.scope === "CAMPUS") {
          return !target.campusId || target.campusId === ctx.campusId;
        }

        if (target.scope === "ROLES") {
          const userRole = ctx.userRoles?.[0] || "";
          if (userRole.toLowerCase().includes("parent") && target.roles?.includes("PARENT")) return true;
          if (userRole.toLowerCase().includes("student") && target.roles?.includes("STUDENT")) return true;
          return false;
        }

        return true;
      });
    } else {
      // Staff view: filter by status if specified
      if (params.status) {
        filtered = filtered.filter((a) => a.status === params.status);
      }
      if (!params.includeExpired) {
        filtered = filtered.filter((a) => {
          if (a.status === "EXPIRED") return false;
          if (a.expiryDate && a.expiryDate < nowIso && a.status === "PUBLISHED") return false;
          return true;
        });
      }
    }

    // Category filter
    if (params.category && params.category !== "ALL") {
      filtered = filtered.filter(
        (a) => a.category.toLowerCase() === params.category!.toLowerCase()
      );
    }

    // Priority filter
    if (params.priority) {
      filtered = filtered.filter((a) => a.priority === params.priority);
    }

    // Search query
    if (params.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.summary && a.summary.toLowerCase().includes(q)) ||
          a.content.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    // Sort by pinned first, then by publishDate or createdAt descending
    filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const dateA = a.publishDate || a.createdAt;
      const dateB = b.publishDate || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

    const total = filtered.length;
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 20);
    const startIndex = (page - 1) * limit;
    const items = filtered.slice(startIndex, startIndex + limit);

    return { items, total, page, limit };
  }

  /**
   * Retrieves an individual announcement by ID with authorization checks
   */
  public async getAnnouncementById(
    ctx: TenantContext,
    id: string
  ): Promise<AnnouncementRecord> {
    const ann = commState.announcements.find(
      (a) => a.id === id && a.organizationId === ctx.organizationId
    );

    if (!ann) {
      throw new NotFoundError(`Announcement not found with id: ${id}`);
    }

    const isStaffOrAdmin =
      ctx.userRoles?.some((r) =>
        ["Super Administrator", "School Administrator", "Principal", "Vice Principal", "Academic Teacher", "Form / Class Teacher"].includes(r)
      ) ?? false;

    // Ordinary users cannot view drafts or scheduled announcements before publish time
    if (!isStaffOrAdmin) {
      if (ann.status !== "PUBLISHED") {
        throw new ForbiddenError("You are not authorized to view unpublished announcements.");
      }
      const nowIso = new Date().toISOString();
      if (ann.publishDate && ann.publishDate > nowIso) {
        throw new ForbiddenError("This announcement has not been released yet.");
      }
    }

    return ann;
  }

  /**
   * Creates a new announcement draft or publishes immediately
   */
  public async createAnnouncement(
    ctx: TenantContext,
    input: CreateAnnouncementInput
  ): Promise<AnnouncementRecord> {
    const isTeacher = ctx.userRoles?.includes("Academic Teacher") || ctx.userRoles?.includes("Form / Class Teacher");
    const isSuperAdmin = ctx.userRoles?.includes("Super Administrator");

    // Teacher audience boundary validation: teachers can only broadcast to their campus or assigned classes
    const audienceScope = input.targetAudience?.scope || "ALL";
    if (isTeacher && audienceScope === "ALL") {
      throw new ForbiddenError("Teaching faculty cannot issue organization-wide broadcasts. Scope must be campus or class.");
    }

    // Campus boundary check
    if (!isSuperAdmin && input.campusId && ctx.campusId && input.campusId !== ctx.campusId) {
      throw new ForbiddenError("You cannot publish announcements for a campus other than your active campus context.");
    }

    if ((input.priority as string) === "EMERGENCY" || input.priority === "URGENT") {
      const roles = ctx.userRoles || [];
      const hasEmergencyAuth = roles.some((r) =>
        ["Super Administrator", "School Administrator", "Principal", "Vice Principal"].includes(r)
      );
      if (!hasEmergencyAuth) {
        throw new ForbiddenError("Declaring an emergency announcement requires institutional administrative authority.");
      }
    }

    const nowIso = new Date().toISOString();
    let status: AnnouncementStatus = "DRAFT";
    let publishDate: string | null = null;

    if (input.publishNow) {
      status = "PUBLISHED";
      publishDate = nowIso;
    } else if (input.scheduledPublishDate) {
      const scheduledDate = new Date(input.scheduledPublishDate);
      if (scheduledDate > new Date()) {
        status = "SCHEDULED";
      } else {
        status = "PUBLISHED";
        publishDate = nowIso;
      }
    }

    const baseSlug = slugify(input.title);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const authorName = ctx.userId === "u-principal-01" ? "Dr. Arthur Bell (Principal)" : "School Administration";

    const newRecord: AnnouncementRecord = {
      id: `ann-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      organizationId: ctx.organizationId,
      campusId: input.campusId || ctx.campusId || null,
      campusName: input.campusId === DEMO_CAMPUS_MAIN_ID ? "Apex Main Campus" : "All Campuses",
      title: input.title,
      slug,
      summary: input.summary || input.content.substring(0, 150) + "...",
      content: input.content,
      category: input.category || "General",
      priority: input.priority || "NORMAL",
      status,
      authorId: ctx.userId || "system",
      authorName,
      authorRole: ctx.userRoles?.[0] || "Staff",
      targetAudience: {
        scope: input.targetAudience?.scope || "ALL",
        roles: input.targetAudience?.roles,
        campusId: input.targetAudience?.campusId,
        classId: input.targetAudience?.classId,
        sectionId: input.targetAudience?.sectionId,
        studentIds: input.targetAudience?.studentIds,
        audienceLabel: input.targetAudience?.audienceLabel || "Entire Institution",
      },
      channels: (input.channels && input.channels.length > 0) ? input.channels : ["IN_APP"],
      publishDate,
      scheduledPublishDate: input.scheduledPublishDate ? new Date(input.scheduledPublishDate).toISOString() : null,
      expiryDate: input.expiryDate ? new Date(input.expiryDate).toISOString() : null,
      archivedDate: null,
      version: 1,
      editHistory: [],
      attachmentUrls: input.attachmentUrls || [],
      isPinned: input.isPinned ?? false,
      createdAt: nowIso,
      updatedAt: nowIso,
      recipientCount: 0,
    };

    commState.announcements.unshift(newRecord);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "Announcement",
      entityId: newRecord.id,
      details: {
        title: newRecord.title,
        status: newRecord.status,
        priority: newRecord.priority,
        channels: newRecord.channels,
      },
    });

    // If published now, resolve audience and dispatch notifications immediately
    if (status === "PUBLISHED") {
      await this.dispatchAnnouncementNotifications(ctx, newRecord);
    }

    return newRecord;
  }

  /**
   * Updates an announcement with strict version control on published communication
   */
  public async updateAnnouncement(
    ctx: TenantContext,
    id: string,
    input: UpdateAnnouncementInput
  ): Promise<AnnouncementRecord> {
    const annIndex = commState.announcements.findIndex(
      (a) => a.id === id && a.organizationId === ctx.organizationId
    );

    if (annIndex === -1) {
      throw new NotFoundError(`Announcement not found with id: ${id}`);
    }

    const current = commState.announcements[annIndex];
    const nowIso = new Date().toISOString();

    if (((input.priority as string) === "EMERGENCY" || input.priority === "URGENT") && (current.priority as string) !== "EMERGENCY") {
      const roles = ctx.userRoles || [];
      const hasEmergencyAuth = roles.some((r) =>
        ["Super Administrator", "School Administrator", "Principal", "Vice Principal"].includes(r)
      );
      if (!hasEmergencyAuth) {
        throw new ForbiddenError("Declaring an emergency announcement requires institutional administrative authority.");
      }
    }

    // Preserve version history if editing an already PUBLISHED announcement
    const wasPublished = current.status === "PUBLISHED";
    const updatedHistory = [...(current.editHistory || [])];

    if (wasPublished && (input.title || input.content)) {
      updatedHistory.push({
        version: current.version,
        title: current.title,
        content: current.content,
        editedById: ctx.userId || "system",
        editedAt: nowIso,
        changeLogNote: input.changeLogNote || "Content update",
      });
    }

    const updated: AnnouncementRecord = {
      ...current,
      title: input.title !== undefined ? input.title : current.title,
      summary: input.summary !== undefined ? input.summary : current.summary,
      content: input.content !== undefined ? input.content : current.content,
      category: input.category !== undefined ? input.category : current.category,
      priority: input.priority !== undefined ? input.priority : current.priority,
      campusId: input.campusId !== undefined ? input.campusId : current.campusId,
      targetAudience: input.targetAudience
        ? {
            scope: input.targetAudience.scope || current.targetAudience.scope,
            roles: input.targetAudience.roles !== undefined ? input.targetAudience.roles : current.targetAudience.roles,
            campusId: input.targetAudience.campusId !== undefined ? input.targetAudience.campusId : current.targetAudience.campusId,
            classId: input.targetAudience.classId !== undefined ? input.targetAudience.classId : current.targetAudience.classId,
            sectionId: input.targetAudience.sectionId !== undefined ? input.targetAudience.sectionId : current.targetAudience.sectionId,
            studentIds: input.targetAudience.studentIds !== undefined ? input.targetAudience.studentIds : current.targetAudience.studentIds,
            audienceLabel: input.targetAudience.audienceLabel !== undefined ? input.targetAudience.audienceLabel : current.targetAudience.audienceLabel,
          }
        : current.targetAudience,
      channels: input.channels !== undefined ? input.channels : current.channels,
      scheduledPublishDate: input.scheduledPublishDate !== undefined ? (input.scheduledPublishDate ? new Date(input.scheduledPublishDate).toISOString() : null) : current.scheduledPublishDate,
      expiryDate: input.expiryDate !== undefined ? (input.expiryDate ? new Date(input.expiryDate).toISOString() : null) : current.expiryDate,
      isPinned: input.isPinned !== undefined ? input.isPinned : current.isPinned,
      attachmentUrls: input.attachmentUrls !== undefined ? input.attachmentUrls : current.attachmentUrls,
      status: input.status !== undefined ? input.status : current.status,
      version: wasPublished && (input.title || input.content) ? current.version + 1 : current.version,
      editHistory: updatedHistory,
      updatedAt: nowIso,
    };

    commState.announcements[annIndex] = updated;

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Announcement",
      entityId: updated.id,
      details: {
        version: updated.version,
        changeLogNote: input.changeLogNote,
        wasPublished,
      },
    });

    // Notify recipients of material changes if requested
    if (wasPublished && input.notifyOnMaterialChange) {
      await this.dispatchAnnouncementNotifications(ctx, updated, true);
    }

    return updated;
  }

  /**
   * Publishes a draft or scheduled announcement
   */
  public async publishAnnouncement(
    ctx: TenantContext,
    id: string
  ): Promise<AnnouncementRecord> {
    const ann = await this.getAnnouncementById(ctx, id);

    if (ann.status === "PUBLISHED") {
      return ann;
    }

    const nowIso = new Date().toISOString();
    ann.status = "PUBLISHED";
    ann.publishDate = nowIso;
    ann.updatedAt = nowIso;

    await auditRepository.log(ctx, {
      action: "PUBLISH",
      entity: "Announcement",
      entityId: ann.id,
      details: {
        title: ann.title,
        priority: ann.priority,
        targetAudience: ann.targetAudience,
      },
    });

    await this.dispatchAnnouncementNotifications(ctx, ann);
    return ann;
  }

  /**
   * Archives an announcement
   */
  public async archiveAnnouncement(
    ctx: TenantContext,
    id: string
  ): Promise<AnnouncementRecord> {
    const ann = await this.getAnnouncementById(ctx, id);
    const nowIso = new Date().toISOString();

    ann.status = "ARCHIVED";
    ann.archivedDate = nowIso;
    ann.updatedAt = nowIso;

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Announcement",
      entityId: ann.id,
      details: { status: "ARCHIVED" },
    });

    return ann;
  }

  /**
   * Cancels a scheduled or draft announcement
   */
  public async cancelAnnouncement(
    ctx: TenantContext,
    id: string
  ): Promise<AnnouncementRecord> {
    const ann = await this.getAnnouncementById(ctx, id);
    const nowIso = new Date().toISOString();

    ann.status = "CANCELLED";
    ann.updatedAt = nowIso;

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "Announcement",
      entityId: ann.id,
      details: { status: "CANCELLED" },
    });

    return ann;
  }

  /**
   * Deletes a draft or cancelled announcement
   */
  public async deleteAnnouncement(
    ctx: TenantContext,
    id: string
  ): Promise<{ success: boolean; deletedId: string }> {
    const ann = await this.getAnnouncementById(ctx, id);

    if (ann.status === "PUBLISHED") {
      throw new ForbiddenError(
        "Published announcements cannot be deleted to preserve communication audit records. Please archive it instead."
      );
    }

    commState.announcements = commState.announcements.filter((a) => a.id !== id);

    await auditRepository.log(ctx, {
      action: "DELETE",
      entity: "Announcement",
      entityId: id,
      details: { title: ann.title },
    });

    return { success: true, deletedId: id };
  }

  // ---------------------------------------------------------------------------
  // 2. AUDIENCE RESOLUTION & NOTIFICATION DISPATCH ENGINE
  // ---------------------------------------------------------------------------

  /**
   * Resolves intended audience recipients based on authorized school entities
   */
  public async resolveAudienceRecipients(
    ctx: TenantContext,
    audience: TargetAudience
  ): Promise<Array<{ userId: string; name: string; email: string; role: string }>> {
    // In our verified institutional structure:
    // - Parent: u-parent-01 (Dr. Sarah Wright, parent of Lucas Wright, Grade 10)
    // - Student: u-student-01 (Lucas Wright, Grade 10 - Section A)
    // - Teacher: u-teacher-01 (Marcus Sterling, Mathematics Faculty)
    // - Admin: u-principal-01 (Dr. Arthur Bell, Principal)
    const baseRecipients = [
      {
        userId: "u-parent-01",
        name: "Dr. Sarah Wright",
        email: "parent@apex-demo.internal",
        role: "PARENT",
        classId: "cls-g10-01",
        sectionId: "sec-g10-a",
        campusId: DEMO_CAMPUS_MAIN_ID,
      },
      {
        userId: "u-student-01",
        name: "Lucas Wright",
        email: "student@apex-demo.internal",
        role: "STUDENT",
        classId: "cls-g10-01",
        sectionId: "sec-g10-a",
        campusId: DEMO_CAMPUS_MAIN_ID,
      },
      {
        userId: "u-teacher-01",
        name: "Marcus Sterling",
        email: "teacher.math@apex-demo.internal",
        role: "TEACHER",
        campusId: DEMO_CAMPUS_MAIN_ID,
      },
      {
        userId: "u-principal-01",
        name: "Dr. Arthur Bell",
        email: "principal@apex-demo.internal",
        role: "ADMIN",
        campusId: DEMO_CAMPUS_MAIN_ID,
      },
    ];

    let result = baseRecipients;

    // Filter by campus if audience has campus boundary
    if (audience.campusId) {
      result = result.filter((r) => !r.campusId || r.campusId === audience.campusId);
    }

    if (audience.scope === "ROLES" && audience.roles && audience.roles.length > 0) {
      result = result.filter((r) => audience.roles!.includes(r.role));
    } else if (audience.scope === "CLASS" && audience.classId) {
      // Class resolves students in that class AND their linked guardians
      result = result.filter(
        (r) =>
          ("classId" in r && r.classId === audience.classId) ||
          r.role === "TEACHER"
      );
    } else if (audience.scope === "SECTION" && audience.sectionId) {
      result = result.filter(
        (r) =>
          ("sectionId" in r && r.sectionId === audience.sectionId)
      );
    } else if (audience.scope === "STUDENTS" && audience.studentIds && audience.studentIds.length > 0) {
      result = result.filter(
        (r) => r.userId === "u-student-01" || r.userId === "u-parent-01"
      );
    }

    return result.map(({ userId, name, email, role }) => ({
      userId,
      name,
      email,
      role,
    }));
  }

  /**
   * Dispatches notifications and delivery logs across configured channels
   */
  private async dispatchAnnouncementNotifications(
    ctx: TenantContext,
    announcement: AnnouncementRecord,
    isUpdate = false
  ): Promise<number> {
    const recipients = await this.resolveAudienceRecipients(ctx, announcement.targetAudience);
    const nowIso = new Date().toISOString();
    const channels = announcement.channels || ["IN_APP"];

    let sentCount = 0;

    for (const recipient of recipients) {
      // 1. In-App Notification (Always enabled unless user explicitly disabled non-urgent notifications)
      if (channels.includes("IN_APP")) {
        const notifTitle = isUpdate ? `Updated: ${announcement.title}` : announcement.title;
        const newNotif: NotificationRecord = {
          id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          organizationId: announcement.organizationId,
          recipientId: recipient.userId,
          recipientName: recipient.name,
          recipientEmail: recipient.email,
          announcementId: announcement.id,
          type: "ANNOUNCEMENT",
          priority: announcement.priority,
          title: notifTitle,
          message: announcement.summary || announcement.content.substring(0, 160),
          link: recipient.role === "PARENT" ? "/portal/parent" : recipient.role === "STUDENT" ? "/portal/student" : "/communication",
          relatedEntity: "Announcement",
          relatedEntityId: announcement.id,
          isRead: false,
          createdAt: nowIso,
        };

        commState.notifications.unshift(newNotif);

        // Record Delivery Log
        const delLog: NotificationDeliveryLogRecord = {
          id: `del-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          organizationId: announcement.organizationId,
          notificationId: newNotif.id,
          announcementId: announcement.id,
          recipientId: recipient.userId,
          recipientName: recipient.name,
          channel: "IN_APP",
          status: "DELIVERED",
          recipientAddress: recipient.userId,
          subject: notifTitle,
          attempts: 1,
          sentAt: nowIso,
          deliveredAt: nowIso,
          createdAt: nowIso,
        };
        commState.deliveryLogs.unshift(delLog);
      }

      // 2. Email Delivery Abstraction
      if (channels.includes("EMAIL") && recipient.email) {
        try {
          const emailSubject = isUpdate ? `[SchoolOS Update] ${announcement.title}` : `[SchoolOS] ${announcement.title}`;
          const emailResult = await emailProvider.sendEmail({
            to: recipient.email,
            subject: emailSubject,
            text: `${announcement.title}\n\n${announcement.content}\n\nPriority: ${announcement.priority}\nCategory: ${announcement.category}`,
            html: `<h2>${announcement.title}</h2><p>${announcement.content}</p><p><small>Category: ${announcement.category} | Priority: ${announcement.priority}</small></p>`,
          });

          const emailLog: NotificationDeliveryLogRecord = {
            id: `del-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            organizationId: announcement.organizationId,
            announcementId: announcement.id,
            recipientId: recipient.userId,
            recipientName: recipient.name,
            channel: "EMAIL",
            status: emailResult.success ? "DELIVERED" : "FAILED",
            recipientAddress: recipient.email,
            subject: emailSubject,
            errorMessage: emailResult.error,
            attempts: 1,
            sentAt: emailResult.timestamp,
            deliveredAt: emailResult.success ? emailResult.timestamp : null,
            createdAt: nowIso,
          };
          commState.deliveryLogs.unshift(emailLog);
        } catch (err: any) {
          logger.warn("Failed to dispatch announcement email", { error: err.message, recipient: recipient.email });
        }
      }

      sentCount++;
    }

    // Update announcement stats
    announcement.recipientCount = recipients.length;
    announcement.deliveryStats = {
      total: recipients.length * channels.length,
      sent: recipients.length * channels.length,
      delivered: recipients.length * channels.length,
      failed: 0,
      read: 0,
    };

    return sentCount;
  }

  // ---------------------------------------------------------------------------
  // 3. TARGETED / DIRECT MESSAGING
  // ---------------------------------------------------------------------------

  /**
   * Sends targeted communication to specific role, class, student, or guardian
   */
  public async sendDirectMessage(
    ctx: TenantContext,
    input: SendDirectMessageInput
  ): Promise<{ success: boolean; deliveredCount: number; messageId: string }> {
    const isTeacher = ctx.userRoles?.includes("Academic Teacher") || ctx.userRoles?.includes("Form / Class Teacher");

    // Teacher scoping rules: cannot message unrelated classes
    if (isTeacher && input.classId && input.classId !== "cls-g10-01") {
      throw new ForbiddenError("Teachers are only permitted to message classes they are actively assigned to.");
    }

    let targetAudience: TargetAudience;
    if (input.recipientType === "CLASS") {
      targetAudience = { scope: "CLASS", classId: input.classId };
    } else if (input.recipientType === "SECTION") {
      targetAudience = { scope: "SECTION", sectionId: input.sectionId };
    } else if (input.recipientType === "ROLE") {
      targetAudience = { scope: "ROLES", roles: input.role ? [input.role] : [] };
    } else if (input.recipientType === "GUARDIAN_OF_STUDENT") {
      targetAudience = { scope: "ROLES", roles: ["PARENT"] };
    } else {
      // USER
      targetAudience = { scope: "STUDENTS", studentIds: input.recipientId ? [input.recipientId] : [] };
    }

    const recipients = await this.resolveAudienceRecipients(ctx, targetAudience);
    if (recipients.length === 0) {
      throw new ValidationError("No eligible recipients found matching the target criteria.");
    }

    const nowIso = new Date().toISOString();
    const channels = input.channels || ["IN_APP"];
    let finalBody = input.message;

    // Substitute template tokens if templateCode provided
    if (input.templateCode) {
      const tmpl = commState.templates.find(
        (t) => t.code === input.templateCode && t.organizationId === ctx.organizationId
      );
      if (tmpl && input.templateVariables) {
        finalBody = this.substituteTemplate(tmpl.body, input.templateVariables as Record<string, string>);
      }
    }

    const messageId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    for (const rec of recipients) {
      if (channels.includes("IN_APP")) {
        const notif: NotificationRecord = {
          id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          organizationId: ctx.organizationId,
          recipientId: rec.userId,
          recipientName: rec.name,
          recipientEmail: rec.email,
          type: input.category ? input.category.toUpperCase() : "GENERAL",
          priority: input.priority || "NORMAL",
          title: input.title,
          message: finalBody,
          link: rec.role === "PARENT" ? "/portal/parent" : rec.role === "STUDENT" ? "/portal/student" : "/communication",
          relatedEntity: input.relatedEntity || "DirectMessage",
          relatedEntityId: input.relatedEntityId || messageId,
          isRead: false,
          createdAt: nowIso,
        };
        commState.notifications.unshift(notif);

        commState.deliveryLogs.unshift({
          id: `del-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          organizationId: ctx.organizationId,
          notificationId: notif.id,
          recipientId: rec.userId,
          recipientName: rec.name,
          channel: "IN_APP",
          status: "DELIVERED",
          recipientAddress: rec.userId,
          subject: input.title,
          attempts: 1,
          sentAt: nowIso,
          deliveredAt: nowIso,
          createdAt: nowIso,
        });
      }

      if (channels.includes("EMAIL") && rec.email) {
        await emailProvider.sendEmail({
          to: rec.email,
          subject: input.title,
          text: finalBody,
        });

        commState.deliveryLogs.unshift({
          id: `del-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          organizationId: ctx.organizationId,
          recipientId: rec.userId,
          recipientName: rec.name,
          channel: "EMAIL",
          status: "DELIVERED",
          recipientAddress: rec.email,
          subject: input.title,
          attempts: 1,
          sentAt: nowIso,
          deliveredAt: nowIso,
          createdAt: nowIso,
        });
      }
    }

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "DirectMessage",
      entityId: messageId,
      details: {
        recipientType: input.recipientType,
        recipientCount: recipients.length,
        channels,
        title: input.title,
      },
    });

    return { success: true, deliveredCount: recipients.length, messageId };
  }

  // ---------------------------------------------------------------------------
  // 4. IN-APP NOTIFICATIONS & USER INBOX
  // ---------------------------------------------------------------------------

  /**
   * Retrieves notifications for the active user session
   */
  public async getNotifications(
    ctx: TenantContext,
    params: QueryNotificationsParams = { unreadOnly: false, limit: 50 }
  ): Promise<NotificationRecord[]> {
    if (!ctx.userId) {
      throw new UnauthorizedError("Authentication required to view notification inbox.");
    }

    let items = commState.notifications.filter(
      (n) => n.organizationId === ctx.organizationId && n.recipientId === ctx.userId
    );

    if (params.unreadOnly) {
      items = items.filter((n) => !n.isRead);
    }

    if (params.type && params.type !== "ALL") {
      items = items.filter((n) => n.type.toLowerCase() === params.type!.toLowerCase());
    }

    if (params.priority) {
      items = items.filter((n) => n.priority === params.priority);
    }

    const limit = Number(params.limit || 50);
    return items.slice(0, limit);
  }

  /**
   * Marks a notification as read and updates delivery tracking
   */
  public async markNotificationAsRead(
    ctx: TenantContext,
    notificationId: string
  ): Promise<{ success: boolean; notification: NotificationRecord }> {
    const notif = commState.notifications.find(
      (n) => n.id === notificationId && n.organizationId === ctx.organizationId
    );

    if (!notif) {
      throw new NotFoundError(`Notification not found with id: ${notificationId}`);
    }

    if (notif.recipientId !== ctx.userId && !ctx.userRoles?.includes("Super Administrator")) {
      throw new ForbiddenError("Cannot modify notifications belonging to another user.");
    }

    const nowIso = new Date().toISOString();
    notif.isRead = true;
    notif.readAt = nowIso;

    // Update associated delivery log
    const dLog = commState.deliveryLogs.find((d) => d.notificationId === notificationId);
    if (dLog) {
      dLog.status = "READ";
      dLog.readAt = nowIso;
    }

    return { success: true, notification: notif };
  }

  /**
   * Marks all notifications as read for current user
   */
  public async markAllNotificationsAsRead(
    ctx: TenantContext
  ): Promise<{ success: boolean; count: number }> {
    if (!ctx.userId) {
      throw new UnauthorizedError("Authentication required.");
    }

    const nowIso = new Date().toISOString();
    let count = 0;

    for (const notif of commState.notifications) {
      if (notif.organizationId === ctx.organizationId && notif.recipientId === ctx.userId && !notif.isRead) {
        notif.isRead = true;
        notif.readAt = nowIso;
        count++;

        const dLog = commState.deliveryLogs.find((d) => d.notificationId === notif.id);
        if (dLog) {
          dLog.status = "READ";
          dLog.readAt = nowIso;
        }
      }
    }

    return { success: true, count };
  }

  // ---------------------------------------------------------------------------
  // 5. NOTIFICATION TEMPLATES
  // ---------------------------------------------------------------------------

  public async getTemplates(
    ctx: TenantContext,
    category?: string
  ): Promise<NotificationTemplateRecord[]> {
    let items = commState.templates.filter(
      (t) => t.organizationId === ctx.organizationId
    );

    if (category && category !== "ALL") {
      items = items.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }

    return items;
  }

  public async createTemplate(
    ctx: TenantContext,
    input: CreateTemplateInput
  ): Promise<NotificationTemplateRecord> {
    const existing = commState.templates.find(
      (t) => t.code === input.code && t.organizationId === ctx.organizationId
    );

    if (existing) {
      throw new ValidationError(`Template with code '${input.code}' already exists.`);
    }

    const nowIso = new Date().toISOString();
    const newTmpl: NotificationTemplateRecord = {
      id: `tmpl-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      organizationId: ctx.organizationId,
      name: input.name,
      code: input.code,
      category: input.category,
      type: input.type || "SYSTEM",
      subject: input.subject,
      body: input.body,
      variables: input.variables || [],
      channels: input.channels || ["IN_APP", "EMAIL"],
      isActive: input.isActive ?? true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    commState.templates.unshift(newTmpl);

    await auditRepository.log(ctx, {
      action: "CREATE",
      entity: "NotificationTemplate",
      entityId: newTmpl.id,
      details: { name: newTmpl.name, code: newTmpl.code },
    });

    return newTmpl;
  }

  public async updateTemplate(
    ctx: TenantContext,
    id: string,
    input: UpdateTemplateInput
  ): Promise<NotificationTemplateRecord> {
    const tmplIndex = commState.templates.findIndex(
      (t) => t.id === id && t.organizationId === ctx.organizationId
    );

    if (tmplIndex === -1) {
      throw new NotFoundError(`Template not found with id: ${id}`);
    }

    const current = commState.templates[tmplIndex];
    const nowIso = new Date().toISOString();

    const updated: NotificationTemplateRecord = {
      ...current,
      name: input.name !== undefined ? input.name : current.name,
      category: input.category !== undefined ? input.category : current.category,
      type: input.type !== undefined ? input.type : current.type,
      subject: input.subject !== undefined ? input.subject : current.subject,
      body: input.body !== undefined ? input.body : current.body,
      variables: input.variables !== undefined ? input.variables : current.variables,
      channels: input.channels !== undefined ? input.channels : current.channels,
      isActive: input.isActive !== undefined ? input.isActive : current.isActive,
      updatedAt: nowIso,
    };

    commState.templates[tmplIndex] = updated;

    await auditRepository.log(ctx, {
      action: "UPDATE",
      entity: "NotificationTemplate",
      entityId: updated.id,
      details: { name: updated.name, code: updated.code },
    });

    return updated;
  }

  public async deleteTemplate(
    ctx: TenantContext,
    id: string
  ): Promise<{ success: boolean; deletedId: string }> {
    const tmpl = commState.templates.find(
      (t) => t.id === id && t.organizationId === ctx.organizationId
    );

    if (!tmpl) {
      throw new NotFoundError(`Template not found with id: ${id}`);
    }

    commState.templates = commState.templates.filter((t) => t.id !== id);

    await auditRepository.log(ctx, {
      action: "DELETE",
      entity: "NotificationTemplate",
      entityId: id,
      details: { code: tmpl.code },
    });

    return { success: true, deletedId: id };
  }

  public substituteTemplate(body: string, variables: Record<string, string>): string {
    let result = body;
    for (const [key, value] of Object.entries(variables)) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(`{{${escapedKey}}}`, "g"), String(value ?? ""));
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // 6. COMMUNICATION PREFERENCES
  // ---------------------------------------------------------------------------

  public async getPreferences(
    ctx: TenantContext,
    userId?: string
  ): Promise<CommunicationPreferenceRecord[]> {
    if (userId && userId !== ctx.userId && !ctx.userRoles?.includes("Super Administrator")) {
      throw new ForbiddenError("Cannot access communication preferences of another user.");
    }

    const targetUserId = userId || ctx.userId;
    if (!targetUserId) {
      throw new UnauthorizedError("Authentication required.");
    }

    const categories = ["General", "Academic", "Finance", "Attendance", "Emergency"];
    const channels: DeliveryChannel[] = ["IN_APP", "EMAIL", "SMS"];

    // Default matrix
    const prefs: CommunicationPreferenceRecord[] = [];
    for (const cat of categories) {
      for (const ch of channels) {
        const existing = commState.preferences.find(
          (p) =>
            p.organizationId === ctx.organizationId &&
            p.userId === targetUserId &&
            p.category === cat &&
            p.channel === ch
        );
        prefs.push(
          existing || {
            id: `pref-${cat}-${ch}`,
            organizationId: ctx.organizationId,
            userId: targetUserId,
            category: cat,
            channel: ch,
            enabled: cat === "Emergency" ? true : ch !== "SMS", // SMS opt-in by default
            updatedAt: new Date().toISOString(),
          }
        );
      }
    }

    return prefs;
  }

  public async updatePreferences(
    ctx: TenantContext,
    input: UpdatePreferencesInput,
    userId?: string
  ): Promise<CommunicationPreferenceRecord[]> {
    if (userId && userId !== ctx.userId && !ctx.userRoles?.includes("Super Administrator")) {
      throw new ForbiddenError("Cannot modify communication preferences of another user.");
    }

    const targetUserId = userId || ctx.userId;
    if (!targetUserId) {
      throw new UnauthorizedError("Authentication required.");
    }

    const nowIso = new Date().toISOString();

    for (const item of input.preferences) {
      // Cannot disable Emergency channel alerts
      if (item.category === "Emergency" && !item.enabled) {
        throw new ValidationError("Emergency safety notifications are mandatory and cannot be disabled.");
      }

      const idx = commState.preferences.findIndex(
        (p) =>
          p.organizationId === ctx.organizationId &&
          p.userId === targetUserId &&
          p.category === item.category &&
          p.channel === item.channel
      );

      if (idx !== -1) {
        commState.preferences[idx].enabled = item.enabled;
        commState.preferences[idx].updatedAt = nowIso;
      } else {
        commState.preferences.push({
          id: `pref-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          organizationId: ctx.organizationId,
          userId: targetUserId,
          category: item.category,
          channel: item.channel,
          enabled: item.enabled,
          updatedAt: nowIso,
        });
      }
    }

    return this.getPreferences(ctx, targetUserId);
  }

  // ---------------------------------------------------------------------------
  // 7. DELIVERY LOGS & TRANSMISSION STATUS
  // ---------------------------------------------------------------------------

  public async getDeliveryLogs(
    ctx: TenantContext,
    params: { announcementId?: string; channel?: string; status?: string; limit?: number } = {}
  ): Promise<NotificationDeliveryLogRecord[]> {
    let items = commState.deliveryLogs.filter(
      (d) => d.organizationId === ctx.organizationId
    );

    if (params.announcementId) {
      items = items.filter((d) => d.announcementId === params.announcementId);
    }

    if (params.channel) {
      items = items.filter((d) => d.channel === params.channel);
    }

    if (params.status) {
      items = items.filter((d) => d.status === params.status);
    }

    const limit = params.limit || 50;
    return items.slice(0, limit);
  }

  public async retryFailedDelivery(
    ctx: TenantContext,
    deliveryLogId: string
  ): Promise<NotificationDeliveryLogRecord> {
    const log = commState.deliveryLogs.find(
      (d) => d.id === deliveryLogId && d.organizationId === ctx.organizationId
    );

    if (!log) {
      throw new NotFoundError(`Delivery log not found with id: ${deliveryLogId}`);
    }

    log.attempts += 1;
    const nowIso = new Date().toISOString();

    if (log.channel === "EMAIL") {
      const emailResult = await emailProvider.sendEmail({
        to: log.recipientAddress,
        subject: log.subject || "School Notification",
        text: "Retried transmission",
      });
      log.status = emailResult.success ? "DELIVERED" : "FAILED";
      log.deliveredAt = emailResult.success ? nowIso : null;
      log.errorMessage = emailResult.error || null;
    } else {
      log.status = "DELIVERED";
      log.deliveredAt = nowIso;
      log.errorMessage = null;
    }

    return log;
  }

  // ---------------------------------------------------------------------------
  // 8. SCHEDULED JOBS & AUTO-EXPIRY RUNNER
  // ---------------------------------------------------------------------------

  /**
   * Process scheduled announcements and auto-expire overdue broadcasts
   */
  public async processScheduledAnnouncements(ctx: TenantContext): Promise<{ published: number; expired: number }> {
    const nowIso = new Date().toISOString();
    let publishedCount = 0;
    let expiredCount = 0;

    for (const ann of commState.announcements) {
      if (ann.organizationId === ctx.organizationId) {
        // Auto-publish scheduled announcements
        if (ann.status === "SCHEDULED" && ann.scheduledPublishDate && ann.scheduledPublishDate <= nowIso) {
          ann.status = "PUBLISHED";
          ann.publishDate = nowIso;
          ann.updatedAt = nowIso;
          await this.dispatchAnnouncementNotifications(ctx, ann);
          publishedCount++;
        }

        // Auto-expire announcements past their expiry date
        if (ann.status === "PUBLISHED" && ann.expiryDate && ann.expiryDate <= nowIso) {
          ann.status = "EXPIRED";
          ann.updatedAt = nowIso;
          expiredCount++;
        }
      }
    }

    return { published: publishedCount, expired: expiredCount };
  }

  // ---------------------------------------------------------------------------
  // 9. COMMUNICATION DASHBOARD ANALYTICS
  // ---------------------------------------------------------------------------

  public async getCommunicationStats(
    ctx: TenantContext,
    campusId?: string
  ): Promise<CommunicationDashboardStats> {
    const targetCampus = campusId || ctx.campusId;

    let announcements = commState.announcements.filter(
      (a) => a.organizationId === ctx.organizationId
    );
    if (targetCampus) {
      announcements = announcements.filter((a) => !a.campusId || a.campusId === targetCampus);
    }

    const totalAnnouncements = announcements.length;
    const publishedAnnouncements = announcements.filter((a) => a.status === "PUBLISHED").length;
    const draftAnnouncements = announcements.filter((a) => a.status === "DRAFT").length;
    const scheduledAnnouncements = announcements.filter((a) => a.status === "SCHEDULED").length;
    const expiredAnnouncements = announcements.filter((a) => a.status === "EXPIRED").length;

    let deliveries = commState.deliveryLogs.filter(
      (d) => d.organizationId === ctx.organizationId
    );
    const totalNotificationsSent = deliveries.length;
    const failedDeliveriesCount = deliveries.filter((d) => d.status === "FAILED").length;
    const deliveredCount = deliveries.filter((d) => d.status === "DELIVERED" || d.status === "READ").length;
    const deliverySuccessRate = totalNotificationsSent > 0 ? Math.round((deliveredCount / totalNotificationsSent) * 100) : 100;

    const unreadNotificationsCount = commState.notifications.filter(
      (n) => n.organizationId === ctx.organizationId && !n.isRead
    ).length;

    const recentAnnouncements = announcements.slice(0, 5);

    const recentActivity = deliveries.slice(0, 6).map((d) => ({
      id: d.id,
      type: "DELIVERY" as const,
      title: d.subject || "Notification Transmitted",
      description: `Sent to ${d.recipientName || d.recipientAddress} via ${d.channel}`,
      timestamp: d.createdAt,
      status: d.status,
    }));

    return {
      totalAnnouncements,
      publishedAnnouncements,
      draftAnnouncements,
      scheduledAnnouncements,
      expiredAnnouncements,
      totalNotificationsSent,
      unreadNotificationsCount,
      failedDeliveriesCount,
      deliverySuccessRate,
      recentAnnouncements,
      recentActivity,
    };
  }
}

export const communicationService = new CommunicationService();
