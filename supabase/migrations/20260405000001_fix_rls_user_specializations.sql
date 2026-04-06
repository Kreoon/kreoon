-- Migration: Fix RLS policy que permitía lectura pública sin restricciones
-- Date: 2026-04-05
-- Author: Security Audit
--
-- PROBLEMA: La política "Public can read specializations" usaba USING (true),
-- permitiendo que cualquier usuario anónimo lea TODAS las especializaciones.
--
-- SOLUCIÓN: Restringir a creadores activos y publicados en marketplace.

-- ============================================================
-- Eliminar política insegura
-- ============================================================
DROP POLICY IF EXISTS "Public can read specializations" ON user_specializations;

-- ============================================================
-- Nueva política: solo creadores activos y publicados
-- ============================================================
CREATE POLICY "Public can read active creator specializations"
  ON user_specializations FOR SELECT
  TO anon, authenticated
  USING (
    user_id IN (
      SELECT user_id FROM creator_profiles
      WHERE is_active = true AND is_published = true
    )
  );

-- ============================================================
-- Política para que usuarios vean sus propias especializaciones
-- ============================================================
DROP POLICY IF EXISTS "Users can view own specializations" ON user_specializations;

CREATE POLICY "Users can view own specializations"
  ON user_specializations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================
-- Comentarios de auditoría
-- ============================================================
COMMENT ON POLICY "Public can read active creator specializations" ON user_specializations IS
  'SECURITY FIX 2026-04-05: Solo permite lectura de especializaciones de creadores activos/publicados.';
