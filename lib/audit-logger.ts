import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "USER_LOGIN"
  | "2FA_ENABLED"
  | "2FA_DISABLED"
  | "PROJECT_CREATED"
  | "PROJECT_DELETED"
  | "WORKSPACE_CREATED"
  | "FILE_UPLOADED"
  | "SECRET_VIEWED"
  | "TASK_CREATED"
  | "TASK_UPDATED"
  | "PROJECT_UPDATED";

interface AuditLogParams {
  userId: string;
  action: AuditAction | string;
  resourceId?: string;
  resourceType?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log a sensitive or administrative action to the AuditLog table
 */
export async function logAction({
  userId,
  action,
  resourceId,
  resourceType,
  metadata,
  ipAddress,
  userAgent,
}: AuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceId,
        resourceType,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // We don't want audit logging failures to crash the main request flow,
    // but we should definitely log the failure itself.
    console.error("[AUDIT_LOG_ERROR]", error);
  }
}
