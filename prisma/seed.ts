import {
  PrismaClient,
  Role,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  ActivityType,
  NotificationType,
} from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Demo1234!";

function daysFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickWeighted<T>(entries: [T, number][]): T {
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let roll = Math.random() * total;
  for (const [value, weight] of entries) {
    if (roll < weight) return value;
    roll -= weight;
  }
  return entries[entries.length - 1][0];
}

async function main() {
  console.log("Seeding demo data for client presentation...");

  // 1. Cleanup
  await prisma.notification.deleteMany();
  await prisma.messageRead.deleteMany();
  await prisma.reaction.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationMember.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.fileVersion.deleteMany();
  await prisma.file.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.timer.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.subtask.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.integration.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 2. Team (Nova Digital Agency)
  const [samuel, sarah, john, emma, liam, priya] = await Promise.all([
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
        email: "sarah.chen@novadigital.io",
        passwordHash,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      },
    }),
    prisma.user.create({
      data: {
        name: "John Smith",
        email: "john.smith@novadigital.io",
        passwordHash,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
      },
    }),
    prisma.user.create({
      data: {
        name: "Emma Wilson",
        email: "emma.wilson@novadigital.io",
        passwordHash,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
      },
    }),
    prisma.user.create({
      data: {
        name: "Liam Carter",
        email: "liam.carter@novadigital.io",
        passwordHash,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Liam",
      },
    }),
    prisma.user.create({
      data: {
        name: "Priya Nair",
        email: "priya.nair@novadigital.io",
        passwordHash,
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
      },
    }),
  ]);
  const allUsers = [samuel, sarah, john, emma, liam, priya];
  console.log(`Created ${allUsers.length} team members`);

  // 3. Workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "Nova Digital Agency",
      slug: "nova-digital",
      ownerId: samuel.id,
      members: {
        createMany: {
          data: allUsers.map((u) => ({
            userId: u.id,
            role: u.id === samuel.id ? Role.OWNER : Role.MEMBER,
          })),
        },
      },
    },
  });
  console.log(`Created workspace: ${workspace.name}`);

  // 4. Tags
  const tagDefs = [
    { name: "Frontend", color: "#3b82f6" },
    { name: "Backend", color: "#10b981" },
    { name: "Design", color: "#ec4899" },
    { name: "Bug", color: "#ef4444" },
    { name: "Client Feedback", color: "#f59e0b" },
    { name: "Urgent", color: "#dc2626" },
  ];
  const tags = [];
  for (const t of tagDefs) {
    tags.push(
      await prisma.tag.create({
        data: { ...t, workspaceId: workspace.id },
      }),
    );
  }

  // 5. Projects (client-style engagements)
  type ProjectDef = {
    name: string;
    description: string;
    color: string;
    members: string[];
    milestones: {
      title: string;
      description: string;
      dueOffset: number;
      completed: boolean;
    }[];
    taskTitles: { title: string; description: string }[];
    internal?: boolean;
  };

  const projectDefs: ProjectDef[] = [
    {
      name: "Acme Retail — E-commerce Replatform",
      description:
        "Migrating Acme Retail's storefront to a headless commerce stack with a redesigned checkout flow.",
      color: "#8b5cf6",
      members: [samuel.id, john.id, liam.id, emma.id],
      milestones: [
        {
          title: "Discovery & Technical Audit",
          description: "Stakeholder interviews and current-stack audit.",
          dueOffset: -50,
          completed: true,
        },
        {
          title: "Design System Sign-off",
          description: "Component library approved by Acme brand team.",
          dueOffset: -28,
          completed: true,
        },
        {
          title: "Checkout Beta Launch",
          description: "Beta rollout to 10% of traffic.",
          dueOffset: 9,
          completed: false,
        },
        {
          title: "Full Public Launch",
          description: "100% traffic cutover and legacy decommission.",
          dueOffset: 34,
          completed: false,
        },
      ],
      taskTitles: [
        {
          title: "Audit legacy checkout for PCI scope",
          description:
            "Document every place card data touches the current Magento checkout.",
        },
        {
          title: "Set up headless commerce API gateway",
          description:
            "Stand up the BFF layer in front of the commerce provider.",
        },
        {
          title: "Build product listing page with faceted search",
          description: "Implement filters for size, color, and price range.",
        },
        {
          title: "Implement Stripe payment intents flow",
          description: "Replace legacy payment gateway with Stripe Elements.",
        },
        {
          title: "Design new checkout wireframes",
          description: "Three-step checkout: cart, shipping, payment.",
        },
        {
          title: "Migrate product catalog (42k SKUs)",
          description:
            "Write and test the ETL script from Magento to the new PIM.",
        },
        {
          title: "Build cart abandonment email flow",
          description: "Trigger sequence for carts abandoned over 1 hour.",
        },
        {
          title: "Load test checkout under Black Friday traffic",
          description: "Simulate 5x peak concurrent checkouts.",
        },
        {
          title: "Fix double-charge bug on retry",
          description:
            "Payment retries after timeout are creating duplicate charges.",
        },
        {
          title: "Implement saved addresses for returning customers",
          description: "Allow logged-in users to reuse shipping addresses.",
        },
        {
          title: "Client review: homepage hero redesign",
          description: "Present three hero concepts to Acme's brand team.",
        },
        {
          title: "Set up staging environment with prod-like data",
          description: "Anonymized dataset for QA and client demos.",
        },
        {
          title: "Integrate tax calculation service",
          description: "Avalara integration for multi-state tax rules.",
        },
        {
          title: "Mobile responsive pass on product detail page",
          description: "Fix layout breakage below 375px width.",
        },
        {
          title: "Write end-to-end tests for checkout happy path",
          description: "Playwright coverage for guest and logged-in checkout.",
        },
        {
          title: "Reduce PDP bundle size",
          description:
            "Currently 1.4MB JS on product pages — target under 400KB.",
        },
        {
          title: "Client feedback: simplify shipping options UI",
          description: "Acme wants fewer, clearer shipping tiers at checkout.",
        },
        {
          title: "Set up error monitoring for checkout flow",
          description: "Sentry alerts on payment or inventory API failures.",
        },
        {
          title: "Draft launch runbook and rollback plan",
          description: "Step-by-step plan for the production cutover.",
        },
        {
          title: "Accessibility audit of new checkout",
          description: "WCAG 2.1 AA pass on the redesigned flow.",
        },
      ],
    },
    {
      name: "Finch Bank — Mobile Banking App",
      description:
        "Native iOS/Android redesign for Finch Bank's retail customers, with a focus on accessibility and biometric login.",
      color: "#3b82f6",
      members: [samuel.id, sarah.id, priya.id, emma.id],
      milestones: [
        {
          title: "UX Research & Journey Mapping",
          description: "Interviews with 15 existing Finch customers.",
          dueOffset: -45,
          completed: true,
        },
        {
          title: "Design Sign-off",
          description: "Final UI kit approved by Finch compliance and brand.",
          dueOffset: -20,
          completed: true,
        },
        {
          title: "Closed Beta (500 users)",
          description: "TestFlight/Play internal track rollout.",
          dueOffset: 14,
          completed: false,
        },
        {
          title: "App Store Submission",
          description: "Submit to Apple and Google review.",
          dueOffset: 40,
          completed: false,
        },
      ],
      taskTitles: [
        {
          title: "Implement Face ID / biometric login",
          description: "Local auth with secure enclave fallback to PIN.",
        },
        {
          title: "Design accessible color palette",
          description: "Meet AA contrast ratio across light and dark mode.",
        },
        {
          title: "Build transaction history infinite scroll",
          description: "Paginated fetch with skeleton loading state.",
        },
        {
          title: "Integrate Plaid for external account linking",
          description: "Allow customers to link non-Finch accounts.",
        },
        {
          title: "Fix crash on card freeze toggle",
          description: "App crashes on Android 14 when toggling card lock.",
        },
        {
          title: "Build in-app dispute a transaction flow",
          description: "Guided flow with photo upload for evidence.",
        },
        {
          title: "Localize app copy for Spanish",
          description: "Full i18n pass for the Spanish-speaking user base.",
        },
        {
          title: "Security review of session token storage",
          description:
            "Confirm tokens are in Keychain/Keystore, not plain storage.",
        },
        {
          title: "Design empty states for zero-balance accounts",
          description: "Friendly empty states instead of blank screens.",
        },
        {
          title: "Client review: onboarding flow v2",
          description:
            "Walkthrough of the new 4-step onboarding with Finch stakeholders.",
        },
        {
          title: "Implement push notifications for large transactions",
          description:
            "Alert users on transactions over a configurable threshold.",
        },
        {
          title: "Reduce app cold start time",
          description:
            "Currently 3.2s on mid-tier Android — target under 1.5s.",
        },
        {
          title: "Build budgeting/spending insights widget",
          description: "Monthly category breakdown chart on the home tab.",
        },
        {
          title: "QA pass on VoiceOver / TalkBack navigation",
          description: "Full screen-reader walkthrough of core flows.",
        },
        {
          title: "Set up crash reporting dashboards",
          description: "Firebase Crashlytics wired into the release pipeline.",
        },
        {
          title: "Client feedback: simplify transfer confirmation copy",
          description: "Legal wants clearer fee disclosure language.",
        },
        {
          title: "Implement dark mode across all screens",
          description: "Audit remaining screens missing dark mode support.",
        },
        {
          title: "Write App Store review guideline compliance checklist",
          description:
            "Ensure biometric and financial data disclosures are complete.",
        },
        {
          title: "Penetration test of the auth API",
          description: "Third-party pentest ahead of the beta launch.",
        },
        {
          title: "Set up feature flags for phased rollout",
          description: "LaunchDarkly integration for the beta cohort.",
        },
      ],
    },
    {
      name: "Lumen Coffee — Brand Website Launch",
      description:
        "Brand identity and marketing site build supporting Lumen Coffee's national retail rollout.",
      color: "#10b981",
      members: [sarah.id, liam.id, emma.id],
      milestones: [
        {
          title: "Brand Identity Approved",
          description: "Logo, type, and color system signed off.",
          dueOffset: -35,
          completed: true,
        },
        {
          title: "Site Content & Copy Finalized",
          description: "All page copy approved by Lumen marketing.",
          dueOffset: -12,
          completed: true,
        },
        {
          title: "Site Launch",
          description: "Public launch across all Lumen retail markets.",
          dueOffset: 6,
          completed: false,
        },
      ],
      taskTitles: [
        {
          title: "Build store locator with map integration",
          description: "Mapbox-based locator filtered by city and amenities.",
        },
        {
          title: "Design homepage hero animation",
          description: "Subtle parallax animation of pour-over coffee.",
        },
        {
          title: "Implement newsletter signup with double opt-in",
          description: "Mailchimp integration with confirmation email.",
        },
        {
          title: "Build careers page with live job listings",
          description: "Pull open roles from Greenhouse API.",
        },
        {
          title: "Optimize image delivery for hero banners",
          description: "Serve responsive AVIF/WebP via CDN.",
        },
        {
          title: "Client review: seasonal menu page layout",
          description: "Present the fall menu page to Lumen marketing.",
        },
        {
          title: "Fix mobile nav overlap on tablet breakpoint",
          description: "Nav menu overlaps hero content between 768–900px.",
        },
        {
          title: "Set up Google Analytics 4 and conversion events",
          description: "Track newsletter signups and store locator searches.",
        },
        {
          title: "Write SEO metadata for all top-level pages",
          description: "Title tags, meta descriptions, and OG images.",
        },
        {
          title: "Build sustainability/impact page",
          description: "Highlight bean sourcing and packaging initiatives.",
        },
        {
          title: "Client feedback: adjust brand green across site",
          description: "Lumen wants a slightly warmer green tone site-wide.",
        },
        {
          title: "Cross-browser QA on Safari and Firefox",
          description: "Fix flex layout issues found in Safari 17.",
        },
        {
          title: "Set up staging preview links for client review",
          description: "Vercel preview deploys shared per PR.",
        },
        {
          title: "Implement cookie consent banner",
          description: "GDPR/CCPA-compliant consent management.",
        },
        {
          title: "Performance pass: target 95+ Lighthouse score",
          description:
            "Currently at 78 on mobile — largest gains from image sizing.",
        },
      ],
    },
    {
      name: "Internal — Agency Ops Dashboard 2.0",
      description:
        "Internal analytics dashboard for tracking Nova Digital's project utilization and margins.",
      color: "#f59e0b",
      internal: true,
      members: [samuel.id, john.id, priya.id],
      milestones: [
        {
          title: "Data Model & Metrics Defined",
          description:
            "Agreed definitions for utilization, margin, and burn rate.",
          dueOffset: -25,
          completed: true,
        },
        {
          title: "v2 Dashboard Internal Release",
          description: "Roll out to all team leads.",
          dueOffset: 18,
          completed: false,
        },
      ],
      taskTitles: [
        {
          title: "Build utilization-by-team chart",
          description: "Weekly billable vs. non-billable hours per team.",
        },
        {
          title: "Add project margin calculation",
          description:
            "Revenue minus loaded cost per project, updated nightly.",
        },
        {
          title: "Fix timezone bug in weekly rollups",
          description:
            "Hours logged near midnight are counted on the wrong day.",
        },
        {
          title: "Add CSV export for finance team",
          description: "Export monthly time and billing data.",
        },
        {
          title: "Set up nightly ETL job from time-tracking DB",
          description:
            "Cron job aggregating TimeEntry data into summary tables.",
        },
        {
          title: "Design exec summary view",
          description: "Single-page rollup for leadership standups.",
        },
        {
          title: "Add alerting for projects trending over budget",
          description:
            "Slack alert when a project crosses 90% of estimated hours.",
        },
        {
          title: "Write unit tests for margin calculation",
          description: "Cover edge cases like mid-month rate changes.",
        },
        {
          title: "Add role-based access to dashboard views",
          description: "Team leads see their team only; execs see everything.",
        },
        {
          title: "Migrate dashboard charts to new charting library",
          description: "Replace deprecated chart lib with Recharts.",
        },
        {
          title: "Fix stale cache on dashboard refresh",
          description: "Numbers don't update until a hard refresh.",
        },
        {
          title: "Add dark mode support",
          description: "Match the rest of the internal tools suite.",
        },
      ],
    },
  ];

  const statusPool: [TaskStatus, number][] = [
    [TaskStatus.DONE, 45],
    [TaskStatus.IN_PROGRESS, 30],
    [TaskStatus.TODO, 25],
  ];
  const priorityPool: [TaskPriority, number][] = [
    [TaskPriority.LOW, 15],
    [TaskPriority.MEDIUM, 40],
    [TaskPriority.HIGH, 30],
    [TaskPriority.URGENT, 15],
  ];

  const commentBank = [
    "Looking good so far — left a couple of notes above.",
    "Client approved this in today's sync, moving forward.",
    "Ran into an edge case here, digging into it now.",
    "Can we get a second pair of eyes on this before merging?",
    "Updated based on the feedback from yesterday's call.",
    "This is blocked on the API team's response, following up.",
    "Tested locally, works as expected. Ready for review.",
    "Pushed a fix, should be resolved in the next deploy.",
  ];

  let projectCount = 0;
  let taskCount = 0;
  let milestoneCount = 0;

  for (const def of projectDefs) {
    const project = await prisma.project.create({
      data: {
        name: def.name,
        description: def.description,
        workspaceId: workspace.id,
        status: ProjectStatus.ACTIVE,
        members: {
          createMany: {
            data: def.members.map((userId) => ({
              userId,
              role: userId === samuel.id ? Role.OWNER : Role.MEMBER,
            })),
          },
        },
      },
    });
    projectCount++;

    for (const m of def.milestones) {
      await prisma.milestone.create({
        data: {
          title: m.title,
          description: m.description,
          dueDate: daysFromNow(m.dueOffset),
          completed: m.completed,
          projectId: project.id,
        },
      });
      milestoneCount++;
    }

    for (const t of def.taskTitles) {
      const status = pickWeighted(statusPool);
      const priority = pickWeighted(priorityPool);
      const assigneeId = pick(def.members);
      const creatorId = pick(def.members);
      const createdAt = daysFromNow(-Math.floor(Math.random() * 55) - 2);
      const dueDate =
        status === TaskStatus.DONE
          ? daysFromNow(-Math.floor(Math.random() * 20) - 1)
          : daysFromNow(Math.floor(Math.random() * 25) - 5); // some overdue

      const taggedTags = Math.random() > 0.4 ? [pick(tags).id] : [];

      const task = await prisma.task.create({
        data: {
          title: t.title,
          description: t.description,
          status,
          priority,
          projectId: project.id,
          assigneeId,
          creatorId,
          createdAt,
          dueDate,
          tags: taggedTags.length
            ? { connect: taggedTags.map((id) => ({ id })) }
            : undefined,
        },
      });
      taskCount++;

      // Subtasks for ~45% of tasks
      if (Math.random() < 0.45) {
        const subtaskCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 1; i <= subtaskCount; i++) {
          await prisma.subtask.create({
            data: {
              title: `Step ${i}`,
              completed:
                status === TaskStatus.DONE ||
                (status === TaskStatus.IN_PROGRESS && Math.random() > 0.5),
              taskId: task.id,
              position: i * 1000,
            },
          });
        }
      }

      // Comments for ~55% of tasks
      if (Math.random() < 0.55) {
        const commentCount = 1 + Math.floor(Math.random() * 2);
        for (let i = 0; i < commentCount; i++) {
          await prisma.comment.create({
            data: {
              content: pick(commentBank),
              taskId: task.id,
              authorId: pick(def.members),
              createdAt: daysFromNow(-Math.floor(Math.random() * 10)),
            },
          });
        }
      }

      // Activity: creation + status change
      await prisma.activity.create({
        data: {
          type: ActivityType.CREATED,
          taskId: task.id,
          userId: creatorId,
          createdAt,
        },
      });
      if (status !== TaskStatus.TODO) {
        await prisma.activity.create({
          data: {
            type: ActivityType.STATUS_CHANGE,
            metadata: { from: "TODO", to: status },
            taskId: task.id,
            userId: assigneeId,
            createdAt: daysFromNow(-Math.floor(Math.random() * 5)),
          },
        });
      }

      // Time entries for in-progress/done tasks
      if (status !== TaskStatus.TODO) {
        const entryCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < entryCount; i++) {
          const start = daysFromNow(-Math.floor(Math.random() * 14) - 1);
          const durationMinutes = 30 + Math.floor(Math.random() * 210);
          const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
          await prisma.timeEntry.create({
            data: {
              taskId: task.id,
              userId: assigneeId,
              startTime: start,
              endTime: end,
              duration: durationMinutes * 60,
              isBillable: !def.internal && Math.random() > 0.1,
              note: Math.random() > 0.6 ? "Logged via timer" : undefined,
            },
          });
        }
      }
    }
  }

  console.log(
    `Created ${projectCount} projects, ${milestoneCount} milestones, ${taskCount} tasks`,
  );

  // 6. Workspace chat (#general) — realistic conversation
  const generalMessages: { senderId: string; content: string }[] = [
    {
      senderId: emma.id,
      content:
        "Morning team! Quick reminder: Acme client demo is Thursday at 2pm.",
    },
    {
      senderId: samuel.id,
      content: "Sounds good, I'll have the checkout beta ready for that.",
    },
    {
      senderId: sarah.id,
      content: "Finch design sign-off came through this morning 🎉",
    },
    {
      senderId: john.id,
      content: "Nice! I'll kick off the biometric login work today then.",
    },
    {
      senderId: liam.id,
      content:
        "Lumen site is looking really solid, Lighthouse score jumped to 89.",
    },
    {
      senderId: priya.id,
      content: "Great, I'll start QA on the store locator this afternoon.",
    },
    {
      senderId: emma.id,
      content: "Anyone free for a 15 min sync on the Ops Dashboard roadmap?",
    },
    { senderId: samuel.id, content: "I can do 3pm today." },
    { senderId: john.id, content: "Same, 3pm works." },
    {
      senderId: sarah.id,
      content:
        "Heads up — Finch wants a slightly different shade for the primary CTA, sending the update now.",
    },
    {
      senderId: liam.id,
      content: "Got it, will apply once you share the hex value.",
    },
    {
      senderId: priya.id,
      content:
        "Found a crash on Android 14 with card freeze toggle, filed as urgent.",
    },
    { senderId: john.id, content: "On it, thanks for the quick catch." },
  ];

  const generalMsgRecords = [];
  let msgOffset = generalMessages.length;
  for (const m of generalMessages) {
    const rec = await prisma.message.create({
      data: {
        content: m.content,
        workspaceId: workspace.id,
        senderId: m.senderId,
        createdAt: daysFromNow(-msgOffset * 0.4),
      },
    });
    generalMsgRecords.push(rec);
    msgOffset--;
  }
  // A couple of reactions on recent messages
  await prisma.reaction.create({
    data: {
      emoji: "🎉",
      messageId: generalMsgRecords[2].id,
      userId: samuel.id,
    },
  });
  await prisma.reaction.create({
    data: { emoji: "👍", messageId: generalMsgRecords[4].id, userId: emma.id },
  });

  console.log(`Created ${generalMsgRecords.length} workspace chat messages`);

  // 7. Pending invitation
  await prisma.invitation.create({
    data: {
      email: "alex.rivera@example.com",
      workspaceId: workspace.id,
      inviterId: samuel.id,
      role: Role.MEMBER,
      token: `demo-invite-${Date.now()}`,
      expiresAt: daysFromNow(7),
    },
  });

  // 8. Notifications for the demo login (Samuel)
  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.TASK_ASSIGNED,
        content: "You were assigned to 'Fix double-charge bug on retry'",
        userId: samuel.id,
        read: false,
      },
      {
        type: NotificationType.COMMENT_MENTION,
        content: "Emma Wilson mentioned you in a comment",
        userId: samuel.id,
        read: false,
      },
      {
        type: NotificationType.CHAT_MENTION,
        content: "You were mentioned in #general",
        userId: samuel.id,
        read: true,
      },
      {
        type: NotificationType.PROJECT_INVITE,
        content: "Alex Rivera was invited to Nova Digital Agency",
        userId: samuel.id,
        read: true,
      },
    ],
  });

  console.log("Seeding finished successfully!");
  console.log("");
  console.log("Demo login: samuelhany500@gmail.com / " + DEMO_PASSWORD);
  console.log("Other team accounts share the same password.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
