-- Paquetes por canje: no generan cobro
ALTER TABLE public.client_packages
ADD COLUMN IF NOT EXISTS is_barter boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.client_packages.is_barter IS 'Paquete por canje: no genera cobro. Se marca como pagado automáticamente.';
