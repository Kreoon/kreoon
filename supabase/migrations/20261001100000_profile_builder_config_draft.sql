-- Borrador de estilo del portafolio separado del publicado (QA 2026-10-01).
--
-- Problema: el autoguardado del constructor V2 escribía creator_profiles.builder_config, la MISMA columna que
-- lee la página pública (usePublishedProfileBlocks): cualquier cambio de estilo en borrador se veía en vivo.
--
-- Solución:
--   · Nueva columna builder_config_draft: el editor guarda aquí el estilo mientras edita.
--   · publish_profile_blocks promueve en una sola transacción bloques Y estilo (draft → publicado).
--   · La página pública sigue leyendo builder_config (solo cambia al publicar).
--
-- Reversión:
--   ALTER TABLE public.creator_profiles DROP COLUMN IF EXISTS builder_config_draft;
--   y restaurar publish_profile_blocks sin la línea de builder_config (versión previa en el comentario final).

ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS builder_config_draft jsonb;

COMMENT ON COLUMN public.creator_profiles.builder_config_draft IS
  'Estilo del portafolio en borrador; se copia a builder_config al publicar (publish_profile_blocks)';

CREATE OR REPLACE FUNCTION public.publish_profile_blocks(profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verificar propiedad
  IF NOT EXISTS (
    SELECT 1 FROM creator_profiles
    WHERE id = publish_profile_blocks.profile_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Solo reemplazar lo publicado si hay borradores que promover (evita dejar el perfil vacío)
  IF EXISTS (
    SELECT 1 FROM profile_builder_blocks
    WHERE profile_builder_blocks.profile_id = publish_profile_blocks.profile_id AND is_draft = true
  ) THEN
    DELETE FROM profile_builder_blocks
    WHERE profile_builder_blocks.profile_id = publish_profile_blocks.profile_id AND is_draft = false;

    UPDATE profile_builder_blocks
    SET is_draft = false
    WHERE profile_builder_blocks.profile_id = publish_profile_blocks.profile_id AND is_draft = true;
  END IF;

  -- Promover el estilo en borrador junto con los bloques
  UPDATE creator_profiles
  SET builder_config = COALESCE(builder_config_draft, builder_config),
      builder_config_draft = NULL,
      builder_has_draft = false
  WHERE id = publish_profile_blocks.profile_id;

  RETURN true;
END;
$function$;

-- Versión previa (para reversión): igual pero sin el IF EXISTS de borradores y con
--   UPDATE creator_profiles SET builder_has_draft = false WHERE id = publish_profile_blocks.profile_id;
