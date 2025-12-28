-- Function to create notification on post like
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.portfolio_posts WHERE id = NEW.post_id;
  
  IF post_owner_id IS NOT NULL AND post_owner_id::text != NEW.viewer_id THEN
    INSERT INTO public.social_notifications (user_id, actor_id, type, content_id, content_type)
    VALUES (post_owner_id, NEW.viewer_id::uuid, 'like', NEW.post_id, 'post')
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If viewer_id is not a valid UUID, skip notification
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for like notifications
DROP TRIGGER IF EXISTS on_post_like_notify ON public.portfolio_post_likes;
CREATE TRIGGER on_post_like_notify
  AFTER INSERT ON public.portfolio_post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_post_like();

-- Function to create notification on comment
CREATE OR REPLACE FUNCTION public.notify_on_portfolio_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_owner_id UUID;
BEGIN
  SELECT user_id INTO post_owner_id FROM public.portfolio_posts WHERE id = NEW.post_id;
  
  IF post_owner_id IS NOT NULL AND post_owner_id != NEW.user_id THEN
    INSERT INTO public.social_notifications (user_id, actor_id, type, content_id, content_type, message)
    VALUES (post_owner_id, NEW.user_id, 'comment', NEW.post_id, 'post', LEFT(NEW.content, 100));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for comment notifications
DROP TRIGGER IF EXISTS on_post_comment_notify ON public.portfolio_post_comments;
CREATE TRIGGER on_post_comment_notify
  AFTER INSERT ON public.portfolio_post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_portfolio_comment();