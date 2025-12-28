-- Add user_id column to profile_blocks_config for per-user config
ALTER TABLE public.profile_blocks_config
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Update unique constraint
ALTER TABLE public.profile_blocks_config
DROP CONSTRAINT IF EXISTS profile_blocks_config_org_profile_key;

ALTER TABLE public.profile_blocks_config
ADD CONSTRAINT unique_profile_blocks_per_user UNIQUE (organization_id, user_id, profile_type);

-- Update RLS policies
DROP POLICY IF EXISTS "Org owners can manage blocks config" ON public.profile_blocks_config;
DROP POLICY IF EXISTS "Org members can view blocks config" ON public.profile_blocks_config;
DROP POLICY IF EXISTS "Users can view their own blocks config" ON public.profile_blocks_config;
DROP POLICY IF EXISTS "Users can manage their own blocks config" ON public.profile_blocks_config;

CREATE POLICY "Users can view blocks config"
ON public.profile_blocks_config FOR SELECT
USING (
  user_id = auth.uid() 
  OR (user_id IS NULL AND is_org_member(auth.uid(), organization_id))
);

CREATE POLICY "Users can manage own blocks config"
ON public.profile_blocks_config FOR ALL
USING (
  user_id = auth.uid() 
  OR is_org_owner(auth.uid(), organization_id)
)
WITH CHECK (
  user_id = auth.uid() 
  OR is_org_owner(auth.uid(), organization_id)
);