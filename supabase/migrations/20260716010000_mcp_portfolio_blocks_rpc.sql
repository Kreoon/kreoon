-- RPCs de portafolio invocables desde el MCP server (service role, sin auth.uid()).
-- save_profile_blocks/publish_profile_blocks (baseline.sql) validan dueño con
-- auth.uid(), que es NULL cuando el caller es el MCP (autentica por API key,
-- no por sesión Supabase). El MCP ya valida ownership/membresía de org en
-- TypeScript antes de llamar estas funciones (mismo patrón que el resto de
-- kreoon-mcp-server/src/tools/*.ts, que escriben directo a Postgres con
-- service role tras validar en código).

CREATE OR REPLACE FUNCTION public.mcp_save_portfolio_blocks(
    p_profile_id uuid,
    p_blocks jsonb,
    p_is_draft boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.creator_profiles WHERE id = p_profile_id) THEN
    RAISE EXCEPTION 'creator_profiles % no encontrado', p_profile_id;
  END IF;

  IF jsonb_array_length(p_blocks) > 15 THEN
    RAISE EXCEPTION 'Máximo 15 bloques permitidos';
  END IF;

  IF p_is_draft THEN
    DELETE FROM public.profile_builder_blocks
    WHERE profile_id = p_profile_id AND is_draft = true;
  ELSE
    DELETE FROM public.profile_builder_blocks
    WHERE profile_id = p_profile_id;
  END IF;

  INSERT INTO public.profile_builder_blocks (
    profile_id, block_type, order_index, is_visible, is_draft, config, styles, content
  )
  SELECT
    p_profile_id,
    b->>'type',
    COALESCE((b->>'orderIndex')::int, 0),
    COALESCE((b->>'isVisible')::boolean, true),
    p_is_draft,
    COALESCE(b->'config', '{}'::jsonb),
    COALESCE(b->'styles', '{}'::jsonb),
    COALESCE(b->'content', '{}'::jsonb)
  FROM jsonb_array_elements(p_blocks) b;

  UPDATE public.creator_profiles
  SET builder_has_draft = p_is_draft
  WHERE id = p_profile_id;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.mcp_publish_portfolio_blocks(p_profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.creator_profiles WHERE id = p_profile_id) THEN
    RAISE EXCEPTION 'creator_profiles % no encontrado', p_profile_id;
  END IF;

  DELETE FROM public.profile_builder_blocks
  WHERE profile_id = p_profile_id AND is_draft = false;

  UPDATE public.profile_builder_blocks
  SET is_draft = false
  WHERE profile_id = p_profile_id AND is_draft = true;

  UPDATE public.creator_profiles
  SET builder_has_draft = false,
      is_active = true
  WHERE id = p_profile_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mcp_save_portfolio_blocks(uuid, jsonb, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.mcp_publish_portfolio_blocks(uuid) TO service_role;

COMMENT ON FUNCTION public.mcp_save_portfolio_blocks IS
    'Guarda bloques del Profile Builder desde el MCP (service role). Ownership ya validado en TS antes de llamar.';
COMMENT ON FUNCTION public.mcp_publish_portfolio_blocks IS
    'Publica bloques draft->published desde el MCP y activa is_active del perfil. Ownership ya validado en TS antes de llamar.';
