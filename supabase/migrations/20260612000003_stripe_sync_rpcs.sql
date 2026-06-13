-- ============================================================
-- Stripe sync RPCs (hardened)
--
-- La edge function `stripe-sync-product` corre con verify_jwt=false
-- (es disparada por triggers DB vía pg_net) y, en algunas versiones de
-- Supabase Edge runtime, no recibe `SUPABASE_SERVICE_ROLE_KEY` de forma
-- confiable. La solución:
--
--   1. La edge function llama a estos RPCs con SUPABASE_ANON_KEY
--      (que siempre se inyecta).
--   2. Los RPCs son SECURITY DEFINER + reciben un `p_caller_secret`
--      que verifican contra un secret guardado en Vault
--      (`stripe_sync_secret`). El mismo secret está disponible para
--      la edge function como env var STRIPE_SYNC_SECRET.
--   3. La edge function valida en el HTTP request el header
--      X-Sync-Secret antes de procesar (constant-time compare).
--   4. apply_stripe_sync_result valida el formato de los IDs
--      (prod_*, price_*) y previene re-asignación del product_id
--      una vez establecido (anti-hijack).
--
-- Sin el secret correcto, nadie puede invocar los RPCs ni la edge
-- function — aunque tenga SUPABASE_ANON_KEY (que es público).
-- ============================================================

-- 0. Crear secret en Vault si no existe (idempotente).
--    Para regenerarlo manualmente: borrar de vault.secrets y re-aplicar.
DO $$
DECLARE
  v_existing UUID;
BEGIN
  SELECT id INTO v_existing FROM vault.secrets WHERE name = 'stripe_sync_secret';
  IF v_existing IS NULL THEN
    PERFORM vault.create_secret(
      encode(extensions.gen_random_bytes(48), 'base64'),
      'stripe_sync_secret',
      'Shared secret used by stripe-sync-product edge function'
    );
  END IF;
END $$;

-- 1. Helper interno: valida el caller_secret contra el guardado en Vault.
--    NO SECURITY DEFINER expuesto a anon — solo invocable internamente.
CREATE OR REPLACE FUNCTION public._stripe_sync_check_secret(p_caller_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  v_expected TEXT;
BEGIN
  SELECT decrypted_secret INTO v_expected
  FROM vault.decrypted_secrets
  WHERE name = 'stripe_sync_secret';

  IF v_expected IS NULL OR p_caller_secret IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Comparamos digests en lugar del secret directo: mitiga timing leak
  -- adicional y los bytes comparados ya no revelan el contenido del secret.
  RETURN encode(extensions.digest(v_expected::bytea, 'sha256'), 'hex')
       = encode(extensions.digest(p_caller_secret::bytea, 'sha256'), 'hex');
END;
$$;

REVOKE EXECUTE ON FUNCTION public._stripe_sync_check_secret(TEXT) FROM PUBLIC, anon, authenticated;

-- 2. Eliminar versiones antiguas (signaturas viejas sin p_caller_secret),
--    en caso de upgrade desde el estado previo.
DROP FUNCTION IF EXISTS public.get_stripe_sync_payload(TEXT, UUID);
DROP FUNCTION IF EXISTS public.apply_stripe_sync_result(TEXT, UUID, TEXT, TEXT);

-- 3. get_stripe_sync_payload: lee los campos necesarios para sincronizar
--    con Stripe. Requiere caller_secret válido.
CREATE OR REPLACE FUNCTION public.get_stripe_sync_payload(
  p_caller_secret TEXT,
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT public._stripe_sync_check_secret(p_caller_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  IF p_entity_type = 'academy_space' THEN
    SELECT to_jsonb(t) INTO v_result
    FROM (
      SELECT id, name, slug, description, membership_price_usd,
             stripe_product_id, stripe_price_id, logo_url, cover_image_url
      FROM academy_spaces
      WHERE id = p_entity_id
    ) t;
  ELSIF p_entity_type = 'academy_course' THEN
    SELECT to_jsonb(t) INTO v_result
    FROM (
      SELECT id, title, slug, description, price_usd, is_free,
             stripe_product_id, stripe_price_id, cover_image_url, space_id
      FROM academy_courses
      WHERE id = p_entity_id
    ) t;
  ELSE
    RAISE EXCEPTION 'unknown_entity_type' USING ERRCODE = '22023';
  END IF;
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_stripe_sync_payload(TEXT, TEXT, UUID) TO anon, authenticated;

-- 4. apply_stripe_sync_result: escribe los IDs devueltos por Stripe.
--    Valida caller_secret, formato de IDs y previene hijack del product_id.
CREATE OR REPLACE FUNCTION public.apply_stripe_sync_result(
  p_caller_secret TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_stripe_product_id TEXT,
  p_stripe_price_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_product TEXT;
BEGIN
  IF NOT public._stripe_sync_check_secret(p_caller_secret) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  -- Validación de patrones de Stripe (defense in depth).
  IF p_stripe_product_id IS NOT NULL AND p_stripe_product_id !~ '^prod_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_product_id_format' USING ERRCODE = '22023';
  END IF;
  IF p_stripe_price_id IS NOT NULL AND p_stripe_price_id !~ '^price_[A-Za-z0-9]+$' THEN
    RAISE EXCEPTION 'invalid_price_id_format' USING ERRCODE = '22023';
  END IF;

  IF p_entity_type = 'academy_space' THEN
    SELECT stripe_product_id INTO v_current_product
    FROM academy_spaces WHERE id = p_entity_id;

    -- Anti-hijack: una vez asignado, no se puede cambiar el product_id.
    IF v_current_product IS NOT NULL
       AND p_stripe_product_id IS NOT NULL
       AND v_current_product IS DISTINCT FROM p_stripe_product_id THEN
      RAISE EXCEPTION 'product_id_already_assigned' USING ERRCODE = '23514';
    END IF;

    UPDATE academy_spaces
    SET stripe_product_id = COALESCE(p_stripe_product_id, stripe_product_id),
        stripe_price_id   = p_stripe_price_id
    WHERE id = p_entity_id;

  ELSIF p_entity_type = 'academy_course' THEN
    SELECT stripe_product_id INTO v_current_product
    FROM academy_courses WHERE id = p_entity_id;

    IF v_current_product IS NOT NULL
       AND p_stripe_product_id IS NOT NULL
       AND v_current_product IS DISTINCT FROM p_stripe_product_id THEN
      RAISE EXCEPTION 'product_id_already_assigned' USING ERRCODE = '23514';
    END IF;

    UPDATE academy_courses
    SET stripe_product_id = COALESCE(p_stripe_product_id, stripe_product_id),
        stripe_price_id   = p_stripe_price_id
    WHERE id = p_entity_id;

  ELSE
    RAISE EXCEPTION 'unknown_entity_type' USING ERRCODE = '22023';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_stripe_sync_result(TEXT, TEXT, UUID, TEXT, TEXT) TO anon, authenticated;

-- 5. invoke_stripe_sync_product: lee el secret de Vault y lo envía en
--    el header X-Sync-Secret al llamar la edge function.
CREATE OR REPLACE FUNCTION public.invoke_stripe_sync_product(
  p_entity_type TEXT,
  p_entity_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_secret
  FROM vault.decrypted_secrets
  WHERE name = 'stripe_sync_secret';

  IF v_secret IS NULL THEN
    RAISE WARNING 'invoke_stripe_sync_product: vault secret stripe_sync_secret not configured';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/stripe-sync-product',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Sync-Secret', v_secret
    ),
    body := jsonb_build_object(
      'entity_type', p_entity_type,
      'entity_id',   p_entity_id
    ),
    timeout_milliseconds := 30000
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'invoke_stripe_sync_product failed for % %: %', p_entity_type, p_entity_id, SQLERRM;
END;
$$;
