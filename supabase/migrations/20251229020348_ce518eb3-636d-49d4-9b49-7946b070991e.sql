-- Add organization_status to profiles for handling users without org
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS organization_status text NOT NULL DEFAULT 'active' 
CHECK (organization_status IN ('active', 'pending_assignment'));

-- Update existing users to be active
UPDATE public.profiles 
SET organization_status = 'active' 
WHERE organization_status IS NULL OR organization_status = '';

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_organization_status ON public.profiles(organization_status);