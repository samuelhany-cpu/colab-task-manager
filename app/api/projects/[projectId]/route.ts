import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError } from "@/lib/api/error-handler";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  githubRepo: z.string().optional().nullable(),
  jiraProjectKey: z.string().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        workspace: { select: { slug: true } },
      },
    });

    if (!project)
      return NextResponse.json({ error: "Project not found" }, { status: 404 });

    // Check membership
    const membership = await prisma.projectMember.findFirst({
      where: { projectId, userId: user.id },
    });

    if (!membership)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    return NextResponse.json(project);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const user = await getCurrentUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const data = updateSchema.parse(body);

    // Check if user is OWNER of the project (or at least a member with rights)
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: user.id,
        role: "OWNER",
      },
    });

    if (!membership)
      return NextResponse.json(
        { error: "Forbidden. Project owner only." },
        { status: 403 },
      );

    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data,
    });

    // Audit Log
    const { logAction } = await import("@/lib/audit-logger");
    await logAction({
      userId: user.id,
      action: "PROJECT_UPDATED",
      resourceId: projectId,
      resourceType: "PROJECT",
      metadata: { updates: data },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    return handleApiError(error);
  }
}
