/**
 * Authorization Guards for API Routes
 *
 * These guards enforce RBAC and membership-based authorization.
 * Use in API routes AFTER authentication to check permissions.
 *
 * All guards throw errors with appropriate status codes that should be
 * caught by the API route error handler.
 */

import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

// ============================================================================
// CUSTOM ERROR TYPES
// ============================================================================

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

// ============================================================================
// AUTHENTICATION HELPER
// ============================================================================

/**
 * Require authenticated user for API route
 *
 * This is the ONLY place we trust the Supabase session.
 * Returns the internal User object or throws 401.
 *
 * @throws {UnauthorizedError} If user is not authenticated
 * @returns {Promise<User>} Authenticated user from database
 */
export async function requireUser(): Promise<User> {
  const { getCurrentUser } = await import("@/lib/supabase/server");
  const user = await getCurrentUser();

  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }

  return user;
}

// ============================================================================
// WORKSPACE GUARDS
// ============================================================================

/**
 * Assert user is a member of the specified workspace
 *
 * @throws {ForbiddenError} If user is not a workspace member
 * @throws {NotFoundError} If workspace does not exist
 */
export async function assertWorkspaceMember(
  userId: string,
  workspaceId: string,
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    throw new NotFoundError("Workspace not found");
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new ForbiddenError("Not a workspace member");
  }
}

/**
 * Assert user is the owner of the specified workspace
 *
 * @throws {ForbiddenError} If user is not the workspace owner
 * @throws {NotFoundError} If workspace does not exist
 */
export async function assertWorkspaceOwner(
  userId: string,
  workspaceId: string,
): Promise<void> {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  });

  if (!workspace) {
    throw new NotFoundError("Workspace not found");
  }

  if (workspace.ownerId !== userId) {
    throw new ForbiddenError("Only workspace owner can perform this action");
  }
}

/**
 * Get workspace membership or throw
 * Useful when you need the membership details
 */
export async function getWorkspaceMembershipOrThrow(
  userId: string,
  workspaceId: string,
) {
  await assertWorkspaceMember(userId, workspaceId);

  const membership = await prisma.workspaceMember.findUniqueOrThrow({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId,
      },
    },
    include: {
      workspace: true,
    },
  });

  return membership;
}

// ============================================================================
// PROJECT GUARDS
// ============================================================================

/**
 * Assert user is a member of the specified project
 *
 * @throws {ForbiddenError} If user is not a project member
 * @throws {NotFoundError} If project does not exist
 */
export async function assertProjectMember(
  userId: string,
  projectId: string,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
    },
  });

  if (!membership) {
    throw new ForbiddenError("Not a project member");
  }
}

/**
 * Assert user can manage the project (is OWNER)
 *
 * @throws {ForbiddenError} If user cannot manage project
 * @throws {NotFoundError} If project does not exist
 */
export async function assertCanManageProject(
  userId: string,
  projectId: string,
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new NotFoundError("Project not found");
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId,
      role: "OWNER",
    },
  });

  if (!membership) {
    throw new ForbiddenError("Project owner permission required");
  }
}

/**
 * Get project membership or throw
 * Useful when you need the membership details
 */
export async function getProjectMembershipOrThrow(
  userId: string,
  projectId: string,
) {
  await assertProjectMember(userId, projectId);

  const membership = await prisma.projectMember.findFirstOrThrow({
    where: {
      projectId,
      userId,
    },
    include: {
      project: {
        include: {
          workspace: true,
        },
      },
    },
  });

  return membership;
}

// ============================================================================
// TASK GUARDS
// ============================================================================

/**
 * Assert user can access the specified task
 * (via project membership)
 *
 * @throws {ForbiddenError} If user cannot access task
 * @throws {NotFoundError} If task does not exist
 */
export async function assertCanAccessTask(
  userId: string,
  taskId: string,
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw new NotFoundError("Task not found");
  }

  await assertProjectMember(userId, task.projectId);
}

// ============================================================================
// DM (DIRECT MESSAGE) GUARDS
// ============================================================================

/**
 * Assert two users can DM each other
 * (they must share at least one workspace)
 *
 * @throws {ForbiddenError} If users don't share a workspace
 */
export async function assertCanDirectMessage(
  senderId: string,
  receiverId: string,
): Promise<void> {
  // Get all workspaces for sender
  const senderWorkspaces = await prisma.workspaceMember.findMany({
    where: { userId: senderId },
    select: { workspaceId: true },
  });

  const senderWorkspaceIds = senderWorkspaces.map((w) => w.workspaceId);

  // Check if receiver is in any of those workspaces
  const sharedMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: receiverId,
      workspaceId: { in: senderWorkspaceIds },
    },
  });

  if (!sharedMembership) {
    throw new ForbiddenError("Can only message users in shared workspaces");
  }
}

// ============================================================================
// CONVERSATION GUARDS
// ============================================================================

/**
 * Assert user is a member of the specified conversation
 *
 * @throws {ForbiddenError} If user is not a conversation member
 * @throws {NotFoundError} If conversation does not exist
 */
export async function assertConversationMember(
  userId: string,
  conversationId: string,
): Promise<void> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new NotFoundError("Conversation not found");
  }

  const membership = await prisma.conversationMember.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
  });

  if (!membership) {
    throw new ForbiddenError("Not a conversation member");
  }
}

// ============================================================================
// FILE GUARDS
// ============================================================================

/**
 * Assert user can access the specified file
 * (via project membership)
 *
 * @throws {ForbiddenError} If user cannot access file
 * @throws {NotFoundError} If file does not exist
 */
export async function assertCanAccessFile(
  userId: string,
  fileId: string,
): Promise<void> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new NotFoundError("File not found");
  }

  await assertProjectMember(userId, file.projectId);
}

/**
 * Assert user can access file by storage key
 *
 * @throws {ForbiddenError} If user cannot access file
 * @throws {NotFoundError} If file does not exist
 */
export async function assertCanAccessFileByKey(
  userId: string,
  fileKey: string,
): Promise<void> {
  const file = await prisma.file.findUnique({
    where: { key: fileKey },
  });

  if (!file) {
    throw new NotFoundError("File not found");
  }

  await assertProjectMember(userId, file.projectId);
}

// ============================================================================
// NOTIFICATION GUARDS
// ============================================================================

/**
 * Assert notification belongs to user
 *
 * @throws {ForbiddenError} If notification doesn't belong to user
 * @throws {NotFoundError} If notification does not exist
 */
export async function assertOwnNotification(
  userId: string,
  notificationId: string,
): Promise<void> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    throw new NotFoundError("Notification not found");
  }

  if (notification.userId !== userId) {
    throw new ForbiddenError("Cannot access another user's notification");
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Sanitize optional ID fields from request body
 * Convert empty strings to null, validate format
 */
export function sanitizeOptionalId(
  id: string | null | undefined,
): string | null {
  if (!id || id.trim() === "") {
    return null;
  }

  // Validate CUID format (starts with 'c', alphanumeric, 25 chars)
  const cuidRegex = /^c[a-z0-9]{24}$/;
  if (!cuidRegex.test(id)) {
    // Could also validate UUID format if needed
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new Error(`Invalid ID format: ${id}`);
    }
  }

  return id;
}

/**
 * Check if user has access to a project (returns boolean)
 * Use this for soft checks where you don't want to throw
 */
export async function hasProjectAccess(
  userId: string,
  projectId: string,
): Promise<boolean> {
  try {
    await assertProjectMember(userId, projectId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user has access to a workspace (returns boolean)
 */
export async function hasWorkspaceAccess(
  userId: string,
  workspaceId: string,
): Promise<boolean> {
  try {
    await assertWorkspaceMember(userId, workspaceId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Handle guard errors in API routes
 * Converts guard errors to Next.js responses
 */
export function handleGuardError(error: unknown) {
  if (error instanceof UnauthorizedError) {
    return { error: error.message, status: 401 };
  }

  if (error instanceof ForbiddenError) {
    return { error: error.message, status: 403 };
  }

  if (error instanceof NotFoundError) {
    return { error: error.message, status: 404 };
  }

  // Unknown error
  console.error("Unexpected error in guard:", error);
  return { error: "Internal server error", status: 500 };
}
