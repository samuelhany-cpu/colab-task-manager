import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays } from "date-fns";
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { handleApiError } from "@/lib/api/error-handler";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;

    try {
      const workspace = await prisma.workspace.findUnique({
        where: { slug },
        include: {
          projects: {
            select: { id: true, name: true },
          },
          members: {
            select: { id: true },
          },
        },
      });

      if (!workspace) {
        return NextResponse.json(
          { error: "Workspace not found" },
          { status: 404 },
        );
      }

      // Check membership
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: workspace.id,
          userId: user.id,
        },
      });

      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const projectIds = workspace.projects.map((p) => p.id);
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const sevenDaysLater = endOfDay(addDays(now, 7));

      // Parallelize queries for efficiency
      const [
        taskCount,
        timeEntries,
        activities,
        todaysTasks,
        overdueTasks,
        upcomingTasks,
        activeTimer,
        statusCounts,
      ] = await Promise.all([
        prisma.task.count({ where: { projectId: { in: projectIds } } }),
        prisma.timeEntry.findMany({
          where: { task: { projectId: { in: projectIds } } },
          select: { duration: true },
        }),
        prisma.activity.findMany({
          where: { task: { projectId: { in: projectIds } } },
          include: {
            user: { select: { name: true, image: true } },
            task: {
              select: {
                title: true,
                project: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        }),
        prisma.task.findMany({
          where: {
            projectId: { in: projectIds },
            assigneeId: user.id,
            dueDate: { gte: todayStart, lte: todayEnd },
            status: { not: "DONE" },
          },
          select: { id: true, title: true, status: true, priority: true },
          take: 5,
        }),
        prisma.task.findMany({
          where: {
            projectId: { in: projectIds },
            assigneeId: user.id,
            dueDate: { lt: todayStart },
            status: { not: "DONE" },
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
          take: 5,
        }),
        prisma.task.findMany({
          where: {
            projectId: { in: projectIds },
            assigneeId: user.id,
            dueDate: { gt: todayEnd, lte: sevenDaysLater },
            status: { not: "DONE" },
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
          },
          take: 5,
        }),
        prisma.timer.findUnique({
          where: { userId: user.id },
          include: { task: { select: { title: true } } },
        }),
        prisma.task.groupBy({
          by: ["status"],
          where: { projectId: { in: projectIds } },
          _count: { _all: true },
        }),
      ]);

      const totalHours = timeEntries.reduce(
        (acc, curr) => acc + curr.duration / 3600,
        0,
      );

      const taskStatusStats = {
        TODO: statusCounts.find((s) => s.status === "TODO")?._count._all || 0,
        IN_PROGRESS:
          statusCounts.find((s) => s.status === "IN_PROGRESS")?._count._all ||
          0,
        DONE: statusCounts.find((s) => s.status === "DONE")?._count._all || 0,
      };

      return NextResponse.json({
        stats: {
          projects: workspace.projects.length,
          tasks: taskCount,
          members: workspace.members.length,
          hours: Math.round(totalHours * 10) / 10,
        },
        todaysTasks,
        overdueTasks,
        upcomingTasks,
        activeTimer: activeTimer
          ? {
              ...activeTimer,
              duration: Math.floor(
                (now.getTime() - activeTimer.startTime.getTime()) / 1000,
              ),
            }
          : null,
        taskStatusStats,
        recentActivity: activities.map((a) => ({
          id: a.id,
          user: a.user.name || "Unknown",
          action:
            a.type === "CREATED"
              ? "created task"
              : a.type === "STATUS_CHANGE"
                ? "updated status of"
                : a.type === "COMMENT_ADDED"
                  ? "commented on"
                  : "modified",
          target: a.task.title,
          project: a.task.project.name,
          time: formatTimeAgo(a.createdAt),
          color: getRandomColor(a.task.project.name),
        })),
      });
    } catch (error) {
      return handleApiError(error);
    }
  } catch (error) {
    return handleApiError(error);
  }
}

function formatTimeAgo(date: Date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 172800) return "yesterday";
  return `${Math.floor(diffInSeconds / 86400)} days ago`;
}

function getRandomColor(seed: string) {
  const colors = ["#8b5cf6", "#10b981", "#3b82f6", "#f59e0b", "#94a3b8"];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}
