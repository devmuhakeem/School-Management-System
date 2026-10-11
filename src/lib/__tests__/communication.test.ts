import { describe, it, expect, beforeEach } from "vitest";
import { communicationService } from "@/services/communication.service";
import { TenantContext } from "@/repositories/types";
import { DEMO_ORG_ID, DEMO_CAMPUS_MAIN_ID, DEMO_CAMPUS_WEST_ID } from "@/services/admin.service";
import { ForbiddenError, ValidationError, NotFoundError } from "@/lib/errors";

describe("Phase 11: Communication, Announcements & Notifications Architecture", () => {
  // Test security contexts
  const superAdminCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    userId: "u-super-admin-01",
    userRoles: ["Super Administrator"],
  };

  const principalCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-principal-01",
    userRoles: ["Principal", "CAMPUS_ADMIN"],
  };

  const teacherCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-teacher-01",
    userRoles: ["Academic Teacher"],
  };

  const parentCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-parent-01",
    userRoles: ["Parent"],
  };

  const studentCtx: TenantContext = {
    organizationId: DEMO_ORG_ID,
    campusId: DEMO_CAMPUS_MAIN_ID,
    userId: "u-student-01",
    userRoles: ["Student"],
  };

  const foreignTenantCtx: TenantContext = {
    organizationId: "org-foreign-academy",
    userId: "u-foreign-user",
    userRoles: ["Super Administrator"],
  };

  // ---------------------------------------------------------------------------
  // 1. ANNOUNCEMENT CREATION & DRAFT/PUBLISH WORKFLOW
  // ---------------------------------------------------------------------------
  describe("Announcement Lifecycle & Workflow", () => {
    it("creates a draft announcement without publishing immediately", async () => {
      const draft = await communicationService.createAnnouncement(principalCtx, {
        title: "Staff In-Service Professional Training",
        summary: "Annual faculty pedagogical workshop on STEM methods",
        content: "Detailed training schedule for all campus teachers in Science Lab A.",
        category: "Academic",
        priority: "NORMAL",
        campusId: DEMO_CAMPUS_MAIN_ID,
        targetAudience: { scope: "CAMPUS", campusId: DEMO_CAMPUS_MAIN_ID },
        channels: ["IN_APP"],
        publishNow: false,
      });

      expect(draft).toBeDefined();
      expect(draft.id).toBeDefined();
      expect(draft.status).toBe("DRAFT");
      expect(draft.publishDate).toBeNull();
      expect(draft.version).toBe(1);
    });

    it("publishes an announcement immediately and triggers recipient notification dispatch", async () => {
      const published = await communicationService.createAnnouncement(principalCtx, {
        title: "Emergency Weather Protocol Announcement",
        summary: "Torrential rainfall schedule adjustment",
        content: "School closing early at 1:00 PM today due to weather warnings.",
        category: "Emergency",
        priority: "URGENT",
        campusId: DEMO_CAMPUS_MAIN_ID,
        targetAudience: { scope: "ROLES", roles: ["PARENT", "STUDENT", "TEACHER"] },
        channels: ["IN_APP", "EMAIL"],
        publishNow: true,
      });

      expect(published.status).toBe("PUBLISHED");
      expect(published.publishDate).not.toBeNull();
      expect(published.recipientCount).toBeGreaterThan(0);
      expect(published.deliveryStats).toBeDefined();
      expect(published.deliveryStats?.delivered).toBeGreaterThan(0);
    });

    it("blocks teachers from issuing institution-wide (ALL) broadcasts", async () => {
      await expect(
        communicationService.createAnnouncement(teacherCtx, {
          title: "All School Homework Policy",
          content: "Organization wide rule change",
          category: "Academic",
          priority: "NORMAL",
          targetAudience: { scope: "ALL" },
          channels: ["IN_APP"],
          publishNow: true,
        })
      ).rejects.toThrow(ForbiddenError);
    });

    it("publishes a previously saved draft announcement", async () => {
      const draft = await communicationService.createAnnouncement(superAdminCtx, {
        title: "Graduation Ceremony Rehearsals",
        content: "Auditorium rehearsal itinerary for senior class.",
        category: "Events",
        priority: "NORMAL",
        targetAudience: { scope: "ALL" },
        channels: ["IN_APP"],
        publishNow: false,
      });

      expect(draft.status).toBe("DRAFT");

      const published = await communicationService.publishAnnouncement(superAdminCtx, draft.id);
      expect(published.status).toBe("PUBLISHED");
      expect(published.publishDate).not.toBeNull();
    });

    it("enforces versioning and audit preservation when editing published announcements", async () => {
      const original = await communicationService.createAnnouncement(principalCtx, {
        title: "Term 2 Mid-Term Break Dates",
        content: "School will break on Thursday and resume on Monday.",
        category: "Holiday",
        priority: "NORMAL",
        targetAudience: { scope: "ALL" },
        channels: ["IN_APP"],
        publishNow: true,
      });

      expect(original.version).toBe(1);

      // Edit content
      const updated = await communicationService.updateAnnouncement(principalCtx, original.id, {
        content: "Correction: School will break on Friday and resume on Tuesday.",
        changeLogNote: "Corrected break resumption dates per ministry memo",
      });

      expect(updated.version).toBe(2);
      expect(updated.editHistory.length).toBe(1);
      expect(updated.editHistory[0].title).toBe("Term 2 Mid-Term Break Dates");
      expect(updated.editHistory[0].changeLogNote).toBe("Corrected break resumption dates per ministry memo");
    });

    it("prevents deleting published announcements to protect communication history", async () => {
      const published = await communicationService.createAnnouncement(superAdminCtx, {
        title: "Official Accreditation Inspection Notice",
        content: "State ministry inspection teams on site this week.",
        category: "Administration",
        priority: "HIGH",
        targetAudience: { scope: "ALL" },
        channels: ["IN_APP"],
        publishNow: true,
      });

      await expect(
        communicationService.deleteAnnouncement(superAdminCtx, published.id)
      ).rejects.toThrow(ForbiddenError);
    });

    it("allows deleting draft announcements", async () => {
      const draft = await communicationService.createAnnouncement(principalCtx, {
        title: "Scratchpad Draft Memo",
        content: "Internal notes not meant for release.",
        category: "Administration",
        priority: "LOW",
        targetAudience: { scope: "ALL" },
        channels: ["IN_APP"],
        publishNow: false,
      });

      const res = await communicationService.deleteAnnouncement(principalCtx, draft.id);
      expect(res.success).toBe(true);
      expect(res.deletedId).toBe(draft.id);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. AUDIENCE RESOLUTION ENGINE
  // ---------------------------------------------------------------------------
  describe("Audience Resolution Engine", () => {
    it("resolves all active users when scope is ALL", async () => {
      const recipients = await communicationService.resolveAudienceRecipients(superAdminCtx, {
        scope: "ALL",
      });
      expect(recipients.length).toBeGreaterThanOrEqual(4);
      expect(recipients.some((r) => r.role === "PARENT")).toBe(true);
      expect(recipients.some((r) => r.role === "STUDENT")).toBe(true);
    });

    it("resolves only parents when role is filtered to PARENT", async () => {
      const recipients = await communicationService.resolveAudienceRecipients(principalCtx, {
        scope: "ROLES",
        roles: ["PARENT"],
      });
      expect(recipients.every((r) => r.role === "PARENT")).toBe(true);
      expect(recipients.some((r) => r.userId === "u-parent-01")).toBe(true);
    });

    it("resolves class members (students and linked guardians)", async () => {
      const recipients = await communicationService.resolveAudienceRecipients(principalCtx, {
        scope: "CLASS",
        classId: "cls-g10-01",
      });
      expect(recipients.length).toBeGreaterThan(0);
      expect(recipients.some((r) => r.userId === "u-student-01")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // 3. TARGETED / DIRECT MESSAGING
  // ---------------------------------------------------------------------------
  describe("Targeted Direct Messaging", () => {
    it("dispatches targeted message to guardians with in-app and email delivery", async () => {
      const res = await communicationService.sendDirectMessage(principalCtx, {
        recipientType: "ROLE",
        role: "PARENT",
        title: "Important Student Health Screening",
        message: "Opt-in dental and vision checks are scheduled next week.",
        channels: ["IN_APP", "EMAIL"],
        priority: "HIGH",
        category: "General",
      });

      expect(res.success).toBe(true);
      expect(res.deliveredCount).toBeGreaterThan(0);
      expect(res.messageId).toBeDefined();
    });

    it("rejects teacher messaging an unrelated class outside assigned classes", async () => {
      await expect(
        communicationService.sendDirectMessage(teacherCtx, {
          recipientType: "CLASS",
          classId: "cls-unassigned-grade12",
          title: "Senior Exam Syllabus",
          message: "Chapter 4 readings",
          channels: ["IN_APP"],
        })
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. IN-APP NOTIFICATION CENTER & READ TRACKING
  // ---------------------------------------------------------------------------
  describe("In-App Notification Center & Read State", () => {
    it("allows parent user to retrieve their notifications", async () => {
      const notifs = await communicationService.getNotifications(parentCtx);
      expect(Array.isArray(notifs)).toBe(true);
      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs.every((n) => n.recipientId === "u-parent-01")).toBe(true);
    });

    it("marks individual notification as read and updates read timestamp", async () => {
      const notifs = await communicationService.getNotifications(parentCtx, { unreadOnly: true });
      if (notifs.length > 0) {
        const targetId = notifs[0].id;
        const res = await communicationService.markNotificationAsRead(parentCtx, targetId);
        expect(res.success).toBe(true);
        expect(res.notification.isRead).toBe(true);
        expect(res.notification.readAt).toBeDefined();
      }
    });

    it("marks all notifications as read for current user", async () => {
      const res = await communicationService.markAllNotificationsAsRead(parentCtx);
      expect(res.success).toBe(true);

      const remainingUnread = await communicationService.getNotifications(parentCtx, { unreadOnly: true });
      expect(remainingUnread.length).toBe(0);
    });

    it("blocks users from modifying notifications belonging to another account", async () => {
      await expect(
        communicationService.markNotificationAsRead(studentCtx, "notif-001") // notif-001 belongs to u-parent-01
      ).rejects.toThrow(ForbiddenError);
    });
  });

  // ---------------------------------------------------------------------------
  // 5. NOTIFICATION TEMPLATES
  // ---------------------------------------------------------------------------
  describe("Notification Templates & Token Substitution", () => {
    it("creates a new notification template", async () => {
      const tmpl = await communicationService.createTemplate(superAdminCtx, {
        name: "Sports Day Inter-House Alert",
        code: "EVENTS_INTERHOUSE_SPORTS",
        category: "Events",
        type: "EVENT",
        subject: "Inter-House Sports Schedule for {{house_name}}",
        body: "Hello {{student_name}}, your athletic heats for {{event_name}} will commence at {{time}}.",
        variables: ["house_name", "student_name", "event_name", "time"],
        channels: ["IN_APP", "EMAIL"],
      });

      expect(tmpl).toBeDefined();
      expect(tmpl.code).toBe("EVENTS_INTERHOUSE_SPORTS");
    });

    it("prevents duplicate template codes within the same institution", async () => {
      await expect(
        communicationService.createTemplate(superAdminCtx, {
          name: "Duplicate Template Test",
          code: "ACADEMIC_REPORT_PUBLISHED", // Already seeded
          category: "Academic",
          subject: "Test",
          body: "Test body",
        })
      ).rejects.toThrow(ValidationError);
    });

    it("correctly substitutes tokens in template bodies", () => {
      const raw = "Dear {{parent_name}}, {{student_name}} received grade {{grade}}.";
      const substituted = communicationService.substituteTemplate(raw, {
        parent_name: "Dr. Wright",
        student_name: "Lucas",
        grade: "A+",
      });
      expect(substituted).toBe("Dear Dr. Wright, Lucas received grade A+.");
    });
  });

  // ---------------------------------------------------------------------------
  // 6. COMMUNICATION PREFERENCES & MANDATORY SAFETY ALERTS
  // ---------------------------------------------------------------------------
  describe("Communication Preferences", () => {
    it("returns communication preferences matrix for user", async () => {
      const prefs = await communicationService.getPreferences(parentCtx);
      expect(Array.isArray(prefs)).toBe(true);
      expect(prefs.length).toBeGreaterThanOrEqual(5);
    });

    it("allows updating standard notification channels", async () => {
      const updated = await communicationService.updatePreferences(parentCtx, {
        preferences: [
          { category: "Academic", channel: "EMAIL", enabled: false },
        ],
      });
      const academicEmail = updated.find((p) => p.category === "Academic" && p.channel === "EMAIL");
      expect(academicEmail?.enabled).toBe(false);
    });

    it("forbids disabling emergency safety notifications", async () => {
      await expect(
        communicationService.updatePreferences(parentCtx, {
          preferences: [
            { category: "Emergency", channel: "IN_APP", enabled: false },
          ],
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  // ---------------------------------------------------------------------------
  // 7. DELIVERY LOGS & SCHEDULED EXECUTIONS
  // ---------------------------------------------------------------------------
  describe("Delivery Tracking & Scheduled Jobs", () => {
    it("retrieves delivery tracking logs", async () => {
      const logs = await communicationService.getDeliveryLogs(principalCtx);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].channel).toBeDefined();
    });

    it("retries a failed delivery record", async () => {
      const logs = await communicationService.getDeliveryLogs(principalCtx);
      if (logs.length > 0) {
        const retried = await communicationService.retryFailedDelivery(principalCtx, logs[0].id);
        expect(retried.attempts).toBeGreaterThanOrEqual(2);
      }
    });

    it("processes scheduled and expiring announcements correctly", async () => {
      const result = await communicationService.processScheduledAnnouncements(superAdminCtx);
      expect(result).toBeDefined();
      expect(typeof result.published).toBe("number");
      expect(typeof result.expired).toBe("number");
    });
  });

  // ---------------------------------------------------------------------------
  // 8. DASHBOARD ANALYTICS & TENANT ISOLATION
  // ---------------------------------------------------------------------------
  describe("Dashboard Analytics & Multi-Tenancy", () => {
    it("calculates accurate statistics for the organization", async () => {
      const stats = await communicationService.getCommunicationStats(principalCtx);
      expect(stats.totalAnnouncements).toBeGreaterThan(0);
      expect(stats.publishedAnnouncements).toBeGreaterThan(0);
      expect(stats.totalNotificationsSent).toBeGreaterThan(0);
      expect(stats.deliverySuccessRate).toBeGreaterThanOrEqual(0);
    });

    it("enforces tenant isolation and isolates announcements across foreign tenants", async () => {
      const foreignAnnouncements = await communicationService.getAnnouncements(foreignTenantCtx, {});
      expect(foreignAnnouncements.items.length).toBe(0);
      expect(foreignAnnouncements.total).toBe(0);
    });
  });
});
