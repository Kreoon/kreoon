-- Align Live Streaming tables with frontend expectations

-- 1) live_packages: add validity_days
ALTER TABLE public.live_packages
ADD COLUMN IF NOT EXISTS validity_days integer NOT NULL DEFAULT 30;

-- 2) live_hour_assignments: add missing tracking columns
ALTER TABLE public.live_hour_assignments
ADD COLUMN IF NOT EXISTS wallet_id uuid NULL,
ADD COLUMN IF NOT EXISTS hours_remaining numeric NULL,
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS assigned_at timestamp with time zone NOT NULL DEFAULT now();

-- Backfill for existing rows
UPDATE public.live_hour_assignments
SET
  assigned_at = COALESCE(assigned_at, created_at, now()),
  hours_remaining = COALESCE(hours_remaining, hours_assigned)
WHERE assigned_at IS NULL OR hours_remaining IS NULL;

-- Optional FK (safe if wallets exist); keep nullable to avoid blocking existing data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema='public'
      AND tc.table_name='live_hour_assignments'
      AND tc.constraint_type='FOREIGN KEY'
      AND tc.constraint_name='live_hour_assignments_wallet_id_fkey'
  ) THEN
    ALTER TABLE public.live_hour_assignments
    ADD CONSTRAINT live_hour_assignments_wallet_id_fkey
    FOREIGN KEY (wallet_id)
    REFERENCES public.live_hour_wallets(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_live_packages_org ON public.live_packages(organization_id);
CREATE INDEX IF NOT EXISTS idx_live_assignments_org_client ON public.live_hour_assignments(organization_id, client_id);
CREATE INDEX IF NOT EXISTS idx_live_assignments_wallet ON public.live_hour_assignments(wallet_id);
