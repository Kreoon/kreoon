-- =====================================================
-- FIX: Profile Builder Public Read Access
-- Date: 2026-04-03
-- Permite que usuarios anonimos lean bloques publicados
-- =====================================================

-- Eliminar TODAS las politicas SELECT existentes para evitar conflictos
DROP POLICY IF EXISTS "Users can view own profile blocks" ON profile_builder_blocks;
DROP POLICY IF EXISTS "Anyone can view published blocks" ON profile_builder_blocks;
DROP POLICY IF EXISTS "Public can view published blocks" ON profile_builder_blocks;

-- Politica UNICA que combina ambos casos:
-- 1. Usuarios autenticados pueden ver SUS propios bloques (drafts incluidos)
-- 2. CUALQUIERA puede ver bloques publicados (is_draft = false)
CREATE POLICY "View profile blocks"
  ON profile_builder_blocks
  FOR SELECT
  USING (
    -- Caso 1: Es el dueno del perfil (puede ver todo, incluido drafts)
    profile_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
    OR
    -- Caso 2: Es un bloque publicado (cualquiera puede verlo)
    is_draft = false
  );

-- Verificar que RLS esta habilitado
ALTER TABLE profile_builder_blocks ENABLE ROW LEVEL SECURITY;
