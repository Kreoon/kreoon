-- Create table for content collaborators
CREATE TABLE public.content_collaborators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'collaborator',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(content_id, user_id)
);

-- Enable RLS
ALTER TABLE public.content_collaborators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view collaborators on published content"
  ON public.content_collaborators FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.content 
      WHERE content.id = content_collaborators.content_id 
      AND content.is_published = true
    )
  );

CREATE POLICY "Content creator can manage collaborators"
  ON public.content_collaborators FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.content 
      WHERE content.id = content_collaborators.content_id 
      AND content.creator_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all collaborators"
  ON public.content_collaborators FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster lookups
CREATE INDEX idx_content_collaborators_user ON public.content_collaborators(user_id);
CREATE INDEX idx_content_collaborators_content ON public.content_collaborators(content_id);