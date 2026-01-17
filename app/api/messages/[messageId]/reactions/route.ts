import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ messageId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { messageId } = await params;
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

            // Broadcast removal
            const { createClient } = await import("@/lib/supabase/server");
            const supabase = await createClient();
            const message = await prisma.message.findUnique({ where: { id: messageId } });
            const channelId = message?.parentId ? `thread:${message.parentId}` : message?.projectId ? `project:${message.projectId}` : `user:${message?.receiverId}`;

            await supabase.channel(channelId).send({
                type: "broadcast",
                event: "reaction-removed",
                payload: { messageId, userId: user.id, emoji },
            });

            return NextResponse.json({ action: "removed" });
        } else {
            const reaction = await prisma.reaction.create({
                data: {
                    messageId,
                    userId: user.id,
                    emoji,
                },
                include: {
                    user: { select: { id: true, name: true } }
                }
            });

            // Broadcast addition
            const { createClient } = await import("@/lib/supabase/server");
            const supabase = await createClient();
            const message = await prisma.message.findUnique({ where: { id: messageId } });
            const channelId = message?.parentId ? `thread:${message.parentId}` : message?.projectId ? `project:${message.projectId}` : `user:${message?.receiverId}`;

            await supabase.channel(channelId).send({
                type: "broadcast",
                event: "reaction-added",
                payload: { messageId, reaction },
            });

            return NextResponse.json(reaction);
        }
    } catch (error) {
        console.error("[REACTION_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
