import { prisma } from "@/lib/prisma";
import {
  requireUser,
  assertWorkspaceMember,
  assertProjectMember,
  assertConversationMember,
  NotFoundError,
  ForbiddenError,
} from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-handler";
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const readSchema = z.object({
  messageId: z.string().cuid(),
  workspaceId: z.string().cuid().optional(),
  projectId: z.string().cuid().optional(),
  receiverId: z.string().cuid().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Authentication
    const user = await requireUser();

    // 3. Validate input
    const body = await req.json();
    const { messageId, workspaceId, projectId, receiverId } =
      readSchema.parse(body);

    // 4. Fetch message to verify context and authorization
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        workspaceId: true,
        projectId: true,
        conversationId: true,
        parentId: true,
        status: true,
      },
    });

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // 5. Authorization: Verify user has access to message context
    if (message.workspaceId) {
      await assertWorkspaceMember(user.id, message.workspaceId);
    } else if (message.projectId) {
      await assertProjectMember(user.id, message.projectId);
    } else if (message.conversationId) {
      await assertConversationMember(user.id, message.conversationId);
    } else if (message.receiverId) {
      // DM: user must be sender or receiver
      if (user.id !== message.senderId && user.id !== message.receiverId) {
        throw new ForbiddenError("Not authorized to mark this message as read");
      }
    } else {
      throw new ForbiddenError("Message has no valid context");
    }

    // 6. Determine unique constraint based on context
    let where;
    if (workspaceId) {
      where = { userId_workspaceId: { userId: user.id, workspaceId } };
    } else if (projectId) {
      where = { userId_projectId: { userId: user.id, projectId } };
    } else if (receiverId) {
      where = { userId_receiverId: { userId: user.id, receiverId } };
    } else {
      return NextResponse.json(
        { error: "Context required (workspaceId, projectId, or receiverId)" },
        { status: 400 },
      );
    }

    // 7. Upsert the read status
    const messageRead = await prisma.messageRead.upsert({
      where,
      create: {
        userId: user.id,
        messageId,
        workspaceId,
        projectId,
        receiverId,
        lastReadAt: new Date(),
      },
      update: {
        messageId,
        lastReadAt: new Date(),
      },
    });

    // 8. Update message status to READ (only if user is receiver)
    if (user.id === message.receiverId) {
      await prisma.message.update({
        where: { id: messageId },
        data: { status: "READ" },
      });
    }

    // 9. Broadcast read status (non-blocking)
    (async () => {
      try {
        const supabase = await createClient();
        const channelId = message.parentId
          ? `thread:${message.parentId}`
          : message.workspaceId
            ? `workspace:${message.workspaceId}`
            : message.projectId
              ? `project:${message.projectId}`
              : message.conversationId
                ? `conversation:${message.conversationId}`
                : message.receiverId
                  ? `dm:${[message.senderId, message.receiverId].sort().join(":")}`
                  : null;

        if (channelId) {
          const channel = supabase.channel(channelId);
          await channel.subscribe();
          await channel.send({
            type: "broadcast",
            event: "message-read",
            payload: {
              id: message.id,
              status: "READ",
              readBy: user.id,
              lastReadAt: messageRead.lastReadAt,
            },
          });
        }
      } catch (e) {
        console.error("[READ_BROADCAST_ERROR]", e);
      }
    })();

    const response = NextResponse.json(messageRead);
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
