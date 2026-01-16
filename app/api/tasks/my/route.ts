import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const { searchParams } = new URL(req.url);
  const workspaceSlug = searchParams.get("workspaceSlug");

  try {
    // Get all tasks assigned to the user
    const whereClause: {
      assigneeId: string;
      project?: { workspace: { slug: string } };
    } = {
      assigneeId: userId,
    };

    // If workspace slug is provided, filter by workspace
    if (workspaceSlug) {
      whereClause.project = {
        workspace: {
          slug: workspaceSlug,
        },
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            workspace: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
