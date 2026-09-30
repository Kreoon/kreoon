-- (continua en la misma sesion)
-- ── Nuevo flujo ──
-- T14 resolucion por servidor, sin fallback
RESET ROLE; SET ROLE anon;
INSERT INTO pg_temp.results SELECT 'T14 get_registration_org open', public.get_registration_org('org-a')->>'status'='open', '';
INSERT INTO pg_temp.results SELECT 'T15 get_registration_org closed', public.get_registration_org('org-b')->>'status'='closed', '';
INSERT INTO pg_temp.results SELECT 'T16 slug inexistente => not_found (sin fallback)', public.get_registration_org('nope')->>'status'='not_found' AND public.get_registration_org('nope')->'organization' IS NULL, '';
INSERT INTO pg_temp.results SELECT 'T17 slug con mayusculas/espacios normaliza', public.get_registration_org('  ORG-A ')->>'status'='open', '';
-- T18 anon no ejecuta complete_creator_signup
DO $$ BEGIN
  BEGIN PERFORM public.complete_creator_signup('org-a','{}'); INSERT INTO pg_temp.results VALUES ('T18 anon no completa alta', false, '');
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO pg_temp.results VALUES ('T18 anon no completa alta', true, SQLERRM); END; END $$;

-- T19 sin consentimientos => consents_required y NO se crea membresia
SET ROLE authenticated; SELECT pg_temp.as_user(:'NEWU');
DO $$ BEGIN
  BEGIN PERFORM public.complete_creator_signup('org-a','{}'); INSERT INTO pg_temp.results VALUES ('T19 exige consentimientos', false, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T19 exige consentimientos', SQLERRM LIKE 'consents_required%', SQLERRM); END; END $$;
RESET ROLE;
INSERT INTO pg_temp.results SELECT 'T20 sin consentimiento no hay membresia', count(*)=0, '' FROM public.organization_members WHERE user_id=:'NEWU';

-- T21 un documento de cliente NO cuenta como requerido de creador; alta completa OK
SET ROLE authenticated; SELECT pg_temp.as_user(:'NEWU');
INSERT INTO pg_temp.results SELECT 'T21 alta joined con docs de creador', (r->>'status')='joined', r::text
  FROM (SELECT public.complete_creator_signup('org-a',
        ARRAY['d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002']::uuid[],
        '{"utm_source":"ig","utm_medium":"bio","rol":"admin","ref":"ABC"}'::jsonb) r) s;
RESET ROLE;
INSERT INTO pg_temp.results SELECT 'T22 rol asignado por servidor = content_creator', count(*)=1, '' FROM public.organization_members WHERE user_id=:'NEWU' AND organization_id=:'ORG_A' AND role='content_creator' AND NOT is_owner;
INSERT INTO pg_temp.results SELECT 'T23 atribucion filtrada por lista blanca', signup_attribution = '{"utm_source":"ig","utm_medium":"bio","ref":"ABC"}'::jsonb, signup_attribution::text FROM public.organization_members WHERE user_id=:'NEWU';
INSERT INTO pg_temp.results SELECT 'T24 consentimientos con version del servidor', count(*)=2 AND bool_and(document_version IN ('v1.0','1.0')), '' FROM public.user_legal_consents WHERE user_id=:'NEWU';

-- T25 idempotencia: reintento no duplica
SET ROLE authenticated; SELECT pg_temp.as_user(:'NEWU');
INSERT INTO pg_temp.results SELECT 'T25 reintento => already_member', (public.complete_creator_signup('org-a','{}')->>'status')='already_member', '';
RESET ROLE;
INSERT INTO pg_temp.results SELECT 'T26 sin duplicados', (SELECT count(*) FROM public.organization_members WHERE user_id=:'NEWU')=1 AND (SELECT count(*) FROM public.organization_member_roles WHERE user_id=:'NEWU')=1, '';

-- T27 org cerrada => registration_closed, sin membresia
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
DO $$ BEGIN
  BEGIN PERFORM public.complete_creator_signup('org-b', ARRAY['d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002']::uuid[], NULL, true);
    INSERT INTO pg_temp.results VALUES ('T27 org cerrada rechaza alta', false, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T27 org cerrada rechaza alta', SQLERRM='registration_closed', SQLERRM); END; END $$;

-- T28 identidad con membresia en otra org: requiere confirmacion explicita
RESET ROLE;
UPDATE public.organizations SET is_registration_open=true WHERE id=:'ORG_B';
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
INSERT INTO pg_temp.results SELECT 'T28 multi-org sin explicito => needs_confirmation', (public.complete_creator_signup('org-b', ARRAY['d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002']::uuid[])->>'status')='needs_confirmation', '';
RESET ROLE;
INSERT INTO pg_temp.results SELECT 'T29 needs_confirmation no crea membresia', count(*)=0, '' FROM public.organization_members WHERE user_id='00000000-0000-0000-0000-0000000000a2' AND organization_id=:'ORG_B';
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
INSERT INTO pg_temp.results SELECT 'T30 multi-org explicito => joined', (public.complete_creator_signup('org-b', ARRAY['d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002']::uuid[], NULL, true)->>'status')='joined', '';
RESET ROLE;
INSERT INTO pg_temp.results SELECT 'T31 multi-org no pisa organizacion activa', current_organization_id IS NULL OR current_organization_id<>:'ORG_B'::uuid, coalesce(current_organization_id::text,'null') FROM public.profiles WHERE id='00000000-0000-0000-0000-0000000000a2';

-- T32 alias de slug resuelve a la misma organizacion
INSERT INTO public.organization_slug_aliases(alias, organization_id) VALUES ('kreoon-legacy', :'ORG_A');
SET ROLE anon;
INSERT INTO pg_temp.results SELECT 'T32 alias resuelve a la misma org', public.get_registration_org('kreoon-legacy')->'organization'->>'id' = :'ORG_A', '';
-- T33 alias table no legible por anon
DO $$ BEGIN
  BEGIN PERFORM 1 FROM public.organization_slug_aliases; INSERT INTO pg_temp.results VALUES ('T33 alias no expuesta', false, '');
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO pg_temp.results VALUES ('T33 alias no expuesta', true, ''); END; END $$;

-- T34 default org unica
RESET ROLE;
UPDATE public.organizations SET is_default_registration_org=true WHERE id=:'ORG_A';
DO $$ BEGIN
  BEGIN UPDATE public.organizations SET is_default_registration_org=true WHERE id='bbbbbbbb-0000-0000-0000-00000000000b';
    INSERT INTO pg_temp.results VALUES ('T34 solo una org predeterminada', false, '');
  EXCEPTION WHEN unique_violation THEN INSERT INTO pg_temp.results VALUES ('T34 solo una org predeterminada', true, ''); END; END $$;
INSERT INTO pg_temp.results SELECT 'T35 get_default_registration_org', public.get_default_registration_org()->>'slug'='org-a', '';


-- T36-T40 estado de la identidad (solo lectura)
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
RESET ROLE;
DELETE FROM public.organization_members WHERE user_id='00000000-0000-0000-0000-0000000000c1';
DELETE FROM public.organization_member_roles WHERE user_id='00000000-0000-0000-0000-0000000000c1';
DELETE FROM public.user_legal_consents WHERE user_id='00000000-0000-0000-0000-0000000000c1';
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
INSERT INTO pg_temp.results SELECT 'T36 estado: no miembro, 2 docs pendientes, sin otras membresias',
  (s->>'is_member')::boolean = false AND jsonb_array_length(s->'missing_documents') = 2 AND (s->>'has_other_memberships')::boolean = false, s::text
  FROM (SELECT public.get_my_creator_signup_state('org-a') s) x;
RESET ROLE;
INSERT INTO pg_temp.results SELECT 'T37 consultar el estado NO crea membresia', count(*)=0, '' FROM public.organization_members WHERE user_id='00000000-0000-0000-0000-0000000000c1';
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
INSERT INTO pg_temp.results SELECT 'T38 estado: ya miembro de A', (public.get_my_creator_signup_state('org-a')->>'is_member')::boolean, '';
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
INSERT INTO pg_temp.results SELECT 'T38b estado: admin de A consultando B => otras membresias, no miembro',
  (s->>'has_other_memberships')::boolean AND NOT (s->>'is_member')::boolean, s::text
  FROM (SELECT public.get_my_creator_signup_state('org-b') s) x;
SET ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM public.get_my_creator_signup_state('org-a'); INSERT INTO pg_temp.results VALUES ('T39 anon no consulta estado', false, '');
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO pg_temp.results VALUES ('T39 anon no consulta estado', true, ''); END; END $$;
RESET ROLE;
