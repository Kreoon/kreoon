-- ============================================================================
-- AUTO-CREATE CLIENT: cuando un usuario se registra con rol 'client'
--
-- Problema: el onboarding guarda user_type='client' en profiles y agrega al
-- usuario a organization_members con role='client', pero NUNCA crea el
-- registro correspondiente en la tabla `clients` ni en `client_users`.
-- Resultado: el usuario no aparece en el modal de Clientes de la app.
--
-- Solución: trigger AFTER INSERT OR UPDATE en organization_members que
-- crea automáticamente el cliente y lo vincula via client_users.
-- ============================================================================

-- Función del trigger
CREATE OR REPLACE FUNCTION public.fn_auto_create_client_from_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
  v_email TEXT;
  v_client_id UUID;
BEGIN
  -- Solo actuar cuando el rol es 'client'
  IF NEW.role != 'client' THEN
    RETURN NEW;
  END IF;

  -- En UPDATE, solo actuar si el rol cambió a 'client' (no si ya era 'client')
  IF TG_OP = 'UPDATE' AND OLD.role = 'client' THEN
    RETURN NEW;
  END IF;

  -- Verificar si el usuario ya tiene un registro cliente en esta organización
  SELECT c.id INTO v_client_id
  FROM clients c
  JOIN client_users cu ON cu.client_id = c.id
  WHERE c.organization_id = NEW.organization_id
    AND cu.user_id = NEW.user_id
  LIMIT 1;

  IF v_client_id IS NOT NULL THEN
    -- Ya existe vínculo, nada que hacer
    RETURN NEW;
  END IF;

  -- Obtener nombre completo y email del perfil
  SELECT
    COALESCE(p.full_name, 'Cliente'),
    COALESCE(u.email, '')
  INTO v_full_name, v_email
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE p.id = NEW.user_id;

  -- Fallback si el perfil aún no existe (race condition poco probable)
  IF v_full_name IS NULL THEN
    v_full_name := 'Cliente';
    v_email := '';
  END IF;

  -- Crear registro en clients
  INSERT INTO public.clients (
    name,
    contact_email,
    organization_id,
    user_id,
    created_by,
    is_internal_brand,
    is_public
  )
  VALUES (
    v_full_name,
    NULLIF(v_email, ''),
    NEW.organization_id,
    NEW.user_id,
    NEW.user_id,
    false,
    true
  )
  RETURNING id INTO v_client_id;

  -- Vincular usuario como owner en client_users
  INSERT INTO public.client_users (client_id, user_id, role, created_by)
  VALUES (v_client_id, NEW.user_id, 'owner', NEW.user_id)
  ON CONFLICT (client_id, user_id) DO NOTHING;

  RAISE NOTICE 'Auto-created client % for user % in org %',
    v_client_id, NEW.user_id, NEW.organization_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- No bloquear el INSERT/UPDATE de organization_members si algo falla
    RAISE WARNING 'fn_auto_create_client_from_member: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Trigger sobre organization_members
DROP TRIGGER IF EXISTS trg_auto_create_client_from_member ON public.organization_members;

CREATE TRIGGER trg_auto_create_client_from_member
  AFTER INSERT OR UPDATE OF role
  ON public.organization_members
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_create_client_from_member();

-- ============================================================================
-- BACKFILL: crear clientes para miembros con role='client' que no tienen
-- registro en clients todavía
-- ============================================================================

DO $$
DECLARE
  r RECORD;
  v_full_name TEXT;
  v_email TEXT;
  v_client_id UUID;
BEGIN
  FOR r IN
    SELECT om.organization_id, om.user_id
    FROM organization_members om
    WHERE om.role = 'client'
      AND NOT EXISTS (
        SELECT 1
        FROM client_users cu
        JOIN clients c ON c.id = cu.client_id
        WHERE cu.user_id = om.user_id
          AND c.organization_id = om.organization_id
      )
  LOOP
    -- Obtener datos del perfil
    SELECT
      COALESCE(p.full_name, 'Cliente'),
      COALESCE(u.email, '')
    INTO v_full_name, v_email
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.id = r.user_id;

    IF v_full_name IS NULL THEN
      v_full_name := 'Cliente';
      v_email := '';
    END IF;

    -- Insertar en clients
    INSERT INTO public.clients (
      name,
      contact_email,
      organization_id,
      user_id,
      created_by,
      is_internal_brand,
      is_public
    )
    VALUES (
      v_full_name,
      NULLIF(v_email, ''),
      r.organization_id,
      r.user_id,
      r.user_id,
      false,
      true
    )
    RETURNING id INTO v_client_id;

    -- Vincular en client_users
    INSERT INTO public.client_users (client_id, user_id, role, created_by)
    VALUES (v_client_id, r.user_id, 'owner', r.user_id)
    ON CONFLICT (client_id, user_id) DO NOTHING;

    RAISE NOTICE 'Backfill: cliente % creado para user % en org %',
      v_client_id, r.user_id, r.organization_id;
  END LOOP;
END $$;

-- Notificar a PostgREST
NOTIFY pgrst, 'reload schema';
