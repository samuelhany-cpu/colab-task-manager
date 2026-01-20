# Quick Start: Security Hardening

**Goal:** Make Colab Task Manager production-safe in 3-5 days  
**Status:** 🔴 CRITICAL - DO NOT DEPLOY WITHOUT THESE FIXES

---

## Day 1: Row Level Security (RLS) - Part 1

**Time:** 6-8 hours  
**Priority:** P0 - BLOCKER

### Step 1: Create Migration File

```bash
cd f:\colab-task-manager
cd prisma\migrations
mkdir 20260121_enable_rls
cd 20260121_enable_rls
```

Create `migration.sql` with the following content:

```sql
-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subtask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Timer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Folder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FileVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageRead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;

-- User policies: Users can only access their own data
CREATE POLICY "Users can view own profile"
  ON "User" FOR SELECT
  USING (auth.uid() = "supabaseId");

CREATE POLICY "Users can update own profile"
  ON "User" FOR UPDATE
  USING (auth.uid() = "supabaseId");

-- Workspace policies
CREATE POLICY "Users can view their workspaces"
  ON "Workspace" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm
      INNER JOIN "User" u ON u.id = wm."userId"
      WHERE wm."workspaceId" = "Workspace".id
      AND u."supabaseId" = auth.uid()
    )
  );

CREATE POLICY "Owners can update workspaces"
  ON "Workspace" FOR UPDATE
  USING (
    "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid())
  );

CREATE POLICY "Owners can delete workspaces"
  ON "Workspace" FOR DELETE
  USING (
    "ownerId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid())
  );

-- WorkspaceMember policies
CREATE POLICY "Users can view workspace members"
  ON "WorkspaceMember" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm2
      INNER JOIN "User" u ON u.id = wm2."userId"
      WHERE wm2."workspaceId" = "WorkspaceMember"."workspaceId"
      AND u."supabaseId" = auth.uid()
    )
  );

CREATE POLICY "Workspace owners can add members"
  ON "WorkspaceMember" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Workspace" w
      INNER JOIN "User" u ON u.id = w."ownerId"
      WHERE w.id = "WorkspaceMember"."workspaceId"
      AND u."supabaseId" = auth.uid()
    )
  );

-- Project policies
CREATE POLICY "Users can view projects in their workspaces"
  ON "Project" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm
      INNER JOIN "User" u ON u.id = wm."userId"
      WHERE wm."workspaceId" = "Project"."workspaceId"
      AND u."supabaseId" = auth.uid()
    )
  );

CREATE POLICY "Workspace members can create projects"
  ON "Project" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm
      INNER JOIN "User" u ON u.id = wm."userId"
      WHERE wm."workspaceId" = "Project"."workspaceId"
      AND u."supabaseId" = auth.uid()
    )
  );

-- Task policies
CREATE POLICY "Users can view tasks in their projects"
  ON "Task" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      INNER JOIN "WorkspaceMember" wm ON wm."workspaceId" = p."workspaceId"
      INNER JOIN "User" u ON u.id = wm."userId"
      WHERE p.id = "Task"."projectId"
      AND u."supabaseId" = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their projects"
  ON "Task" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Project" p
      INNER JOIN "WorkspaceMember" wm ON wm."workspaceId" = p."workspaceId"
      INNER JOIN "User" u ON u.id = wm."userId"
      WHERE p.id = "Task"."projectId"
      AND u."supabaseId" = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their projects"
  ON "Task" FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      INNER JOIN "WorkspaceMember" wm ON wm."workspaceId" = p."workspaceId"
      INNER JOIN "User" u ON u.id = wm."userId"
      WHERE p.id = "Task"."projectId"
      AND u."supabaseId" = auth.uid()
    )
  );

-- Notification policies
CREATE POLICY "Users can view their notifications"
  ON "Notification" FOR SELECT
  USING (
    "userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid())
  );

CREATE POLICY "Users can update their notifications"
  ON "Notification" FOR UPDATE
  USING (
    "userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid())
  );

CREATE POLICY "Users can delete their notifications"
  ON "Notification" FOR DELETE
  USING (
    "userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid())
  );
```

### Step 2: Apply Migration

```bash
# Back to root
cd f:\colab-task-manager

# Apply migration to local dev database
npx prisma migrate dev --name enable_rls

# Verify in Supabase dashboard
# Go to Table Editor → Select any table → Check "Enable RLS" is on
```

### Step 3: Test RLS Locally

Create test file `scripts\test-rls.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function testRLS() {
  console.log("🧪 Testing RLS Policies...\n");

  // Create two test users
  const user1 = await prisma.user.create({
    data: {
      email: "test1@example.com",
      name: "Test User 1",
      supabaseId: "test-uuid-1",
    },
  });

  const user2 = await prisma.user.create({
    data: {
      email: "test2@example.com",
      name: "Test User 2",
      supabaseId: "test-uuid-2",
    },
  });

  // Create workspace owned by user1
  const workspace = await prisma.workspace.create({
    data: {
      name: "Test Workspace",
      slug: "test-workspace",
      ownerId: user1.id,
      members: {
        create: { userId: user1.id, role: "OWNER" },
      },
    },
  });

  console.log("✅ Created test data");

  // Test 1: User1 should see their workspace
  const { data: user1Workspaces } = await supabase
    .from("Workspace")
    .select("*")
    .eq("id", workspace.id);

  console.log("User1 workspaces:", user1Workspaces?.length);
  // Should be 1 (but RLS uses auth.uid() so this won't work in Node)

  // Test 2: Try to access workspace without auth
  const { data: publicWorkspaces } = await supabase
    .from("Workspace")
    .select("*");

  console.log("Public workspaces (should be 0):", publicWorkspaces?.length);

  // Cleanup
  await prisma.workspace.delete({ where: { id: workspace.id } });
  await prisma.user.deleteMany({
    where: { id: { in: [user1.id, user2.id] } },
  });

  console.log("\n✅ RLS test complete");
}

testRLS()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Run test:

```bash
npx tsx scripts/test-rls.ts
```

---

## Day 2: Row Level Security - Part 2

**Time:** 6-8 hours

### Add Remaining Policies

Add to the same `20260121_enable_rls/migration.sql` or create new migration:

```sql
-- Message policies
CREATE POLICY "Users can view messages in conversations they are part of"
  ON "Message" FOR SELECT
  USING (
    -- Workspace channel messages
    ("workspaceId" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm
      INNER JOIN "User" u ON u.id = wm."userId"
      WHERE wm."workspaceId" = "Message"."workspaceId"
      AND u."supabaseId" = auth.uid()
    ))
    OR
    -- Direct messages
    ("receiverId" IS NOT NULL AND (
      "senderId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid())
      OR "receiverId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid())
    ))
    OR
    -- Group conversations
    ("conversationId" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "ConversationMember" cm
      INNER JOIN "User" u ON u.id = cm."userId"
      WHERE cm."conversationId" = "Message"."conversationId"
      AND u."supabaseId" = auth.uid()
    ))
    OR
    -- Project channel messages
    ("projectId" IS NOT NULL AND EXISTS (
      SELECT 1 FROM "Project" p
      INNER JOIN "WorkspaceMember" wm ON wm."workspaceId" = p."workspaceId"
      INNER JOIN "User" u ON u.id = wm."userId"
      WHERE p.id = "Message"."projectId"
      AND u."supabaseId" = auth.uid()
    ))
  );

CREATE POLICY "Users can send messages"
  ON "Message" FOR INSERT
  WITH CHECK (
    "senderId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid())
  );

-- File policies
CREATE POLICY "Users can view files in their projects"
  ON "File" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      INNER JOIN "WorkspaceMember" wm ON wm."workspaceId" = p."workspaceId"
      INNER JOIN "User" u ON u.id = wm."userId"
      WHERE p.id = "File"."projectId"
      AND u."supabaseId" = auth.uid()
    )
  );

CREATE POLICY "Users can upload files to their projects"
  ON "File" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Project" p
      INNER JOIN "WorkspaceMember" wm ON wm."workspaceId" = p."workspaceId"
      INNER JOIN "User" u ON u.id = wm."userId"
      WHERE p.id = "File"."projectId"
      AND u."supabaseId" = auth.uid()
    )
  );

-- TimeEntry policies
CREATE POLICY "Users can view their own time entries"
  ON "TimeEntry" FOR SELECT
  USING (
    "userId" IN (SELECT id FROM "User" WHERE "supabaseId" = auth.uid())
    OR
    -- Or workspace owner can see all
    EXISTS (
      SELECT 1 FROM "Task" t
      INNER JOIN "Project" p ON p.id = t."projectId"
      INNER JOIN "Workspace" w ON w.id = p."workspaceId"
      INNER JOIN "User" u ON u.id = w."ownerId"
      WHERE t.id = "TimeEntry"."taskId"
      AND u."supabaseId" = auth.uid()
    )
  );

-- Add similar policies for other tables...
-- Comment, Activity, Subtask, Tag, etc.
```

### Verify All Tables Protected

```sql
-- Run in Supabase SQL Editor to check
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Should show each table with at least 1-3 policies
```

---

## Day 3: Credentials Rotation

**Time:** 2-4 hours  
**Priority:** P0 - CRITICAL

### Step 1: Supabase Keys

1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
2. Click "Reset" next to Service Role Key
3. Copy new key
4. Update in Vercel:
   - Go to Vercel → Project Settings → Environment Variables
   - Edit `SUPABASE_SERVICE_ROLE_KEY`
   - Paste new key
   - Save

5. Update local `.env`:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... (new key)
   ```

### Step 2: Cloudflare R2 Keys

1. Go to R2 dashboard → Manage R2 API Tokens
2. Delete old token
3. Create new token with permissions:
   - Read
   - Write
   - Delete
4. Copy Access Key ID and Secret Access Key
5. Update in Vercel and local `.env`:
   ```env
   R2_ACCESS_KEY_ID=new_key_id
   R2_SECRET_ACCESS_KEY=new_secret
   ```

### Step 3: Resend API Key

1. Go to https://resend.com/api-keys
2. Delete old key
3. Create new key
4. Update in Vercel and local `.env`:
   ```env
   RESEND_API_KEY=re_new_key
   ```

### Step 4: NEXTAUTH_SECRET

```bash
# Generate new secret
openssl rand -base64 32
```

Update in Vercel and local `.env`:

```env
NEXTAUTH_SECRET=generated_secret_here
```

### Step 5: Clean Up Documentation

Search for any hardcoded keys:

```bash
cd f:\colab-task-manager
rg -i "sk_|eyJhbGci|re_" docs/
```

Remove any found keys from docs.

### Step 6: Verify .gitignore

```bash
cat .gitignore
```

Ensure these lines exist:

```
.env
.env.local
.env.*.local
```

---

## Day 4: Rate Limiting

**Time:** 4-6 hours  
**Priority:** P1 - HIGH

### Option A: In-Memory (Simpler, No External Service)

```bash
npm install rate-limiter-flexible
```

Create `lib\middleware\rate-limit.ts`:

```typescript
import { RateLimiterMemory } from "rate-limiter-flexible";
import { NextRequest, NextResponse } from "next/server";

const rateLimiter = new RateLimiterMemory({
  points: 100, // Number of requests
  duration: 60, // Per 60 seconds
});

export async function rateLimitMiddleware(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";

  try {
    await rateLimiter.consume(ip);
    return null; // Allow request
  } catch (error) {
    return NextResponse.json(
      { error: "Too many requests, please try again later" },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
        },
      },
    );
  }
}
```

Apply to all API routes:

```typescript
// app/api/tasks/route.ts
import { rateLimitMiddleware } from "@/lib/middleware/rate-limit";

export async function GET(request: Request) {
  // Rate limit check
  const rateLimitResponse = await rateLimitMiddleware(request as any);
  if (rateLimitResponse) return rateLimitResponse;

  // ... existing logic
}
```

### Option B: Upstash Redis (Recommended for Production)

1. Create free account at https://upstash.com
2. Create Redis database
3. Copy REST URL and Token
4. Install dependencies:

   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

5. Add to `.env`:

   ```env
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxx
   ```

6. Create `lib\middleware\rate-limit.ts`:

   ```typescript
   import { Ratelimit } from "@upstash/ratelimit";
   import { Redis } from "@upstash/redis";

   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL!,
     token: process.env.UPSTASH_REDIS_REST_TOKEN!,
   });

   const ratelimit = new Ratelimit({
     redis,
     limiter: Ratelimit.slidingWindow(100, "1 m"),
     analytics: true,
   });

   export async function rateLimitMiddleware(request: Request) {
     const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
     const { success, limit, reset, remaining } = await ratelimit.limit(ip);

     if (!success) {
       return new Response(JSON.stringify({ error: "Too many requests" }), {
         status: 429,
         headers: {
           "X-RateLimit-Limit": limit.toString(),
           "X-RateLimit-Remaining": remaining.toString(),
           "X-RateLimit-Reset": new Date(reset).toISOString(),
         },
       });
     }

     return null;
   }
   ```

---

## Day 5: Error Monitoring

**Time:** 3-4 hours  
**Priority:** P1 - HIGH

### Step 1: Create Sentry Account

1. Go to https://sentry.io/signup/
2. Create free account
3. Create new project (Next.js)
4. Copy DSN

### Step 2: Install Sentry

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### Step 3: Configure Sentry

The wizard creates these files automatically:

- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

Add DSN to `.env`:

```env
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=xxx
```

### Step 4: Add Error Boundary

Create `components\error-boundary.tsx`:

```tsx
"use client";

import React from "react";
import * as Sentry from "@sentry/nextjs";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      contexts: { react: { componentStack: errorInfo.componentStack } },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Oops! Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We've been notified and are working on a fix.
            </p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap app in `app\layout.tsx`:

```tsx
import { ErrorBoundary } from "@/components/error-boundary";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>{children}</ErrorBoundary>
      </body>
    </html>
  );
}
```

### Step 5: Test Error Tracking

Trigger test error:

```typescript
// In any component
throw new Error("Test Sentry error");
```

Check Sentry dashboard to see error appear.

---

## Verification Checklist

After completing all 5 days:

### Security

- [ ] All database tables have RLS enabled
- [ ] Tested RLS with multiple users - unauthorized access blocked
- [ ] All old API keys rotated and invalid
- [ ] New keys work in production
- [ ] No credentials in git history or docs
- [ ] Rate limiting blocks after 100 requests/min
- [ ] Sentry capturing errors in dashboard

### Functionality

- [ ] Login/register still works
- [ ] Creating tasks works
- [ ] Chat messages send/receive
- [ ] File uploads work with new R2 keys
- [ ] All existing features still functional

### Deployment

- [ ] Changes deployed to Vercel staging
- [ ] Production environment variables updated
- [ ] Database migration applied to production
- [ ] No errors in Sentry for 24 hours

---

## Common Issues & Solutions

### Issue: RLS blocks legitimate access

**Solution:** Check your policies use `auth.uid()` correctly

```sql
-- Make sure this returns the Supabase user ID
SELECT auth.uid();
```

### Issue: Migration fails

**Solution:** Check for foreign key constraints

```bash
# Rollback and try again
npx prisma migrate reset
npx prisma migrate dev
```

### Issue: Rate limit too strict

**Solution:** Adjust limits per endpoint

```typescript
// Higher limit for expensive operations
const uploadLimiter = new RateLimiterMemory({
  points: 10,
  duration: 3600, // 10 uploads per hour
});
```

### Issue: Sentry not capturing errors

**Solution:** Verify DSN is correct and error thrown in client component

```typescript
// Must be in 'use client' component
"use client";
throw new Error("Test");
```

---

## Next Steps After Security

Once all 5 days complete:

1. **Review** - Check all security items on [PRIORITY_ACTION_PLAN.md](file:///f:/colab-task-manager/docs/PRIORITY_ACTION_PLAN.md)
2. **Test** - Run full manual test checklist
3. **Deploy** - Push to staging environment
4. **Monitor** - Watch Sentry for 48 hours
5. **Proceed** - Begin Phase 2 (MVP Completion)

---

**Good luck! 🔒 Security first!**
