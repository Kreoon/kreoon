-- Add currency support to client_packages
-- Each package tracks its own currency (COP or USD)
-- KPIs must NEVER be summed across currencies

ALTER TABLE public.client_packages
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'COP'
  CHECK (currency IN ('COP', 'USD', 'EUR', 'MXN'));

-- Index for filtering by currency
CREATE INDEX IF NOT EXISTS idx_client_packages_currency
  ON public.client_packages(currency);

COMMENT ON COLUMN public.client_packages.currency IS
  'Currency of total_value and paid_amount. Never sum across different currencies.';
