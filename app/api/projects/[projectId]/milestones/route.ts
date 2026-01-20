import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { handleApiError } from "@/lib/api/error-handler";

const milestoneSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().datetime(),
  completed: z.boolean().optional(),
});

interface MilestoneData {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date;
  completed: boolean;
  projectId: string;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const milestones: MilestoneData[] = await prisma.milestone.findMany({
      where: { projectId },
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json(milestones);
  } catch (error: unknown) {
    return handleApiError(error);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { projectId } = await params;
    const body = await req.json();
    const validatedData = milestoneSchema.parse(body);

    const milestone = await prisma.milestone.create({
      data: {
        ...validatedData,
        projectId,
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
