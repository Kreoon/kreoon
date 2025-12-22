-- Create currency enum
CREATE TYPE public.currency_type AS ENUM ('COP', 'USD');

-- Create exchange_rates table for manual rate management
CREATE TABLE public.exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency currency_type NOT NULL,
  to_currency currency_type NOT NULL,
  rate numeric NOT NULL,
  set_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  CONSTRAINT unique_active_rate UNIQUE (from_currency, to_currency, is_active)
);

-- Create currency_transfers table for transfers between accounts
CREATE TABLE public.currency_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency currency_type NOT NULL,
  to_currency currency_type NOT NULL,
  from_amount numeric NOT NULL,
  to_amount numeric NOT NULL,
  exchange_rate numeric NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create currency_balances table to track balance per currency
CREATE TABLE public.currency_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency currency_type NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert initial balances
INSERT INTO public.currency_balances (currency, balance) VALUES ('COP', 0), ('USD', 0);

-- Add currency columns to content table
ALTER TABLE public.content 
ADD COLUMN creator_payment_currency currency_type NOT NULL DEFAULT 'COP',
ADD COLUMN editor_payment_currency currency_type NOT NULL DEFAULT 'COP';

-- Add currency columns to payments table
ALTER TABLE public.payments 
ADD COLUMN currency currency_type NOT NULL DEFAULT 'COP';

-- Add currency columns to client_packages table
ALTER TABLE public.client_packages 
ADD COLUMN currency currency_type NOT NULL DEFAULT 'COP';

-- Add currency columns to referral_commissions table
ALTER TABLE public.referral_commissions 
ADD COLUMN currency currency_type NOT NULL DEFAULT 'COP';

-- Enable RLS on new tables
ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.currency_balances ENABLE ROW LEVEL SECURITY;

-- RLS policies for exchange_rates
CREATE POLICY "Admins can manage exchange rates"
ON public.exchange_rates FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view exchange rates"
ON public.exchange_rates FOR SELECT
USING (true);

-- RLS policies for currency_transfers
CREATE POLICY "Admins can manage currency transfers"
ON public.currency_transfers FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view currency transfers"
ON public.currency_transfers FOR SELECT
USING (true);

-- RLS policies for currency_balances
CREATE POLICY "Admins can manage currency balances"
ON public.currency_balances FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view currency balances"
ON public.currency_balances FOR SELECT
USING (true);

-- Insert initial exchange rate (example: 1 USD = 4200 COP)
INSERT INTO public.exchange_rates (from_currency, to_currency, rate, is_active)
VALUES ('USD', 'COP', 4200, true);

INSERT INTO public.exchange_rates (from_currency, to_currency, rate, is_active)
VALUES ('COP', 'USD', 0.000238, true);

-- Function to get current exchange rate
CREATE OR REPLACE FUNCTION public.get_exchange_rate(_from currency_type, _to currency_type)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rate FROM public.exchange_rates 
  WHERE from_currency = _from 
    AND to_currency = _to 
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Function to perform currency transfer
CREATE OR REPLACE FUNCTION public.transfer_currency(
  _from_currency currency_type,
  _to_currency currency_type,
  _from_amount numeric,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rate numeric;
  _to_amount numeric;
  _transfer_id uuid;
BEGIN
  -- Get current exchange rate
  SELECT rate INTO _rate FROM public.exchange_rates 
  WHERE from_currency = _from_currency 
    AND to_currency = _to_currency 
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF _rate IS NULL THEN
    RAISE EXCEPTION 'No exchange rate found for % to %', _from_currency, _to_currency;
  END IF;
  
  _to_amount := _from_amount * _rate;
  
  -- Update balances
  UPDATE public.currency_balances 
  SET balance = balance - _from_amount, updated_at = now(), updated_by = auth.uid()
  WHERE currency = _from_currency;
  
  UPDATE public.currency_balances 
  SET balance = balance + _to_amount, updated_at = now(), updated_by = auth.uid()
  WHERE currency = _to_currency;
  
  -- Record the transfer
  INSERT INTO public.currency_transfers (from_currency, to_currency, from_amount, to_amount, exchange_rate, notes, created_by)
  VALUES (_from_currency, _to_currency, _from_amount, _to_amount, _rate, _notes, auth.uid())
  RETURNING id INTO _transfer_id;
  
  RETURN _transfer_id;
END;
$$;