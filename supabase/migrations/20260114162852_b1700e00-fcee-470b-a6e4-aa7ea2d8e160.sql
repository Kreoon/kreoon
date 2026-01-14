-- =====================================================
-- UP SYSTEM V2: TABLAS SEPARADAS CREADORES Y EDITORES
-- Paso 1: Crear las tablas base
-- =====================================================

-- Eliminar función existente si hay conflicto
DROP FUNCTION IF EXISTS public.calculate_up_level(integer);

-- Tabla UP_CREADORES - Puntos y auditoría para creadores
CREATE TABLE IF NOT EXISTS public.up_creadores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  recording_started_at TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ,
  issue_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  days_to_deliver INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'America/Bogota'),
  created_by UUID REFERENCES public.profiles(id),
  related_issue_id UUID,
  is_recovered BOOLEAN DEFAULT FALSE
);

-- Tabla UP_EDITORES - Puntos y auditoría para editores
CREATE TABLE IF NOT EXISTS public.up_editores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  editing_started_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  issue_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  days_to_deliver INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT (now() AT TIME ZONE 'America/Bogota'),
  created_by UUID REFERENCES public.profiles(id),
  related_issue_id UUID,
  is_recovered BOOLEAN DEFAULT FALSE
);

-- Tabla resumen de puntos totales por creador
CREATE TABLE IF NOT EXISTS public.up_creadores_totals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  on_time_deliveries INTEGER NOT NULL DEFAULT 0,
  late_deliveries INTEGER NOT NULL DEFAULT 0,
  total_issues INTEGER NOT NULL DEFAULT 0,
  clean_approvals INTEGER NOT NULL DEFAULT 0,
  reassignments INTEGER NOT NULL DEFAULT 0,
  current_level TEXT NOT NULL DEFAULT 'bronze',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabla resumen de puntos totales por editor
CREATE TABLE IF NOT EXISTS public.up_editores_totals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  on_time_deliveries INTEGER NOT NULL DEFAULT 0,
  late_deliveries INTEGER NOT NULL DEFAULT 0,
  total_issues INTEGER NOT NULL DEFAULT 0,
  clean_approvals INTEGER NOT NULL DEFAULT 0,
  reassignments INTEGER NOT NULL DEFAULT 0,
  current_level TEXT NOT NULL DEFAULT 'bronze',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_up_creadores_user_id ON public.up_creadores(user_id);
CREATE INDEX IF NOT EXISTS idx_up_creadores_content_id ON public.up_creadores(content_id);
CREATE INDEX IF NOT EXISTS idx_up_creadores_organization_id ON public.up_creadores(organization_id);
CREATE INDEX IF NOT EXISTS idx_up_creadores_event_type ON public.up_creadores(event_type);
CREATE INDEX IF NOT EXISTS idx_up_creadores_created_at ON public.up_creadores(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_up_editores_user_id ON public.up_editores(user_id);
CREATE INDEX IF NOT EXISTS idx_up_editores_content_id ON public.up_editores(content_id);
CREATE INDEX IF NOT EXISTS idx_up_editores_organization_id ON public.up_editores(organization_id);
CREATE INDEX IF NOT EXISTS idx_up_editores_event_type ON public.up_editores(event_type);
CREATE INDEX IF NOT EXISTS idx_up_editores_created_at ON public.up_editores(created_at DESC);

-- Enable RLS
ALTER TABLE public.up_creadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_editores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_creadores_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.up_editores_totals ENABLE ROW LEVEL SECURITY;

-- RLS Policies para up_creadores
CREATE POLICY "Users can view own UP creadores" ON public.up_creadores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all UP creadores" ON public.up_creadores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND role IN ('admin', 'team_leader')
    )
  );

CREATE POLICY "Insert UP creadores" ON public.up_creadores
  FOR INSERT WITH CHECK (true);

-- RLS Policies para up_editores
CREATE POLICY "Users view own UP editores" ON public.up_editores
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all UP editores" ON public.up_editores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND role IN ('admin', 'team_leader')
    )
  );

CREATE POLICY "Insert UP editores" ON public.up_editores
  FOR INSERT WITH CHECK (true);

-- RLS Policies para totales creadores
CREATE POLICY "Users view own creator totals" ON public.up_creadores_totals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all creator totals" ON public.up_creadores_totals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND role IN ('admin', 'team_leader')
    )
  );

CREATE POLICY "Manage creator totals" ON public.up_creadores_totals
  FOR ALL USING (true);

-- RLS Policies para totales editores
CREATE POLICY "Users view own editor totals" ON public.up_editores_totals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all editor totals" ON public.up_editores_totals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_roles.user_id = auth.uid() 
      AND role IN ('admin', 'team_leader')
    )
  );

CREATE POLICY "Manage editor totals" ON public.up_editores_totals
  FOR ALL USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.up_creadores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.up_editores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.up_creadores_totals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.up_editores_totals;