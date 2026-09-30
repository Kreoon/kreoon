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
