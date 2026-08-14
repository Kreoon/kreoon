-- ============================================================================
-- KREOON — Marcar usuarios de la pestaña "Usuarios" como leads
--
-- El admin de la agencia pidió: en Clientes → Usuarios hay cuentas que en
-- realidad son leads (nunca compraron), y hoy no hay forma de separarlas
-- para remarketearlas. `org_contacts` ya es el CRM de leads de la
-- organización (contact_type incluye 'lead', tiene pipeline_stage,
-- relationship_strength, tags, notes, deal_value...) pero nunca se pudo
-- enlazar un contacto con la cuenta de plataforma de esa persona: le
-- faltaba `user_id`. Esta migración cierra ese hueco y agrega las dos RPC
-- para marcar/desmarcar desde la pestaña Usuarios.
--
-- Un contacto puede seguir existiendo sin cuenta (alguien que solo dejó su
-- correo en un formulario) y una cuenta puede seguir sin contacto (un
-- cliente de verdad, sin necesidad de estar en el CRM de leads) — por eso
-- `user_id` es nullable.
--
-- Va después de 20260814030000_unified_clients_excluye_archivadas.sql.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.admin_marcar_usuario_como_lead(uuid, uuid, text, text);
--   DROP FUNCTION IF EXISTS public.admin_quitar_marca_de_lead(uuid);
--   DROP INDEX IF EXISTS public.idx_org_contacts_user_unique;
--   ALTER TABLE public.org_contacts DROP COLUMN IF EXISTS user_id;
--   -- get_org_client_users quedaría con las columnas nuevas colgando sin
--   -- volver a la versión de 20260707000400 a menos que se restaure ese
--   -- archivo a mano.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Enlazar contacto ↔ cuenta de plataforma
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.org_contacts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.org_contacts.user_id IS
  'Cuenta de plataforma de este contacto, si la tiene. Opcional: un contacto puede existir sin cuenta (solo dejó su correo) y una cuenta puede existir sin contacto (cliente real, nunca marcado como lead).';

-- Un mismo usuario no puede marcarse dos veces como lead en la MISMA
-- organización. Parcial porque user_id es nullable y varios contactos
-- sueltos (sin cuenta) sí pueden coexistir sin chocar.
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_contacts_user_unique
  ON public.org_contacts(organization_id, user_id)
  WHERE user_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. admin_marcar_usuario_como_lead — pasa una cuenta a org_contacts
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_marcar_usuario_como_lead(
  p_user_id uuid,
  p_org_id uuid,
  p_notas text DEFAULT NULL,
  p_temperatura text DEFAULT 'warm'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id uuid;
  v_profile record;
BEGIN
  IF p_temperatura NOT IN ('cold', 'warm', 'hot') THEN
    RAISE EXCEPTION 'Temperatura inválida: "%" (debe ser cold, warm o hot)', p_temperatura;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.role::text = 'admin'
      -- Un admin dado de baja no puede seguir marcando usuarios como lead.
      AND om.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- El usuario a marcar debe pertenecer realmente a esta organización, para
  -- que un admin no pueda marcar como lead a alguien de otra org. Se cubren
  -- las tres formas en que una cuenta puede estar ligada a una org (mismo
  -- criterio que usa get_org_client_users para listar la pestaña Usuarios).
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om2
    WHERE om2.organization_id = p_org_id AND om2.user_id = p_user_id

    UNION

    SELECT 1 FROM public.organization_member_roles omr
    WHERE omr.organization_id = p_org_id AND omr.user_id = p_user_id

    UNION

    SELECT 1 FROM public.client_users cu
    JOIN public.clients c ON c.id = cu.client_id AND c.organization_id = p_org_id
    WHERE cu.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'El usuario no pertenece a esta organización';
  END IF;

  SELECT p.full_name, p.email, p.avatar_url, p.phone, p.city
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = p_user_id;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Perfil de usuario no encontrado';
  END IF;

  -- Idempotente: si el usuario ya tenía un contacto en esta organización
  -- (marcado antes, o creado suelto y luego enlazado a mano), se actualiza
  -- en vez de duplicar. custom_fields se mergea para no pisar campos que la
  -- agencia haya llenado manualmente en el CRM.
  INSERT INTO public.org_contacts (
    organization_id, user_id, full_name, email, phone, avatar_url,
    contact_type, relationship_strength, notes, custom_fields, created_by
  ) VALUES (
    p_org_id, p_user_id, v_profile.full_name, v_profile.email, v_profile.phone, v_profile.avatar_url,
    'lead', p_temperatura, p_notas,
    -- org_contacts no tiene columna de ciudad propia; se guarda dentro de
    -- custom_fields para no perder el dato del perfil.
    CASE WHEN v_profile.city IS NOT NULL THEN jsonb_build_object('city', v_profile.city) ELSE '{}'::jsonb END,
    auth.uid()
  )
  ON CONFLICT (organization_id, user_id) WHERE user_id IS NOT NULL
  DO UPDATE SET
    contact_type = 'lead',
    relationship_strength = p_temperatura,
    notes = COALESCE(EXCLUDED.notes, org_contacts.notes),
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    avatar_url = EXCLUDED.avatar_url,
    custom_fields = COALESCE(org_contacts.custom_fields, '{}'::jsonb) || EXCLUDED.custom_fields,
    updated_at = now()
  RETURNING id INTO v_contact_id;

  RETURN v_contact_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_marcar_usuario_como_lead(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_marcar_usuario_como_lead(uuid, uuid, text, text) TO authenticated;

COMMENT ON FUNCTION public.admin_marcar_usuario_como_lead(uuid, uuid, text, text) IS
  'Marca una cuenta de la pestaña Usuarios como lead en org_contacts (para remarketing). Solo el admin de la organización. Idempotente: si ya existía el contacto, lo actualiza en vez de duplicarlo.';

-- ─────────────────────────────────────────────────────────────
-- 3. admin_quitar_marca_de_lead — revierte la marca
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_quitar_marca_de_lead(p_contact_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT oc.organization_id INTO v_org_id FROM public.org_contacts oc WHERE oc.id = p_contact_id;

  -- Idempotente: si el contacto ya no existe, no hay nada que quitar.
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_org_id
      AND om.user_id = auth.uid()
      AND om.role::text = 'admin'
      AND om.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Es una marca, no un dato histórico que valga la pena conservar: se
  -- borra el contacto entero (a diferencia de admin_archive_client, que
  -- hace soft delete porque ahí sí hay contenido/pagos colgando).
  DELETE FROM public.org_contacts WHERE id = p_contact_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_quitar_marca_de_lead(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_quitar_marca_de_lead(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_quitar_marca_de_lead(uuid) IS
  'Quita la marca de lead (borra el org_contacts) de un usuario de la pestaña Usuarios. Solo el admin de la organización dueña del contacto. Idempotente.';

-- ─────────────────────────────────────────────────────────────
-- 4. get_org_client_users — que la pestaña sepa quién ya está marcado
-- ─────────────────────────────────────────────────────────────
-- Se parte tal cual de la definición vigente en
-- 20260707000400_fix_get_org_client_users_cross_org_leak.sql y solo se le
-- agrega el LEFT JOIN a org_contacts y dos columnas AL FINAL del
-- RETURNS TABLE (lead_contact_id, es_lead). No se toca el orden de las
-- columnas existentes ni el resto de la lógica — el frontend depende del
-- orden, y reescribir RPCs "de memoria" ya rompió get_unified_clients en
-- producción (ver 20260814030000).
--
-- El DROP es OBLIGATORIO, no una precaución: Postgres rechaza cambiar el tipo
-- de retorno de una función existente con CREATE OR REPLACE ("cannot change
-- return type of existing function"), y agregar columnas al RETURNS TABLE es
-- justamente eso. Sin esta línea la migración entera falla al aplicarse.
DROP FUNCTION IF EXISTS public.get_org_client_users(uuid);

CREATE OR REPLACE FUNCTION public.get_org_client_users(p_org_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  phone text,
  city text,
  bio text,
  created_at timestamp with time zone,
  linked_companies jsonb,
  lead_contact_id uuid,
  es_lead boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.assert_org_member(p_org_id);

  RETURN QUERY
  WITH client_user_ids AS (
    SELECT DISTINCT om.user_id
    FROM organization_members om
    WHERE om.organization_id = p_org_id
      AND (
        om.role IN ('client', 'brand_manager', 'marketing_director')
        OR EXISTS (
          SELECT 1 FROM organization_member_roles omr
          WHERE omr.organization_id = p_org_id
            AND omr.user_id = om.user_id
            AND omr.role IN ('client', 'brand_manager', 'marketing_director')
        )
      )

    UNION

    SELECT DISTINCT cu.user_id
    FROM client_users cu
    JOIN clients c ON c.id = cu.client_id AND c.organization_id = p_org_id
  )
  SELECT
    p.id AS user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    p.phone,
    p.city,
    p.bio,
    p.created_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'client_id', c.id,
            'client_name', c.name,
            'role', COALESCE(cu.role, 'viewer')
          )
        )
        FROM client_users cu
        JOIN clients c ON c.id = cu.client_id AND c.organization_id = p_org_id
        WHERE cu.user_id = p.id
      ),
      '[]'::jsonb
    ) AS linked_companies,
    oc.id AS lead_contact_id,
    (oc.id IS NOT NULL) AS es_lead
  FROM client_user_ids cui
  JOIN profiles p ON p.id = cui.user_id
  LEFT JOIN org_contacts oc
    ON oc.organization_id = p_org_id
    AND oc.user_id = p.id
    AND oc.contact_type = 'lead'
  ORDER BY p.full_name;
END;
$function$;

-- El DROP de arriba se llevó los permisos por delante: hay que devolvérselos
-- o la pestaña Usuarios se queda sin poder llamar a su propia función.
REVOKE EXECUTE ON FUNCTION public.get_org_client_users(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_org_client_users(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_org_client_users(uuid) IS
  'Usuarios de plataforma vinculados a empresas de la organizacion, para la pestana Usuarios. Devuelve ademas si la persona ya esta marcada como lead (es_lead / lead_contact_id) contra org_contacts.';

NOTIFY pgrst, 'reload schema';
