-- Relanzamiento Kreoon / UGC Colombia — Fase 3: onboarding de creadores y perfiles sin publicar.
--
-- Hallazgos verificados en la base viva (2026-09-30):
--   P1  auto_create_creator_profile() crea CADA creator_profiles con is_active = true y
--       is_published = true (default de columna). 642 de 645 perfiles estan publicos desde el
--       registro, con nombre, foto y bio, antes de que la persona decida nada. El relanzamiento exige
--       que crear cuenta, completar perfil y PUBLICAR portafolio sean tres hechos distintos y que nada
--       se publique automaticamente.
--   P2  publish_profile_blocks() no toca creator_profiles.is_active: hoy el default "publico" hace que
--       publicar no cambie la visibilidad. Si solo cambiamos el default, publicar dejaria de funcionar.
--       => publicar es el acto explicito que activa is_active / is_published.
--   P3  auto_create_client_from_profile(): `NEW.user_type != 'client'` con user_type NULL evalua NULL
--       (falso) y el trigger SIGUE: al completar onboarding crearia una empresa ("cliente") con el nombre
--       de un creador. Se corrige con IS DISTINCT FROM.
--
-- Alcance: SOLO perfiles NUEVOS. No se modifican filas existentes (los 642 perfiles ya visibles quedan
-- como estan; revertirlo masivamente seria una decision de producto aparte y se documenta en el runbook).

-- ─── P1: los perfiles de creador nacen sin publicar ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_create_creator_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.creator_profiles (
    user_id, display_name, bio, avatar_url, location_city, location_country,
    categories, languages, social_links, is_available,
    is_active, is_published,
    platforms, marketplace_roles, content_types
  )
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.full_name), ''), 'Creador'),
    NEW.bio,
    NEW.avatar_url,
    NEW.city,
    COALESCE(NEW.country, 'CO'),
    COALESCE(NEW.content_categories, '{}'::text[]),
    COALESCE(NEW.languages, '{es}'::text[]),
    jsonb_strip_nulls(jsonb_build_object(
      'instagram', NULLIF(NEW.instagram, ''),
      'tiktok', NULLIF(NEW.tiktok, '')
    )),
    true,
    false,  -- is_active: NO visible en el marketplace hasta que la persona publique
    false,  -- is_published
    '{}'::text[], '{}'::text[], '{}'::text[]
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

-- ─── P2: publicar el portafolio es el acto explicito que hace visible el perfil ─────────────────
CREATE OR REPLACE FUNCTION public.publish_profile_blocks(profile_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM creator_profiles
    WHERE id = publish_profile_blocks.profile_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  DELETE FROM profile_builder_blocks
  WHERE profile_builder_blocks.profile_id = publish_profile_blocks.profile_id AND is_draft = false;

  UPDATE profile_builder_blocks
  SET is_draft = false
  WHERE profile_builder_blocks.profile_id = publish_profile_blocks.profile_id AND is_draft = true;

  UPDATE creator_profiles
  SET builder_has_draft = false,
      is_active = true,
      is_published = true
  WHERE id = publish_profile_blocks.profile_id;

  RETURN true;
END;
$function$;

-- ─── P3: un creador (user_type NULL o 'talent') nunca genera una empresa ────────────────────────
-- Solo cambia la primera guarda; el resto de la funcion queda identico a la version viva.
CREATE OR REPLACE FUNCTION public.auto_create_client_from_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id    UUID;
  v_client_id UUID;
BEGIN
  IF NEW.user_type IS DISTINCT FROM 'client' THEN RETURN NEW; END IF;
  IF NEW.onboarding_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF OLD.onboarding_completed IS TRUE THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM clients WHERE user_id = NEW.id) THEN RETURN NEW; END IF;

  IF EXISTS (SELECT 1 FROM client_users WHERE user_id = NEW.id) THEN
    RAISE NOTICE 'auto_create_client_from_profile: user % ya vinculado en client_users, no se crea empresa', NEW.id;
    RETURN NEW;
  END IF;

  SELECT organization_id INTO v_org_id
  FROM organization_members WHERE user_id = NEW.id LIMIT 1;

  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE WARNING 'auto_create_client_from_profile: sin org para user %', NEW.id;
    RETURN NEW;
  END IF;

  INSERT INTO public.clients (
    name, contact_email, contact_phone,
    user_id, organization_id, created_by,
    country, city, address,
    document_type, document_number,
    username, is_public, is_internal_brand
  )
  SELECT
    COALESCE(NEW.full_name, 'Cliente'),
    u.email,
    NEW.phone,
    NEW.id,
    v_org_id,
    NEW.id,
    NEW.country, NEW.city, NEW.address,
    NEW.document_type, NEW.document_number,
    NEW.username, true, false
  FROM auth.users u WHERE u.id = NEW.id
  RETURNING id INTO v_client_id;

  IF v_client_id IS NOT NULL THEN
    INSERT INTO public.client_users (client_id, user_id, role, created_by)
    VALUES (v_client_id, NEW.id, 'owner', NEW.id)
    ON CONFLICT (client_id, user_id) DO NOTHING;
    RAISE NOTICE 'auto_create_client_from_profile: cliente % creado para user %', v_client_id, NEW.id;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_client_from_profile: error para user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- ─── Onboarding de creadores: guardado progresivo ───────────────────────────────────────────────
-- Helper: la persona es creadora (miembro activo con rol de creador) y NO cliente.
CREATE OR REPLACE FUNCTION public._is_creator_member(p_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members m
    WHERE m.user_id = p_uid AND m.deleted_at IS NULL
      AND m.role IN ('creator', 'content_creator', 'ugc_creator')
  )
$$;
REVOKE ALL ON FUNCTION public._is_creator_member(uuid) FROM PUBLIC, anon, authenticated;

-- save_creator_onboarding_progress: cada paso se guarda solo; todo es opcional (se puede omitir).
-- NO publica nada: is_active / is_published no se tocan aqui.
CREATE OR REPLACE FUNCTION public.save_creator_onboarding_progress(
  p_display_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_content_types text[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text;
  v_types text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT public._is_creator_member(v_uid) THEN RAISE EXCEPTION 'forbidden: not a creator member'; END IF;

  -- user_type = 'talent' (cierra P3 para cuentas previas al trigger corregido)
  UPDATE profiles SET user_type = 'talent' WHERE id = v_uid AND user_type IS NULL;

  IF p_display_name IS NOT NULL THEN
    v_name := btrim(regexp_replace(p_display_name, '[[:cntrl:]]', '', 'g'));
    IF length(v_name) < 2 OR length(v_name) > 80 THEN
      RAISE EXCEPTION 'invalid_display_name';
    END IF;
    UPDATE creator_profiles SET display_name = v_name WHERE user_id = v_uid;
  END IF;

  IF p_avatar_url IS NOT NULL THEN
    IF length(p_avatar_url) > 600 OR p_avatar_url !~ '^https://' THEN
      RAISE EXCEPTION 'invalid_avatar_url';
    END IF;
    UPDATE profiles SET avatar_url = p_avatar_url WHERE id = v_uid;
    UPDATE creator_profiles SET avatar_url = p_avatar_url WHERE user_id = v_uid;
  END IF;

  IF p_content_types IS NOT NULL THEN
    SELECT COALESCE(array_agg(DISTINCT t), '{}') INTO v_types
    FROM (
      SELECT btrim(x) AS t FROM unnest(p_content_types) x
      WHERE length(btrim(x)) BETWEEN 1 AND 40 AND x !~ '[<>{}"''`\\[:cntrl:]]'
      LIMIT 12
    ) s;
    UPDATE creator_profiles SET content_types = v_types WHERE user_id = v_uid;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.save_creator_onboarding_progress(text, text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_creator_onboarding_progress(text, text, text[]) TO authenticated, service_role;

-- finish_creator_onboarding: marca el onboarding como hecho SOLO si los documentos de registro estan
-- aceptados (evidencia en user_legal_consents). No marca el perfil como publicado ni "completo".
CREATE OR REPLACE FUNCTION public.finish_creator_onboarding()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_missing text[];
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT public._is_creator_member(v_uid) THEN RAISE EXCEPTION 'forbidden: not a creator member'; END IF;

  SELECT array_agg(d.document_type ORDER BY d.document_type) INTO v_missing
  FROM public.list_registration_documents('talent') d
  WHERE NOT EXISTS (
    SELECT 1 FROM user_legal_consents c
    WHERE c.user_id = v_uid AND c.document_id = d.document_id AND c.accepted = true
  );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'consents_required: %', array_to_string(v_missing, ',');
  END IF;

  UPDATE profiles
  SET user_type = COALESCE(user_type, 'talent'),
      onboarding_completed = true,
      legal_consents_completed = true,
      platform_access_unlocked = true
  WHERE id = v_uid;

  RETURN jsonb_build_object('ok', true);
END;
$$;
REVOKE ALL ON FUNCTION public.finish_creator_onboarding() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_creator_onboarding() TO authenticated, service_role;

-- Documentos de registro pendientes de la persona (creadores existentes que nunca los aceptaron).
CREATE OR REPLACE FUNCTION public.get_my_pending_registration_documents()
RETURNS TABLE (document_id uuid, document_type text, title text, version text, summary text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN QUERY
  SELECT d.document_id, d.document_type, d.title, d.version, d.summary
  FROM public.list_registration_documents('talent') d
  WHERE NOT EXISTS (
    SELECT 1 FROM user_legal_consents c
    WHERE c.user_id = auth.uid() AND c.document_id = d.document_id AND c.accepted = true
  )
  ORDER BY d.document_type;
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_pending_registration_documents() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_pending_registration_documents() TO authenticated, service_role;

-- Acepta documentos de registro vigentes. Solo documentos que el servidor exige para creadores; la
-- version, el hash, la fecha y la IP las fija el servidor (el cliente solo dice QUE acepta).
CREATE OR REPLACE FUNCTION public.accept_registration_documents(p_document_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_ip inet := NULL;
  v_ua text := NULL;
  v_headers json;
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT public._is_creator_member(v_uid) THEN RAISE EXCEPTION 'forbidden: not a creator member'; END IF;

  BEGIN
    v_headers := current_setting('request.headers', true)::json;
    v_ua := left(v_headers->>'user-agent', 500);
    v_ip := NULLIF(btrim(split_part(COALESCE(v_headers->>'x-forwarded-for', ''), ',', 1)), '')::inet;
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;

  INSERT INTO user_legal_consents (
    user_id, document_id, document_type, document_version,
    accepted, accepted_at, ip_address, user_agent, consent_method, is_current
  )
  SELECT v_uid, d.document_id, d.document_type, d.version, true, now(), v_ip, v_ua, 'onboarding', true
  FROM public.list_registration_documents('talent') d
  WHERE d.document_id = ANY (COALESCE(p_document_ids, '{}'))
  ON CONFLICT (user_id, document_id) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.accept_registration_documents(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_registration_documents(uuid[]) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
