-- =====================================================
-- ADN de Talento para Freelancers
-- Permite a creadores generar su perfil profesional
-- completo mediante audio + IA
-- =====================================================

-- ── Tabla principal talent_dna ──────────────────────────────────────

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

-- Solo puede haber un ADN activo por usuario (índice único parcial)
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_talent_dna
  ON public.talent_dna(user_id)
  WHERE is_active = true;

-- Índices
CREATE INDEX IF NOT EXISTS idx_talent_dna_user_id ON public.talent_dna(user_id);
CREATE INDEX IF NOT EXISTS idx_talent_dna_status ON public.talent_dna(status);
CREATE INDEX IF NOT EXISTS idx_talent_dna_active ON public.talent_dna(user_id, is_active) WHERE is_active = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_talent_dna_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_talent_dna_updated_at ON public.talent_dna;
CREATE TRIGGER trigger_talent_dna_updated_at
  BEFORE UPDATE ON public.talent_dna
  FOR EACH ROW
  EXECUTE FUNCTION update_talent_dna_updated_at();

-- ── RLS Policies ────────────────────────────────────────────────────

ALTER TABLE public.talent_dna ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden leer su propio ADN
CREATE POLICY "talent_dna_select_own"
  ON public.talent_dna
  FOR SELECT
  USING (user_id = auth.uid());

-- Usuarios pueden insertar su propio ADN
CREATE POLICY "talent_dna_insert_own"
  ON public.talent_dna
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Usuarios pueden actualizar su propio ADN
CREATE POLICY "talent_dna_update_own"
  ON public.talent_dna
  FOR UPDATE
  USING (user_id = auth.uid());

-- Usuarios pueden eliminar su propio ADN
CREATE POLICY "talent_dna_delete_own"
  ON public.talent_dna
  FOR DELETE
  USING (user_id = auth.uid());

-- ── Nuevas columnas en creator_profiles ──────────────────────────────

-- Agregar experience_level si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'creator_profiles'
    AND column_name = 'experience_level'
  ) THEN
    ALTER TABLE public.creator_profiles
    ADD COLUMN experience_level VARCHAR(20) DEFAULT NULL
      CHECK (experience_level IN ('beginner', 'intermediate', 'advanced', 'expert'));
  END IF;
END $$;

-- Agregar bio (tagline corta) si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'creator_profiles'
    AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.creator_profiles
    ADD COLUMN bio VARCHAR(150) DEFAULT NULL;
  END IF;
END $$;

-- Agregar bio_full (biografía completa) si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'creator_profiles'
    AND column_name = 'bio_full'
  ) THEN
    ALTER TABLE public.creator_profiles
    ADD COLUMN bio_full TEXT DEFAULT NULL;
  END IF;
END $$;

-- Agregar content_types si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'creator_profiles'
    AND column_name = 'content_types'
  ) THEN
    ALTER TABLE public.creator_profiles
    ADD COLUMN content_types TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Agregar marketplace_roles si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'creator_profiles'
    AND column_name = 'marketplace_roles'
  ) THEN
    ALTER TABLE public.creator_profiles
    ADD COLUMN marketplace_roles TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Agregar platforms si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'creator_profiles'
    AND column_name = 'platforms'
  ) THEN
    ALTER TABLE public.creator_profiles
    ADD COLUMN platforms TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Agregar languages si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'creator_profiles'
    AND column_name = 'languages'
  ) THEN
    ALTER TABLE public.creator_profiles
    ADD COLUMN languages TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Agregar unique_factor si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'creator_profiles'
    AND column_name = 'unique_factor'
  ) THEN
    ALTER TABLE public.creator_profiles
    ADD COLUMN unique_factor TEXT DEFAULT NULL;
  END IF;
END $$;

-- Agregar talent_dna_id (referencia al ADN aplicado) si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'creator_profiles'
    AND column_name = 'talent_dna_id'
  ) THEN
    ALTER TABLE public.creator_profiles
    ADD COLUMN talent_dna_id UUID DEFAULT NULL
      REFERENCES public.talent_dna(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Comentarios
COMMENT ON TABLE public.talent_dna IS 'ADN de Talento generado por IA a partir de audio del freelancer';
COMMENT ON COLUMN public.talent_dna.dna_data IS 'Perfil profesional estructurado generado por IA';
COMMENT ON COLUMN public.talent_dna.applied_to_profile IS 'Si el ADN fue aplicado al perfil de creator_profiles';
COMMENT ON COLUMN public.creator_profiles.talent_dna_id IS 'Referencia al ADN de talento aplicado al perfil';
