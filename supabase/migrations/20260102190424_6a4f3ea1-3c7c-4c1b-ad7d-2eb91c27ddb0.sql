-- Add associated_products column to marketing_strategies table
ALTER TABLE public.marketing_strategies 
ADD COLUMN IF NOT EXISTS associated_products UUID[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.marketing_strategies.associated_products IS 'Array of product IDs associated with this marketing strategy';