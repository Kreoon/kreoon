-- ============================================================================
-- Migracion: Corregir errores del marketplace
-- Fecha: 2026-04-01
-- Descripcion: Corrige RPC faltante, RLS de specializations, y otros errores
-- ============================================================================

-- ============================================================================
-- 1. CREAR FUNCION RPC get_marketplace_filter_options
-- Error: "column cp.marketplace_visible does not exist"
-- ============================================================================

CREATE OR REPLACE FUNCTION get_marketplace_filter_options()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'locations', COALESCE((
      SELECT jsonb_agg(DISTINCT loc)
      FROM (
        SELECT location_country AS loc
        FROM creator_profiles
        WHERE is_active = true
        AND is_published = true
        AND location_country IS NOT NULL
        AND location_country != ''
      ) AS locations
    ), '[]'::jsonb),
    'cities', COALESCE((
      SELECT jsonb_agg(DISTINCT city)
      FROM (
        SELECT location_city AS city
        FROM creator_profiles
        WHERE is_active = true
        AND is_published = true
        AND location_city IS NOT NULL
        AND location_city != ''
      ) AS cities
    ), '[]'::jsonb),
    'categories', COALESCE((
      SELECT array_agg(DISTINCT cat)
      FROM creator_profiles cp, unnest(cp.categories) AS cat
      WHERE cp.is_active = true
      AND cp.is_published = true
    ), ARRAY[]::TEXT[]),
    'content_types', COALESCE((
      SELECT array_agg(DISTINCT ct)
      FROM creator_profiles cp, unnest(cp.content_types) AS ct
      WHERE cp.is_active = true
      AND cp.is_published = true
    ), ARRAY[]::TEXT[]),
    'languages', COALESCE((
      SELECT array_agg(DISTINCT lang)
      FROM creator_profiles cp, unnest(cp.languages) AS lang
      WHERE cp.is_active = true
      AND cp.is_published = true
    ), ARRAY[]::TEXT[]),
    'levels', COALESCE((
      SELECT array_agg(DISTINCT level)
      FROM creator_profiles
      WHERE is_active = true
      AND is_published = true
      AND level IS NOT NULL
    ), ARRAY[]::TEXT[])
  ) INTO result;

  RETURN result;
END;
$$;

-- Permisos para la funcion
GRANT EXECUTE ON FUNCTION get_marketplace_filter_options() TO anon;
GRANT EXECUTE ON FUNCTION get_marketplace_filter_options() TO authenticated;

COMMENT ON FUNCTION get_marketplace_filter_options() IS
'Retorna opciones de filtrado para el marketplace: ubicaciones, categorias, tipos de contenido, idiomas y niveles';

-- ============================================================================
-- 2. AGREGAR POLITICAS RLS PARA user_specializations
-- Error: "permission denied for table user_specializations"
-- ============================================================================

-- Verificar si la tabla existe antes de crear politicas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_specializations') THEN
    -- Politica para acceso anonimo a specializations de creadores publicos
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'user_specializations'
      AND policyname = 'Anon can view public creator specializations'
    ) THEN
      CREATE POLICY "Anon can view public creator specializations"
        ON user_specializations FOR SELECT
        TO anon
        USING (
          EXISTS (
            SELECT 1 FROM creator_profiles cp
            WHERE cp.user_id = user_specializations.user_id
            AND cp.is_active = true
            AND cp.is_published = true
          )
        );
    END IF;

    -- Politica para authenticated a specializations de creadores publicos
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'user_specializations'
      AND policyname = 'Authenticated can view public creator specializations'
    ) THEN
      CREATE POLICY "Authenticated can view public creator specializations"
        ON user_specializations FOR SELECT
        TO authenticated
        USING (
          -- Puede ver sus propias especialidades
          auth.uid() = user_id
          OR
          -- O las de creadores publicos en el marketplace
          EXISTS (
            SELECT 1 FROM creator_profiles cp
            WHERE cp.user_id = user_specializations.user_id
            AND cp.is_active = true
            AND cp.is_published = true
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 3. AGREGAR POLITICAS RLS PARA profile_builder_blocks
-- Error: query a profile_builder_blocks sin politica publica
-- ============================================================================

-- Verificar si la tabla existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profile_builder_blocks') THEN
    -- Politica para acceso anonimo a bloques publicados de creadores publicos
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profile_builder_blocks'
      AND policyname = 'Anon can view published blocks of public creators'
    ) THEN
      CREATE POLICY "Anon can view published blocks of public creators"
        ON profile_builder_blocks FOR SELECT
        TO anon
        USING (
          is_draft = false
          AND EXISTS (
            SELECT 1 FROM creator_profiles cp
            WHERE cp.id = profile_builder_blocks.profile_id
            AND cp.is_active = true
            AND cp.is_published = true
          )
        );
    END IF;

    -- Politica para authenticated
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = 'profile_builder_blocks'
      AND policyname = 'Authenticated can view published blocks'
    ) THEN
      CREATE POLICY "Authenticated can view published blocks"
        ON profile_builder_blocks FOR SELECT
        TO authenticated
        USING (
          -- Puede ver sus propios bloques
          EXISTS (
            SELECT 1 FROM creator_profiles cp
            WHERE cp.id = profile_builder_blocks.profile_id
            AND cp.user_id = auth.uid()
          )
          OR
          -- O bloques publicados de creadores publicos
          (
            is_draft = false
            AND EXISTS (
              SELECT 1 FROM creator_profiles cp
              WHERE cp.id = profile_builder_blocks.profile_id
              AND cp.is_active = true
              AND cp.is_published = true
            )
          )
        );
    END IF;
  END IF;
END $$;

-- ============================================================================
-- 4. INDICES PARA OPTIMIZAR QUERIES DEL MARKETPLACE
-- ============================================================================

-- Indice para filtros de marketplace
CREATE INDEX IF NOT EXISTS idx_creator_profiles_marketplace_active
  ON creator_profiles (is_active, is_published)
  WHERE is_active = true AND is_published = true;

-- Indice para categorias
CREATE INDEX IF NOT EXISTS idx_creator_profiles_categories_gin
  ON creator_profiles USING GIN (categories);

-- Indice para content_types
CREATE INDEX IF NOT EXISTS idx_creator_profiles_content_types_gin
  ON creator_profiles USING GIN (content_types);

-- ============================================================================
-- FIN DE LA MIGRACION
-- ============================================================================
