-- Migration: Corregir permisos RLS para project_assignments
-- Solo admin/team_leader pueden crear, modificar y eliminar asignaciones
-- El usuario asignado puede actualizar su propio status

-- ============================================================================
-- DROP EXISTING POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "assignments_insert" ON public.project_assignments;
DROP POLICY IF EXISTS "assignments_update" ON public.project_assignments;
DROP POLICY IF EXISTS "assignments_update_admin" ON public.project_assignments;

-- ============================================================================
-- INSERT: Solo admin/team_leader pueden crear asignaciones
-- ============================================================================

CREATE POLICY "assignments_insert_admin" ON public.project_assignments
FOR INSERT WITH CHECK (
  -- Content projects: solo admin/team_leader de la org
  (content_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.content c
    JOIN public.clients cl ON cl.id = c.client_id
    JOIN public.organization_members om ON om.organization_id = cl.organization_id
    WHERE c.id = project_assignments.content_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader')
  ))
  OR
  -- Marketplace projects: brand admin o org admin
  (marketplace_project_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.marketplace_projects mp
      JOIN public.brands b ON b.id = mp.brand_id
      WHERE mp.id = project_assignments.marketplace_project_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.marketplace_projects mp
      JOIN public.organization_members om ON om.organization_id = mp.organization_id
      WHERE mp.id = project_assignments.marketplace_project_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  ))
);

-- ============================================================================
-- UPDATE: Admin puede modificar todo, usuario asignado solo su status
-- ============================================================================

-- Policy para admins: pueden modificar cualquier campo
CREATE POLICY "assignments_update_admin" ON public.project_assignments
FOR UPDATE USING (
  -- Content projects: admin/team_leader de la org
  (content_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.content c
    JOIN public.clients cl ON cl.id = c.client_id
    JOIN public.organization_members om ON om.organization_id = cl.organization_id
    WHERE c.id = project_assignments.content_id
      AND om.user_id = auth.uid()
      AND om.role IN ('admin', 'team_leader')
  ))
  OR
  -- Marketplace projects: brand admin o org admin
  (marketplace_project_id IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM public.marketplace_projects mp
      JOIN public.brands b ON b.id = mp.brand_id
      WHERE mp.id = project_assignments.marketplace_project_id
        AND b.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.marketplace_projects mp
      JOIN public.organization_members om ON om.organization_id = mp.organization_id
      WHERE mp.id = project_assignments.marketplace_project_id
        AND om.user_id = auth.uid()
        AND om.role IN ('admin', 'team_leader')
    )
  ))
);

-- Policy para usuario asignado: solo puede cambiar status (avanzar su trabajo)
CREATE POLICY "assignments_update_own_status" ON public.project_assignments
FOR UPDATE USING (
  auth.uid() = user_id
)
WITH CHECK (
  auth.uid() = user_id
  -- Solo puede cambiar estos campos (el resto debe mantenerse igual)
  -- Esto se valida a nivel de aplicacion, RLS no puede verificar campos individuales
);

-- ============================================================================
-- COMENTARIO: SELECT y DELETE mantienen las policies existentes
-- SELECT: miembros de org pueden ver
-- DELETE: solo admin/team_leader (ya existente)
-- ============================================================================
