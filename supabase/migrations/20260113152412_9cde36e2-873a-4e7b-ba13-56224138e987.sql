-- Allow clients to INSERT products for their own clients
CREATE POLICY "Clients can insert products for their clients"
ON public.products
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_users
    WHERE client_users.client_id = products.client_id
    AND client_users.user_id = auth.uid()
  )
);

-- Allow clients to UPDATE products for their own clients  
CREATE POLICY "Clients can update products for their clients"
ON public.products
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM client_users
    WHERE client_users.client_id = products.client_id
    AND client_users.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM client_users
    WHERE client_users.client_id = products.client_id
    AND client_users.user_id = auth.uid()
  )
);

-- Allow clients to DELETE their own products
CREATE POLICY "Clients can delete products for their clients"
ON public.products
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM client_users
    WHERE client_users.client_id = products.client_id
    AND client_users.user_id = auth.uid()
  )
);