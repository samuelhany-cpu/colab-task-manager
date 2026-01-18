import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { messageId, workspaceId, projectId, receiverId } = body;

    if (!messageId) {
      return new NextResponse("Message ID is required", { status: 400 });
    }

    // Determine which unique constraint to use based on context
    let where;
    if (workspaceId) {
      where = { userId_workspaceId: { userId: user.id, workspaceId } };
    } else if (projectId) {
      where = { userId_projectId: { userId: user.id, projectId } };
    } else if (receiverId) {
      where = { userId_receiverId: { userId: user.id, receiverId } };
    } else {
      return new NextResponse(
        "Context required (workspaceId, projectId, or receiverId)",
        { status: 400 },
      );
    }

    // Upsert the read status
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

    // Update message status to READ
    const message = await prisma.message.update({
      where: { id: messageId },
      data: { status: "READ" },
      select: {
        id: true,
        status: true,
        workspaceId: true,
        projectId: true,
        receiverId: true,
        parentId: true,
      },
    });

    // Broadcast read status (non-blocking)
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();

        const channelId = message.parentId
          ? `thread:${message.parentId}`
          : message.workspaceId
            ? `workspace:${message.workspaceId}`
            : message.projectId
              ? `project:${message.projectId}`
              : `user:${message.receiverId}`;

        if (channelId) {
          const channel = supabase.channel(channelId);
          await channel.subscribe();
          await channel.send({
            type: "broadcast",
            event: "message-read",
            payload: {
              id: message.id,
              status: message.status,
              readBy: user.id,
            },
          });
        }
      } catch (e) {
        console.error("[READ_BROADCAST_ERROR]", e);
      }
    })();

    return NextResponse.json(messageRead);
  } catch (error) {
    console.error("[MESSAGE_READ_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
