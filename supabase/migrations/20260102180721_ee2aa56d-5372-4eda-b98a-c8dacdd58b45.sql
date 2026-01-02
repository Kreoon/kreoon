-- Create table to assign strategists to clients
CREATE TABLE IF NOT EXISTS public.client_strategists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  strategist_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  assigned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(client_id, strategist_id)
);

-- Enable RLS
ALTER TABLE public.client_strategists ENABLE ROW LEVEL SECURITY;

-- Policies: Org members can view
CREATE POLICY "Org members can view client strategists"
ON public.client_strategists
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = client_strategists.organization_id
    AND om.user_id = auth.uid()
  )
);

-- Admins and owners can manage
CREATE POLICY "Admins can manage client strategists"
ON public.client_strategists
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM organization_members om
    WHERE om.organization_id = client_strategists.organization_id
    AND om.user_id = auth.uid()
    AND (om.is_owner = true OR om.role = 'admin')
  )
);

-- Strategists can view their own assignments
CREATE POLICY "Strategists can view own assignments"
ON public.client_strategists
FOR SELECT
USING (strategist_id = auth.uid());

-- Create index for fast lookups
CREATE INDEX idx_client_strategists_strategist ON public.client_strategists(strategist_id);
CREATE INDEX idx_client_strategists_client ON public.client_strategists(client_id);
CREATE INDEX idx_client_strategists_org ON public.client_strategists(organization_id);