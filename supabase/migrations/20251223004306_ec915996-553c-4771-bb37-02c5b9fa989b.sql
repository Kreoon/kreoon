-- Create table for platform security settings
CREATE TABLE public.security_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL DEFAULT '{}',
  description text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and modify security settings
CREATE POLICY "Admins can view security settings"
ON public.security_settings FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can modify security settings"
ON public.security_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create table for login history/sessions
CREATE TABLE public.login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_at timestamp with time zone NOT NULL DEFAULT now(),
  logout_at timestamp with time zone,
  ip_address text,
  user_agent text,
  device_type text,
  location text,
  is_suspicious boolean DEFAULT false,
  session_id text
);

-- Enable RLS
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;

-- Users can see their own login history
CREATE POLICY "Users can view their own login history"
ON public.login_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can view all login history
CREATE POLICY "Admins can view all login history"
ON public.login_history FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only system can insert login history
CREATE POLICY "System can insert login history"
ON public.login_history FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Create table for blocked IPs
CREATE TABLE public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  reason text,
  blocked_at timestamp with time zone NOT NULL DEFAULT now(),
  blocked_by uuid REFERENCES auth.users(id),
  expires_at timestamp with time zone,
  is_active boolean DEFAULT true
);

-- Enable RLS
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

-- Only admins can manage blocked IPs
CREATE POLICY "Admins can manage blocked IPs"
ON public.blocked_ips FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create table for user security status
CREATE TABLE public.user_security_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mfa_enabled boolean DEFAULT false,
  last_password_change timestamp with time zone,
  failed_login_attempts integer DEFAULT 0,
  last_failed_login timestamp with time zone,
  account_locked boolean DEFAULT false,
  locked_until timestamp with time zone,
  force_password_reset boolean DEFAULT false,
  security_score integer DEFAULT 0,
  last_security_review timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_security_status ENABLE ROW LEVEL SECURITY;

-- Users can view their own security status
CREATE POLICY "Users can view their own security status"
ON public.user_security_status FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can update their own security status (limited fields via trigger)
CREATE POLICY "Users can update their own security status"
ON public.user_security_status FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Admins can view and manage all security statuses
CREATE POLICY "Admins can manage all security statuses"
ON public.user_security_status FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default security settings
INSERT INTO public.security_settings (setting_key, setting_value, description) VALUES
('mfa_policy', '{"required": false, "required_for_admins": true, "grace_period_days": 7}', 'Política de autenticación de dos factores'),
('password_policy', '{"min_length": 8, "require_uppercase": true, "require_lowercase": true, "require_numbers": true, "require_special": false, "expiry_days": 90, "prevent_reuse": 3}', 'Política de contraseñas'),
('session_policy', '{"max_concurrent_sessions": 5, "session_timeout_minutes": 480, "idle_timeout_minutes": 30}', 'Política de sesiones'),
('login_policy', '{"max_failed_attempts": 5, "lockout_duration_minutes": 30, "notify_on_new_device": true, "require_captcha_after_failures": 3}', 'Política de inicio de sesión'),
('ip_policy', '{"enable_geo_blocking": false, "blocked_countries": [], "allow_vpn": true}', 'Política de IPs y ubicaciones');

-- Function to create security status for new users
CREATE OR REPLACE FUNCTION public.create_user_security_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_security_status (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create security status on profile creation
CREATE TRIGGER on_profile_created_security
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_user_security_status();

-- Function to log login
CREATE OR REPLACE FUNCTION public.log_user_login(
  _user_id uuid,
  _ip_address text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _device_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.login_history (user_id, ip_address, user_agent, device_type)
  VALUES (_user_id, _ip_address, _user_agent, _device_type)
  RETURNING id INTO log_id;
  
  -- Log to audit
  PERFORM public.log_activity(_user_id, 'user_login', 'auth', NULL, NULL, 
    jsonb_build_object('ip', _ip_address, 'device', _device_type));
  
  -- Update last activity
  UPDATE public.user_security_status
  SET failed_login_attempts = 0, updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN log_id;
END;
$$;

-- Function to calculate security score
CREATE OR REPLACE FUNCTION public.calculate_security_score(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score integer := 0;
  has_mfa boolean;
  password_age integer;
BEGIN
  -- Check MFA (40 points)
  SELECT mfa_enabled INTO has_mfa FROM public.user_security_status WHERE user_id = _user_id;
  IF has_mfa THEN
    score := score + 40;
  END IF;
  
  -- Check password age (30 points max, decreases with age)
  SELECT EXTRACT(DAY FROM (now() - last_password_change))::integer INTO password_age
  FROM public.user_security_status WHERE user_id = _user_id;
  
  IF password_age IS NULL THEN
    score := score + 15;
  ELSIF password_age < 30 THEN
    score := score + 30;
  ELSIF password_age < 60 THEN
    score := score + 20;
  ELSIF password_age < 90 THEN
    score := score + 10;
  END IF;
  
  -- Base points for having account (30 points)
  score := score + 30;
  
  -- Update the score
  UPDATE public.user_security_status
  SET security_score = score, last_security_review = now(), updated_at = now()
  WHERE user_id = _user_id;
  
  RETURN score;
END;
$$;