import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, getDownloadUrl } from "@/lib/storage";

interface FileVersionWithUploader {
  id: string;
  fileId: string;
  key: string;
  originalName: string;
  mimeType: string;
  size: number;
  versionNumber: number;
  uploadedById: string;
  createdAt: Date;
  uploadedBy: { name: string | null };
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const versions = await (prisma as any).fileVersion.findMany({
      where: { fileId },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { versionNumber: "desc" },
    });

    const versionsWithUrls = await Promise.all(
      (versions as unknown as FileVersionWithUploader[]).map(async (v) => ({
        ...v,
        url: await getDownloadUrl(v.key),
      })),
    );

    return NextResponse.json(versionsWithUrls);
  } catch (error) {
    console.error("Fetch versions error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { fileId } = await params;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    // 1. Get current file
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentFile = await (prisma as any).file.findUnique({
      where: { id: fileId },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });

    if (!currentFile) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const nextVersionNumber =
      currentFile.versions.length > 0
        ? currentFile.versions[0].versionNumber + 1
        : 1;

    // 2. Archive current version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).fileVersion.create({
      data: {
        fileId: currentFile.id,
        key: currentFile.key,
        originalName: currentFile.originalName,
        mimeType: currentFile.mimeType,
        size: currentFile.size,
        versionNumber: nextVersionNumber,
        uploadedById: currentFile.uploadedById,
        createdAt: currentFile.createdAt,
      },
    });

    // 3. Upload new file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const key = `${Date.now()}-v${nextVersionNumber + 1}-${file.name.replace(/\s+/g, "_")}`;
    await uploadFile(key, buffer, file.type);

    // 4. Update main file record
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        key,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        uploadedById: user.id,
        createdAt: new Date(),
      },
    });

    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error("Versioning error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
