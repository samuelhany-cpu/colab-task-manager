import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: Request, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: workspaceId } = await params;

    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        role: "asc",
      },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("[WORKSPACE_MEMBERS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
