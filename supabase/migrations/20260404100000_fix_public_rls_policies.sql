-- Migration: Fix RLS policies for public marketplace access
-- Date: 2026-04-04
-- Author: Alexander Cast
--
-- Problema: Errores 401 al consultar user_specializations y social_accounts
-- desde perfiles publicos del marketplace.
--
-- Solucion: Asegurar GRANTs y policies de lectura publica para datos
-- que deben ser visibles en perfiles de creadores.

-- ============================================================
-- GRANTs para lectura publica
-- ============================================================
GRANT SELECT ON user_specializations TO anon, authenticated;
GRANT SELECT ON social_accounts TO anon, authenticated;

-- ============================================================
-- Policy: Lectura publica de cuentas sociales de creadores activos
-- Las redes sociales de creadores son datos publicos del marketplace
-- ============================================================
DROP POLICY IF EXISTS "public_social_accounts_read" ON social_accounts;

CREATE POLICY "public_social_accounts_read"
  ON social_accounts FOR SELECT
  TO anon, authenticated
  USING (
    user_id IN (SELECT user_id FROM creator_profiles WHERE is_active = true)
  );
