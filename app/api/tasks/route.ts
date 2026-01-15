import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
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
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
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
      userId: (session.user as { id: string }).id,
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
      _count: {
        select: { comments: true },
      },
    },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(tasks);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = taskSchema.parse(body);

    // Check project membership
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: data.projectId,
        userId: (session.user as { id: string }).id,
      },
    });

    if (!membership) {
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
        creatorId: (session.user as { id: string }).id,
        position,
      },
      include: {
        project: {
          include: {
            workspace: {
              select: { slug: true },
            },
          },
        },
      },
    });

    // Create activity
    await prisma.activity.create({
      data: {
        type: "CREATED",
        taskId: task.id,
        userId: (session.user as { id: string }).id,
      },
    });

    // Send notification if task has assignee
    if (data.assigneeId && data.assigneeId !== (session.user as { id: string }).id) {
      try {
        await notifyTaskAssigned(
          data.assigneeId,
          task.title,
          task.id,
          task.projectId,
          task.project.workspace.slug
        );
      } catch (notificationError) {
        console.error("Failed to send notification:", notificationError);
        // Don't fail the task creation if notification fails
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
  const session = await getServerSession(authOptions);
  if (!session)
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
      include: { project: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check project membership
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: task.projectId,
        userId: (session.user as { id: string }).id,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle position update specifically
    if (body.position !== undefined || body.status !== undefined) {
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
            userId: (session.user as { id: string }).id,
            metadata: { from: task.status, to: body.status },
          },
        });
      }

      return NextResponse.json(updatedTask);
    }

    const updateData = taskSchema.partial().parse(body);
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
      },
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
