import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { handleApiError } from "@/lib/api/error-handler";

const subtaskSchema = z.object({
  title: z.string().min(1),
  position: z.number().optional(),
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

    const subtasks = await prisma.subtask.findMany({
      where: { taskId },
      orderBy: { position: "asc" },
    });

    return NextResponse.json(subtasks);
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
    const { title, position } = subtaskSchema.parse(body);

    const subtask = await prisma.subtask.create({
      data: {
        title,
        position: position ?? 1000,
        taskId,
      },
    });

    return NextResponse.json(subtask);
  } catch (error) {
    return handleApiError(error);
  }
}
