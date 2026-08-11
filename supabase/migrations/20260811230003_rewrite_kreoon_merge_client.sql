-- ============================================================================
-- Reescritura de public.kreoon_merge_client(uuid, uuid)
-- ============================================================================
-- POR QUÉ:
-- La fusión de clientes duplicados del CRM se conserva íntegra. Lo único que
-- cambia es que la función dejaba de compilar/ejecutar en cuanto se dropearan
-- las tablas de los módulos de live/streaming/feed que se están eliminando de
-- producción: plpgsql resuelve los nombres de tabla en tiempo de ejecución, así
-- que un solo UPDATE apuntando a una tabla inexistente hace fallar TODA la
-- fusión (relation ... does not exist), no solo ese paso.
--
-- Se QUITAN únicamente los reapuntes de filas de tablas que se van a dropear:
--   company_followers, live_client_settings, live_hour_assignments,
--   live_hosting_requests, live_usage_logs, streaming_accounts,
--   streaming_events, streaming_sales, streaming_sessions_v2
--   (+ se elimina el comentario residual sobre marketplace_campaigns, que ya no
--    tenía ninguna sentencia asociada porque esa tabla usa brand_id).
--
-- Se CONSERVA todo el resto del core del CRM, sin tocar una sola línea:
--   clients (merge de campos vacíos), content, products, client_packages,
--   product_dna, client_dna, client_users, marketing_clients,
--   client_strategists, marketing_strategies, traffic_channels,
--   content_strategy_reviews, client_closings, fillmaker_services,
--   social_accounts, ad_generator_products, content_licenses,
--   y el DELETE final del cliente duplicado.
--
-- Firma, tipo de retorno, LANGUAGE y modo de seguridad se mantienen idénticos:
-- (p_master_id uuid, p_dup_id uuid) RETURNS text, LANGUAGE plpgsql,
-- SECURITY INVOKER (la función original NO era SECURITY DEFINER y no fijaba
-- search_path — no se altera ese comportamiento en esta migración).
--
-- El texto de retorno no cambia: los contadores que reporta (contenido y
-- paquetes) provienen de `content` y `client_packages`, ambas conservadas.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.kreoon_merge_client(p_master_id uuid, p_dup_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_master clients%ROWTYPE;
  v_dup    clients%ROWTYPE;
  v_moved_content  INT := 0;
  v_moved_packages INT := 0;
BEGIN
  SELECT * INTO v_master FROM clients WHERE id = p_master_id;
  SELECT * INTO v_dup    FROM clients WHERE id = p_dup_id;

  IF v_master.id IS NULL THEN RETURN 'ERROR: master no encontrado'; END IF;
  IF v_dup.id    IS NULL THEN RETURN 'ERROR: duplicado no encontrado'; END IF;
  IF v_master.organization_id IS DISTINCT FROM v_dup.organization_id THEN
    RETURN 'ERROR: distintas organizaciones';
  END IF;

  -- Merge campos vacíos del master
  UPDATE clients SET
    contact_email  = COALESCE(contact_email,  v_dup.contact_email),
    contact_phone  = COALESCE(contact_phone,  v_dup.contact_phone),
    whatsapp_phone = COALESCE(whatsapp_phone, v_dup.whatsapp_phone),
    logo_url       = COALESCE(logo_url,       v_dup.logo_url),
    notes          = CASE
                       WHEN notes IS NOT NULL AND v_dup.notes IS NOT NULL
                       THEN notes || E'\n[fusionado] ' || v_dup.notes
                       ELSE COALESCE(notes, v_dup.notes)
                     END,
    user_id        = COALESCE(user_id,        v_dup.user_id),
    main_contact   = COALESCE(main_contact,   v_dup.main_contact),
    address        = COALESCE(address,        v_dup.address),
    city           = COALESCE(city,           v_dup.city),
    country        = COALESCE(country,        v_dup.country),
    website        = COALESCE(website,        v_dup.website),
    instagram      = COALESCE(instagram,      v_dup.instagram),
    tiktok         = COALESCE(tiktok,         v_dup.tiktok),
    facebook       = COALESCE(facebook,       v_dup.facebook),
    linkedin       = COALESCE(linkedin,       v_dup.linkedin),
    category       = COALESCE(category,       v_dup.category),
    lead_source    = COALESCE(lead_source,    v_dup.lead_source),
    referred_by    = COALESCE(referred_by,    v_dup.referred_by),
    updated_at     = NOW()
  WHERE id = p_master_id;

  -- content
  UPDATE content SET client_id = p_master_id WHERE client_id = p_dup_id;
  GET DIAGNOSTICS v_moved_content = ROW_COUNT;

  -- products, packages, dna
  UPDATE products        SET client_id = p_master_id WHERE client_id = p_dup_id;
  UPDATE client_packages SET client_id = p_master_id WHERE client_id = p_dup_id;
  GET DIAGNOSTICS v_moved_packages = ROW_COUNT;
  UPDATE product_dna     SET client_id = p_master_id WHERE client_id = p_dup_id;
  UPDATE client_dna      SET client_id = p_master_id WHERE client_id = p_dup_id;

  -- client_users: evitar unique(client_id, user_id)
  DELETE FROM client_users cu
  WHERE cu.client_id = p_dup_id
    AND cu.user_id IN (SELECT user_id FROM client_users WHERE client_id = p_master_id AND user_id IS NOT NULL);
  UPDATE client_users SET client_id = p_master_id WHERE client_id = p_dup_id;

  -- marketing_clients
  DELETE FROM marketing_clients mc
  WHERE mc.client_id = p_dup_id
    AND mc.organization_id IN (SELECT organization_id FROM marketing_clients WHERE client_id = p_master_id);
  UPDATE marketing_clients SET client_id = p_master_id WHERE client_id = p_dup_id;

  -- client_strategists: usa strategist_id
  DELETE FROM client_strategists cs
  WHERE cs.client_id = p_dup_id
    AND cs.strategist_id IN (SELECT strategist_id FROM client_strategists WHERE client_id = p_master_id AND strategist_id IS NOT NULL);
  UPDATE client_strategists SET client_id = p_master_id WHERE client_id = p_dup_id;

  -- Tablas verificadas con client_id
  UPDATE marketing_strategies     SET client_id = p_master_id WHERE client_id = p_dup_id;
  UPDATE traffic_channels         SET client_id = p_master_id WHERE client_id = p_dup_id;
  UPDATE content_strategy_reviews SET client_id = p_master_id WHERE client_id = p_dup_id;
  UPDATE client_closings          SET client_id = p_master_id WHERE client_id = p_dup_id;
  UPDATE fillmaker_services       SET client_id = p_master_id WHERE client_id = p_dup_id;
  UPDATE social_accounts          SET client_id = p_master_id WHERE client_id = p_dup_id;
  UPDATE ad_generator_products    SET client_id = p_master_id WHERE client_id = p_dup_id;
  UPDATE content_licenses         SET client_id = p_master_id WHERE client_id = p_dup_id;

  -- NOTA: los reapuntes de company_followers, live_client_settings,
  -- live_hour_assignments, live_hosting_requests, live_usage_logs,
  -- streaming_accounts, streaming_events, streaming_sales y
  -- streaming_sessions_v2 se eliminaron a propósito: esas tablas se dropean
  -- junto con los módulos de live/streaming/feed.

  -- Eliminar duplicado
  DELETE FROM clients WHERE id = p_dup_id;

  RETURN format('OK: %s fusionado en %s | contenido: %s | paquetes: %s',
    p_dup_id, p_master_id, v_moved_content, v_moved_packages);
END;
$function$;
