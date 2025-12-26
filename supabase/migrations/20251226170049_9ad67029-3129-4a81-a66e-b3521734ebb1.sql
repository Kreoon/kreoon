-- Add section field to content_comments for per-section feedback
ALTER TABLE public.content_comments 
ADD COLUMN section VARCHAR(50) DEFAULT NULL,
ADD COLUMN section_index INTEGER DEFAULT NULL,
ADD COLUMN comment_type VARCHAR(20) DEFAULT 'general';

-- Add change request tracking to content
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS change_request_status VARCHAR(20) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS change_requests JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS script_version INTEGER DEFAULT 1;

-- Create index for faster section-based comment queries
CREATE INDEX IF NOT EXISTS idx_content_comments_section ON public.content_comments(content_id, section);

-- Add comment for documentation
COMMENT ON COLUMN public.content_comments.section IS 'Section of the script: hooks, desarrollo, cierre, editor, estrategia, etc.';
COMMENT ON COLUMN public.content_comments.section_index IS 'Index within section (e.g., hook 1, hook 2, scene 1, scene 2)';
COMMENT ON COLUMN public.content_comments.comment_type IS 'Type: general, section, change_request';