-- Migration: Mejorar search_vector para incluir username y slug
-- Fecha: 2026-05-06
-- Descripcion: Agrega username y slug al tsvector para búsquedas por @username

-- 1. Actualizar función para incluir username y slug en el search_vector
CREATE OR REPLACE FUNCTION update_creator_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := to_tsvector('spanish',
    coalesce(NEW.display_name, '') || ' ' ||
    coalesce(NEW.username, '') || ' ' ||
    coalesce(NEW.slug, '') || ' ' ||
    coalesce(NEW.bio, '') || ' ' ||
    coalesce(NEW.primary_role, '') || ' ' ||
    coalesce(NEW.location_city, '') || ' ' ||
    coalesce(NEW.location_country, '') || ' ' ||
    coalesce(array_to_string(NEW.skills, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.content_types, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.niches, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.categories, ' '), '') || ' ' ||
    coalesce(array_to_string(NEW.marketplace_roles, ' '), '')
  );
  RETURN NEW;
END;
$$;

-- 2. Regenerar todos los vectores existentes para incluir username/slug
-- Esto dispara el trigger que recalcula search_vector
UPDATE creator_profiles
SET updated_at = now()
WHERE is_active = true;

-- 3. Comentario para verificación
COMMENT ON FUNCTION update_creator_search_vector() IS
  'Genera tsvector para búsqueda full-text. Incluye: display_name, username, slug, bio, primary_role, location, skills, content_types, niches, categories, marketplace_roles';
