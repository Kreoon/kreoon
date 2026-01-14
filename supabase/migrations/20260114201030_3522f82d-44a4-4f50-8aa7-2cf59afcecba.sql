-- Add season_id to UP tables for season-based filtering

-- Add season_id to up_creadores
ALTER TABLE public.up_creadores 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.up_seasons(id);

-- Add season_id to up_editores
ALTER TABLE public.up_editores 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.up_seasons(id);

-- Add season_id to up_creadores_totals for seasonal tracking
ALTER TABLE public.up_creadores_totals 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.up_seasons(id);

-- Add season_id to up_editores_totals for seasonal tracking
ALTER TABLE public.up_editores_totals 
ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.up_seasons(id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_up_creadores_season ON public.up_creadores(season_id);
CREATE INDEX IF NOT EXISTS idx_up_editores_season ON public.up_editores(season_id);
CREATE INDEX IF NOT EXISTS idx_up_creadores_totals_season ON public.up_creadores_totals(season_id);
CREATE INDEX IF NOT EXISTS idx_up_editores_totals_season ON public.up_editores_totals(season_id);

-- Create function to get active season for organization
CREATE OR REPLACE FUNCTION public.get_active_season(org_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.up_seasons 
    WHERE organization_id = org_id AND is_active = true 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update triggers to auto-set season_id on insert

-- Trigger function for up_creadores
CREATE OR REPLACE FUNCTION public.set_season_id_creadores()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.season_id IS NULL THEN
    NEW.season_id := get_active_season(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function for up_editores
CREATE OR REPLACE FUNCTION public.set_season_id_editores()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.season_id IS NULL THEN
    NEW.season_id := get_active_season(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS trg_set_season_creadores ON public.up_creadores;
CREATE TRIGGER trg_set_season_creadores
  BEFORE INSERT ON public.up_creadores
  FOR EACH ROW
  EXECUTE FUNCTION public.set_season_id_creadores();

DROP TRIGGER IF EXISTS trg_set_season_editores ON public.up_editores;
CREATE TRIGGER trg_set_season_editores
  BEFORE INSERT ON public.up_editores
  FOR EACH ROW
  EXECUTE FUNCTION public.set_season_id_editores();

-- Add user_type to season snapshots for differentiating creators vs editors
ALTER TABLE public.up_season_snapshots 
ADD COLUMN IF NOT EXISTS user_type TEXT DEFAULT 'creator' CHECK (user_type IN ('creator', 'editor'));

-- Add organization_id to snapshots for RLS
ALTER TABLE public.up_season_snapshots 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id);

-- Create index for snapshots
CREATE INDEX IF NOT EXISTS idx_up_season_snapshots_org ON public.up_season_snapshots(organization_id);
CREATE INDEX IF NOT EXISTS idx_up_season_snapshots_season ON public.up_season_snapshots(season_id);