-- 1. Vincular contenido producido al paquete vendido
ALTER TABLE public.content
ADD COLUMN IF NOT EXISTS client_package_id uuid
  REFERENCES public.client_packages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_content_client_package
  ON public.content(client_package_id)
  WHERE client_package_id IS NOT NULL;

COMMENT ON COLUMN public.content.client_package_id IS
  'Paquete al que pertenece este contenido. NULL = contenido no vinculado a paquete específico (histórico).';

-- 2. Hitos de pago vinculados a entregas
CREATE TABLE IF NOT EXISTS public.package_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  milestone_type text NOT NULL DEFAULT 'custom'
    CHECK (milestone_type IN ('signing','content_approval','delivery','post_publication','custom')),
  name text NOT NULL,
  percentage numeric(5,2) CHECK (percentage BETWEEN 0 AND 100),
  amount_due numeric(12,2),
  currency text NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','USD','EUR','MXN')),
  trigger_condition text NOT NULL DEFAULT 'manual'
    CHECK (trigger_condition IN ('manual','on_content_approved','on_content_delivered','date_based')),
  trigger_date date,
  triggered_at timestamptz,
  payment_id uuid,  -- FK lazy → client_package_payments (sin REFERENCES para evitar orden de creación)
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','invoiced','paid','overdue','waived')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_milestones_package ON public.package_milestones(package_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON public.package_milestones(status) WHERE status != 'paid';

CREATE OR REPLACE TRIGGER set_updated_at_package_milestones
  BEFORE UPDATE ON public.package_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.package_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view milestones" ON public.package_milestones FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "org admins can manage milestones" ON public.package_milestones FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = package_milestones.organization_id
      AND role::text IN ('admin','digital_strategist')
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.package_milestones;

COMMENT ON TABLE public.package_milestones IS
  'Hitos de cobro por paquete (firma, aprobación, entrega). Permite vincular entrega de contenido con liberación de cobro.';

COMMENT ON COLUMN public.package_milestones.payment_id IS
  'FK lazy hacia client_package_payments.id. Sin REFERENCES explícita para desacoplar orden de creación de tablas.';

COMMENT ON COLUMN public.package_milestones.percentage IS
  'Porcentaje del total del paquete que representa este hito. Opcional si se especifica amount_due directamente.';
