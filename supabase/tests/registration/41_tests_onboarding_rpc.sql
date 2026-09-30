-- Solo despues de la migracion 3: RPC de guardado progresivo.
RESET ROLE;
-- e3 = creador miembro de A, sin nada mas; e4 = cliente miembro de A
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-0000000000e3','creador3@test.dev'),('00000000-0000-0000-0000-0000000000e4','cliente4@test.dev');
INSERT INTO public.profiles(id,email,full_name) VALUES ('00000000-0000-0000-0000-0000000000e3','creador3@test.dev','Creador Tres'),('00000000-0000-0000-0000-0000000000e4','cliente4@test.dev','Cliente Cuatro');
INSERT INTO public.organization_members(organization_id,user_id,role) VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000e3','content_creator'),
  ('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000e4','client');

SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000e4');
DO $$ BEGIN
  BEGIN PERFORM public.save_creator_onboarding_progress('Hola'); INSERT INTO pg_temp.results VALUES ('T44 cliente no usa el onboarding de creadores', false, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T44 cliente no usa el onboarding de creadores', SQLERRM LIKE 'forbidden%', SQLERRM); END; END $$;

SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000e3');
SELECT public.save_creator_onboarding_progress('Ana Creadora', 'https://cdn.example.com/a.jpg', ARRAY['UGC','Reels/TikTok','<script>','  ', 'Reseña', 'UGC']);
RESET ROLE;
INSERT INTO pg_temp.results SELECT 'T45 guarda nombre publico, foto y tipos (sanitizados, sin duplicados)',
  display_name='Ana Creadora' AND avatar_url='https://cdn.example.com/a.jpg' AND content_types @> ARRAY['UGC','Reels/TikTok','Reseña'] AND cardinality(content_types)=3, content_types::text
  FROM public.creator_profiles WHERE user_id='00000000-0000-0000-0000-0000000000e3';
INSERT INTO pg_temp.results SELECT 'T46 guardar progreso NO publica', NOT is_active AND NOT is_published, '' FROM public.creator_profiles WHERE user_id='00000000-0000-0000-0000-0000000000e3';
INSERT INTO pg_temp.results SELECT 'T47 fija user_type=talent y sincroniza avatar en profiles', user_type='talent' AND avatar_url='https://cdn.example.com/a.jpg', '' FROM public.profiles WHERE id='00000000-0000-0000-0000-0000000000e3';

SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000e3');
DO $$ BEGIN
  BEGIN PERFORM public.save_creator_onboarding_progress(NULL,'http://inseguro.test/a.jpg'); INSERT INTO pg_temp.results VALUES ('T48 rechaza avatar no https', false, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T48 rechaza avatar no https', SQLERRM='invalid_avatar_url', SQLERRM); END; END $$;
DO $$ BEGIN
  BEGIN PERFORM public.save_creator_onboarding_progress('x'); INSERT INTO pg_temp.results VALUES ('T49 rechaza nombre demasiado corto', false, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T49 rechaza nombre demasiado corto', SQLERRM='invalid_display_name', SQLERRM); END; END $$;

-- documentos pendientes y aceptacion (creador existente que nunca acepto)
INSERT INTO pg_temp.results SELECT 'T49b get_my_pending_registration_documents lista los 2 pendientes', count(*)=2, count(*)::text FROM public.get_my_pending_registration_documents();
DO $$ DECLARE n int; BEGIN
  n := public.accept_registration_documents(ARRAY['d0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000001']::uuid[]);
  INSERT INTO pg_temp.results VALUES ('T49c accept ignora documentos que no son de creador (client_agreement) y acepta los validos', n=1, 'aceptados='||n);
END $$;
INSERT INTO pg_temp.results SELECT 'T49d tras aceptar queda 1 pendiente', count(*)=1, '' FROM public.get_my_pending_registration_documents();
RESET ROLE;
DELETE FROM public.user_legal_consents WHERE user_id='00000000-0000-0000-0000-0000000000e3';
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000e3');

-- finish exige consentimientos
DO $$ BEGIN
  BEGIN PERFORM public.finish_creator_onboarding(); INSERT INTO pg_temp.results VALUES ('T50 finish sin consentimientos falla', false, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T50 finish sin consentimientos falla', SQLERRM LIKE 'consents_required%', SQLERRM); END; END $$;
RESET ROLE;
INSERT INTO public.user_legal_consents(user_id,document_id,document_type,document_version,accepted,accepted_at,consent_method)
  SELECT '00000000-0000-0000-0000-0000000000e3', d.document_id, d.document_type, d.version, true, now(), 'registration' FROM public.list_registration_documents('talent') d;
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000e3');
SELECT public.finish_creator_onboarding();
RESET ROLE;
INSERT INTO pg_temp.results SELECT 'T51 finish marca onboarding completo', onboarding_completed AND legal_consents_completed AND platform_access_unlocked, '' FROM public.profiles WHERE id='00000000-0000-0000-0000-0000000000e3';
INSERT INTO pg_temp.results SELECT 'T52 finish NO publica ni crea cliente', (SELECT NOT is_active AND NOT is_published FROM public.creator_profiles WHERE user_id='00000000-0000-0000-0000-0000000000e3') AND (SELECT count(*)=0 FROM public.clients WHERE user_id='00000000-0000-0000-0000-0000000000e3'), '';
SET ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM public.finish_creator_onboarding(); INSERT INTO pg_temp.results VALUES ('T53 anon no ejecuta finish', false, '');
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO pg_temp.results VALUES ('T53 anon no ejecuta finish', true, ''); END; END $$;
RESET ROLE;

-- ══ Revisión adversarial ══
RESET ROLE;
-- M1: org abierta pero con invitación obligatoria => cerrada para el registro público
INSERT INTO public.organizations(id,name,slug,is_registration_open,registration_require_invite) VALUES ('cccccccc-0000-0000-0000-00000000000c','Org C','org-c',true,true);
SET ROLE anon;
INSERT INTO pg_temp.results SELECT 'T70 M1 org con invitacion obligatoria aparece cerrada', public.get_registration_org('org-c')->>'status'='closed', '';
RESET ROLE; SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000e4');
DO $$ BEGIN
  BEGIN PERFORM public.complete_creator_signup('org-c', ARRAY['d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002']::uuid[], NULL, true);
    INSERT INTO pg_temp.results VALUES ('T71 M1 no se une a una org con invitacion obligatoria', false, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T71 M1 no se une a una org con invitacion obligatoria', SQLERRM='registration_closed', SQLERRM); END; END $$;

-- M2: un admin no puede degradar ni borrar al owner
RESET ROLE;
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-0000000000f1','owner_a@test.dev'),('00000000-0000-0000-0000-0000000000f2','tl_a@test.dev');
INSERT INTO public.profiles(id,email,full_name) VALUES ('00000000-0000-0000-0000-0000000000f1','owner_a@test.dev','Owner A'),('00000000-0000-0000-0000-0000000000f2','tl_a@test.dev','TL A');
INSERT INTO public.organization_members(organization_id,user_id,role,is_owner) VALUES ('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000f1','admin',true),('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000f2','team_leader',false);
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
DO $$ DECLARE n int; BEGIN
  UPDATE public.organization_members SET is_owner=false WHERE user_id='00000000-0000-0000-0000-0000000000f1'; GET DIAGNOSTICS n=ROW_COUNT;
  INSERT INTO pg_temp.results VALUES ('T72 M2 team_leader no degrada al owner', n=0, 'filas='||n);
  DELETE FROM public.organization_members WHERE user_id='00000000-0000-0000-0000-0000000000f1'; GET DIAGNOSTICS n=ROW_COUNT;
  INSERT INTO pg_temp.results VALUES ('T73 M2 team_leader no borra al owner', n=0, 'filas='||n);
END $$;

-- M6: miembro soft-deleted no se reactiva solo
RESET ROLE;
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-0000000000f6','retirado@test.dev'); INSERT INTO public.profiles(id,email,full_name) VALUES ('00000000-0000-0000-0000-0000000000f6','retirado@test.dev','Retirado');
INSERT INTO public.organization_members(organization_id,user_id,role,deleted_at) VALUES ('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000f6','content_creator',now());
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000f6');
DO $$ BEGIN
  BEGIN PERFORM public.complete_creator_signup('org-a', ARRAY['d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002']::uuid[], NULL, true);
    INSERT INTO pg_temp.results VALUES ('T74 M6 miembro retirado no se reincorpora solo', false, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T74 M6 miembro retirado no se reincorpora solo', SQLERRM='registration_closed', SQLERRM); END; END $$;

-- Consentimiento previo con accepted=false se actualiza
RESET ROLE;
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-0000000000f3','falso@test.dev'); INSERT INTO public.profiles(id,email,full_name) VALUES ('00000000-0000-0000-0000-0000000000f3','falso@test.dev','Falso');
INSERT INTO public.user_legal_consents(user_id,document_id,document_type,document_version,accepted) VALUES ('00000000-0000-0000-0000-0000000000f3','d0000000-0000-0000-0000-000000000001','general_terms','v1.0',false);
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000f3');
SELECT public.complete_creator_signup('org-a', ARRAY['d0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002']::uuid[]);
RESET ROLE;
INSERT INTO pg_temp.results SELECT 'T75 consentimiento accepted=false queda aceptado', bool_and(accepted), '' FROM public.user_legal_consents WHERE user_id='00000000-0000-0000-0000-0000000000f3';

-- M3: register_user_to_organization
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000e3');
DO $$ BEGIN
  BEGIN PERFORM public.register_user_to_organization('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000e3','client');
    INSERT INTO pg_temp.results VALUES ('T76 M3 cuenta sin marca/cliente no entra como client', false, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T76 M3 cuenta sin marca/cliente no entra como client', SQLERRM LIKE 'forbidden%', SQLERRM); END; END $$;
RESET ROLE;
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-0000000000f4','marca@test.dev'); INSERT INTO public.profiles(id,email,full_name) VALUES ('00000000-0000-0000-0000-0000000000f4','marca@test.dev','Marca Indep');
INSERT INTO public.brands(id,name,owner_id) VALUES ('bb000000-0000-0000-0000-000000000009','Indep','00000000-0000-0000-0000-0000000000f4');
INSERT INTO public.brand_members(brand_id,user_id,role) VALUES ('bb000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-0000000000f4','owner');
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000f4');
INSERT INTO pg_temp.results SELECT 'T77 M3 marca independiente existente SI completa su onboarding legado (sin regresion)', public.register_user_to_organization('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000f4','client'), '';
RESET ROLE;
-- creador sin consentimientos no entra por el wrapper
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-0000000000f5','sinconsent@test.dev'); INSERT INTO public.profiles(id,email,full_name) VALUES ('00000000-0000-0000-0000-0000000000f5','sinconsent@test.dev','Sin Consent');
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000f5');
DO $$ BEGIN
  BEGIN PERFORM public.register_user_to_organization('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000f5','content_creator');
    INSERT INTO pg_temp.results VALUES ('T78 M3 el wrapper no salta los consentimientos', false, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T78 M3 el wrapper no salta los consentimientos', SQLERRM LIKE '%consents%', SQLERRM); END; END $$;
RESET ROLE;
