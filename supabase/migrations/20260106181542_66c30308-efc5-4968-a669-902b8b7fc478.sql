-- Enable RLS on partitioned tracking_events tables
ALTER TABLE public.tracking_events_2024_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2025_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2025_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2025_03 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2025_04 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2025_05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events_2025_06 ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tracking events partitions
-- Users can view their own events
CREATE POLICY "Users can view own tracking events 2024_12" ON public.tracking_events_2024_12
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tracking events 2025_01" ON public.tracking_events_2025_01
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tracking events 2025_02" ON public.tracking_events_2025_02
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tracking events 2025_03" ON public.tracking_events_2025_03
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tracking events 2025_04" ON public.tracking_events_2025_04
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tracking events 2025_05" ON public.tracking_events_2025_05
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own tracking events 2025_06" ON public.tracking_events_2025_06
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own events
CREATE POLICY "Users can insert own tracking events 2024_12" ON public.tracking_events_2024_12
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking events 2025_01" ON public.tracking_events_2025_01
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking events 2025_02" ON public.tracking_events_2025_02
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking events 2025_03" ON public.tracking_events_2025_03
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking events 2025_04" ON public.tracking_events_2025_04
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking events 2025_05" ON public.tracking_events_2025_05
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own tracking events 2025_06" ON public.tracking_events_2025_06
  FOR INSERT WITH CHECK (auth.uid() = user_id);