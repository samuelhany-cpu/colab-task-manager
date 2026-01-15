import {
  PrismaClient,
  Role,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // 1. Cleanup
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.file.deleteMany();
  await prisma.timer.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // 2. Create Users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: "Samuel Ehab",
        email: "samuelhany500@gmail.com",
        passwordHash,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Samuel",
      },
    }),
    prisma.user.create({
      data: {
        name: "Sarah Chen",
        email: "sarah@example.com",
        passwordHash,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      },
    }),
    prisma.user.create({
      data: {
        name: "John Smith",
        email: "john@example.com",
        passwordHash,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      },
    }),
    prisma.user.create({
      data: {
        name: "Emma Wilson",
        email: "emma@example.com",
        passwordHash,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
      },
    }),
  ]);

  console.log(`Created ${users.length} users`);

  // 3. Create Workspaces
  const workspacesData = [
    { name: "Engineering Team", slug: "engineering", ownerId: users[0].id },
    { name: "Marketing Hub", slug: "marketing", ownerId: users[1].id },
    { name: "Product Design", slug: "design", ownerId: users[0].id },
  ];

  const workspaces = [];
  for (const ws of workspacesData) {
    const workspace = await prisma.workspace.create({
      data: {
        ...ws,
        members: {
          createMany: {
            data: users.map((u) => ({
              userId: u.id,
              role: u.id === ws.ownerId ? Role.OWNER : Role.MEMBER,
            })),
          },
        },
      },
    });
    workspaces.push(workspace);
  }

  console.log(`Created ${workspaces.length} workspaces`);

  // 4. Create Projects
  const projectTemplates = [
    {
      name: "Next.js 15 Upgrade",
      description: "Updating the core framework and fixing breaking changes.",
      color: "#8b5cf6",
    },
    {
      name: "Mobile App Redesign",
      description: "New UI/UX for the iOS and Android applications.",
      color: "#3b82f6",
    },
    {
      name: "Q1 Marketing Campaign",
      description: "Global strategy for new product launch.",
      color: "#10b981",
    },
    {
      name: "Security Audit",
      description: "Internal review of authentication and data flow.",
      color: "#ef4444",
    },
  ];

  const projects = [];
  for (const ws of workspaces) {
    for (const template of projectTemplates) {
      const project = await prisma.project.create({
        data: {
          name: `${ws.name}: ${template.name}`,
          description: template.description,
          workspaceId: ws.id,
          status: ProjectStatus.ACTIVE,
          members: {
            createMany: {
              data: users.slice(0, 3).map((u) => ({
                userId: u.id,
                role: u.id === ws.ownerId ? Role.OWNER : Role.MEMBER,
              })),
            },
          },
        },
      });
      projects.push(project);
    }
  }

  console.log(`Created ${projects.length} projects`);

  // 5. Create Tasks
  const statuses: TaskStatus[] = [
    TaskStatus.TODO,
    TaskStatus.IN_PROGRESS,
    TaskStatus.DONE,
  ];
  const priorities: TaskPriority[] = [
    TaskPriority.LOW,
    TaskPriority.MEDIUM,
    TaskPriority.HIGH,
    TaskPriority.URGENT,
  ];

  let taskCount = 0;
  for (const project of projects) {
    const tasksToCreate = 15; // 15 tasks per project
    for (let i = 1; i <= tasksToCreate; i++) {
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority =
        priorities[Math.floor(Math.random() * priorities.length)];
      const assigneeId = users[Math.floor(Math.random() * users.length)].id;
      const creatorId = users[Math.floor(Math.random() * users.length)].id;

      await prisma.task.create({
        data: {
          title: `Task ${i}: ${project.name.split(":")[1]} Phase ${Math.ceil(i / 5)}`,
          description: `Comprehensive description for task ${i} in project ${project.name}. This involves deep diving into requirements.`,
          status,
          priority,
          projectId: project.id,
          assigneeId,
          creatorId,
          dueDate: new Date(
            Date.now() + Math.random() * 14 * 24 * 60 * 60 * 1000,
          ), // Random date within 14 days
          comments: {
            createMany: {
              data: [
                {
                  content: "Looking good! Let me know if you need help.",
                  authorId: users[1].id,
                },
                { content: "Started working on this.", authorId: users[2].id },
              ],
            },
          },
        },
      });
      taskCount++;
    }
  }

  console.log(`Created ${taskCount} tasks`);
  console.log("Seeding finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
