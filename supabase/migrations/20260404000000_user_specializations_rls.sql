-- Migration: Fix RLS policies for user_specializations (public read access)
-- Date: 2026-04-04
-- Author: Alexander Cast
--
-- Problema: Error 403 al consultar especializaciones de otro usuario.
-- La politica SELECT original solo permite auth.uid() = user_id,
-- bloqueando lecturas publicas necesarias para perfiles de creadores.
--
-- Solucion: Reemplazar las tres politicas SELECT fragmentadas por una
-- unica politica de lectura publica (anon + authenticated), manteniendo
-- escritura restringida al propio usuario.

-- ============================================================
-- Habilitar RLS (idempotente, por si no se aplico antes)
-- ============================================================
ALTER TABLE user_specializations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Eliminar politicas SELECT existentes (todas las variantes)
-- ============================================================
DROP POLICY IF EXISTS "Users can view own specializations"                ON user_specializations;
DROP POLICY IF EXISTS "Anyone can view specializations of public profiles" ON user_specializations;
DROP POLICY IF EXISTS "Platform admins can view all specializations"      ON user_specializations;

-- ============================================================
-- Politica SELECT: lectura publica sin restricciones
-- Las especializaciones son datos de perfil publico equivalente
-- a lo visible en creator_profiles del marketplace.
-- ============================================================
CREATE POLICY "Public can read specializations"
  ON user_specializations FOR SELECT
  TO anon, authenticated
  USING (true);

-- ============================================================
-- Politica INSERT: solo el propio usuario
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own specializations" ON user_specializations;

CREATE POLICY "Users can insert own specializations"
  ON user_specializations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Politica UPDATE: solo el propio usuario
-- (no existia antes, se agrega por completitud)
-- ============================================================
DROP POLICY IF EXISTS "Users can update own specializations" ON user_specializations;

CREATE POLICY "Users can update own specializations"
  ON user_specializations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Politica DELETE: solo el propio usuario
-- ============================================================
DROP POLICY IF EXISTS "Users can delete own specializations" ON user_specializations;

CREATE POLICY "Users can delete own specializations"
  ON user_specializations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
