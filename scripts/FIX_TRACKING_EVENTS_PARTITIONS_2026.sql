-- Crear particiones de tracking_events para 2026
-- Error: no partition of relation "tracking_events" found for row

-- Particiones para 2026 (todo el año)
CREATE TABLE IF NOT EXISTS tracking_events_2026_01 PARTITION OF tracking_events FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE IF NOT EXISTS tracking_events_2026_02 PARTITION OF tracking_events FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE IF NOT EXISTS tracking_events_2026_03 PARTITION OF tracking_events FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS tracking_events_2026_04 PARTITION OF tracking_events FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');
CREATE TABLE IF NOT EXISTS tracking_events_2026_05 PARTITION OF tracking_events FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');
CREATE TABLE IF NOT EXISTS tracking_events_2026_06 PARTITION OF tracking_events FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS tracking_events_2026_07 PARTITION OF tracking_events FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');
CREATE TABLE IF NOT EXISTS tracking_events_2026_08 PARTITION OF tracking_events FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');
CREATE TABLE IF NOT EXISTS tracking_events_2026_09 PARTITION OF tracking_events FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS tracking_events_2026_10 PARTITION OF tracking_events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
CREATE TABLE IF NOT EXISTS tracking_events_2026_11 PARTITION OF tracking_events FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');
CREATE TABLE IF NOT EXISTS tracking_events_2026_12 PARTITION OF tracking_events FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- También crear particiones faltantes de 2025 (julio-diciembre)
CREATE TABLE IF NOT EXISTS tracking_events_2025_07 PARTITION OF tracking_events FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');
CREATE TABLE IF NOT EXISTS tracking_events_2025_08 PARTITION OF tracking_events FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');
CREATE TABLE IF NOT EXISTS tracking_events_2025_09 PARTITION OF tracking_events FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS tracking_events_2025_10 PARTITION OF tracking_events FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
CREATE TABLE IF NOT EXISTS tracking_events_2025_11 PARTITION OF tracking_events FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
CREATE TABLE IF NOT EXISTS tracking_events_2025_12 PARTITION OF tracking_events FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Habilitar RLS en las nuevas particiones
ALTER TABLE public.tracking_events_2025_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2025_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2025_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2025_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2025_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2025_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_06 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_07 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_08 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_09 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_10 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_11 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2026_12 ENABLE ROW LEVEL SECURITY;

-- Crear policies RLS para las nuevas particiones (2025 julio-diciembre)
CREATE POLICY "Users can view own tracking events 2025_07" ON public.tracking_events_2025_07 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2025_08" ON public.tracking_events_2025_08 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2025_09" ON public.tracking_events_2025_09 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2025_10" ON public.tracking_events_2025_10 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2025_11" ON public.tracking_events_2025_11 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2025_12" ON public.tracking_events_2025_12 FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking events 2025_07" ON public.tracking_events_2025_07 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2025_08" ON public.tracking_events_2025_08 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2025_09" ON public.tracking_events_2025_09 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2025_10" ON public.tracking_events_2025_10 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2025_11" ON public.tracking_events_2025_11 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2025_12" ON public.tracking_events_2025_12 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Crear policies RLS para las nuevas particiones (2026)
CREATE POLICY "Users can view own tracking events 2026_01" ON public.tracking_events_2026_01 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2026_02" ON public.tracking_events_2026_02 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2026_03" ON public.tracking_events_2026_03 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2026_04" ON public.tracking_events_2026_04 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2026_05" ON public.tracking_events_2026_05 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2026_06" ON public.tracking_events_2026_06 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2026_07" ON public.tracking_events_2026_07 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2026_08" ON public.tracking_events_2026_08 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2026_09" ON public.tracking_events_2026_09 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2026_10" ON public.tracking_events_2026_10 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2026_11" ON public.tracking_events_2026_11 FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view own tracking events 2026_12" ON public.tracking_events_2026_12 FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking events 2026_01" ON public.tracking_events_2026_01 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2026_02" ON public.tracking_events_2026_02 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2026_03" ON public.tracking_events_2026_03 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2026_04" ON public.tracking_events_2026_04 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2026_05" ON public.tracking_events_2026_05 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2026_06" ON public.tracking_events_2026_06 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2026_07" ON public.tracking_events_2026_07 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2026_08" ON public.tracking_events_2026_08 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2026_09" ON public.tracking_events_2026_09 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2026_10" ON public.tracking_events_2026_10 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2026_11" ON public.tracking_events_2026_11 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own tracking events 2026_12" ON public.tracking_events_2026_12 FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
