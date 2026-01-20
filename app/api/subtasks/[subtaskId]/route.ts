import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

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
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error("[SUBTASK_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ subtaskId: string }> },
) {
  try {
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
    console.error("[SUBTASK_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
