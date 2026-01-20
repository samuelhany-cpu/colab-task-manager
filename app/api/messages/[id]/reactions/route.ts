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

    const { id: messageId } = await params;
    const { emoji } = await req.json();

    if (!emoji) {
      return new NextResponse("Emoji is required", { status: 400 });
    }

    // Toggle reaction
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId: user.id,
          emoji,
        },
      },
    });

    if (existingReaction) {
      await prisma.reaction.delete({
        where: {
          id: existingReaction.id,
        },
      });

      // Broadcast removal (non-blocking)
      (async () => {
        try {
          const { createClient } = await import("@/lib/supabase/server");
          const supabase = await createClient();
          const message = await prisma.message.findUnique({
            where: { id: messageId },
            select: {
              parentId: true,
              workspaceId: true,
              projectId: true,
              receiverId: true,
            },
          });

          const channelId = message?.parentId
            ? `thread:${message.parentId}`
            : message?.workspaceId
              ? `workspace:${message.workspaceId}`
              : message?.projectId
                ? `project:${message.projectId}`
                : `user:${message?.receiverId}`;

          if (channelId) {
            const channel = supabase.channel(channelId);
            await channel.subscribe();
            await channel.send({
              type: "broadcast",
              event: "reaction-removed",
              payload: { messageId, userId: user.id, emoji },
            });
          }
        } catch (e) {
          console.error("[REACTION_REMOVE_BROADCAST]", e);
        }
      })();

      return NextResponse.json({ action: "removed" });
    } else {
      const reaction = await prisma.reaction.create({
        data: {
          messageId,
          userId: user.id,
          emoji,
        },
        include: {
          user: { select: { id: true, email: true } },
        },
      });

      // Broadcast addition (non-blocking)
      (async () => {
        try {
          const { createClient } = await import("@/lib/supabase/server");
          const supabase = await createClient();
          const message = await prisma.message.findUnique({
            where: { id: messageId },
            select: {
              parentId: true,
              workspaceId: true,
              projectId: true,
              receiverId: true,
            },
          });

          const channelId = message?.parentId
            ? `thread:${message.parentId}`
            : message?.workspaceId
              ? `workspace:${message.workspaceId}`
              : message?.projectId
                ? `project:${message.projectId}`
                : `user:${message?.receiverId}`;

          if (channelId) {
            const channel = supabase.channel(channelId);
            await channel.subscribe();
            await channel.send({
              type: "broadcast",
              event: "reaction-added",
              payload: { messageId, reaction },
            });
          }
        } catch (e) {
          console.error("[REACTION_ADD_BROADCAST]", e);
        }
      })();

      return NextResponse.json(reaction);
    }
  } catch (error) {
    console.error("[REACTION_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
