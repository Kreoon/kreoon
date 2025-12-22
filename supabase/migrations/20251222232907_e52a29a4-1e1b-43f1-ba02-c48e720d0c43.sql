-- Add profile fields to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS tiktok text,
ADD COLUMN IF NOT EXISTS facebook text,
ADD COLUMN IF NOT EXISTS portfolio_url text,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_clients_username ON public.clients(username);

-- Update RLS policy to allow any associated user to manage client profile
DROP POLICY IF EXISTS "Users can update their associated clients" ON public.clients;

CREATE POLICY "Associated users can update their client" 
ON public.clients 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM client_users 
    WHERE client_users.client_id = clients.id 
    AND client_users.user_id = auth.uid()
  )
);

-- Allow associated users to view their clients (already exists but let's ensure)
DROP POLICY IF EXISTS "Users can view their associated clients" ON public.clients;

CREATE POLICY "Associated users can view their client" 
ON public.clients 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM client_users 
    WHERE client_users.client_id = clients.id 
    AND client_users.user_id = auth.uid()
  )
);

-- Allow public to view public client profiles
CREATE POLICY "Anyone can view public client profiles" 
ON public.clients 
FOR SELECT 
USING (is_public = true);