-- ============================================================================
-- KREOON — Archivar / restaurar empresas (soft delete) + impacto de borrado
-- ============================================================================
--
-- Hoy el único borrado de una empresa (`clients`, las marcas/clientes de la
-- agencia) vive escondido en el panel Root (admin-users, caso delete_client)
-- y es un borrado FÍSICO e irreversible. El admin de organización necesita
-- poder "eliminar" una empresa desde la página de Clientes sin jugarse los
-- datos por accidente: se archiva por defecto (deleted_at/deleted_by) y el
-- borrado definitivo queda como segunda opción explícita, reservada a root
-- (ver fix aparte en supabase/functions/admin-users/index.ts, caso
-- delete_client, en el mismo commit que esta migración).
--
-- Tres RPC para el frontend:
--   - admin_archive_client:        soft delete. Admin de la organización
--     dueña del cliente.
--   - admin_restore_client:        revierte el archivado. Mismo permiso.
--   - get_client_deletion_impact:  cuenta cuánto se pierde, para el diálogo
--     de confirmación (tanto al archivar como en la ruta de borrado físico
--     de root). Mismo permiso.
--
-- Las tres son SECURITY DEFINER: la RLS de `clients` solo deja pasar a
-- miembros de la organización dueña o al usuario de portal de ESE cliente
-- (ver 20260812080000_fix_clients_is_public_leak.sql), y aquí además hace
-- falta filtrar específicamente por rol admin, cosa que ninguna policy hace
-- hoy sobre esta tabla.
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.admin_archive_client(uuid);
--   DROP FUNCTION IF EXISTS public.admin_restore_client(uuid);
--   DROP FUNCTION IF EXISTS public.get_client_deletion_impact(uuid);
-- ============================================================================

-- Defensivo: `clients.deleted_at/deleted_by` deberían existir ya en
-- producción (nadie los usa todavía). ADD COLUMN IF NOT EXISTS es no-op si
-- ya están — protege este archivo si algún entorno quedó desalineado.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clients_deleted_at
  ON public.clients(deleted_at) WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────────────────────
-- 1. admin_archive_client — soft delete
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_archive_client(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT c.organization_id INTO v_org_id FROM public.clients c WHERE c.id = p_client_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_org_id
      AND om.user_id = auth.uid()
      AND om.role::text = 'admin'
      -- Un admin dado de baja no puede seguir archivando empresas.
      AND om.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Idempotente: si ya estaba archivado no se vuelve a tocar, para no
  -- pisar el deleted_by/deleted_at de quien lo archivó la primera vez.
  UPDATE public.clients
  SET deleted_at = now(), deleted_by = auth.uid()
  WHERE id = p_client_id AND deleted_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_archive_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_archive_client(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_archive_client(uuid) IS
  'Soft-delete de una empresa (clients.deleted_at/deleted_by). Solo el admin de la organización dueña. Idempotente.';

-- ─────────────────────────────────────────────────────────────
-- 2. admin_restore_client — revierte el archivado
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_restore_client(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT c.organization_id INTO v_org_id FROM public.clients c WHERE c.id = p_client_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_org_id
      AND om.user_id = auth.uid()
      AND om.role::text = 'admin'
      -- Un admin dado de baja no puede seguir archivando empresas.
      AND om.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Ya de por sí idempotente: restaurar algo que no estaba archivado solo
  -- vuelve a poner NULL en columnas que ya eran NULL.
  UPDATE public.clients
  SET deleted_at = NULL, deleted_by = NULL
  WHERE id = p_client_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_restore_client(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_restore_client(uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_restore_client(uuid) IS
  'Revierte el archivado de una empresa. Solo el admin de la organización dueña. Idempotente.';

-- ─────────────────────────────────────────────────────────────
-- 3. get_client_deletion_impact — qué se pierde, para el diálogo
-- ─────────────────────────────────────────────────────────────
-- "pagos" se cuenta vía client_package_payments (cuelga de client_packages,
-- que sí tiene FK real client_id → clients ON DELETE CASCADE) y NO vía
-- organization_client_payments: esa tabla tiene una columna llamada
-- client_id pero referencia auth.users(id), no clients(id) — es la tabla de
-- pagos del módulo de campaigns (ya retirado, ver
-- 20260812010000_drop_campaigns_module.sql), no pagos de una empresa/marca.
-- Usarla aquí habría devuelto cero pagos siempre, dando una falsa sensación
-- de seguridad en el diálogo de confirmación.
CREATE OR REPLACE FUNCTION public.get_client_deletion_impact(p_client_id uuid)
RETURNS TABLE (
  contenidos      bigint,
  productos       bigint,
  paquetes        bigint,
  pagos           bigint,
  usuarios_portal bigint,
  runs_pipeline   bigint,
  documentos      bigint,
  licencias       bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT c.organization_id INTO v_org_id FROM public.clients c WHERE c.id = p_client_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Cliente no encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = v_org_id
      AND om.user_id = auth.uid()
      AND om.role::text = 'admin'
      -- Un admin dado de baja no puede seguir archivando empresas.
      AND om.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM public.content WHERE client_id = p_client_id),
    (SELECT count(*) FROM public.products WHERE client_id = p_client_id),
    (SELECT count(*) FROM public.client_packages WHERE client_id = p_client_id),
    (SELECT count(*)
       FROM public.client_package_payments cpp
       JOIN public.client_packages cp ON cp.id = cpp.client_package_id
       WHERE cp.client_id = p_client_id),
    (SELECT count(*) FROM public.client_users WHERE client_id = p_client_id),
    (SELECT count(*) FROM public.client_pipeline_runs WHERE client_id = p_client_id),
    (SELECT count(*) FROM public.client_documents WHERE client_id = p_client_id),
    (SELECT count(*) FROM public.content_licenses WHERE client_id = p_client_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_client_deletion_impact(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_deletion_impact(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_client_deletion_impact(uuid) IS
  'Conteo de lo que se pierde al eliminar una empresa (archivar o borrado definitivo), para el diálogo de confirmación. Solo el admin de la organización dueña.';

NOTIFY pgrst, 'reload schema';
