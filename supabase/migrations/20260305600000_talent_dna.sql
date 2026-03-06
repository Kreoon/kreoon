-- ============================================================================
-- ADN de Talento para Freelancers
-- Permite a los creadores generar su perfil profesional completo mediante audio
-- ============================================================================

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Tabla principal: talent_dna
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.talent_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Audio y análisis
  transcription TEXT,
  emotional_analysis JSONB DEFAULT '{}'::jsonb,

  -- ADN generado
  dna_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Control
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'error')),
  is_active BOOLEAN DEFAULT true,
  applied_to_profile BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_talent_dna_user_id ON public.talent_dna(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_dna_user_active ON public.talent_dna(user_id, is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_talent_dna_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_talent_dna_updated_at ON public.talent_dna;
CREATE TRIGGER trg_talent_dna_updated_at
  BEFORE UPDATE ON public.talent_dna
  FOR EACH ROW
  EXECUTE FUNCTION update_talent_dna_updated_at();

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Columnas adicionales en creator_profiles
-- ──────────────────────────────────────────────────────────────────────────────

-- Nivel de experiencia del creador
ALTER TABLE public.creator_profiles
ADD COLUMN IF NOT EXISTS experience_level TEXT
  CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert'));

-- Estilo de contenido (JSONB para flexibilidad)
ALTER TABLE public.creator_profiles
ADD COLUMN IF NOT EXISTS content_style JSONB DEFAULT '{}'::jsonb;

-- Flag para indicar que tiene ADN de talento aplicado
ALTER TABLE public.creator_profiles
ADD COLUMN IF NOT EXISTS has_talent_dna BOOLEAN DEFAULT false;

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. RLS Policies para talent_dna
-- ──────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.talent_dna ENABLE ROW LEVEL SECURITY;

-- Los usuarios pueden ver su propio ADN
DROP POLICY IF EXISTS "talent_dna_select_own" ON public.talent_dna;
CREATE POLICY "talent_dna_select_own" ON public.talent_dna
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden insertar su propio ADN
DROP POLICY IF EXISTS "talent_dna_insert_own" ON public.talent_dna;
CREATE POLICY "talent_dna_insert_own" ON public.talent_dna
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar su propio ADN
DROP POLICY IF EXISTS "talent_dna_update_own" ON public.talent_dna;
CREATE POLICY "talent_dna_update_own" ON public.talent_dna
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Los usuarios pueden eliminar su propio ADN
DROP POLICY IF EXISTS "talent_dna_delete_own" ON public.talent_dna;
CREATE POLICY "talent_dna_delete_own" ON public.talent_dna
  FOR DELETE
  USING (auth.uid() = user_id);

-- Acceso service_role para edge functions
DROP POLICY IF EXISTS "talent_dna_service_role" ON public.talent_dna;
CREATE POLICY "talent_dna_service_role" ON public.talent_dna
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Función para aplicar ADN al perfil de creador
-- ──────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION apply_talent_dna_to_profile(p_user_id UUID, p_dna_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_dna_data JSONB;
  v_identity JSONB;
  v_specialization JSONB;
  v_style JSONB;
BEGIN
  -- Obtener el ADN
  SELECT dna_data INTO v_dna_data
  FROM public.talent_dna
  WHERE id = p_dna_id AND user_id = p_user_id AND is_active = true;

  IF v_dna_data IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Extraer secciones
  v_identity := v_dna_data -> 'creator_identity';
  v_specialization := v_dna_data -> 'specialization';
  v_style := v_dna_data -> 'content_style';

  -- Actualizar creator_profiles
  UPDATE public.creator_profiles
  SET
    bio = COALESCE(v_identity ->> 'tagline', bio),
    bio_full = COALESCE(v_identity ->> 'bio_full', bio_full),
    experience_level = COALESCE(v_identity ->> 'experience_level', experience_level),
    categories = COALESCE(
      (SELECT array_agg(elem)::TEXT[]
       FROM jsonb_array_elements_text(v_specialization -> 'niches') AS elem),
      categories
    ),
    content_types = COALESCE(
      (SELECT array_agg(elem)::TEXT[]
       FROM jsonb_array_elements_text(v_specialization -> 'content_formats') AS elem),
      content_types
    ),
    marketplace_roles = COALESCE(
      (SELECT array_agg(elem)::TEXT[]
       FROM jsonb_array_elements_text(v_dna_data -> 'marketplace_roles') AS elem),
      marketplace_roles
    ),
    platforms = COALESCE(
      (SELECT array_agg(elem)::TEXT[]
       FROM jsonb_array_elements_text(v_dna_data -> 'platforms') AS elem),
      platforms
    ),
    languages = COALESCE(
      (SELECT array_agg(elem)::TEXT[]
       FROM jsonb_array_elements_text(v_dna_data -> 'languages') AS elem),
      languages
    ),
    content_style = COALESCE(v_style, content_style),
    has_talent_dna = TRUE,
    updated_at = now()
  WHERE user_id = p_user_id;

  -- Marcar ADN como aplicado
  UPDATE public.talent_dna
  SET applied_to_profile = TRUE, updated_at = now()
  WHERE id = p_dna_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos para la función
GRANT EXECUTE ON FUNCTION apply_talent_dna_to_profile(UUID, UUID) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Comentarios de documentación
-- ──────────────────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.talent_dna IS 'ADN de Talento generado por IA a partir de audio del creador';
COMMENT ON COLUMN public.talent_dna.dna_data IS 'Perfil profesional completo generado: identidad, especialización, estilo, plataformas, idiomas, metas';
COMMENT ON COLUMN public.talent_dna.emotional_analysis IS 'Análisis emocional del audio (tono, confianza, pasión)';
COMMENT ON COLUMN public.talent_dna.applied_to_profile IS 'Indica si el ADN fue aplicado al creator_profile';
COMMENT ON COLUMN public.creator_profiles.experience_level IS 'Nivel de experiencia: beginner, intermediate, advanced, expert';
COMMENT ON COLUMN public.creator_profiles.content_style IS 'Estilo de contenido del creador (JSONB)';
COMMENT ON COLUMN public.creator_profiles.has_talent_dna IS 'Indica si el perfil tiene ADN de Talento aplicado';
