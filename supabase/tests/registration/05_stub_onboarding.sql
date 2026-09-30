-- Extension del esquema simulado: perfiles, creator_profiles y los triggers VIVOS (antes de la migracion 3).
ALTER TABLE public.profiles
  ADD COLUMN user_type text, ADD COLUMN onboarding_completed boolean DEFAULT false,
  ADD COLUMN legal_consents_completed boolean DEFAULT false, ADD COLUMN platform_access_unlocked boolean DEFAULT false,
  ADD COLUMN bio text, ADD COLUMN avatar_url text, ADD COLUMN city text, ADD COLUMN country text,
  ADD COLUMN content_categories text[], ADD COLUMN languages text[], ADD COLUMN instagram text, ADD COLUMN tiktok text,
  ADD COLUMN phone text, ADD COLUMN address text, ADD COLUMN document_type text, ADD COLUMN document_number text, ADD COLUMN username text;

CREATE TABLE public.creator_profiles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid UNIQUE NOT NULL, display_name text,
  bio text, avatar_url text, location_city text, location_country text, categories text[] DEFAULT '{}', languages text[],
  social_links jsonb, is_available boolean, is_active boolean DEFAULT true, is_published boolean DEFAULT true,
  platforms text[], marketplace_roles text[], content_types text[] DEFAULT '{}', builder_has_draft boolean DEFAULT false);
CREATE TABLE public.profile_builder_blocks (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), profile_id uuid, is_draft boolean);
CREATE TABLE public.clients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text, contact_email text, contact_phone text,
  user_id uuid, organization_id uuid, created_by uuid, country text, city text, address text, document_type text,
  document_number text, username text, is_public boolean, is_internal_brand boolean);
CREATE TABLE public.client_users (client_id uuid, user_id uuid, role text, created_by uuid, UNIQUE(client_id,user_id));
GRANT SELECT,UPDATE ON public.creator_profiles TO authenticated;

-- Triggers VIVOS (copiados de pg_get_functiondef, 2026-09-30)
CREATE FUNCTION public.auto_create_creator_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
BEGIN
  INSERT INTO public.creator_profiles (user_id, display_name, bio, avatar_url, location_city, location_country, categories, languages,
    social_links, is_available, is_active, platforms, marketplace_roles, content_types)
  VALUES (NEW.id, COALESCE(NULLIF(TRIM(NEW.full_name), ''), 'Creador'), NEW.bio, NEW.avatar_url, NEW.city, COALESCE(NEW.country,'CO'),
    COALESCE(NEW.content_categories,'{}'::text[]), COALESCE(NEW.languages,'{es}'::text[]),
    jsonb_strip_nulls(jsonb_build_object('instagram', NULLIF(NEW.instagram,''), 'tiktok', NULLIF(NEW.tiktok,''))),
    true, true, '{}'::text[], '{}'::text[], '{}'::text[])
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW; END $f$;
CREATE TRIGGER trigger_auto_create_creator_profile AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_create_creator_profile();

CREATE FUNCTION public.auto_create_client_from_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
DECLARE v_org_id uuid; v_client_id uuid;
BEGIN
  IF NEW.user_type != 'client' THEN RETURN NEW; END IF;
  IF NEW.onboarding_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF OLD.onboarding_completed IS TRUE THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM clients WHERE user_id = NEW.id) THEN RETURN NEW; END IF;
  SELECT organization_id INTO v_org_id FROM organization_members WHERE user_id = NEW.id LIMIT 1;
  IF v_org_id IS NULL THEN SELECT id INTO v_org_id FROM organizations ORDER BY 1 LIMIT 1; END IF;
  INSERT INTO public.clients (name, contact_email, user_id, organization_id, created_by, is_public, is_internal_brand)
  SELECT COALESCE(NEW.full_name,'Cliente'), u.email, NEW.id, v_org_id, NEW.id, true, false FROM auth.users u WHERE u.id = NEW.id
  RETURNING id INTO v_client_id;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RAISE WARNING 'x %', SQLERRM; RETURN NEW; END $f$;
CREATE TRIGGER trg_auto_create_client_on_onboarding AFTER UPDATE OF onboarding_completed ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_create_client_from_profile();

CREATE FUNCTION public.publish_profile_blocks(profile_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $f$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM creator_profiles WHERE id = publish_profile_blocks.profile_id AND user_id = auth.uid()) THEN RAISE EXCEPTION 'No autorizado'; END IF;
  UPDATE creator_profiles SET builder_has_draft = false WHERE id = publish_profile_blocks.profile_id; RETURN true; END $f$;
GRANT EXECUTE ON FUNCTION public.publish_profile_blocks(uuid) TO authenticated;
