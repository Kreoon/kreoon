-- Add AI-calculated token cost to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ai_token_cost integer DEFAULT 3 CHECK (ai_token_cost >= 1 AND ai_token_cost <= 5),
ADD COLUMN IF NOT EXISTS ai_token_cost_updated_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS ai_token_cost_reason text;

-- Create table for AI token evaluation history
CREATE TABLE public.profile_token_evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_cost integer NOT NULL CHECK (token_cost >= 1 AND token_cost <= 5),
  evaluation_reason text NOT NULL,
  evaluation_factors jsonb NOT NULL DEFAULT '{}',
  evaluated_at timestamp with time zone NOT NULL DEFAULT now(),
  evaluated_by text DEFAULT 'ai' -- 'ai' or 'admin'
);

-- Enable RLS
ALTER TABLE public.profile_token_evaluations ENABLE ROW LEVEL SECURITY;

-- Admins can view all evaluations
CREATE POLICY "Admins can view all evaluations"
ON public.profile_token_evaluations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage evaluations
CREATE POLICY "Admins can manage evaluations"
ON public.profile_token_evaluations
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own evaluations
CREATE POLICY "Users can view own evaluations"
ON public.profile_token_evaluations
FOR SELECT
USING (profile_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_profile_token_evaluations_profile_id ON public.profile_token_evaluations(profile_id);
CREATE INDEX idx_profile_token_evaluations_evaluated_at ON public.profile_token_evaluations(evaluated_at DESC);

-- Create table for AI tokenization config (platform-level)
CREATE TABLE public.ai_tokenization_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT true,
  min_token_cost integer NOT NULL DEFAULT 1 CHECK (min_token_cost >= 1 AND min_token_cost <= 5),
  max_token_cost integer NOT NULL DEFAULT 5 CHECK (max_token_cost >= 1 AND max_token_cost <= 5),
  evaluation_prompt text,
  weight_profile_completeness integer NOT NULL DEFAULT 25,
  weight_achievements integer NOT NULL DEFAULT 25,
  weight_experience integer NOT NULL DEFAULT 25,
  weight_engagement integer NOT NULL DEFAULT 25,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_tokenization_config ENABLE ROW LEVEL SECURITY;

-- Only admins can manage config
CREATE POLICY "Admins can manage tokenization config"
ON public.ai_tokenization_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view config (needed for edge function)
CREATE POLICY "Anyone can view tokenization config"
ON public.ai_tokenization_config
FOR SELECT
USING (true);

-- Insert default config
INSERT INTO public.ai_tokenization_config (
  is_enabled,
  min_token_cost,
  max_token_cost,
  evaluation_prompt,
  weight_profile_completeness,
  weight_achievements,
  weight_experience,
  weight_engagement
) VALUES (
  true,
  1,
  5,
  'Evalúa este perfil de creador y asigna un costo de tokens del 1 al 5 basado en: completitud del perfil, logros obtenidos, nivel de experiencia, y engagement (seguidores, likes, vistas). 1 = perfil básico, 5 = creador élite.',
  25,
  25,
  25,
  25
);