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
    const { messageId } = body;

    if (!messageId) {
      return new NextResponse("Message ID is required", { status: 400 });
    }

    // Update message status to DELIVERED
    const message = await prisma.message.update({
      where: { id: messageId },
      data: {
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        deliveredAt: true,
        workspaceId: true,
        projectId: true,
        receiverId: true,
        senderId: true,
        parentId: true,
      },
    });

    // Broadcast delivery status to sender (non-blocking)
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
            event: "message-delivered",
            payload: {
              id: message.id,
              status: message.status,
              deliveredAt: message.deliveredAt,
            },
          });
        }
      } catch (e) {
        console.error("[DELIVERED_BROADCAST_ERROR]", e);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[MESSAGE_DELIVERED_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
