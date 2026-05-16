-- Fecha límite de pago por paquete
-- Solo relevante cuando payment_status != 'paid'. Si está pagado al 100% se ignora.

ALTER TABLE public.client_packages
ADD COLUMN IF NOT EXISTS payment_due_date DATE;

COMMENT ON COLUMN public.client_packages.payment_due_date IS
  'Fecha límite de pago. Solo relevante cuando payment_status != paid. Si está pagado al 100% se ignora.';
