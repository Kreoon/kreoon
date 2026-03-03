-- ============================================================================
-- FIX: Corregir acceso de usuarios cliente a product_dna
-- Error: 403 Forbidden al consultar product_dna desde portal cliente
-- ============================================================================

-- 1. Reaplicar GRANTs
GRANT ALL ON product_dna TO authenticated;
GRANT ALL ON product_dna TO service_role;

-- 2. Recrear política de client users con TO authenticated explícito
DROP POLICY IF EXISTS "Client users can view own product_dna" ON product_dna;
CREATE POLICY "Client users can view own product_dna"
  ON product_dna FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT cu.client_id FROM client_users cu WHERE cu.user_id = auth.uid()
    )
  );

-- 3. Asegurar que client_users tiene los GRANTs necesarios para subqueries
GRANT SELECT ON client_users TO authenticated;

-- 4. Refrescar cache de PostgREST
NOTIFY pgrst, 'reload schema';
