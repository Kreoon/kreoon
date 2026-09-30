\set ON_ERROR_STOP on
-- Helpers de prueba
CREATE OR REPLACE FUNCTION pg_temp.as_user(u uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN PERFORM set_config('request.jwt.claims', json_build_object('sub',u)::text, false); END $$;
CREATE TEMP TABLE results(name text, ok boolean, detail text);
GRANT ALL ON results TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO PUBLIC;

\set A_ADMIN '00000000-0000-0000-0000-0000000000a1'
\set A_CREATOR '00000000-0000-0000-0000-0000000000a2'
\set B_ADMIN '00000000-0000-0000-0000-0000000000b1'
\set NEWU '00000000-0000-0000-0000-0000000000c1'
\set ROOT '00000000-0000-0000-0000-0000000000d1'
\set ORG_A 'aaaaaaaa-0000-0000-0000-00000000000a'
\set ORG_B 'bbbbbbbb-0000-0000-0000-00000000000b'

-- T1 (H2) un creador de A NO puede insertarse como miembro de B por PostgREST directo
SET ROLE authenticated; SELECT pg_temp.as_user(:'A_CREATOR');
DO $$ BEGIN
  BEGIN INSERT INTO public.organization_members(organization_id,user_id,role) VALUES ('bbbbbbbb-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000a2','creator');
    INSERT INTO pg_temp.results VALUES ('T1 insert directo en otra org bloqueado', false, 'se inserto');
  EXCEPTION WHEN insufficient_privilege OR check_violation OR others THEN
    INSERT INTO pg_temp.results VALUES ('T1 insert directo en otra org bloqueado', true, SQLERRM); END; END $$;

-- T2 (H3) un creador de A NO puede auto-promoverse a admin en A
DO $$ DECLARE n int; BEGIN
  UPDATE public.organization_members SET role='admin' WHERE user_id='00000000-0000-0000-0000-0000000000a2' AND organization_id='aaaaaaaa-0000-0000-0000-00000000000a';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO pg_temp.results VALUES ('T2 creador no puede auto-promoverse', n=0, 'filas='||n); END $$;

-- T3 (H3) un creador de A NO puede asignarse rol admin en member_roles
DO $$ BEGIN
  BEGIN INSERT INTO public.organization_member_roles(organization_id,user_id,role) VALUES ('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000a2','admin');
    INSERT INTO pg_temp.results VALUES ('T3 creador no puede insertarse rol admin', false, 'se inserto');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T3 creador no puede insertarse rol admin', true, SQLERRM); END; END $$;

-- T4 (H3) admin de B NO puede tocar miembros de A (aislamiento A/B)
SELECT pg_temp.as_user(:'B_ADMIN');
DO $$ DECLARE n int; BEGIN
  UPDATE public.organization_members SET role='client' WHERE organization_id='aaaaaaaa-0000-0000-0000-00000000000a' AND user_id='00000000-0000-0000-0000-0000000000a2';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO pg_temp.results VALUES ('T4 admin de B no modifica miembros de A', n=0, 'filas='||n); END $$;

-- T5 admin de A SI puede gestionar miembros de A (no-owner)
SELECT pg_temp.as_user(:'A_ADMIN');
DO $$ DECLARE n int; BEGIN
  UPDATE public.organization_members SET role='editor' WHERE organization_id='aaaaaaaa-0000-0000-0000-00000000000a' AND user_id='00000000-0000-0000-0000-0000000000a2';
  GET DIAGNOSTICS n = ROW_COUNT;
  INSERT INTO pg_temp.results VALUES ('T5 admin de A gestiona A', n=1, 'filas='||n); END $$;
UPDATE public.organization_members SET role='content_creator' WHERE user_id='00000000-0000-0000-0000-0000000000a2';

-- T6 (H5) un admin no root no crea organizaciones; root si
DO $$ BEGIN
  BEGIN INSERT INTO public.organizations(name,slug) VALUES ('X','x'); INSERT INTO pg_temp.results VALUES ('T6 no-root no crea org', false, 'creo');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T6 no-root no crea org', true, SQLERRM); END; END $$;
SELECT pg_temp.as_user(:'ROOT');
DO $$ BEGIN
  BEGIN INSERT INTO public.organizations(name,slug) VALUES ('Y','y'); INSERT INTO pg_temp.results VALUES ('T7 root crea org', true, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T7 root crea org', false, SQLERRM); END; END $$;

-- T8 (H1) anon NO puede aprobar solicitudes; un creador tampoco; admin de A si, admin de B no
RESET ROLE;
INSERT INTO public.organization_join_requests(id,organization_id,user_id,requested_role)
  VALUES ('e0000000-0000-0000-0000-000000000001', :'ORG_A', :'NEWU', 'content_creator');
SET ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM public.approve_join_request('e0000000-0000-0000-0000-000000000001');
    INSERT INTO pg_temp.results VALUES ('T8 anon no ejecuta approve_join_request', false, 'ejecuto');
  EXCEPTION WHEN insufficient_privilege THEN INSERT INTO pg_temp.results VALUES ('T8 anon no ejecuta approve_join_request', true, SQLERRM); END; END $$;
SET ROLE authenticated;
SELECT pg_temp.as_user(:'A_CREATOR');
DO $$ BEGIN
  BEGIN PERFORM public.approve_join_request('e0000000-0000-0000-0000-000000000001');
    INSERT INTO pg_temp.results VALUES ('T9 creador no aprueba solicitudes', false, 'aprobo');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T9 creador no aprueba solicitudes', SQLERRM LIKE 'forbidden%', SQLERRM); END; END $$;
SELECT pg_temp.as_user(:'B_ADMIN');
DO $$ BEGIN
  BEGIN PERFORM public.approve_join_request('e0000000-0000-0000-0000-000000000001');
    INSERT INTO pg_temp.results VALUES ('T10 admin de B no aprueba solicitud de A', false, 'aprobo');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T10 admin de B no aprueba solicitud de A', SQLERRM LIKE 'forbidden%', SQLERRM); END; END $$;
SELECT pg_temp.as_user(:'A_ADMIN');
INSERT INTO pg_temp.results SELECT 'T11 admin de A aprueba su solicitud', public.approve_join_request('e0000000-0000-0000-0000-000000000001'), '';
RESET ROLE;
DELETE FROM public.organization_members WHERE user_id=:'NEWU';
DELETE FROM public.organization_member_roles WHERE user_id=:'NEWU';

-- T12 register_user_to_organization: rol no-creador rechazado; org cerrada rechazada
SET ROLE authenticated; SELECT pg_temp.as_user(:'NEWU');
DO $$ BEGIN
  BEGIN PERFORM public.register_user_to_organization('aaaaaaaa-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c1','editor');
    INSERT INTO pg_temp.results VALUES ('T12 register_user_to_organization rechaza rol editor', false, 'acepto');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T12 register_user_to_organization rechaza rol editor', SQLERRM LIKE 'forbidden%', SQLERRM); END; END $$;
DO $$ BEGIN
  BEGIN PERFORM public.register_user_to_organization('bbbbbbbb-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000c1','creator');
    INSERT INTO pg_temp.results VALUES ('T13 register_user_to_organization rechaza org cerrada', false, 'acepto');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T13 register_user_to_organization rechaza org cerrada', SQLERRM LIKE 'forbidden%', SQLERRM); END; END $$;

