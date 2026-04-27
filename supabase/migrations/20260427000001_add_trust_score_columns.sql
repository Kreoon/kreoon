-- Migration: Add trust score columns to creator_profiles
-- Date: 2026-04-27
-- Author: Alexander Cast

-- ============================================================
-- Columns
-- ============================================================
ALTER TABLE creator_profiles
  ADD COLUMN IF NOT EXISTS trust_score           NUMERIC(5,2)  DEFAULT 60.00,
  ADD COLUMN IF NOT EXISTS trust_score_breakdown JSONB         DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trust_score_updated_at TIMESTAMPTZ  DEFAULT now();

COMMENT ON COLUMN creator_profiles.trust_score
  IS 'Puntaje de confianza global del creador (0-100). 60 = perfil nuevo sin historial.';

COMMENT ON COLUMN creator_profiles.trust_score_breakdown
  IS 'Desglose del trust_score por dimensión: reviews, delivery, projects, profile, portfolio, response.';

COMMENT ON COLUMN creator_profiles.trust_score_updated_at
  IS 'Timestamp del último cálculo del trust_score.';

-- ============================================================
-- Index
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_creator_profiles_trust_score
  ON creator_profiles (trust_score DESC);
