-- Add display_currency to profiles (Airbnb model: store USD, display in user's local currency)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_currency TEXT DEFAULT 'USD';

-- Set COP for existing Colombian users
UPDATE profiles SET display_currency = 'COP' WHERE country = 'CO' AND (display_currency IS NULL OR display_currency = 'USD');
-- Set MXN for existing Mexican users
UPDATE profiles SET display_currency = 'MXN' WHERE country = 'MX' AND (display_currency IS NULL OR display_currency = 'USD');
-- Set PEN for existing Peruvian users
UPDATE profiles SET display_currency = 'PEN' WHERE country = 'PE' AND (display_currency IS NULL OR display_currency = 'USD');
-- Set CLP for existing Chilean users
UPDATE profiles SET display_currency = 'CLP' WHERE country = 'CL' AND (display_currency IS NULL OR display_currency = 'USD');
-- Set ARS for existing Argentine users
UPDATE profiles SET display_currency = 'ARS' WHERE country = 'AR' AND (display_currency IS NULL OR display_currency = 'USD');
-- Set BRL for existing Brazilian users
UPDATE profiles SET display_currency = 'BRL' WHERE country = 'BR' AND (display_currency IS NULL OR display_currency = 'USD');
-- Set EUR for existing European users
UPDATE profiles SET display_currency = 'EUR' WHERE country IN ('ES', 'DE', 'FR') AND (display_currency IS NULL OR display_currency = 'USD');

-- Convert existing COP campaigns to USD using current exchange rate
DO $$
DECLARE
  cop_rate NUMERIC;
BEGIN
  SELECT rate INTO cop_rate
  FROM exchange_rates
  WHERE from_currency = 'USD' AND to_currency = 'COP' AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF cop_rate IS NOT NULL AND cop_rate > 0 THEN
    UPDATE marketplace_campaigns
    SET total_budget = ROUND(total_budget / cop_rate, 2),
        budget_per_video = CASE WHEN budget_per_video IS NOT NULL
          THEN ROUND(budget_per_video / cop_rate, 2)
          ELSE NULL END,
        min_bid = CASE WHEN min_bid IS NOT NULL
          THEN ROUND(min_bid / cop_rate, 2)
          ELSE NULL END,
        max_bid = CASE WHEN max_bid IS NOT NULL
          THEN ROUND(max_bid / cop_rate, 2)
          ELSE NULL END,
        exchange_product_value = CASE WHEN exchange_product_value IS NOT NULL
          THEN ROUND(exchange_product_value / cop_rate, 2)
          ELSE NULL END,
        currency = 'USD'
    WHERE currency = 'COP';
  END IF;
END $$;
