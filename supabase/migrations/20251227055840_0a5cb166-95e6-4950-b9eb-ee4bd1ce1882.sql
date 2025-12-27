-- First create the update_updated_at function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Content Block Configuration Table
CREATE TABLE IF NOT EXISTS public.content_block_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  block_key TEXT NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  layout_type TEXT NOT NULL DEFAULT 'tab',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, block_key)
);

-- Content Block Permissions Table
CREATE TABLE IF NOT EXISTS public.content_block_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  block_key TEXT NOT NULL,
  role TEXT NOT NULL,
  can_view BOOLEAN NOT NULL DEFAULT false,
  can_create BOOLEAN NOT NULL DEFAULT false,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_approve BOOLEAN NOT NULL DEFAULT false,
  can_lock BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, block_key, role)
);

-- Content Block State Rules Table
CREATE TABLE IF NOT EXISTS public.content_block_state_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status_id UUID REFERENCES public.organization_statuses(id) ON DELETE CASCADE,
  block_key TEXT NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  editable_roles TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, status_id, block_key)
);

-- Content Advanced Config Table
CREATE TABLE IF NOT EXISTS public.content_advanced_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  enable_comments BOOLEAN NOT NULL DEFAULT true,
  require_approval_before_advance BOOLEAN NOT NULL DEFAULT false,
  client_read_only_mode BOOLEAN NOT NULL DEFAULT true,
  enable_custom_fields BOOLEAN NOT NULL DEFAULT true,
  content_types JSONB DEFAULT '["UGC", "Ads", "Orgánico"]'::jsonb,
  text_editor_features JSONB DEFAULT '{"headings": true, "bold": true, "italic": true, "underline": true, "lists": true, "quotes": true, "code": true, "highlight": true, "emojis": true, "comments": true, "history": true}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_block_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_block_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_block_state_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_advanced_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Org members can view block config" ON public.content_block_config FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org owners and admins can manage block config" ON public.content_block_config FOR ALL USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view block permissions" ON public.content_block_permissions FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org owners and admins can manage block permissions" ON public.content_block_permissions FOR ALL USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view state rules" ON public.content_block_state_rules FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org owners and admins can manage state rules" ON public.content_block_state_rules FOR ALL USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Org members can view advanced config" ON public.content_advanced_config FOR SELECT USING (is_org_member(auth.uid(), organization_id));
CREATE POLICY "Org owners and admins can manage advanced config" ON public.content_advanced_config FOR ALL USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- Create triggers
CREATE TRIGGER update_content_block_config_updated_at BEFORE UPDATE ON public.content_block_config FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_content_block_permissions_updated_at BEFORE UPDATE ON public.content_block_permissions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_content_block_state_rules_updated_at BEFORE UPDATE ON public.content_block_state_rules FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER update_content_advanced_config_updated_at BEFORE UPDATE ON public.content_advanced_config FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();