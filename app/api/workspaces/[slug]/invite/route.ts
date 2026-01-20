import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";
import { sendEmail, getInvitationHtml } from "@/lib/mail";
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { handleApiError } from "@/lib/api/error-handler";

const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["OWNER", "MEMBER"]).default("MEMBER"),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  console.log("[INVITE_API] POST request received.");
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const user = await getCurrentUser();
    console.log("[INVITE_API] User:", user?.email || "No user");
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await req.json();
    const { email, role } = inviteSchema.parse(body);

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: {
        members: {
          include: { user: true },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 },
      );
    }

    const existingMember = workspace.members.find(
      (m) => m.user.email?.toLowerCase() === email.toLowerCase(),
    );
    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of this workspace" },
        { status: 400 },
      );
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.invitation.upsert({
      where: {
        workspaceId_email: {
          workspaceId: workspace.id,
          email: email.toLowerCase(),
        },
      },
      update: {
        token,
        expiresAt,
        inviterId: user.id,
        role,
        acceptedAt: null,
      },
      create: {
        email: email.toLowerCase(),
        workspaceId: workspace.id,
        inviterId: user.id,
        role,
        token,
        expiresAt,
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const inviteLink = `${appUrl}/invite/${token}`;

    await sendEmail({
      to: email,
      subject: `You've been invited to join ${workspace.name}`,
      html: getInvitationHtml(workspace.name, inviteLink),
    });

    console.log("[INVITE_API] Invitation sent successfully to:", email);
    return NextResponse.json({
      message: "Invitation sent",
      invitationId: invitation.id,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
