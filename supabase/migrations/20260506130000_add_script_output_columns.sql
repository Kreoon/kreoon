-- Migration: Add script generation output columns to content table
-- These columns store the generated content from the AI script generation system

-- Add director_output column (production table with scenes)
ALTER TABLE content
ADD COLUMN IF NOT EXISTS director_output TEXT;

-- Add marketing_output column (marketing strategy and ad copies)
ALTER TABLE content
ADD COLUMN IF NOT EXISTS marketing_output TEXT;

-- Add captions column (4 caption variations: 2 organic + 2 ads)
ALTER TABLE content
ADD COLUMN IF NOT EXISTS captions TEXT;

-- Add broll_output column (B-Roll ideas for video production)
ALTER TABLE content
ADD COLUMN IF NOT EXISTS broll_output TEXT;

-- Add comments for documentation
COMMENT ON COLUMN content.director_output IS 'Production table with scene breakdown, timecodes, and direction notes';
COMMENT ON COLUMN content.marketing_output IS 'Marketing strategy, ad copies, and distribution plan';
COMMENT ON COLUMN content.captions IS 'Caption variations: 2 organic + 2 ads formatted for social media';
COMMENT ON COLUMN content.broll_output IS 'B-Roll ideas and shot list for video production';
