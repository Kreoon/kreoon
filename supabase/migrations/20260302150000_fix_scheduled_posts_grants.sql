-- ============================================================================
-- FIX: Reaplicar GRANTs y simplificar RLS para scheduled_posts
-- Error: "permission denied for table scheduled_posts"
-- ============================================================================

-- 1. Asegurar GRANTs en scheduled_posts
GRANT ALL ON scheduled_posts TO authenticated;
GRANT ALL ON scheduled_posts TO service_role;

-- 2. Asegurar GRANTs en social_accounts
GRANT ALL ON social_accounts TO authenticated;
GRANT ALL ON social_accounts TO service_role;

-- 3. Asegurar GRANTs en social_metrics
GRANT ALL ON social_metrics TO authenticated;
GRANT ALL ON social_metrics TO service_role;

-- 4. Asegurar GRANTs en social_publish_logs
GRANT ALL ON social_publish_logs TO authenticated;
GRANT ALL ON social_publish_logs TO service_role;

-- 5. Simplificar política de INSERT (el hook ya asigna user_id = auth.uid())
DROP POLICY IF EXISTS scheduled_posts_insert ON scheduled_posts;
CREATE POLICY scheduled_posts_insert ON scheduled_posts
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 6. Refrescar cache de PostgREST
NOTIFY pgrst, 'reload schema';
