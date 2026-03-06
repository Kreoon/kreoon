-- =====================================================
-- Políticas para que admins vean todos los consentimientos
-- Migration: 20260305230000_admin_legal_consents_policies
-- =====================================================

-- Política para que platform_admin vea todos los consentimientos
DROP POLICY IF EXISTS "admin_sees_all_consents" ON user_legal_consents;
CREATE POLICY "admin_sees_all_consents" ON user_legal_consents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_platform_admin = true
    )
  );

-- Política para que platform_admin vea todas las firmas
DROP POLICY IF EXISTS "admin_sees_all_signatures" ON digital_signatures;
CREATE POLICY "admin_sees_all_signatures" ON digital_signatures
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_platform_admin = true
    )
  );
