-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Client owners can manage users" ON public.client_users;

-- Create a security definer function to check if user is client owner
CREATE OR REPLACE FUNCTION public.is_client_owner(_user_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.client_users
    WHERE user_id = _user_id
      AND client_id = _client_id
      AND role = 'owner'
  )
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Client owners can manage users"
ON public.client_users
FOR ALL
USING (
  is_client_owner(auth.uid(), client_id)
);