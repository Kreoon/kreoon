-- Add multi-currency support to UP system
-- Each organization can have UP (mandatory) + optional XP or Reputation

-- Add currency columns to up_settings
ALTER TABLE public.up_settings 
ADD COLUMN IF NOT EXISTS secondary_currency_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS secondary_currency_name text DEFAULT 'XP',
ADD COLUMN IF NOT EXISTS secondary_currency_icon text DEFAULT '⭐';

-- Add secondary currency to user_points
ALTER TABLE public.user_points
ADD COLUMN IF NOT EXISTS secondary_points integer DEFAULT 0;

-- Add secondary currency to up_rules
ALTER TABLE public.up_rules
ADD COLUMN IF NOT EXISTS secondary_points integer DEFAULT 0;

-- Add secondary currency to up_events
ALTER TABLE public.up_events
ADD COLUMN IF NOT EXISTS secondary_points_awarded integer DEFAULT 0;

-- Add secondary currency to up_quests rewards
ALTER TABLE public.up_quests
ADD COLUMN IF NOT EXISTS reward_secondary_points integer DEFAULT 0;

-- Add secondary currency to point_transactions
ALTER TABLE public.point_transactions
ADD COLUMN IF NOT EXISTS secondary_points integer DEFAULT 0;

-- Create table to track currency conversions/transfers between UP and secondary
CREATE TABLE IF NOT EXISTS public.up_currency_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  from_currency text NOT NULL CHECK (from_currency IN ('UP', 'secondary')),
  to_currency text NOT NULL CHECK (to_currency IN ('UP', 'secondary')),
  from_amount integer NOT NULL,
  to_amount integer NOT NULL,
  conversion_rate numeric(10,4) NOT NULL DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.up_currency_conversions ENABLE ROW LEVEL SECURITY;

-- RLS policies for currency conversions
CREATE POLICY "Users can view own conversions"
  ON public.up_currency_conversions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Org members can view org conversions"
  ON public.up_currency_conversions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = up_currency_conversions.organization_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own conversions"
  ON public.up_currency_conversions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_up_currency_conversions_org ON public.up_currency_conversions(organization_id);
CREATE INDEX IF NOT EXISTS idx_up_currency_conversions_user ON public.up_currency_conversions(user_id);