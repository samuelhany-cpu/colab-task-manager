# Notifications System Documentation

## Overview

The notifications system provides real-time and persistent notifications for users in the Colab Task Manager. Users are notified about task assignments, mentions, messages, and project invites.

## Features

✅ **Real-time delivery** via Socket.io  
✅ **Dropdown UI** with notification count badge  
✅ **Mark as read/unread** individual notifications  
✅ **Mark all as read** bulk action  
✅ **Delete notifications** individually  
✅ **Filter by type** (all, unread, tasks, messages)  
✅ **Browser notifications** with permission request  
✅ **Click to navigate** to relevant page  
✅ **Preferences page** for notification settings  

## Components

### NotificationDropdown
Location: `components/notifications/notification-dropdown.tsx`

Displays a dropdown with notifications, filters, and actions. Automatically integrated in the sidebar.

### Notification Preferences
Location: `app/app/[slug]/settings/notifications/page.tsx`

User preferences page for managing email and browser notification settings.

## API Endpoints

### GET /api/notifications
Fetch user's notifications with optional filtering.

**Query Parameters:**
- `filter`: 'all' | 'unread' | 'TASK_ASSIGNED' | 'COMMENT_MENTION' | 'MESSAGE_RECEIVED' | 'PROJECT_INVITE'
- `limit`: Number of notifications to fetch (default: 50)

**Response:**
```json
{
  "notifications": [
    {
      "id": "clxxx",
      "type": "TASK_ASSIGNED",
      "content": "You have been assigned to task: Test Task",
      "read": false,
      "link": "/app/workspace/projects/project-id?task=task-id",
      "createdAt": "2026-01-15T10:00:00Z"
    }
  ],
  "unreadCount": 5
}
```

### PATCH /api/notifications/[id]
Mark a notification as read or unread.

**Body:**
```json
{
  "read": true
}
```

### PATCH /api/notifications/read-all
Mark all user's notifications as read.

**Response:**
```json
{
  "success": true,
  "count": 5
}
```

### DELETE /api/notifications/[id]
Delete a notification.

**Response:**
```json
{
  "success": true
}
```

## Helper Functions

Location: `lib/notifications.ts`

### createNotification
Generic function to create a notification.

```typescript
await createNotification({
  userId: "user-id",
  type: "TASK_ASSIGNED",
  content: "You have been assigned to task: New Task",
  link: "/app/workspace/projects/project-id?task=task-id"
});
```

### notifyTaskAssigned
Notify user when assigned to a task.

```typescript
await notifyTaskAssigned(
  assigneeId,
  "Task Title",
  taskId,
  projectId,
  workspaceSlug
);
```

### notifyCommentMention
Notify user when mentioned in a comment.

```typescript
await notifyCommentMention(
  userId,
  "John Doe",
  "Task Title",
  taskId,
  projectId,
  workspaceSlug
);
```

### notifyMessageReceived
Notify user of a new message.

```typescript
await notifyMessageReceived(
  userId,
  "John Doe",
  projectId,
  workspaceSlug
);
```

### notifyProjectInvite
Notify user when added to a project.

```typescript
await notifyProjectInvite(
  userId,
  "Project Name",
  projectId,
  workspaceSlug
);
```

## Socket.io Integration

### Server Events (server.ts)

**join-user**: Client joins their notification room
```typescript
socket.emit("join-user", userId);
```

**send-notification**: Server sends notification to user
```typescript
socket.emit("send-notification", {
  userId: "user-id",
  notification: { /* notification object */ }
});
```

### Client Events (NotificationDropdown)

**new-notification**: Received when a notification is sent
```typescript
socket.on("new-notification", (notification) => {
  // Handle new notification
});
```

## Usage Examples

### Creating a notification when assigning a task

```typescript
import { notifyTaskAssigned } from "@/lib/notifications";

// In your task assignment endpoint
if (task.assigneeId && task.assigneeId !== oldAssigneeId) {
  await notifyTaskAssigned(
    task.assigneeId,
    task.title,
    task.id,
    task.projectId,
    workspaceSlug
  );
}
```

### Creating a notification for mentions

```typescript
import { notifyCommentMention } from "@/lib/notifications";

// When creating a comment with mentions
const mentions = extractMentions(comment.content); // Your mention parsing logic

for (const userId of mentions) {
  await notifyCommentMention(
    userId,
    session.user.name,
    task.title,
    task.id,
    task.projectId,
    workspaceSlug
  );
}
```

## Database Schema

```prisma
model Notification {
  id        String           @id @default(cuid())
  type      NotificationType
  content   String
  userId    String
  read      Boolean          @default(false)
  link      String?
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum NotificationType {
  TASK_ASSIGNED
  COMMENT_MENTION
  MESSAGE_RECEIVED
  PROJECT_INVITE
}
```

## Testing

Run the test script to verify notifications work correctly:

```bash
npx ts-node scripts/test-notifications.ts
```

This will:
1. Create test notifications
2. Fetch notifications
3. Mark as read
4. Count unread
5. Mark all as read
6. Delete test notifications

## Browser Notifications

The system requests permission for browser notifications on first load. Users can:
- Grant permission to receive desktop notifications
- Deny permission to only use in-app notifications
- Manage preferences in the settings page

## Future Enhancements

- [ ] Email notifications via Resend/SendGrid
- [ ] Daily digest emails
- [ ] Notification grouping (e.g., "John and 3 others mentioned you")
- [ ] Rich notification content with images
- [ ] Notification history export
- [ ] Snooze notifications
- [ ] Notification channels (important, updates, social)

## Troubleshooting

### Notifications not appearing in real-time
1. Check if Socket.io server is running (server.ts)
2. Verify user joined their notification room (`join-user` event)
3. Check browser console for Socket.io connection errors

### Browser notifications not showing
1. Check if browser permission is granted
2. Verify notification API is supported in the browser
3. Check if notifications are blocked in browser settings

### Notification count not updating
1. Ensure database is properly seeded
2. Check API response in network tab
3. Verify user authentication is working

## Support

For issues or questions, please check:
- Implementation Roadmap: `IMPLEMENTATION_ROADMAP.md`
- Test Script: `scripts/test-notifications.ts`
- API Routes: `app/api/notifications/`
