import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ fileId: string; versionId: string }> }
) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { fileId, versionId } = await params;

    try {
        // 1. Get version to restore
        const versionToRestore = await prisma.fileVersion.findUnique({
            where: { id: versionId },
        });

        if (!versionToRestore || versionToRestore.fileId !== fileId) {
            return NextResponse.json({ error: "Version not found" }, { status: 404 });
        }

        // 2. Get current file state
        const currentFile = await prisma.file.findUnique({
            where: { id: fileId },
            include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } }
        });

        if (!currentFile) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const nextVersionNumber = currentFile.versions.length > 0
            ? currentFile.versions[0].versionNumber + 1
            : 1;

        // 3. Archive current state as a new version
        await prisma.fileVersion.create({
            data: {
                fileId: currentFile.id,
                key: currentFile.key,
                originalName: currentFile.originalName,
                mimeType: currentFile.mimeType,
                size: currentFile.size,
                versionNumber: nextVersionNumber,
                uploadedById: currentFile.uploadedById,
                createdAt: currentFile.createdAt,
            }
        });

        // 4. Update file with the restored version data
        const updatedFile = await prisma.file.update({
            where: { id: fileId },
            data: {
                key: versionToRestore.key,
                originalName: versionToRestore.originalName,
                mimeType: versionToRestore.mimeType,
                size: versionToRestore.size,
                uploadedById: user.id,
                createdAt: new Date(),
            }
        });

        // 5. Delete the historical version record that was restored (optional, but clean since it's now current)
        // Actually, keeping it as a "point in time" is fine too. 
        // Usually, restoring means "create a new version that is a copy of an old one".
        // My logic above already does that: current becomes next, and file becomes copy of restored.

        return NextResponse.json(updatedFile);
    } catch (error) {
        console.error("Restore version error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
