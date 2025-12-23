-- Create table for security events (suspicious activity, bot detection, etc)
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'suspicious_login', 'bot_detected', 'geo_blocked', 'rate_limited', 'new_device'
  ip_address text,
  country_code text,
  country_name text,
  city text,
  region text,
  is_vpn boolean DEFAULT false,
  is_proxy boolean DEFAULT false,
  is_tor boolean DEFAULT false,
  is_bot boolean DEFAULT false,
  user_agent text,
  device_fingerprint text,
  risk_score integer DEFAULT 0, -- 0-100
  details jsonb,
  action_taken text, -- 'blocked', 'warned', 'allowed', 'captcha_required'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own security events
CREATE POLICY "Users can view their own security events"
ON public.security_events FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all security events
CREATE POLICY "Admins can view all security events"
ON public.security_events FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- System can insert security events
CREATE POLICY "System can insert security events"
ON public.security_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_security_events_user_id ON public.security_events(user_id);
CREATE INDEX idx_security_events_ip ON public.security_events(ip_address);
CREATE INDEX idx_security_events_type ON public.security_events(event_type);
CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC);

-- Create table for known device fingerprints
CREATE TABLE public.known_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_name text,
  browser text,
  os text,
  last_ip text,
  last_country text,
  last_used_at timestamp with time zone DEFAULT now(),
  is_trusted boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_fingerprint)
);

-- Enable RLS
ALTER TABLE public.known_devices ENABLE ROW LEVEL SECURITY;

-- Users can manage their own devices
CREATE POLICY "Users can view their own devices"
ON public.known_devices FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own devices"
ON public.known_devices FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own devices"
ON public.known_devices FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own devices"
ON public.known_devices FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all devices
CREATE POLICY "Admins can view all devices"
ON public.known_devices FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add geo-blocking countries to security settings
UPDATE public.security_settings 
SET setting_value = jsonb_set(
  setting_value, 
  '{blocked_countries}', 
  '[]'::jsonb
)
WHERE setting_key = 'ip_policy';

-- Add rate limiting table
CREATE TABLE public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP or user_id
  identifier_type text NOT NULL, -- 'ip' or 'user'
  action_type text NOT NULL, -- 'login', 'api_call', 'password_reset'
  attempts integer DEFAULT 1,
  first_attempt_at timestamp with time zone DEFAULT now(),
  last_attempt_at timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  UNIQUE(identifier, action_type)
);

-- Enable RLS (only system access)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Admins can view rate limits
CREATE POLICY "Admins can view rate limits"
ON public.rate_limits FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- System can manage rate limits
CREATE POLICY "System can manage rate limits"
ON public.rate_limits FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _identifier text,
  _identifier_type text,
  _action_type text,
  _max_attempts integer DEFAULT 5,
  _window_minutes integer DEFAULT 15,
  _block_minutes integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  current_record rate_limits%ROWTYPE;
  is_blocked boolean := false;
  remaining_attempts integer;
  block_remaining_seconds integer;
BEGIN
  -- Get or create rate limit record
  INSERT INTO public.rate_limits (identifier, identifier_type, action_type)
  VALUES (_identifier, _identifier_type, _action_type)
  ON CONFLICT (identifier, action_type) DO UPDATE
  SET 
    attempts = CASE 
      WHEN rate_limits.first_attempt_at < now() - (_window_minutes || ' minutes')::interval 
      THEN 1 
      ELSE rate_limits.attempts + 1 
    END,
    first_attempt_at = CASE 
      WHEN rate_limits.first_attempt_at < now() - (_window_minutes || ' minutes')::interval 
      THEN now() 
      ELSE rate_limits.first_attempt_at 
    END,
    last_attempt_at = now(),
    blocked_until = CASE 
      WHEN rate_limits.attempts >= _max_attempts - 1 
        AND rate_limits.first_attempt_at >= now() - (_window_minutes || ' minutes')::interval
      THEN now() + (_block_minutes || ' minutes')::interval
      ELSE rate_limits.blocked_until
    END
  RETURNING * INTO current_record;
  
  -- Check if blocked
  IF current_record.blocked_until IS NOT NULL AND current_record.blocked_until > now() THEN
    is_blocked := true;
    block_remaining_seconds := EXTRACT(EPOCH FROM (current_record.blocked_until - now()))::integer;
    remaining_attempts := 0;
  ELSE
    remaining_attempts := GREATEST(0, _max_attempts - current_record.attempts);
  END IF;
  
  result := jsonb_build_object(
    'allowed', NOT is_blocked,
    'attempts', current_record.attempts,
    'remaining_attempts', remaining_attempts,
    'blocked', is_blocked,
    'blocked_until', current_record.blocked_until,
    'block_remaining_seconds', COALESCE(block_remaining_seconds, 0)
  );
  
  RETURN result;
END;
$$;

-- Function to log security event
CREATE OR REPLACE FUNCTION public.log_security_event(
  _user_id uuid,
  _event_type text,
  _ip_address text DEFAULT NULL,
  _country_code text DEFAULT NULL,
  _country_name text DEFAULT NULL,
  _city text DEFAULT NULL,
  _is_vpn boolean DEFAULT false,
  _is_bot boolean DEFAULT false,
  _risk_score integer DEFAULT 0,
  _user_agent text DEFAULT NULL,
  _details jsonb DEFAULT NULL,
  _action_taken text DEFAULT 'allowed'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_id uuid;
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, ip_address, country_code, country_name, city,
    is_vpn, is_bot, risk_score, user_agent, details, action_taken
  )
  VALUES (
    _user_id, _event_type, _ip_address, _country_code, _country_name, _city,
    _is_vpn, _is_bot, _risk_score, _user_agent, _details, _action_taken
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Update ip_policy with more options
UPDATE public.security_settings 
SET setting_value = '{
  "enable_geo_blocking": false,
  "blocked_countries": [],
  "allow_vpn": true,
  "allow_tor": false,
  "allow_proxy": true,
  "max_login_attempts": 5,
  "lockout_minutes": 30,
  "require_captcha_after_failures": 3,
  "block_suspicious_ips": true,
  "risk_score_threshold": 70,
  "notify_on_suspicious": true
}'::jsonb
WHERE setting_key = 'ip_policy';