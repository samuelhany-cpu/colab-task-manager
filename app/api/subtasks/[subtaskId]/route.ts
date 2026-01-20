import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { handleApiError } from "@/lib/api/error-handler";

const updateSubtaskSchema = z.object({
  title: z.string().min(1).optional(),
  completed: z.boolean().optional(),
  position: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ subtaskId: string }> },
) {
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { subtaskId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const data = updateSubtaskSchema.parse(body);

    const subtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data,
    });

    return NextResponse.json(subtask);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ subtaskId: string }> },
) {
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const { subtaskId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await prisma.subtask.delete({
      where: { id: subtaskId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
