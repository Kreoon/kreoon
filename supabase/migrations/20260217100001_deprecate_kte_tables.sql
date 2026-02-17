-- ============================================================
-- DEPRECATE KTE (Kreoon Tracking Engine) Tables
-- Renames old tables with _deprecated suffix.
-- Data is preserved for 30 days before manual DROP.
-- ============================================================

-- Disable triggers on old tables before renaming
DROP TRIGGER IF EXISTS update_organization_tracking_config_updated_at ON public.organization_tracking_config;
DROP TRIGGER IF EXISTS update_organization_tracking_integrations_updated_at ON public.organization_tracking_integrations;

-- Drop old RLS policies (they reference old table names)
DROP POLICY IF EXISTS "Users can insert tracking events" ON public.tracking_events;
DROP POLICY IF EXISTS "Admins can read tracking events" ON public.tracking_events;
DROP POLICY IF EXISTS "Users can view own org config" ON public.organization_tracking_config;
DROP POLICY IF EXISTS "Admins can manage tracking config" ON public.organization_tracking_config;
DROP POLICY IF EXISTS "Admins can manage tracking integrations" ON public.organization_tracking_integrations;
DROP POLICY IF EXISTS "Members can view tracking integrations" ON public.organization_tracking_integrations;
DROP POLICY IF EXISTS "Members can view AI insights" ON public.tracking_ai_insights;
DROP POLICY IF EXISTS "Admins can manage AI insights" ON public.tracking_ai_insights;
DROP POLICY IF EXISTS "Anyone can read event definitions" ON public.tracking_event_definitions;
DROP POLICY IF EXISTS "Admins can manage event definitions" ON public.tracking_event_definitions;

-- Drop partition-level RLS policies
DO $$
DECLARE
    part_name TEXT;
BEGIN
    FOR part_name IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname ~ '^tracking_events_\d{4}_\d{2}$'
        AND c.relkind = 'r'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Users can view own tracking events ' || replace(substring(part_name from 'tracking_events_(.*)'), '_', '_'),
            part_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
            'Users can insert own tracking events ' || replace(substring(part_name from 'tracking_events_(.*)'), '_', '_'),
            part_name);
    END LOOP;
END $$;

-- Drop old helper functions
DROP FUNCTION IF EXISTS public.create_tracking_partition();
DROP FUNCTION IF EXISTS public.cleanup_old_tracking_events();

-- Rename tables (preserves data)
ALTER TABLE IF EXISTS public.organization_tracking_config RENAME TO kte_organization_tracking_config_deprecated;
ALTER TABLE IF EXISTS public.organization_tracking_integrations RENAME TO kte_organization_tracking_integrations_deprecated;
ALTER TABLE IF EXISTS public.organization_ai_insights_config RENAME TO kte_organization_ai_insights_config_deprecated;
ALTER TABLE IF EXISTS public.tracking_ai_insights RENAME TO kte_tracking_ai_insights_deprecated;
ALTER TABLE IF EXISTS public.tracking_event_definitions RENAME TO kte_tracking_event_definitions_deprecated;

-- Rename partitioned events table and all its partitions
-- The partitions are automatically renamed with the parent
ALTER TABLE IF EXISTS public.tracking_events RENAME TO kte_tracking_events_deprecated;

-- Disable RLS on deprecated tables (no longer needed)
ALTER TABLE IF EXISTS public.kte_organization_tracking_config_deprecated DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kte_organization_tracking_integrations_deprecated DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kte_organization_ai_insights_config_deprecated DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kte_tracking_ai_insights_deprecated DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kte_tracking_event_definitions_deprecated DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.kte_tracking_events_deprecated DISABLE ROW LEVEL SECURITY;

-- Add a comment for when to drop these tables
COMMENT ON TABLE public.kte_tracking_events_deprecated IS 'DEPRECATED: Safe to DROP after 2026-03-17. Replaced by kae_events.';
COMMENT ON TABLE public.kte_organization_tracking_config_deprecated IS 'DEPRECATED: Safe to DROP after 2026-03-17. Replaced by kae_ad_platforms.';
