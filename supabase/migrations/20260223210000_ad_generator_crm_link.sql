-- Link ad_generator_products to CRM clients and products
ALTER TABLE ad_generator_products
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS crm_product_id UUID REFERENCES products(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ad_products_client ON ad_generator_products(client_id);
CREATE INDEX IF NOT EXISTS idx_ad_products_crm_product ON ad_generator_products(crm_product_id);
