-- Fix: allow any authenticated user to view public profiles regardless of their own org visibility_scope
-- This restores expected behavior for viewing independent public creators (e.g., Susana).

DROP POLICY IF EXISTS "Authenticated users can view public profiles" ON public.profiles;

CREATE POLICY "Authenticated users can view public profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_public = true);
