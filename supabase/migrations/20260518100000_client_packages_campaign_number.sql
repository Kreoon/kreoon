-- Número único secuencial por campaña (no repetible, global a toda la plataforma)

-- 1. Secuencia global
CREATE SEQUENCE IF NOT EXISTS public.client_packages_campaign_number_seq
  START 1 INCREMENT 1 NO CYCLE;

-- 2. Columna con default automático desde la secuencia
ALTER TABLE public.client_packages
  ADD COLUMN IF NOT EXISTS campaign_number bigint UNIQUE;

-- 3. Backfill: asignar números a campañas existentes en orden de creación
UPDATE public.client_packages
SET campaign_number = sub.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM public.client_packages
  WHERE campaign_number IS NULL
) sub
WHERE public.client_packages.id = sub.id;

-- 4. Avanzar la secuencia al máximo existente para que el próximo INSERT siga desde ahí
SELECT setval(
  'public.client_packages_campaign_number_seq',
  COALESCE((SELECT MAX(campaign_number) FROM public.client_packages), 0)
);

-- 5. Default y NOT NULL para nuevos registros
ALTER TABLE public.client_packages
  ALTER COLUMN campaign_number SET DEFAULT nextval('public.client_packages_campaign_number_seq'),
  ALTER COLUMN campaign_number SET NOT NULL;

COMMENT ON COLUMN public.client_packages.campaign_number IS
  'Número único secuencial de campaña. Auto-asignado. No puede repetirse.';
