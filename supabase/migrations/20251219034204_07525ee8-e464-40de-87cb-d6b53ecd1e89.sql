-- Create client packages table for tracking sales
CREATE TABLE public.client_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  total_value NUMERIC NOT NULL DEFAULT 0,
  content_quantity INTEGER NOT NULL DEFAULT 1,
  hooks_per_video INTEGER DEFAULT 1,
  creators_count INTEGER DEFAULT 1,
  products_count INTEGER DEFAULT 1,
  product_ids UUID[] DEFAULT '{}',
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid')),
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.client_packages ENABLE ROW LEVEL SECURITY;

-- Admin can manage all packages
CREATE POLICY "Admins can manage packages"
ON public.client_packages
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Clients can view their own packages
CREATE POLICY "Clients can view their packages"
ON public.client_packages
FOR SELECT
USING (client_id IN (
  SELECT id FROM public.clients WHERE user_id = auth.uid()
));

-- Ambassadors can view packages (read-only)
CREATE POLICY "Ambassadors can view packages"
ON public.client_packages
FOR SELECT
USING (has_role(auth.uid(), 'ambassador'));

-- Create trigger for updated_at
CREATE TRIGGER update_client_packages_updated_at
  BEFORE UPDATE ON public.client_packages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add indexes
CREATE INDEX idx_client_packages_client_id ON public.client_packages(client_id);
CREATE INDEX idx_client_packages_payment_status ON public.client_packages(payment_status);