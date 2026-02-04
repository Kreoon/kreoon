-- Migration: Add Kreoon Social sharing columns to content table
-- This enables the collaborative content sharing feature between creators and clients

-- Add columns for Kreoon Social sharing functionality
ALTER TABLE content
ADD COLUMN IF NOT EXISTS shared_on_kreoon BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_on_creator_profile BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS show_on_client_profile BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS is_collaborative BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_at TIMESTAMPTZ;

-- Create index for faster queries on shared content
CREATE INDEX IF NOT EXISTS idx_content_shared_on_kreoon ON content(shared_on_kreoon) WHERE shared_on_kreoon = true;
CREATE INDEX IF NOT EXISTS idx_content_is_collaborative ON content(is_collaborative) WHERE is_collaborative = true;

-- Add comment for documentation
COMMENT ON COLUMN content.shared_on_kreoon IS 'Whether this content is shared on Kreoon Social feed';
COMMENT ON COLUMN content.show_on_creator_profile IS 'Show this content on the creator profile in Kreoon Social';
COMMENT ON COLUMN content.show_on_client_profile IS 'Show this content on the client profile in Kreoon Social';
COMMENT ON COLUMN content.is_collaborative IS 'Mark as collaborative content between creator and client';
COMMENT ON COLUMN content.shared_at IS 'Timestamp when content was shared on Kreoon Social';
