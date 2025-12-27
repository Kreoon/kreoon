-- Enable realtime for config tables so useBlockConfig gets updates
DO $$
BEGIN
  -- content_block_config
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'content_block_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_block_config;
  END IF;
  
  -- content_block_permissions
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'content_block_permissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_block_permissions;
  END IF;
  
  -- content_block_state_rules
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'content_block_state_rules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_block_state_rules;
  END IF;
  
  -- content_advanced_config
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'content_advanced_config'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content_advanced_config;
  END IF;
END $$;

-- Enable REPLICA IDENTITY FULL for realtime to capture all changes
ALTER TABLE public.content_block_config REPLICA IDENTITY FULL;
ALTER TABLE public.content_block_permissions REPLICA IDENTITY FULL;
ALTER TABLE public.content_block_state_rules REPLICA IDENTITY FULL;
ALTER TABLE public.content_advanced_config REPLICA IDENTITY FULL;