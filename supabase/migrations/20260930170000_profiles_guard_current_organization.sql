-- Relanzamiento Kreoon / UGC Colombia — Fase 7: current_organization_id no se asigna a mano a una org ajena.
--
-- Hallazgo (revision adversarial + VIVO 2026-09-30): "Users can update own profile" (UPDATE, authenticated,
-- id = auth.uid()) no restringe columnas y trg_guard_profile_privileged_columns NO cubre
-- profiles.current_organization_id. Varias policies confian en esa columna como "mi organizacion activa":
-- goals (CRUD completo), profiles "same organization"/"Org members can view org profiles",
-- ai_assistant_config y las de "Platform admins ... in current org". Un PATCH directo
--   PATCH /profiles?id=eq.<yo>  { "current_organization_id": "<otra org>" }
-- daria lectura/escritura sobre datos de otra organizacion. Hoy hay una sola organizacion (impacto bajo),
-- pero con altas abiertas y organizaciones futuras seria acceso cruzado.
--
-- Fix: el guard exige membresia activa en la organizacion destino para fijarla (o ser superadmin/root,
-- que si cambian de contexto). El resto del cuerpo es IDENTICO a la version viva. Los flujos de confianza
-- (funciones SECURITY DEFINER, service_role) siguen pasando: el guard solo actua como 'authenticated'.

CREATE OR REPLACE FUNCTION public.trg_guard_profile_privileged_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Solo se aplica cuando el UPDATE llega como el rol 'authenticated' de
  -- PostgREST (un PATCH directo del cliente). Cualquier otro current_user
  -- (dueño de una función SECURITY DEFINER de confianza, service_role,
  -- postgres) se deja pasar.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'forbidden: cannot modify profiles.email directly';
  END IF;

  IF NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin THEN
    RAISE EXCEPTION 'forbidden: cannot modify profiles.is_superadmin directly';
  END IF;

  IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
    RAISE EXCEPTION 'forbidden: cannot modify profiles.is_platform_admin directly';
  END IF;

  IF NEW.is_platform_founder IS DISTINCT FROM OLD.is_platform_founder THEN
    RAISE EXCEPTION 'forbidden: cannot modify profiles.is_platform_founder directly';
  END IF;

  IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
    RAISE EXCEPTION 'forbidden: cannot modify profiles.is_banned directly';
  END IF;

  IF NEW.active_role IS DISTINCT FROM OLD.active_role THEN
    IF NOT public.user_holds_role(NEW.id, NEW.active_role) THEN
      RAISE EXCEPTION 'forbidden: cannot set active_role to a role you do not hold (%)', NEW.active_role;
    END IF;
  END IF;

  -- NUEVO: la organizacion activa solo puede ser una de la que la persona es miembro activo.
  IF NEW.current_organization_id IS NOT NULL
     AND NEW.current_organization_id IS DISTINCT FROM OLD.current_organization_id
     AND NOT COALESCE(NEW.is_superadmin, false)
     AND NOT public.is_platform_root(NEW.id)
     AND NOT EXISTS (
       SELECT 1 FROM public.organization_members m
       WHERE m.user_id = NEW.id
         AND m.organization_id = NEW.current_organization_id
         AND m.deleted_at IS NULL
     ) THEN
    RAISE EXCEPTION 'forbidden: cannot set current_organization_id to an organization you do not belong to';
  END IF;

  RETURN NEW;
END;
$function$;
