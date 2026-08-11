-- =====================================================================
-- Reescritura de public.auto_approve_stale_content()
-- Fecha: 2026-08-11
--
-- QUÉ SE QUITÓ Y POR QUÉ:
--   Simplificación 2026 / borrado del módulo UP. Se eliminan ÚNICAMENTE
--   las referencias a tablas y funciones del módulo UP:
--     - SELECT sobre public.reputation_seasons (variable v_season_id)
--     - INSERT en public.reputation_events (bono "clean_approval_bonus"
--       para creator y para editor)
--     - PERFORM public.sync_marketplace_reputation(...)
--     - Declaración de la variable v_season_id (ya sin uso)
--
-- QUÉ SE CONSERVA (idéntico, sin un solo cambio):
--   - Firma: auto_approve_stale_content() RETURNS integer
--   - LANGUAGE plpgsql, SECURITY DEFINER, SET search_path TO 'public'
--   - Cursor sobre content + organizations + organization_statuses
--   - Regla de antigüedad (o.content_auto_approve_days)
--   - UPDATE de content (status, custom_status_id, approved_at, updated_at)
--   - INSERT en content_history con la misma nota de sistema
--   - Contador v_count y RETURN v_count
--
-- ⚠️ ADVERTENCIA: el cron `jobid 16` sigue llamando a esta función todos
--    los días a las 06:00. NO renombrar ni cambiar la firma: el job la
--    invoca por nombre y espera el mismo comportamiento de auto-aprobación.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.auto_approve_stale_content()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_count INTEGER := 0;
  v_row RECORD;
  v_approved_custom_status_id uuid;
BEGIN
  FOR v_row IN
    SELECT c.id AS content_id, c.organization_id, c.creator_id, c.editor_id
    FROM public.content c
    JOIN public.organizations o ON o.id = c.organization_id
    LEFT JOIN public.organization_statuses os ON os.id = c.custom_status_id
    WHERE  (c.status = 'delivered' OR os.status_key = 'delivered')
      AND  c.delivered_at IS NOT NULL
      AND  o.content_auto_approve_days IS NOT NULL
      AND  c.delivered_at <= NOW() - (o.content_auto_approve_days || ' days')::interval
  LOOP
    -- Custom status equivalente a "approved" en la misma org, si existe
    SELECT os2.id INTO v_approved_custom_status_id
    FROM public.organization_statuses os2
    WHERE os2.organization_id = v_row.organization_id AND os2.status_key = 'approved'
    LIMIT 1;

    UPDATE public.content c
    SET
      status = 'approved',
      custom_status_id = COALESCE(v_approved_custom_status_id, c.custom_status_id),
      approved_at = NOW(),
      updated_at = NOW()
    WHERE c.id = v_row.content_id;

    INSERT INTO public.content_history
      (content_id, user_id, old_status, new_status, notes)
    VALUES
      (v_row.content_id, NULL, 'delivered'::public.content_status, 'approved'::public.content_status,
       'Aprobado por sistema. El cliente no respondió dentro del tiempo establecido.');

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;
