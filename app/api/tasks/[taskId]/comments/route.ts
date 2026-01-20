import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyCommentMention } from "@/lib/notifications";
import { z } from "zod";
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { handleApiError } from "@/lib/api/error-handler";

const commentSchema = z.object({
  content: z.string().min(1),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { taskId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { taskId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { content } = commentSchema.parse(body);

    const comment = await prisma.comment.create({
      data: {
        content,
        taskId,
        authorId: user.id,
      },
      include: {
        author: {
          select: { id: true, name: true },
        },
        task: {
          include: {
            project: {
              include: {
                workspace: true,
              },
            },
          },
        },
      },
    });

    // Handle @mentions
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions = Array.from(content.matchAll(mentionRegex));
    const processedMentions = new Set<string>();

    for (const match of mentions) {
      const userId = match[2];
      if (userId !== user.id && !processedMentions.has(userId)) {
        processedMentions.add(userId);
        try {
          await notifyCommentMention(
            userId,
            comment.author.name || "A user",
            comment.task.title,
            taskId,
            comment.task.projectId,
            comment.task.project.workspace.slug,
          );
        } catch (e) {
          console.error("Failed to notify mentioned user:", userId, e);
        }
      }
    }

    await prisma.activity.create({
      data: {
        type: "COMMENT_ADDED",
        taskId,
        userId: user.id,
        metadata: {
          commentId: comment.id,
          taskTitle: comment.task.title,
        },
      },
    });

    return NextResponse.json(comment);
  } catch (error) {
    return handleApiError(error);
  }
}
