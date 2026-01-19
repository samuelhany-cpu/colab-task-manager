import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.trim();
    const workspaceId = searchParams.get("workspaceId")?.trim();
    const projectId = searchParams.get("projectId")?.trim();
    const receiverId = searchParams.get("receiverId")?.trim();

    if (!query) {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    // Context filter construction
    const whereClause: Prisma.MessageWhereInput = {
      content: {
        contains: query,
        mode: "insensitive",
      },
    };

    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    } else if (projectId) {
      whereClause.projectId = projectId;
    } else if (receiverId) {
      const currentUserId = user.id;
      whereClause.OR = [
        { senderId: currentUserId, receiverId },
        { senderId: receiverId, receiverId: currentUserId },
      ];
    } else {
      return NextResponse.json(
        { error: "Context required (workspaceId, projectId, or receiverId)" },
        { status: 400 },
      );
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: { id: true, name: true, image: true },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: {
          select: { replies: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("[SEARCH_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
