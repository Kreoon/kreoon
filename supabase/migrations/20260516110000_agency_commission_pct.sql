-- Porcentaje de ingreso neto de la agencia sobre el paquete
-- 100 = agencia se queda todo (sin subcontratación)
-- 70 = agencia retiene 70%, 30% va a creadores/proveedores
ALTER TABLE public.client_packages
ADD COLUMN IF NOT EXISTS agency_commission_pct numeric(5,2) NOT NULL DEFAULT 100
  CHECK (agency_commission_pct BETWEEN 0 AND 100);

COMMENT ON COLUMN public.client_packages.agency_commission_pct IS
  'Porcentaje del total_value que es ingreso neto de la agencia. Base para calcular margen bruto.';
