-- ============================================================
-- Campaign Optimization: Templates, Smart Match, Credits, Case Studies
-- ============================================================

-- 1A. Add missing campaign_purpose column (sent from frontend but not in DB)
ALTER TABLE marketplace_campaigns ADD COLUMN IF NOT EXISTS campaign_purpose TEXT;

-- 1B. Campaign Templates table
CREATE TABLE IF NOT EXISTS campaign_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_emoji TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK (category IN ('ugc','social','review','event','collab')),
  default_budget_min INT NOT NULL DEFAULT 100,
  default_budget_max INT NOT NULL DEFAULT 2000,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  default_content_types JSONB NOT NULL DEFAULT '[]',
  default_platforms JSONB NOT NULL DEFAULT '[]',
  default_deliverables JSONB NOT NULL DEFAULT '[]',
  default_timeline_days INT NOT NULL DEFAULT 14,
  suggested_creator_count INT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1C. ALTER marketplace_campaigns: template support + quick campaign + smart match
ALTER TABLE marketplace_campaigns
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES campaign_templates(id),
  ADD COLUMN IF NOT EXISTS is_quick_campaign BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS smart_match_score JSONB;

-- 1D. ALTER brands: first campaign tracking + B2B referral
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS first_campaign_used BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referred_by_brand_id UUID REFERENCES brands(id);

-- 1E. Brand Credits table
CREATE TABLE IF NOT EXISTS brand_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  lifetime_earned NUMERIC(12,2) NOT NULL DEFAULT 0,
  lifetime_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1F. Brand Credit Transactions table
CREATE TABLE IF NOT EXISTS brand_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('earned','spent','expired')),
  source TEXT NOT NULL CHECK (source IN ('referral','promo','manual')),
  description TEXT,
  related_campaign_id UUID REFERENCES marketplace_campaigns(id),
  related_brand_id UUID REFERENCES brands(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1G. Campaign Case Studies table
CREATE TABLE IF NOT EXISTS campaign_case_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketplace_campaigns(id) ON DELETE CASCADE UNIQUE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary_html TEXT,
  metrics JSONB DEFAULT '{}',
  creator_highlights JSONB DEFAULT '[]',
  gallery_urls TEXT[] DEFAULT '{}',
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  slug TEXT UNIQUE,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1H. RPC: smart_match_creators
CREATE OR REPLACE FUNCTION smart_match_creators(p_campaign_id UUID)
RETURNS TABLE (
  creator_id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  slug TEXT,
  rating_avg NUMERIC,
  completed_projects INT,
  match_score INT,
  match_reasons TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_content_types JSONB;
  v_category TEXT;
  v_min_rating NUMERIC;
BEGIN
  -- Get campaign requirements
  SELECT
    mc.content_requirements,
    mc.category,
    COALESCE((mc.creator_requirements->>'min_rating')::numeric, 0)
  INTO v_content_types, v_category, v_min_rating
  FROM marketplace_campaigns mc
  WHERE mc.id = p_campaign_id;

  IF v_category IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    cp.id AS creator_id,
    cp.user_id,
    cp.display_name,
    cp.avatar_url,
    cp.slug,
    COALESCE(cp.rating_avg, 0) AS rating_avg,
    COALESCE(cp.completed_projects, 0)::INT AS completed_projects,
    -- Score calculation (0-100)
    (
      -- Category match: 40 points
      CASE WHEN v_category = ANY(cp.categories) THEN 40 ELSE 0 END
      -- Rating bonus: up to 30 points
      + LEAST(30, (COALESCE(cp.rating_avg, 0) * 6)::INT)
      -- Completed projects bonus: up to 20 points
      + LEAST(20, COALESCE(cp.completed_projects, 0) * 2)
      -- Response time penalty: -10 if slow
      - CASE WHEN COALESCE(cp.response_time_hours, 48) > 24 THEN 10 ELSE 0 END
    )::INT AS match_score,
    -- Match reasons
    ARRAY_REMOVE(ARRAY[
      CASE WHEN v_category = ANY(cp.categories) THEN 'Categoría: ' || v_category END,
      CASE WHEN COALESCE(cp.rating_avg, 0) >= 4.5 THEN 'Rating ' || ROUND(cp.rating_avg, 1) || '+' END,
      CASE WHEN COALESCE(cp.completed_projects, 0) >= 5 THEN cp.completed_projects || ' proyectos completados' END,
      CASE WHEN COALESCE(cp.response_time_hours, 48) <= 12 THEN 'Respuesta rápida' END
    ], NULL) AS match_reasons
  FROM creator_profiles cp
  WHERE cp.is_available = true
    AND COALESCE(cp.rating_avg, 0) >= v_min_rating
  ORDER BY match_score DESC, cp.rating_avg DESC NULLS LAST
  LIMIT 20;
END;
$$;

-- 1I. RPC: apply_first_campaign_promo
CREATE OR REPLACE FUNCTION apply_first_campaign_promo(p_brand_id UUID, p_campaign_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_used BOOLEAN;
BEGIN
  SELECT first_campaign_used INTO v_used FROM brands WHERE id = p_brand_id;

  IF v_used IS TRUE THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Promo ya utilizada');
  END IF;

  -- Set 0% commission on campaign
  UPDATE marketplace_campaigns
  SET commission_rate = 0
  WHERE id = p_campaign_id;

  -- Mark brand as having used the promo
  UPDATE brands
  SET first_campaign_used = true
  WHERE id = p_brand_id;

  RETURN jsonb_build_object('success', true, 'commission_rate', 0);
END;
$$;

-- 1J. Trigger: auto-generate case study on campaign completion
CREATE OR REPLACE FUNCTION auto_generate_case_study()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_brand_id UUID;
  v_title TEXT;
  v_total_deliveries INT;
  v_avg_rating NUMERIC;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get brand info
    v_brand_id := NEW.brand_id;
    v_title := NEW.title;

    -- Count deliveries and average rating for this campaign
    SELECT
      COUNT(*)::INT,
      COALESCE(AVG(NULLIF(ca.rating, 0)), 0)
    INTO v_total_deliveries, v_avg_rating
    FROM campaign_applications ca
    WHERE ca.campaign_id = NEW.id
      AND ca.status = 'completed';

    -- Insert case study draft
    INSERT INTO campaign_case_studies (campaign_id, brand_id, title, metrics, slug)
    VALUES (
      NEW.id,
      v_brand_id,
      'Caso de Éxito: ' || v_title,
      jsonb_build_object(
        'total_deliveries', v_total_deliveries,
        'avg_rating', ROUND(v_avg_rating, 1),
        'budget', COALESCE(NEW.total_budget, NEW.budget_per_video),
        'currency', COALESCE(NEW.currency, 'USD'),
        'campaign_type', NEW.campaign_type,
        'duration_days', EXTRACT(DAY FROM (now() - NEW.created_at))::INT
      ),
      'caso-' || SUBSTR(NEW.id::TEXT, 1, 8)
    )
    ON CONFLICT (campaign_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_case_study ON marketplace_campaigns;
CREATE TRIGGER trg_auto_case_study
  AFTER UPDATE ON marketplace_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_case_study();

-- 1K. Trigger: award B2B referral credit
CREATE OR REPLACE FUNCTION award_brand_referral_credit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.referred_by_brand_id IS NOT NULL THEN
    -- Ensure referring brand has a credits row
    INSERT INTO brand_credits (brand_id, balance, lifetime_earned)
    VALUES (NEW.referred_by_brand_id, 50, 50)
    ON CONFLICT (brand_id)
    DO UPDATE SET
      balance = brand_credits.balance + 50,
      lifetime_earned = brand_credits.lifetime_earned + 50,
      updated_at = now();

    -- Record the transaction
    INSERT INTO brand_credit_transactions (brand_id, amount, type, source, description, related_brand_id)
    VALUES (
      NEW.referred_by_brand_id,
      50,
      'earned',
      'referral',
      'Referido B2B: nueva marca registrada',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_brand_referral_credit ON brands;
CREATE TRIGGER trg_brand_referral_credit
  AFTER INSERT ON brands
  FOR EACH ROW
  EXECUTE FUNCTION award_brand_referral_credit();

-- ============================================================
-- 1L. RLS Policies + GRANTs
-- ============================================================

ALTER TABLE campaign_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_case_studies ENABLE ROW LEVEL SECURITY;

-- campaign_templates: readable by all authenticated users
CREATE POLICY "templates_select" ON campaign_templates
  FOR SELECT TO authenticated USING (true);

-- brand_credits: accessible by brand members
CREATE POLICY "brand_credits_select" ON brand_credits
  FOR SELECT TO authenticated
  USING (is_brand_member(brand_id));

CREATE POLICY "brand_credits_update" ON brand_credits
  FOR UPDATE TO authenticated
  USING (is_brand_admin(brand_id));

-- brand_credit_transactions: accessible by brand members
CREATE POLICY "brand_credit_tx_select" ON brand_credit_transactions
  FOR SELECT TO authenticated
  USING (is_brand_member(brand_id));

-- campaign_case_studies: public read when published, full CRUD for brand admin
CREATE POLICY "case_studies_public_read" ON campaign_case_studies
  FOR SELECT USING (is_published = true);

CREATE POLICY "case_studies_brand_all" ON campaign_case_studies
  FOR ALL TO authenticated
  USING (is_brand_admin(brand_id));

-- GRANTs
GRANT ALL ON campaign_templates TO authenticated;
GRANT ALL ON campaign_templates TO service_role;
GRANT ALL ON brand_credits TO authenticated;
GRANT ALL ON brand_credits TO service_role;
GRANT ALL ON brand_credit_transactions TO authenticated;
GRANT ALL ON brand_credit_transactions TO service_role;
GRANT ALL ON campaign_case_studies TO authenticated;
GRANT ALL ON campaign_case_studies TO service_role;

-- ============================================================
-- Seed: 6 Campaign Templates
-- ============================================================

INSERT INTO campaign_templates (slug, name, description, icon_emoji, category, default_budget_min, default_budget_max, default_content_types, default_platforms, default_deliverables, default_timeline_days, suggested_creator_count, sort_order)
VALUES
  ('ugc-producto', 'UGC de Producto', 'Contenido generado por usuarios mostrando tu producto en acción', '📱', 'ugc', 200, 2000,
   '["UGC","Reels/TikTok"]'::jsonb, '["instagram","tiktok"]'::jsonb,
   '[{"content_type":"UGC","quantity":3,"description":"Video corto mostrando el producto"}]'::jsonb,
   14, 5, 1),
  ('resena-redes', 'Reseña en Redes', 'Reseñas auténticas de creadores en sus redes sociales', '⭐', 'review', 100, 1000,
   '["Reseña","Testimonio"]'::jsonb, '["instagram","tiktok","youtube"]'::jsonb,
   '[{"content_type":"Reseña","quantity":1,"description":"Reseña honesta del producto/servicio"}]'::jsonb,
   7, 3, 2),
  ('unboxing', 'Unboxing', 'Videos de unboxing y primera impresión del producto', '📦', 'ugc', 150, 1500,
   '["Unboxing","Reels/TikTok"]'::jsonb, '["instagram","tiktok","youtube"]'::jsonb,
   '[{"content_type":"Unboxing","quantity":1,"description":"Video de unboxing con primera impresión"}]'::jsonb,
   10, 3, 3),
  ('tutorial', 'Tutorial de Producto', 'Tutoriales educativos mostrando cómo usar tu producto', '🎓', 'social', 300, 2500,
   '["Tutorial","Reels/TikTok"]'::jsonb, '["youtube","instagram","tiktok"]'::jsonb,
   '[{"content_type":"Tutorial","quantity":1,"description":"Tutorial paso a paso del producto"}]'::jsonb,
   21, 5, 4),
  ('evento', 'Cobertura de Evento', 'Creadores cubriendo tu evento o activación de marca', '🎉', 'event', 500, 5000,
   '["UGC","Reels/TikTok"]'::jsonb, '["instagram","tiktok"]'::jsonb,
   '[{"content_type":"UGC","quantity":5,"description":"Cobertura del evento en formato corto"}]'::jsonb,
   30, 10, 5),
  ('collab-creativa', 'Collab Creativa', 'Colaboración creativa libre con el creador', '🎨', 'collab', 400, 3000,
   '["UGC","Reels/TikTok","VSL"]'::jsonb, '["instagram","tiktok","youtube"]'::jsonb,
   '[{"content_type":"UGC","quantity":2,"description":"Contenido creativo colaborativo"}]'::jsonb,
   21, 5, 6)
ON CONFLICT (slug) DO NOTHING;
