-- Migration: Add creation_mode field for manual project creation
-- Allows projects to be created without DNA questionnaire when client provides script directly

-- Add creation_mode to content table (organizations)
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS creation_mode text DEFAULT 'standard';

-- Add check constraint for content
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'content_creation_mode_check'
  ) THEN
    ALTER TABLE public.content
      ADD CONSTRAINT content_creation_mode_check
      CHECK (creation_mode IN ('standard', 'manual'));
  END IF;
END $$;

-- Add creation_mode to marketplace_projects table (freelancers)
ALTER TABLE public.marketplace_projects
  ADD COLUMN IF NOT EXISTS creation_mode text DEFAULT 'standard';

-- Add check constraint for marketplace_projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'marketplace_projects_creation_mode_check'
  ) THEN
    ALTER TABLE public.marketplace_projects
      ADD CONSTRAINT marketplace_projects_creation_mode_check
      CHECK (creation_mode IN ('standard', 'manual'));
  END IF;
END $$;

-- Create indexes for filtering by creation_mode
CREATE INDEX IF NOT EXISTS idx_content_creation_mode ON public.content(creation_mode);
CREATE INDEX IF NOT EXISTS idx_marketplace_projects_creation_mode ON public.marketplace_projects(creation_mode);

COMMENT ON COLUMN public.content.creation_mode IS 'standard = full DNA questionnaire flow, manual = client provides script directly';
COMMENT ON COLUMN public.marketplace_projects.creation_mode IS 'standard = full DNA questionnaire flow, manual = client provides script directly';
