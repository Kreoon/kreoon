-- =============================================
-- KREOON LIVE MODULE - ENHANCED SCHEMA (Fixed)
-- =============================================

-- 1. Platform Configuration Table (ROOT level - Restream credentials, scopes, global settings)
CREATE TABLE IF NOT EXISTS public.live_platform_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Restream OAuth App Credentials
  restream_client_id TEXT,
  restream_client_secret_encrypted TEXT,
  restream_scopes TEXT[] DEFAULT ARRAY['profile.read', 'channel.read', 'channel.write', 'stream.read', 'chat.read'],
  -- Default pricing
  default_price_per_hour NUMERIC DEFAULT 50,
  default_currency TEXT DEFAULT 'USD',
  -- Predefined packages (platform sells to orgs)
  hour_packages JSONB DEFAULT '[{"hours": 10, "price": 450, "name": "Starter"}, {"hours": 25, "price": 1000, "name": "Growth"}, {"hours": 50, "price": 1750, "name": "Pro"}, {"hours": 100, "price": 3000, "name": "Enterprise"}]'::jsonb,
  -- Feature flags
  chat_enabled BOOLEAN DEFAULT true,
  multi_creator_enabled BOOLEAN DEFAULT true,
  srt_streaming_enabled BOOLEAN DEFAULT false,
  live_shopping_enabled BOOLEAN DEFAULT true,
  -- Limits
  max_hours_per_event NUMERIC DEFAULT 8,
  max_simultaneous_events_per_org INTEGER DEFAULT 3,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure only one row exists
CREATE UNIQUE INDEX IF NOT EXISTS live_platform_config_singleton ON public.live_platform_config ((true));

-- Insert default config if not exists
INSERT INTO public.live_platform_config (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM public.live_platform_config);

-- 2. Organization OAuth Tokens (per org - Restream OAuth)
CREATE TABLE IF NOT EXISTS public.live_org_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'restream',
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  oauth_state TEXT,
  connected_at TIMESTAMPTZ,
  last_refresh_at TIMESTAMPTZ,
  error_message TEXT,
  status TEXT DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'expired', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id, provider)
);

-- 3. Enhanced Streaming Channels (connected platforms per org)
CREATE TABLE IF NOT EXISTS public.live_streaming_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  oauth_token_id UUID REFERENCES public.live_org_oauth_tokens(id) ON DELETE SET NULL,
  external_channel_id TEXT,
  platform TEXT NOT NULL,
  channel_name TEXT,
  channel_url TEXT,
  thumbnail_url TEXT,
  is_enabled BOOLEAN DEFAULT true,
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Add organization_id to streaming_events (uses owner_id currently)
ALTER TABLE public.streaming_events 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Update organization_id from owner_id where owner_type = 'organization'
UPDATE public.streaming_events 
SET organization_id = owner_id 
WHERE owner_type = 'organization' AND organization_id IS NULL;

-- 5. Enhanced Events with hour reservation
ALTER TABLE public.streaming_events 
ADD COLUMN IF NOT EXISTS estimated_duration_hours NUMERIC DEFAULT 1,
ADD COLUMN IF NOT EXISTS actual_duration_hours NUMERIC,
ADD COLUMN IF NOT EXISTS hours_reserved NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS hours_consumed NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS reservation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS external_event_id TEXT,
ADD COLUMN IF NOT EXISTS playback_url TEXT,
ADD COLUMN IF NOT EXISTS recording_url TEXT;

-- 6. Event Monitoring Data (realtime stats)
CREATE TABLE IF NOT EXISTS public.live_event_monitoring (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.streaming_events(id) ON DELETE CASCADE,
  current_viewers INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_unique_viewers INTEGER DEFAULT 0,
  bitrate_kbps INTEGER,
  fps NUMERIC,
  resolution TEXT,
  destination_statuses JSONB DEFAULT '[]'::jsonb,
  last_heartbeat_at TIMESTAMPTZ,
  stream_started_at TIMESTAMPTZ,
  stream_ended_at TIMESTAMPTZ,
  total_duration_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Enhanced Event Creators with more roles
ALTER TABLE public.live_event_creators
ADD COLUMN IF NOT EXISTS can_see_stream_key BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_manage_products BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS participation_minutes INTEGER DEFAULT 0;

-- 8. Streaming History/Logs enhanced
CREATE TABLE IF NOT EXISTS public.live_stream_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.streaming_events(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  avg_bitrate_kbps INTEGER,
  avg_fps NUMERIC,
  disconnection_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  avg_viewers NUMERIC DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  hours_billed NUMERIC DEFAULT 0,
  end_reason TEXT,
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Client Live Settings (per client restrictions)
CREATE TABLE IF NOT EXISTS public.live_client_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  can_create_events BOOLEAN DEFAULT false,
  can_view_events BOOLEAN DEFAULT true,
  can_connect_own_channels BOOLEAN DEFAULT false,
  max_hours_per_event NUMERIC,
  max_events_per_month INTEGER,
  internal_price_per_hour NUMERIC,
  internal_currency TEXT DEFAULT 'USD',
  default_event_type TEXT DEFAULT 'informative',
  require_approval BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id)
);

-- Enable RLS
ALTER TABLE public.live_platform_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_org_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streaming_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_event_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_stream_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_client_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for platform config (only platform admins)
DROP POLICY IF EXISTS "Platform admins can manage config" ON public.live_platform_config;
CREATE POLICY "Platform admins can manage config" ON public.live_platform_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for org oauth tokens
DROP POLICY IF EXISTS "Org members can view their oauth tokens" ON public.live_org_oauth_tokens;
CREATE POLICY "Org members can view their oauth tokens" ON public.live_org_oauth_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid() AND organization_id = live_org_oauth_tokens.organization_id
    )
  );

DROP POLICY IF EXISTS "Org admins can manage oauth tokens" ON public.live_org_oauth_tokens;
CREATE POLICY "Org admins can manage oauth tokens" ON public.live_org_oauth_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid() 
      AND organization_id = live_org_oauth_tokens.organization_id
      AND (is_owner = true OR role = 'admin')
    )
  );

-- RLS for streaming channels
DROP POLICY IF EXISTS "Org members can view channels" ON public.live_streaming_channels;
CREATE POLICY "Org members can view channels" ON public.live_streaming_channels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid() AND organization_id = live_streaming_channels.organization_id
    )
  );

DROP POLICY IF EXISTS "Org admins can manage channels" ON public.live_streaming_channels;
CREATE POLICY "Org admins can manage channels" ON public.live_streaming_channels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid() 
      AND organization_id = live_streaming_channels.organization_id
      AND (is_owner = true OR role = 'admin')
    )
  );

-- RLS for event monitoring
DROP POLICY IF EXISTS "Org members can view monitoring" ON public.live_event_monitoring;
CREATE POLICY "Org members can view monitoring" ON public.live_event_monitoring
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.streaming_events se
      JOIN public.organization_members om ON om.organization_id = se.organization_id
      WHERE se.id = live_event_monitoring.event_id AND om.user_id = auth.uid()
    )
  );

-- RLS for stream history
DROP POLICY IF EXISTS "Org members can view history" ON public.live_stream_history;
CREATE POLICY "Org members can view history" ON public.live_stream_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid() AND organization_id = live_stream_history.organization_id
    )
  );

-- RLS for client settings
DROP POLICY IF EXISTS "Org members can view client settings" ON public.live_client_settings;
CREATE POLICY "Org members can view client settings" ON public.live_client_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid() AND organization_id = live_client_settings.organization_id
    )
  );

DROP POLICY IF EXISTS "Org admins can manage client settings" ON public.live_client_settings;
CREATE POLICY "Org admins can manage client settings" ON public.live_client_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = auth.uid() 
      AND organization_id = live_client_settings.organization_id
      AND (is_owner = true OR role = 'admin')
    )
  );

-- Function to reserve hours for an event
CREATE OR REPLACE FUNCTION public.reserve_live_hours(
  _event_id UUID,
  _hours NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _client_id UUID;
  _wallet_id UUID;
  _available NUMERIC;
BEGIN
  SELECT client_id INTO _client_id FROM streaming_events WHERE id = _event_id;
  
  IF _client_id IS NULL THEN
    RAISE EXCEPTION 'Event has no client assigned';
  END IF;
  
  SELECT id, (total_hours - used_hours - reserved_hours) INTO _wallet_id, _available
  FROM live_hour_wallets
  WHERE owner_type = 'client' AND owner_id = _client_id;
  
  IF _wallet_id IS NULL THEN
    RAISE EXCEPTION 'Client has no hour wallet';
  END IF;
  
  IF _available < _hours THEN
    RAISE EXCEPTION 'Insufficient hours available. Need % but have %', _hours, _available;
  END IF;
  
  UPDATE live_hour_wallets
  SET reserved_hours = reserved_hours + _hours, updated_at = now()
  WHERE id = _wallet_id;
  
  UPDATE streaming_events
  SET hours_reserved = _hours, reservation_status = 'reserved', updated_at = now()
  WHERE id = _event_id;
  
  RETURN TRUE;
END;
$$;

-- Function to consume reserved hours after event ends
CREATE OR REPLACE FUNCTION public.consume_live_hours(
  _event_id UUID,
  _actual_hours NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _client_id UUID;
  _org_id UUID;
  _wallet_id UUID;
  _reserved NUMERIC;
BEGIN
  SELECT client_id, organization_id, hours_reserved 
  INTO _client_id, _org_id, _reserved
  FROM streaming_events WHERE id = _event_id;
  
  SELECT id INTO _wallet_id
  FROM live_hour_wallets
  WHERE owner_type = 'client' AND owner_id = _client_id;
  
  UPDATE live_hour_wallets
  SET 
    reserved_hours = GREATEST(0, reserved_hours - COALESCE(_reserved, 0)),
    used_hours = used_hours + _actual_hours,
    updated_at = now()
  WHERE id = _wallet_id;
  
  UPDATE streaming_events
  SET 
    actual_duration_hours = _actual_hours,
    hours_consumed = _actual_hours,
    reservation_status = 'consumed',
    updated_at = now()
  WHERE id = _event_id;
  
  UPDATE live_hour_wallets
  SET used_hours = used_hours + _actual_hours, updated_at = now()
  WHERE owner_type = 'organization' AND owner_id = _org_id;
  
  INSERT INTO live_usage_logs (event_id, organization_id, hours_consumed, client_id, logged_at)
  VALUES (_event_id, _org_id, _actual_hours, _client_id, now());
  
  RETURN TRUE;
END;
$$;

-- Add client_id to live_usage_logs if not exists
ALTER TABLE public.live_usage_logs ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_channels_org ON public.live_streaming_channels(organization_id);
CREATE INDEX IF NOT EXISTS idx_live_monitoring_event ON public.live_event_monitoring(event_id);
CREATE INDEX IF NOT EXISTS idx_live_history_org ON public.live_stream_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_live_history_event ON public.live_stream_history(event_id);
CREATE INDEX IF NOT EXISTS idx_live_client_settings_client ON public.live_client_settings(client_id);
CREATE INDEX IF NOT EXISTS idx_streaming_events_org ON public.streaming_events(organization_id);