import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const addMemberSchema = z.object({
  email: z.string().email("Valid email is required"),
  role: z.enum(["MEMBER", "OWNER"]).default("MEMBER"),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const userId = (session.user as { id: string }).id;

  try {
    // Check if user is a member of the project
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get all project members
    const members = await prisma.projectMember.findMany({
      where: { projectId },
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
      orderBy: { joinedAt: "asc" },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error fetching project members:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId } = await params;
  const userId = (session.user as { id: string }).id;

  try {
    const body = await req.json();
    const data = addMemberSchema.parse(body);

    // Check if requester is an owner or member of the project
    const requesterMembership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
      },
    });

    if (!requesterMembership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Only owners can add members
    if (requesterMembership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only project owners can add members" },
        { status: 403 },
      );
    }

    // Find user by email
    const userToAdd = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!userToAdd) {
      return NextResponse.json(
        { error: "User with this email not found" },
        { status: 404 },
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this project" },
        { status: 400 },
      );
    }

    // Check workspace membership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: project.workspaceId,
          userId: userToAdd.id,
        },
      },
    });

    if (!workspaceMember) {
      return NextResponse.json(
        {
          error:
            "User must be a workspace member first. Please add them to the workspace.",
        },
        { status: 400 },
      );
    }

    // Add member to project
    const newMember = await prisma.projectMember.create({
      data: {
        projectId,
        userId: userToAdd.id,
        role: data.role,
      },
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
    });

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 },
      );
    }
    console.error("Error adding project member:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
