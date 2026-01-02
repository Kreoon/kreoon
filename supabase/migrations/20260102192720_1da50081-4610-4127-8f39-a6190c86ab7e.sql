-- =====================================================
-- MEJORA DEL MÓDULO DE MARKETING - VALIDACIÓN DE CONTENIDO
-- =====================================================

-- 1. Agregar client_id a marketing_strategies
ALTER TABLE public.marketing_strategies 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_marketing_strategies_client_id ON public.marketing_strategies(client_id);

-- 2. Agregar client_id a traffic_channels  
ALTER TABLE public.traffic_channels 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_traffic_channels_client_id ON public.traffic_channels(client_id);

-- 3. Agregar client_id a marketing_campaigns
ALTER TABLE public.marketing_campaigns 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_client_id ON public.marketing_campaigns(client_id);

-- 4. Agregar client_id a marketing_ai_insights
ALTER TABLE public.marketing_ai_insights 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_marketing_ai_insights_client_id ON public.marketing_ai_insights(client_id);

-- 5. Agregar client_id a marketing_reports
ALTER TABLE public.marketing_reports 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_marketing_reports_client_id ON public.marketing_reports(client_id);

-- 6. Agregar campos de validación estratégica a content
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS strategy_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS funnel_stage TEXT DEFAULT 'tofu',
ADD COLUMN IF NOT EXISTS target_platform TEXT,
ADD COLUMN IF NOT EXISTS content_objective TEXT,
ADD COLUMN IF NOT EXISTS hook TEXT,
ADD COLUMN IF NOT EXISTS cta TEXT,
ADD COLUMN IF NOT EXISTS marketing_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS marketing_approved_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS marketing_rejected_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS marketing_rejected_by UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS marketing_rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS marketing_campaign_id UUID REFERENCES public.marketing_campaigns(id);

CREATE INDEX IF NOT EXISTS idx_content_strategy_status ON public.content(strategy_status);
CREATE INDEX IF NOT EXISTS idx_content_funnel_stage ON public.content(funnel_stage);

-- 7. Crear tabla de revisiones estratégicas de contenido
CREATE TABLE IF NOT EXISTS public.content_strategy_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id),
  
  -- Status de la revisión
  review_status TEXT NOT NULL DEFAULT 'pending',
  
  -- Checklist de validación
  meets_client_objective BOOLEAN,
  aligned_with_strategy BOOLEAN,
  coherent_with_funnel BOOLEAN,
  follows_branding BOOLEAN,
  usable_for_ads BOOLEAN,
  usable_for_organic BOOLEAN,
  
  -- Puntuación general
  overall_score INTEGER,
  
  -- Comentarios
  strategic_comment TEXT,
  feedback TEXT,
  
  -- Metadata
  reviewed_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_strategy_reviews_content_id ON public.content_strategy_reviews(content_id);
CREATE INDEX IF NOT EXISTS idx_content_strategy_reviews_client_id ON public.content_strategy_reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_content_strategy_reviews_reviewer_id ON public.content_strategy_reviews(reviewer_id);

-- 8. Crear tabla de insights de marketing por cliente
CREATE TABLE IF NOT EXISTS public.client_marketing_ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Tipo de insight
  insight_type TEXT NOT NULL,
  category TEXT,
  
  -- Contenido del insight
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Severidad y acciones
  severity TEXT DEFAULT 'info',
  is_actionable BOOLEAN DEFAULT true,
  suggested_action TEXT,
  
  -- Datos de contexto
  data_context JSONB DEFAULT '{}'::jsonb,
  
  -- Estado
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  action_taken TEXT,
  action_taken_at TIMESTAMPTZ,
  action_taken_by UUID REFERENCES public.profiles(id),
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_marketing_ai_insights_client_id ON public.client_marketing_ai_insights(client_id);
CREATE INDEX IF NOT EXISTS idx_client_marketing_ai_insights_org_id ON public.client_marketing_ai_insights(organization_id);

-- 9. RLS para content_strategy_reviews
ALTER TABLE public.content_strategy_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view content strategy reviews"
ON public.content_strategy_reviews FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Strategists can create reviews"
ON public.content_strategy_reviews FOR INSERT
WITH CHECK (
  is_org_member(auth.uid(), organization_id) AND
  reviewer_id = auth.uid()
);

CREATE POLICY "Reviewers can update their reviews"
ON public.content_strategy_reviews FOR UPDATE
USING (reviewer_id = auth.uid());

-- 10. RLS para client_marketing_ai_insights
ALTER TABLE public.client_marketing_ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view client marketing insights"
ON public.client_marketing_ai_insights FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can insert client marketing insights"
ON public.client_marketing_ai_insights FOR INSERT
WITH CHECK (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org members can update client marketing insights"
ON public.client_marketing_ai_insights FOR UPDATE
USING (is_org_member(auth.uid(), organization_id));

-- Comentarios para documentación
COMMENT ON COLUMN public.content.strategy_status IS 'Estados: draft, pendiente_validacion, aprobado_estrategia, rechazado_estrategia, en_campaña, archivado';
COMMENT ON COLUMN public.content.funnel_stage IS 'Etapa del funnel: tofu, mofu, bofu';
COMMENT ON TABLE public.content_strategy_reviews IS 'Revisiones estratégicas de contenido por parte del estratega';
COMMENT ON TABLE public.client_marketing_ai_insights IS 'Insights de IA específicos por cliente';