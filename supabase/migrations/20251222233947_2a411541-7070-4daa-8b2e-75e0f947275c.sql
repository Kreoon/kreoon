-- Add VIP badge column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false;

-- Create a followers system for companies
-- We'll extend the existing followers table to support company follows
-- by adding a target_type column to distinguish between user and company follows

-- First, let's create a separate table for company followers to keep things clean
CREATE TABLE IF NOT EXISTS public.company_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(company_id, follower_id)
);

-- Enable RLS
ALTER TABLE public.company_followers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view company followers"
ON public.company_followers
FOR SELECT
USING (true);

CREATE POLICY "Users can follow companies"
ON public.company_followers
FOR INSERT
WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow companies"
ON public.company_followers
FOR DELETE
USING (auth.uid() = follower_id);

-- Function to toggle company follow
CREATE OR REPLACE FUNCTION public.toggle_company_follow(_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_following BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.company_followers 
    WHERE company_id = _company_id AND follower_id = auth.uid()
  ) INTO is_following;
  
  IF is_following THEN
    DELETE FROM public.company_followers 
    WHERE company_id = _company_id AND follower_id = auth.uid();
    RETURN false;
  ELSE
    INSERT INTO public.company_followers (company_id, follower_id) 
    VALUES (_company_id, auth.uid());
    RETURN true;
  END IF;
END;
$$;

-- Function to check if user follows a company
CREATE OR REPLACE FUNCTION public.is_following_company(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.company_followers 
    WHERE company_id = _company_id AND follower_id = auth.uid()
  );
$$;

-- Function to get company follower count
CREATE OR REPLACE FUNCTION public.get_company_followers_count(_company_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) FROM public.company_followers WHERE company_id = _company_id;
$$;