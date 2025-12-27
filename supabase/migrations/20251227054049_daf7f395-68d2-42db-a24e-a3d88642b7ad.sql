-- =====================================================
-- SCRIPT PERMISSIONS TABLE
-- Stores granular permissions per organization and role
-- =====================================================

CREATE TABLE public.script_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role text NOT NULL,
    
    -- IA sub-tab permissions
    ia_view boolean NOT NULL DEFAULT true,
    ia_edit boolean NOT NULL DEFAULT false,
    ia_generate boolean NOT NULL DEFAULT false,
    
    -- Script sub-tab permissions
    script_view boolean NOT NULL DEFAULT true,
    script_edit boolean NOT NULL DEFAULT false,
    script_approve boolean NOT NULL DEFAULT false,
    
    -- Editor sub-tab permissions
    editor_view boolean NOT NULL DEFAULT true,
    editor_edit boolean NOT NULL DEFAULT false,
    
    -- Strategist sub-tab permissions
    strategist_view boolean NOT NULL DEFAULT true,
    strategist_edit boolean NOT NULL DEFAULT false,
    
    -- Designer sub-tab permissions
    designer_view boolean NOT NULL DEFAULT true,
    designer_edit boolean NOT NULL DEFAULT false,
    
    -- Trafficker sub-tab permissions
    trafficker_view boolean NOT NULL DEFAULT true,
    trafficker_edit boolean NOT NULL DEFAULT false,
    
    -- Admin sub-tab permissions
    admin_view boolean NOT NULL DEFAULT false,
    admin_edit boolean NOT NULL DEFAULT false,
    admin_lock boolean NOT NULL DEFAULT false,
    
    -- Status-based overrides (JSON map of status_id -> permission overrides)
    status_overrides jsonb DEFAULT '{}'::jsonb,
    
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    
    -- Unique constraint per org+role
    UNIQUE(organization_id, role)
);

-- Enable RLS
ALTER TABLE public.script_permissions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Org members can view script permissions"
ON public.script_permissions
FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners and admins can manage script permissions"
ON public.script_permissions
FOR ALL
USING (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (is_org_owner(auth.uid(), organization_id) OR has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- Insert default permissions for common roles
-- This function creates defaults when an org is created
-- =====================================================
CREATE OR REPLACE FUNCTION public.create_default_script_permissions(org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Admin: full access
    INSERT INTO script_permissions (organization_id, role, ia_view, ia_edit, ia_generate, script_view, script_edit, script_approve, editor_view, editor_edit, strategist_view, strategist_edit, designer_view, designer_edit, trafficker_view, trafficker_edit, admin_view, admin_edit, admin_lock)
    VALUES (org_id, 'admin', true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true)
    ON CONFLICT (organization_id, role) DO NOTHING;
    
    -- Creator: limited access
    INSERT INTO script_permissions (organization_id, role, ia_view, ia_edit, ia_generate, script_view, script_edit, script_approve, editor_view, editor_edit, strategist_view, strategist_edit, designer_view, designer_edit, trafficker_view, trafficker_edit, admin_view, admin_edit, admin_lock)
    VALUES (org_id, 'creator', false, false, false, true, true, false, true, false, true, false, true, false, false, false, false, false, false)
    ON CONFLICT (organization_id, role) DO NOTHING;
    
    -- Editor
    INSERT INTO script_permissions (organization_id, role, ia_view, ia_edit, ia_generate, script_view, script_edit, script_approve, editor_view, editor_edit, strategist_view, strategist_edit, designer_view, designer_edit, trafficker_view, trafficker_edit, admin_view, admin_edit, admin_lock)
    VALUES (org_id, 'editor', false, false, false, true, false, false, true, true, true, false, true, false, false, false, false, false, false)
    ON CONFLICT (organization_id, role) DO NOTHING;
    
    -- Strategist
    INSERT INTO script_permissions (organization_id, role, ia_view, ia_edit, ia_generate, script_view, script_edit, script_approve, editor_view, editor_edit, strategist_view, strategist_edit, designer_view, designer_edit, trafficker_view, trafficker_edit, admin_view, admin_edit, admin_lock)
    VALUES (org_id, 'strategist', true, true, true, true, true, false, true, true, true, true, true, true, true, true, false, false, false)
    ON CONFLICT (organization_id, role) DO NOTHING;
    
    -- Designer
    INSERT INTO script_permissions (organization_id, role, ia_view, ia_edit, ia_generate, script_view, script_edit, script_approve, editor_view, editor_edit, strategist_view, strategist_edit, designer_view, designer_edit, trafficker_view, trafficker_edit, admin_view, admin_edit, admin_lock)
    VALUES (org_id, 'designer', false, false, false, true, false, false, true, false, true, false, true, true, false, false, false, false, false)
    ON CONFLICT (organization_id, role) DO NOTHING;
    
    -- Trafficker
    INSERT INTO script_permissions (organization_id, role, ia_view, ia_edit, ia_generate, script_view, script_edit, script_approve, editor_view, editor_edit, strategist_view, strategist_edit, designer_view, designer_edit, trafficker_view, trafficker_edit, admin_view, admin_edit, admin_lock)
    VALUES (org_id, 'trafficker', false, false, false, true, false, false, true, false, true, false, true, false, true, true, false, false, false)
    ON CONFLICT (organization_id, role) DO NOTHING;
    
    -- Client
    INSERT INTO script_permissions (organization_id, role, ia_view, ia_edit, ia_generate, script_view, script_edit, script_approve, editor_view, editor_edit, strategist_view, strategist_edit, designer_view, designer_edit, trafficker_view, trafficker_edit, admin_view, admin_edit, admin_lock)
    VALUES (org_id, 'client', false, false, false, true, false, true, false, false, false, false, false, false, false, false, false, false, false)
    ON CONFLICT (organization_id, role) DO NOTHING;
END;
$$;

-- Create default permissions for existing organizations
DO $$
DECLARE
    org RECORD;
BEGIN
    FOR org IN SELECT id FROM organizations LOOP
        PERFORM create_default_script_permissions(org.id);
    END LOOP;
END;
$$;