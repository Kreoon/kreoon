-- Add marketing services fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS strategy_service_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS traffic_service_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS strategy_service_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS traffic_service_started_at TIMESTAMP WITH TIME ZONE;

-- Add index for quick filtering
CREATE INDEX IF NOT EXISTS idx_clients_strategy_service ON public.clients(strategy_service_enabled) WHERE strategy_service_enabled = true;
CREATE INDEX IF NOT EXISTS idx_clients_traffic_service ON public.clients(traffic_service_enabled) WHERE traffic_service_enabled = true;

COMMENT ON COLUMN public.clients.strategy_service_enabled IS 'Whether strategy service is enabled for this client';
COMMENT ON COLUMN public.clients.traffic_service_enabled IS 'Whether traffic/ads management service is enabled for this client';