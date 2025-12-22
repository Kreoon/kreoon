-- Create junction table for many-to-many relationship between clients and users
CREATE TABLE public.client_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'viewer', -- 'owner', 'admin', 'viewer'
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  UNIQUE(client_id, user_id)
);

-- Enable RLS
ALTER TABLE public.client_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all client_users"
ON public.client_users
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own client associations"
ON public.client_users
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Client owners can manage users"
ON public.client_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.client_users cu
    WHERE cu.client_id = client_users.client_id
    AND cu.user_id = auth.uid()
    AND cu.role = 'owner'
  )
);

-- Migrate existing user_id relationships to the new table
INSERT INTO public.client_users (client_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.clients
WHERE user_id IS NOT NULL
ON CONFLICT (client_id, user_id) DO NOTHING;

-- Update RLS policies for clients table to use new junction table
DROP POLICY IF EXISTS "Clients can view their own data" ON public.clients;
DROP POLICY IF EXISTS "Clients can create their own company" ON public.clients;
DROP POLICY IF EXISTS "Clients can update their own company" ON public.clients;

CREATE POLICY "Users can view their associated clients"
ON public.clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_users.client_id = clients.id
    AND client_users.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their associated clients"
ON public.clients
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_users.client_id = clients.id
    AND client_users.user_id = auth.uid()
    AND client_users.role IN ('owner', 'admin')
  )
);

-- Update content RLS to use new junction table
DROP POLICY IF EXISTS "Clients can view their content" ON public.content;
DROP POLICY IF EXISTS "Clients can update status of their content" ON public.content;

CREATE POLICY "Client users can view their content"
ON public.content
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_users.client_id = content.client_id
    AND client_users.user_id = auth.uid()
  )
);

CREATE POLICY "Client users can update status of their content"
ON public.content
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_users.client_id = content.client_id
    AND client_users.user_id = auth.uid()
  )
);

-- Update client_packages RLS
DROP POLICY IF EXISTS "Clients can view their packages" ON public.client_packages;

CREATE POLICY "Client users can view their packages"
ON public.client_packages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_users.client_id = client_packages.client_id
    AND client_users.user_id = auth.uid()
  )
);

-- Update products RLS
DROP POLICY IF EXISTS "Clients can view their products" ON public.products;

CREATE POLICY "Client users can view their products"
ON public.products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_users.client_id = products.client_id
    AND client_users.user_id = auth.uid()
  )
);