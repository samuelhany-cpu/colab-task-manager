import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const timeEntrySchema = z.object({
  taskId: z.string().min(1),
  startTime: z.string(),
  endTime: z.string(),
  note: z.string().optional(),
  isBillable: z.boolean().default(true),
});

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");
  const projectId = searchParams.get("projectId");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  // Get active timer for user
  const activeTimer = await prisma.timer.findUnique({
    where: { userId },
    include: { task: true },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };

  if (taskId) {
    where.taskId = taskId;
  }

  if (projectId) {
    where.task = {
      projectId: projectId,
    };
  }

  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) {
      where.startTime.gte = new Date(startDate);
    }
    if (endDate) {
      where.startTime.lte = new Date(endDate);
    }
  }

  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      task: {
        include: {
          project: true,
        },
      },
    },
    orderBy: { startTime: "desc" },
  });

  return NextResponse.json({ entries, activeTimer });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = user.id;

  try {
    const body = await req.json();
    const { action, taskId, note } = body;

    if (action === "start") {
      // Check for existing timer
      const existingTimer = await prisma.timer.findUnique({
        where: { userId },
      });

      if (existingTimer) {
        return NextResponse.json(
          { error: "You already have an active timer" },
          { status: 400 },
        );
      }

      const timer = await prisma.timer.create({
        data: {
          userId,
          taskId: taskId as string,
        },
      });

      return NextResponse.json(timer, { status: 201 });
    }

    if (action === "stop") {
      const timer = await prisma.timer.findUnique({
        where: { userId },
      });

      if (!timer) {
        return NextResponse.json(
          { error: "No active timer found" },
          { status: 400 },
        );
      }

      const startTime = timer.startTime;
      const endTime = new Date();
      const duration = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000,
      );

      const [entry] = await prisma.$transaction([
        prisma.timeEntry.create({
          data: {
            userId,
            taskId: timer.taskId,
            startTime,
            endTime,
            duration,
            note: note as string | undefined,
          },
        }),
        prisma.timer.delete({
          where: { userId },
        }),
      ]);

      return NextResponse.json(entry);
    }

    // Manual entry
    const data = timeEntrySchema.parse(body);
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);
    const duration = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000,
    );

    const entry = await prisma.timeEntry.create({
      data: {
        ...data,
        userId,
        startTime,
        endTime,
        duration,
      },
    });

    return NextResponse.json(entry, { status: 201 });
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
