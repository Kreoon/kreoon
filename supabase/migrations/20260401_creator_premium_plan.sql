-- =====================================================
-- Creator Premium Plan: Sistema de features por plan
-- =====================================================

-- 1. Agregar nuevo tier al enum (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'creator_premium' AND enumtypid = 'subscription_tier'::regtype) THEN
    ALTER TYPE subscription_tier ADD VALUE 'creator_premium';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- El tipo no existe, lo creamos completo
    CREATE TYPE subscription_tier AS ENUM (
      'brand_free', 'brand_starter', 'brand_pro', 'brand_business',
      'creator_free', 'creator_pro', 'creator_premium',
      'org_starter', 'org_pro', 'org_enterprise'
    );
END $$;

-- 2. Tabla de features por plan
CREATE TABLE IF NOT EXISTS plan_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier text NOT NULL,
  feature_key text NOT NULL,
  feature_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(tier, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_tier ON plan_features(tier);

-- 3. Insertar features para Creator Free
INSERT INTO plan_features (tier, feature_key, feature_value) VALUES
('creator_free', 'max_blocks', '5'),
('creator_free', 'allowed_blocks', '["hero_banner", "about", "portfolio", "contact"]'),
('creator_free', 'show_branding', 'true'),
('creator_free', 'reveal_socials', 'false'),
('creator_free', 'reveal_contact', '"none"'),
('creator_free', 'max_templates', '1'),
('creator_free', 'allowed_templates', '["minimalista"]'),
('creator_free', 'max_colors', '4'),
('creator_free', 'max_fonts', '1'),
('creator_free', 'preview_days', '0'),
('creator_free', 'ai_bio_generator', 'false'),
('creator_free', 'ai_seo_optimizer', 'false'),
('creator_free', 'ai_content_suggestions', 'false'),
('creator_free', 'analytics_level', '"basic"'),
('creator_free', 'priority_support', 'false'),
('creator_free', 'premium_badge', 'false'),
('creator_free', 'custom_css', 'false'),
('creator_free', 'portfolio_max_items', '6')
ON CONFLICT (tier, feature_key) DO UPDATE SET feature_value = EXCLUDED.feature_value;

-- 4. Insertar features para Creator Pro
INSERT INTO plan_features (tier, feature_key, feature_value) VALUES
('creator_pro', 'max_blocks', '10'),
('creator_pro', 'allowed_blocks', '["hero_banner", "about", "portfolio", "contact", "stats", "reviews", "services", "faq", "text_block", "divider", "spacer", "social_links"]'),
('creator_pro', 'show_branding', 'false'),
('creator_pro', 'reveal_socials', 'true'),
('creator_pro', 'reveal_contact', '"email_only"'),
('creator_pro', 'max_templates', '3'),
('creator_pro', 'allowed_templates', '["minimalista", "profesional", "creativo"]'),
('creator_pro', 'max_colors', '8'),
('creator_pro', 'max_fonts', '3'),
('creator_pro', 'preview_days', '1'),
('creator_pro', 'ai_bio_generator', 'false'),
('creator_pro', 'ai_seo_optimizer', 'false'),
('creator_pro', 'ai_content_suggestions', 'false'),
('creator_pro', 'analytics_level', '"intermediate"'),
('creator_pro', 'priority_support', 'false'),
('creator_pro', 'premium_badge', 'false'),
('creator_pro', 'custom_css', 'false'),
('creator_pro', 'portfolio_max_items', '20')
ON CONFLICT (tier, feature_key) DO UPDATE SET feature_value = EXCLUDED.feature_value;

-- 5. Insertar features para Creator Premium
INSERT INTO plan_features (tier, feature_key, feature_value) VALUES
('creator_premium', 'max_blocks', '15'),
('creator_premium', 'allowed_blocks', '"all"'),
('creator_premium', 'show_branding', 'false'),
('creator_premium', 'reveal_socials', 'true'),
('creator_premium', 'reveal_contact', '"all"'),
('creator_premium', 'max_templates', '5'),
('creator_premium', 'allowed_templates', '"all"'),
('creator_premium', 'max_colors', '0'),
('creator_premium', 'max_fonts', '10'),
('creator_premium', 'preview_days', '7'),
('creator_premium', 'ai_bio_generator', 'true'),
('creator_premium', 'ai_seo_optimizer', 'true'),
('creator_premium', 'ai_content_suggestions', 'true'),
('creator_premium', 'analytics_level', '"advanced"'),
('creator_premium', 'priority_support', 'true'),
('creator_premium', 'premium_badge', 'true'),
('creator_premium', 'custom_css', 'true'),
('creator_premium', 'portfolio_max_items', '50')
ON CONFLICT (tier, feature_key) DO UPDATE SET feature_value = EXCLUDED.feature_value;

-- 6. RLS para plan_features (solo lectura pública)
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read plan features"
  ON plan_features FOR SELECT
  USING (true);

-- 7. Función para obtener todas las features de un tier
CREATE OR REPLACE FUNCTION get_plan_features(plan_tier text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_object_agg(feature_key, feature_value)
  INTO result
  FROM plan_features
  WHERE tier = plan_tier;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 8. Función para verificar si un tier puede usar un bloque
CREATE OR REPLACE FUNCTION can_use_block(plan_tier text, block_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  allowed_blocks jsonb;
BEGIN
  SELECT feature_value INTO allowed_blocks
  FROM plan_features
  WHERE tier = plan_tier AND feature_key = 'allowed_blocks';

  -- Si es "all", permitir todo
  IF allowed_blocks = '"all"' THEN
    RETURN true;
  END IF;

  -- Verificar si el bloque está en la lista
  RETURN allowed_blocks ? block_type;
END;
$$;

-- 9. Función para obtener el tier del usuario actual
CREATE OR REPLACE FUNCTION get_current_user_tier()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tier text;
BEGIN
  -- Buscar en platform_subscriptions
  SELECT tier INTO user_tier
  FROM platform_subscriptions
  WHERE user_id = auth.uid()
    AND status IN ('active', 'trialing')
  ORDER BY created_at DESC
  LIMIT 1;

  -- Default a creator_free si no tiene suscripción
  RETURN COALESCE(user_tier, 'creator_free');
END;
$$;

-- 10. Agregar columna de tier en creator_profiles si no existe
ALTER TABLE creator_profiles
ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'creator_free';

-- 11. Trigger para sincronizar tier cuando cambia la suscripción
CREATE OR REPLACE FUNCTION sync_creator_subscription_tier()
RETURNS TRIGGER AS $$
BEGIN
  -- Actualizar el tier en creator_profiles
  UPDATE creator_profiles
  SET subscription_tier = NEW.tier
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_creator_tier ON platform_subscriptions;
CREATE TRIGGER trg_sync_creator_tier
  AFTER INSERT OR UPDATE ON platform_subscriptions
  FOR EACH ROW
  WHEN (NEW.tier LIKE 'creator_%')
  EXECUTE FUNCTION sync_creator_subscription_tier();
