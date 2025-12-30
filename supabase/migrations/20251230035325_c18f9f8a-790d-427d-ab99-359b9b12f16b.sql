-- Step 2: Now use the new enum value and add client_id column

-- Add client_id column for direct client reference
ALTER TABLE public.streaming_accounts
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE;

-- Create index for client lookups
CREATE INDEX IF NOT EXISTS idx_streaming_accounts_client_id 
ON public.streaming_accounts(client_id);

-- Update RLS policies to allow client-level access
DROP POLICY IF EXISTS "Org members view streaming accounts" ON public.streaming_accounts;
DROP POLICY IF EXISTS "Org owners manage streaming accounts" ON public.streaming_accounts;
DROP POLICY IF EXISTS "Admins manage all streaming accounts" ON public.streaming_accounts;
DROP POLICY IF EXISTS "View streaming accounts" ON public.streaming_accounts;
DROP POLICY IF EXISTS "Manage streaming accounts" ON public.streaming_accounts;

-- New policies supporting client ownership
CREATE POLICY "View streaming accounts" ON public.streaming_accounts
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    owner_type = 'organization' 
    AND is_org_member(auth.uid(), owner_id)
  )
  OR (
    owner_type = 'client'
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = streaming_accounts.client_id
        AND is_org_member(auth.uid(), c.organization_id)
    )
  )
  OR owner_type = 'platform'
);

CREATE POLICY "Manage streaming accounts" ON public.streaming_accounts
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    owner_type = 'organization' 
    AND is_org_owner(auth.uid(), owner_id)
  )
  OR (
    owner_type = 'client'
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = streaming_accounts.client_id
        AND is_org_owner(auth.uid(), c.organization_id)
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    owner_type = 'organization' 
    AND is_org_owner(auth.uid(), owner_id)
  )
  OR (
    owner_type = 'client'
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = streaming_accounts.client_id
        AND is_org_owner(auth.uid(), c.organization_id)
    )
  )
);