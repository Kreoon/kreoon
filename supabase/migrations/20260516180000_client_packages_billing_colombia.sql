-- Campos de facturación y tributación para Colombia
-- IVA 19%, retención en la fuente 4% (servicios) u 11% (honorarios)
-- Nota: subtotal, iva_amount y retention_amount se calculan vía trigger
-- (GENERATED ALWAYS AS STORED requiere expresiones estrictamente inmutables en Postgres 15)

-- ============================================================
-- 1. Nuevas columnas en client_packages
-- ============================================================
ALTER TABLE public.client_packages
  ADD COLUMN IF NOT EXISTS iva_rate numeric(5,2) NOT NULL DEFAULT 0
    CHECK (iva_rate BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS subtotal numeric(12,2),
  ADD COLUMN IF NOT EXISTS iva_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS retention_rate numeric(5,2) NOT NULL DEFAULT 0
    CHECK (retention_rate BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS retention_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'cuenta_cobro'
    CHECK (invoice_type IN ('factura_electronica','cuenta_cobro','exterior')),
  ADD COLUMN IF NOT EXISTS dian_cufe text,
  ADD COLUMN IF NOT EXISTS barter_market_value numeric(12,2);

COMMENT ON COLUMN public.client_packages.iva_rate IS
  'Tasa IVA % (default 0 — usar 19 para servicios gravados en Colombia)';
COMMENT ON COLUMN public.client_packages.subtotal IS
  'Valor antes de IVA = ROUND(total_value / (1 + iva_rate/100), 2). Calculado por trigger.';
COMMENT ON COLUMN public.client_packages.iva_amount IS
  'Valor del IVA = total_value - subtotal. Calculado por trigger.';
COMMENT ON COLUMN public.client_packages.retention_rate IS
  'Retención en la fuente % (4 = servicios, 11 = honorarios)';
COMMENT ON COLUMN public.client_packages.retention_amount IS
  'Valor retenido = ROUND(subtotal * retention_rate / 100, 2). Calculado por trigger.';
COMMENT ON COLUMN public.client_packages.invoice_type IS
  'Tipo de documento: factura_electronica (obligados DIAN), cuenta_cobro (régimen simplificado), exterior (exportación de servicios).';
COMMENT ON COLUMN public.client_packages.dian_cufe IS
  'Código Único de Factura Electrónica emitido por el proveedor DIAN. Nulo para cuenta_cobro y exterior.';
COMMENT ON COLUMN public.client_packages.barter_market_value IS
  'Para canjes (is_barter = true): valor de mercado estimado del servicio recibido a cambio.';

-- ============================================================
-- 2. Trigger: recalcular campos tributarios al insertar/actualizar
-- ============================================================
CREATE OR REPLACE FUNCTION public.calc_package_tax_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_divisor numeric;
BEGIN
  -- Divisor para extraer el subtotal del total_value (precio con IVA incluido)
  v_divisor := 1 + COALESCE(NEW.iva_rate, 0) / 100.0;

  IF v_divisor = 0 THEN
    v_divisor := 1;  -- protección ante iva_rate = -100 (no debería ocurrir por CHECK)
  END IF;

  NEW.subtotal          := ROUND(COALESCE(NEW.total_value, 0) / v_divisor, 2);
  NEW.iva_amount        := ROUND(COALESCE(NEW.total_value, 0) - NEW.subtotal, 2);
  NEW.retention_amount  := ROUND(NEW.subtotal * COALESCE(NEW.retention_rate, 0) / 100.0, 2);

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_calc_package_tax_fields
  BEFORE INSERT OR UPDATE OF total_value, iva_rate, retention_rate
  ON public.client_packages
  FOR EACH ROW EXECUTE FUNCTION public.calc_package_tax_fields();

-- ============================================================
-- 3. Backfill: recalcular registros existentes
-- ============================================================
UPDATE public.client_packages
SET updated_at = now()
WHERE id IS NOT NULL;
-- El trigger BEFORE UPDATE recalculará subtotal/iva_amount/retention_amount para todos los registros existentes.

COMMENT ON FUNCTION public.calc_package_tax_fields() IS
  'Recalcula subtotal, iva_amount y retention_amount en client_packages a partir de total_value, iva_rate y retention_rate.
   Se dispara en INSERT y UPDATE de los tres campos fuente.';
