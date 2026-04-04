-- =====================================================
-- FIX: Profile Builder Dependencies
-- Date: 2026-04-03
-- Corrige permisos RLS y asegura que las tablas existan
-- =====================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. FIX: user_specializations - permitir ver especializaciones de creadores
-- ─────────────────────────────────────────────────────────────────────────────

-- Eliminar politica anterior que depende de profiles.is_public (puede no existir)
DROP POLICY IF EXISTS "Anyone can view specializations of public profiles" ON user_specializations;

-- Nueva politica: Cualquiera puede ver especializaciones de usuarios con creator_profile activo
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
-- 2. ENSURE: creator_reviews table exists
-- ─────────────────────────────────────────────────────────────────────────────

-- La tabla puede ya existir desde 20260402_creator_reviews.sql
-- Si no existe, la creamos aqui

CREATE TABLE IF NOT EXISTS public.creator_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES creator_profiles(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewer_name text NOT NULL,
  reviewer_email text,
  reviewer_company text,
  reviewer_avatar_url text,
  reviewer_role text,
  project_id uuid,
  service_type text,
  collaboration_date date,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text NOT NULL CHECK (char_length(content) >= 10),
  rating_communication integer CHECK (rating_communication >= 1 AND rating_communication <= 5),
  rating_quality integer CHECK (rating_quality >= 1 AND rating_quality <= 5),
  rating_timeliness integer CHECK (rating_timeliness >= 1 AND rating_timeliness <= 5),
  rating_professionalism integer CHECK (rating_professionalism >= 1 AND rating_professionalism <= 5),
  is_verified boolean DEFAULT false,
  verification_token text UNIQUE,
  verification_method text,
  verified_at timestamptz,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'flagged')),
  is_featured boolean DEFAULT false,
  moderated_at timestamptz,
  moderated_by uuid REFERENCES profiles(id),
  moderation_notes text,
  creator_response text,
  creator_responded_at timestamptz,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_creator_reviews_creator ON creator_reviews(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_reviews_status ON creator_reviews(creator_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_reviews_verified ON creator_reviews(creator_id, is_verified, status);

-- RLS
ALTER TABLE creator_reviews ENABLE ROW LEVEL SECURITY;

-- Politicas (usar DROP IF EXISTS para evitar duplicados)
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
-- 3. ENSURE: get_creator_review_stats function exists
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_creator_review_stats(p_creator_id uuid)
RETURNS TABLE (
  total_reviews bigint,
  average_rating numeric,
  rating_distribution jsonb,
  verified_reviews bigint,
  recent_reviews bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::bigint as total_reviews,
    COALESCE(ROUND(AVG(cr.rating)::numeric, 2), 0) as average_rating,
    COALESCE(
      jsonb_build_object(
        '5', COUNT(*) FILTER (WHERE cr.rating = 5),
        '4', COUNT(*) FILTER (WHERE cr.rating = 4),
        '3', COUNT(*) FILTER (WHERE cr.rating = 3),
        '2', COUNT(*) FILTER (WHERE cr.rating = 2),
        '1', COUNT(*) FILTER (WHERE cr.rating = 1)
      ),
      '{"5":0,"4":0,"3":0,"2":0,"1":0}'::jsonb
    ) as rating_distribution,
    COUNT(*) FILTER (WHERE cr.is_verified = true)::bigint as verified_reviews,
    COUNT(*) FILTER (WHERE cr.created_at > now() - interval '30 days')::bigint as recent_reviews
  FROM creator_reviews cr
  WHERE cr.creator_id = p_creator_id
    AND cr.status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ENSURE: profile_builder_blocks table and functions exist
-- ─────────────────────────────────────────────────────────────────────────────

-- Asegurar que la tabla existe
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

-- Indices
CREATE INDEX IF NOT EXISTS idx_profile_builder_blocks_profile
  ON profile_builder_blocks(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_builder_blocks_draft
  ON profile_builder_blocks(profile_id, is_draft);

-- RLS
ALTER TABLE profile_builder_blocks ENABLE ROW LEVEL SECURITY;

-- Politicas (con DROP IF EXISTS)
DROP POLICY IF EXISTS "Users can view own profile blocks" ON profile_builder_blocks;
CREATE POLICY "Users can view own profile blocks"
  ON profile_builder_blocks FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own profile blocks" ON profile_builder_blocks;
CREATE POLICY "Users can insert own profile blocks"
  ON profile_builder_blocks FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own profile blocks" ON profile_builder_blocks;
CREATE POLICY "Users can update own profile blocks"
  ON profile_builder_blocks FOR UPDATE
  USING (
    profile_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own profile blocks" ON profile_builder_blocks;
CREATE POLICY "Users can delete own profile blocks"
  ON profile_builder_blocks FOR DELETE
  USING (
    profile_id IN (
      SELECT id FROM creator_profiles WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Anyone can view published blocks" ON profile_builder_blocks;
CREATE POLICY "Anyone can view published blocks"
  ON profile_builder_blocks FOR SELECT
  USING (is_draft = false);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ENSURE: RPC functions exist
-- ─────────────────────────────────────────────────────────────────────────────

-- get_profile_builder_data
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
      WHERE cp.id = profile_id
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

-- save_profile_blocks
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
  -- Verificar que el usuario es dueno del perfil
  IF NOT EXISTS (
    SELECT 1 FROM creator_profiles
    WHERE id = save_profile_blocks.profile_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Validar limite de 15 bloques
  IF jsonb_array_length(blocks) > 15 THEN
    RAISE EXCEPTION 'Maximo 15 bloques permitidos';
  END IF;

  -- Eliminar bloques existentes (del tipo correspondiente: draft o published)
  IF is_draft THEN
    DELETE FROM profile_builder_blocks
    WHERE profile_builder_blocks.profile_id = save_profile_blocks.profile_id AND profile_builder_blocks.is_draft = true;
  ELSE
    DELETE FROM profile_builder_blocks
    WHERE profile_builder_blocks.profile_id = save_profile_blocks.profile_id;
  END IF;

  -- Insertar nuevos bloques
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

  -- Actualizar flag de draft en el perfil
  UPDATE creator_profiles
  SET builder_has_draft = save_profile_blocks.is_draft
  WHERE id = save_profile_blocks.profile_id;

  RETURN true;
END;
$$;

-- publish_profile_blocks
CREATE OR REPLACE FUNCTION publish_profile_blocks(profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar propiedad
  IF NOT EXISTS (
    SELECT 1 FROM creator_profiles
    WHERE id = publish_profile_blocks.profile_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Eliminar bloques publicados anteriores
  DELETE FROM profile_builder_blocks
  WHERE profile_builder_blocks.profile_id = publish_profile_blocks.profile_id AND is_draft = false;

  -- Convertir drafts a publicados
  UPDATE profile_builder_blocks
  SET is_draft = false
  WHERE profile_builder_blocks.profile_id = publish_profile_blocks.profile_id AND is_draft = true;

  -- Limpiar flag
  UPDATE creator_profiles
  SET builder_has_draft = false
  WHERE id = publish_profile_blocks.profile_id;

  RETURN true;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Asegurar columnas en creator_profiles
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS builder_config jsonb DEFAULT '{
  "theme": "dark",
  "accentColor": "#8B5CF6",
  "fontHeading": "inter",
  "fontBody": "inter",
  "spacing": "normal",
  "borderRadius": "md",
  "showKreoonBranding": true
}'::jsonb;

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS builder_template text DEFAULT NULL;

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS builder_has_draft boolean DEFAULT false;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done
-- ─────────────────────────────────────────────────────────────────────────────
