-- Ejecutar en Supabase SQL Editor (Kreoon) si script-chat devuelve 402
-- aunque la organización tenga tokens. Crea la función deduct_ai_tokens.

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
    organization_id, type, tokens_amount, module_key, action,
    ai_provider, ai_model, input_tokens, output_tokens, description
  ) VALUES (
    p_org_id, 'usage', -p_cost, p_module_key, p_action,
    p_ai_provider, p_ai_model, p_input_tokens, p_output_tokens, p_description
  );

  RETURN jsonb_build_object(
    'ok', true,
    'tokens_remaining', v_new_remaining + v_new_purchased
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_ai_tokens(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT) TO service_role;
