-- =====================================================
-- FIX v2: Profile Builder Dependencies
-- Date: 2026-04-03
-- Version segura que maneja tablas existentes
-- =====================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FIX: user_specializations RLS
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view specializations of public profiles" ON user_specializations;
DROP POLICY IF EXISTS "Anyone can view specializations of active creators" ON user_specializations;

CREATE POLICY "Anyone can view specializations of active creators"
  ON user_specializations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM creator_profiles cp
      WHERE cp.user_id = user_specializations.user_id
      AND cp.is_active = true
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. FIX: creator_reviews - agregar columna status si no existe
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  -- Agregar columna status si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_reviews' AND column_name = 'status'
  ) THEN
    ALTER TABLE creator_reviews ADD COLUMN status text DEFAULT 'pending';
    ALTER TABLE creator_reviews ADD CONSTRAINT creator_reviews_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'flagged'));
  END IF;

  -- Agregar columna is_verified si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_reviews' AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE creator_reviews ADD COLUMN is_verified boolean DEFAULT false;
  END IF;

  -- Agregar columna is_featured si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_reviews' AND column_name = 'is_featured'
  ) THEN
    ALTER TABLE creator_reviews ADD COLUMN is_featured boolean DEFAULT false;
  END IF;

  -- Agregar columna creator_response si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_reviews' AND column_name = 'creator_response'
  ) THEN
    ALTER TABLE creator_reviews ADD COLUMN creator_response text;
  END IF;

  -- Agregar columna collaboration_date si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_reviews' AND column_name = 'collaboration_date'
  ) THEN
    ALTER TABLE creator_reviews ADD COLUMN collaboration_date date;
  END IF;

  -- Agregar columna reviewer_company si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_reviews' AND column_name = 'reviewer_company'
  ) THEN
    ALTER TABLE creator_reviews ADD COLUMN reviewer_company text;
  END IF;

  -- Agregar columna reviewer_avatar_url si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_reviews' AND column_name = 'reviewer_avatar_url'
  ) THEN
    ALTER TABLE creator_reviews ADD COLUMN reviewer_avatar_url text;
  END IF;

  -- Agregar columna title si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'creator_reviews' AND column_name = 'title'
  ) THEN
    ALTER TABLE creator_reviews ADD COLUMN title text;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS para creator_reviews
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE creator_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved reviews" ON creator_reviews;
CREATE POLICY "Public can view approved reviews" ON creator_reviews
  FOR SELECT
  USING (status = 'approved' AND is_verified = true);

DROP POLICY IF EXISTS "Creators can view their own reviews" ON creator_reviews;
CREATE POLICY "Creators can view their own reviews" ON creator_reviews
  FOR SELECT
  USING (
    creator_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can submit reviews" ON creator_reviews;
CREATE POLICY "Anyone can submit reviews" ON creator_reviews
  FOR INSERT
  WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Funcion get_creator_review_stats
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_creator_review_stats(p_creator_id uuid)
RETURNS TABLE (
  total_reviews bigint,
  average_rating numeric,
  verified_reviews bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_reviews,
    COALESCE(ROUND(AVG(cr.rating)::numeric, 2), 0) as average_rating,
    COUNT(*) FILTER (WHERE cr.is_verified = true)::bigint as verified_reviews
  FROM creator_reviews cr
  WHERE cr.creator_id = p_creator_id
    AND cr.status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. profile_builder_blocks tabla y RLS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profile_builder_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  block_type text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  is_visible boolean DEFAULT true,
  is_draft boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  styles jsonb DEFAULT '{}',
  content jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_builder_blocks_profile ON profile_builder_blocks(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_builder_blocks_draft ON profile_builder_blocks(profile_id, is_draft);

ALTER TABLE profile_builder_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile blocks" ON profile_builder_blocks;
CREATE POLICY "Users can view own profile blocks" ON profile_builder_blocks FOR SELECT
  USING (profile_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile blocks" ON profile_builder_blocks;
CREATE POLICY "Users can insert own profile blocks" ON profile_builder_blocks FOR INSERT
  WITH CHECK (profile_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update own profile blocks" ON profile_builder_blocks;
CREATE POLICY "Users can update own profile blocks" ON profile_builder_blocks FOR UPDATE
  USING (profile_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete own profile blocks" ON profile_builder_blocks;
CREATE POLICY "Users can delete own profile blocks" ON profile_builder_blocks FOR DELETE
  USING (profile_id IN (SELECT id FROM creator_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can view published blocks" ON profile_builder_blocks;
CREATE POLICY "Anyone can view published blocks" ON profile_builder_blocks FOR SELECT
  USING (is_draft = false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Funciones RPC del Profile Builder
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_profile_builder_data(profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'id', cp.id,
        'user_id', cp.user_id,
        'display_name', cp.display_name,
        'bio', cp.bio,
        'avatar_url', cp.avatar_url,
        'banner_url', cp.banner_url,
        'builder_config', COALESCE(cp.builder_config, '{}'::jsonb),
        'builder_template', cp.builder_template,
        'builder_has_draft', COALESCE(cp.builder_has_draft, false)
      )
      FROM creator_profiles cp
      WHERE cp.id = get_profile_builder_data.profile_id
    ),
    'blocks', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', b.id,
          'type', b.block_type,
          'orderIndex', b.order_index,
          'isVisible', b.is_visible,
          'isDraft', b.is_draft,
          'config', b.config,
          'styles', b.styles,
          'content', b.content
        ) ORDER BY b.order_index
      )
      FROM profile_builder_blocks b
      WHERE b.profile_id = get_profile_builder_data.profile_id),
      '[]'::jsonb
    )
  ) INTO result;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION save_profile_blocks(
  profile_id uuid,
  blocks jsonb,
  is_draft boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM creator_profiles
    WHERE id = save_profile_blocks.profile_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF jsonb_array_length(blocks) > 15 THEN
    RAISE EXCEPTION 'Maximo 15 bloques permitidos';
  END IF;

  IF is_draft THEN
    DELETE FROM profile_builder_blocks
    WHERE profile_builder_blocks.profile_id = save_profile_blocks.profile_id
      AND profile_builder_blocks.is_draft = true;
  ELSE
    DELETE FROM profile_builder_blocks
    WHERE profile_builder_blocks.profile_id = save_profile_blocks.profile_id;
  END IF;

  INSERT INTO profile_builder_blocks (
    profile_id, block_type, order_index, is_visible, is_draft, config, styles, content
  )
  SELECT
    save_profile_blocks.profile_id,
    b->>'type',
    (b->>'orderIndex')::int,
    COALESCE((b->>'isVisible')::boolean, true),
    save_profile_blocks.is_draft,
    COALESCE(b->'config', '{}'::jsonb),
    COALESCE(b->'styles', '{}'::jsonb),
    COALESCE(b->'content', '{}'::jsonb)
  FROM jsonb_array_elements(blocks) b;

  UPDATE creator_profiles
  SET builder_has_draft = save_profile_blocks.is_draft
  WHERE id = save_profile_blocks.profile_id;

  RETURN true;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Columnas en creator_profiles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS builder_config jsonb DEFAULT '{"theme":"dark","accentColor":"#8B5CF6","fontHeading":"inter","fontBody":"inter","spacing":"normal","borderRadius":"md","showKreoonBranding":true}'::jsonb;

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS builder_template text DEFAULT NULL;

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS builder_has_draft boolean DEFAULT false;
