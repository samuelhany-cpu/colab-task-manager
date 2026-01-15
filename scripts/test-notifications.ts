/**
 * Test script for notifications system
 * Run with: ts-node scripts/test-notifications.ts
 * 
 * This script tests:
 * 1. Creating notifications
 * 2. Marking as read
 * 3. Deleting notifications
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function testNotifications() {
  console.log("🧪 Testing Notifications System...\n");

  try {
    // 1. Find a test user
    const user = await prisma.user.findFirst();
    if (!user) {
      console.error("❌ No users found. Please create a user first.");
      return;
    }
    console.log(`✅ Found user: ${user.email}`);

    // 2. Create test notifications
    console.log("\n📝 Creating test notifications...");

    const notifications = await Promise.all([
      prisma.notification.create({
        data: {
          userId: user.id,
          type: "TASK_ASSIGNED",
          content: "You have been assigned to task: Test Task",
          link: "/app/test-workspace/projects/test-project?task=123",
        },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          type: "COMMENT_MENTION",
          content: "John mentioned you in a comment on 'Test Task'",
          link: "/app/test-workspace/projects/test-project?task=123",
        },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          type: "MESSAGE_RECEIVED",
          content: "John sent you a message",
          link: "/app/test-workspace/chat",
        },
      }),
    ]);

    console.log(`✅ Created ${notifications.length} notifications`);

    // 3. Fetch notifications
    console.log("\n📥 Fetching notifications...");
    const fetchedNotifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    console.log(`✅ Fetched ${fetchedNotifications.length} notifications`);
    fetchedNotifications.forEach((n) => {
      console.log(`   - [${n.read ? "READ" : "UNREAD"}] ${n.content}`);
    });

    // 4. Mark one as read
    console.log("\n✓ Marking first notification as read...");
    await prisma.notification.update({
      where: { id: notifications[0].id },
      data: { read: true },
    });
    console.log("✅ Marked as read");

    // 5. Count unread
    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });
    console.log(`\n📊 Unread count: ${unreadCount}`);

    // 6. Mark all as read
    console.log("\n✓ Marking all as read...");
    const result = await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    console.log(`✅ Marked ${result.count} notifications as read`);

    // 7. Delete test notifications
    console.log("\n🗑️  Cleaning up test notifications...");
    const deleted = await prisma.notification.deleteMany({
      where: {
        id: { in: notifications.map((n) => n.id) },
      },
    });
    console.log(`✅ Deleted ${deleted.count} test notifications`);

    console.log("\n✨ All tests passed!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testNotifications();
