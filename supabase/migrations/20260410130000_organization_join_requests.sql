-- ============================================================================
-- Tabla de solicitudes de ingreso a organizaciones
-- ============================================================================
-- Permite que usuarios soliciten unirse a una organizacion y queden en espera
-- de aprobacion por parte de un admin/owner de la organizacion.

CREATE TABLE IF NOT EXISTS public.organization_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tipo de solicitud
  requested_role TEXT NOT NULL DEFAULT 'creator' CHECK (requested_role IN ('creator', 'editor', 'client', 'strategist', 'trafficker')),

  -- Estado de la solicitud
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

  -- Metadata
  source TEXT, -- ej: 'ugccolombia.co', 'direct', 'invitation'
  message TEXT, -- mensaje opcional del solicitante

  -- Respuesta del admin
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un usuario solo puede tener una solicitud pendiente por organizacion
  UNIQUE(organization_id, user_id, status)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_org_join_requests_org ON organization_join_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_join_requests_user ON organization_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_org_join_requests_status ON organization_join_requests(status) WHERE status = 'pending';

-- RLS
ALTER TABLE organization_join_requests ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver sus propias solicitudes
CREATE POLICY "Users can view own requests"
ON organization_join_requests FOR SELECT
USING (user_id = auth.uid());

-- Admins/owners pueden ver solicitudes de su organizacion
CREATE POLICY "Org admins can view requests"
ON organization_join_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organization_member_roles omr ON omr.organization_id = om.organization_id AND omr.user_id = om.user_id
    WHERE om.organization_id = organization_join_requests.organization_id
    AND om.user_id = auth.uid()
    AND (om.is_owner = true OR omr.role = 'admin')
  )
);

-- Admins/owners pueden actualizar solicitudes
CREATE POLICY "Org admins can update requests"
ON organization_join_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    JOIN organization_member_roles omr ON omr.organization_id = om.organization_id AND omr.user_id = om.user_id
    WHERE om.organization_id = organization_join_requests.organization_id
    AND om.user_id = auth.uid()
    AND (om.is_owner = true OR omr.role = 'admin')
  )
);

-- Service role puede todo
CREATE POLICY "Service role full access"
ON organization_join_requests FOR ALL
USING (auth.role() = 'service_role');

-- Grants
GRANT SELECT ON organization_join_requests TO authenticated;
GRANT ALL ON organization_join_requests TO service_role;

-- Funcion para aprobar solicitud (crea el miembro automaticamente)
CREATE OR REPLACE FUNCTION approve_join_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Obtener solicitud
  SELECT * INTO v_request FROM organization_join_requests WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Crear miembro
  INSERT INTO organization_members (organization_id, user_id, is_owner, invited_by)
  VALUES (v_request.organization_id, v_request.user_id, false, auth.uid())
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  -- Asignar rol
  INSERT INTO organization_member_roles (organization_id, user_id, role)
  VALUES (v_request.organization_id, v_request.user_id, v_request.requested_role)
  ON CONFLICT (organization_id, user_id, role) DO NOTHING;

  -- Actualizar solicitud
  UPDATE organization_join_requests
  SET status = 'approved', reviewed_by = auth.uid(), reviewed_at = NOW(), updated_at = NOW()
  WHERE id = request_id;

  RETURN TRUE;
END;
$$;

COMMENT ON TABLE organization_join_requests IS 'Solicitudes de usuarios para unirse a organizaciones, pendientes de aprobacion';
