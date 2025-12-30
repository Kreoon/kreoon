-- Fix live_feature_flags schema to match app expectations (flag_type/flag_id)

-- 1) Add expected columns
ALTER TABLE public.live_feature_flags
  ADD COLUMN IF NOT EXISTS flag_type TEXT,
  ADD COLUMN IF NOT EXISTS flag_id TEXT,
  ADD COLUMN IF NOT EXISTS enabled_by UUID,
  ADD COLUMN IF NOT EXISTS enabled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMP WITH TIME ZONE;

-- 2) Migrate existing data from legacy columns if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'live_feature_flags'
      AND column_name = 'entity_type'
  ) THEN
    UPDATE public.live_feature_flags
    SET
      flag_type = COALESCE(flag_type, entity_type),
      flag_id   = COALESCE(flag_id, COALESCE(entity_id::text, 'global'))
    WHERE flag_type IS NULL OR flag_id IS NULL;
  END IF;
END $$;

-- 3) Ensure not-null + valid values
ALTER TABLE public.live_feature_flags
  ALTER COLUMN flag_type SET NOT NULL,
  ALTER COLUMN flag_id SET NOT NULL;

-- Keep the allowed values constraint on flag_type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'live_feature_flags_flag_type_check'
  ) THEN
    ALTER TABLE public.live_feature_flags
      ADD CONSTRAINT live_feature_flags_flag_type_check
      CHECK (flag_type IN ('platform','organization','client'));
  END IF;
END $$;

-- 4) Fix unique constraint to match upsert onConflict
ALTER TABLE public.live_feature_flags
  DROP CONSTRAINT IF EXISTS live_feature_flags_entity_type_entity_id_key;

ALTER TABLE public.live_feature_flags
  DROP CONSTRAINT IF EXISTS live_feature_flags_flag_type_flag_id_key;

ALTER TABLE public.live_feature_flags
  ADD CONSTRAINT live_feature_flags_flag_type_flag_id_key
  UNIQUE (flag_type, flag_id);

-- 5) Drop legacy columns now that we've migrated
ALTER TABLE public.live_feature_flags
  DROP COLUMN IF EXISTS entity_type,
  DROP COLUMN IF EXISTS entity_id;

-- 6) Security: enable RLS + policies
ALTER TABLE public.live_feature_flags ENABLE ROW LEVEL SECURITY;

-- Read: authenticated users can read platform flag; org members can read org/client flags for their org
DROP POLICY IF EXISTS "Read live feature flags" ON public.live_feature_flags;
CREATE POLICY "Read live feature flags"
ON public.live_feature_flags
FOR SELECT
USING (
  -- Admins can read everything
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Platform flag is readable by any authenticated user
    auth.uid() IS NOT NULL
    AND flag_type = 'platform'
  )
  OR (
    -- Org flag: org members
    flag_type = 'organization'
    AND is_org_member(auth.uid(), flag_id::uuid)
  )
  OR (
    -- Client flag: members of the client's org
    flag_type = 'client'
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = flag_id::uuid
        AND is_org_member(auth.uid(), c.organization_id)
    )
  )
);

-- Write: admins can manage all; org owners can manage their org + their clients
DROP POLICY IF EXISTS "Manage live feature flags" ON public.live_feature_flags;
CREATE POLICY "Manage live feature flags"
ON public.live_feature_flags
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    flag_type = 'organization'
    AND is_org_owner(auth.uid(), flag_id::uuid)
  )
  OR (
    flag_type = 'client'
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = flag_id::uuid
        AND is_org_owner(auth.uid(), c.organization_id)
    )
  )
  OR (
    flag_type = 'platform'
    AND has_role(auth.uid(), 'admin'::app_role)
  )
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    flag_type = 'organization'
    AND is_org_owner(auth.uid(), flag_id::uuid)
  )
  OR (
    flag_type = 'client'
    AND EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = flag_id::uuid
        AND is_org_owner(auth.uid(), c.organization_id)
    )
  )
  OR (
    flag_type = 'platform'
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Ensure platform row exists for predictable behavior
INSERT INTO public.live_feature_flags (flag_type, flag_id, is_enabled)
VALUES ('platform', 'global', false)
ON CONFLICT (flag_type, flag_id) DO NOTHING;
