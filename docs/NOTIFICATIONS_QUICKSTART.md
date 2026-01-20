# Notifications Quick Start Guide

## For Developers: How to Use Notifications

### 1. Sending a Notification

```typescript
import { notifyTaskAssigned } from "@/lib/notifications";

// When assigning a task
await notifyTaskAssigned(
  userId, // Who to notify
  "Fix bug #123", // Task title
  taskId, // Task ID
  projectId, // Project ID
  "my-workspace", // Workspace slug
);
```

### 2. Available Notification Types

```typescript
// Task assignment
await notifyTaskAssigned(userId, taskTitle, taskId, projectId, workspaceSlug);

// Comment mention
await notifyCommentMention(userId, mentionerName, taskTitle, taskId, projectId, workspaceSlug);

// Message received
await notifyMessageReceived(userId, senderName, projectId?, workspaceSlug?);

// Project invite
await notifyProjectInvite(userId, projectName, projectId, workspaceSlug);

// Custom notification
await createNotification({
  userId: "user-id",
  type: "TASK_ASSIGNED", // or COMMENT_MENTION, MESSAGE_RECEIVED, PROJECT_INVITE
  content: "Your custom message",
  link: "/app/workspace/page" // Optional link
});
```

### 3. Real-time Delivery (Socket.io)

Notifications are automatically delivered in real-time via Socket.io. The server emits to:

```typescript
io.to(`user:${userId}`).emit("new-notification", notification);
```

Clients automatically listen for this event in the NotificationDropdown component.

### 4. Adding a New Notification Type

#### Step 1: Update Prisma Schema

```prisma
enum NotificationType {
  TASK_ASSIGNED
  COMMENT_MENTION
  MESSAGE_RECEIVED
  PROJECT_INVITE
  YOUR_NEW_TYPE  // Add here
}
```

#### Step 2: Run Migration

```bash
npx prisma migrate dev --name add-new-notification-type
```

#### Step 3: Create Helper Function

```typescript
// In lib/notifications.ts
export async function notifyYourNewType(
  userId: string,
  // ... other params
) {
  return createNotification({
    userId,
    type: "YOUR_NEW_TYPE",
    content: "Your notification message",
    link: `/app/${workspaceSlug}/your-page`,
  });
}
```

#### Step 4: Add Icon in NotificationDropdown

```typescript
// In components/notifications/notification-dropdown.tsx
const getNotificationIcon = (type: string) => {
  switch (type) {
    case "YOUR_NEW_TYPE":
      return "🎉"; // Your emoji
    // ... existing cases
  }
};
```

#### Step 5: Add Filter Tab (Optional)

```tsx
<button
  className={filter === "YOUR_NEW_TYPE" ? "active" : ""}
  onClick={() => setFilter("YOUR_NEW_TYPE")}
>
  Your Type
</button>
```

### 5. Testing Your Notifications

#### Quick Test in Browser Console

```javascript
// Create a test notification
fetch("/api/notifications", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "your-user-id",
    type: "TASK_ASSIGNED",
    content: "Test notification",
    link: "/app/workspace/test",
  }),
});
```

#### Using the Test Script

```bash
npx ts-node scripts/test-notifications.ts
```

### 6. Common Patterns

#### Don't fail the main operation if notification fails

```typescript
try {
  await notifyTaskAssigned(...);
} catch (error) {
  console.error("Failed to send notification:", error);
  // Continue with main operation
}
```

#### Only notify when value changes

```typescript
if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
  await notifyTaskAssigned(...);
}
```

#### Don't notify self

```typescript
if (assigneeId !== currentUserId) {
  await notifyTaskAssigned(...);
}
```

### 7. API Reference

#### GET /api/notifications

```typescript
const response = await fetch("/api/notifications?filter=unread&limit=50");
const { notifications, unreadCount } = await response.json();
```

#### PATCH /api/notifications/[id]

```typescript
await fetch(`/api/notifications/${id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ read: true }),
});
```

#### PATCH /api/notifications/read-all

```typescript
await fetch("/api/notifications/read-all", {
  method: "PATCH",
});
```

#### DELETE /api/notifications/[id]

```typescript
await fetch(`/api/notifications/${id}`, {
  method: "DELETE",
});
```

### 8. Troubleshooting

**Notifications not appearing?**

- Check if user is authenticated
- Verify notification was created in database
- Check browser console for errors
- Ensure Socket.io connection is active

**Real-time not working?**

- Verify Socket.io server is running
- Check if user joined their room (`join-user` event)
- Look for connection errors in console

**Browser notifications not showing?**

- Check if permission was granted
- Verify `Notification.permission === "granted"`
- Test with: `new Notification("Test", { body: "Test" })`

### 9. Best Practices

✅ Always provide a link for navigation  
✅ Write clear, actionable notification content  
✅ Don't spam users with too many notifications  
✅ Group similar notifications when possible  
✅ Respect user preferences (when implemented)  
✅ Handle errors gracefully  
✅ Test on multiple browsers

### 10. Next Steps

After notifications are working:

- Implement email notifications (Phase 4)
- Add notification grouping
- Create notification templates
- Add notification preferences in database
- Implement daily digest emails

---

Need help? Check:

- Full documentation: `NOTIFICATIONS.md`
- Implementation details: `PHASE_1.1_COMPLETE.md`
- Test suite: `scripts/test-notifications.ts`
