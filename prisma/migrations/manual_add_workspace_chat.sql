-- Migration: Add workspace chat support
-- This adds the workspaceId field to the Message and MessageRead tables

-- Add workspaceId column to Message table
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Add foreign key constraint for Message.workspaceId
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'Message_workspaceId_fkey'
    ) THEN
        ALTER TABLE "Message" 
        ADD CONSTRAINT "Message_workspaceId_fkey" 
        FOREIGN KEY ("workspaceId") 
        REFERENCES "Workspace"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- Create index for better query performance on Message
CREATE INDEX IF NOT EXISTS "Message_workspaceId_idx" ON "Message"("workspaceId");

-- Add workspaceId column to MessageRead table
ALTER TABLE "MessageRead" ADD COLUMN IF NOT EXISTS "workspaceId" TEXT;

-- Create unique constraint for MessageRead workspace tracking
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'MessageRead_userId_workspaceId_key'
    ) THEN
        ALTER TABLE "MessageRead" 
        ADD CONSTRAINT "MessageRead_userId_workspaceId_key" 
        UNIQUE ("userId", "workspaceId");
    END IF;
END $$;

-- Verify the changes
SELECT 'Message' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Message' AND column_name = 'workspaceId'
UNION ALL
SELECT 'MessageRead' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'MessageRead' AND column_name = 'workspaceId';
