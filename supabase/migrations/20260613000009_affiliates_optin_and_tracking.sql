-- ============================================================================
-- Affiliates hardening:
-- 1. affiliates_enabled opt-in en academy_spaces (default false).
-- 2. get_or_create_affiliate_link valida opt-in + usa commission_pct del space.
-- 3. Click tracking append-only + dedup (link, ip_hash, día) + RLS.
-- 4. track_affiliate_click solo service_role (lo invoca edge function que valida
--    Origin/Referer y hashea IP).
-- ============================================================================

ALTER TABLE public.academy_spaces
  ADD COLUMN IF NOT EXISTS affiliates_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS affiliates_default_commission_pct NUMERIC(5,2) NOT NULL DEFAULT 20
    CHECK (affiliates_default_commission_pct >= 0 AND affiliates_default_commission_pct <= 50);

CREATE OR REPLACE FUNCTION public.get_or_create_affiliate_link(p_space_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_link RECORD;
  v_code TEXT;
  v_default_pct NUMERIC;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501'; END IF;
  SELECT affiliates_default_commission_pct INTO v_default_pct
    FROM academy_spaces
   WHERE id = p_space_id AND status = 'active' AND is_public = true AND affiliates_enabled = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'affiliates_not_enabled' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_link FROM academy_affiliate_links
   WHERE space_id = p_space_id AND user_id = auth.uid();
  IF FOUND THEN RETURN to_jsonb(v_link); END IF;

  v_code := UPPER(SUBSTRING(MD5(auth.uid()::text || p_space_id::text || NOW()::text) FROM 1 FOR 8));
  INSERT INTO academy_affiliate_links (space_id, user_id, code, commission_pct)
  VALUES (p_space_id, auth.uid(), v_code, v_default_pct)
  RETURNING * INTO v_link;
  RETURN to_jsonb(v_link);
END; $func$;

CREATE TABLE IF NOT EXISTS public.academy_affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES public.academy_affiliate_links(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  user_agent_hash TEXT,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (link_id, ip_hash, day)
);

CREATE INDEX IF NOT EXISTS idx_aff_clicks_link_day
  ON public.academy_affiliate_clicks(link_id, day);

ALTER TABLE public.academy_affiliate_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aff_clicks_visible_via_link" ON public.academy_affiliate_clicks;
CREATE POLICY "aff_clicks_visible_via_link"
  ON public.academy_affiliate_clicks FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM academy_affiliate_links l
                 WHERE l.id = link_id
                   AND (l.user_id = auth.uid()
                        OR EXISTS (SELECT 1 FROM academy_spaces s WHERE s.id = l.space_id AND s.owner_id = auth.uid()))));

GRANT SELECT ON public.academy_affiliate_clicks TO authenticated;

CREATE OR REPLACE FUNCTION public.track_affiliate_click(
  p_code TEXT,
  p_space_id UUID,
  p_ip_hash TEXT,
  p_user_agent_hash TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $func$
DECLARE
  v_link_id UUID;
  v_inserted BOOLEAN := false;
BEGIN
  IF p_ip_hash IS NULL OR LENGTH(p_ip_hash) < 8 THEN RETURN false; END IF;
  SELECT id INTO v_link_id FROM academy_affiliate_links
   WHERE space_id = p_space_id AND code = p_code AND is_active = true;
  IF NOT FOUND THEN RETURN false; END IF;

  INSERT INTO academy_affiliate_clicks (link_id, ip_hash, user_agent_hash)
  VALUES (v_link_id, p_ip_hash, p_user_agent_hash)
  ON CONFLICT (link_id, ip_hash, day) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  v_inserted := (v_inserted::int > 0);

  IF v_inserted THEN
    UPDATE academy_affiliate_links
       SET clicks = (SELECT COUNT(*) FROM academy_affiliate_clicks WHERE link_id = v_link_id)
     WHERE id = v_link_id;
  END IF;
  RETURN v_inserted;
END; $func$;

REVOKE EXECUTE ON FUNCTION public.track_affiliate_click(TEXT, UUID, TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_affiliate_click(TEXT, UUID, TEXT, TEXT) TO service_role;

DROP FUNCTION IF EXISTS public.track_affiliate_click(TEXT, UUID);
