import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { notifyTaskAssigned } from "@/lib/notifications";
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { handleApiError } from "@/lib/api/error-handler";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  dueDate: z.string().optional().nullable(),
  assigneeId: z.string().optional().nullable(),
  position: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = await params;
    const id = taskId;
    const userId = user.id;

    const body = await req.json();
    const data = updateTaskSchema.parse(body);

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: task.projectId,
        userId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Prisma.TaskUpdateInput = {
      ...data,
    } as Prisma.TaskUpdateInput;
    if (data.status && data.status !== task.status) {
      const lastTask = await prisma.task.findFirst({
        where: { projectId: task.projectId, status: data.status },
        orderBy: { position: "desc" },
      });
      updateData.position = lastTask ? lastTask.position + 1000 : 1000;

      await prisma.activity.create({
        data: {
          type: "STATUS_CHANGE",
          taskId: id,
          userId,
          metadata: {
            from: task.status,
            to: data.status,
          },
        },
      });
    }

    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    const assigneeChanged =
      data.assigneeId !== undefined && data.assigneeId !== task.assigneeId;
    const oldAssigneeId = task.assigneeId;

    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        project: {
          include: {
            workspace: {
              select: { slug: true },
            },
          },
        },
        _count: {
          select: { comments: true },
        },
      },
    });

    // Broadcast via Supabase Realtime
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.channel(`project:${updatedTask.projectId}`).send({
      type: "broadcast",
      event: "task-updated",
      payload: {
        projectId: updatedTask.projectId,
        taskId: id,
        type: "UPDATED",
      },
    });

    if (
      assigneeChanged &&
      data.assigneeId &&
      data.assigneeId !== oldAssigneeId
    ) {
      try {
        await notifyTaskAssigned(
          data.assigneeId,
          updatedTask.title,
          updatedTask.id,
          updatedTask.projectId,
          updatedTask.project.workspace.slug,
        );
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
      }
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { taskId } = await params;
    const id = taskId;
    const userId = user.id;

    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: task.projectId,
        userId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.task.delete({
      where: { id },
    });

    // Broadcast via Supabase Realtime
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.channel(`project:${task.projectId}`).send({
      type: "broadcast",
      event: "task-updated",
      payload: { projectId: task.projectId, taskId: id, type: "DELETED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
