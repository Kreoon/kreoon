-- Add FK constraint so PostgREST can discover the client_packages → clients relationship
-- Required for embedded resource syntax: .select('..., clients(name)')

ALTER TABLE public.client_packages
ADD CONSTRAINT fk_client_packages_client
FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
