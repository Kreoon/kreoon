-- ============================================================================
-- Migracion: Sincronizacion bidireccional de redes sociales
-- profiles <-> creator_profiles
-- Fecha: 2026-03-30
-- ============================================================================
--
-- PROBLEMA:
-- - profiles tiene columnas individuales: instagram, tiktok, facebook,
--   social_linkedin, social_youtube, social_twitter
-- - creator_profiles tiene columna JSONB: social_links
-- - No habia sincronizacion completa entre ambas tablas
--
-- SOLUCION:
-- 1. Actualizar trigger profiles -> creator_profiles (todas las redes)
-- 2. Crear nuevo trigger creator_profiles -> profiles (direccion inversa)
-- ============================================================================

-- 1. Actualizar funcion profiles -> creator_profiles (incluir TODAS las redes)
CREATE OR REPLACE FUNCTION public.sync_profile_updates_to_marketplace()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.creator_profiles
  SET
    display_name = COALESCE(NULLIF(TRIM(NEW.full_name), ''), display_name),
    avatar_url = COALESCE(NEW.avatar_url, avatar_url),
    location_city = COALESCE(NEW.city, location_city),
    location_country = COALESCE(NEW.country, location_country),
    -- Sincronizar TODAS las redes sociales
    social_links = jsonb_strip_nulls(
      COALESCE(social_links, '{}'::jsonb)
      || jsonb_build_object(
        'instagram', NULLIF(NEW.instagram, ''),
        'tiktok', NULLIF(NEW.tiktok, ''),
        'facebook', NULLIF(NEW.facebook, ''),
        'youtube', NULLIF(NEW.social_youtube, ''),
        'linkedin', NULLIF(NEW.social_linkedin, ''),
        'twitter', NULLIF(NEW.social_twitter, '')
      )
    ),
    updated_at = now()
  WHERE user_id = NEW.id;

  RETURN NEW;
END;
$function$;

-- 2. Crear funcion creator_profiles -> profiles (direccion inversa)
CREATE OR REPLACE FUNCTION public.sync_marketplace_to_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Solo sincronizar si social_links cambio
  IF OLD.social_links IS DISTINCT FROM NEW.social_links THEN
    UPDATE public.profiles
    SET
      instagram = COALESCE(NEW.social_links->>'instagram', instagram),
      tiktok = COALESCE(NEW.social_links->>'tiktok', tiktok),
      facebook = COALESCE(NEW.social_links->>'facebook', facebook),
      social_youtube = COALESCE(NEW.social_links->>'youtube', social_youtube),
      social_linkedin = COALESCE(NEW.social_links->>'linkedin', social_linkedin),
      social_twitter = COALESCE(NEW.social_links->>'twitter', social_twitter),
      updated_at = now()
    WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. Crear trigger para creator_profiles -> profiles
DROP TRIGGER IF EXISTS trigger_sync_marketplace_to_profile ON public.creator_profiles;

CREATE TRIGGER trigger_sync_marketplace_to_profile
  AFTER UPDATE OF social_links ON public.creator_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_marketplace_to_profile();

-- 4. Comentarios para documentacion
COMMENT ON FUNCTION public.sync_profile_updates_to_marketplace() IS
'Sincroniza cambios de profiles a creator_profiles (redes sociales, avatar, ubicacion)';

COMMENT ON FUNCTION public.sync_marketplace_to_profile() IS
'Sincroniza cambios de social_links en creator_profiles de vuelta a profiles';

-- 5. Sincronizacion inicial de datos existentes (one-time)
-- Actualizar creator_profiles con datos de profiles que no esten sincronizados
UPDATE public.creator_profiles cp
SET social_links = jsonb_strip_nulls(
  COALESCE(cp.social_links, '{}'::jsonb)
  || jsonb_build_object(
    'instagram', NULLIF(p.instagram, ''),
    'tiktok', NULLIF(p.tiktok, ''),
    'facebook', NULLIF(p.facebook, ''),
    'youtube', NULLIF(p.social_youtube, ''),
    'linkedin', NULLIF(p.social_linkedin, ''),
    'twitter', NULLIF(p.social_twitter, '')
  )
)
FROM public.profiles p
WHERE cp.user_id = p.id
AND (
  p.instagram IS NOT NULL OR
  p.tiktok IS NOT NULL OR
  p.facebook IS NOT NULL OR
  p.social_youtube IS NOT NULL OR
  p.social_linkedin IS NOT NULL OR
  p.social_twitter IS NOT NULL
);
