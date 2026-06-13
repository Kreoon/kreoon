-- ============================================================================
-- Cron diario de reconciliación de suscripciones de academia contra Stripe.
-- Atrapa webhooks perdidos o endpoints mal configurados.
-- ============================================================================

-- Helper: recalcular member_count del space (lo usa la edge function tras
-- desactivar/activar membresías en bulk).
CREATE OR REPLACE FUNCTION public.recompute_academy_space_member_count(
  p_space_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE academy_spaces
     SET member_count = (
       SELECT COUNT(*) FROM academy_memberships
        WHERE space_id = p_space_id AND is_active = true
     )
   WHERE id = p_space_id;
END; $$;

GRANT EXECUTE ON FUNCTION public.recompute_academy_space_member_count(UUID)
  TO authenticated, service_role;

-- Cron: ejecuta cada noche a las 03:00 UTC (22:00 CO).
-- Usa pg_net + secret en vault para llamar a la edge function.
DO $$
DECLARE
  v_supabase_url TEXT;
  v_reconcile_secret TEXT;
BEGIN
  -- Lee config global; si vault no tiene la key, no creamos el cron.
  BEGIN
    SELECT decrypted_secret INTO v_reconcile_secret
    FROM vault.decrypted_secrets WHERE name = 'RECONCILE_SECRET';
  EXCEPTION WHEN OTHERS THEN
    v_reconcile_secret := NULL;
  END;

  BEGIN
    SELECT decrypted_secret INTO v_supabase_url
    FROM vault.decrypted_secrets WHERE name = 'PROJECT_URL';
  EXCEPTION WHEN OTHERS THEN
    v_supabase_url := NULL;
  END;

  -- Si no tenemos los secrets en vault, dejamos solo el shell del cron
  -- (manualmente se puede activar luego con cron.schedule).
  IF v_reconcile_secret IS NULL OR v_supabase_url IS NULL THEN
    RAISE NOTICE 'Vault RECONCILE_SECRET/PROJECT_URL faltantes — cron no programado. Configurar manualmente.';
    RETURN;
  END IF;

  -- Borrar versión previa si existía
  PERFORM cron.unschedule('academy-subs-reconcile-daily')
    WHERE EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'academy-subs-reconcile-daily'
    );

  PERFORM cron.schedule(
    'academy-subs-reconcile-daily',
    '0 3 * * *',  -- 03:00 UTC todos los días
    format($cron$
      SELECT net.http_post(
        url := '%s/functions/v1/stripe-reconcile-academy-subs',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer %s'
        ),
        body := '{}'::jsonb
      );
    $cron$, v_supabase_url, v_reconcile_secret)
  );
END $$;
