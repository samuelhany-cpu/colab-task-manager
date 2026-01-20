import { prisma } from "@/lib/prisma";
import { requireUser, ForbiddenError, NotFoundError } from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-handler";
import {
  rateLimitChat,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { messageUpdateSchema } from "@/lib/validation/schemas";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Rate limiting (edit operations)
    const rateLimitResult = await rateLimitChat(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Authentication
    const user = await requireUser();

    // 3. Validate input
    const resolvedParams = await params;
    const id = resolvedParams.id;
    const body = await req.json();
    const { content } = messageUpdateSchema.parse(body);

    // 4. Fetch message with context
    const message = await prisma.message.findUnique({
      where: { id },
      select: {
        id: true,
        senderId: true,
        workspaceId: true,
        projectId: true,
        conversationId: true,
        receiverId: true,
        parentId: true,
        content: true,
        createdAt: true,
      },
    });

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // 5. Authorization: Only sender can edit
    if (message.senderId !== user.id) {
      throw new ForbiddenError("Only message sender can edit");
    }

    // 6. Check edit time window (15 minutes)
    const fifteenMinutes = 15 * 60 * 1000;
    const messageAge = Date.now() - message.createdAt.getTime();
    if (messageAge > fifteenMinutes) {
      throw new ForbiddenError("Message edit window expired (15 minutes)");
    }

    // 7. Update message
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        content,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    // 8. Broadcast update to appropriate channel
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
        event: "message-updated",
        payload: updatedMessage,
      });
    }

    const response = NextResponse.json(updatedMessage);
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimitChat(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Authentication
    const user = await requireUser();

    // 3. Validate params
    const resolvedParams = await params;
    const id = resolvedParams.id;

    // 4. Fetch message with replies count
    const message = await prisma.message.findUnique({
      where: { id },
      select: {
        id: true,
        senderId: true,
        workspaceId: true,
        projectId: true,
        conversationId: true,
        receiverId: true,
        parentId: true,
        _count: {
          select: {
            replies: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundError("Message not found");
    }

    // 5. Authorization: Only sender can delete
    if (message.senderId !== user.id) {
      throw new ForbiddenError("Only message sender can delete");
    }

    // 6. Delete strategy: if has replies, soft delete; otherwise hard delete
    if (message._count.replies > 0) {
      // Soft delete: replace content with deletion marker
      await prisma.message.update({
        where: { id },
        data: {
          content: "[deleted]",
        },
      });
    } else {
      // Hard delete: remove completely
      await prisma.message.delete({
        where: { id },
      });
    }

    // 7. Broadcast deletion
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
        event: "message-deleted",
        payload: { id, softDeleted: message._count.replies > 0 },
      });
    }

    const response = new NextResponse(null, { status: 204 });
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
