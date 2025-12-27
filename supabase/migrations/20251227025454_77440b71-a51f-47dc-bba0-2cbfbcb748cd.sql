-- Create table for editor randomizer pool per organization
CREATE TABLE public.organization_editor_pool (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  editor_user_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(organization_id, editor_user_id)
);

-- Add editor_randomizer_enabled to organizations settings
-- We'll use the existing settings JSONB column

-- Enable RLS
ALTER TABLE public.organization_editor_pool ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view editor pool"
ON public.organization_editor_pool
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage editor pool"
ON public.organization_editor_pool
FOR ALL
USING (is_org_owner(auth.uid(), organization_id))
WITH CHECK (is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage editor pool"
ON public.organization_editor_pool
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to get random editor from pool
CREATE OR REPLACE FUNCTION public.get_random_editor_from_pool(org_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  random_editor_id UUID;
BEGIN
  SELECT editor_user_id INTO random_editor_id
  FROM organization_editor_pool
  WHERE organization_id = org_id
    AND is_active = true
  ORDER BY random()
  LIMIT 1;
  
  RETURN random_editor_id;
END;
$$;

-- Create trigger function to auto-assign editor when status changes to 'recorded'
CREATE OR REPLACE FUNCTION public.auto_assign_editor_on_recorded()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_settings JSONB;
  randomizer_enabled BOOLEAN;
  random_editor UUID;
  content_org_id UUID;
BEGIN
  -- Only trigger when status changes TO 'recorded'
  IF NEW.status = 'recorded' AND (OLD.status IS NULL OR OLD.status != 'recorded') THEN
    -- Get organization_id (from content or from client)
    content_org_id := NEW.organization_id;
    
    IF content_org_id IS NULL AND NEW.client_id IS NOT NULL THEN
      SELECT organization_id INTO content_org_id
      FROM clients
      WHERE id = NEW.client_id;
    END IF;
    
    IF content_org_id IS NOT NULL THEN
      -- Check if randomizer is enabled for this organization
      SELECT settings INTO org_settings
      FROM organizations
      WHERE id = content_org_id;
      
      randomizer_enabled := COALESCE((org_settings->>'editor_randomizer_enabled')::boolean, false);
      
      IF randomizer_enabled AND NEW.editor_id IS NULL THEN
        -- Get random editor from pool
        random_editor := get_random_editor_from_pool(content_org_id);
        
        IF random_editor IS NOT NULL THEN
          NEW.editor_id := random_editor;
          NEW.editor_assigned_at := now();
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on content table
DROP TRIGGER IF EXISTS trigger_auto_assign_editor ON public.content;
CREATE TRIGGER trigger_auto_assign_editor
  BEFORE UPDATE ON public.content
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_editor_on_recorded();