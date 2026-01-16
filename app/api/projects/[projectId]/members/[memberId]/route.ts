import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string; memberId: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, memberId } = await params;
  const userId = user.id;

  try {
    // Check if requester is an owner of the project
    const requesterMembership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        role: "OWNER",
      },
    });

    if (!requesterMembership) {
      return NextResponse.json(
        { error: "Only project owners can remove members" },
        { status: 403 },
      );
    }

    // Check if member exists
    const memberToRemove = await prisma.projectMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!memberToRemove || memberToRemove.projectId !== projectId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Prevent removing the last owner
    if (memberToRemove.role === "OWNER") {
      const ownerCount = await prisma.projectMember.count({
        where: {
          projectId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot remove the last owner. Transfer ownership first." },
          { status: 400 },
        );
      }
    }

    // Remove member
    await prisma.projectMember.delete({
      where: { id: memberId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing project member:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ projectId: string; memberId: string }> },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { projectId, memberId } = await params;
  const userId = user.id;

  try {
    const body = await req.json();
    const { role } = body;

    if (!["MEMBER", "OWNER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Check if requester is an owner of the project
    const requesterMembership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId,
        role: "OWNER",
      },
    });

    if (!requesterMembership) {
      return NextResponse.json(
        { error: "Only project owners can change roles" },
        { status: 403 },
      );
    }

    // Check if member exists
    const memberToUpdate = await prisma.projectMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToUpdate || memberToUpdate.projectId !== projectId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // If demoting from owner, check if there's at least one other owner
    if (memberToUpdate.role === "OWNER" && role === "MEMBER") {
      const ownerCount = await prisma.projectMember.count({
        where: {
          projectId,
          role: "OWNER",
        },
      });

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: "Cannot demote the last owner" },
          { status: 400 },
        );
      }
    }

    // Update role
    const updatedMember = await prisma.projectMember.update({
      where: { id: memberId },
      data: { role },
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

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error updating project member:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
