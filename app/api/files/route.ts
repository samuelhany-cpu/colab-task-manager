import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  if (projectId) {
    const files = await prisma.file.findMany({
      where: { projectId },
      include: { uploadedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Add absolute public path for client to use (Next.js public folder)
    const filesWithUrls = files.map((file: { key: string }) => ({
      ...file,
      url: `/uploads/${file.key}`,
    }));

    return NextResponse.json(filesWithUrls);
  }

  return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;

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

    const uploadDir = join(process.cwd(), "public", "uploads");

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const path = join(uploadDir, key);
    await writeFile(path, buffer);

    const fileRecord = await prisma.file.create({
      data: {
        originalName: fileName,
        key, // Serving as the unique identifier/filename
        mimeType: file.type,
        size: file.size,
        projectId,
        uploadedById: (session.user as { id: string }).id,
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
