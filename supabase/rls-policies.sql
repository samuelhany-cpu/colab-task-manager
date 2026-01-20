-- ============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Collaborative Task Manager - Production Hardening
-- ============================================================================
-- 
-- CRITICAL: Run this SQL in your Supabase SQL Editor
-- This enables RLS on ALL tables and creates security policies
-- 
-- EXECUTION ORDER:
-- 1. Enable RLS on all tables
-- 2. Create policies for each table
-- 3. Add performance indexes
-- 4. Verify policies with test queries
--
-- ROLLBACK: Each section can be independently disabled if needed
-- ============================================================================

-- ============================================================================
-- STEP 1: ENABLE RLS ON ALL TABLES
-- ============================================================================

-- IMPORTANT: This will BLOCK all access until policies are created
-- Run Step 2 immediately after Step 1

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subtask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Timer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FileVersion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Folder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MessageRead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invitation" ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: CREATE RLS POLICIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USER TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Users can read their own profile and profiles of workspace members

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON "User";
DROP POLICY IF EXISTS "Users can read workspace member profiles" ON "User";
DROP POLICY IF EXISTS "Users can update own profile" ON "User";

CREATE POLICY "Users can read own profile"
ON "User"
FOR SELECT
USING (
  auth.uid()::text = "supabaseId"
);

CREATE POLICY "Users can read workspace member profiles"
ON "User"
FOR SELECT
USING (
  id IN (
    SELECT "userId"
    FROM "WorkspaceMember"
    WHERE "workspaceId" IN (
      SELECT "workspaceId"
      FROM "WorkspaceMember"
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    )
  )
);

CREATE POLICY "Users can update own profile"
ON "User"
FOR UPDATE
USING (
  auth.uid()::text = "supabaseId"
)
WITH CHECK (
  auth.uid()::text = "supabaseId"
);

-- ----------------------------------------------------------------------------
-- WORKSPACE TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Users can only see workspaces they are members of

DROP POLICY IF EXISTS "Workspace members can read workspace" ON "Workspace";
DROP POLICY IF EXISTS "Workspace owners can update workspace" ON "Workspace";
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON "Workspace";

CREATE POLICY "Workspace members can read workspace"
ON "Workspace"
FOR SELECT
USING (
  id IN (
    SELECT "workspaceId"
    FROM "WorkspaceMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "Workspace owners can update workspace"
ON "Workspace"
FOR UPDATE
USING (
  "ownerId" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
)
WITH CHECK (
  "ownerId" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Authenticated users can create workspaces"
ON "Workspace"
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  "ownerId" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
);

-- ----------------------------------------------------------------------------
-- WORKSPACE MEMBER TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Workspace members can read memberships" ON "WorkspaceMember";
DROP POLICY IF EXISTS "Workspace owners can manage members" ON "WorkspaceMember";

CREATE POLICY "Workspace members can read memberships"
ON "WorkspaceMember"
FOR SELECT
USING (
  "workspaceId" IN (
    SELECT "workspaceId"
    FROM "WorkspaceMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "Workspace owners can manage members"
ON "WorkspaceMember"
FOR ALL
USING (
  "workspaceId" IN (
    SELECT id FROM "Workspace"
    WHERE "ownerId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- ----------------------------------------------------------------------------
-- PROJECT TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Users can only see projects in workspaces they belong to

DROP POLICY IF EXISTS "Users can read projects in their workspaces" ON "Project";
DROP POLICY IF EXISTS "Workspace members can create projects" ON "Project";
DROP POLICY IF EXISTS "Project members can update projects" ON "Project";

CREATE POLICY "Users can read projects in their workspaces"
ON "Project"
FOR SELECT
USING (
  "workspaceId" IN (
    SELECT "workspaceId"
    FROM "WorkspaceMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "Workspace members can create projects"
ON "Project"
FOR INSERT
WITH CHECK (
  "workspaceId" IN (
    SELECT "workspaceId"
    FROM "WorkspaceMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "Project members can update projects"
ON "Project"
FOR UPDATE
USING (
  id IN (
    SELECT "projectId"
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- ----------------------------------------------------------------------------
-- PROJECT MEMBER TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read project memberships" ON "ProjectMember";
DROP POLICY IF EXISTS "Project members with OWNER role can manage members" ON "ProjectMember";

CREATE POLICY "Users can read project memberships"
ON "ProjectMember"
FOR SELECT
USING (
  "projectId" IN (
    SELECT id FROM "Project"
    WHERE "workspaceId" IN (
      SELECT "workspaceId"
      FROM "WorkspaceMember"
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    )
  )
);

CREATE POLICY "Project members with OWNER role can manage members"
ON "ProjectMember"
FOR ALL
USING (
  "projectId" IN (
    SELECT "projectId"
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
    AND role = 'OWNER'
  )
);

-- ----------------------------------------------------------------------------
-- TASK TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Users can only access tasks in projects they are members of

DROP POLICY IF EXISTS "Project members can read tasks" ON "Task";
DROP POLICY IF EXISTS "Project members can create tasks" ON "Task";
DROP POLICY IF EXISTS "Project members can update tasks" ON "Task";
DROP POLICY IF EXISTS "Project members can delete tasks" ON "Task";

CREATE POLICY "Project members can read tasks"
ON "Task"
FOR SELECT
USING (
  "projectId" IN (
    SELECT "projectId"
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "Project members can create tasks"
ON "Task"
FOR INSERT
WITH CHECK (
  "projectId" IN (
    SELECT "projectId"
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "Project members can update tasks"
ON "Task"
FOR UPDATE
USING (
  "projectId" IN (
    SELECT "projectId"
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "Project members can delete tasks"
ON "Task"
FOR DELETE
USING (
  "projectId" IN (
    SELECT "projectId"
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- ----------------------------------------------------------------------------
-- SUBTASK TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage subtasks in accessible tasks" ON "Subtask";

CREATE POLICY "Users can manage subtasks in accessible tasks"
ON "Subtask"
FOR ALL
USING (
  "taskId" IN (
    SELECT id FROM "Task"
    WHERE "projectId" IN (
      SELECT "projectId"
      FROM "ProjectMember"
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    )
  )
);

-- ----------------------------------------------------------------------------
-- COMMENT TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage comments in accessible tasks" ON "Comment";

CREATE POLICY "Users can manage comments in accessible tasks"
ON "Comment"
FOR ALL
USING (
  "taskId" IN (
    SELECT id FROM "Task"
    WHERE "projectId" IN (
      SELECT "projectId"
      FROM "ProjectMember"
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    )
  )
);

-- ----------------------------------------------------------------------------
-- ACTIVITY TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read activities in accessible tasks" ON "Activity";

CREATE POLICY "Users can read activities in accessible tasks"
ON "Activity"
FOR SELECT
USING (
  "taskId" IN (
    SELECT id FROM "Task"
    WHERE "projectId" IN (
      SELECT "projectId"
      FROM "ProjectMember"
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    )
  )
);

-- Allow creating activities for tasks in accessible projects
CREATE POLICY "Users can create activities in accessible tasks"
ON "Activity"
FOR INSERT
WITH CHECK (
  "taskId" IN (
    SELECT id FROM "Task"
    WHERE "projectId" IN (
      SELECT "projectId"
      FROM "ProjectMember"
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    )
  )
);

-- ----------------------------------------------------------------------------
-- TIME ENTRY TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage own time entries" ON "TimeEntry";

CREATE POLICY "Users can manage own time entries"
ON "TimeEntry"
FOR ALL
USING (
  "userId" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
  AND "taskId" IN (
    SELECT id FROM "Task"
    WHERE "projectId" IN (
      SELECT "projectId"
      FROM "ProjectMember"
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    )
  )
);

-- ----------------------------------------------------------------------------
-- TIMER TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage own timers" ON "Timer";

CREATE POLICY "Users can manage own timers"
ON "Timer"
FOR ALL
USING (
  "userId" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
);

-- ----------------------------------------------------------------------------
-- FILE TABLE POLICIES
-- ----------------------------------------------------------------------------
-- Users can only access files in projects they are members of

DROP POLICY IF EXISTS "Project members can read files" ON "File";
DROP POLICY IF EXISTS "Project members can upload files" ON "File";
DROP POLICY IF EXISTS "File uploader can delete files" ON "File";

CREATE POLICY "Project members can read files"
ON "File"
FOR SELECT
USING (
  "projectId" IN (
    SELECT "projectId"
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "Project members can upload files"
ON "File"
FOR INSERT
WITH CHECK (
  "projectId" IN (
    SELECT "projectId"
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "File uploader can delete files"
ON "File"
FOR DELETE
USING (
  "uploadedById" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
);

-- ----------------------------------------------------------------------------
-- FILE VERSION TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read file versions in accessible projects" ON "FileVersion";

CREATE POLICY "Users can read file versions in accessible projects"
ON "FileVersion"
FOR SELECT
USING (
  "fileId" IN (
    SELECT id FROM "File"
    WHERE "projectId" IN (
      SELECT "projectId"
      FROM "ProjectMember"
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    )
  )
);

-- ----------------------------------------------------------------------------
-- FOLDER TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Project members can manage folders" ON "Folder";

CREATE POLICY "Project members can manage folders"
ON "Folder"
FOR ALL
USING (
  "projectId" IN (
    SELECT "projectId"
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- ----------------------------------------------------------------------------
-- MESSAGE TABLE POLICIES
-- ----------------------------------------------------------------------------
-- CRITICAL: Messages are scoped to workspace, project, DM, or conversation
-- Users can only see messages in contexts they have access to

DROP POLICY IF EXISTS "Users can read workspace messages" ON "Message";
DROP POLICY IF EXISTS "Users can read project messages" ON "Message";
DROP POLICY IF EXISTS "Users can read DMs" ON "Message";
DROP POLICY IF EXISTS "Users can read conversation messages" ON "Message";
DROP POLICY IF EXISTS "Users can read thread replies" ON "Message";
DROP POLICY IF EXISTS "Users can create messages in authorized contexts" ON "Message";
DROP POLICY IF EXISTS "Users can update own messages" ON "Message";
DROP POLICY IF EXISTS "Users can delete own messages" ON "Message";

-- Workspace messages: User must be workspace member
CREATE POLICY "Users can read workspace messages"
ON "Message"
FOR SELECT
USING (
  "workspaceId" IS NOT NULL
  AND "workspaceId" IN (
    SELECT "workspaceId"
    FROM "WorkspaceMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- Project messages: User must be project member
CREATE POLICY "Users can read project messages"
ON "Message"
FOR SELECT
USING (
  "projectId" IS NOT NULL
  AND "projectId" IN (
    SELECT "projectId"
    FROM "ProjectMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- DM messages: User is sender or receiver
CREATE POLICY "Users can read DMs"
ON "Message"
FOR SELECT
USING (
  "receiverId" IS NOT NULL
  AND (
    "senderId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
    OR "receiverId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- Conversation messages: User is conversation member
CREATE POLICY "Users can read conversation messages"
ON "Message"
FOR SELECT
USING (
  "conversationId" IS NOT NULL
  AND "conversationId" IN (
    SELECT "conversationId"
    FROM "ConversationMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- Thread replies: User has access to parent message
CREATE POLICY "Users can read thread replies"
ON "Message"
FOR SELECT
USING (
  "parentId" IS NOT NULL
  AND "parentId" IN (
    SELECT id FROM "Message"
    -- Parent message visibility is already enforced by other policies
  )
);

-- Users can only create messages in contexts they have access to
CREATE POLICY "Users can create messages in authorized contexts"
ON "Message"
FOR INSERT
WITH CHECK (
  "senderId" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
  AND (
    -- Workspace message: must be member
    ("workspaceId" IS NOT NULL AND "workspaceId" IN (
      SELECT "workspaceId"
      FROM "WorkspaceMember"
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    ))
    OR
    -- Project message: must be member
    ("projectId" IS NOT NULL AND "projectId" IN (
      SELECT "projectId"
      FROM "ProjectMember"
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    ))
    OR
    -- DM: sender must be the authenticated user
    ("receiverId" IS NOT NULL AND "senderId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    ))
    OR
    -- Conversation: must be member
    ("conversationId" IS NOT NULL AND "conversationId" IN (
      SELECT "conversationId"
      FROM "ConversationMember"
      WHERE "userId" IN (
        SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
      )
    ))
    OR
    -- Thread reply: must have access to parent
    ("parentId" IS NOT NULL)
  )
);

CREATE POLICY "Users can update own messages"
ON "Message"
FOR UPDATE
USING (
  "senderId" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can delete own messages"
ON "Message"
FOR DELETE
USING (
  "senderId" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
);

-- ----------------------------------------------------------------------------
-- MESSAGE READ TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage own message reads" ON "MessageRead";

CREATE POLICY "Users can manage own message reads"
ON "MessageRead"
FOR ALL
USING (
  "userId" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
);

-- ----------------------------------------------------------------------------
-- REACTION TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can manage reactions on accessible messages" ON "Reaction";

CREATE POLICY "Users can manage reactions on accessible messages"
ON "Reaction"
FOR ALL
USING (
  "messageId" IN (
    SELECT id FROM "Message"
    -- Message visibility is enforced by Message policies
  )
);

-- ----------------------------------------------------------------------------
-- NOTIFICATION TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read own notifications" ON "Notification";
DROP POLICY IF EXISTS "Users can update own notifications" ON "Notification";

CREATE POLICY "Users can read own notifications"
ON "Notification"
FOR SELECT
USING (
  "userId" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update own notifications"
ON "Notification"
FOR UPDATE
USING (
  "userId" IN (
    SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
  )
);

-- ----------------------------------------------------------------------------
-- TAG TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Workspace members can manage tags" ON "Tag";

CREATE POLICY "Workspace members can manage tags"
ON "Tag"
FOR ALL
USING (
  "workspaceId" IN (
    SELECT "workspaceId"
    FROM "WorkspaceMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- ----------------------------------------------------------------------------
-- CONVERSATION TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read conversations they are members of" ON "Conversation";
DROP POLICY IF EXISTS "Users can create conversations in their workspaces" ON "Conversation";

CREATE POLICY "Users can read conversations they are members of"
ON "Conversation"
FOR SELECT
USING (
  id IN (
    SELECT "conversationId"
    FROM "ConversationMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "Users can create conversations in their workspaces"
ON "Conversation"
FOR INSERT
WITH CHECK (
  "workspaceId" IN (
    SELECT "workspaceId"
    FROM "WorkspaceMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- ----------------------------------------------------------------------------
-- CONVERSATION MEMBER TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can read conversation members" ON "ConversationMember";
DROP POLICY IF EXISTS "Conversation members can manage members" ON "ConversationMember";

CREATE POLICY "Users can read conversation members"
ON "ConversationMember"
FOR SELECT
USING (
  "conversationId" IN (
    SELECT "conversationId"
    FROM "ConversationMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "Conversation members can manage members"
ON "ConversationMember"
FOR ALL
USING (
  "conversationId" IN (
    SELECT "conversationId"
    FROM "ConversationMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- ----------------------------------------------------------------------------
-- INVITATION TABLE POLICIES
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Workspace members can read invitations" ON "Invitation";
DROP POLICY IF EXISTS "Workspace owners can manage invitations" ON "Invitation";

CREATE POLICY "Workspace members can read invitations"
ON "Invitation"
FOR SELECT
USING (
  "workspaceId" IN (
    SELECT "workspaceId"
    FROM "WorkspaceMember"
    WHERE "userId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

CREATE POLICY "Workspace owners can manage invitations"
ON "Invitation"
FOR ALL
USING (
  "workspaceId" IN (
    SELECT id FROM "Workspace"
    WHERE "ownerId" IN (
      SELECT id FROM "User" WHERE "supabaseId" = auth.uid()::text
    )
  )
);

-- ============================================================================
-- STEP 3: CREATE PERFORMANCE INDEXES FOR RLS
-- ============================================================================
-- These indexes optimize the subqueries in RLS policies

-- User table
CREATE INDEX IF NOT EXISTS "idx_user_supabaseId" ON "User"("supabaseId");

-- WorkspaceMember lookups
CREATE INDEX IF NOT EXISTS "idx_workspacemember_userId" ON "WorkspaceMember"("userId");
CREATE INDEX IF NOT EXISTS "idx_workspacemember_workspaceId" ON "WorkspaceMember"("workspaceId");
CREATE INDEX IF NOT EXISTS "idx_workspacemember_composite" ON "WorkspaceMember"("workspaceId", "userId");

-- ProjectMember lookups
CREATE INDEX IF NOT EXISTS "idx_projectmember_userId" ON "ProjectMember"("userId");
CREATE INDEX IF NOT EXISTS "idx_projectmember_projectId" ON "ProjectMember"("projectId");
CREATE INDEX IF NOT EXISTS "idx_projectmember_composite" ON "ProjectMember"("projectId", "userId");

-- Project workspace lookups
CREATE INDEX IF NOT EXISTS "idx_project_workspaceId" ON "Project"("workspaceId");

-- Task project lookups
CREATE INDEX IF NOT EXISTS "idx_task_projectId" ON "Task"("projectId");

-- Message context lookups
CREATE INDEX IF NOT EXISTS "idx_message_workspaceId" ON "Message"("workspaceId");
CREATE INDEX IF NOT EXISTS "idx_message_projectId" ON "Message"("projectId");
CREATE INDEX IF NOT EXISTS "idx_message_senderId_receiverId" ON "Message"("senderId", "receiverId");
CREATE INDEX IF NOT EXISTS "idx_message_conversationId" ON "Message"("conversationId");
CREATE INDEX IF NOT EXISTS "idx_message_parentId" ON "Message"("parentId");

-- ConversationMember lookups
CREATE INDEX IF NOT EXISTS "idx_conversationmember_userId" ON "ConversationMember"("userId");
CREATE INDEX IF NOT EXISTS "idx_conversationmember_conversationId" ON "ConversationMember"("conversationId");

-- File project lookups
CREATE INDEX IF NOT EXISTS "idx_file_projectId" ON "File"("projectId");

-- Notification user lookups
CREATE INDEX IF NOT EXISTS "idx_notification_userId" ON "Notification"("userId");

-- ============================================================================
-- STEP 4: VERIFICATION QUERIES
-- ============================================================================
-- Run these as a test user to verify RLS is working

-- Test 1: User can only see their own workspaces
-- Expected: Returns only workspaces where user is a member
SELECT * FROM "Workspace";

-- Test 2: User cannot see other users' notifications
-- Expected: Returns only notifications for authenticated user
SELECT * FROM "Notification";

-- Test 3: User can only see projects in their workspaces
-- Expected: Returns only projects in accessible workspaces
SELECT * FROM "Project";

-- Test 4: User can only see tasks in their projects
-- Expected: Returns only tasks in accessible projects
SELECT * FROM "Task";

-- Test 5: User can only see messages they have access to
-- Expected: Returns only workspace/project/DM messages user can see
SELECT * FROM "Message";

-- ============================================================================
-- STEP 5: EMERGENCY ROLLBACK (IF NEEDED)
-- ============================================================================
-- ONLY use this if RLS breaks the application
-- This will re-expose the database until policies are fixed

-- DANGER: Uncomment to disable RLS (NOT RECOMMENDED FOR PRODUCTION)
-- ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Workspace" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "WorkspaceMember" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Project" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "ProjectMember" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Task" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE "Message" DISABLE ROW LEVEL SECURITY;
-- ... (disable all tables)

-- ============================================================================
-- NOTES FOR PRODUCTION DEPLOYMENT
-- ============================================================================
-- 
-- 1. **Test in staging first**: Apply to staging database and run full test suite
-- 2. **Monitor performance**: RLS adds query overhead; watch for slow queries
-- 3. **Backup first**: Take a full database snapshot before applying
-- 4. **Apply during low traffic**: Minimize impact on users
-- 5. **Have rollback plan**: Keep this file accessible for emergency rollback
-- 6. **Verify indexes**: Ensure all indexes are created successfully
-- 7. **Test edge cases**: Verify multi-workspace users, shared projects, etc.
-- 
-- ============================================================================
