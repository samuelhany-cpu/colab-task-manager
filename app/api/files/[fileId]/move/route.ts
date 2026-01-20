import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { fileId } = await params;
    const body = await req.json();
    const { folderId } = body; // folderId can be null for root

    const file = await prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      return new NextResponse("File not found", { status: 404 });
    }

    // If folderId is provided, verify it belongs to the same project
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
      });

      if (!folder || folder.projectId !== file.projectId) {
        return new NextResponse("Invalid destination folder", { status: 400 });
      }
    }

    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        folderId: folderId || null,
      },
    });

    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error("[FILE_MOVE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
