import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { uploadFile, getDownloadUrl } from "@/lib/storage";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const folderId = searchParams.get("folderId");

  if (projectId) {
    const where: any = { projectId };
    if (folderId) {
      where.folderId = folderId === "root" ? null : folderId;
    }

    const files = await prisma.file.findMany({
      where,
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Generate signed URLs for each file
    const filesWithUrls = await Promise.all(
      files.map(async (file) => ({
        ...file,
        url: await getDownloadUrl(file.key),
      })),
    );

    return NextResponse.json(filesWithUrls);
  }

  return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;
    const folderId = formData.get("folderId") as string | null;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: "File and projectId are required" },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Sanitize name and create unique key
    const fileName = file.name;
    const key = `${Date.now()}-${fileName.replace(/\s+/g, "_")}`;

    // 1. Upload to Supabase Storage
    await uploadFile(key, buffer, file.type);

    // 2. Create database record
    const fileRecord = await prisma.file.create({
      data: {
        originalName: fileName,
        key,
        mimeType: file.type,
        size: file.size,
        projectId,
        folderId: folderId || null,
        uploadedById: user.id,
      },
    });

    return NextResponse.json(fileRecord, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
