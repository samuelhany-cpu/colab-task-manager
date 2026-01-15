import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const userId = "cmkefatcn0000h1i0haeq2mgv";

  console.log(`Deep cleaning and deleting user with ID: ${userId}`);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log("User already gone or ID incorrect.");
      return;
    }

    // Comprehensive sequence to remove all traces
    console.log("1. Removing personal data...");
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.message.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    });
    await prisma.timer.deleteMany({ where: { userId } });
    await prisma.timeEntry.deleteMany({ where: { userId } });
    await prisma.file.deleteMany({ where: { uploadedById: userId } });
    await prisma.activity.deleteMany({ where: { userId } });
    await prisma.comment.deleteMany({ where: { authorId: userId } });

    console.log("2. Handling tasks created by the user...");
    // Tasks created by them might be referenced by other things.
    // Let's just delete any task they created.
    await prisma.task.deleteMany({ where: { creatorId: userId } });
    // And remove assignments
    await prisma.task.updateMany({
      where: { assigneeId: userId },
      data: { assigneeId: null },
    });

    console.log("3. Removing memberships...");
    await prisma.projectMember.deleteMany({ where: { userId } });
    await prisma.workspaceMember.deleteMany({ where: { userId } });

    console.log(
      "4. Handling owned workspaces (and their cascading projects/tasks)...",
    );
    const ownedWS = await prisma.workspace.findMany({
      where: { ownerId: userId },
    });
    for (const ws of ownedWS) {
      // Deleting workspace should cascade to projects and tasks due to schema onDelete: Cascade
      await prisma.workspace.delete({ where: { id: ws.id } });
    }

    console.log("5. Final User delete...");
    await prisma.user.delete({
      where: { id: userId },
    });

    console.log("Success! User fully purged.");
  } catch (error) {
    console.error("Critical Failure:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
