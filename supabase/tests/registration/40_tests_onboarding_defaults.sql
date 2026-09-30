-- Corre ANTES y DESPUES de la migracion 3: los fallos "antes" evidencian P1-P3.
RESET ROLE;
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-0000-0000-0000000000e1','nuevo_creador@test.dev'),('00000000-0000-0000-0000-0000000000e2','nuevo_cliente@test.dev');
INSERT INTO public.profiles(id,email,full_name) VALUES ('00000000-0000-0000-0000-0000000000e1','nuevo_creador@test.dev','Nuevo Creador'),('00000000-0000-0000-0000-0000000000e2','nuevo_cliente@test.dev','Nuevo Cliente');

-- P1 un perfil nuevo NO nace publico
INSERT INTO pg_temp.results SELECT 'T41 P1 perfil nuevo nace sin publicar', NOT is_active AND NOT is_published, 'is_active='||is_active||' is_published='||is_published
  FROM public.creator_profiles WHERE user_id='00000000-0000-0000-0000-0000000000e1';

-- P2 publicar explicitamente activa la visibilidad; otro usuario no puede publicar el perfil ajeno
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
DO $$ DECLARE pid uuid; BEGIN
  SELECT id INTO pid FROM public.creator_profiles WHERE user_id='00000000-0000-0000-0000-0000000000e1';
  PERFORM public.publish_profile_blocks(pid);
  INSERT INTO pg_temp.results SELECT 'T42 P2 publicar activa is_active e is_published', is_active AND is_published, '' FROM public.creator_profiles WHERE id=pid;
END $$;
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
DO $$ DECLARE pid uuid; BEGIN
  SELECT id INTO pid FROM public.creator_profiles WHERE user_id='00000000-0000-0000-0000-0000000000e1';
  BEGIN PERFORM public.publish_profile_blocks(pid); INSERT INTO pg_temp.results VALUES ('T42b no se publica perfil ajeno', false, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T42b no se publica perfil ajeno', SQLERRM='No autorizado', SQLERRM); END; END $$;
RESET ROLE;

-- P3 user_type NULL (creador) no genera empresa; user_type='client' si
UPDATE public.profiles SET onboarding_completed=true WHERE id='00000000-0000-0000-0000-0000000000e1';
INSERT INTO pg_temp.results SELECT 'T43 P3 creador con user_type NULL no crea cliente', count(*)=0, 'clientes='||count(*) FROM public.clients WHERE user_id='00000000-0000-0000-0000-0000000000e1';
UPDATE public.profiles SET user_type='client' WHERE id='00000000-0000-0000-0000-0000000000e2';
UPDATE public.profiles SET onboarding_completed=true WHERE id='00000000-0000-0000-0000-0000000000e2';
INSERT INTO pg_temp.results SELECT 'T43b cliente real sigue generando su empresa (sin regresion)', count(*)=1, '' FROM public.clients WHERE user_id='00000000-0000-0000-0000-0000000000e2';

-- T60-T62 membresias de marca (hueco H6)
RESET ROLE;
INSERT INTO public.brands(id,name,owner_id) VALUES ('bb000000-0000-0000-0000-000000000001','Marca Ajena','00000000-0000-0000-0000-0000000000b1');
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
DO $$ BEGIN
  BEGIN INSERT INTO public.brand_members(brand_id,user_id,role,status) VALUES ('bb000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a2','owner','active');
    INSERT INTO pg_temp.results VALUES ('T60 H6 un usuario NO se hace owner de una marca ajena', false, 'se inserto');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T60 H6 un usuario NO se hace owner de una marca ajena', true, SQLERRM); END; END $$;
-- el propietario crea su marca y su auto-membresia (ClientDashboard/Upgrade)
INSERT INTO public.brands(id,name,owner_id) VALUES ('bb000000-0000-0000-0000-000000000002','Mi Marca','00000000-0000-0000-0000-0000000000a2');
DO $$ BEGIN
  BEGIN INSERT INTO public.brand_members(brand_id,user_id,role,status) VALUES ('bb000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000a2','owner','active');
    INSERT INTO pg_temp.results VALUES ('T61 el propietario agrega su auto-membresia en su marca', true, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T61 el propietario agrega su auto-membresia en su marca', false, SQLERRM); END; END $$;
-- root crea marca con otro owner y su membresia (BrandsCRM)
SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
DO $$ BEGIN
  BEGIN
    INSERT INTO public.brands(id,name,owner_id) VALUES ('bb000000-0000-0000-0000-000000000003','Marca CRM','00000000-0000-0000-0000-0000000000c1');
    INSERT INTO public.brand_members(brand_id,user_id,role,status) VALUES ('bb000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000c1','owner','active');
    INSERT INTO pg_temp.results VALUES ('T62 el propietario de la plataforma crea marca+membresia de otra persona (CRM)', true, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T62 el propietario de la plataforma crea marca+membresia de otra persona (CRM)', false, SQLERRM); END; END $$;
RESET ROLE;

-- A1: nadie se asigna por PATCH una organizacion de la que no es miembro (corre antes y despues)
RESET ROLE;
SET ROLE authenticated; SELECT pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');  -- admin de A, NO miembro de B
DO $$ BEGIN
  BEGIN UPDATE public.profiles SET current_organization_id='bbbbbbbb-0000-0000-0000-00000000000b' WHERE id='00000000-0000-0000-0000-0000000000a1';
    INSERT INTO pg_temp.results VALUES ('T80 A1 no se fija una organizacion ajena por PATCH', false, 'se actualizo');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T80 A1 no se fija una organizacion ajena por PATCH', SQLERRM LIKE 'forbidden%', SQLERRM); END; END $$;
DO $$ BEGIN
  BEGIN UPDATE public.profiles SET current_organization_id='aaaaaaaa-0000-0000-0000-00000000000a', bio='hola' WHERE id='00000000-0000-0000-0000-0000000000a1';
    INSERT INTO pg_temp.results VALUES ('T81 A1 un miembro SI fija su organizacion y edita su perfil (sin regresion)', true, '');
  EXCEPTION WHEN others THEN INSERT INTO pg_temp.results VALUES ('T81 A1 un miembro SI fija su organizacion y edita su perfil (sin regresion)', false, SQLERRM); END; END $$;
RESET ROLE;
