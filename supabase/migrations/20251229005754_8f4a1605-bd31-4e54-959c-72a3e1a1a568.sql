-- Create project_raw_assets table for raw material storage
CREATE TABLE public.project_raw_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  original_filename TEXT NOT NULL,
  custom_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique custom filenames per project
  CONSTRAINT unique_custom_filename_per_project UNIQUE (project_id, custom_filename)
);

-- Enable RLS
ALTER TABLE public.project_raw_assets ENABLE ROW LEVEL SECURITY;

-- Policy: Org members can view assets
CREATE POLICY "Org members can view raw assets"
ON public.project_raw_assets
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

-- Policy: Creators/Editors/Admins can insert assets
CREATE POLICY "Team members can upload raw assets"
ON public.project_raw_assets
FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id) AND (
    -- User is admin
    has_role(auth.uid(), 'admin'::app_role) OR
    -- User is assigned creator
    EXISTS (
      SELECT 1 FROM content c 
      WHERE c.id = project_id AND c.creator_id = auth.uid()
    ) OR
    -- User is assigned editor
    EXISTS (
      SELECT 1 FROM content c 
      WHERE c.id = project_id AND c.editor_id = auth.uid()
    )
  )
);

-- Policy: Uploaders and admins can delete
CREATE POLICY "Uploaders and admins can delete raw assets"
ON public.project_raw_assets
FOR DELETE
USING (
  uploaded_by = auth.uid() OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admins can update
CREATE POLICY "Admins can update raw assets"
ON public.project_raw_assets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_raw_assets_project_id ON public.project_raw_assets(project_id);
CREATE INDEX idx_raw_assets_organization_id ON public.project_raw_assets(organization_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_raw_assets;