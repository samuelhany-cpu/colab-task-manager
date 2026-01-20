import { prisma } from "./prisma";
import { NotificationType } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  content: string;
  link?: string;
}

/**
 * Create a notification for a user
 * This function creates a notification in the database and can emit via Socket.io
 */
export async function createNotification({
  userId,
  type,
  content,
  link,
}: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        content,
        link,
      },
    });

    // Broadcast via Supabase Realtime
    const { createClient } = await import("./supabase/server");
    const supabase = await createClient();

    await supabase.channel(`user:${userId}`).send({
      type: "broadcast",
      event: "new-notification",
      payload: notification,
    });

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Create notification when a task is assigned
 */
export async function notifyTaskAssigned(
  assigneeId: string,
  taskTitle: string,
  taskId: string,
  projectId: string,
  workspaceSlug: string,
) {
  return createNotification({
    userId: assigneeId,
    type: "TASK_ASSIGNED",
    content: `You have been assigned to task: ${taskTitle}`,
    link: `/app/${workspaceSlug}/projects/${projectId}?task=${taskId}`,
  });
}

/**
 * Create notification when mentioned in a comment
 */
export async function notifyCommentMention(
  userId: string,
  mentionerName: string,
  taskTitle: string,
  taskId: string,
  projectId: string,
  workspaceSlug: string,
) {
  return createNotification({
    userId,
    type: "COMMENT_MENTION",
    content: `${mentionerName} mentioned you in a comment on "${taskTitle}"`,
    link: `/app/${workspaceSlug}/projects/${projectId}?task=${taskId}`,
  });
}

/**
 * Create notification when a message is received
 */
export async function notifyMessageReceived(
  userId: string,
  senderName: string,
  projectId?: string,
  workspaceSlug?: string,
) {
  return createNotification({
    userId,
    type: "MESSAGE_RECEIVED",
    content: `${senderName} sent you a message`,
    link:
      projectId && workspaceSlug
        ? `/app/${workspaceSlug}/chat?project=${projectId}`
        : `/app/${workspaceSlug}/chat`,
  });
}

/**
 * Create notification when invited to a project
 */
export async function notifyProjectInvite(
  userId: string,
  projectName: string,
  projectId: string,
  workspaceSlug: string,
) {
  return createNotification({
    userId,
    type: "PROJECT_INVITE",
    content: `You have been added to project: ${projectName}`,
    link: `/app/${workspaceSlug}/projects/${projectId}`,
  });
}

/**
 * Create notification when mentioned in a chat message
 */
export async function notifyChatMention({
  userId,
  mentionerName,
  workspaceSlug,
  projectId,
  receiverId,
  conversationId,
}: {
  userId: string;
  mentionerName: string;
  workspaceSlug?: string;
  projectId?: string;
  receiverId?: string;
  conversationId?: string;
}) {
  let link = `/app/${workspaceSlug || "default"}/chat`;
  if (projectId) link += `?project=${projectId}`;
  else if (receiverId) link += `?receiver=${receiverId}`;
  else if (conversationId) link += `?conversation=${conversationId}`;

  return createNotification({
    userId,
    type: "CHAT_MENTION",
    content: `${mentionerName} mentioned you in a chat message`,
    link,
  });
}
