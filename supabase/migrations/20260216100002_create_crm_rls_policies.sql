-- =====================================================
-- CRM RLS POLICIES
-- Migration: 20260216100002_create_crm_rls_policies
--
-- Funciones helper existentes:
--   is_platform_admin(_user_id UUID) -> user_roles.role = 'admin'
--   is_org_member(_org_id UUID)      -> organization_members check con auth.uid()
-- =====================================================

-- =====================================================
-- 1. CRM PLATAFORMA (solo admins de Kreoon)
-- =====================================================

ALTER TABLE platform_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_user_health ENABLE ROW LEVEL SECURITY;

-- platform_leads
CREATE POLICY "platform_leads_admin_policy" ON platform_leads
    FOR ALL
    USING (is_platform_admin(auth.uid()))
    WITH CHECK (is_platform_admin(auth.uid()));

-- platform_lead_interactions
CREATE POLICY "platform_lead_interactions_admin_policy" ON platform_lead_interactions
    FOR ALL
    USING (is_platform_admin(auth.uid()))
    WITH CHECK (is_platform_admin(auth.uid()));

-- platform_user_health
CREATE POLICY "platform_user_health_admin_policy" ON platform_user_health
    FOR ALL
    USING (is_platform_admin(auth.uid()))
    WITH CHECK (is_platform_admin(auth.uid()));

-- =====================================================
-- 2. CRM ORGANIZACIÓN (miembros de la org)
-- =====================================================

ALTER TABLE org_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_creator_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_contact_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_pipelines ENABLE ROW LEVEL SECURITY;

-- org_contacts
CREATE POLICY "org_contacts_member_policy" ON org_contacts
    FOR ALL
    USING (is_org_member(organization_id))
    WITH CHECK (is_org_member(organization_id));

-- org_creator_relationships
CREATE POLICY "org_creator_relationships_member_policy" ON org_creator_relationships
    FOR ALL
    USING (is_org_member(organization_id))
    WITH CHECK (is_org_member(organization_id));

-- org_contact_interactions
CREATE POLICY "org_contact_interactions_member_policy" ON org_contact_interactions
    FOR ALL
    USING (is_org_member(organization_id))
    WITH CHECK (is_org_member(organization_id));

-- org_pipelines
CREATE POLICY "org_pipelines_member_policy" ON org_pipelines
    FOR ALL
    USING (is_org_member(organization_id))
    WITH CHECK (is_org_member(organization_id));

-- =====================================================
-- 3. GRANTS
-- =====================================================

GRANT ALL ON platform_leads TO authenticated;
GRANT ALL ON platform_lead_interactions TO authenticated;
GRANT ALL ON platform_user_health TO authenticated;

GRANT ALL ON org_contacts TO authenticated;
GRANT ALL ON org_creator_relationships TO authenticated;
GRANT ALL ON org_contact_interactions TO authenticated;
GRANT ALL ON org_pipelines TO authenticated;
