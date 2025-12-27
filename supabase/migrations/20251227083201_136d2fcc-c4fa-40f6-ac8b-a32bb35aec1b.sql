-- Table for organization AI providers configuration
CREATE TABLE public.organization_ai_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL, -- 'openai', 'gemini', 'anthropic', 'lovable'
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  api_key_encrypted TEXT, -- Encrypted API key (masked on read)
  available_models TEXT[] DEFAULT '{}', -- List of available models for this provider
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  configured_by UUID,
  UNIQUE(organization_id, provider_key)
);

-- Table for organization AI module defaults
CREATE TABLE public.organization_ai_defaults (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  default_provider TEXT NOT NULL DEFAULT 'lovable',
  default_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
  scripts_provider TEXT,
  scripts_model TEXT,
  thumbnails_provider TEXT,
  thumbnails_model TEXT,
  sistema_up_provider TEXT,
  sistema_up_model TEXT,
  live_assistant_provider TEXT,
  live_assistant_model TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for AI usage audit logs
CREATE TABLE public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  tokens_input INTEGER,
  tokens_output INTEGER,
  estimated_cost NUMERIC(10,6),
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organization_ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_ai_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for organization_ai_providers
CREATE POLICY "Org members can view their AI providers"
  ON public.organization_ai_providers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_ai_providers.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage AI providers"
  ON public.organization_ai_providers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_ai_providers.organization_id
      AND om.user_id = auth.uid()
      AND (om.role = 'admin' OR om.is_owner = true)
    )
  );

-- RLS Policies for organization_ai_defaults
CREATE POLICY "Org members can view AI defaults"
  ON public.organization_ai_defaults FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_ai_defaults.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Org admins can manage AI defaults"
  ON public.organization_ai_defaults FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_ai_defaults.organization_id
      AND om.user_id = auth.uid()
      AND (om.role = 'admin' OR om.is_owner = true)
    )
  );

-- RLS Policies for ai_usage_logs
CREATE POLICY "Org admins can view AI usage logs"
  ON public.ai_usage_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = ai_usage_logs.organization_id
      AND om.user_id = auth.uid()
      AND (om.role = 'admin' OR om.is_owner = true)
    )
  );

CREATE POLICY "System can insert AI usage logs"
  ON public.ai_usage_logs FOR INSERT
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_ai_providers_org ON public.organization_ai_providers(organization_id);
CREATE INDEX idx_ai_defaults_org ON public.organization_ai_defaults(organization_id);
CREATE INDEX idx_ai_usage_logs_org ON public.ai_usage_logs(organization_id);
CREATE INDEX idx_ai_usage_logs_created ON public.ai_usage_logs(created_at DESC);

-- Trigger for updated_at using existing handle_updated_at function
CREATE TRIGGER update_ai_providers_updated_at
  BEFORE UPDATE ON public.organization_ai_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_ai_defaults_updated_at
  BEFORE UPDATE ON public.organization_ai_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();