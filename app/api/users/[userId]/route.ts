import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { userId } = await params;

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                createdAt: true,
                workspaces: {
                    select: {
                        role: true,
                        workspace: {
                            select: {
                                name: true,
                                slug: true
                            }
                        }
                    }
                }
            },
        });

        if (!targetUser) {
            return new NextResponse("User not found", { status: 404 });
        }

        return NextResponse.json(targetUser);
    } catch (error) {
        console.error("[USER_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
