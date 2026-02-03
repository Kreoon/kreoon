CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- =============================================
-- ARQUITECTURA MULTI-TENANT: ORGANIZACIONES
-- =============================================

-- 1. Crear tabla de organizaciones
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  description text,
  registration_link text UNIQUE,
  is_registration_open boolean DEFAULT false,
  default_role app_role DEFAULT 'creator',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  settings jsonb DEFAULT '{}'::jsonb
);

-- 2. Crear tabla de miembros de organización
CREATE TABLE public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'creator',
  is_owner boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  invited_by uuid REFERENCES auth.users(id),
  UNIQUE(organization_id, user_id)
);

-- 3. Crear tabla de estados personalizados por organización
CREATE TABLE public.organization_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status_key text NOT NULL,
  label text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(organization_id, status_key)
);

-- 4. Crear tabla de invitaciones
CREATE TABLE public.organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role app_role NOT NULL DEFAULT 'creator',
  token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE(organization_id, email)
);

-- 5. Agregar organization_id a profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_organization_id uuid REFERENCES public.organizations(id);

-- 6. Agregar organization_id a content
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 7. Agregar organization_id a clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id);

-- 8. Habilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNCIONES HELPER
-- =============================================

-- Función para generar slug único
CREATE OR REPLACE FUNCTION public.generate_org_slug(org_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g'));
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'org-' || substr(md5(random()::text), 1, 6);
  END IF;
  
  base_slug := substr(base_slug, 1, 30);
  final_slug := base_slug;
  
  WHILE EXISTS(SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter::text;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Función para verificar membresía en organización
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Función para verificar si es owner de organización
CREATE OR REPLACE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND is_owner = true
  )
$$;

-- Función para obtener organizaciones del usuario
CREATE OR REPLACE FUNCTION public.get_user_organizations(_user_id uuid)
RETURNS TABLE(
  organization_id uuid,
  organization_name text,
  organization_slug text,
  user_role app_role,
  is_owner boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    o.id,
    o.name,
    o.slug,
    om.role,
    om.is_owner
  FROM public.organizations o
  INNER JOIN public.organization_members om ON o.id = om.organization_id
  WHERE om.user_id = _user_id
  ORDER BY om.is_owner DESC, o.name ASC
$$;

-- Función para generar link de registro
CREATE OR REPLACE FUNCTION public.generate_registration_link(_org_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_link text;
BEGIN
  new_link := encode(gen_random_bytes(16), 'hex');
  
  UPDATE public.organizations
  SET registration_link = new_link
  WHERE id = _org_id;
  
  RETURN new_link;
END;
$$;

-- =============================================
-- POLÍTICAS RLS
-- =============================================

-- Políticas para organizations
CREATE POLICY "Users can view their organizations"
ON public.organizations FOR SELECT
USING (is_org_member(auth.uid(), id));

CREATE POLICY "Platform admins can view all organizations"
ON public.organizations FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Platform admins can create organizations"
ON public.organizations FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Org owners can update their organization"
ON public.organizations FOR UPDATE
USING (is_org_owner(auth.uid(), id));

CREATE POLICY "Platform admins can manage all organizations"
ON public.organizations FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Políticas para organization_members
CREATE POLICY "Members can view org members"
ON public.organization_members FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Platform admins can view all members"
ON public.organization_members FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Org owners can manage members"
ON public.organization_members FOR ALL
USING (is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage all members"
ON public.organization_members FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert members on registration"
ON public.organization_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Políticas para organization_statuses
CREATE POLICY "Members can view org statuses"
ON public.organization_statuses FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage statuses"
ON public.organization_statuses FOR ALL
USING (is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage all statuses"
ON public.organization_statuses FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Políticas para organization_invitations
CREATE POLICY "Members can view org invitations"
ON public.organization_invitations FOR SELECT
USING (is_org_member(auth.uid(), organization_id));

CREATE POLICY "Org owners can manage invitations"
ON public.organization_invitations FOR ALL
USING (is_org_owner(auth.uid(), organization_id));

CREATE POLICY "Platform admins can manage all invitations"
ON public.organization_invitations FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view invitation by token"
ON public.organization_invitations FOR SELECT
USING (token IS NOT NULL AND expires_at > now());

-- =============================================
-- ÍNDICES
-- =============================================

CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_statuses_org ON public.organization_statuses(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_org ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(token);
CREATE INDEX IF NOT EXISTS idx_content_org ON public.content(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_current_org ON public.profiles(current_organization_id);

-- =============================================
-- TRIGGER PARA ACTUALIZAR updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.update_organization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.update_organization_updated_at();

-- =============================================
-- HABILITAR REALTIME
-- =============================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.organizations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_statuses;