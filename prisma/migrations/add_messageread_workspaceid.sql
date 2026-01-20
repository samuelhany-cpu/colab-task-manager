-- Additional migration: Add workspaceId to MessageRead table
-- Run this if you already ran the previous migration

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

-- Verify the change
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'MessageRead' AND column_name = 'workspaceId';
