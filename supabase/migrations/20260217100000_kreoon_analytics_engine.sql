-- ============================================================
-- KREOON ANALYTICS ENGINE (KAE) - Database Schema
-- Migration: 20260217100000_kreoon_analytics_engine.sql
--
-- Replaces the old KTE (Kreoon Tracking Engine) with a
-- server-side analytics system supporting:
-- - Identity resolution (anonymous_id → user_id)
-- - UTM & click ID capture (fbclid, gclid, ttclid, li_fat_id)
-- - Server-side event forwarding (Meta CAPI, TikTok, Google, LinkedIn)
-- - Conversion funnel tracking
-- ============================================================

-- 1. VISITORS TABLE (pre-signup identity resolution)
CREATE TABLE IF NOT EXISTS public.kae_visitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_id TEXT NOT NULL UNIQUE,

    -- First Touch Attribution
    first_utm_source TEXT,
    first_utm_medium TEXT,
    first_utm_campaign TEXT,
    first_utm_content TEXT,
    first_utm_term TEXT,
    first_referrer TEXT,
    first_landing_page TEXT,

    -- Click IDs (for ad platform matching)
    fbclid TEXT,
    ttclid TEXT,
    gclid TEXT,
    li_fat_id TEXT,

    -- Platform identifiers (browser cookies/pixels)
    fbc TEXT,
    fbp TEXT,
    ttp TEXT,

    -- Device & Geo (enriched server-side)
    user_agent TEXT,
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    region TEXT,
    city TEXT,
    ip_hash TEXT,

    -- Identity resolution
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    converted_at TIMESTAMPTZ,

    -- Timestamps
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.kae_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anonymous_id TEXT NOT NULL REFERENCES public.kae_visitors(anonymous_id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL UNIQUE,

    -- Session-level Attribution (may differ from first touch)
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    referrer TEXT,
    landing_page TEXT,

    -- Session metrics (updated by kae-event-router)
    page_views INTEGER NOT NULL DEFAULT 0,
    events_count INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER NOT NULL DEFAULT 0,

    -- Device & Geo
    device_type TEXT,
    browser TEXT,
    os TEXT,
    country TEXT,
    city TEXT,

    -- Timestamps
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. EVENTS TABLE (PARTITIONED by month)
-- NOTE: PRIMARY KEY must include partition key (created_at)
CREATE TABLE IF NOT EXISTS public.kae_events (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Identity
    anonymous_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id TEXT,

    -- Event
    event_name TEXT NOT NULL,
    event_category TEXT NOT NULL DEFAULT 'interaction',

    -- Event properties (flexible JSONB)
    properties JSONB DEFAULT '{}'::jsonb,

    -- Page context
    page_url TEXT,
    page_path TEXT,
    page_title TEXT,
    page_referrer TEXT,

    -- Device
    device_type TEXT,
    browser TEXT,
    os TEXT,
    screen_width INTEGER,
    screen_height INTEGER,

    -- Geo
    country TEXT,
    region TEXT,
    city TEXT,

    -- Server-side forwarding status
    sent_to_meta BOOLEAN NOT NULL DEFAULT FALSE,
    sent_to_tiktok BOOLEAN NOT NULL DEFAULT FALSE,
    sent_to_google BOOLEAN NOT NULL DEFAULT FALSE,
    sent_to_linkedin BOOLEAN NOT NULL DEFAULT FALSE,

    -- Client timestamp (may differ from server created_at)
    client_timestamp TIMESTAMPTZ,

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create 12 monthly partitions
DO $$
DECLARE
    start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
    partition_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..12 LOOP
        partition_date := start_date + (i || ' months')::INTERVAL;
        partition_name := 'kae_events_' || TO_CHAR(partition_date, 'YYYY_MM');

        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.kae_events
             FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            partition_date,
            partition_date + INTERVAL '1 month'
        );
    END LOOP;
END $$;

-- 4. CONVERSIONS TABLE (high-value funnel events)
-- NOTE: event_id has NO FK to kae_events (can't FK to partitioned table with composite PK)
CREATE TABLE IF NOT EXISTS public.kae_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identity
    anonymous_id TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Reference to source event (no FK, application-level integrity)
    event_id UUID,
    event_created_at TIMESTAMPTZ,

    -- Conversion type (funnel steps)
    conversion_type TEXT NOT NULL CHECK (conversion_type IN (
        'page_view',
        'signup',
        'trial_start',
        'subscription',
        'content_created'
    )),

    -- Value
    value_usd DECIMAL(10,2),
    currency TEXT DEFAULT 'USD',

    -- Attribution snapshot at conversion time
    attributed_source TEXT,
    attributed_medium TEXT,
    attributed_campaign TEXT,
    attribution_model TEXT NOT NULL DEFAULT 'last_touch',

    -- Click IDs for server-side tracking
    fbclid TEXT,
    ttclid TEXT,
    gclid TEXT,
    li_fat_id TEXT,

    -- Server-side tracking response IDs
    meta_event_id TEXT,
    tiktok_event_id TEXT,
    google_conversion_id TEXT,
    linkedin_event_id TEXT,

    -- Timestamps
    converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AD PLATFORMS CONFIG (global, no org_id)
CREATE TABLE IF NOT EXISTS public.kae_ad_platforms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    platform TEXT NOT NULL UNIQUE CHECK (platform IN (
        'meta', 'tiktok', 'google', 'linkedin'
    )),

    enabled BOOLEAN NOT NULL DEFAULT FALSE,

    -- Credentials
    pixel_id TEXT,
    access_token TEXT,
    dataset_id TEXT,
    api_version TEXT,

    -- Testing
    test_mode BOOLEAN NOT NULL DEFAULT TRUE,
    test_event_code TEXT,

    -- Event mapping (KAE event → platform event name)
    event_mapping JSONB NOT NULL DEFAULT '{
        "signup": "CompleteRegistration",
        "trial_start": "StartTrial",
        "subscription": "Purchase",
        "content_created": "CustomEvent"
    }'::jsonb,

    -- Platform-specific config
    config JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. PLATFORM LOGS (API call debugging)
-- NOTE: event_id has NO FK to kae_events (partitioned table)
CREATE TABLE IF NOT EXISTS public.kae_platform_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    platform TEXT NOT NULL,
    event_id UUID,
    event_created_at TIMESTAMPTZ,
    conversion_id UUID REFERENCES public.kae_conversions(id) ON DELETE SET NULL,

    -- Request/Response
    request_payload JSONB,
    response_status INTEGER,
    response_body JSONB,

    -- Status
    success BOOLEAN NOT NULL DEFAULT FALSE,
    error_message TEXT,
    latency_ms INTEGER,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

-- Visitors
CREATE INDEX IF NOT EXISTS idx_kae_visitors_user_id ON public.kae_visitors(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kae_visitors_fbclid ON public.kae_visitors(fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kae_visitors_ttclid ON public.kae_visitors(ttclid) WHERE ttclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kae_visitors_gclid ON public.kae_visitors(gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kae_visitors_first_seen ON public.kae_visitors(first_seen_at DESC);

-- Sessions
CREATE INDEX IF NOT EXISTS idx_kae_sessions_anonymous_id ON public.kae_sessions(anonymous_id);
CREATE INDEX IF NOT EXISTS idx_kae_sessions_user_id ON public.kae_sessions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kae_sessions_started_at ON public.kae_sessions(started_at DESC);

-- Events (indexes are created on the parent, propagated to partitions)
CREATE INDEX IF NOT EXISTS idx_kae_events_anonymous_id ON public.kae_events(anonymous_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kae_events_user_id ON public.kae_events(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kae_events_event_name ON public.kae_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kae_events_category ON public.kae_events(event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kae_events_session ON public.kae_events(session_id, created_at DESC) WHERE session_id IS NOT NULL;

-- Conversions
CREATE INDEX IF NOT EXISTS idx_kae_conversions_user_id ON public.kae_conversions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kae_conversions_type ON public.kae_conversions(conversion_type, converted_at DESC);
CREATE INDEX IF NOT EXISTS idx_kae_conversions_source ON public.kae_conversions(attributed_source, converted_at DESC) WHERE attributed_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kae_conversions_anonymous ON public.kae_conversions(anonymous_id, converted_at DESC);

-- Platform logs
CREATE INDEX IF NOT EXISTS idx_kae_platform_logs_platform ON public.kae_platform_logs(platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kae_platform_logs_success ON public.kae_platform_logs(success, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.kae_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kae_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kae_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kae_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kae_ad_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kae_platform_logs ENABLE ROW LEVEL SECURITY;

-- Platform root admins can read everything (for dashboard)
CREATE POLICY "Platform root can read visitors"
    ON public.kae_visitors FOR SELECT TO authenticated
    USING (public.is_platform_root(auth.uid()));

CREATE POLICY "Platform root can read sessions"
    ON public.kae_sessions FOR SELECT TO authenticated
    USING (public.is_platform_root(auth.uid()));

CREATE POLICY "Platform root can read events"
    ON public.kae_events FOR SELECT TO authenticated
    USING (public.is_platform_root(auth.uid()));

CREATE POLICY "Platform root can read conversions"
    ON public.kae_conversions FOR SELECT TO authenticated
    USING (public.is_platform_root(auth.uid()));

CREATE POLICY "Platform root can manage ad platforms"
    ON public.kae_ad_platforms FOR ALL TO authenticated
    USING (public.is_platform_root(auth.uid()))
    WITH CHECK (public.is_platform_root(auth.uid()));

CREATE POLICY "Platform root can read platform logs"
    ON public.kae_platform_logs FOR SELECT TO authenticated
    USING (public.is_platform_root(auth.uid()));

-- Service role (Edge Functions) can write to all tables
-- Note: service_role bypasses RLS by default in Supabase,
-- but we add explicit policies for clarity

CREATE POLICY "Service can insert visitors"
    ON public.kae_visitors FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service can update visitors"
    ON public.kae_visitors FOR UPDATE TO service_role
    USING (true);

CREATE POLICY "Service can insert sessions"
    ON public.kae_sessions FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service can update sessions"
    ON public.kae_sessions FOR UPDATE TO service_role
    USING (true);

CREATE POLICY "Service can insert events"
    ON public.kae_events FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service can insert conversions"
    ON public.kae_conversions FOR INSERT TO service_role
    WITH CHECK (true);

CREATE POLICY "Service can update conversions"
    ON public.kae_conversions FOR UPDATE TO service_role
    USING (true);

CREATE POLICY "Service can insert platform logs"
    ON public.kae_platform_logs FOR INSERT TO service_role
    WITH CHECK (true);

-- ============================================================
-- GRANTS
-- ============================================================

GRANT SELECT ON public.kae_visitors TO authenticated;
GRANT SELECT ON public.kae_sessions TO authenticated;
GRANT SELECT ON public.kae_events TO authenticated;
GRANT SELECT ON public.kae_conversions TO authenticated;
GRANT ALL ON public.kae_ad_platforms TO authenticated;
GRANT SELECT ON public.kae_platform_logs TO authenticated;

GRANT ALL ON public.kae_visitors TO service_role;
GRANT ALL ON public.kae_sessions TO service_role;
GRANT ALL ON public.kae_events TO service_role;
GRANT ALL ON public.kae_conversions TO service_role;
GRANT ALL ON public.kae_ad_platforms TO service_role;
GRANT ALL ON public.kae_platform_logs TO service_role;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Auto-create future partitions for kae_events
CREATE OR REPLACE FUNCTION public.create_kae_partition()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    start_date DATE := DATE_TRUNC('month', CURRENT_DATE);
    partition_date DATE;
    partition_name TEXT;
BEGIN
    FOR i IN 0..6 LOOP
        partition_date := start_date + (i || ' months')::INTERVAL;
        partition_name := 'kae_events_' || TO_CHAR(partition_date, 'YYYY_MM');

        IF NOT EXISTS (
            SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.kae_events
                 FOR VALUES FROM (%L) TO (%L)',
                partition_name,
                partition_date,
                partition_date + INTERVAL '1 month'
            );
            RAISE NOTICE 'Created partition: %', partition_name;
        END IF;
    END LOOP;
END;
$$;

-- Cleanup old events beyond retention period
CREATE OR REPLACE FUNCTION public.cleanup_old_kae_events(retention_days INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cutoff_date TIMESTAMPTZ;
    deleted_count INTEGER := 0;
    partition_name TEXT;
    partition_date DATE;
BEGIN
    cutoff_date := NOW() - (retention_days || ' days')::INTERVAL;

    -- Drop entire partitions that are fully before the cutoff
    FOR partition_name, partition_date IN
        SELECT c.relname,
               (regexp_match(c.relname, 'kae_events_(\d{4})_(\d{2})'))[1]::INTEGER * 100
               + (regexp_match(c.relname, 'kae_events_(\d{4})_(\d{2})'))[2]::INTEGER
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
        AND c.relname ~ '^kae_events_\d{4}_\d{2}$'
        AND c.relkind = 'r'
    LOOP
        -- Check if the partition's end date is before cutoff
        DECLARE
            part_end DATE;
        BEGIN
            part_end := TO_DATE(
                (regexp_match(partition_name, 'kae_events_(\d{4}_\d{2})'))[1],
                'YYYY_MM'
            ) + INTERVAL '1 month';

            IF part_end < cutoff_date::DATE THEN
                EXECUTE format('DROP TABLE IF EXISTS public.%I', partition_name);
                RAISE NOTICE 'Dropped old partition: %', partition_name;
            END IF;
        END;
    END LOOP;

    -- Delete individual old rows from current partitions
    DELETE FROM public.kae_events WHERE created_at < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$;

-- Funnel statistics query for dashboard
CREATE OR REPLACE FUNCTION public.kae_funnel_stats(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ,
    p_utm_source TEXT DEFAULT NULL
)
RETURNS TABLE (
    step TEXT,
    visitor_count BIGINT,
    conversion_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    total_visitors BIGINT;
BEGIN
    -- Count unique visitors in period
    SELECT COUNT(DISTINCT anonymous_id) INTO total_visitors
    FROM public.kae_events
    WHERE created_at BETWEEN p_start_date AND p_end_date
    AND (p_utm_source IS NULL OR anonymous_id IN (
        SELECT v.anonymous_id FROM public.kae_visitors v
        WHERE v.first_utm_source = p_utm_source
    ));

    RETURN QUERY
    WITH funnel_steps AS (
        SELECT unnest(ARRAY['page_view', 'signup', 'trial_start', 'subscription', 'content_created']) AS step_name,
               unnest(ARRAY[1, 2, 3, 4, 5]) AS step_order
    ),
    step_counts AS (
        SELECT
            'page_view' AS step_name,
            COUNT(DISTINCT e.anonymous_id) AS cnt
        FROM public.kae_events e
        WHERE e.created_at BETWEEN p_start_date AND p_end_date
        AND e.event_name = 'page_view'
        AND (p_utm_source IS NULL OR e.anonymous_id IN (
            SELECT v.anonymous_id FROM public.kae_visitors v WHERE v.first_utm_source = p_utm_source
        ))

        UNION ALL

        SELECT
            c.conversion_type AS step_name,
            COUNT(DISTINCT c.anonymous_id) AS cnt
        FROM public.kae_conversions c
        WHERE c.converted_at BETWEEN p_start_date AND p_end_date
        AND (p_utm_source IS NULL OR c.anonymous_id IN (
            SELECT v.anonymous_id FROM public.kae_visitors v WHERE v.first_utm_source = p_utm_source
        ))
        GROUP BY c.conversion_type
    )
    SELECT
        fs.step_name,
        COALESCE(sc.cnt, 0),
        CASE
            WHEN total_visitors > 0 THEN ROUND((COALESCE(sc.cnt, 0)::NUMERIC / total_visitors) * 100, 2)
            ELSE 0
        END
    FROM funnel_steps fs
    LEFT JOIN step_counts sc ON sc.step_name = fs.step_name
    ORDER BY fs.step_order;
END;
$$;

-- Seed default ad platform configs
INSERT INTO public.kae_ad_platforms (platform, enabled, event_mapping) VALUES
    ('meta', FALSE, '{"signup": "CompleteRegistration", "trial_start": "StartTrial", "subscription": "Purchase", "content_created": "Lead"}'::jsonb),
    ('tiktok', FALSE, '{"signup": "CompleteRegistration", "trial_start": "PlaceAnOrder", "subscription": "CompletePayment", "content_created": "SubmitForm"}'::jsonb),
    ('google', FALSE, '{"signup": "sign_up", "trial_start": "start_trial", "subscription": "purchase", "content_created": "generate_lead"}'::jsonb),
    ('linkedin', FALSE, '{"signup": "REGISTER", "trial_start": "START_TRIAL", "subscription": "PURCHASE", "content_created": "KEY_PAGE_VIEW"}'::jsonb)
ON CONFLICT (platform) DO NOTHING;
