-- Create table for monthly/quarterly goals
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  period_type TEXT NOT NULL CHECK (period_type IN ('month', 'quarter')),
  period_value INTEGER NOT NULL, -- 1-12 for months, 1-4 for quarters
  year INTEGER NOT NULL,
  revenue_goal NUMERIC DEFAULT 0,
  content_goal INTEGER DEFAULT 0,
  new_clients_goal INTEGER DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(period_type, period_value, year)
);

-- Enable RLS
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Only admins can manage goals
CREATE POLICY "Admins can manage goals"
ON public.goals
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Authenticated users can view goals
CREATE POLICY "Authenticated can view goals"
ON public.goals
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_goals_updated_at
BEFORE UPDATE ON public.goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();