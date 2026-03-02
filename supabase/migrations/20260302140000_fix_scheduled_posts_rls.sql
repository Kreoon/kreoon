-- ============================================================================
-- FIX: Actualizar RLS de scheduled_posts para soportar org admins
-- Los admins y team_leaders de organización deben poder crear posts
-- usando cuentas de la organización
-- ============================================================================

-- 1. Actualizar política de INSERT para scheduled_posts
DROP POLICY IF EXISTS scheduled_posts_insert ON scheduled_posts;
CREATE POLICY scheduled_posts_insert ON scheduled_posts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- El usuario puede crear posts con su propio user_id
        user_id = auth.uid()
        -- Y debe pertenecer a la organización si se especifica una
        AND (
            organization_id IS NULL
            OR EXISTS (
                SELECT 1 FROM organization_members om
                WHERE om.organization_id = scheduled_posts.organization_id
                AND om.user_id = auth.uid()
            )
        )
    );

-- 2. Actualizar política de DELETE para permitir a admins borrar posts de la org
DROP POLICY IF EXISTS scheduled_posts_delete ON scheduled_posts;
CREATE POLICY scheduled_posts_delete ON scheduled_posts
    FOR DELETE
    TO authenticated
    USING (
        -- Dueño del post
        user_id = auth.uid()
        -- O admin/team_leader de la organización
        OR (organization_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = scheduled_posts.organization_id
            AND om.user_id = auth.uid()
            AND om.role IN ('admin', 'team_leader')
        ))
    );

-- 3. También asegurar que admins pueden crear posts usando cuentas de clientes
-- Actualizar política de SELECT en social_accounts para incluir client accounts
DROP POLICY IF EXISTS social_accounts_select ON social_accounts;
CREATE POLICY social_accounts_select ON social_accounts
    FOR SELECT
    TO authenticated
    USING (
        -- Dueño de la cuenta
        user_id = auth.uid()
        -- O miembro de la organización (para cuentas org)
        OR (organization_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = social_accounts.organization_id
            AND om.user_id = auth.uid()
        ))
        -- O tiene permiso explícito sobre la cuenta
        OR EXISTS (
            SELECT 1 FROM social_account_permissions sap
            WHERE sap.account_id = social_accounts.id
            AND sap.user_id = auth.uid()
            AND sap.can_view = true
        )
        -- O es admin/team_leader de org y la cuenta pertenece a un cliente de esa org
        OR (client_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM clients c
            JOIN organization_members om ON om.organization_id = c.organization_id
            WHERE c.id = social_accounts.client_id
            AND om.user_id = auth.uid()
            AND om.role IN ('admin', 'team_leader')
        ))
    );
