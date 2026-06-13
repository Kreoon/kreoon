-- Habilitar replication realtime en tablas de academia.
-- Sin esto, Supabase no emite eventos postgres_changes y el feed/DM/
-- presence/notificaciones no se actualizan en vivo (los users tienen que
-- recargar para ver cambios de otros).

DO $$
DECLARE
  v_tables TEXT[] := ARRAY[
    'academy_posts',
    'academy_post_comments',
    'academy_post_reactions',
    'academy_space_points',
    'academy_space_point_events',
    'academy_notifications',
    'academy_dm_messages',
    'academy_dm_threads',
    'academy_memberships',
    'academy_member_presence',
    'pending_owner_payouts'
  ];
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END $$;

-- REPLICA IDENTITY FULL: necesario para que los eventos UPDATE y DELETE
-- emitan el row anterior completo (sin esto solo emiten PK, lo que rompe
-- filtros por columnas no-PK en postgres_changes).
ALTER TABLE public.academy_posts REPLICA IDENTITY FULL;
ALTER TABLE public.academy_post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.academy_post_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.academy_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.academy_dm_messages REPLICA IDENTITY FULL;
ALTER TABLE public.academy_dm_threads REPLICA IDENTITY FULL;
