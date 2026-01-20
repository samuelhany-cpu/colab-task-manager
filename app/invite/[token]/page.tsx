import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import type { Invitation, Workspace, User } from "@prisma/client";

type InvitationWithRelations = Invitation & {
  workspace: Workspace;
  inviter: Pick<User, "name" | "email">;
};

async function acceptInvitation(
  invitation: InvitationWithRelations,
  userId: string,
) {
  try {
    // Check if user is already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: userId,
        },
      },
    });

    if (!existingMember) {
      // Create membership
      await prisma.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: userId,
          role: invitation.role,
        },
      });
    }

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    });

    return { success: true };
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return { success: false, error };
  }
}

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      workspace: true,
      inviter: {
        select: { name: true, email: true },
      },
    },
  });

  if (
    !invitation ||
    (invitation.expiresAt && invitation.expiresAt < new Date())
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md p-10 border-border/40 bg-card rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-destructive flex items-center justify-center text-white shadow-xl shadow-destructive/20">
            <XCircle size={40} />
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black tracking-tight">
              Invalid Invite
            </h2>
            <p className="text-mutedForeground font-medium leading-relaxed">
              This invitation link is invalid or has expired. Please contact the
              person who invited you.
            </p>
          </div>
          <Button
            asChild
            className="w-full h-12 rounded-xl text-lg font-black shadow-xl shadow-primary/20"
          >
            <Link href="/login">Back to Login</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // Check if already accepted
  if (invitation.acceptedAt) {
    redirect(`/app/${invitation.workspace.slug}`);
  }

  const user = await getCurrentUser();

  if (!user) {
    // Redirect to login and come back here after
    redirect(`/login?next=/invite/${token}`);
  }

  // Accept the invitation
  const result = await acceptInvitation(invitation, user.id);

  if (!result.success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="p-10 text-center space-y-4">
          <p className="text-destructive font-bold">
            Something went wrong while joining the workspace.
          </p>
          <Button asChild>
            <Link href="/app">Go to Dashboard</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6 relative overflow-hidden text-foreground">
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      <Card className="w-full max-w-md p-10 border-border/40 bg-card rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 animate-in zoom-in duration-500">
          <ShieldCheck size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black tracking-tight">Welcome!</h2>
          <p className="text-mutedForeground font-medium leading-relaxed">
            You have successfully joined{" "}
            <strong>{invitation.workspace.name}</strong>.
          </p>
        </div>
        <Button
          asChild
          className="w-full h-12 rounded-xl text-lg font-black shadow-xl shadow-primary/20"
        >
          <Link href={`/app/${invitation.workspace.slug}`}>
            Go to Workspace
          </Link>
        </Button>
      </Card>
    </div>
  );
}
