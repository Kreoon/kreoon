-- ADN del Cliente: captura la identidad de marca via audio + IA
-- Gemini para transcripción + análisis emocional, Perplexity para ADN estratégico

CREATE TABLE public.client_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Transcripción y análisis emocional de Gemini
  transcription TEXT,
  emotional_analysis JSONB DEFAULT '{}'::jsonb,

  -- Ubicaciones seleccionadas
  audience_locations JSONB DEFAULT '[]'::jsonb,

  -- ADN generado por Perplexity
  dna_data JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Versionamiento
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'completed'
    CHECK (status IN ('processing', 'completed', 'error')),

  -- Solo un ADN activo por cliente
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_client_dna_client ON public.client_dna(client_id);
CREATE INDEX idx_client_dna_active ON public.client_dna(client_id, is_active) WHERE is_active = true;
CREATE UNIQUE INDEX idx_unique_active_dna_per_client ON public.client_dna(client_id) WHERE is_active = true;

-- RLS
ALTER TABLE public.client_dna ENABLE ROW LEVEL SECURITY;

-- Org admins/owners have full access via clients → organization_members
CREATE POLICY "Org admins can manage DNA" ON public.client_dna
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_dna.client_id
        AND om.user_id = auth.uid()
        AND (om.role = 'admin' OR om.is_owner = true)
    )
  );

-- Any org member can view DNA (for collaboration)
CREATE POLICY "Org members can view DNA" ON public.client_dna
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.clients c
      JOIN public.organization_members om ON om.organization_id = c.organization_id
      WHERE c.id = client_dna.client_id
        AND om.user_id = auth.uid()
    )
  );

-- Client users (via client_users junction) can manage their own DNA
CREATE POLICY "Client users can manage own DNA" ON public.client_dna
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client_users cu
      WHERE cu.client_id = client_dna.client_id
        AND cu.user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_dna TO authenticated;
GRANT ALL ON public.client_dna TO service_role;

-- Auto-update updated_at
CREATE TRIGGER update_client_dna_updated_at
  BEFORE UPDATE ON public.client_dna
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
