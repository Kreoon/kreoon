-- Add sequential product_code per organization
-- Auto-assigned by trigger on INSERT, backfilled for existing products

-- 1. Add column
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_code INTEGER;

-- 2. Backfill existing products in creation order per org
WITH ranked AS (
  SELECT p.id,
         ROW_NUMBER() OVER (
           PARTITION BY c.organization_id
           ORDER BY p.created_at ASC
         ) AS rn
  FROM products p
  JOIN clients c ON c.id = p.client_id
  WHERE c.organization_id IS NOT NULL
)
UPDATE products SET product_code = ranked.rn
FROM ranked WHERE products.id = ranked.id;

-- 3. Create function for auto-assign on INSERT
CREATE OR REPLACE FUNCTION assign_product_code()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  next_code INTEGER;
BEGIN
  SELECT organization_id INTO org_id
  FROM clients WHERE id = NEW.client_id;

  IF org_id IS NOT NULL THEN
    SELECT COALESCE(MAX(p.product_code), 0) + 1 INTO next_code
    FROM products p
    JOIN clients c ON c.id = p.client_id
    WHERE c.organization_id = org_id;

    NEW.product_code := next_code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger
DROP TRIGGER IF EXISTS trg_assign_product_code ON products;
CREATE TRIGGER trg_assign_product_code
  BEFORE INSERT ON products
  FOR EACH ROW
  EXECUTE FUNCTION assign_product_code();

-- 5. Index for fast MAX query
CREATE INDEX IF NOT EXISTS idx_products_client_code ON products(client_id, product_code);

-- 6. Update get_org_products RPC to include product_code
DROP FUNCTION IF EXISTS get_org_products(uuid);
CREATE FUNCTION get_org_products(p_organization_id uuid)
RETURNS TABLE (id uuid, name text, client_id uuid, client_name text, product_code integer)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT p.id, p.name::text, p.client_id, c.name::text AS client_name, p.product_code
  FROM products p
  JOIN clients c ON c.id = p.client_id
  WHERE c.organization_id = p_organization_id
  ORDER BY p.product_code ASC;
$$;

GRANT EXECUTE ON FUNCTION get_org_products(uuid) TO authenticated;
