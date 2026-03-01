-- ============================================================================
-- FIX: Permitir a admins de plataforma ver todas las membresías y ganancias
-- ============================================================================

-- Membresías: admins de plataforma pueden ver todas
DROP POLICY IF EXISTS "Platform admins can read all memberships" ON partner_community_memberships;
CREATE POLICY "Platform admins can read all memberships" ON partner_community_memberships
    FOR SELECT
    TO authenticated
    USING (public.is_platform_root(auth.uid()));

-- Ganancias: admins de plataforma pueden ver todas
DROP POLICY IF EXISTS "Platform admins can read all earnings" ON partner_community_earnings;
CREATE POLICY "Platform admins can read all earnings" ON partner_community_earnings
    FOR SELECT
    TO authenticated
    USING (public.is_platform_root(auth.uid()));

-- También permitir a los owners de comunidades ver las membresías de su comunidad
DROP POLICY IF EXISTS "Community owners can read their memberships" ON partner_community_memberships;
CREATE POLICY "Community owners can read their memberships" ON partner_community_memberships
    FOR SELECT
    TO authenticated
    USING (
        community_id IN (
            SELECT id FROM partner_communities WHERE owner_user_id = auth.uid()
        )
    );

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
