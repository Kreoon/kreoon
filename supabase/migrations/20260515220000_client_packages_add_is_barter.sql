-- Marca paquetes de canje (valor $0 por intercambio, no por error o prueba)
ALTER TABLE public.client_packages
ADD COLUMN IF NOT EXISTS is_barter BOOLEAN NOT NULL DEFAULT false;

-- Los paquetes existentes con total_value = 0 se asumen canje
UPDATE public.client_packages
SET is_barter = true
WHERE total_value = 0 OR total_value IS NULL;

CREATE INDEX IF NOT EXISTS idx_client_packages_is_barter
  ON public.client_packages(is_barter)
  WHERE is_barter = true;

COMMENT ON COLUMN public.client_packages.is_barter IS
  'Paquete de canje: no genera ingreso monetario. Se excluye de KPIs financieros y se muestra en sección separada.';
