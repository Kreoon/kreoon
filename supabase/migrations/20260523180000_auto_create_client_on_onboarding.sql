-- Migration: Auto-crear registro en clients al completar onboarding como cliente
-- Date: 2026-05-23
-- Author: Alexander Cast
--
-- Contexto:
--   La migración 20260518120000 creó trg_auto_create_client_from_member que crea
--   el registro en `clients` cuando el usuario entra a organization_members con
--   role='client'. Sin embargo, existe un gap: si complete_onboarding se invoca
--   manualmente desde la BD (sin pasar por register_user_to_organization), o si
--   el usuario ya estaba en organization_members antes de completar el onboarding,
--   el registro en `clients` nunca se crea.
--
-- Solución (dos capas complementarias):
--   1. complete_onboarding: al final de la función, si user_type='client', hacer
--      un INSERT idempotente en `clients` y `client_users` (ON CONFLICT + NOT EXISTS).
--   2. Trigger en `profiles` (trg_auto_create_client_on_onboarding): AFTER UPDATE
--      cuando onboarding_completed cambia de false→true y user_type='client'.
--      Cubre el caso de llamadas directas a UPDATE profiles desde la BD.

-- ============================================================
-- 1. REEMPLAZAR complete_onboarding
--    Base: versión de 20260518130000_complete_onboarding_register_client.sql
--    Adición: bloque de auto-crear en clients justo antes del RAISE NOTICE final
-- ============================================================

CREATE OR REPLACE FUNCTION public.complete_onboarding(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_exists BOOLEAN;
  v_pending_count  INT := 0;
  v_user_type      TEXT;
  v_org_id         UUID;
  v_client_id      UUID;
BEGIN
  -- 1. Verificar que el perfil existe
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_user_id) INTO v_profile_exists;

  IF NOT v_profile_exists THEN
    RAISE WARNING 'complete_onboarding: perfil no existe para %', p_user_id;
    RETURN false;
  END IF;

  -- 2. Contar documentos pendientes (con manejo de error)
  BEGIN
    SELECT COUNT(*) INTO v_pending_count
    FROM get_pending_consents(p_user_id)
    WHERE is_required = true;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'complete_onboarding: error contando pendientes: %', SQLERRM;
    v_pending_count := 0;
  END;

  IF v_pending_count > 0 THEN
    RAISE WARNING 'complete_onboarding: % documentos pendientes (continuando igual)', v_pending_count;
  END IF;

  -- 3. Marcar onboarding como completado
  UPDATE profiles SET
    profile_completed           = true,
    profile_completed_at        = COALESCE(profile_completed_at, NOW()),
    legal_consents_completed    = true,
    legal_consents_completed_at = COALESCE(legal_consents_completed_at, NOW()),
    onboarding_completed        = true,
    onboarding_completed_at     = NOW(),
    platform_access_unlocked    = true,
    updated_at                  = NOW()
  WHERE id = p_user_id
  RETURNING user_type INTO v_user_type;

  IF NOT FOUND THEN
    RAISE WARNING 'complete_onboarding: UPDATE no afectó filas para %', p_user_id;
    RETURN false;
  END IF;

  -- 4. Si es cliente, registrarlo en la organización principal
  IF v_user_type = 'client' THEN
    -- Verificar si ya tiene organización asignada
    SELECT current_organization_id INTO v_org_id
    FROM profiles
    WHERE id = p_user_id;

    IF v_org_id IS NULL THEN
      -- Obtener la única organización de la plataforma
      SELECT id INTO v_org_id
      FROM organizations
      ORDER BY created_at
      LIMIT 1;

      IF v_org_id IS NOT NULL THEN
        -- Registrar en organization_members con role='client'
        -- (el trigger trg_auto_create_client_from_member también intentará crear
        --  el registro en clients, pero el bloque de abajo lo cubre de forma segura)
        PERFORM register_user_to_organization(v_org_id, p_user_id, 'client');

        -- Actualizar current_organization_id en profiles
        UPDATE profiles
        SET current_organization_id = v_org_id,
            organization_status     = 'active',
            updated_at              = NOW()
        WHERE id = p_user_id;

        RAISE NOTICE 'complete_onboarding: cliente % registrado en org %', p_user_id, v_org_id;
      ELSE
        RAISE WARNING 'complete_onboarding: no se encontró organización principal para el cliente %', p_user_id;
      END IF;
    END IF;

    -- ---------------------------------------------------------------
    -- Auto-crear registro en clients si no existe aún
    -- Se ejecuta SIEMPRE para user_type='client', independientemente
    -- de si v_org_id vino de profiles o se obtuvo de organizations.
    -- Si el trigger trg_auto_create_client_from_member ya lo creó,
    -- los ON CONFLICT / NOT EXISTS garantizan idempotencia.
    -- ---------------------------------------------------------------

    -- Obtener v_org_id desde organization_members si aún es NULL
    -- (puede pasar si register_user_to_organization falló silenciosamente)
    IF v_org_id IS NULL THEN
      SELECT organization_id INTO v_org_id
      FROM organization_members
      WHERE user_id = p_user_id
      LIMIT 1;
    END IF;

    IF v_org_id IS NOT NULL THEN
      -- Verificar si ya existe un registro en clients para este user
      IF NOT EXISTS (
        SELECT 1 FROM clients WHERE user_id = p_user_id
      ) THEN
        INSERT INTO public.clients (
          name,
          contact_email,
          contact_phone,
          user_id,
          organization_id,
          created_by,
          country,
          city,
          address,
          document_type,
          document_number,
          username,
          is_public,
          is_internal_brand
        )
        SELECT
          COALESCE(p.full_name, 'Cliente'),
          COALESCE(u.email, NULL),
          p.phone,
          p.id,
          v_org_id,
          p.id,
          p.country,
          p.city,
          p.address,
          p.document_type,
          p.document_number,
          p.username,
          true,
          false
        FROM profiles p
        JOIN auth.users u ON u.id = p.id
        WHERE p.id = p_user_id
        RETURNING id INTO v_client_id;

        -- Vincular en client_users como owner
        IF v_client_id IS NOT NULL THEN
          INSERT INTO public.client_users (client_id, user_id, role, created_by)
          VALUES (v_client_id, p_user_id, 'owner', p_user_id)
          ON CONFLICT (client_id, user_id) DO NOTHING;

          RAISE NOTICE 'complete_onboarding: cliente % creado en tabla clients para user %',
            v_client_id, p_user_id;
        END IF;
      ELSE
        RAISE NOTICE 'complete_onboarding: cliente ya existe en tabla clients para user %', p_user_id;
      END IF;
    ELSE
      RAISE WARNING 'complete_onboarding: no se pudo determinar org_id para crear registro en clients (user: %)', p_user_id;
    END IF;

  END IF; -- END IF v_user_type = 'client'

  RAISE NOTICE 'complete_onboarding: ÉXITO para %', p_user_id;
  RETURN true;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'complete_onboarding: error inesperado para %: %', p_user_id, SQLERRM;
  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_onboarding(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_onboarding(UUID) TO service_role;

-- ============================================================
-- 2. FUNCIÓN DEL TRIGGER en profiles
--    Se dispara AFTER UPDATE cuando onboarding_completed
--    cambia de false → true y user_type = 'client'.
--    Cubre el gap de llamadas directas a UPDATE profiles.
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_create_client_from_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id    UUID;
  v_client_id UUID;
BEGIN
  -- Solo actuar cuando el onboarding pasa de false a true para clientes
  IF NEW.user_type != 'client' THEN
    RETURN NEW;
  END IF;

  IF NEW.onboarding_completed IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Verificar que efectivamente cambió (evitar re-disparos en UPDATE repetidos)
  IF OLD.onboarding_completed IS TRUE THEN
    RETURN NEW;
  END IF;

  -- Verificar si ya existe el registro en clients (idempotente)
  IF EXISTS (SELECT 1 FROM clients WHERE user_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  -- Obtener organización del usuario desde organization_members
  SELECT organization_id INTO v_org_id
  FROM organization_members
  WHERE user_id = NEW.id
  LIMIT 1;

  -- Fallback: buscar la org principal si no está en organization_members aún
  IF v_org_id IS NULL THEN
    SELECT id INTO v_org_id
    FROM organizations
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_org_id IS NULL THEN
    RAISE WARNING 'auto_create_client_from_profile: no se encontró org para user %', NEW.id;
    RETURN NEW;
  END IF;

  -- Insertar en clients
  INSERT INTO public.clients (
    name,
    contact_email,
    contact_phone,
    user_id,
    organization_id,
    created_by,
    country,
    city,
    address,
    document_type,
    document_number,
    username,
    is_public,
    is_internal_brand
  )
  SELECT
    COALESCE(NEW.full_name, 'Cliente'),
    COALESCE(u.email, NULL),
    NEW.phone,
    NEW.id,
    v_org_id,
    NEW.id,
    NEW.country,
    NEW.city,
    NEW.address,
    NEW.document_type,
    NEW.document_number,
    NEW.username,
    true,
    false
  FROM auth.users u
  WHERE u.id = NEW.id
  RETURNING id INTO v_client_id;

  -- Vincular en client_users como owner
  IF v_client_id IS NOT NULL THEN
    INSERT INTO public.client_users (client_id, user_id, role, created_by)
    VALUES (v_client_id, NEW.id, 'owner', NEW.id)
    ON CONFLICT (client_id, user_id) DO NOTHING;

    RAISE NOTICE 'auto_create_client_from_profile: cliente % creado para user %',
      v_client_id, NEW.id;
  END IF;

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- No bloquear el UPDATE de profiles si algo falla
  RAISE WARNING 'auto_create_client_from_profile: error para user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. TRIGGER en profiles
-- ============================================================

DROP TRIGGER IF EXISTS trg_auto_create_client_on_onboarding ON public.profiles;

CREATE TRIGGER trg_auto_create_client_on_onboarding
  AFTER UPDATE OF onboarding_completed
  ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_client_from_profile();

-- ============================================================
-- 4. BACKFILL: clientes con onboarding completado que aún
--    no tienen registro en la tabla clients
-- ============================================================

DO $$
DECLARE
  r         RECORD;
  v_org_id  UUID;
  v_client_id UUID;
  v_email   TEXT;
BEGIN
  -- Org principal
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE WARNING 'Backfill auto_create_client: no hay organización, saltando';
    RETURN;
  END IF;

  FOR r IN
    SELECT p.id AS user_id, p.full_name, p.phone,
           p.country, p.city, p.address,
           p.document_type, p.document_number, p.username,
           u.email
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.user_type = 'client'
      AND p.onboarding_completed = true
      AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.user_id = p.id)
  LOOP
    INSERT INTO public.clients (
      name,
      contact_email,
      contact_phone,
      user_id,
      organization_id,
      created_by,
      country,
      city,
      address,
      document_type,
      document_number,
      username,
      is_public,
      is_internal_brand
    )
    VALUES (
      COALESCE(r.full_name, 'Cliente'),
      NULLIF(r.email, ''),
      r.phone,
      r.user_id,
      v_org_id,
      r.user_id,
      r.country,
      r.city,
      r.address,
      r.document_type,
      r.document_number,
      r.username,
      true,
      false
    )
    RETURNING id INTO v_client_id;

    INSERT INTO public.client_users (client_id, user_id, role, created_by)
    VALUES (v_client_id, r.user_id, 'owner', r.user_id)
    ON CONFLICT (client_id, user_id) DO NOTHING;

    RAISE NOTICE 'Backfill: cliente % creado para user %', v_client_id, r.user_id;
  END LOOP;
END $$;

-- Notificar a PostgREST para recargar el schema
NOTIFY pgrst, 'reload schema';
