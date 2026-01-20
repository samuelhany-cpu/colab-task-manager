# API ROUTE MIGRATION CHECKLIST

## Systematic Guide to Hardening Existing Routes

This checklist helps you systematically update each API route to include all security measures.

---

## ROUTE INVENTORY

First, create an inventory of all routes that need updating:

```bash
# List all API routes
find app/api -name "route.ts" | sort

# Count total routes
find app/api -name "route.ts" | wc -l
```

---

## PRIORITY CLASSIFICATION

### P0 - Critical (Update First)

Routes handling sensitive data or high-risk operations:

- [ ] `/api/auth/*` - Authentication endpoints
- [ ] `/api/chat` - Message creation
- [ ] `/api/files` - File upload/download
- [ ] `/api/tasks` - Task CRUD
- [ ] `/api/projects` - Project management
- [ ] `/api/workspaces` - Workspace management
- [ ] `/api/messages/*` - Message operations

### P1 - Important (Update Next)

Routes with moderate risk:

- [ ] `/api/comments/*` - Comment operations
- [ ] `/api/time/*` - Time tracking
- [ ] `/api/subtasks/*` - Subtask operations
- [ ] `/api/conversations/*` - Group chat
- [ ] `/api/notifications/*` - Notification management

### P2 - Standard (Update Last)

Lower-risk routes:

- [ ] `/api/search` - Search functionality
- [ ] `/api/users/*` - User profile reads
- [ ] `/api/workspaces/[slug]/dashboard` - Dashboard data

---

## MIGRATION TEMPLATE

For each route, follow this checklist:

### Route: `___________________________`

**File:** `_____________________________`

#### Phase 1: Analysis

- [ ] Document current authentication method
- [ ] Document current authorization checks (if any)
- [ ] Identify all resources accessed
- [ ] Note any file operations
- [ ] Note any realtime broadcasts

#### Phase 2: Authentication

- [ ] Replace `getCurrentUser()` with `requireUser()`
- [ ] Remove manual `if (!user)` checks (handled by requireUser)
- [ ] Add try-catch block for error handling

**Before:**

```typescript
const user = await getCurrentUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
```

**After:**

```typescript
try {
  const user = await requireUser();
  // ...
} catch (error) {
  return handleApiError(error);
}
```

#### Phase 3: Authorization

- [ ] Add workspace membership check if needed
  - `await assertWorkspaceMember(user.id, workspaceId);`
- [ ] Add project membership check if needed
  - `await assertProjectMember(user.id, projectId);`
- [ ] Add task access check if needed
  - `await assertCanAccessTask(user.id, taskId);`
- [ ] Add file access check if needed
  - `await assertCanAccessFile(user.id, fileId);`
- [ ] Add DM authorization if handling direct messages
  - `await assertCanDirectMessage(senderId, receiverId);`
- [ ] Add conversation membership check if needed
  - `await assertConversationMember(user.id, conversationId);`

#### Phase 4: Input Validation

- [ ] Identify appropriate Zod schema
- [ ] Replace manual validation with schema.parse()
- [ ] Handle ZodError in catch block
- [ ] Sanitize optional IDs

**Before:**

```typescript
const body = await req.json();
if (!body.title) {
  return NextResponse.json({ error: "Title required" }, { status: 400 });
}
```

**After:**

```typescript
const body = await req.json();
const data = taskCreateSchema.parse(body); // Throws if invalid
```

#### Phase 5: Rate Limiting

- [ ] Determine appropriate rate limit type
- [ ] Add rate limit check at start of handler
- [ ] Return 429 response if rate limit exceeded
- [ ] Add rate limit headers to successful response

**Add:**

```typescript
const rateLimitResult = await rateLimit(req); // or rateLimitChat, rateLimitUpload, etc.
if (!rateLimitResult.success) {
  return createRateLimitResponse(rateLimitResult);
}
```

#### Phase 6: Error Handling

- [ ] Wrap entire handler in try-catch
- [ ] Use `handleApiError(error)` in catch block
- [ ] Remove manual error handling for common errors
- [ ] Log unexpected errors for monitoring

#### Phase 7: Security Enhancements

- [ ] Remove any `userId` from request body (use `user.id` from requireUser)
- [ ] Sanitize file paths if handling files
- [ ] Validate enum values explicitly
- [ ] Check for SQL injection vulnerabilities (should be handled by Prisma)
- [ ] Verify no sensitive data in logs

#### Phase 8: Testing

- [ ] Test unauthenticated access (expect 401)
- [ ] Test unauthorized access (expect 403)
- [ ] Test with invalid input (expect 400)
- [ ] Test rate limiting (expect 429 after threshold)
- [ ] Test happy path (expect success)
- [ ] Verify no data leaks in responses

#### Phase 9: Documentation

- [ ] Document route in API docs (if applicable)
- [ ] Add JSDoc comments to handler
- [ ] Note any breaking changes

---

## EXAMPLE MIGRATION

### Before (Vulnerable)

```typescript
// app/api/tasks/[taskId]/comments/route.ts
import { getCurrentUser } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: { taskId: string } },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.content) {
    return NextResponse.json({ error: "Content required" }, { status: 400 });
  }

  const comment = await prisma.comment.create({
    data: {
      content: body.content,
      taskId: params.taskId,
      authorId: user.id,
    },
  });

  return NextResponse.json(comment, { status: 201 });
}
```

**Issues:**

- ❌ No authorization check (can comment on any task)
- ❌ No input validation (content length unchecked)
- ❌ No rate limiting (can spam comments)
- ❌ No error handling
- ❌ No spam detection

---

### After (Secure)

```typescript
// app/api/tasks/[taskId]/comments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireUser,
  assertCanAccessTask,
  handleGuardError,
} from "@/lib/auth/guards";
import {
  rateLimitInteraction,
  createRateLimitResponse,
  isSpamContent,
} from "@/lib/middleware/rate-limit";
import { commentCreateSchema } from "@/lib/validation/schemas";
import { handleApiError } from "@/lib/api/error-handler";

export async function POST(
  req: Request,
  { params }: { params: { taskId: string } },
) {
  try {
    // 1. Rate limiting
    const rateLimitResult = await rateLimitInteraction(req);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    // 2. Authentication
    const user = await requireUser();

    // 3. Authorization
    await assertCanAccessTask(user.id, params.taskId);

    // 4. Input validation
    const body = await req.json();
    const data = commentCreateSchema.parse(body);

    // 5. Spam detection
    if (isSpamContent(data.content)) {
      return NextResponse.json(
        { error: "Comment detected as spam" },
        { status: 400 },
      );
    }

    // 6. Business logic
    const comment = await prisma.comment.create({
      data: {
        content: data.content,
        taskId: params.taskId,
        authorId: user.id,
      },
      include: {
        author: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    // 7. Activity log
    await prisma.activity.create({
      data: {
        type: "COMMENT_ADDED",
        taskId: params.taskId,
        userId: user.id,
      },
    });

    // 8. Broadcast update (non-blocking)
    (async () => {
      try {
        const task = await prisma.task.findUnique({
          where: { id: params.taskId },
          select: { projectId: true },
        });
        if (task) {
          const { createClient } = await import("@/lib/supabase/server");
          const supabase = await createClient();
          await supabase.channel(`project:${task.projectId}`).send({
            type: "broadcast",
            event: "comment-added",
            payload: { taskId: params.taskId, commentId: comment.id },
          });
        }
      } catch (broadcastError) {
        console.error("Broadcast failed:", broadcastError);
      }
    })();

    // 9. Return response with rate limit headers
    const response = NextResponse.json(comment, { status: 201 });
    Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Improvements:**

- ✅ Authorization: Checks task access via project membership
- ✅ Input validation: Zod schema validates content
- ✅ Rate limiting: 50 interactions/min
- ✅ Spam detection: Filters spam content
- ✅ Error handling: Centralized with handleApiError
- ✅ Activity log: Tracks comment creation
- ✅ Realtime: Broadcasts to project channel

---

## BULK MIGRATION SCRIPT

Create a script to help identify routes needing updates:

```bash
#!/bin/bash
# scripts/audit-routes.sh

echo "=== API Route Security Audit ==="
echo ""

echo "Routes WITHOUT requireUser:"
grep -L "requireUser" app/api/**/route.ts | while read file; do
  echo "  ⚠️  $file"
done

echo ""
echo "Routes WITHOUT rate limiting:"
grep -L "rateLimit" app/api/**/route.ts | while read file; do
  echo "  ⚠️  $file"
done

echo ""
echo "Routes WITHOUT Zod validation:"
grep -L "\.parse(" app/api/**/route.ts | while read file; do
  echo "  ⚠️  $file"
done

echo ""
echo "Routes WITH getCurrentUser (should use requireUser):"
grep -l "getCurrentUser" app/api/**/route.ts | while read file; do
  echo "  ℹ️  $file"
done
```

---

## TRACKING PROGRESS

Use this table to track migration progress:

| Route           | File           | P   | Auth | Authz | Valid | Rate | Error | Test | Status |
| --------------- | -------------- | --- | ---- | ----- | ----- | ---- | ----- | ---- | ------ |
| POST /api/tasks | tasks/route.ts | P0  | ✅   | ✅    | ✅    | ✅   | ✅    | ✅   | DONE   |
| GET /api/tasks  | tasks/route.ts | P0  | ✅   | ✅    | N/A   | ✅   | ✅    | ✅   | DONE   |
| POST /api/chat  | chat/route.ts  | P0  | ⏳   | ⏳    | ⏳    | ⏳   | ⏳    | ❌   | TODO   |
| ...             | ...            | ... | ...  | ...   | ...   | ...  | ...   | ...  | ...    |

**Legend:**

- **P:** Priority (P0/P1/P2)
- **Auth:** Authentication with `requireUser()`
- **Authz:** Authorization checks
- **Valid:** Input validation with Zod
- **Rate:** Rate limiting
- **Error:** Error handling
- **Test:** Tested
- **Status:** DONE / TODO / IN PROGRESS

---

## VERIFICATION CHECKLIST

After migrating each route:

### Functional Tests

- [ ] Route works as before (no broken functionality)
- [ ] All query parameters handled correctly
- [ ] All request body fields processed
- [ ] Response format unchanged (or documented)

### Security Tests

- [ ] Returns 401 without authentication
- [ ] Returns 403 for unauthorized access
- [ ] Returns 400 for invalid input
- [ ] Returns 429 when rate limit exceeded
- [ ] No sensitive data in error messages
- [ ] No SQL injection possible
- [ ] No XSS vulnerabilities

### Performance Tests

- [ ] Response time similar to before (<10% increase)
- [ ] No N+1 query issues
- [ ] Database queries optimized
- [ ] Rate limit overhead acceptable

---

## COMMON MIGRATION PATTERNS

### Pattern 1: Simple GET Route

```typescript
// Before
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await prisma.resource.findMany({ where: { userId: user.id } });
  return NextResponse.json(data);
}

// After
export async function GET(req: Request) {
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success)
      return createRateLimitResponse(rateLimitResult);

    const user = await requireUser();
    const data = await prisma.resource.findMany({ where: { userId: user.id } });

    const response = NextResponse.json(data);
    Object.entries(rateLimitResult.headers).forEach(([k, v]) =>
      response.headers.set(k, v),
    );
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Pattern 2: POST with Validation

```typescript
// Before
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (!body.name)
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  const data = await prisma.resource.create({
    data: { ...body, userId: user.id },
  });
  return NextResponse.json(data);
}

// After
export async function POST(req: Request) {
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success)
      return createRateLimitResponse(rateLimitResult);

    const user = await requireUser();
    const body = await req.json();
    const data = resourceCreateSchema.parse(body);

    const result = await prisma.resource.create({
      data: { ...data, userId: user.id },
    });

    const response = NextResponse.json(result, { status: 201 });
    Object.entries(rateLimitResult.headers).forEach(([k, v]) =>
      response.headers.set(k, v),
    );
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Pattern 3: Resource with Authorization

```typescript
// Before
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const resource = await prisma.resource.findUnique({
    where: { id: params.id },
  });
  return NextResponse.json(resource);
}

// After
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const rateLimitResult = await rateLimit(req);
    if (!rateLimitResult.success)
      return createRateLimitResponse(rateLimitResult);

    const user = await requireUser();
    await assertCanAccessResource(user.id, params.id); // Custom guard

    const resource = await prisma.resource.findUnique({
      where: { id: params.id },
    });

    const response = NextResponse.json(resource);
    Object.entries(rateLimitResult.headers).forEach(([k, v]) =>
      response.headers.set(k, v),
    );
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## MIGRATION ESTIMATION

**Time per route (average):**

- Simple GET/POST: 15-30 minutes
- Complex CRUD: 30-60 minutes
- File operations: 45-90 minutes

**Total time estimate:**

- 38 routes × 30 min average = **19 hours**
- Add 20% buffer = **~24 hours total**

**Recommended approach:**

- Migrate 5-10 routes per day
- Complete P0 routes in first 2 days
- Complete P1 routes in next 2 days
- Complete P2 routes in final day

---

## QUESTIONS & ISSUES

If you encounter issues during migration:

1. **Check the examples:** See `examples/secure-api-route-example.ts`
2. **Review the quick reference:** See `SECURITY_QUICK_REFERENCE.md`
3. **Test incrementally:** Test after each change
4. **Document blockers:** Note any issues for team review
5. **Don't skip security:** Better to take more time than skip checks

**Common issues:**

- **Can't identify resource owner:** Add authorization guard at resource fetch
- **Multiple contexts (workspace + project):** Check both memberships
- **Complex permissions:** Create custom guard function
- **Performance concerns:** Profile query and add indexes

---

## COMPLETION CRITERIA

Migration is complete when:

- [ ] All routes have authentication
- [ ] All routes have appropriate authorization
- [ ] All routes have input validation
- [ ] All routes have rate limiting
- [ ] All routes have error handling
- [ ] All routes tested
- [ ] No security warnings in audit
- [ ] Documentation updated
