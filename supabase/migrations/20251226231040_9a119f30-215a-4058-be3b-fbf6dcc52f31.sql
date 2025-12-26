
-- Agregar campos de perfil de organización
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS admin_name text,
ADD COLUMN IF NOT EXISTS admin_email text,
ADD COLUMN IF NOT EXISTS admin_phone text,
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS tiktok text,
ADD COLUMN IF NOT EXISTS facebook text,
ADD COLUMN IF NOT EXISTS linkedin text,
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS blocked_by uuid,
ADD COLUMN IF NOT EXISTS blocked_reason text,
ADD COLUMN IF NOT EXISTS organization_type text DEFAULT 'agency', -- agency, community, company
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/Bogota',
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#8B5CF6',
ADD COLUMN IF NOT EXISTS max_members integer,
ADD COLUMN IF NOT EXISTS billing_email text;

-- Índice para búsqueda rápida de orgs bloqueadas
CREATE INDEX IF NOT EXISTS idx_organizations_is_blocked ON public.organizations(is_blocked);

-- Comentarios para documentación
COMMENT ON COLUMN public.organizations.admin_name IS 'Nombre del administrador principal de la organización';
COMMENT ON COLUMN public.organizations.admin_email IS 'Correo electrónico root de la organización';
COMMENT ON COLUMN public.organizations.admin_phone IS 'Teléfono/WhatsApp de contacto administrativo';
COMMENT ON COLUMN public.organizations.is_blocked IS 'Si está bloqueada, los usuarios no pueden acceder';
COMMENT ON COLUMN public.organizations.organization_type IS 'Tipo: agency (agencia), community (comunidad), company (empresa)';
