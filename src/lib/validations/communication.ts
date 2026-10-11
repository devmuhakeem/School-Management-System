import { z } from "zod";

export const AnnouncementPriorityEnum = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);
export type AnnouncementPriority = z.infer<typeof AnnouncementPriorityEnum>;

export const AnnouncementStatusEnum = z.enum([
  "DRAFT",
  "SCHEDULED",
  "PUBLISHED",
  "EXPIRED",
  "ARCHIVED",
  "CANCELLED",
]);
export type AnnouncementStatus = z.infer<typeof AnnouncementStatusEnum>;

export const DeliveryChannelEnum = z.enum(["IN_APP", "EMAIL", "SMS"]);
export type DeliveryChannel = z.infer<typeof DeliveryChannelEnum>;

export const DeliveryStatusEnum = z.enum(["PENDING", "SENT", "DELIVERED", "FAILED", "READ"]);
export type DeliveryStatus = z.infer<typeof DeliveryStatusEnum>;

export const ANNOUNCEMENT_CATEGORIES = [
  "General",
  "Academic",
  "Examination",
  "Finance",
  "Attendance",
  "Events",
  "Admissions",
  "Emergency",
  "Holiday",
  "Administration",
  "Transport",
  "Hostel",
  "Other",
] as const;

export const TargetAudienceScopeEnum = z.enum([
  "ALL",
  "CAMPUS",
  "ROLES",
  "CLASS",
  "SECTION",
  "STUDENTS",
]);

export const targetAudienceSchema = z.object({
  scope: TargetAudienceScopeEnum.default("ALL"),
  roles: z.array(z.string()).optional(),
  campusId: z.string().optional().nullable(),
  classId: z.string().optional().nullable(),
  sectionId: z.string().optional().nullable(),
  studentIds: z.array(z.string()).optional(),
  audienceLabel: z.string().optional(),
});
export type TargetAudience = z.infer<typeof targetAudienceSchema>;

export const createAnnouncementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title cannot exceed 200 characters"),
  summary: z.string().trim().max(300, "Summary cannot exceed 300 characters").optional().nullable(),
  content: z
    .string()
    .trim()
    .min(5, "Content must be at least 5 characters"),
  category: z.string().trim().min(2, "Category is required").default("General"),
  priority: AnnouncementPriorityEnum.default("NORMAL"),
  campusId: z.string().trim().optional().nullable(),
  targetAudience: targetAudienceSchema.default({ scope: "ALL" }),
  channels: z.array(DeliveryChannelEnum).min(1, "Select at least one delivery channel").default(["IN_APP"]),
  scheduledPublishDate: z.string().datetime({ offset: true }).optional().nullable().or(z.string().optional().nullable()),
  expiryDate: z.string().datetime({ offset: true }).optional().nullable().or(z.string().optional().nullable()),
  isPinned: z.boolean().default(false),
  attachmentUrls: z.array(z.string().url("Attachment must be a valid URL")).optional().default([]),
  publishNow: z.boolean().default(false),
});
export type CreateAnnouncementInput = z.input<typeof createAnnouncementSchema>;

export const updateAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(200).optional(),
  summary: z.string().trim().max(300).optional().nullable(),
  content: z.string().trim().min(5).optional(),
  category: z.string().trim().min(2).optional(),
  priority: AnnouncementPriorityEnum.optional(),
  campusId: z.string().trim().optional().nullable(),
  targetAudience: targetAudienceSchema.optional(),
  channels: z.array(DeliveryChannelEnum).optional(),
  scheduledPublishDate: z.string().datetime({ offset: true }).optional().nullable().or(z.string().optional().nullable()),
  expiryDate: z.string().datetime({ offset: true }).optional().nullable().or(z.string().optional().nullable()),
  isPinned: z.boolean().optional(),
  attachmentUrls: z.array(z.string()).optional(),
  status: AnnouncementStatusEnum.optional(),
  changeLogNote: z.string().trim().max(200).optional(),
  notifyOnMaterialChange: z.boolean().optional().default(false),
});
export type UpdateAnnouncementInput = z.input<typeof updateAnnouncementSchema>;

export const sendDirectMessageSchema = z.object({
  recipientType: z.enum(["USER", "ROLE", "CLASS", "SECTION", "GUARDIAN_OF_STUDENT"]),
  recipientId: z.string().trim().optional().nullable(),
  role: z.string().trim().optional().nullable(),
  campusId: z.string().trim().optional().nullable(),
  classId: z.string().trim().optional().nullable(),
  sectionId: z.string().trim().optional().nullable(),
  title: z.string().trim().min(2, "Subject/title must be at least 2 characters").max(150),
  message: z.string().trim().min(2, "Message cannot be empty"),
  priority: AnnouncementPriorityEnum.default("NORMAL"),
  category: z.string().trim().default("General"),
  channels: z.array(DeliveryChannelEnum).min(1).default(["IN_APP"]),
  relatedEntity: z.string().trim().optional().nullable(),
  relatedEntityId: z.string().trim().optional().nullable(),
  templateCode: z.string().trim().optional().nullable(),
  templateVariables: z.record(z.string(), z.string()).optional(),
});
export type SendDirectMessageInput = z.input<typeof sendDirectMessageSchema>;

export const createTemplateSchema = z.object({
  name: z.string().trim().min(3, "Template name must be at least 3 characters").max(100),
  code: z
    .string()
    .trim()
    .min(2, "Code must be at least 2 characters")
    .max(50)
    .regex(/^[A-Z0-9_]+$/, "Code must be uppercase alphanumeric and underscores only"),
  category: z.string().trim().min(2, "Category is required"),
  type: z.string().trim().default("SYSTEM"),
  subject: z.string().trim().min(2, "Subject is required").max(200),
  body: z.string().trim().min(5, "Template body must be at least 5 characters"),
  variables: z.array(z.string()).default([]),
  channels: z.array(DeliveryChannelEnum).default(["IN_APP", "EMAIL"]),
  isActive: z.boolean().default(true),
});
export type CreateTemplateInput = z.input<typeof createTemplateSchema>;

export const updateTemplateSchema = createTemplateSchema.partial();
export type UpdateTemplateInput = z.input<typeof updateTemplateSchema>;

export const updatePreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      category: z.string().trim(),
      channel: DeliveryChannelEnum,
      enabled: z.boolean(),
    })
  ).min(1, "At least one preference setting required"),
});
export type UpdatePreferencesInput = z.input<typeof updatePreferencesSchema>;

export const queryAnnouncementsSchema = z.object({
  status: AnnouncementStatusEnum.optional(),
  category: z.string().optional(),
  priority: AnnouncementPriorityEnum.optional(),
  campusId: z.string().optional(),
  search: z.string().optional(),
  includeExpired: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type QueryAnnouncementsParams = z.input<typeof queryAnnouncementsSchema>;

export const queryNotificationsSchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  type: z.string().optional(),
  priority: AnnouncementPriorityEnum.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type QueryNotificationsParams = z.input<typeof queryNotificationsSchema>;
