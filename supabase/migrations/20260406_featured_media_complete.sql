-- ============================================================================
-- MIGRACION COMPLETA: Featured Media para Creator Profiles
-- Ejecutar este archivo en Supabase SQL Editor
-- ============================================================================

-- 1. Agregar columnas a creator_profiles (si no existen)
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS featured_media_id UUID REFERENCES portfolio_items(id) ON DELETE SET NULL;

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS featured_media_url TEXT;

ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS featured_media_type TEXT CHECK (featured_media_type IN ('image', 'video'));

-- 2. Crear indice
CREATE INDEX IF NOT EXISTS idx_creator_profiles_featured_media
ON creator_profiles(featured_media_id)
WHERE featured_media_id IS NOT NULL;

-- 3. Funcion RPC corregida (usa creator_id y media_url de portfolio_items)
CREATE OR REPLACE FUNCTION set_featured_media(
  p_creator_profile_id UUID,
  p_media_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_media RECORD;
  v_user_id UUID;
BEGIN
  -- Verificar que el usuario es dueno del perfil
  SELECT user_id INTO v_user_id
  FROM creator_profiles
  WHERE id = p_creator_profile_id;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Perfil no encontrado');
  END IF;

  IF v_user_id != auth.uid() THEN
    RETURN json_build_object('success', false, 'error', 'No autorizado');
  END IF;

  -- Si p_media_id es NULL, limpiar el featured media
  IF p_media_id IS NULL THEN
    UPDATE creator_profiles
    SET
      featured_media_id = NULL,
      featured_media_url = NULL,
      featured_media_type = NULL,
      updated_at = NOW()
    WHERE id = p_creator_profile_id;

    RETURN json_build_object('success', true, 'message', 'Featured media eliminado');
  END IF;

  -- Obtener datos del media (creator_id es el FK correcto, media_url es el campo de URL)
  SELECT
    id,
    media_url,
    thumbnail_url,
    media_type
  INTO v_media
  FROM portfolio_items
  WHERE id = p_media_id
    AND creator_id = p_creator_profile_id;

  IF v_media.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Media no encontrado o no pertenece al perfil');
  END IF;

  -- Actualizar el perfil con el featured media
  UPDATE creator_profiles
  SET
    featured_media_id = v_media.id,
    featured_media_url = COALESCE(v_media.thumbnail_url, v_media.media_url),
    featured_media_type = v_media.media_type,
    updated_at = NOW()
  WHERE id = p_creator_profile_id;

  RETURN json_build_object(
    'success', true,
    'featured_media_id', v_media.id,
    'featured_media_url', COALESCE(v_media.thumbnail_url, v_media.media_url),
    'featured_media_type', v_media.media_type
  );
END;
$$;

-- 4. Actualizar get_profile_builder_data para incluir featured_media
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
        'builder_has_draft', COALESCE(cp.builder_has_draft, false),
        -- Featured media para marketplace
        'featured_media_id', cp.featured_media_id,
        'featured_media_url', cp.featured_media_url,
        'featured_media_type', cp.featured_media_type
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

-- 5. Trigger para limpiar featured_media si se elimina el portfolio_item
CREATE OR REPLACE FUNCTION clear_featured_media_on_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE creator_profiles
  SET
    featured_media_id = NULL,
    featured_media_url = NULL,
    featured_media_type = NULL
  WHERE featured_media_id = OLD.id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_clear_featured_media ON portfolio_items;
CREATE TRIGGER trg_clear_featured_media
BEFORE DELETE ON portfolio_items
FOR EACH ROW
EXECUTE FUNCTION clear_featured_media_on_delete();

-- 6. Comentarios
COMMENT ON COLUMN creator_profiles.featured_media_id IS 'ID del item del portafolio seleccionado como destacado';
COMMENT ON COLUMN creator_profiles.featured_media_url IS 'URL cacheada del thumbnail/imagen destacada para queries rapidas';
COMMENT ON COLUMN creator_profiles.featured_media_type IS 'Tipo de media: image o video';
