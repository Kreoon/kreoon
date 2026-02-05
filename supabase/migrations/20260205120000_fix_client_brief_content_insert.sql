-- Fix: Clientes no pueden guardar brief ni crear contenido desde el wizard
--
-- Problemas resueltos:
-- 1. Falta GRANT INSERT en content para rol authenticated
-- 2. Falta política RLS INSERT en content para client_users
-- 3. Falta GRANT INSERT en content para el rol authenticated (similar al fix de products/clients en 20260202210000)

-- 1. Asegurar que el rol authenticated tiene permisos CRUD en content
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content TO authenticated;

-- 2. Política RLS: client users pueden INSERT contenido para sus clientes
-- (Necesario para que el wizard del brief cree los creativos por fase Esfera)
DROP POLICY IF EXISTS "Client users can insert content for their clients" ON public.content;
CREATE POLICY "Client users can insert content for their clients"
ON public.content
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.client_users
    WHERE client_users.client_id = content.client_id
    AND client_users.user_id = auth.uid()
  )
);

-- 3. Índice para acelerar la verificación RLS en content (evitar timeouts)
CREATE INDEX IF NOT EXISTS idx_content_client_id ON public.content(client_id);
