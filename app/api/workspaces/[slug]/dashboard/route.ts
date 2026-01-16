import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
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
          select: { id: true },
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

    // Fetch stats
    const projectIds = workspace.projects.map((p) => p.id);

    const taskCount = await prisma.task.count({
      where: {
        projectId: { in: projectIds },
      },
    });

    const timeEntries = await prisma.timeEntry.findMany({
      where: {
        task: {
          projectId: { in: projectIds },
        },
      },
      select: {
        duration: true,
      },
    });

    const totalHours = timeEntries.reduce(
      (acc, curr) => acc + curr.duration / 3600,
      0,
    );

    // Fetch recent activity
    const activities = await prisma.activity.findMany({
      where: {
        task: {
          projectId: { in: projectIds },
        },
      },
      include: {
        user: {
          select: { name: true, image: true },
        },
        task: {
          select: {
            title: true,
            project: {
              select: { name: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    return NextResponse.json({
      stats: {
        projects: workspace.projects.length,
        tasks: taskCount,
        members: workspace.members.length,
        hours: Math.round(totalHours * 10) / 10,
      },
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
    console.error("Dashboard data error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
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
