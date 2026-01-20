import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ subtaskId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { subtaskId } = await params;

    // 1. Fetch the subtask to get its details and parent task's project
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: {
        task: true, // Need task to get projectId
      },
    });

    if (!subtask) {
      return new NextResponse("Subtask not found", { status: 404 });
    }

    // 2. Create the new task
    // We'll map the subtask status to a TaskStatus
    // If subtask is completed -> DONE, else -> TODO
    const newTask = await prisma.task.create({
      data: {
        title: subtask.title,
        description: `Promoted from subtask of "${subtask.task.title}"`,
        status: subtask.completed ? "DONE" : "TODO",
        priority: "MEDIUM", // Default priority
        projectId: subtask.task.projectId,
        creatorId: user.id,
        assigneeId: user.id, // Assign to current user by default or keep null? Let's assign to promoter.
      },
    });

    // 3. Delete the original subtask
    await prisma.subtask.delete({
      where: { id: subtaskId },
    });

    return NextResponse.json(newTask);
  } catch (error) {
    console.error("[SUBTASK_PROMOTE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
