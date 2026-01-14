-- Add star rating fields to content table (0-5 stars)
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS creator_rating smallint DEFAULT NULL CHECK (creator_rating >= 0 AND creator_rating <= 5),
ADD COLUMN IF NOT EXISTS editor_rating smallint DEFAULT NULL CHECK (editor_rating >= 0 AND editor_rating <= 5),
ADD COLUMN IF NOT EXISTS creator_rated_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS creator_rated_by uuid DEFAULT NULL,
ADD COLUMN IF NOT EXISTS editor_rated_at timestamptz DEFAULT NULL,
ADD COLUMN IF NOT EXISTS editor_rated_by uuid DEFAULT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.content.creator_rating IS 'Star rating for creator work (0-5)';
COMMENT ON COLUMN public.content.editor_rating IS 'Star rating for editor work (0-5)';

-- Create index for performance when calculating averages
CREATE INDEX IF NOT EXISTS idx_content_creator_rating ON public.content(creator_id, creator_rating) WHERE creator_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_editor_rating ON public.content(editor_id, editor_rating) WHERE editor_rating IS NOT NULL;