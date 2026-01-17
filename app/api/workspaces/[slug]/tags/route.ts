import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const tagSchema = z.object({
  name: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  try {
    const tags = await prisma.tag.findMany({
      where: { workspace: { slug } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(tags);
  } catch (_error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  try {
    const body = await req.json();
    const { name, color } = tagSchema.parse(body);

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: {
        members: { where: { userId: user.id } },
      },
    });

    if (!workspace || workspace.members.length === 0) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const tag = await prisma.tag.create({
      data: {
        name,
        color,
        workspaceId: workspace.id,
      },
    });

    return NextResponse.json(tag);
  } catch (_error) {
    if (_error instanceof z.ZodError) {
      return NextResponse.json({ error: _error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
