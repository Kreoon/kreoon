-- Add field to control if content is visible on public portfolio
ALTER TABLE public.content 
ADD COLUMN IF NOT EXISTS is_portfolio_public boolean DEFAULT false;

-- Add comment
COMMENT ON COLUMN public.content.is_portfolio_public IS 'Whether this content is visible on the public company portfolio';