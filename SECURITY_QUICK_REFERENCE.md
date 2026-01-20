# SECURITY QUICK REFERENCE

## Cheat Sheet for Developers

---

## AUTHENTICATION

### Require User in API Route

```typescript
import { requireUser } from "@/lib/auth/guards";

export async function GET(req: Request) {
  try {
    const user = await requireUser(); // Throws 401 if not authenticated
    // ... rest of handler
  } catch (error) {
    const result = handleGuardError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}
```

---

## AUTHORIZATION

### Check Workspace Membership

```typescript
import { assertWorkspaceMember } from "@/lib/auth/guards";

const user = await requireUser();
await assertWorkspaceMember(user.id, workspaceId); // Throws 403 if not member
```

### Check Project Membership

```typescript
import { assertProjectMember } from "@/lib/auth/guards";

await assertProjectMember(user.id, projectId); // Throws 403 if not member
```

### Check Task Access

```typescript
import { assertCanAccessTask } from "@/lib/auth/guards";

await assertCanAccessTask(user.id, taskId); // Validates via project membership
```

### Check File Access

```typescript
import { assertCanAccessFile } from "@/lib/auth/guards";

await assertCanAccessFile(user.id, fileId); // Validates via project membership
```

### Check DM Authorization

```typescript
import { assertCanDirectMessage } from "@/lib/auth/guards";

await assertCanDirectMessage(senderId, receiverId); // Validates shared workspace
```

---

## INPUT VALIDATION

### Use Zod Schemas

```typescript
import { taskCreateSchema } from "@/lib/validation/schemas";

const body = await req.json();
const data = taskCreateSchema.parse(body); // Throws ZodError if invalid
```

### Available Schemas

- `taskCreateSchema`, `taskUpdateSchema`
- `projectCreateSchema`, `projectUpdateSchema`
- `messageCreateSchema`, `messageUpdateSchema`
- `commentCreateSchema`, `commentUpdateSchema`
- `fileUploadSchema`
- `conversationCreateSchema`
- `timeEntryCreateSchema`
- `workspaceCreateSchema`

### Sanitize Optional IDs

```typescript
import { sanitizeOptionalId } from "@/lib/auth/guards";

const assigneeId = sanitizeOptionalId(body.assigneeId); // Converts "" to null, validates format
```

---

## RATE LIMITING

### Apply Rate Limiting

```typescript
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";

export async function POST(req: Request) {
  const rateLimitResult = await rateLimit(req);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  // ... rest of handler
}
```

### Rate Limit Types

```typescript
// Default: 100 req/min
await rateLimit(req);

// Auth: 5 req/min (login, register)
await rateLimitAuth(req);

// Chat: 30 msg/min
await rateLimitChat(req);

// Upload: 10/min
await rateLimitUpload(req);

// Search: 20/min
await rateLimitSearch(req);

// Interaction: 50/min (comments, reactions)
await rateLimitInteraction(req);

// Strict: 3/min (sensitive operations)
await rateLimitStrict(req);
```

### Check for Spam

```typescript
import { isSpamContent, checkBurstSpam } from "@/lib/middleware/rate-limit";

if (isSpamContent(message.content)) {
  return NextResponse.json({ error: "Spam detected" }, { status: 400 });
}

if (await checkBurstSpam(user.id)) {
  return NextResponse.json({ error: "Too fast" }, { status: 429 });
}
```

---

## ERROR HANDLING

### Handle All Errors

```typescript
import { handleApiError } from "@/lib/api/error-handler";

export async function POST(req: Request) {
  try {
    // ... handler logic
  } catch (error) {
    return handleApiError(error); // Returns appropriate status code
  }
}
```

### Custom Error Types

```typescript
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/auth/guards";

throw new UnauthorizedError("Custom message"); // 401
throw new ForbiddenError("Custom message"); // 403
throw new NotFoundError("Custom message"); // 404
```

---

## FILE UPLOADS

### Validate File Upload

```typescript
import { validateFileUpload } from "@/lib/validation/schemas";

const validation = validateFileUpload(file);
if (!validation.valid) {
  return NextResponse.json({ error: validation.error }, { status: 400 });
}
```

### Secure File Upload Pattern

```typescript
export async function POST(req: Request) {
  const rateLimitResult = await rateLimitUpload(req);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  const user = await requireUser();

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const projectId = formData.get("projectId") as string;

  const validation = validateFileUpload(file);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  await assertProjectMember(user.id, projectId);

  // Upload file
  const key = `${projectId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  await uploadFile(key, buffer, file.type);

  // Save metadata
  const fileRecord = await prisma.file.create({
    data: {
      key,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      projectId,
      uploadedById: user.id,
    },
  });

  return NextResponse.json(fileRecord);
}
```

---

## REALTIME (SUPABASE)

### Secure Channel Names

```typescript
// Project channel
const channelName = `project:${projectId}`;

// Workspace channel
const channelName = `workspace:${workspaceId}`;

// DM channel (sorted user IDs)
const [userA, userB] = [userId1, userId2].sort();
const channelName = `dm:${userA}-${userB}`;

// Thread channel
const channelName = `thread:${parentMessageId}`;
```

### Broadcast from Server Only

```typescript
// In API route, after authorization check
const { createClient } = await import("@/lib/supabase/server");
const supabase = await createClient();

await supabase.channel(`project:${projectId}`).send({
  type: "broadcast",
  event: "task-updated",
  payload: { taskId, type: "UPDATED" },
});
```

---

## COMPLETE API ROUTE TEMPLATE

```typescript
import { NextResponse } from "next/server";
import {
  requireUser,
  assertProjectMember,
  handleGuardError,
} from "@/lib/auth/guards";
import {
  rateLimit,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";
import { taskCreateSchema } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Authentication
    const user = await requireUser();

    // 3. Input validation
    const body = await req.json();
    const data = taskCreateSchema.parse(body);

    // 4. Authorization
    await assertProjectMember(user.id, data.projectId);

    // 5. Business logic
    const task = await prisma.task.create({
      data: {
        ...data,
        creatorId: user.id,
      },
    });

    // 6. Broadcast update (non-blocking)
    (async () => {
      const { createClient } = await import("@/lib/supabase/server");
      const supabase = await createClient();
      await supabase.channel(`project:${data.projectId}`).send({
        type: "broadcast",
        event: "task-created",
        payload: { taskId: task.id },
      });
    })();

    // 7. Return response
    const response = NextResponse.json(task, { status: 201 });
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## COMMON PATTERNS

### Get Resource or 404

```typescript
const task = await prisma.task.findUnique({ where: { id: taskId } });
if (!task) {
  return NextResponse.json({ error: "Task not found" }, { status: 404 });
}
```

### Update with Optimistic Concurrency

```typescript
const task = await prisma.task.update({
  where: { id: taskId, updatedAt: body.lastUpdatedAt },
  data: { ...updates },
});
// If updatedAt doesn't match, Prisma throws P2025
```

### Soft Delete

```typescript
await prisma.task.update({
  where: { id: taskId },
  data: { deletedAt: new Date() },
});
```

---

## DATABASE QUERIES

### Fetch with RLS

RLS policies automatically filter results. No changes needed to queries:

```typescript
// RLS automatically filters to user's accessible workspaces
const workspaces = await prisma.workspace.findMany();

// RLS automatically filters to user's accessible projects
const projects = await prisma.project.findMany();
```

### Performance: Use Select Judiciously

```typescript
// Bad: Fetches all fields
const tasks = await prisma.task.findMany();

// Good: Fetch only needed fields
const tasks = await prisma.task.findMany({
  select: {
    id: true,
    title: true,
    status: true,
    assignee: {
      select: { id: true, name: true },
    },
  },
});
```

---

## TESTING

### Test Authentication

```typescript
// In Jest/Vitest
test("requires authentication", async () => {
  const response = await fetch("/api/tasks", { method: "GET" });
  expect(response.status).toBe(401);
});
```

### Test Authorization

```typescript
test("blocks cross-workspace access", async () => {
  const token = await loginAsUser("user-a@example.com");
  const response = await fetch("/api/projects?workspaceId=workspace-b-id", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(response.status).toBe(403);
});
```

### Test Rate Limiting

```typescript
test("enforces rate limit", async () => {
  const token = await loginAsUser("test@example.com");
  const requests = Array.from({ length: 101 }, () =>
    fetch("/api/workspaces", {
      headers: { Authorization: `Bearer ${token}` },
    }),
  );
  const responses = await Promise.all(requests);
  const rateLimited = responses.filter((r) => r.status === 429);
  expect(rateLimited.length).toBeGreaterThan(0);
});
```

---

## ENVIRONMENT VARIABLES

### Required for Security

```bash
# Database (via Supabase)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..." # Safe for client
SUPABASE_SERVICE_ROLE_KEY="eyJ..."    # NEVER expose to client

# Storage
SUPABASE_BUCKET_NAME="colab-task-manager"

# Cookies (production)
NODE_ENV="production" # Forces secure cookies
```

### Never Commit

- `.env`
- `.env.local`
- `.env.production`
- Any file with `SERVICE_ROLE_KEY`

---

## DEBUGGING

### Check Auth Status

```typescript
// In API route
console.log("User:", user?.id, user?.email);
console.log("Supabase ID:", user?.supabaseId);
```

### Check Authorization

```typescript
// Log membership checks
const membership = await prisma.projectMember.findFirst({
  where: { projectId, userId: user.id },
});
console.log("Project membership:", membership);
```

### Check Rate Limit

```typescript
const result = await rateLimit(req);
console.log("Rate limit:", result);
// { success: true/false, remaining: X, reset: timestamp }
```

---

## COMMON MISTAKES

### ❌ Don't Trust Client Input

```typescript
// BAD
const userId = body.userId; // Never trust this!

// GOOD
const user = await requireUser();
const userId = user.id;
```

### ❌ Don't Skip Authorization

```typescript
// BAD
const task = await prisma.task.findUnique({ where: { id: taskId } });
return NextResponse.json(task);

// GOOD
await assertCanAccessTask(user.id, taskId);
const task = await prisma.task.findUnique({ where: { id: taskId } });
```

### ❌ Don't Leak Error Details

```typescript
// BAD
return NextResponse.json({ error: error.message }, { status: 500 });

// GOOD
console.error(error); // Log internally
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
```

### ❌ Don't Forget Rate Limiting

```typescript
// BAD
export async function POST(req: Request) {
  const user = await requireUser();
  // ... create resource

// GOOD
export async function POST(req: Request) {
  const rateLimitResult = await rateLimit(req);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }
  // ... rest of handler
```

---

## RESOURCES

- [Full Implementation Guide](./SECURITY_IMPLEMENTATION.md)
- [Verification Tests](./SECURITY_VERIFICATION.md)
- [Production Rollout](./PRODUCTION_ROLLOUT.md)
- [Example Secure Route](./examples/secure-api-route-example.ts)
- [Threat Model](./SECURITY_AUDIT.md)
