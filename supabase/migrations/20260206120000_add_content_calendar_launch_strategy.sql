-- Add content_calendar and launch_strategy JSONB columns to products table
-- These columns store the output of research steps 11 and 12

ALTER TABLE products ADD COLUMN IF NOT EXISTS content_calendar jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS launch_strategy jsonb;

-- Add comment for documentation
COMMENT ON COLUMN products.content_calendar IS 'AI-generated 30-day content calendar (step 11 of product research)';
COMMENT ON COLUMN products.launch_strategy IS 'AI-generated launch strategy with pre/launch/post phases (step 12 of product research)';
