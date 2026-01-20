import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  assertWorkspaceMember,
  assertProjectMember,
  assertCanDirectMessage,
  assertConversationMember,
} from "@/lib/auth/guards";
import { handleApiError } from "@/lib/api/error-handler";
import { notifyChatMention } from "@/lib/notifications";
import {
  rateLimitChat,
  createRateLimitResponse,
  isSpamContent,
  checkBurstSpam,
} from "@/lib/middleware/rate-limit";
import { messageCreateSchema } from "@/lib/validation/schemas";

export async function GET(req: Request) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimitChat(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Authentication
    const user = await requireUser();

    // 3. Parse and validate parameters
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId")?.trim() || null;
    const projectId = searchParams.get("projectId")?.trim() || null;
    const receiverId = searchParams.get("receiverId")?.trim() || null;
    const parentId = searchParams.get("parentId")?.trim() || null;
    const conversationId = searchParams.get("conversationId")?.trim() || null;

    if (
      !workspaceId &&
      !projectId &&
      !receiverId &&
      !parentId &&
      !conversationId
    ) {
      return NextResponse.json({ error: "Context required" }, { status: 400 });
    }

    const include = {
      sender: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      reactions: {
        select: {
          id: true,
          emoji: true,
          userId: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          replies: true,
        },
      },
    };

    const orderBy = { createdAt: "asc" as const };
    const take = 50;

    // Thread messages (check parent message access)
    if (parentId) {
      // Verify access to parent message's context
      const parentMessage = await prisma.message.findUnique({
        where: { id: parentId },
        select: {
          workspaceId: true,
          projectId: true,
          receiverId: true,
          senderId: true,
          conversationId: true,
        },
      });

      if (!parentMessage) {
        return NextResponse.json(
          { error: "Parent message not found" },
          { status: 404 },
        );
      }

      // Verify user has access to parent message context
      if (parentMessage.workspaceId) {
        await assertWorkspaceMember(user.id, parentMessage.workspaceId);
      } else if (parentMessage.projectId) {
        await assertProjectMember(user.id, parentMessage.projectId);
      } else if (parentMessage.conversationId) {
        await assertConversationMember(user.id, parentMessage.conversationId);
      } else if (parentMessage.receiverId) {
        // DM - verify user is sender or receiver
        if (
          user.id !== parentMessage.senderId &&
          user.id !== parentMessage.receiverId
        ) {
          return NextResponse.json(
            { error: "Not authorized" },
            { status: 403 },
          );
        }
      }

      const messages = await prisma.message.findMany({
        where: { parentId },
        include,
        orderBy,
      });

      const response = NextResponse.json(messages);
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Workspace messages
    if (workspaceId) {
      await assertWorkspaceMember(user.id, workspaceId);

      const messages = await prisma.message.findMany({
        where: { workspaceId, parentId: null },
        include,
        orderBy,
        take,
      });

      const response = NextResponse.json(messages);
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Project messages
    if (projectId) {
      await assertProjectMember(user.id, projectId);

      const messages = await prisma.message.findMany({
        where: { projectId, parentId: null },
        include,
        orderBy,
        take,
      });

      const response = NextResponse.json(messages);
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Conversation messages (group DM)
    if (conversationId) {
      await assertConversationMember(user.id, conversationId);

      const messages = await prisma.message.findMany({
        where: { conversationId, parentId: null },
        include,
        orderBy,
        take,
      });

      const response = NextResponse.json(messages);
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Direct messages
    if (receiverId) {
      // Verify users share a workspace (DM authorization)
      await assertCanDirectMessage(user.id, receiverId);

      const messages = await prisma.message.findMany({
        where: {
          AND: [
            { parentId: null },
            {
              OR: [
                { senderId: user.id, receiverId },
                { senderId: receiverId, receiverId: user.id },
              ],
            },
          ],
        },
        include,
        orderBy,
        take,
      });

      const response = NextResponse.json(messages);
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    return NextResponse.json({ error: "Context required" }, { status: 400 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: Request) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimitChat(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Authentication
    const user = await requireUser();
    const senderId = user.id;

    // 3. Validate input
    const body = await req.json();
    const data = messageCreateSchema.parse(body);

    // 4. Spam detection
    if (isSpamContent(data.content)) {
      return NextResponse.json(
        { error: "Message flagged as spam" },
        { status: 400 },
      );
    }

    // 5. Burst spam check (5 messages in 10 seconds)
    const isBurstSpam = await checkBurstSpam(senderId);
    if (isBurstSpam) {
      return NextResponse.json(
        { error: "Too many messages sent too quickly" },
        { status: 429 },
      );
    }

    // 6. Sanitize and validate context
    const sanitized = {
      content: data.content.trim(),
      workspaceId: data.workspaceId?.trim() || null,
      projectId: data.projectId?.trim() || null,
      receiverId: data.receiverId?.trim() || null,
      conversationId: data.conversationId?.trim() || null,
      parentId: data.parentId?.trim() || null,
    };

    if (
      !sanitized.workspaceId &&
      !sanitized.projectId &&
      !sanitized.receiverId &&
      !sanitized.conversationId &&
      !sanitized.parentId
    ) {
      return NextResponse.json({ error: "Context required" }, { status: 400 });
    }

    // 7. Authorization checks
    if (sanitized.parentId) {
      // Thread reply - verify access to parent message's context
      const parentMessage = await prisma.message.findUnique({
        where: { id: sanitized.parentId },
        select: {
          workspaceId: true,
          projectId: true,
          conversationId: true,
          receiverId: true,
          senderId: true,
        },
      });

      if (!parentMessage) {
        return NextResponse.json(
          { error: "Parent message not found" },
          { status: 404 },
        );
      }

      // Verify user has access to parent's context
      if (parentMessage.workspaceId) {
        await assertWorkspaceMember(senderId, parentMessage.workspaceId);
      } else if (parentMessage.projectId) {
        await assertProjectMember(senderId, parentMessage.projectId);
      } else if (parentMessage.conversationId) {
        await assertConversationMember(senderId, parentMessage.conversationId);
      } else if (parentMessage.receiverId) {
        if (
          senderId !== parentMessage.senderId &&
          senderId !== parentMessage.receiverId
        ) {
          return NextResponse.json(
            { error: "Not authorized" },
            { status: 403 },
          );
        }
      }
    } else {
      // New message - verify context access
      if (sanitized.workspaceId) {
        await assertWorkspaceMember(senderId, sanitized.workspaceId);
      }

      if (sanitized.projectId) {
        await assertProjectMember(senderId, sanitized.projectId);
      }

      if (sanitized.conversationId) {
        await assertConversationMember(senderId, sanitized.conversationId);
      }

      if (sanitized.receiverId) {
        await assertCanDirectMessage(senderId, sanitized.receiverId);
      }
    }

    // 8. Create message
    const message = await prisma.message.create({
      data: {
        ...sanitized,
        senderId,
        status: "SENT",
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        reactions: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { replies: true } },
      },
    });

    // 9. Handle @mentions
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions = Array.from(sanitized.content.matchAll(mentionRegex));
    const processedMentions = new Set<string>();

    for (const match of mentions) {
      const mentionedUserId = match[2];
      if (
        mentionedUserId !== senderId &&
        !processedMentions.has(mentionedUserId)
      ) {
        processedMentions.add(mentionedUserId);

        // Non-blocking notification
        (async () => {
          try {
            // We need workspace slug for the link. Let's find it if not provided.
            let workspaceSlug = "";
            if (sanitized.workspaceId) {
              const ws = await prisma.workspace.findUnique({
                where: { id: sanitized.workspaceId },
                select: { slug: true },
              });
              workspaceSlug = ws?.slug || "";
            } else if (sanitized.projectId) {
              const project = await prisma.project.findUnique({
                where: { id: sanitized.projectId },
                include: { workspace: { select: { slug: true } } },
              });
              workspaceSlug = project?.workspace.slug || "";
            }

            await notifyChatMention({
              userId: mentionedUserId,
              mentionerName: message.sender.name || "A user",
              workspaceSlug,
              projectId: sanitized.projectId || undefined,
              receiverId: sanitized.receiverId || undefined,
              conversationId: sanitized.conversationId || undefined,
            });
          } catch (e) {
            console.error(
              "[CHAT_MENTION_NOTIFICATION_FAILED]",
              mentionedUserId,
              e,
            );
          }
        })();
      }
    }

    // 10. Broadcast (non-blocking)
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();

        // Determine channel ID
        const channelId = sanitized.parentId
          ? `thread:${sanitized.parentId}`
          : sanitized.workspaceId
            ? `workspace:${sanitized.workspaceId}`
            : sanitized.projectId
              ? `project:${sanitized.projectId}`
              : sanitized.conversationId
                ? `conversation:${sanitized.conversationId}`
                : sanitized.receiverId
                  ? `dm:${[senderId, sanitized.receiverId].sort().join(":")}`
                  : null;

        if (channelId) {
          const channel = supabase.channel(channelId);
          await channel.subscribe();
          await channel.send({
            type: "broadcast",
            event: "new-message",
            payload: message,
          });
        }

        // If it's a reply, update parent message reply count
        if (sanitized.parentId) {
          const parentMessage = await prisma.message.findUnique({
            where: { id: sanitized.parentId },
            include: {
              sender: { select: { id: true, name: true, image: true } },
              reactions: {
                include: {
                  user: { select: { id: true, name: true, email: true } },
                },
              },
              _count: { select: { replies: true } },
            },
          });

          if (parentMessage) {
            const parentChannelId = parentMessage.workspaceId
              ? `workspace:${parentMessage.workspaceId}`
              : parentMessage.projectId
                ? `project:${parentMessage.projectId}`
                : parentMessage.conversationId
                  ? `conversation:${parentMessage.conversationId}`
                  : parentMessage.receiverId
                    ? `dm:${[parentMessage.senderId, parentMessage.receiverId].sort().join(":")}`
                    : null;

            if (parentChannelId) {
              const parentChannel = supabase.channel(parentChannelId);
              await parentChannel.subscribe();
              await parentChannel.send({
                type: "broadcast",
                event: "message-updated",
                payload: parentMessage,
              });
            }
          }
        }
      } catch (e) {
        console.error("[CHAT_BROADCAST_ERROR]", e);
      }
    })();

    const response = NextResponse.json(message, { status: 201 });
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
