import { prisma } from "@/lib/prisma";
import {
  requireUser,
  assertWorkspaceMember,
  assertProjectMember,
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

const deliveredSchema = z.object({
  messageId: z.string().cuid(),
});

export async function POST(req: Request) {
  try {
    // 1. Rate limiting (status updates are lightweight, use DEFAULT)
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Authentication
    const user = await requireUser();

    // 3. Validate input
    const body = await req.json();
    const { messageId } = deliveredSchema.parse(body);

    // 4. Fetch message to verify authorization
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

    // 5. Authorization: User must be the receiver or have access to context
    const isReceiver = message.receiverId === user.id;
    let hasAccess = isReceiver;

    if (!hasAccess && message.workspaceId) {
      // Verify workspace membership
      await assertWorkspaceMember(user.id, message.workspaceId);
      hasAccess = true;
    }

    if (!hasAccess && message.projectId) {
      // Verify project membership
      await assertProjectMember(user.id, message.projectId);
      hasAccess = true;
    }

    if (!hasAccess) {
      throw new ForbiddenError(
        "Not authorized to mark this message as delivered",
      );
    }

    // 6. Update message status to DELIVERED
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        deliveredAt: true,
      },
    });

    // 7. Broadcast delivery status to sender (non-blocking)
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
            event: "message-delivered",
            payload: {
              id: updatedMessage.id,
              status: updatedMessage.status,
              deliveredAt: updatedMessage.deliveredAt,
              userId: user.id,
            },
          });
        }
      } catch (e) {
        console.error("[DELIVERED_BROADCAST_ERROR]", e);
      }
    })();

    const response = NextResponse.json({
      success: true,
      message: updatedMessage,
    });
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
