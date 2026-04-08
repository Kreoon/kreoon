-- =============================================================================
-- Migration: Sync contenido aprobado a portafolio de creadores/editores
-- Fecha: 2026-04-08
-- Descripcion: Cuando un contenido pasa a 'approved', automaticamente se crea
--              un item en el portafolio del creador y editor asignados.
--              Tambien migra el contenido existente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Agregar columnas a portfolio_items
-- -----------------------------------------------------------------------------

ALTER TABLE public.portfolio_items
ADD COLUMN IF NOT EXISTS content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('manual', 'organization_content')),
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Indice unico para evitar duplicados (content + creator_profile)
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolio_items_content_creator
ON public.portfolio_items(content_id, creator_id)
WHERE content_id IS NOT NULL;

-- Indice para buscar items por organizacion
CREATE INDEX IF NOT EXISTS idx_portfolio_items_organization
ON public.portfolio_items(organization_id)
WHERE organization_id IS NOT NULL;

-- Indice para filtrar por source_type
CREATE INDEX IF NOT EXISTS idx_portfolio_items_source_type
ON public.portfolio_items(source_type);

-- -----------------------------------------------------------------------------
-- 2. Funcion para sincronizar contenido aprobado a portafolio
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
  -- El video aparece en portafolio inmediatamente al aprobar
  IF NEW.status = 'approved'
     AND (OLD.status IS NULL OR OLD.status != 'approved') THEN

    -- Determinar URL del video
    v_video_url := COALESCE(NEW.bunny_embed_url, NEW.video_url);
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
        VALUES (
          v_creator_profile_id, NEW.id, NEW.organization_id, NEW.title, NEW.description,
          'video', v_video_url, v_thumbnail_url,
          false, false, 'organization_content', 0
        )
        ON CONFLICT (content_id, creator_id) DO NOTHING;
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
        VALUES (
          v_editor_profile_id, NEW.id, NEW.organization_id, NEW.title, NEW.description,
          'video', v_video_url, v_thumbnail_url,
          false, false, 'organization_content', 0
        )
        ON CONFLICT (content_id, creator_id) DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. Crear trigger
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trigger_sync_approved_content_to_portfolio ON public.content;

CREATE TRIGGER trigger_sync_approved_content_to_portfolio
AFTER UPDATE ON public.content
FOR EACH ROW
EXECUTE FUNCTION public.sync_approved_content_to_portfolio();

-- -----------------------------------------------------------------------------
-- 4. Migracion retroactiva del contenido existente
-- -----------------------------------------------------------------------------

-- Migrar contenido de CREADORES
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
  COALESCE(c.bunny_embed_url, c.video_url) as media_url,
  c.thumbnail_url,
  false as is_public,
  false as is_featured,
  'organization_content' as source_type,
  0 as display_order
FROM content c
JOIN creator_profiles cp ON cp.user_id = c.creator_id
WHERE c.status IN ('approved', 'paid')
  AND COALESCE(c.bunny_embed_url, c.video_url) IS NOT NULL
ON CONFLICT (content_id, creator_id) DO NOTHING;

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
  COALESCE(c.bunny_embed_url, c.video_url) as media_url,
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
  AND COALESCE(c.bunny_embed_url, c.video_url) IS NOT NULL
ON CONFLICT (content_id, creator_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. Comentarios para documentacion
-- -----------------------------------------------------------------------------

COMMENT ON COLUMN public.portfolio_items.content_id IS 'Referencia al contenido de organizacion (si aplica)';
COMMENT ON COLUMN public.portfolio_items.source_type IS 'Origen del item: manual (subido por usuario) o organization_content (de proyecto aprobado)';
COMMENT ON COLUMN public.portfolio_items.organization_id IS 'Organizacion de origen (si source_type = organization_content)';
COMMENT ON FUNCTION public.sync_approved_content_to_portfolio() IS 'Trigger function que copia contenido aprobado al portafolio del creador y editor';
