-- Create table for role permissions
CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role public.app_role NOT NULL,
  module text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_modify boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (role, module)
);

-- Enable Row Level Security
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage permissions
CREATE POLICY "Admins can manage permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can view permissions (to check their own access)
CREATE POLICY "Authenticated can view permissions"
ON public.role_permissions
FOR SELECT
USING (true);

-- Insert default permissions for each role
-- Admin has all permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_modify) VALUES
  ('admin', 'dashboard', true, true, true),
  ('admin', 'tablero', true, true, true),
  ('admin', 'contenido', true, true, true),
  ('admin', 'creadores', true, true, true),
  ('admin', 'guiones_ia', true, true, true),
  ('admin', 'clientes', true, true, true),
  ('admin', 'equipo', true, true, true),
  ('admin', 'productos', true, true, true),
  ('admin', 'paquetes', true, true, true),
  ('admin', 'pagos', true, true, true),
  ('admin', 'metas', true, true, true),
  ('admin', 'portafolio', true, true, true);

-- Creator permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_modify) VALUES
  ('creator', 'dashboard', true, false, false),
  ('creator', 'tablero', true, false, true),
  ('creator', 'contenido', true, false, true),
  ('creator', 'creadores', false, false, false),
  ('creator', 'guiones_ia', true, false, false),
  ('creator', 'clientes', false, false, false),
  ('creator', 'equipo', false, false, false),
  ('creator', 'productos', true, false, false),
  ('creator', 'paquetes', false, false, false),
  ('creator', 'pagos', false, false, false),
  ('creator', 'metas', false, false, false),
  ('creator', 'portafolio', true, false, false);

-- Editor permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_modify) VALUES
  ('editor', 'dashboard', true, false, false),
  ('editor', 'tablero', true, false, true),
  ('editor', 'contenido', true, false, true),
  ('editor', 'creadores', false, false, false),
  ('editor', 'guiones_ia', true, false, false),
  ('editor', 'clientes', false, false, false),
  ('editor', 'equipo', false, false, false),
  ('editor', 'productos', true, false, false),
  ('editor', 'paquetes', false, false, false),
  ('editor', 'pagos', false, false, false),
  ('editor', 'metas', false, false, false),
  ('editor', 'portafolio', true, false, false);

-- Client permissions
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_modify) VALUES
  ('client', 'dashboard', true, false, false),
  ('client', 'tablero', true, false, false),
  ('client', 'contenido', true, false, true),
  ('client', 'creadores', false, false, false),
  ('client', 'guiones_ia', false, false, false),
  ('client', 'clientes', false, false, false),
  ('client', 'equipo', false, false, false),
  ('client', 'productos', true, false, false),
  ('client', 'paquetes', true, false, false),
  ('client', 'pagos', true, false, false),
  ('client', 'metas', false, false, false),
  ('client', 'portafolio', true, false, false);

-- Ambassador permissions (same as admin usually)
INSERT INTO public.role_permissions (role, module, can_view, can_create, can_modify) VALUES
  ('ambassador', 'dashboard', true, true, true),
  ('ambassador', 'tablero', true, true, true),
  ('ambassador', 'contenido', true, true, true),
  ('ambassador', 'creadores', true, true, true),
  ('ambassador', 'guiones_ia', true, true, true),
  ('ambassador', 'clientes', true, true, true),
  ('ambassador', 'equipo', true, true, true),
  ('ambassador', 'productos', true, true, true),
  ('ambassador', 'paquetes', true, true, true),
  ('ambassador', 'pagos', true, true, true),
  ('ambassador', 'metas', true, true, true),
  ('ambassador', 'portafolio', true, true, true);

-- Create trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();