-- Performance Optimization: Add Database Indexes
-- This will significantly improve query performance

-- Indexes for Message table
CREATE INDEX IF NOT EXISTS "Message_workspaceId_parentId_idx" 
  ON "Message"("workspaceId", "parentId") 
  WHERE "parentId" IS NULL;

CREATE INDEX IF NOT EXISTS "Message_projectId_parentId_idx" 
  ON "Message"("projectId", "parentId") 
  WHERE "parentId" IS NULL;

CREATE INDEX IF NOT EXISTS "Message_senderId_createdAt_idx" 
  ON "Message"("senderId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Message_receiverId_createdAt_idx" 
  ON "Message"("receiverId", "createdAt" DESC);

-- Indexes for User table (if not already exists)
CREATE INDEX IF NOT EXISTS "User_supabaseId_idx" 
  ON "User"("supabaseId");

CREATE INDEX IF NOT EXISTS "User_email_idx" 
  ON "User"("email");

-- Indexes for MessageRead table
CREATE INDEX IF NOT EXISTS "MessageRead_userId_workspaceId_idx" 
  ON "MessageRead"("userId", "workspaceId");

CREATE INDEX IF NOT EXISTS "MessageRead_userId_projectId_idx" 
  ON "MessageRead"("userId", "projectId");

-- Indexes for WorkspaceMember for faster membership checks
CREATE INDEX IF NOT EXISTS "WorkspaceMember_workspaceId_userId_idx" 
  ON "WorkspaceMember"("workspaceId", "userId");

-- Verify indexes were created
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE '%_idx'
ORDER BY tablename, indexname;
