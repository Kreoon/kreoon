-- Add business_type column to products table for personal branding support
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS business_type TEXT DEFAULT 'product_service' 
CHECK (business_type IN ('product_service', 'personal_brand'));

-- Add comment for documentation
COMMENT ON COLUMN public.products.business_type IS 'Type of business: product_service (default) or personal_brand';