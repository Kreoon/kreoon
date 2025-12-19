-- Allow clients to update their own company data
CREATE POLICY "Clients can update their own company"
ON public.clients
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow clients to insert their own company (if they don't have one yet)
CREATE POLICY "Clients can create their own company"
ON public.clients
FOR INSERT
WITH CHECK (user_id = auth.uid());