-- ============================================================================
-- GUARD: auto_create_client_from_profile no debe duplicar empresa cuando el
-- usuario ya está vinculado a una empresa existente vía client_users
-- ============================================================================
-- Fecha: 2026-08-11
--
-- Problema:
-- El trigger trg_auto_create_client_on_onboarding (AFTER UPDATE OF
-- onboarding_completed ON profiles) auto-crea una fila en `clients` con el
-- NOMBRE DE LA PERSONA cuando un usuario con user_type='client' completa su
-- onboarding. Su único guard de idempotencia era:
--     IF EXISTS (SELECT 1 FROM clients WHERE user_id = NEW.id) ...
-- es decir, miraba SOLO el vínculo legacy `clients.user_id`.
--
-- En el flujo de Onboarding de Clientes la empresa YA existe (la creó el admin)
-- y el usuario invitado se vincula por `client_users`, sin tocar el legacy
-- `clients.user_id` (escribirlo está prohibido en código nuevo). Resultado sin
-- este fix: al completar su onboarding, el invitado obtenía una SEGUNDA empresa
-- llamada como él, y quedaba con dos empresas en el portal.
--
-- Es la misma clase de bug que ya se corrigió una vez en
-- 20260518150000_fix_client_creation_flow.sql, donde el trigger creaba clientes
-- con profiles.full_name en vez del nombre real de la empresa.
--
-- Fix: agregar un segundo guard que también corte si existe CUALQUIER vínculo
-- en client_users para ese usuario.
--
-- Comportamiento preservado a propósito: un usuario client SIN vínculo en
-- client_users sigue recibiendo su empresa auto-creada igual que hoy. Este
-- cambio solo agrega una condición de corte; no altera el camino existente.
-- Verificado en producción con ambos escenarios dentro de una transacción con
-- ROLLBACK: con vínculo -> 0 empresas creadas; sin vínculo -> 1 empresa creada.
--
-- Rollback: volver a aplicar la definición previa quitando el bloque marcado
--   "GUARD NUEVO" (el resto del cuerpo es idéntico).
-- ============================================================================

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
  IF NEW.user_type != 'client' THEN RETURN NEW; END IF;
  IF NEW.onboarding_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF OLD.onboarding_completed IS TRUE THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM clients WHERE user_id = NEW.id) THEN RETURN NEW; END IF;

  -- ── GUARD NUEVO ──────────────────────────────────────────────────────────
  -- El usuario ya pertenece a una empresa existente (flujo de Onboarding de
  -- Clientes: el admin creó la empresa y lo vinculó por client_users antes de
  -- que él completara su onboarding). Crear otra la duplicaría.
  IF EXISTS (SELECT 1 FROM client_users WHERE user_id = NEW.id) THEN
    RAISE NOTICE 'auto_create_client_from_profile: user % ya vinculado en client_users, no se crea empresa', NEW.id;
    RETURN NEW;
  END IF;
  -- ─────────────────────────────────────────────────────────────────────────

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

COMMENT ON FUNCTION public.auto_create_client_from_profile() IS
  'Auto-crea empresa al completar onboarding un usuario client. Corta si ya hay empresa por clients.user_id (legacy) O si el usuario ya está vinculado por client_users (flujo de Onboarding de Clientes, donde la empresa ya existe).';
