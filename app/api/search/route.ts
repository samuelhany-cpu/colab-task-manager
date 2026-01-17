import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q");
        const workspaceSlug = searchParams.get("workspaceSlug");

        if (!query || query.length < 2) {
            return NextResponse.json([]);
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Determine current workspace ID if slug is provided
        let workspaceId: string | undefined;
        if (workspaceSlug) {
            const workspace = await prisma.workspace.findUnique({
                where: { slug: workspaceSlug },
            });
            workspaceId = workspace?.id;
        }

        // Search Tasks
        const tasks = await prisma.task.findMany({
            where: {
                AND: [
                    workspaceId ? { project: { workspaceId } } : {},
                    {
                        OR: [
                            { title: { contains: query, mode: "insensitive" } },
                            { description: { contains: query, mode: "insensitive" } },
                        ],
                    },
                ],
            },
            include: {
                project: { select: { name: true, workspace: { select: { slug: true } } } },
            },
            take: 5,
        });

        // Search Projects
        const projects = await prisma.project.findMany({
            where: {
                AND: [
                    workspaceId ? { workspaceId } : {},
                    { name: { contains: query, mode: "insensitive" } },
                ],
            },
            include: {
                workspace: { select: { slug: true } },
            },
            take: 3,
        });

        // Search Files
        const files = await prisma.file.findMany({
            where: {
                AND: [
                    workspaceId ? { project: { workspaceId } } : {},
                    { originalName: { contains: query, mode: "insensitive" } },
                ],
            },
            include: {
                project: { select: { name: true } },
            },
            take: 3,
        });

        // Format results for Command Palette
        const results = [
            ...tasks.map((t) => ({
                id: t.id,
                type: "TASK",
                title: t.title,
                subtitle: `in ${t.project.name}`,
                url: `/app/${t.project.workspace.slug}/projects/${t.projectId}?task=${t.id}`,
            })),
            ...projects.map((p) => ({
                id: p.id,
                type: "PROJECT",
                title: p.name,
                subtitle: "Project",
                url: `/app/${p.workspace.slug}/projects/${p.id}`,
            })),
            ...files.map((f) => ({
                id: f.id,
                type: "FILE",
                title: f.originalName,
                subtitle: `File in ${f.project.name}`,
                url: `/app/${workspaceSlug || "default"}/files`, // Simplification
            })),
        ];

        return NextResponse.json(results);
    } catch (error) {
        console.error("[SEARCH_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
