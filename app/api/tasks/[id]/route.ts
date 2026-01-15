import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { notifyTaskAssigned } from "@/lib/notifications";

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
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  try {
    const body = await req.json();
    const data = updateTaskSchema.parse(body);

    // Check if task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check project membership
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: task.projectId,
        userId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // If status is changing, update position to end of new column
    const updateData: Prisma.TaskUpdateInput = { ...data } as Prisma.TaskUpdateInput;
    if (data.status && data.status !== task.status) {
      const lastTask = await prisma.task.findFirst({
        where: { projectId: task.projectId, status: data.status },
        orderBy: { position: "desc" },
      });
      updateData.position = lastTask ? lastTask.position + 1000 : 1000;

      // Create activity for status change
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

    // Handle dueDate conversion
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    // Check if assignee changed
    const assigneeChanged = data.assigneeId !== undefined && data.assigneeId !== task.assigneeId;
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

    // Send notification if assignee changed
    if (assigneeChanged && data.assigneeId && data.assigneeId !== oldAssigneeId) {
      try {
        await notifyTaskAssigned(
          data.assigneeId,
          updatedTask.title,
          updatedTask.id,
          updatedTask.projectId,
          updatedTask.project.workspace.slug
        );
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
        // Don't fail the task update if notification fails
      }
    }

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  try {
    // Check if task exists and user has access
    const task = await prisma.task.findUnique({
      where: { id },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check project membership
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
