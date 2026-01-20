import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const folderSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().optional().nullable(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const folders = await prisma.folder.findMany({
      where: { projectId },
      include: {
        files: true,
        children: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(folders);
  } catch (error) {
    console.error("[FOLDERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const { name, parentId } = folderSchema.parse(body);

    const folder = await prisma.folder.create({
      data: {
        name,
        projectId,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(folder);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    }
    console.error("[FOLDERS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
