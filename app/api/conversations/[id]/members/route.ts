import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addMemberSchema = z.object({
  userId: z.string().min(1),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await params;
    const body = await req.json();
    const { userId } = addMemberSchema.parse(body);

    // Verify requesting user is in the conversation and workspace
    // (Optimization: Just check conversation membership, which implies workspace)
    const requesterMembership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
      include: {
        conversation: true,
      },
    });

    if (!requesterMembership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    // Verify target user is in the workspace
    const workspaceId = requesterMembership.conversation.workspaceId;
    const targetWorkspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!targetWorkspaceMember) {
      return NextResponse.json(
        { error: "User not in workspace" },
        { status: 400 },
      );
    }

    const member = await prisma.conversationMember.create({
      data: {
        conversationId,
        userId,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error("[CONVERSATION_MEMBER_ADD_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: conversationId } = await params;

    // Parse userId from query/body? Usually DELETE body is unusual but used here or dynamic route.
    // Let's use searchParams for DELETE member usually, or specific route /members/[userId].
    // Plan said: DELETE /api/conversations/:id/members/:userId
    // But Next.js App Router for that path structure needs a separate file: /members/[userId]/route.ts
    // OR we just use DELETE on /members with body?
    // Let's stick to using body for simplicity here or query param. Body is supported by many but discouraged.
    // Let's check if I can assume /members/route.ts handles DELETE?
    // The plan specifically said: DELETE /api/conversations/:id/members/:userId
    // So I should probably create app/api/conversations/[id]/members/[userId]/route.ts?
    // Or handle it here with query param ?userId=...
    // Let's use query param for simplicity in this file for now OR body.

    const { searchParams } = new URL(req.url);
    const userIdToRemove = searchParams.get("userId");

    if (!userIdToRemove) {
      return NextResponse.json({ error: "UserId required" }, { status: 400 });
    }

    // Check permissions: Are you removing yourself? Or are you a member?
    // For Group DMs, usually anyone can leave. Removing others might be restricted to creator?
    // Let's allow leaving (self) or removing others if you are a member (egalitarian for now).

    const requesterMembership = await prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
    });

    if (!requesterMembership) {
      return NextResponse.json({ error: "Not a member" }, { status: 403 });
    }

    await prisma.conversationMember.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: userIdToRemove,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CONVERSATION_MEMBER_REMOVE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
