-- Gastos fijos y recurrentes de operación (OPEX)
-- Alimenta el forecast de flujo de caja como outflows esperados

CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'other'
    CHECK (category IN ('software','salary','office','tools','marketing','services','taxes','other')),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','USD','EUR','MXN')),
  frequency text NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('weekly','monthly','quarterly','yearly')),
  next_due_date date,
  payment_method text,
  vendor text,
  is_active boolean NOT NULL DEFAULT true,
  auto_renew boolean NOT NULL DEFAULT true,
  start_date date,
  end_date date,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_org
  ON public.recurring_expenses(organization_id, is_active);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_due
  ON public.recurring_expenses(next_due_date)
  WHERE is_active = true;

CREATE OR REPLACE TRIGGER set_updated_at_recurring_expenses
  BEFORE UPDATE ON public.recurring_expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view expenses" ON public.recurring_expenses FOR SELECT
  USING (public.is_org_member(organization_id));

CREATE POLICY "org admins can manage expenses" ON public.recurring_expenses FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid()
      AND organization_id = recurring_expenses.organization_id
      AND role::text = 'admin'
  ));

COMMENT ON TABLE public.recurring_expenses IS
  'Gastos fijos y recurrentes (OPEX). Alimenta el forecast de flujo de caja como outflows proyectados.';

COMMENT ON COLUMN public.recurring_expenses.frequency IS
  'Frecuencia del gasto: weekly / monthly / quarterly / yearly.';

COMMENT ON COLUMN public.recurring_expenses.next_due_date IS
  'Próxima fecha de vencimiento. Debe actualizarse después de cada pago según la frequency.';

COMMENT ON COLUMN public.recurring_expenses.auto_renew IS
  'Si el contrato/servicio se renueva automáticamente. Útil para alertar antes del corte.';
