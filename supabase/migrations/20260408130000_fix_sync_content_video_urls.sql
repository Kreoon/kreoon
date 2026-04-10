-- =============================================================================
-- Migration: Fix sync contenido - usar video_urls[] array
-- Fecha: 2026-04-08
-- Descripcion: Corrige la funcion y migracion para usar video_urls[1] cuando
--              video_url y bunny_embed_url estan NULL
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Actualizar funcion para incluir video_urls[]
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_approved_content_to_portfolio()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_creator_profile_id UUID;
  v_editor_profile_id UUID;
  v_video_url TEXT;
  v_thumbnail_url TEXT;
BEGIN
  -- Trigger: cuando status cambia a 'approved' (desde otro estado)
  IF NEW.status = 'approved'
     AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    -- Determinar URL del video (prioridad: bunny_embed_url, video_url, video_urls[1])
    v_video_url := COALESCE(
      NEW.bunny_embed_url,
      NEW.video_url,
      (NEW.video_urls::text[])[1]
    );
    v_thumbnail_url := NEW.thumbnail_url;

    -- Si no hay video, no hacer nada
    IF v_video_url IS NULL THEN
      RETURN NEW;
    END IF;

    -- CREADOR: Buscar creator_profile del creator_id
    IF NEW.creator_id IS NOT NULL THEN
      SELECT id INTO v_creator_profile_id
      FROM creator_profiles
      WHERE user_id = NEW.creator_id;

      IF v_creator_profile_id IS NOT NULL THEN
        INSERT INTO portfolio_items (
          creator_id, content_id, organization_id, title, description,
          media_type, media_url, thumbnail_url,
          is_public, is_featured, source_type, display_order
        )
        SELECT
          v_creator_profile_id, NEW.id, NEW.organization_id, NEW.title, NEW.description,
          'video', v_video_url, v_thumbnail_url,
          false, false, 'organization_content', 0
        WHERE NOT EXISTS (
          SELECT 1 FROM portfolio_items
          WHERE content_id = NEW.id AND creator_id = v_creator_profile_id
        );
      END IF;
    END IF;

    -- EDITOR: Buscar creator_profile del editor_id (si es diferente al creator)
    IF NEW.editor_id IS NOT NULL AND NEW.editor_id != NEW.creator_id THEN
      SELECT id INTO v_editor_profile_id
      FROM creator_profiles
      WHERE user_id = NEW.editor_id;

      IF v_editor_profile_id IS NOT NULL THEN
        INSERT INTO portfolio_items (
          creator_id, content_id, organization_id, title, description,
          media_type, media_url, thumbnail_url,
          is_public, is_featured, source_type, display_order
        )
        SELECT
          v_editor_profile_id, NEW.id, NEW.organization_id, NEW.title, NEW.description,
          'video', v_video_url, v_thumbnail_url,
          false, false, 'organization_content', 0
        WHERE NOT EXISTS (
          SELECT 1 FROM portfolio_items
          WHERE content_id = NEW.id AND creator_id = v_editor_profile_id
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2. Re-migrar contenido existente con logica corregida
-- -----------------------------------------------------------------------------

-- Migrar contenido de CREADORES (incluyendo video_urls[])
-- Usa NOT EXISTS en lugar de ON CONFLICT porque el indice es parcial
INSERT INTO portfolio_items (
  creator_id, content_id, organization_id, title, description,
  media_type, media_url, thumbnail_url,
  is_public, is_featured, source_type, display_order
)
SELECT
  cp.id as creator_id,
  c.id as content_id,
  c.organization_id,
  c.title,
  c.description,
  'video' as media_type,
  COALESCE(c.bunny_embed_url, c.video_url, (c.video_urls::text[])[1]) as media_url,
  c.thumbnail_url,
  false as is_public,
  false as is_featured,
  'organization_content' as source_type,
  0 as display_order
FROM content c
JOIN creator_profiles cp ON cp.user_id = c.creator_id
WHERE c.status IN ('approved', 'paid')
  AND COALESCE(c.bunny_embed_url, c.video_url, (c.video_urls::text[])[1]) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_items pi
    WHERE pi.content_id = c.id AND pi.creator_id = cp.id
  );

-- Migrar contenido de EDITORES (si son diferentes al creador)
INSERT INTO portfolio_items (
  creator_id, content_id, organization_id, title, description,
  media_type, media_url, thumbnail_url,
  is_public, is_featured, source_type, display_order
)
SELECT
  cp.id as creator_id,
  c.id as content_id,
  c.organization_id,
  c.title,
  c.description,
  'video' as media_type,
  COALESCE(c.bunny_embed_url, c.video_url, (c.video_urls::text[])[1]) as media_url,
  c.thumbnail_url,
  false as is_public,
  false as is_featured,
  'organization_content' as source_type,
  0 as display_order
FROM content c
JOIN creator_profiles cp ON cp.user_id = c.editor_id
WHERE c.status IN ('approved', 'paid')
  AND c.editor_id IS NOT NULL
  AND c.editor_id != c.creator_id
  AND COALESCE(c.bunny_embed_url, c.video_url, (c.video_urls::text[])[1]) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM portfolio_items pi
    WHERE pi.content_id = c.id AND pi.creator_id = cp.id
  );

-- -----------------------------------------------------------------------------
-- 3. Comentario actualizado
-- -----------------------------------------------------------------------------

COMMENT ON FUNCTION public.sync_approved_content_to_portfolio() IS 'Trigger function que copia contenido aprobado al portafolio del creador y editor. Usa video_urls[1] como fallback cuando bunny_embed_url y video_url estan NULL.';
