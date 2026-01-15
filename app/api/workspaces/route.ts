import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const workspaceSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
});

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId: (session.user as { id: string }).id,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(workspaces);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, slug } = workspaceSchema.parse(body);

    const existingWorkspace = await prisma.workspace.findUnique({
      where: { slug },
    });

    if (existingWorkspace) {
      return NextResponse.json(
        { error: "Workspace with this slug already exists" },
        { status: 400 },
      );
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        ownerId: (session.user as { id: string }).id,
        members: {
          create: {
            userId: (session.user as { id: string }).id,
            role: "OWNER",
          },
        },
      },
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Workspace creation error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
