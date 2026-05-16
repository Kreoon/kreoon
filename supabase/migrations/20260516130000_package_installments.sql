-- Calendario de cuotas por paquete
-- Reemplaza el campo único payment_due_date como fuente de verdad para aging y forecast
-- Cada paquete puede tener N cuotas con fechas y montos específicos

CREATE TABLE IF NOT EXISTS public.package_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  installment_number int NOT NULL CHECK (installment_number > 0),
  total_installments int NOT NULL CHECK (total_installments > 0),
  due_date date NOT NULL,
  expected_amount numeric(12,2) NOT NULL CHECK (expected_amount > 0),
  currency text NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','USD','EUR','MXN')),
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','invoiced','paid','overdue','renegotiated')),
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  paid_date date,
  paid_via_payment_id uuid,  -- FK lazy hacia client_package_payments (tabla puede crearse después)
  reminder_sent_at timestamptz,
  reminder_count int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (package_id, installment_number)
);

-- Índices para queries de aging y forecast
CREATE INDEX IF NOT EXISTS idx_installments_package
  ON public.package_installments(package_id);

CREATE INDEX IF NOT EXISTS idx_installments_org_due
  ON public.package_installments(organization_id, due_date);

CREATE INDEX IF NOT EXISTS idx_installments_status
  ON public.package_installments(status)
  WHERE status IN ('scheduled','overdue','invoiced');

-- Trigger updated_at
CREATE OR REPLACE TRIGGER set_updated_at_package_installments
  BEFORE UPDATE ON public.package_installments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.package_installments ENABLE ROW LEVEL SECURITY;

-- Todos los miembros de la org pueden ver las cuotas de su organización
CREATE POLICY "org members can view installments"
  ON public.package_installments
  FOR SELECT
  USING (public.is_org_member(organization_id));

-- Solo admin y digital_strategist pueden insertar cuotas
CREATE POLICY "org admins can insert installments"
  ON public.package_installments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = package_installments.organization_id
        AND role::text IN ('admin', 'digital_strategist')
    )
  );

-- Solo admin y digital_strategist pueden actualizar cuotas
CREATE POLICY "org admins can update installments"
  ON public.package_installments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = package_installments.organization_id
        AND role::text IN ('admin', 'digital_strategist')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = package_installments.organization_id
        AND role::text IN ('admin', 'digital_strategist')
    )
  );

-- Solo admin puede eliminar cuotas
CREATE POLICY "org admins can delete installments"
  ON public.package_installments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = package_installments.organization_id
        AND role::text = 'admin'
    )
  );

-- ============================================================
-- Función: auto-marcar cuotas vencidas
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_overdue_installments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.package_installments
  SET
    status     = 'overdue',
    updated_at = now()
  WHERE status = 'scheduled'
    AND due_date < CURRENT_DATE
    AND paid_amount < expected_amount;
END;
$$;

-- ============================================================
-- Realtime
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.package_installments;

-- ============================================================
-- Comentarios
-- ============================================================
COMMENT ON TABLE public.package_installments IS
  'Cuotas de pago por paquete. Fuente de verdad para aging de cartera y proyección de flujo de caja.';

COMMENT ON COLUMN public.package_installments.paid_via_payment_id IS
  'FK lazy hacia client_package_payments. Sin REFERENCES explícita para permitir creación independiente de ambas tablas.';

COMMENT ON COLUMN public.package_installments.organization_id IS
  'Desnormalización de client_packages→clients→organization_id para performance en RLS y queries de forecast.';

COMMENT ON FUNCTION public.update_overdue_installments() IS
  'Marca como overdue las cuotas scheduled cuyo due_date ya pasó y no están pagadas. Invocar vía pg_cron o Edge Function diaria.';
