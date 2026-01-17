import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { notifyTaskAssigned } from "@/lib/notifications";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).default("TODO"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueDate: z.string().optional().nullable(),
  projectId: z.string().min(1, "Project ID is required"),
  assigneeId: z.string().optional().nullable(),
  tagIds: z.array(z.string()).optional(),
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  // Check project membership
  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: user.id,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      assignee: {
        select: { id: true, name: true, email: true, image: true },
      },
      tags: {
        select: { id: true, name: true, color: true },
      },
      subtasks: true,
      _count: {
        select: {
          comments: true,
          subtasks: true,
        },
      },
    },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { tagIds, ...data } = taskSchema.parse(body);

    // Check project membership and get workspace slug
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      include: {
        members: { where: { userId: user.id } },
        workspace: { select: { slug: true } },
      },
    });

    if (!project || project.members.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get max position for the status
    const lastTask = await prisma.task.findFirst({
      where: { projectId: data.projectId, status: data.status },
      orderBy: { position: "desc" },
    });

    const position = lastTask ? lastTask.position + 1000 : 1000;

    const task = await prisma.task.create({
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        creatorId: user.id,
        position,
        tags: tagIds
          ? {
            connect: tagIds.map((id) => ({ id })),
          }
          : undefined,
      },
      include: {
        tags: true,
        subtasks: true,
        _count: {
          select: { subtasks: true, comments: true }
        }
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: "CREATED",
        taskId: task.id,
        userId: user.id,
      },
    });

    // Broadcast via Supabase Realtime
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.channel(`project:${data.projectId}`).send({
      type: "broadcast",
      event: "task-updated",
      payload: { projectId: data.projectId, taskId: task.id, type: "CREATED" },
    });

    // Send notification if task has assignee
    if (data.assigneeId && data.assigneeId !== user.id) {
      try {
        await notifyTaskAssigned(
          data.assigneeId,
          task.title,
          task.id,
          task.projectId,
          project.workspace.slug,
        );
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  if (!taskId) {
    return NextResponse.json({ error: "Task ID is required" }, { status: 400 });
  }

  try {
    const body = await req.json();
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { project: true, tags: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check project membership
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: task.projectId,
        userId: user.id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle position/status update Specifically (e.g. drag & drop)
    if (
      (body.position !== undefined || body.status !== undefined) &&
      body.tagIds === undefined
    ) {
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: body.status ?? task.status,
          position: body.position ?? task.position,
        },
      });

      if (body.status && body.status !== task.status) {
        await prisma.activity.create({
          data: {
            type: "STATUS_CHANGE",
            taskId,
            userId: user.id,
            metadata: { from: task.status, to: body.status },
          },
        });
      }

      // Broadcast via Supabase Realtime
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      await supabase.channel(`project:${task.projectId}`).send({
        type: "broadcast",
        event: "task-updated",
        payload: { projectId: task.projectId, taskId, type: "UPDATED" },
      });

      return NextResponse.json(updatedTask);
    }

    const { tagIds, ...updateData } = taskSchema.partial().parse(body);

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...updateData,
        dueDate:
          updateData.dueDate === null
            ? null
            : updateData.dueDate
              ? new Date(updateData.dueDate)
              : undefined,
        tags: tagIds
          ? {
            set: tagIds.map((id) => ({ id })),
          }
          : undefined,
      },
      include: {
        tags: true,
        subtasks: true,
        assignee: {
          select: { id: true, name: true, email: true, image: true },
        },
        _count: {
          select: { subtasks: true, comments: true }
        }
      },
    });

    // Broadcast via Supabase Realtime
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    await supabase.channel(`project:${task.projectId}`).send({
      type: "broadcast",
      event: "task-updated",
      payload: { projectId: task.projectId, taskId, type: "UPDATED" },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
