-- Tabla de abonos/pagos por paquete
-- Reemplaza la actualización directa de client_packages.paid_amount
-- Cada pago queda auditado con fecha, método, referencia y quién lo registró

CREATE TABLE IF NOT EXISTS public.client_package_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_package_id uuid NOT NULL REFERENCES client_packages(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'COP' CHECK (currency IN ('COP','USD','EUR','MXN')),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'transferencia'
    CHECK (payment_method IN ('transferencia','nequi','daviplata','efectivo','paypal','wise','stripe','otro')),
  reference_number text,
  receipt_url text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- Índices
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_cpp_package
  ON public.client_package_payments(client_package_id);

CREATE INDEX IF NOT EXISTS idx_cpp_org_date
  ON public.client_package_payments(organization_id, payment_date DESC);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.client_package_payments ENABLE ROW LEVEL SECURITY;

-- Cualquier miembro de la org puede ver los pagos
CREATE POLICY "org members can view payments"
  ON public.client_package_payments FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );

-- Solo admin y digital_strategist pueden registrar pagos
CREATE POLICY "org admins can insert payments"
  ON public.client_package_payments FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('admin','digital_strategist')
    )
  );

-- Solo admin puede eliminar pagos (corrección de errores)
CREATE POLICY "org admins can delete payments"
  ON public.client_package_payments FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =====================================================
-- Trigger: recalcular paid_amount y payment_status
-- =====================================================
CREATE OR REPLACE FUNCTION public.recalculate_package_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_package_id uuid;
  v_total_value numeric;
  v_paid_sum   numeric;
  v_new_status text;
BEGIN
  v_package_id := COALESCE(NEW.client_package_id, OLD.client_package_id);

  SELECT total_value INTO v_total_value
  FROM client_packages WHERE id = v_package_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid_sum
  FROM client_package_payments
  WHERE client_package_id = v_package_id;

  v_new_status := CASE
    WHEN v_paid_sum <= 0             THEN 'pending'
    WHEN v_paid_sum >= v_total_value THEN 'paid'
    ELSE                                  'partial'
  END;

  UPDATE client_packages
  SET paid_amount    = v_paid_sum,
      payment_status = v_new_status,
      updated_at     = now()
  WHERE id = v_package_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_recalculate_package_payment
  AFTER INSERT OR DELETE ON public.client_package_payments
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_package_payment_status();

-- =====================================================
-- Realtime
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_package_payments;

-- =====================================================
-- Comentarios
-- =====================================================
COMMENT ON TABLE public.client_package_payments IS
  'Historial de abonos/pagos por paquete. El trigger recalcula paid_amount y payment_status en client_packages automáticamente.';

COMMENT ON COLUMN public.client_package_payments.amount IS
  'Valor del abono. Debe ser > 0 y estar en la misma moneda que client_packages.currency.';

COMMENT ON COLUMN public.client_package_payments.recorded_by IS
  'Usuario que registró el pago. Se mantiene aunque el usuario sea eliminado (SET NULL).';
