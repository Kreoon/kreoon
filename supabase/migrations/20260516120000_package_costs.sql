-- Costos directos por paquete (talento, edición, muestras, etc.)
-- Permite calcular margen real: paid_amount - SUM(package_costs)

CREATE TABLE IF NOT EXISTS public.package_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  package_id uuid NOT NULL REFERENCES public.client_packages(id) ON DELETE CASCADE,
  cost_type text NOT NULL DEFAULT 'creator_payout'
    CHECK (cost_type IN ('creator_payout','editing','tools','product_sample','adspend','travel','platform_fee','other')),
  creator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','USD','EUR','MXN')),
  paid_date date,
  status text NOT NULL DEFAULT 'committed'
    CHECK (status IN ('committed','paid','cancelled')),
  linked_content_id uuid,  -- FK flexible hacia content
  invoice_url text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_package_costs_package ON public.package_costs(package_id);
CREATE INDEX IF NOT EXISTS idx_package_costs_org ON public.package_costs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_package_costs_creator ON public.package_costs(creator_id) WHERE creator_id IS NOT NULL;

ALTER TABLE public.package_costs ENABLE ROW LEVEL SECURITY;

-- Cualquier miembro de la org puede ver los costos
CREATE POLICY "org members can view costs"
  ON public.package_costs FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
  ));

-- Solo admins y digital_strategists pueden gestionar costos
CREATE POLICY "org admins can manage costs"
  ON public.package_costs FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members
    WHERE user_id = auth.uid() AND role IN ('admin','digital_strategist')
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.package_costs;

COMMENT ON TABLE public.package_costs IS
  'Costos directos por paquete. margen_bruto = client_packages.paid_amount - SUM(package_costs WHERE status != cancelled)';
