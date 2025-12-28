-- Fix search_path for the new functions
CREATE OR REPLACE FUNCTION public.notify_on_post_like()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_portfolio_comment()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.extract_hashtags()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashtag_text TEXT;
  hashtag_record RECORD;
BEGIN
  DELETE FROM public.post_hashtags WHERE post_id = NEW.id;
  
  FOR hashtag_text IN
    SELECT DISTINCT lower(regexp_replace(m[1], '[^a-zA-Z0-9áéíóúñ]', '', 'g'))
    FROM regexp_matches(COALESCE(NEW.caption, ''), '#([a-zA-Z0-9áéíóúñ_]+)', 'g') AS m
  LOOP
    IF length(hashtag_text) > 1 THEN
      INSERT INTO public.hashtags (tag)
      VALUES (hashtag_text)
      ON CONFLICT (tag) DO UPDATE SET 
        use_count = hashtags.use_count + 1,
        updated_at = now()
      RETURNING * INTO hashtag_record;
      
      INSERT INTO public.post_hashtags (post_id, hashtag_id)
      VALUES (NEW.id, hashtag_record.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.social_notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_on_company_follow()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_user_id UUID;
BEGIN
  SELECT user_id INTO company_user_id FROM public.clients WHERE id = NEW.company_id;
  
  IF company_user_id IS NOT NULL THEN
    INSERT INTO public.social_notifications (user_id, actor_id, type, message)
    VALUES (company_user_id, NEW.follower_id, 'follow', 'siguió tu empresa');
  END IF;
  
  RETURN NEW;
END;
$$;