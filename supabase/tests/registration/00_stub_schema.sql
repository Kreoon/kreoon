-- Esquema minimo que imita la base viva (solo lo que tocan las migraciones del relanzamiento).
-- Uso: solo en un Postgres descartable. NUNCA contra produccion.
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
-- auth.uid() como en Supabase: lee request.jwt.claims
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub','')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

CREATE TYPE public.app_role AS ENUM ('admin','creator','editor','client','team_leader','content_creator','student','strategist');

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, slug text UNIQUE NOT NULL, logo_url text, description text,
  is_registration_open boolean DEFAULT false, registration_require_invite boolean DEFAULT true,
  is_blocked boolean DEFAULT false, deleted_at timestamptz, default_role public.app_role DEFAULT 'creator',
  registration_code text, admin_email text);
CREATE TABLE public.profiles (id uuid PRIMARY KEY, email text, full_name text, current_organization_id uuid,
  organization_status text NOT NULL DEFAULT 'active', active_role text, is_active boolean DEFAULT true);
CREATE TABLE public.organization_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id), user_id uuid, role public.app_role NOT NULL DEFAULT 'creator',
  is_owner boolean DEFAULT false, deleted_at timestamptz, invited_by uuid, UNIQUE(organization_id,user_id));
CREATE TABLE public.organization_member_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid, user_id uuid, role public.app_role, UNIQUE(organization_id,user_id,role));
CREATE TABLE public.organization_join_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid, user_id uuid, requested_role public.app_role, status text DEFAULT 'pending',
  reviewed_by uuid, reviewed_at timestamptz, updated_at timestamptz);
CREATE TABLE public.legal_documents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), document_type text, version text, title text,
  summary text, content_html text, is_current boolean DEFAULT true);
CREATE TABLE public.legal_consent_requirements (document_type text, account_type text, user_role text, is_required boolean,
  trigger_event text, display_order int);
CREATE TABLE public.user_legal_consents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id),
  document_id uuid REFERENCES public.legal_documents(id), document_type text NOT NULL, document_version text NOT NULL,
  accepted boolean NOT NULL DEFAULT false, accepted_at timestamptz, ip_address inet, user_agent text, consent_method text,
  is_current boolean, UNIQUE(user_id,document_id));

-- Helpers identicos en firma/logica a los vivos
CREATE FUNCTION public.is_platform_root(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
$$ SELECT EXISTS (SELECT 1 FROM auth.users WHERE id=_user_id AND email='root@test.dev') $$;
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
CREATE FUNCTION public.is_org_owner(_user_id uuid, _org_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
$$ SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id=_user_id AND organization_id=_org_id AND is_owner) $$;
CREATE FUNCTION public.is_org_admin(_org_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
$$ SELECT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=_org_id AND user_id=auth.uid() AND role IN ('admin','team_leader')) $$;
CREATE FUNCTION public.get_my_organization_ids() RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER AS
$$ SELECT organization_id FROM public.organization_members WHERE user_id=auth.uid() $$;
CREATE FUNCTION public.list_registration_documents(p_account_type text)
RETURNS TABLE(document_id uuid, document_type text, title text, version text, summary text, content_html text)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT ld.id, ld.document_type, ld.title, ld.version, ld.summary, ld.content_html FROM public.legal_documents ld
  WHERE ld.is_current AND EXISTS (SELECT 1 FROM public.legal_consent_requirements r WHERE r.document_type=ld.document_type
    AND r.is_required AND r.trigger_event='registration' AND (r.account_type IS NULL OR r.account_type=p_account_type)) $$;

-- Policies vivas relevantes ANTES de la migracion (copiadas de pg_policies, 2026-09-30)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_member_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_public_read_organizations ON public.organizations FOR SELECT TO public USING (true);
CREATE POLICY "Platform admins can create organizations" ON public.organizations FOR INSERT TO public WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Platform admins can manage all organizations" ON public.organizations FOR ALL TO public USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "System can insert members on registration" ON public.organization_members FOR INSERT TO public
  WITH CHECK (user_id = auth.uid() AND role='creator' AND COALESCE(is_owner,false)=false);
CREATE POLICY "Admins can manage members" ON public.organization_members FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));
CREATE POLICY "Members can view org members" ON public.organization_members FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage org roles" ON public.organization_member_roles FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));
CREATE POLICY "Admins can manage roles" ON public.organization_member_roles FOR ALL TO authenticated
  USING (organization_id IN (SELECT public.get_my_organization_ids()));
CREATE POLICY "Org owners can manage members" ON public.organization_members FOR ALL TO public USING (public.is_org_owner(auth.uid(), organization_id));
GRANT SELECT ON public.organizations TO anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.organization_members, public.organization_member_roles, public.organizations TO authenticated;
GRANT SELECT,UPDATE ON public.profiles TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

-- Funciones vivas vulnerables (H1, H4) tal como estan hoy
CREATE FUNCTION public.approve_join_request(request_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
DECLARE v_request RECORD; BEGIN
  SELECT * INTO v_request FROM organization_join_requests WHERE id = request_id AND status = 'pending';
  IF NOT FOUND THEN RETURN FALSE; END IF;
  INSERT INTO organization_members (organization_id, user_id, is_owner, invited_by) VALUES (v_request.organization_id, v_request.user_id, false, auth.uid()) ON CONFLICT DO NOTHING;
  INSERT INTO organization_member_roles (organization_id, user_id, role) VALUES (v_request.organization_id, v_request.user_id, v_request.requested_role) ON CONFLICT DO NOTHING;
  UPDATE organization_join_requests SET status='approved' WHERE id=request_id; RETURN TRUE; END $f$;
CREATE FUNCTION public.register_user_to_organization(p_organization_id uuid, p_user_id uuid, p_role text DEFAULT 'creator')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN RETURN true; END $$;
