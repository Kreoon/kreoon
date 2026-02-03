-- Sistema de tokenización de IA para control de uso por plan

-- 1. Tabla organization_ai_tokens (cuota por organización)
CREATE TABLE public.organization_ai_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Tokens del plan
  monthly_tokens_included INTEGER NOT NULL DEFAULT 0,
  tokens_remaining INTEGER NOT NULL DEFAULT 0,
  tokens_used_this_period INTEGER NOT NULL DEFAULT 0,

  -- Tokens extra comprados
  purchased_tokens INTEGER NOT NULL DEFAULT 0,

  -- Reset mensual
  period_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_end_date TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),

  -- APIs propias conectadas (bypass tokens)
  custom_api_enabled BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id)
);

COMMENT ON TABLE public.organization_ai_tokens IS 'Control de tokens de IA por organización y plan';
COMMENT ON COLUMN public.organization_ai_tokens.monthly_tokens_included IS 'Tokens incluidos en el plan cada mes';
COMMENT ON COLUMN public.organization_ai_tokens.tokens_remaining IS 'Tokens disponibles en el periodo actual';
COMMENT ON COLUMN public.organization_ai_tokens.custom_api_enabled IS 'Si true, usa API propia sin consumir tokens de cuota';

-- 2. Tabla ai_token_transactions (historial de uso y créditos)
CREATE TABLE public.ai_token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  type TEXT NOT NULL, -- 'usage', 'purchase', 'plan_credit', 'refund'
  tokens_amount INTEGER NOT NULL, -- negativo para uso, positivo para créditos

  -- Contexto del uso
  module_key TEXT,
  action TEXT,

  -- Metadata
  ai_provider TEXT,
  ai_model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,

  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.ai_token_transactions IS 'Historial de transacciones de tokens (uso, compras, créditos)';
COMMENT ON COLUMN public.ai_token_transactions.type IS 'usage=consumo, purchase=compra, plan_credit=crédito por plan, refund=reembolso';

-- Índices
CREATE INDEX idx_organization_ai_tokens_org ON public.organization_ai_tokens(organization_id);
CREATE INDEX idx_ai_token_transactions_org ON public.ai_token_transactions(organization_id);
CREATE INDEX idx_ai_token_transactions_created ON public.ai_token_transactions(created_at DESC);
CREATE INDEX idx_ai_token_transactions_type ON public.ai_token_transactions(type);

-- Trigger updated_at para organization_ai_tokens
CREATE TRIGGER update_organization_ai_tokens_updated_at
  BEFORE UPDATE ON public.organization_ai_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.organization_ai_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas: miembros de org pueden leer, configurers/admins pueden modificar
CREATE POLICY "Org members can read ai tokens"
  ON public.organization_ai_tokens FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org configurers can manage ai tokens"
  ON public.organization_ai_tokens FOR ALL
  USING (public.is_org_configurer(auth.uid(), organization_id))
  WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

CREATE POLICY "Org members can read token transactions"
  ON public.ai_token_transactions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

-- Las transacciones las inserta el backend (service role); no exponer INSERT a usuarios
CREATE POLICY "Org configurers can insert token transactions"
  ON public.ai_token_transactions FOR INSERT
  WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));
