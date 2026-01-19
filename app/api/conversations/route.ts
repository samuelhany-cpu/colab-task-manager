import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createConversationSchema = z.object({
  workspaceId: z.string().min(1),
  userIds: z.array(z.string().min(1)).min(1),
  name: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId)
      return NextResponse.json(
        { error: "Workspace ID required" },
        { status: 400 },
      );

    const conversations = await prisma.conversation.findMany({
      where: {
        workspaceId,
        members: {
          some: {
            userId: user.id,
          },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, image: true, email: true },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error("[CONVERSATION_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, userIds, name } = createConversationSchema.parse(body);

    // Verify workspace membership
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "Not a workspace member" },
        { status: 403 },
      );
    }

    // Create conversation and add members (creator + selected users)
    const allMemberIds = Array.from(new Set([user.id, ...userIds]));

    const conversation = await prisma.conversation.create({
      data: {
        workspaceId,
        name,
        isGroup: true,
        members: {
          create: allMemberIds.map((id) => ({
            userId: id,
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("[CONVERSATION_CREATE_ERROR]", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
