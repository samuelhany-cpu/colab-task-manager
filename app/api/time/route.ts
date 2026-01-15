import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const timeEntrySchema = z.object({
  taskId: z.string().min(1),
  startTime: z.string(),
  endTime: z.string(),
  note: z.string().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get("taskId");

  // Get active timer for user
  const activeTimer = await prisma.timer.findUnique({
    where: { userId },
    include: { task: true },
  });

  if (taskId) {
    const entries = await prisma.timeEntry.findMany({
      where: { taskId, userId },
      orderBy: { startTime: "desc" },
    });
    return NextResponse.json({ entries, activeTimer });
  }

  const entries = await prisma.timeEntry.findMany({
    where: { userId },
    include: {
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
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as { id: string }).id;

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
