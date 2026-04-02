-- =====================================================
-- Actualizar features de planes + sistema de comisiones
-- Versión 2: Freemium potente + Contacto solo Premium
-- =====================================================

-- =============================================================================
-- CREATOR FREE - Freemium SUPER Potente (30% comisión)
-- TODOS los bloques disponibles EXCEPTO contact y social_links
-- La comisión es el único diferenciador real
-- =============================================================================
INSERT INTO plan_features (tier, feature_key, feature_value) VALUES
('creator_free', 'commission_rate', '0.30'),
('creator_free', 'can_hide_branding', 'false')
ON CONFLICT (tier, feature_key) DO UPDATE SET feature_value = EXCLUDED.feature_value;

-- FREE: 15 bloques máximo, CASI TODOS disponibles (perfiles muy profesionales)
UPDATE plan_features SET feature_value = '15' WHERE tier = 'creator_free' AND feature_key = 'max_blocks';
UPDATE plan_features SET feature_value = '["hero_banner", "recommended_talent", "about", "portfolio", "services", "stats", "reviews", "pricing", "faq", "testimonials", "brands", "text_block", "skills", "timeline", "video_embed", "image_gallery", "divider", "spacer"]' WHERE tier = 'creator_free' AND feature_key = 'allowed_blocks';
UPDATE plan_features SET feature_value = '"icons_only"' WHERE tier = 'creator_free' AND feature_key = 'reveal_socials';
UPDATE plan_features SET feature_value = '"none"' WHERE tier = 'creator_free' AND feature_key = 'reveal_contact';
UPDATE plan_features SET feature_value = '3' WHERE tier = 'creator_free' AND feature_key = 'max_templates';
UPDATE plan_features SET feature_value = '["minimalista", "creativo", "profesional"]' WHERE tier = 'creator_free' AND feature_key = 'allowed_templates';
UPDATE plan_features SET feature_value = '10' WHERE tier = 'creator_free' AND feature_key = 'max_colors';
UPDATE plan_features SET feature_value = '4' WHERE tier = 'creator_free' AND feature_key = 'max_fonts';
UPDATE plan_features SET feature_value = '1' WHERE tier = 'creator_free' AND feature_key = 'preview_days';
UPDATE plan_features SET feature_value = '15' WHERE tier = 'creator_free' AND feature_key = 'portfolio_max_items';

-- =============================================================================
-- CREATOR PRO - Menor comisión (25%), puede eliminar recommended_talent
-- Contact y Social Links siguen siendo PREMIUM ONLY
-- =============================================================================
INSERT INTO plan_features (tier, feature_key, feature_value) VALUES
('creator_pro', 'commission_rate', '0.25'),
('creator_pro', 'can_hide_branding', 'false')
ON CONFLICT (tier, feature_key) DO UPDATE SET feature_value = EXCLUDED.feature_value;

-- PRO: 18 bloques máximo, mismos bloques que FREE + puede eliminar recommended_talent
UPDATE plan_features SET feature_value = '18' WHERE tier = 'creator_pro' AND feature_key = 'max_blocks';
UPDATE plan_features SET feature_value = '["hero_banner", "recommended_talent", "about", "portfolio", "services", "stats", "reviews", "pricing", "faq", "testimonials", "brands", "text_block", "skills", "timeline", "video_embed", "image_gallery", "divider", "spacer"]' WHERE tier = 'creator_pro' AND feature_key = 'allowed_blocks';
UPDATE plan_features SET feature_value = 'true' WHERE tier = 'creator_pro' AND feature_key = 'show_branding';
UPDATE plan_features SET feature_value = 'true' WHERE tier = 'creator_pro' AND feature_key = 'reveal_socials';
UPDATE plan_features SET feature_value = '"none"' WHERE tier = 'creator_pro' AND feature_key = 'reveal_contact';
UPDATE plan_features SET feature_value = '5' WHERE tier = 'creator_pro' AND feature_key = 'max_templates';
UPDATE plan_features SET feature_value = '["minimalista", "profesional", "creativo", "moderno", "influencer"]' WHERE tier = 'creator_pro' AND feature_key = 'allowed_templates';
UPDATE plan_features SET feature_value = '0' WHERE tier = 'creator_pro' AND feature_key = 'max_colors';
UPDATE plan_features SET feature_value = '8' WHERE tier = 'creator_pro' AND feature_key = 'max_fonts';
UPDATE plan_features SET feature_value = '3' WHERE tier = 'creator_pro' AND feature_key = 'preview_days';
UPDATE plan_features SET feature_value = 'true' WHERE tier = 'creator_pro' AND feature_key = 'ai_bio_generator';
UPDATE plan_features SET feature_value = '30' WHERE tier = 'creator_pro' AND feature_key = 'portfolio_max_items';

-- =============================================================================
-- CREATOR PREMIUM - TODO incluido + contacto directo (15% comisión)
-- Único tier con contact y social_links
-- =============================================================================
INSERT INTO plan_features (tier, feature_key, feature_value) VALUES
('creator_premium', 'commission_rate', '0.15'),
('creator_premium', 'can_hide_branding', 'true')
ON CONFLICT (tier, feature_key) DO UPDATE SET feature_value = EXCLUDED.feature_value;

-- PREMIUM: 20 bloques máximo, TODOS los bloques disponibles
UPDATE plan_features SET feature_value = '20' WHERE tier = 'creator_premium' AND feature_key = 'max_blocks';
UPDATE plan_features SET feature_value = '"all"' WHERE tier = 'creator_premium' AND feature_key = 'allowed_blocks';
UPDATE plan_features SET feature_value = 'true' WHERE tier = 'creator_premium' AND feature_key = 'show_branding';
UPDATE plan_features SET feature_value = 'true' WHERE tier = 'creator_premium' AND feature_key = 'reveal_socials';
UPDATE plan_features SET feature_value = '"all"' WHERE tier = 'creator_premium' AND feature_key = 'reveal_contact';
UPDATE plan_features SET feature_value = '0' WHERE tier = 'creator_premium' AND feature_key = 'max_templates';
UPDATE plan_features SET feature_value = '"all"' WHERE tier = 'creator_premium' AND feature_key = 'allowed_templates';
UPDATE plan_features SET feature_value = '0' WHERE tier = 'creator_premium' AND feature_key = 'max_colors';
UPDATE plan_features SET feature_value = '10' WHERE tier = 'creator_premium' AND feature_key = 'max_fonts';
UPDATE plan_features SET feature_value = '7' WHERE tier = 'creator_premium' AND feature_key = 'preview_days';
UPDATE plan_features SET feature_value = 'true' WHERE tier = 'creator_premium' AND feature_key = 'ai_bio_generator';
UPDATE plan_features SET feature_value = 'true' WHERE tier = 'creator_premium' AND feature_key = 'ai_seo_optimizer';
UPDATE plan_features SET feature_value = 'true' WHERE tier = 'creator_premium' AND feature_key = 'ai_content_suggestions';
UPDATE plan_features SET feature_value = '"advanced"' WHERE tier = 'creator_premium' AND feature_key = 'analytics_level';
UPDATE plan_features SET feature_value = 'true' WHERE tier = 'creator_premium' AND feature_key = 'priority_support';
UPDATE plan_features SET feature_value = 'true' WHERE tier = 'creator_premium' AND feature_key = 'premium_badge';
UPDATE plan_features SET feature_value = 'true' WHERE tier = 'creator_premium' AND feature_key = 'custom_css';
UPDATE plan_features SET feature_value = '50' WHERE tier = 'creator_premium' AND feature_key = 'portfolio_max_items';

-- =============================================================================
-- Función helper para obtener comisión del usuario
-- =============================================================================
CREATE OR REPLACE FUNCTION get_user_commission_rate(user_uuid uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tier text;
  commission numeric;
BEGIN
  -- Obtener tier del usuario desde creator_profiles
  SELECT subscription_tier INTO user_tier
  FROM creator_profiles
  WHERE user_id = user_uuid;

  -- Default a creator_free si no tiene tier
  IF user_tier IS NULL THEN
    user_tier := 'creator_free';
  END IF;

  -- Obtener comisión del tier
  SELECT (feature_value::text)::numeric INTO commission
  FROM plan_features
  WHERE tier = user_tier AND feature_key = 'commission_rate';

  -- Default 30% si no se encuentra
  RETURN COALESCE(commission, 0.30);
END;
$$;

-- =============================================================================
-- Función para verificar si puede ocultar branding
-- =============================================================================
CREATE OR REPLACE FUNCTION can_hide_branding(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tier text;
  can_hide boolean;
BEGIN
  SELECT subscription_tier INTO user_tier
  FROM creator_profiles
  WHERE user_id = user_uuid;

  IF user_tier IS NULL THEN
    RETURN false;
  END IF;

  SELECT (feature_value::text)::boolean INTO can_hide
  FROM plan_features
  WHERE tier = user_tier AND feature_key = 'can_hide_branding';

  RETURN COALESCE(can_hide, false);
END;
$$;
