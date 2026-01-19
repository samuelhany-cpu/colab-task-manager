import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().min(1),
  workspaceId: z.string().optional(),
  projectId: z.string().optional(),
  receiverId: z.string().optional(),
  parentId: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId")?.trim() || null;
    const projectId = searchParams.get("projectId")?.trim() || null;
    const receiverId = searchParams.get("receiverId")?.trim() || null;
    const parentId = searchParams.get("parentId")?.trim() || null;

    if (!workspaceId && !projectId && !receiverId && !parentId) {
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

    if (parentId) {
      const messages = await prisma.message.findMany({
        where: { parentId },
        include,
        orderBy,
      });
      return NextResponse.json(messages);
    }

    if (workspaceId) {
      // Verify user is a member of the workspace
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: user.id,
          },
        },
        select: { id: true }, // Only select ID for existence check
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Not a workspace member" },
          { status: 403 },
        );
      }

      const messages = await prisma.message.findMany({
        where: { workspaceId, parentId: null },
        include,
        orderBy,
        take,
      });
      return NextResponse.json(messages);
    }

    if (projectId) {
      const messages = await prisma.message.findMany({
        where: { projectId, parentId: null },
        include,
        orderBy,
        take,
      });
      return NextResponse.json(messages);
    }

    if (receiverId) {
      const currentUserId = user.id;
      const messages = await prisma.message.findMany({
        where: {
          AND: [
            { parentId: null },
            {
              OR: [
                { senderId: currentUserId, receiverId },
                { senderId: receiverId, receiverId: currentUserId },
              ],
            },
          ],
        },
        include,
        orderBy: { createdAt: "asc" },
        take: 50,
      });
      return NextResponse.json(messages);
    }

    return NextResponse.json({ error: "Context required" }, { status: 400 });
  } catch (error) {
    console.error("[CHAT_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const senderId = user.id;

  try {
    const body = await req.json();
    const data = messageSchema.parse(body);

    // Sanitize relation IDs
    const sanitized = {
      content: data.content,
      workspaceId: data.workspaceId?.trim() || null,
      projectId: data.projectId?.trim() || null,
      receiverId: data.receiverId?.trim() || null,
      parentId: data.parentId?.trim() || null,
    };

    if (
      !sanitized.workspaceId &&
      !sanitized.projectId &&
      !sanitized.receiverId &&
      !sanitized.parentId
    ) {
      return NextResponse.json({ error: "Missing context" }, { status: 400 });
    }

    // Verify workspace membership if workspaceId is provided
    if (sanitized.workspaceId) {
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: sanitized.workspaceId,
            userId: senderId,
          },
        },
      });

      if (!membership) {
        return NextResponse.json(
          { error: "Not a workspace member" },
          { status: 403 },
        );
      }
    }

    const message = await prisma.message.create({
      data: {
        ...sanitized,
        senderId,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
        reactions: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        _count: { select: { replies: true } },
      },
    });

    // Broadcast (Non-blocking)
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();

        // 1. Broadcast new message to the specific channel
        const channelId = sanitized.parentId
          ? `thread:${sanitized.parentId}`
          : sanitized.workspaceId
            ? `workspace:${sanitized.workspaceId}`
            : sanitized.projectId
              ? `project:${sanitized.projectId}`
              : `user:${sanitized.receiverId}`;

        if (channelId) {
          await supabase.channel(channelId).send({
            type: "broadcast",
            event: "new-message",
            payload: message,
          });

          // DM Sync for sender
          if (
            !sanitized.workspaceId &&
            !sanitized.projectId &&
            sanitized.receiverId
          ) {
            await supabase.channel(`user:${senderId}`).send({
              type: "broadcast",
              event: "new-message",
              payload: message,
            });
          }
        }

        // 2. If it's a reply, broadcast update to the parent channel (so reply count updates in main view)
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
            const parentChannelId = sanitized.workspaceId
              ? `workspace:${sanitized.workspaceId}`
              : sanitized.projectId
                ? `project:${sanitized.projectId}`
                : `user:${sanitized.receiverId || parentMessage.receiverId}`; // Fallback if needed

            if (parentChannelId) {
              await supabase.channel(parentChannelId).send({
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

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error("[CHAT_POST_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
