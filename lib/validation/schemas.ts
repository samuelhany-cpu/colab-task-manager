/**
 * Zod Validation Schemas for API Routes
 *
 * Centralized validation schemas with strict rules.
 * All API routes should use these schemas for input validation.
 *
 * Usage:
 * ```typescript
 * import { taskCreateSchema } from "@/lib/validation/schemas";
 * const data = taskCreateSchema.parse(await req.json());
 * ```
 */

import { z } from "zod";

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

// CUID format validation
export const cuidSchema = z
  .string()
  .regex(/^c[a-z0-9]{24}$/, "Invalid ID format");

// Optional CUID (empty string becomes null)
export const optionalCuidSchema = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.union([cuidSchema, z.null()]),
);

// Email validation
export const emailSchema = z.string().email().toLowerCase().max(255);

// Slug validation (URL-safe)
export const slugSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens");

// Name validation
export const nameSchema = z.string().min(1).max(255).trim();

// Description validation
export const descriptionSchema = z.string().max(10000).trim().optional();

// Search query
export const searchQuerySchema = z.string().min(1).max(500).trim();

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const registerSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const updateProfileSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  image: z.string().url().max(1000).optional(),
});

// ============================================================================
// WORKSPACE SCHEMAS
// ============================================================================

export const workspaceCreateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  slug: slugSchema,
});

export const workspaceUpdateSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
});

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.enum(["OWNER", "MEMBER"]).default("MEMBER"),
});

// ============================================================================
// PROJECT SCHEMAS
// ============================================================================

export const projectCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).trim(),
  description: descriptionSchema,
  workspaceId: cuidSchema,
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
  description: z.union([descriptionSchema, z.null()]).optional(),
  status: z.enum(["ACTIVE", "ARCHIVED"]).optional(),
});

export const projectMemberAddSchema = z.object({
  userId: cuidSchema,
  role: z.enum(["OWNER", "MEMBER"]).default("MEMBER"),
});

// ============================================================================
// TASK SCHEMAS
// ============================================================================

export const taskCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500).trim(),
  description: descriptionSchema,
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z
    .preprocess(
      (val) => (val === "" || val === null ? null : val),
      z.union([z.string().datetime(), z.null()]),
    )
    .optional(),
  projectId: cuidSchema,
  assigneeId: optionalCuidSchema.optional(),
  tagIds: z.array(cuidSchema).optional(),
});

export const taskUpdateSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  description: z.union([descriptionSchema, z.null()]).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z
    .preprocess(
      (val) => (val === "" || val === null ? null : val),
      z.union([z.string().datetime(), z.null()]),
    )
    .optional(),
  assigneeId: optionalCuidSchema.optional(),
  position: z.number().optional(),
  tagIds: z.array(cuidSchema).optional(),
});

export const taskPositionUpdateSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  position: z.number().optional(),
});

// ============================================================================
// SUBTASK SCHEMAS
// ============================================================================

export const subtaskCreateSchema = z.object({
  title: z.string().min(1, "Title is required").max(500).trim(),
  taskId: cuidSchema,
});

export const subtaskUpdateSchema = z.object({
  title: z.string().min(1).max(500).trim().optional(),
  completed: z.boolean().optional(),
  position: z.number().optional(),
});

// ============================================================================
// COMMENT SCHEMAS
// ============================================================================

export const commentCreateSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(10000).trim(),
  taskId: cuidSchema,
});

export const commentUpdateSchema = z.object({
  content: z.string().min(1).max(10000).trim(),
});

// ============================================================================
// MESSAGE SCHEMAS (CHAT)
// ============================================================================

export const messageCreateSchema = z
  .object({
    content: z.string().min(1, "Message cannot be empty").max(10000).trim(),
    workspaceId: optionalCuidSchema.optional(),
    projectId: optionalCuidSchema.optional(),
    receiverId: optionalCuidSchema.optional(),
    conversationId: optionalCuidSchema.optional(),
    parentId: optionalCuidSchema.optional(),
  })
  .refine(
    (data) => {
      // At least one context must be provided
      return !!(
        data.workspaceId ||
        data.projectId ||
        data.receiverId ||
        data.conversationId ||
        data.parentId
      );
    },
    {
      message:
        "Message must have a context (workspace, project, receiver, conversation, or parent)",
    },
  );

export const messageUpdateSchema = z.object({
  content: z.string().min(1).max(10000).trim(),
});

export const messageReactionSchema = z.object({
  emoji: z.string().regex(/^[\u{1F300}-\u{1F9FF}]$/u, "Invalid emoji"),
  messageId: cuidSchema,
});

// ============================================================================
// CONVERSATION SCHEMAS
// ============================================================================

export const conversationCreateSchema = z.object({
  workspaceId: cuidSchema,
  userIds: z.array(cuidSchema).min(1, "At least one user required"),
  name: z.string().min(1).max(255).trim().optional(),
});

export const conversationUpdateSchema = z.object({
  name: z.string().min(1).max(255).trim().optional(),
});

// ============================================================================
// FILE SCHEMAS
// ============================================================================

export const fileUploadSchema = z.object({
  projectId: cuidSchema,
  folderId: optionalCuidSchema.optional(),
  taskId: optionalCuidSchema.optional(),
});

export const fileMoveSchema = z.object({
  folderId: optionalCuidSchema,
});

// Allowed MIME types
export const ALLOWED_FILE_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Text
  "text/plain",
  "text/csv",
  "text/markdown",
  // Archives
  "application/zip",
  "application/x-7z-compressed",
  // Code
  "application/json",
  "application/xml",
  "text/javascript",
  "text/html",
  "text/css",
];

// Max file size: 50MB
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function validateFileUpload(file: File): {
  valid: boolean;
  error?: string;
} {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type not allowed: ${file.type}`,
    };
  }

  // Check filename
  if (file.name.length > 255) {
    return {
      valid: false,
      error: "Filename too long (max 255 characters)",
    };
  }

  // Check for suspicious extensions
  const dangerousExtensions = [
    ".exe",
    ".dll",
    ".bat",
    ".cmd",
    ".sh",
    ".ps1",
    ".vbs",
    ".scr",
  ];
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension && dangerousExtensions.includes(`.${extension}`)) {
    return {
      valid: false,
      error: "Executable files are not allowed",
    };
  }

  return { valid: true };
}

// ============================================================================
// FOLDER SCHEMAS
// ============================================================================

export const folderCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(255).trim(),
  projectId: cuidSchema,
  parentId: optionalCuidSchema.optional(),
});

export const folderUpdateSchema = z.object({
  name: z.string().min(1).max(255).trim(),
});

// ============================================================================
// TIME ENTRY SCHEMAS
// ============================================================================

export const timeEntryCreateSchema = z
  .object({
    taskId: cuidSchema,
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    note: z.string().max(1000).trim().optional(),
    isBillable: z.boolean().default(true),
  })
  .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
    message: "End time must be after start time",
    path: ["endTime"],
  });

export const timeEntryUpdateSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  note: z.string().max(1000).trim().optional(),
  isBillable: z.boolean().optional(),
});

// ============================================================================
// TIMER SCHEMAS
// ============================================================================

export const timerStartSchema = z.object({
  taskId: cuidSchema,
});

// ============================================================================
// TAG SCHEMAS
// ============================================================================

export const tagCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(50).trim(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Invalid color format")
    .default("#3b82f6"),
  workspaceId: cuidSchema,
});

export const tagUpdateSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Invalid color format")
    .optional(),
});

// ============================================================================
// NOTIFICATION SCHEMAS
// ============================================================================

export const notificationMarkReadSchema = z.object({
  notificationIds: z.array(cuidSchema).optional(),
});

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

export const searchSchema = z.object({
  query: searchQuerySchema,
  workspaceId: cuidSchema.optional(),
  type: z.enum(["all", "tasks", "files", "messages"]).default("all"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
