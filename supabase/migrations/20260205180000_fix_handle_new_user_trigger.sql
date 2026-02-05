-- =====================================================
-- FIX: Handle new user trigger improvements
-- Addresses "Database error saving new user" issue
-- =====================================================

-- First, let's update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  -- Get email with fallback
  user_email := COALESCE(NEW.email, 'user_' || NEW.id::text || '@temp.kreoon.com');

  -- Get full_name with multiple fallbacks
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(user_email, '@', 1)
  );

  -- Ensure full_name is not empty
  IF user_full_name IS NULL OR user_full_name = '' THEN
    user_full_name := 'Usuario ' || substr(NEW.id::text, 1, 8);
  END IF;

  -- Insert into profiles with conflict handling
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, user_email, user_full_name)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log the error but don't fail the auth signup
  RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also improve the username generation function to handle edge cases
CREATE OR REPLACE FUNCTION public.generate_username_from_name(full_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INTEGER := 0;
  max_attempts INTEGER := 100;
BEGIN
  -- Handle NULL or empty input
  IF full_name IS NULL OR full_name = '' THEN
    base_username := 'user' || substr(md5(random()::text), 1, 8);
  ELSE
    -- Convert full_name to lowercase, keep only alphanumeric
    base_username := lower(regexp_replace(full_name, '[^a-zA-Z0-9]', '', 'g'));
  END IF;

  -- If still empty after processing, use random
  IF base_username = '' OR base_username IS NULL THEN
    base_username := 'user' || substr(md5(random()::text), 1, 8);
  END IF;

  -- Truncate to 20 chars max
  base_username := substr(base_username, 1, 20);

  final_username := base_username;

  -- Check for uniqueness with a limit to prevent infinite loops
  WHILE EXISTS(SELECT 1 FROM public.profiles WHERE username = final_username) AND counter < max_attempts LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;

  -- If we hit max attempts, add random suffix
  IF counter >= max_attempts THEN
    final_username := base_username || '_' || substr(md5(random()::text), 1, 6);
  END IF;

  RETURN final_username;
END;
$$;

-- Update the auto_generate_username trigger function
CREATE OR REPLACE FUNCTION public.auto_generate_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := public.generate_username_from_name(COALESCE(NEW.full_name, NEW.email, 'user'));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- If username generation fails, use a UUID-based fallback
  NEW.username := 'user_' || substr(md5(random()::text), 1, 12);
  RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_username ON public.profiles;
CREATE TRIGGER trigger_auto_generate_username
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_username();
