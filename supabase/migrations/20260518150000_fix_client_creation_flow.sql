-- ============================================================================
-- FIX: flujo correcto de creación de empresa para clientes
--
-- Problema: el trigger fn_auto_create_client_from_member creaba registros
-- en la tabla `clients` usando profiles.full_name ("Alexander Castaño")
-- en lugar del nombre real de la empresa que el usuario ingresa
-- en el diálogo "Crear mi marca" ("Empresa de Prueba").
--
-- Solución:
-- 1. Eliminar el trigger — los registros en `clients` se crean solo cuando
--    el usuario explícitamente crea su marca via CreateBrandDialog
-- 2. Backfill: para usuarios que ya tienen una `brands`, sincronizar
--    el registro en `clients` usando el nombre correcto de la marca
-- ============================================================================

-- 1. Eliminar el trigger automático
DROP TRIGGER IF EXISTS trg_auto_create_client_from_member ON public.organization_members;

-- Nota: la función fn_auto_create_client_from_member se mantiene por si
-- se necesita invocar manualmente en flujos de admin futuros.

-- 2. Backfill: para cada usuario que tiene una marca en `brands`,
--    sincronizar su registro en `clients` con el nombre correcto
DO $$
DECLARE
  r        RECORD;
  v_org_id UUID;
  v_email  TEXT;
  v_client_id UUID;
BEGIN
  SELECT id INTO v_org_id FROM organizations ORDER BY created_at LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE WARNING 'Backfill clients: no hay organización principal';
    RETURN;
  END IF;

  FOR r IN
    SELECT b.owner_id AS user_id, b.name AS brand_name
    FROM public.brands b
    WHERE b.owner_id IS NOT NULL
  LOOP
    SELECT u.email INTO v_email FROM auth.users u WHERE u.id = r.user_id;

    -- Eliminar registros en client_users para este usuario en esta org
    DELETE FROM public.client_users
    WHERE user_id = r.user_id
      AND client_id IN (
        SELECT id FROM public.clients
        WHERE organization_id = v_org_id
          AND user_id = r.user_id
      );

    -- Eliminar registros en clients (mal nombrados o duplicados)
    DELETE FROM public.clients
    WHERE organization_id = v_org_id
      AND user_id = r.user_id;

    -- Crear registro correcto con el nombre de la marca
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
      r.brand_name,
      NULLIF(v_email, ''),
      v_org_id,
      r.user_id,
      r.user_id,
      false,
      true
    )
    RETURNING id INTO v_client_id;

    IF v_client_id IS NOT NULL THEN
      INSERT INTO public.client_users (client_id, user_id, role, created_by)
      VALUES (v_client_id, r.user_id, 'owner', r.user_id)
      ON CONFLICT (client_id, user_id) DO NOTHING;

      RAISE NOTICE 'clients sincronizado: "%" para user %', r.brand_name, r.user_id;
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error sincronizando clients para user %: %', r.user_id, SQLERRM;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
