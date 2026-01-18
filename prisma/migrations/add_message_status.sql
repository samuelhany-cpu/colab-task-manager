-- Migration: Add message status tracking for WhatsApp-style receipts
-- This adds status and deliveredAt fields to Message table

-- Create MessageStatus enum
DO $$ BEGIN
    CREATE TYPE "MessageStatus" AS ENUM ('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add status column with default SENT
ALTER TABLE "Message" 
ADD COLUMN IF NOT EXISTS "status" "MessageStatus" NOT NULL DEFAULT 'SENT';

-- Add deliveredAt column
ALTER TABLE "Message" 
ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3);

-- Create index for faster status queries
CREATE INDEX IF NOT EXISTS "Message_status_idx" ON "Message"("status");

-- Verify the changes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Message' 
AND column_name IN ('status', 'deliveredAt');
