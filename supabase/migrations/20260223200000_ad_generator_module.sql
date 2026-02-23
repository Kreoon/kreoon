-- ============================================================
-- Ad Generator Module (EcomMagic-style)
-- Tables: ad_generator_products, ad_templates, ad_generated_banners
-- Storage: ad-generator bucket
-- ============================================================

-- ── 1. Tables ──

CREATE TABLE ad_generator_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID NOT NULL REFERENCES auth.users(id),
  name            TEXT NOT NULL,
  description     TEXT,
  product_images  TEXT[] DEFAULT '{}',
  banners_count   INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ad_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES auth.users(id),
  name            TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general',
  thumbnail_url   TEXT NOT NULL,
  template_url    TEXT NOT NULL,
  output_width    INT DEFAULT 1080,
  output_height   INT DEFAULT 1080,
  tags            TEXT[] DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ad_generated_banners (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id          UUID NOT NULL REFERENCES ad_generator_products(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES auth.users(id),
  reference_image_url TEXT,
  template_id         UUID REFERENCES ad_templates(id) ON DELETE SET NULL,
  product_image_urls  TEXT[] NOT NULL DEFAULT '{}',
  output_size         TEXT NOT NULL DEFAULT '1080x1080',
  copy_language       TEXT NOT NULL DEFAULT 'es',
  customization       TEXT,
  generated_image_url TEXT,
  generated_copy      TEXT,
  ai_provider         TEXT,
  ai_model            TEXT,
  generation_time_ms  INT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','generating','completed','failed')),
  error_message       TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. Indices ──

CREATE INDEX idx_ad_products_org ON ad_generator_products(organization_id);
CREATE INDEX idx_ad_templates_category ON ad_templates(category) WHERE is_active = true;
CREATE INDEX idx_ad_templates_org ON ad_templates(organization_id) WHERE is_active = true;
CREATE INDEX idx_ad_banners_product ON ad_generated_banners(product_id);
CREATE INDEX idx_ad_banners_org ON ad_generated_banners(organization_id);

-- ── 3. Triggers ──

-- updated_at trigger for ad_generator_products
CREATE OR REPLACE FUNCTION update_ad_product_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ad_product_updated_at
  BEFORE UPDATE ON ad_generator_products
  FOR EACH ROW EXECUTE FUNCTION update_ad_product_updated_at();

-- banners_count trigger: increment on INSERT, decrement on DELETE
CREATE OR REPLACE FUNCTION update_ad_product_banners_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE ad_generator_products
    SET banners_count = banners_count + 1
    WHERE id = NEW.product_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE ad_generator_products
    SET banners_count = GREATEST(banners_count - 1, 0)
    WHERE id = OLD.product_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ad_banners_count
  AFTER INSERT OR DELETE ON ad_generated_banners
  FOR EACH ROW EXECUTE FUNCTION update_ad_product_banners_count();

-- ── 4. RLS ──

ALTER TABLE ad_generator_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_generated_banners ENABLE ROW LEVEL SECURITY;

-- ad_generator_products: org members can see all products in their org
CREATE POLICY "ad_products_select" ON ad_generator_products
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ad_generator_products: org members can insert products
CREATE POLICY "ad_products_insert" ON ad_generator_products
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- ad_generator_products: creator can update their own products
CREATE POLICY "ad_products_update" ON ad_generator_products
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ad_generator_products: creator can delete their own products
CREATE POLICY "ad_products_delete" ON ad_generator_products
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ad_templates: all authenticated users can see active global templates + their org templates
CREATE POLICY "ad_templates_select" ON ad_templates
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (
      organization_id IS NULL
      OR organization_id IN (
        SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
      )
    )
  );

-- ad_templates: platform root can manage global templates
CREATE POLICY "ad_templates_insert_global" ON ad_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    (organization_id IS NULL AND is_platform_root(auth.uid()))
    OR (
      organization_id IN (
        SELECT om.organization_id FROM organization_members om
        WHERE om.user_id = auth.uid() AND om.role = 'admin'
      )
    )
  );

CREATE POLICY "ad_templates_update" ON ad_templates
  FOR UPDATE TO authenticated
  USING (
    (organization_id IS NULL AND is_platform_root(auth.uid()))
    OR (
      organization_id IN (
        SELECT om.organization_id FROM organization_members om
        WHERE om.user_id = auth.uid() AND om.role = 'admin'
      )
    )
  );

CREATE POLICY "ad_templates_delete" ON ad_templates
  FOR DELETE TO authenticated
  USING (
    (organization_id IS NULL AND is_platform_root(auth.uid()))
    OR (
      organization_id IN (
        SELECT om.organization_id FROM organization_members om
        WHERE om.user_id = auth.uid() AND om.role = 'admin'
      )
    )
  );

-- ad_generated_banners: org members can see banners in their org
CREATE POLICY "ad_banners_select" ON ad_generated_banners
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ad_generated_banners: org members can insert
CREATE POLICY "ad_banners_insert" ON ad_generated_banners
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- ad_generated_banners: only creator can delete their own banners
CREATE POLICY "ad_banners_delete" ON ad_generated_banners
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- ── 5. Grants ──

GRANT ALL ON ad_generator_products TO authenticated;
GRANT ALL ON ad_generator_products TO service_role;
GRANT ALL ON ad_templates TO authenticated;
GRANT ALL ON ad_templates TO service_role;
GRANT ALL ON ad_generated_banners TO authenticated;
GRANT ALL ON ad_generated_banners TO service_role;

-- ── 6. Storage bucket ──

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ad-generator',
  'ad-generator',
  true,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "ad_gen_storage_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'ad-generator');

CREATE POLICY "ad_gen_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ad-generator');

CREATE POLICY "ad_gen_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'ad-generator');

-- Allow service_role full access
CREATE POLICY "ad_gen_storage_service" ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'ad-generator')
  WITH CHECK (bucket_id = 'ad-generator');

-- ── 7. Seed: template categories placeholder ──
-- Actual template images are uploaded manually to storage after migration.
-- These are placeholder entries with category/name — update template_url and thumbnail_url
-- after uploading images to ad-generator/templates/ in Supabase Storage.

INSERT INTO ad_templates (name, category, thumbnail_url, template_url, tags, sort_order) VALUES
  ('E-commerce Clean', 'ecommerce', '', '', ARRAY['clean','minimal','product'], 1),
  ('E-commerce Bold', 'ecommerce', '', '', ARRAY['bold','colorful','sale'], 2),
  ('E-commerce Premium', 'ecommerce', '', '', ARRAY['luxury','premium','elegant'], 3),
  ('Fashion Editorial', 'fashion', '', '', ARRAY['fashion','editorial','lifestyle'], 4),
  ('Fashion Street', 'fashion', '', '', ARRAY['street','urban','trendy'], 5),
  ('Fashion Minimal', 'fashion', '', '', ARRAY['minimal','clean','fashion'], 6),
  ('Food Vibrant', 'food', '', '', ARRAY['food','vibrant','appetizing'], 7),
  ('Food Elegant', 'food', '', '', ARRAY['food','elegant','restaurant'], 8),
  ('Food Fresh', 'food', '', '', ARRAY['food','fresh','organic'], 9),
  ('Tech Modern', 'tech', '', '', ARRAY['tech','modern','gadget'], 10),
  ('Tech Futuristic', 'tech', '', '', ARRAY['tech','futuristic','neon'], 11),
  ('Beauty Glow', 'beauty', '', '', ARRAY['beauty','glow','skincare'], 12),
  ('Beauty Natural', 'beauty', '', '', ARRAY['beauty','natural','organic'], 13),
  ('Services Professional', 'services', '', '', ARRAY['services','professional','corporate'], 14),
  ('Services Creative', 'services', '', '', ARRAY['services','creative','agency'], 15),
  ('Infoproduct Course', 'infoproduct', '', '', ARRAY['infoproduct','course','digital'], 16),
  ('Infoproduct Webinar', 'infoproduct', '', '', ARRAY['infoproduct','webinar','event'], 17),
  ('General Gradient', 'general', '', '', ARRAY['gradient','modern','versatile'], 18),
  ('General Neon', 'general', '', '', ARRAY['neon','dark','vibrant'], 19),
  ('General Pastel', 'general', '', '', ARRAY['pastel','soft','light'], 20);

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
