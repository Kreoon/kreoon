-- =====================================================
-- KREOON Social: Database migrations for social features
-- =====================================================

-- 1. Add featured_video_url field to profiles for horizontal video
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS featured_video_url TEXT,
ADD COLUMN IF NOT EXISTS featured_video_thumbnail TEXT;

-- 2. Add allow_public_network to organizations (controls if profiles can be followed publicly)
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS allow_public_network BOOLEAN DEFAULT false;

-- 3. Create contact_reveals table for token-based contact revelation
CREATE TABLE IF NOT EXISTS public.contact_reveals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  revealed_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tokens_spent INTEGER NOT NULL DEFAULT 1,
  revealed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(revealer_id, revealed_profile_id)
);

-- Enable RLS on contact_reveals
ALTER TABLE public.contact_reveals ENABLE ROW LEVEL SECURITY;

-- Policies for contact_reveals
CREATE POLICY "Users can view their own reveals" 
ON public.contact_reveals 
FOR SELECT 
USING (auth.uid() = revealer_id);

CREATE POLICY "Users can create reveals" 
ON public.contact_reveals 
FOR INSERT 
WITH CHECK (auth.uid() = revealer_id);

-- 4. Create social_notifications table
CREATE TABLE IF NOT EXISTS public.social_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('follow', 'like', 'comment', 'reveal', 'mention')),
  entity_type TEXT, -- 'post', 'content', 'profile', etc.
  entity_id UUID,
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on social_notifications
ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for social_notifications
CREATE POLICY "Users can view their own notifications" 
ON public.social_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.social_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create notifications" 
ON public.social_notifications 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Add token balance to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reveal_tokens INTEGER DEFAULT 5;

-- 6. Create index for faster notification queries
CREATE INDEX IF NOT EXISTS idx_social_notifications_user_id ON public.social_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_social_notifications_created_at ON public.social_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_reveals_revealer ON public.contact_reveals(revealer_id);

-- 7. Function to create notification when followed
CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.social_notifications (user_id, actor_id, notification_type, entity_type, entity_id)
  VALUES (NEW.following_id, NEW.follower_id, 'follow', 'profile', NEW.following_id);
  RETURN NEW;
END;
$$;

-- Create trigger for follow notifications
DROP TRIGGER IF EXISTS on_follow_notification ON public.followers;
CREATE TRIGGER on_follow_notification
  AFTER INSERT ON public.followers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_follow();

-- 8. Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_notifications;