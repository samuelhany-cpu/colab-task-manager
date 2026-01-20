import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { handleApiError } from "@/lib/api/error-handler";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ subtaskId: string }> },
) {
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { subtaskId } = await params;

    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: {
        task: true,
      },
    });

    if (!subtask) {
      return new NextResponse("Subtask not found", { status: 404 });
    }

    const newTask = await prisma.task.create({
      data: {
        title: subtask.title,
        description: `Promoted from subtask of "${subtask.task.title}"`,
        status: subtask.completed ? "DONE" : "TODO",
        priority: "MEDIUM",
        projectId: subtask.task.projectId,
        creatorId: user.id,
        assigneeId: user.id,
      },
    });

    await prisma.subtask.delete({
      where: { id: subtaskId },
    });

    return NextResponse.json(newTask);
  } catch (error) {
    return handleApiError(error);
  }
}
