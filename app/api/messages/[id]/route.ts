import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { content } = body;

        if (!content) {
            return new NextResponse("Content is required", { status: 400 });
        }

        const message = await prisma.message.findUnique({
            where: { id },
        });

        if (!message) {
            return new NextResponse("Message not found", { status: 404 });
        }

        if (message.senderId !== user.id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        const updatedMessage = await prisma.message.update({
            where: { id },
            data: { content },
        });

        // Broadcast update
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const channelId = message.parentId ? `thread:${message.parentId}` : message.projectId ? `project:${message.projectId}` : `user:${message.receiverId}`;

        if (channelId) {
            await supabase.channel(channelId).send({
                type: "broadcast",
                event: "message-updated",
                payload: updatedMessage,
            });

            if (!message.projectId && message.receiverId) {
                // Also send to sender's own channel for DMs
                await supabase.channel(`user:${message.senderId}`).send({
                    type: "broadcast",
                    event: "message-updated",
                    payload: updatedMessage,
                });
            }
        }

        return NextResponse.json(updatedMessage);
    } catch (error) {
        console.error("[MESSAGE_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
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

        if (message.senderId !== user.id) {
            return new NextResponse("Forbidden", { status: 403 });
        }

        await prisma.message.delete({
            where: { id },
        });

        // Broadcast deletion
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const channelId = message.parentId ? `thread:${message.parentId}` : message.projectId ? `project:${message.projectId}` : `user:${message.receiverId}`;

        if (channelId) {
            await supabase.channel(channelId).send({
                type: "broadcast",
                event: "message-deleted",
                payload: { id },
            });

            if (!message.projectId && message.receiverId) {
                // Also send to sender's own channel for DMs
                await supabase.channel(`user:${message.senderId}`).send({
                    type: "broadcast",
                    event: "message-deleted",
                    payload: { id },
                });
            }
        }

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[MESSAGE_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
