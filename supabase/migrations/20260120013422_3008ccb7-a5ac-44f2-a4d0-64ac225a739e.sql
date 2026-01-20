-- Agregar campos de configuración de campaña para traffickers
ALTER TABLE public.marketing_campaigns 
  ADD COLUMN IF NOT EXISTS budget_optimization TEXT DEFAULT 'cbo', -- cbo o abo
  ADD COLUMN IF NOT EXISTS daily_budget NUMERIC DEFAULT 0, -- Presupuesto diario
  ADD COLUMN IF NOT EXISTS lifetime_budget NUMERIC DEFAULT 0, -- Presupuesto total
  ADD COLUMN IF NOT EXISTS budget_per_adset NUMERIC DEFAULT 0, -- Presupuesto por conjunto (para CBO)
  ADD COLUMN IF NOT EXISTS bid_strategy TEXT, -- Estrategia de puja (lowest_cost, cost_cap, bid_cap)
  ADD COLUMN IF NOT EXISTS bid_amount NUMERIC DEFAULT 0, -- Monto de puja
  ADD COLUMN IF NOT EXISTS optimization_goal TEXT, -- Objetivo de optimización
  ADD COLUMN IF NOT EXISTS attribution_window TEXT, -- Ventana de atribución (7d_click, 1d_view, etc)
  ADD COLUMN IF NOT EXISTS audience_type TEXT, -- Tipo de audiencia (broad, custom, lookalike)
  ADD COLUMN IF NOT EXISTS audience_details JSONB DEFAULT '{}'::jsonb, -- Detalles de audiencia
  ADD COLUMN IF NOT EXISTS placements JSONB DEFAULT '[]'::jsonb, -- Ubicaciones (feed, stories, reels, etc)
  ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'continuous', -- continuous o scheduled
  ADD COLUMN IF NOT EXISTS ad_schedule JSONB DEFAULT '[]'::jsonb, -- Horarios específicos
  ADD COLUMN IF NOT EXISTS pixel_id TEXT, -- ID del Pixel
  ADD COLUMN IF NOT EXISTS conversion_event TEXT, -- Evento de conversión a optimizar
  ADD COLUMN IF NOT EXISTS trafficker_notes TEXT; -- Notas adicionales del trafficker

COMMENT ON COLUMN public.marketing_campaigns.budget_optimization IS 'Tipo de optimización: cbo (Campaign Budget Optimization) o abo (Ad Set Budget Optimization)';
COMMENT ON COLUMN public.marketing_campaigns.bid_strategy IS 'Estrategia de puja: lowest_cost, cost_cap, bid_cap, target_cost';
COMMENT ON COLUMN public.marketing_campaigns.optimization_goal IS 'Objetivo de optimización: conversions, landing_page_views, link_clicks, impressions, reach';