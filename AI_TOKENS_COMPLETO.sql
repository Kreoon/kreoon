-- ============================================================
-- SISTEMA DE TOKENIZACIÓN DE IA - SQL COMPLETO
-- Tablas: organization_ai_tokens, ai_token_transactions
-- RPC: deduct_ai_tokens
--
-- REQUISITOS PREVIOS (deben existir en tu Supabase):
--   - Tabla public.organizations
--   - Función public.handle_updated_at()
--   - Función public.is_org_member(uuid, uuid)
--   - Función public.is_org_configurer(uuid, uuid)
-- ============================================================

-- 1. Tabla organization_ai_tokens (cuota por organización)
CREATE TABLE IF NOT EXISTS public.organization_ai_tokens (
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
CREATE TABLE IF NOT EXISTS public.ai_token_transactions (
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
CREATE INDEX IF NOT EXISTS idx_organization_ai_tokens_org ON public.organization_ai_tokens(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_transactions_org ON public.ai_token_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_transactions_created ON public.ai_token_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_token_transactions_type ON public.ai_token_transactions(type);

-- Trigger updated_at para organization_ai_tokens
DROP TRIGGER IF EXISTS update_organization_ai_tokens_updated_at ON public.organization_ai_tokens;
CREATE TRIGGER update_organization_ai_tokens_updated_at
  BEFORE UPDATE ON public.organization_ai_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.organization_ai_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas: miembros de org pueden leer, configurers/admins pueden modificar
DROP POLICY IF EXISTS "Org members can read ai tokens" ON public.organization_ai_tokens;
CREATE POLICY "Org members can read ai tokens"
  ON public.organization_ai_tokens FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org configurers can manage ai tokens" ON public.organization_ai_tokens;
CREATE POLICY "Org configurers can manage ai tokens"
  ON public.organization_ai_tokens FOR ALL
  USING (public.is_org_configurer(auth.uid(), organization_id))
  WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org members can read token transactions" ON public.ai_token_transactions;
CREATE POLICY "Org members can read token transactions"
  ON public.ai_token_transactions FOR SELECT
  USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "Org configurers can insert token transactions" ON public.ai_token_transactions;
CREATE POLICY "Org configurers can insert token transactions"
  ON public.ai_token_transactions FOR INSERT
  WITH CHECK (public.is_org_configurer(auth.uid(), organization_id));

-- ============================================================
-- RPC: deduct_ai_tokens - Deducción atómica de tokens
-- ============================================================

CREATE OR REPLACE FUNCTION public.deduct_ai_tokens(
  p_org_id UUID,
  p_cost INTEGER,
  p_module_key TEXT DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_ai_provider TEXT DEFAULT NULL,
  p_ai_model TEXT DEFAULT NULL,
  p_input_tokens INTEGER DEFAULT NULL,
  p_output_tokens INTEGER DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_deduct_from_remaining INTEGER;
  v_deduct_from_purchased INTEGER;
  v_new_remaining INTEGER;
  v_new_purchased INTEGER;
BEGIN
  SELECT tokens_remaining, purchased_tokens, tokens_used_this_period
    INTO v_row
    FROM public.organization_ai_tokens
   WHERE organization_id = p_org_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'tokens_remaining', 0, 'error', 'no_token_record');
  END IF;

  IF (v_row.tokens_remaining + v_row.purchased_tokens) < p_cost THEN
    RETURN jsonb_build_object(
      'ok', false,
      'tokens_remaining',
      v_row.tokens_remaining + v_row.purchased_tokens
    );
  END IF;

  v_deduct_from_remaining := LEAST(v_row.tokens_remaining, p_cost);
  v_deduct_from_purchased := p_cost - v_deduct_from_remaining;
  v_new_remaining := v_row.tokens_remaining - v_deduct_from_remaining;
  v_new_purchased := GREATEST(0, v_row.purchased_tokens - v_deduct_from_purchased);

  UPDATE public.organization_ai_tokens
     SET tokens_remaining = v_new_remaining,
         purchased_tokens = v_new_purchased,
         tokens_used_this_period = tokens_used_this_period + p_cost,
         updated_at = NOW()
   WHERE organization_id = p_org_id;

  INSERT INTO public.ai_token_transactions (
    organization_id,
    type,
    tokens_amount,
    module_key,
    action,
    ai_provider,
    ai_model,
    input_tokens,
    output_tokens,
    description
  ) VALUES (
    p_org_id,
    'usage',
    -p_cost,
    p_module_key,
    p_action,
    p_ai_provider,
    p_ai_model,
    p_input_tokens,
    p_output_tokens,
    p_description
  );

  RETURN jsonb_build_object(
    'ok', true,
    'tokens_remaining', v_new_remaining + v_new_purchased
  );
END;
$$;

COMMENT ON FUNCTION public.deduct_ai_tokens IS 'Deducción atómica de tokens de IA para una organización';

GRANT EXECUTE ON FUNCTION public.deduct_ai_tokens(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.deduct_ai_tokens(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO authenticated;
