-- Drop existing policies for organization_ai_providers
DROP POLICY IF EXISTS "Org members can view AI providers" ON public.organization_ai_providers;
DROP POLICY IF EXISTS "Org owners can manage AI providers" ON public.organization_ai_providers;

-- Recreate with proper policies
-- SELECT: Any org member can view
CREATE POLICY "Org members can view AI providers" 
ON public.organization_ai_providers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_ai_providers.organization_id 
    AND om.user_id = auth.uid()
  )
);

-- INSERT: Org owners or admins can insert
CREATE POLICY "Org owners can insert AI providers" 
ON public.organization_ai_providers 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_ai_providers.organization_id 
    AND om.user_id = auth.uid()
    AND (om.is_owner = true OR om.role = 'admin')
  )
);

-- UPDATE: Org owners or admins can update
CREATE POLICY "Org owners can update AI providers" 
ON public.organization_ai_providers 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_ai_providers.organization_id 
    AND om.user_id = auth.uid()
    AND (om.is_owner = true OR om.role = 'admin')
  )
);

-- DELETE: Org owners can delete
CREATE POLICY "Org owners can delete AI providers" 
ON public.organization_ai_providers 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_ai_providers.organization_id 
    AND om.user_id = auth.uid()
    AND om.is_owner = true
  )
);

-- Also fix organization_ai_defaults policies
DROP POLICY IF EXISTS "Org members can view AI defaults" ON public.organization_ai_defaults;
DROP POLICY IF EXISTS "Org owners can manage AI defaults" ON public.organization_ai_defaults;

CREATE POLICY "Org members can view AI defaults" 
ON public.organization_ai_defaults 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_ai_defaults.organization_id 
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Org owners can insert AI defaults" 
ON public.organization_ai_defaults 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_ai_defaults.organization_id 
    AND om.user_id = auth.uid()
    AND (om.is_owner = true OR om.role = 'admin')
  )
);

CREATE POLICY "Org owners can update AI defaults" 
ON public.organization_ai_defaults 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM organization_members om 
    WHERE om.organization_id = organization_ai_defaults.organization_id 
    AND om.user_id = auth.uid()
    AND (om.is_owner = true OR om.role = 'admin')
  )
);