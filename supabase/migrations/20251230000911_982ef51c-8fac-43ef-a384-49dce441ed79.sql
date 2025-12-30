-- Add platform founder/CEO special status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_platform_founder boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS founder_badge_type text DEFAULT NULL;

-- Mark Johan Alexander Castaño as the platform founder
UPDATE public.profiles 
SET 
  is_platform_founder = true,
  founder_badge_type = 'ceo',
  ai_token_cost = 5,
  ai_token_cost_reason = 'CEO y fundador de la plataforma - Máximo nivel'
WHERE id = '06aa55b0-61ea-41f0-9708-7a3d322b6795';

-- Create index for quick founder lookups
CREATE INDEX IF NOT EXISTS idx_profiles_platform_founder 
ON public.profiles(is_platform_founder) 
WHERE is_platform_founder = true;