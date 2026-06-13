-- BUG ROOT CAUSE: 30 tablas academy_* fueron creadas sin GRANT a service_role.
-- Consecuencia: cualquier Edge Function que usa SUPABASE_SERVICE_ROLE_KEY
-- recibe "permission denied for table" al tocar esas tablas → 500 silencioso.
--
-- Caso confirmado: stripe-academy-portal fallaba en SELECT academy_spaces.
-- Otros candidatos afectados: stripe-academy-subscribe,
-- stripe-reconcile-academy-subs, stripe-webhook (webhook de checkout academy),
-- cleanup jobs, sync de course progress, etc.
--
-- Fix: GRANT ALL para service_role en todas las tablas academy_*.
-- Service role bypassa RLS, así que no afecta seguridad cliente-side.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name LIKE 'academy_%'
  LOOP
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t.table_name);
  END LOOP;
END $$;

-- Sequences y functions del schema accesibles para service_role.
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Defaults para futuras tablas: cualquier tabla nueva en public hereda grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;
