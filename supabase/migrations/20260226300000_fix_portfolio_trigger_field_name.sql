-- Fix: trigger_check_referrer_unlock uses wrong field name for portfolio_items
-- The field is 'creator_id', not 'creator_profile_id'

CREATE OR REPLACE FUNCTION trigger_check_referrer_unlock()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_referrer_id UUID;
  v_user_id UUID;
BEGIN
  -- Determine user_id based on which table triggered
  IF TG_TABLE_NAME = 'creator_profiles' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'portfolio_items' THEN
    -- FIX: The field is 'creator_id', not 'creator_profile_id'
    SELECT cp.user_id INTO v_user_id
    FROM creator_profiles cp
    WHERE cp.id = NEW.creator_id;
  ELSIF TG_TABLE_NAME = 'content' THEN
    v_user_id := NEW.creator_id;
  ELSIF TG_TABLE_NAME = 'portfolio_posts' THEN
    v_user_id := NEW.user_id;
  ELSIF TG_TABLE_NAME = 'profiles' THEN
    v_user_id := NEW.id;
  END IF;

  -- Find the referrer of this user
  IF v_user_id IS NOT NULL THEN
    SELECT rr.referrer_id INTO v_referrer_id
    FROM referral_relationships rr
    WHERE rr.referred_id = v_user_id
      AND rr.status = 'active'
    LIMIT 1;

    IF v_referrer_id IS NOT NULL THEN
      PERFORM check_and_unlock_access(v_referrer_id);
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the insert if the referral check fails
  RETURN NEW;
END;
$$;
