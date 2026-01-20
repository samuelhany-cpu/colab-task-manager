# SECURITY IMPLEMENTATION GUIDE

## Step-by-Step Hardening Instructions

**Project:** Collaborative Task Manager  
**Target:** Production-Grade Security on Vercel + Supabase  
**Estimated Time:** 16-24 hours

---

## TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Phase 1: Database Security (RLS)](#phase-1-database-security-rls)
3. [Phase 2: Authentication & Authorization](#phase-2-authentication--authorization)
4. [Phase 3: API Route Hardening](#phase-3-api-route-hardening)
5. [Phase 4: File Security](#phase-4-file-security)
6. [Phase 5: Realtime Security](#phase-5-realtime-security)
7. [Phase 6: Rate Limiting](#phase-6-rate-limiting)
8. [Phase 7: Environment & Secrets](#phase-7-environment--secrets)
9. [Verification](#verification)
10. [Production Rollout](#production-rollout)

---

## PREREQUISITES

### Required Access

- [ ] Supabase project admin access
- [ ] Vercel project admin access
- [ ] GitHub repository write access
- [ ] Staging environment for testing

### Backup Checklist

- [ ] Database snapshot created
- [ ] Environment variables documented
- [ ] Current codebase tagged in git
- [ ] Rollback procedure documented

### Testing Environment

- [ ] Staging database with production clone
- [ ] Test user accounts created
- [ ] Test workspaces/projects/tasks populated

---

## PHASE 1: DATABASE SECURITY (RLS)

**CRITICAL:** This phase blocks all direct database access until policies are created.  
**Duration:** 2-3 hours  
**Risk:** HIGH - Can break application if not done correctly

### Step 1.1: Review RLS Policies

1. Open `supabase/rls-policies.sql`
2. Review each policy for your use case
3. Verify table names match your schema

### Step 1.2: Apply to Staging First

```sql
-- In Supabase SQL Editor (STAGING)

-- Step 1: Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
-- ... (see rls-policies.sql for full list)

-- Step 2: Create policies
-- Copy policies from rls-policies.sql, section by section

-- Step 3: Create indexes
-- Copy index creation statements
```

### Step 1.3: Test RLS in Staging

```typescript
// Create a test script: scripts/test-rls.ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Using anon key
);

async function testRLS() {
  // Test 1: Unauthenticated access should fail
  const { data, error } = await supabase.from("User").select("*");
  console.log("Unauth access:", { data, error }); // Should see error

  // Test 2: Authenticated access to own data should work
  await supabase.auth.signInWithPassword({
    email: "test@example.com",
    password: "testpassword",
  });

  const { data: userData } = await supabase.from("User").select("*");
  console.log("Auth access:", userData); // Should see only own user
}

testRLS();
```

### Step 1.4: Verify Policy Performance

```sql
-- Check slow queries caused by RLS
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM "Task"
WHERE "projectId" IN (
  SELECT "projectId" FROM "ProjectMember"
  WHERE "userId" = 'test-user-id'
);
```

### Step 1.5: Apply to Production

⚠️ **Production Deployment:**

```bash
# 1. Announce maintenance window (optional, minimal impact)
# 2. Apply RLS policies to production Supabase
# 3. Verify application still works
# 4. Monitor error logs for 24 hours
```

**Rollback:** If needed, disable RLS:

```sql
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
-- ... for all tables
```

---

## PHASE 2: AUTHENTICATION & AUTHORIZATION

**Duration:** 3-4 hours  
**Risk:** MEDIUM

### Step 2.1: Update Auth Helper (Already Created)

The file `lib/auth/guards.ts` provides:

- `requireUser()` - Require authentication
- `assertWorkspaceMember()` - Check workspace access
- `assertProjectMember()` - Check project access
- `assertCanDirectMessage()` - Validate DM authorization
- And more...

### Step 2.2: Update Existing API Routes (Example)

**Before (Vulnerable):**

```typescript
// app/api/tasks/[taskId]/route.ts
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const taskId = req.url.split("/").slice(-1)[0];
  const task = await prisma.task.findUnique({ where: { id: taskId } });

  return NextResponse.json(task); // ❌ No authorization check
}
```

**After (Secure):**

```typescript
// app/api/tasks/[taskId]/route.ts
import {
  requireUser,
  assertCanAccessTask,
  handleGuardError,
} from "@/lib/auth/guards";

export async function GET(
  req: Request,
  { params }: { params: { taskId: string } },
) {
  try {
    const user = await requireUser();
    await assertCanAccessTask(user.id, params.taskId);

    const task = await prisma.task.findUnique({
      where: { id: params.taskId },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    const result = handleGuardError(error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }
}
```

### Step 2.3: Harden Critical Routes

Priority order for updating routes:

1. **P0 - Immediate:**
   - `/api/chat/*` - Message endpoints
   - `/api/files/*` - File upload/download
   - `/api/tasks/*` - Task CRUD
   - `/api/projects/*` - Project management

2. **P1 - Important:**
   - `/api/messages/*` - Message operations
   - `/api/comments/*` - Comment operations
   - `/api/time/*` - Time tracking
   - `/api/workspaces/*` - Workspace management

3. **P2 - Cleanup:**
   - `/api/notifications/*`
   - `/api/search/*`
   - `/api/users/*`

### Step 2.4: DM Authorization Fix

**Critical Fix for Direct Messages:**

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const data = messageCreateSchema.parse(body);

    // NEW: Validate DM authorization
    if (data.receiverId) {
      await assertCanDirectMessage(user.id, data.receiverId);
    }

    // Validate other contexts
    if (data.workspaceId) {
      await assertWorkspaceMember(user.id, data.workspaceId);
    }
    if (data.projectId) {
      await assertProjectMember(user.id, data.projectId);
    }
    if (data.conversationId) {
      await assertConversationMember(user.id, data.conversationId);
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        ...data,
        senderId: user.id,
      },
    });

    return NextResponse.json(message, { status: 201 });
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

## PHASE 3: API ROUTE HARDENING

**Duration:** 4-6 hours  
**Risk:** LOW

### Step 3.1: Add Zod Validation

Use schemas from `lib/validation/schemas.ts`:

```typescript
import { taskCreateSchema } from "@/lib/validation/schemas";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = taskCreateSchema.parse(body); // Validates input

    // ... rest of handler
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 },
      );
    }
    throw error;
  }
}
```

### Step 3.2: Sanitize IDs

```typescript
import { sanitizeOptionalId } from "@/lib/auth/guards";

const body = await req.json();
const sanitized = {
  ...body,
  assigneeId: sanitizeOptionalId(body.assigneeId),
  projectId: sanitizeOptionalId(body.projectId),
};
```

### Step 3.3: Add Error Boundaries

Create `lib/api/error-handler.ts`:

```typescript
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/auth/guards";
import { Prisma } from "@prisma/client";

export function handleApiError(error: unknown): NextResponse {
  console.error("API Error:", error);

  // Zod validation errors
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.issues },
      { status: 400 },
    );
  }

  // Auth errors
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  if (error instanceof NotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "A record with this value already exists" },
        { status: 409 },
      );
    }
    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
  }

  // Generic error (don't leak details)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
```

Use in routes:

```typescript
export async function POST(req: Request) {
  try {
    // ... handler logic
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## PHASE 4: FILE SECURITY

**Duration:** 2-3 hours  
**Risk:** MEDIUM

### Step 4.1: Create Secure File Upload

```typescript
// app/api/files/route.ts (SECURE VERSION)
import { requireUser, assertProjectMember } from "@/lib/auth/guards";
import { validateFileUpload } from "@/lib/validation/schemas";
import { rateLimitUpload } from "@/lib/middleware/rate-limit";

export async function POST(req: Request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimitUpload(req);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Too many uploads" },
        { status: 429, headers: rateLimitResult.headers },
      );
    }

    // Authentication
    const user = await requireUser();

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const projectId = formData.get("projectId") as string;

    if (!file || !projectId) {
      return NextResponse.json(
        { error: "File and projectId required" },
        { status: 400 },
      );
    }

    // Validate file
    const validation = validateFileUpload(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Authorization
    await assertProjectMember(user.id, projectId);

    // Generate secure filename
    const ext = file.name.split(".").pop();
    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .substring(0, 200);
    const key = `${projectId}/${Date.now()}-${sanitizedName}`;

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await uploadFile(key, buffer, file.type);

    // Save metadata
    const fileRecord = await prisma.file.create({
      data: {
        key,
        originalName: sanitizedName,
        mimeType: file.type,
        size: file.size,
        projectId,
        uploadedById: user.id,
      },
    });

    return NextResponse.json(fileRecord, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Step 4.2: Secure File Download

```typescript
// app/api/files/[fileId]/download/route.ts
import { requireUser, assertCanAccessFile } from "@/lib/auth/guards";

export async function GET(
  req: Request,
  { params }: { params: { fileId: string } },
) {
  try {
    const user = await requireUser();
    await assertCanAccessFile(user.id, params.fileId);

    const file = await prisma.file.findUniqueOrThrow({
      where: { id: params.fileId },
    });

    // Generate short-lived signed URL (10 minutes)
    const signedUrl = await getDownloadUrl(file.key, 600);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Step 4.3: Configure Supabase Storage Policies

```sql
-- In Supabase SQL Editor

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated uploads to project folders only
CREATE POLICY "Users can upload to project folders"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'colab-task-manager'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT "projectId"::text
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- Allow project members to download files
CREATE POLICY "Project members can download files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'colab-task-manager'
  AND (storage.foldername(name))[1] IN (
    SELECT "projectId"::text
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);
```

---

## PHASE 5: REALTIME SECURITY

**Duration:** 2-3 hours  
**Risk:** HIGH

### Step 5.1: Server-Side Channel Validation

**Problem:** Client can currently subscribe to any channel.

**Solution:** Implement server-side authorization for Supabase Realtime.

### Step 5.2: Deterministic Channel Names

Update all channel subscriptions to use deterministic names:

```typescript
// BEFORE (Vulnerable)
const channel = supabase.channel('project:' + userInputProjectId);

// AFTER (Secure)
// Client subscribes to project channel
const channel = supabase.channel(`project:${projectId}`);

// Server validates BEFORE broadcasting
export async function POST(req: Request) {
  const user = await requireUser();
  const { projectId, message } = await req.json();

  // Validate user can access project
  await assertProjectMember(user.id, projectId);

  // Only THEN broadcast to channel
  await supabase.channel(`project:${projectId}`).send({
    type: 'broadcast',
    event: 'task-updated',
    payload: { ... }
  });
}
```

### Step 5.3: Supabase Realtime Authorization

Configure Realtime policies in Supabase Dashboard:

```javascript
// Supabase Realtime Authorization Function
// (Configure in Supabase Dashboard > Database > Realtime)

async function canSubscribe(channelName, userId) {
  // Extract channel type and ID
  const [type, id] = channelName.split(":");

  switch (type) {
    case "project":
      // Check if user is project member
      const { data } = await supabase
        .from("ProjectMember")
        .select("id")
        .eq("projectId", id)
        .eq("userId", userId)
        .single();
      return !!data;

    case "workspace":
      // Check if user is workspace member
      const { data: wData } = await supabase
        .from("WorkspaceMember")
        .select("id")
        .eq("workspaceId", id)
        .eq("userId", userId)
        .single();
      return !!wData;

    case "dm":
      // Check if user is part of DM
      const [user1, user2] = id.split("-");
      return userId === user1 || userId === user2;

    default:
      return false;
  }
}
```

### Step 5.4: DM Channel Naming Convention

```typescript
// Ensure consistent DM channel naming
function getDMChannelName(userId1: string, userId2: string): string {
  // Always sort user IDs to ensure same channel name
  const [userA, userB] = [userId1, userId2].sort();
  return `dm:${userA}-${userB}`;
}

// Usage:
const channelName = getDMChannelName(currentUser.id, recipientId);
const channel = supabase.channel(channelName);
```

---

## PHASE 6: RATE LIMITING

**Duration:** 2-3 hours  
**Risk:** LOW

### Step 6.1: Apply Rate Limiting to Routes

The `lib/middleware/rate-limit.ts` file provides:

- `rateLimit()` - Default (100 req/min)
- `rateLimitAuth()` - Auth routes (5 req/min)
- `rateLimitChat()` - Chat (30 msg/min)
- `rateLimitUpload()` - Uploads (10/min)
- `rateLimitSearch()` - Search (20/min)
- `rateLimitInteraction()` - Comments/reactions (50/min)

**Apply to routes:**

```typescript
// app/api/chat/route.ts
import {
  rateLimitChat,
  createRateLimitResponse,
} from "@/lib/middleware/rate-limit";

export async function POST(req: Request) {
  // Check rate limit
  const rateLimitResult = await rateLimitChat(req);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  // ... rest of handler
}
```

### Step 6.2: Add Anti-Spam Checks

```typescript
import { isSpamContent, checkBurstSpam } from "@/lib/middleware/rate-limit";

export async function POST(req: Request) {
  const user = await requireUser();
  const { content } = await req.json();

  // Check for spam content
  if (isSpamContent(content)) {
    return NextResponse.json(
      { error: "Message detected as spam" },
      { status: 400 },
    );
  }

  // Check for burst spam (too many messages too quickly)
  const isBurstSpam = await checkBurstSpam(user.id);
  if (isBurstSpam) {
    return NextResponse.json(
      { error: "Sending messages too quickly" },
      { status: 429 },
    );
  }

  // ... create message
}
```

### Step 6.3: Monitor Rate Limits

Add logging to track rate limit hits:

```typescript
// In rate-limit.ts
if (!result.success) {
  console.warn("Rate limit exceeded:", {
    identifier,
    endpoint: req.url,
    timestamp: new Date().toISOString(),
  });
}
```

---

## PHASE 7: ENVIRONMENT & SECRETS

**Duration:** 1-2 hours  
**Risk:** LOW

### Step 7.1: Audit Environment Variables

Create `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGc..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGc..." # NEVER expose to client
SUPABASE_BUCKET_NAME="colab-task-manager"

# NextAuth (if used)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Email
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASSWORD="SG.xxx"
SMTP_FROM="noreply@yourdomain.com"
```

### Step 7.2: Verify Secrets Not in Git

```bash
# Check git history for leaked secrets
git log --all --full-history -- .env .env.local .env.production

# Use git-secrets to prevent future leaks
git secrets --install
git secrets --register-aws  # Detects AWS keys
git secrets --add 'SUPABASE_SERVICE_ROLE_KEY'
```

### Step 7.3: Secure Cookies on Vercel

Verify middleware sets secure cookies:

```typescript
// lib/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Force secure flags in production
          const secureOptions = {
            ...options,
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
            sameSite: "lax" as const,
          };
          response.cookies.set(name, value, secureOptions);
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set(name, "", { ...options, maxAge: 0 });
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}
```

---

## VERIFICATION

See `SECURITY_VERIFICATION.md` for complete test suite.

### Quick Smoke Tests

```bash
# Test authentication
curl -X GET http://localhost:3000/api/tasks \
  -H "Content-Type: application/json"
# Expected: 401 Unauthorized

# Test authorization
curl -X GET http://localhost:3000/api/tasks/invalid-task-id \
  -H "Authorization: Bearer <valid-token>"
# Expected: 403 Forbidden or 404 Not Found

# Test rate limiting
for i in {1..101}; do
  curl -X GET http://localhost:3000/api/workspaces
done
# Expected: 429 Too Many Requests after 100 requests
```

---

## PRODUCTION ROLLOUT

### Pre-Deployment Checklist

- [ ] All phases tested in staging
- [ ] RLS policies verified
- [ ] Rate limits tested
- [ ] File uploads/downloads working
- [ ] Realtime channels validated
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Monitoring enabled

### Deployment Order

1. **Deploy Database Changes First**
   - Apply RLS policies to production Supabase
   - Verify application still works with existing code
   - Monitor for errors

2. **Deploy Code Changes**
   - Deploy updated API routes to Vercel
   - Enable gradual rollout if possible
   - Monitor error rates

3. **Enable Rate Limiting**
   - Start with lenient limits
   - Gradually tighten based on usage patterns

4. **Monitor for 48 Hours**
   - Watch error logs
   - Monitor performance metrics
   - Check for auth issues

### Emergency Rollback

If critical issues arise:

```bash
# 1. Revert code deployment in Vercel
vercel rollback

# 2. Disable RLS (if absolutely necessary)
# In Supabase SQL Editor:
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" DISABLE ROW LEVEL SECURITY;
# ... for all affected tables

# 3. Investigate root cause
# 4. Fix and redeploy
```

---

## NEXT STEPS

1. Review this guide with your team
2. Set up staging environment
3. Begin Phase 1 (RLS) in staging
4. Test each phase thoroughly
5. Deploy to production incrementally
6. Monitor and iterate

**Questions? Issues?** Document them in `SECURITY_ISSUES.md` for team review.

---

## ADDITIONAL RESOURCES

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/authentication)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Vercel Security](https://vercel.com/docs/security)
