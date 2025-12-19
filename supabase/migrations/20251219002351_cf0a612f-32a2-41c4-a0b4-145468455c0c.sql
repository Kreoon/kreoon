-- Create products table (owned by clients)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  -- Strategy & Research
  strategy TEXT,
  market_research TEXT,
  ideal_avatar TEXT,
  sales_angles TEXT[],
  -- Documents/Files URLs
  brief_url TEXT,
  onboarding_url TEXT,
  research_url TEXT,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage products"
ON public.products FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view products"
ON public.products FOR SELECT
USING (true);

CREATE POLICY "Clients can view their products"
ON public.products FOR SELECT
USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Add product_id to content table
ALTER TABLE public.content ADD COLUMN product_id UUID REFERENCES public.products(id);

-- Add sales_angle field to content for specific angle used in this project
ALTER TABLE public.content ADD COLUMN sales_angle TEXT;

-- Create trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();