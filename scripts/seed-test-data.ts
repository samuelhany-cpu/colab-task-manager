import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding test data...");

  try {
    // 1. Find or create a Test User
    const testUserEmail = "test@example.com";
    let user = await prisma.user.findUnique({
      where: { email: testUserEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: testUserEmail,
          name: "Test User",
          supabaseId: "dummy-id-123", // Replace with actual if needed
        },
      });
      console.log(`Created user: ${user.email}`);
    } else {
      console.log(`Using existing user: ${user.email}`);
    }

    // 2. Create another user for DMs
    const otherUserEmail = "collaborator@example.com";
    let otherUser = await prisma.user.findUnique({
      where: { email: otherUserEmail },
    });

    if (!otherUser) {
      otherUser = await prisma.user.create({
        data: {
          email: otherUserEmail,
          name: "Collaborator",
          supabaseId: "dummy-id-456",
        },
      });
      console.log(`Created user: ${otherUser.email}`);
    }

    // 3. Create a Workspace
    const workspaceSlug = "test-workspace";
    let workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: "Test Workspace",
          slug: workspaceSlug,
          ownerId: user.id,
          members: {
            createMany: {
              data: [
                { userId: user.id, role: "OWNER" },
                { userId: otherUser.id, role: "MEMBER" },
              ],
            },
          },
        },
      });
      console.log(`Created workspace: ${workspace.name}`);
    }

    // 4. Create a Project
    let project = await prisma.project.findFirst({
      where: { workspaceId: workspace.id, name: "Phase 2 Demo" },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          name: "Phase 2 Demo",
          description: "A project to demo and test Phase 2 features",
          workspaceId: workspace.id,
          members: {
            createMany: {
              data: [
                { userId: user.id, role: "OWNER" },
                { userId: otherUser.id, role: "MEMBER" },
              ],
            },
          },
        },
      });
      console.log(`Created project: ${project.name}`);
    }

    // 5. Create Tasks and Subtasks
    const taskCount = await prisma.task.count({
      where: { projectId: project.id },
    });
    if (taskCount === 0) {
      const task = await prisma.task.create({
        data: {
          title: "Complex Task with Subtasks",
          description:
            "This task has subtasks to test promotion and reordering.",
          status: "TODO",
          priority: "HIGH",
          projectId: project.id,
          creatorId: user.id,
          assigneeId: user.id,
          subtasks: {
            createMany: {
              data: [
                { title: "Research requirements", position: 1000 },
                { title: "Design implementation", position: 2000 },
                { title: "Write tests", position: 3000 },
              ],
            },
          },
        },
      });
      console.log(`Created task: ${task.title}`);
    }

    // 6. Create Messages
    const messageCount = await prisma.message.count({
      where: { projectId: project.id },
    });
    if (messageCount === 0) {
      await prisma.message.createMany({
        data: [
          {
            content: "Welcome to the Phase 2 Demo channel!",
            projectId: project.id,
            senderId: user.id,
          },
          {
            content: "Thanks! Happy to be here.",
            projectId: project.id,
            senderId: otherUser.id,
          },
          {
            content: "Has anyone tried pinning a message yet?",
            projectId: project.id,
            senderId: user.id,
          },
        ],
      });
      console.log("Created messages in project channel.");
    }

    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
