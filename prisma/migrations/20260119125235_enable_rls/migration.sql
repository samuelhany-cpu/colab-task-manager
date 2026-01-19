-- Create auth schema if it doesn't exist (for Shadow DB)
CREATE SCHEMA IF NOT EXISTS auth;

-- Mock auth.uid() if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'uid' AND nspname = 'auth') THEN
    CREATE FUNCTION auth.uid() RETURNS uuid AS 'SELECT NULL::uuid;' LANGUAGE sql;
  END IF;
END $$;

-- Mock auth.role() if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid WHERE proname = 'role' AND nspname = 'auth') THEN
    CREATE FUNCTION auth.role() RETURNS text AS 'SELECT NULL::text;' LANGUAGE sql;
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProjectMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Tag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_TagToTask" ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE "Subtask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ConversationMember" ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID (standard Supabase/PostgREST)
-- Assuming usage of standard auth.uid() provided by Supabase extension

-- POLICIES

-- User
CREATE POLICY "Users are viewable by everyone" ON "User" FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON "User" FOR UPDATE USING (auth.uid()::text = id);

-- Workspace
CREATE POLICY "Workspaces viewable by members" ON "Workspace" FOR SELECT
USING (auth.uid()::text IN (SELECT "userId" FROM "WorkspaceMember" WHERE "workspaceId" = "Workspace"."id"));

CREATE POLICY "Workspaces insertable by authenticated users" ON "Workspace" FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Workspaces updatable by owners" ON "Workspace" FOR UPDATE
USING (auth.uid()::text = "ownerId");

-- WorkspaceMember
CREATE POLICY "Workspace members viewable by workspace members" ON "WorkspaceMember" FOR SELECT
USING (auth.uid()::text IN (SELECT "userId" FROM "WorkspaceMember" WHERE "workspaceId" = "WorkspaceMember"."workspaceId"));

CREATE POLICY "Workspace members manageable by admins/owners" ON "WorkspaceMember" FOR ALL
USING (auth.uid()::text IN (SELECT "userId" FROM "WorkspaceMember" WHERE "workspaceId" = "WorkspaceMember"."workspaceId" AND role = 'OWNER'));
-- Allow users to leave (delete self)
CREATE POLICY "Members can leave workspace" ON "WorkspaceMember" FOR DELETE
USING (auth.uid()::text = "userId");

-- Project
CREATE POLICY "Projects viewable by project members" ON "Project" FOR SELECT
USING (auth.uid()::text IN (SELECT "userId" FROM "ProjectMember" WHERE "projectId" = "Project"."id"));

-- Allow workspace members to create projects? Or just project members?
-- Usually workspace members create projects.
CREATE POLICY "Projects creatable by workspace members" ON "Project" FOR INSERT WITH CHECK (
  auth.uid()::text IN (SELECT "userId" FROM "WorkspaceMember" WHERE "workspaceId" = "Project"."workspaceId")
);

-- ProjectMember
CREATE POLICY "Project members viewable by project members" ON "ProjectMember" FOR SELECT
USING (auth.uid()::text IN (SELECT "userId" FROM "ProjectMember" WHERE "projectId" = "ProjectMember"."projectId"));

-- Task (Viewable by project members)
CREATE POLICY "Tasks viewable by project members" ON "Task" FOR SELECT
USING (auth.uid()::text IN (SELECT "userId" FROM "ProjectMember" WHERE "projectId" = "Task"."projectId"));

CREATE POLICY "Tasks adaptable by project members" ON "Task" FOR ALL
USING (auth.uid()::text IN (SELECT "userId" FROM "ProjectMember" WHERE "projectId" = "Task"."projectId"));

-- Subtask
CREATE POLICY "Subtasks viewable by project members via task" ON "Subtask" FOR SELECT
USING (auth.uid()::text IN (
  SELECT pm."userId" FROM "ProjectMember" pm
  JOIN "Task" t ON t.id = "Subtask"."taskId"
  WHERE pm."projectId" = t."projectId"
));
CREATE POLICY "Subtasks editable by project members" ON "Subtask" FOR ALL
USING (auth.uid()::text IN (
  SELECT pm."userId" FROM "ProjectMember" pm
  JOIN "Task" t ON t.id = "Subtask"."taskId"
  WHERE pm."projectId" = t."projectId"
));

-- Comment ('Task' based)
CREATE POLICY "Comments viewable by project members" ON "Comment" FOR SELECT
USING (auth.uid()::text IN (
  SELECT pm."userId" FROM "ProjectMember" pm
  JOIN "Task" t ON t.id = "Comment"."taskId"
  WHERE pm."projectId" = t."projectId"
));
CREATE POLICY "Comments creatable by project members" ON "Comment" FOR INSERT WITH CHECK (
  auth.uid()::text IN (
    SELECT pm."userId" FROM "ProjectMember" pm
    JOIN "Task" t ON t.id = "Comment"."taskId"
    WHERE pm."projectId" = t."projectId"
  )
);

-- File & Folder (Project based)
CREATE POLICY "Files viewable by project members" ON "File" FOR SELECT
USING (auth.uid()::text IN (SELECT "userId" FROM "ProjectMember" WHERE "projectId" = "File"."projectId"));
-- Similar for Folder, FileVersion...

-- Message
-- Complex: Workspace Channel OR Project Channel OR DM
CREATE POLICY "Messages viewable by recipients or channel members" ON "Message" FOR SELECT
USING (
  ("receiverId" = auth.uid()::text) OR -- DM Receiver
  ("senderId" = auth.uid()::text) OR -- DM Sender
  ("workspaceId" IS NOT NULL AND auth.uid()::text IN (SELECT "userId" FROM "WorkspaceMember" WHERE "workspaceId" = "Message"."workspaceId")) OR
  ("projectId" IS NOT NULL AND auth.uid()::text IN (SELECT "userId" FROM "ProjectMember" WHERE "projectId" = "Message"."projectId")) OR
  ("conversationId" IS NOT NULL AND auth.uid()::text IN (SELECT "userId" FROM "ConversationMember" WHERE "conversationId" = "Message"."conversationId"))
);

CREATE POLICY "Messages insertable by participants" ON "Message" FOR INSERT WITH CHECK (
  ("senderId" = auth.uid()::text) AND (
    ("receiverId" IS NOT NULL) OR
    ("workspaceId" IS NOT NULL AND auth.uid()::text IN (SELECT "userId" FROM "WorkspaceMember" WHERE "workspaceId" = "Message"."workspaceId")) OR
    ("projectId" IS NOT NULL AND auth.uid()::text IN (SELECT "userId" FROM "ProjectMember" WHERE "projectId" = "Message"."projectId")) OR
    ("conversationId" IS NOT NULL AND auth.uid()::text IN (SELECT "userId" FROM "ConversationMember" WHERE "conversationId" = "Message"."conversationId"))
  )
);

-- Notification (User specific)
CREATE POLICY "Notifications viewable by owner" ON "Notification" FOR SELECT USING (auth.uid()::text = "userId");
