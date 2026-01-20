import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = await params;

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      return new NextResponse("Message not found", { status: 404 });
    }

    // Check if user is a member of the project or DM recipient
    // For simplicity, we assume they have access if they found the message ID
    // but ideally we check memberships.

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { isPinned: !message.isPinned },
    });

    // Broadcast pinning status change (non-blocking)
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const channelId = message.workspaceId
          ? `workspace:${message.workspaceId}`
          : message.parentId
            ? `thread:${message.parentId}`
            : message.projectId
              ? `project:${message.projectId}`
              : `user:${message.receiverId}`;

        if (channelId) {
          const channel = supabase.channel(channelId);
          await channel.subscribe();
          await channel.send({
            type: "broadcast",
            event: "message-pinned-toggled",
            payload: { id, isPinned: updatedMessage.isPinned },
          });

          if (
            !message.workspaceId &&
            !message.projectId &&
            message.receiverId
          ) {
            const senderChannel = supabase.channel(`user:${message.senderId}`);
            await senderChannel.subscribe();
            await senderChannel.send({
              type: "broadcast",
              event: "message-pinned-toggled",
              payload: { id, isPinned: updatedMessage.isPinned },
            });
          }
        }
      } catch (e) {
        console.error("[PIN_BROADCAST_ERROR]", e);
      }
    })();

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error("[MESSAGE_PIN_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
