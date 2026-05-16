-- Asignaciones de creadores/editores a paquetes con monto acordado
-- Permite calcular rentabilidad proyectada antes de producir
-- y rastrear el estado de pago a cada creador

CREATE TABLE IF NOT EXISTS public.creator_package_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_package_id uuid NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('content_creator','editor','digital_strategist','creative_strategist')),
  agreed_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (agreed_amount >= 0),
  currency text NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','USD','EUR','MXN')),
  payment_status text NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending','processing','paid','cancelled')),
  paid_at timestamptz,
  paid_via_talent_payment_id uuid,  -- FK lazy → talent_payments
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_package_id, user_id, role)
);

CREATE INDEX idx_cpa_package ON public.creator_package_assignments(client_package_id);
CREATE INDEX idx_cpa_org ON public.creator_package_assignments(organization_id);
CREATE INDEX idx_cpa_user ON public.creator_package_assignments(user_id, payment_status);

CREATE OR REPLACE TRIGGER set_updated_at_creator_package_assignments
  BEFORE UPDATE ON public.creator_package_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.creator_package_assignments ENABLE ROW LEVEL SECURITY;

-- Admin y digital_strategist ven todas las asignaciones de la org
CREATE POLICY "admins can view all assignments"
  ON public.creator_package_assignments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role::text IN ('admin','digital_strategist')
    )
  );

-- Creadores solo ven sus propias asignaciones (monto incluido)
CREATE POLICY "creators can view own assignments"
  ON public.creator_package_assignments FOR SELECT
  USING (user_id = auth.uid());

-- Solo admin y digital_strategist pueden crear/modificar asignaciones
CREATE POLICY "admins can manage assignments"
  ON public.creator_package_assignments FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND role::text IN ('admin','digital_strategist')
    )
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.creator_package_assignments;

COMMENT ON TABLE public.creator_package_assignments IS
  'Creadores/editores asignados a paquetes con monto acordado. Base para calcular rentabilidad proyectada y nómina por proyecto.';
