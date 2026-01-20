# Colab Task Manager - System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Authentication & Authorization](#authentication--authorization)
5. [API Routes](#api-routes)
6. [Real-time Features](#real-time-features)
7. [File Management](#file-management)
8. [Environment Configuration](#environment-configuration)
9. [Deployment](#deployment)
10. [Known Issues & Limitations](#known-issues--limitations)
11. [Troubleshooting](#troubleshooting)

---

## Overview

**Colab Task Manager** is a modern, real-time collaborative task management platform built with:

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM, PostgreSQL (Supabase)
- **Real-time**: Socket.io for WebSocket connections
- **Storage**: Cloudflare R2 (S3-compatible) for file uploads
- **Authentication**: Supabase Auth

**Key Features**:

- Multi-workspace organization
- Kanban board with drag-and-drop
- Real-time chat (workspace, project, direct messages, group conversations)
- Time tracking with timers and manual entries
- File management with versioning
- Task dependencies (subtasks)
- @mentions and emoji reactions
- Role-based access control (Owner/Member)

---

## Architecture

### Tech Stack Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Browser)                        │
│  Next.js 16 App Router + React 19 + TypeScript + Tailwind  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├──────────── HTTP REST ─────────────┐
                   │                                      │
                   ├──────────── WebSocket ──────────────┤
                   │                                      │
┌──────────────────▼──────────────────────────────────────────┐
│                   Next.js Server (Node.js)                   │
│  ┌──────────────┐  ┌───────────────┐  ┌────────────────┐  │
│  │  API Routes  │  │  Socket.io    │  │   Middleware   │  │
│  │  (REST API)  │  │   Server      │  │  (Auth Guard)  │  │
│  └──────┬───────┘  └───────┬───────┘  └───────┬────────┘  │
└─────────┼──────────────────┼──────────────────┼────────────┘
          │                  │                  │
          ├──────────────────┴──────────────────┤
          │                                      │
┌─────────▼──────────────────────────────────────▼─────────────┐
│                  External Services                             │
│  ┌─────────────────┐  ┌────────────┐  ┌──────────────────┐  │
│  │   Supabase      │  │ Cloudflare │  │     Resend       │  │
│  │  (PostgreSQL +  │  │     R2     │  │  (Email API)     │  │
│  │   Auth)         │  │  (Storage) │  │                  │  │
│  └─────────────────┘  └────────────┘  └──────────────────┘  │
└────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Page Load**: User navigates → Middleware checks auth → SSR renders page
2. **API Call**: Client → API Route → Prisma → PostgreSQL → Response
3. **Real-time**: Client connects Socket.io → Subscribes to channels → Receives broadcasts
4. **File Upload**: Client → API Route → Cloudflare R2 → Returns presigned URL

---

## Database Schema

### Entity Relationship Overview

```
User ──┬─── WorkspaceMember ─── Workspace
       ├─── Project Member ─── Project ─── Task โโโ Subtask
       ├─── Task (assignee/creator)          │
       ├─── Comment                           ├──โ Tag
       ├─── TimeEntry / Timer                 ├──โ Comment
       ├─── File                              └──โ File
       ├─── Message (sender/receiver)
       ├─── ConversationMember ─── Conversation
       ├─── Notification
       └─── Invitation (inviter)
```

### Core Tables

#### **User**

- `id` (cuid, PK)
- `supabaseId` (unique) - Supabase Auth user ID
- `name`, `email`, `emailVerified`, `image`, `passwordHash`
- Relations: workspaces, tasks, messages, etc.

#### **Workspace**

- `id` (cuid, PK), `name`, `slug` (unique), `ownerId`
- Multi-tenancy root: all resources belong to a workspace

#### **Project**

- `id`, `name`, `description`, `workspaceId`, `status` (ACTIVE/ARCHIVED)
- Contains tasks, files, folders, messages

#### **Task**

- `id`, `title`, `description`, `status` (TODO/IN_PROGRESS/DONE)
- `priority` (LOW/MEDIUM/HIGH/URGENT), `dueDate`, `position` (for ordering)
- `projectId`, `assigneeId`, `creatorId`
- Relations: subtasks, comments, activities, timeEntries, files, tags

#### **Message**

- `id`, `content`, `senderId`, `receiverId` (for DMs)
- `workspaceId`, `projectId`, `conversationId` (for channels/groups)
- `parentId` (for threads), `isPinned`, `status`
- Relations: reactions, reads, replies

#### **Conversation**

- `id`, `name`, `workspaceId`, `isGroup`
- Group DM support via ConversationMember join table

#### **File**

- `id`, `key` (S3 key), `originalName`, `mimeType`, `size`
- `projectId`, `taskId`, `folderId`, `uploadedById`
- Supports versioning via FileVersion table

---

## Authentication & Authorization

### Supabase Auth Flow

```
1. User signs up/logs in → Supabase Auth creates user
2. Server creates corresponding Prisma User record (via trigger or API)
3. Session cookie stored (httpOnly, secure)
4. Middleware validates session on each request
5. API routes check user.id from session
```

**Session Management**:

- Supabase handles JWT tokens automatically
- Middleware: `lib/supabase/middleware.ts` validates on every request
- Client SDK: `lib/supabase/client.ts` for browser
- Server SDK: `lib/supabase/server.ts` for API routes

### Row Level Security (RLS)

> **Critical**: RLS is currently **disabled** on all tables. This is a **security vulnerability**.

**RLS Policies Needed**:

```sql
-- Example for Task table
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks in their workspaces"
  ON "Task" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      INNER JOIN "WorkspaceMember" wm ON wm."workspaceId" = p."workspaceId"
      WHERE p.id = "Task"."projectId" AND wm."userId" = auth.uid()
    )
  );
```

### Role-Based Access

**Roles**: `OWNER`, `MEMBER` (for Workspace and Project)

**Permission Matrix**:
| Action | Owner | Member |
|--------|-------|---------|
| View workspace | ✓ | ✓ |
| Invite members | ✓ | ✗ |
| Delete workspace | ✓ | ✗ |
| Create projects | ✓ | ✓ |
| Delete projects | ✓ | Project Owner |
| Manage tasks | ✓ | ✓ (assigned) |

---

## API Routes

### Base URL

- Development: `http://localhost:3000/api`
- Production: `https://colab-task-manager.vercel.app/api`

### Endpoint Categories

#### **Authentication**

- `POST /api/register` - Register new user
- `POST /api/auth/resend` - Resend verification email

#### **Workspaces**

- `GET /api/workspaces` - List user's workspaces
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/{slug}/dashboard` - Dashboard stats
- `GET /api/workspaces/{slug}/members` - List members
- `POST /api/workspaces/{slug}/invitations` - Invite member

#### **Projects**

- `GET /api/projects/{id}` - Get project details
- `POST /api/projects` - Create project
- `PATCH /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `GET /api/projects/{id}/members` - List project members

#### **Tasks**

- `GET /api/tasks` - List tasks (filtered by project/assignee)
- `POST /api/tasks` - Create task
- `PATCH /api/tasks?taskId={id}` - Update task
- `DELETE /api/tasks/{id}` - Delete task
- `GET /api/tasks/{id}/comments` - List comments
- `POST /api/tasks/{id}/comments` - Add comment
- `GET /api/tasks/{id}/subtasks` - List subtasks
- `POST /api/tasks/{id}/subtasks` - Create subtask

#### **Subtasks**

- `PATCH /api/subtasks/{id}` - Update subtask
- `DELETE /api/subtasks/{id}` - Delete subtask
- `POST /api/subtasks/{id}/promote` - Convert to task

#### **Messages/Chat**

- `GET /api/chat` - Get messages (workspace/project/DM/conversation)
  - Query params: `workspaceId`, `projectId`, `receiverId`, `conversationId`, `parentId`
- `POST /api/chat` - Send message
- `PATCH /api/messages/{id}` - Edit message
- `DELETE /api/messages/{id}` - Delete message
- `POST /api/messages/{id}/reactions` - Add reaction
- `POST /api/messages/{id}/pin` - Toggle pin
- `POST /api/messages/delivered` - Mark delivered
- `POST /api/messages/read` - Mark read
- `GET /api/chat/search` - Search messages

#### **Conversations**

- `GET /api/conversations` - List conversations
- `POST/api/conversations` - Create group conversation
- `GET /api/conversations/{id}/members` - List members

#### **Time Tracking**

- `GET /api/time/entries` - List time entries
- `POST /api/time/entries` - Create entry
- `GET /api/time/timer` - Get active timer
- `POST /api/time/timer` - Start timer
- `DELETE /api/time/timer` - Stop timer

#### **Files**

- `GET /api/files` - List files (by project)
- `POST /api/files` - Upload file
- `GET /api/files/{id}/versions` - List versions
- `POST /api/files/{id}/versions` - Upload new version
- `POST /api/files/{id}/versions/{versionId}/restore` - Restore version

#### **Notifications**

- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/{id}/read` - Mark read
- `DELETE /api/notifications/{id}` - Delete notification

#### **Search**

- `GET /api/search` - Global search

#### **Users**

- `GET /api/users/{id}` - Get user profile

---

## Real-time Features

### Socket.io Channels

**Channel Naming Convention**:

- Workspace: `workspace:{workspaceId}`
- Project: `project:{projectId}`
- DM: `dm:{sortedUserIds}` (e.g., `dm:user1:user2`)
- Conversation: `conversation:{conversationId}`
- Thread: `thread:{parentMessageId}`

**Event Types**:
| Event | Payload | Description |
|-------|---------|-------------|
| `new-message` | Message object | Broadcast new message |
| `message-updated` | Message object | Message edited |
| `message-deleted` | `{id}` | Message removed |
| `message-pinned-toggled` | `{id, isPinned}` | Pin state changed |
| `message-delivered` | `{id, status, deliveredAt}` | Delivery confirmation |
| `message-read` | `{id, status}` | Read receipt |
| `reaction-added` | `{messageId, reaction}` | Emoji added |
| `reaction-removed` | `{messageId, userId, emoji}` | Emoji removed |

**Presence Tracking**:

- Typing Indicators: `{name, isTyping}`
- Online Status: Real-time user availability

**Client Example**:

```typescript
const channel = supabase
  .channel(`workspace:${workspaceId}`)
  .on("broadcast", { event: "new-message" }, ({ payload }) => {
    setMessages((prev) => [...prev, payload]);
  })
  .subscribe();
```

---

## File Management

### Storage: Cloudflare R2

**Configuration** (`lib/r2.ts`):

```typescript
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
});
```

### Upload Flow

1. Client selects file → FormData
2. POST `/api/files` with FormData
3. Server generates unique S3 key: `{projectId}/{timestamp}-{filename}`
4. Upload to R2 via AWS SDK
5. Store metadata in File table (Prisma)
6. Return file URL

### File Versioning

- Each file can have multiple FileVersion records
- `POST /api/files/{id}/versions` uploads new version
- `versionNumber` auto-increments
- Restore previous version copies it back as latest

### Supported Features

- Preview: Images, Videos, PDFs (in-browser)
- Download: All file types
- Max size: Determined by hosting limits (typically 10MB for Vercel without config)

---

## Environment Configuration

### Required Variables

```env
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?pgbouncer=true"
DIRECT_URL="postgresql://user:pass@host:5432/db"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGci..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGci..."

# Socket.io
NEXT_PUBLIC_SOCKET_URL="https://yourdomain.com"

# Cloudflare R2 (Optional)
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="colab-task-manager"
R2_PUBLIC_DOMAIN="https://pub-xxx.r2.dev"

# Email (Resend)
RESEND_API_KEY="re_..."

# App URL
NEXT_PUBLIC_APP_URL="https://colab-task-manager.vercel.app"
```

### Security Notes

> ⚠️ **Never commit `.env` to version control!**

- All keys in current `.env` are **exposed** and should be rotated
- Use `.env.local` for local development
- Set environment variables in Vercel dashboard for production

---

## Deployment

### Vercel (Recommended)

1. **Connect Repository**: Link GitHub repo to Vercel
2. **Configure Environment Variables**: Add all vars from `.env.example`
3. **Database**: Ensure Supabase project is created
4. **Run Migrations**:
   ```bash
   npx prisma migrate deploy
   ```
5. **Deploy**: Vercel auto-deploys on push to `main`

### Build Command

```bash
npm run build
# Runs: prisma generate && next build
```

### Database Migrations

**Development**:

```bash
npx prisma migrate dev --name description
```

**Production**:

```bash
npx prisma migrate deploy
```

### Post-Deployment Checklist

- [ ] Verify all environment variables set
- [ ] Run `npx prisma migrate deploy`
- [ ] Test authentication flow
- [ ] Enable RLS policies (see security section)
- [ ] Configure email sending (Resend)
- [ ] Test file uploads to R2
- [ ] Verify Socket.io connectivity

---

## Known Issues & Limitations

### Critical Issues

1. **RLS Disabled**: All database tables lack Row Level Security, exposing data via Supabase PostgREST API
2. **Exposed Credentials**: Current `.env` contains exposed keys (rotate immediately)
3. **Socket URL**: Development uses `https://localhost:3000` which won't work in prod

### Performance Considerations

1. **No Database Indexes**: Foreign keys lack indexes (add via migration)
2. **No Query Optimization**: Some API routes fetch more data than needed
3. **No Pagination**: Large datasets (tasks, messages) load all at once
4. **No Caching**: No Redis/caching layer for frequently accessed data

### Missing Features

1. **Email Notifications**: Resend configured but not fully integrated
2. **Advanced Search**: Full-text search not implemented
3. **Attachments in Chat**: Can't upload files directly in messages
4. **Mobile Responsive**: UI needs mobile optimization
5. **Dark Mode**: Theme switching not implemented

---

## Troubleshooting

### Common Issues

#### 1. **Build Errors**

**Symptom**: `npm run build` fails with TypeScript/ESLint errors

**Solution**:

```bash
# Check linting
npm run lint

# Fix auto-fixable issues
npx eslint --fix .

# Type check
npx tsc --noEmit
```

#### 2. **Database Connection Failed**

**Symptom**: `PrismaClientInitializationError`

**Solution**:

- Verify `DATABASE_URL` in `.env`
- Check Supabase project is active
- Use `DIRECT_URL` for migrations (bypasses pgBouncer)

#### 3. **Socket.io Not Connecting**

**Symptom**: No real-time updates

**Solution**:

- Check `NEXT_PUBLIC_SOCKET_URL` matches deployment URL
- Verify Socket.io server is running (`server.ts`)
- Check browser console for WebSocket errors

#### 4. **File Upload Fails**

**Symptom**: 500 error on upload

**Solution**:

- Verify R2 credentials in `.env`
- Check R2 bucket exists and is accessible
- Verify CORS settings on R2 bucket

#### 5. **Authentication Loop**

**Symptom**: Redirects between login and dashboard

**Solution**:

- Clear cookies
- Check `NEXT_PUBLIC_SUPABASE_URL` is correct
- Verify middleware is not blocking auth routes

### Debug Mode

Enable detailed logging:

```typescript
// Add to API routes
console.log("DEBUG:", { user, params, body });
```

### Performance Profiling

```bash
# Analyze bundle size
npm run build
npx @next/bundle-analyzer
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run linting
npm run lint

# Format code
npm run format

# Database
npx prisma studio         # Open database GUI
npx prisma migrate dev    # Create & apply migration
npx prisma db seed        # Seed database

# Build for production
npm run build

# Start production server
npm start
```

---

## Contact & Support

**Author**: Samuel Ehab  
**Email**: samuelhany500@gmail.com  
**Repository**: https://github.com/samuelhany-cpu/colab-task-manager
**License**: MIT

---

**Last Updated**: 2026-01-20

_This documentation is generated for version control and knowledge sharing. Keep it updated as the system evolves._
