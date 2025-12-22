-- Add username field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Create index for faster username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Function to generate username from full_name
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
BEGIN
  -- Convert full_name to lowercase, replace spaces with underscores, remove special chars
  base_username := lower(regexp_replace(full_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- If empty, use random string
  IF base_username = '' OR base_username IS NULL THEN
    base_username := 'user' || substr(md5(random()::text), 1, 6);
  END IF;
  
  -- Truncate to 20 chars max
  base_username := substr(base_username, 1, 20);
  
  final_username := base_username;
  
  -- Check for uniqueness and add counter if needed
  WHILE EXISTS(SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;
  
  RETURN final_username;
END;
$$;

-- Update existing profiles without username
UPDATE public.profiles
SET username = public.generate_username_from_name(full_name)
WHERE username IS NULL;

-- Create trigger to auto-generate username on insert
CREATE OR REPLACE FUNCTION public.auto_generate_username()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.username IS NULL THEN
    NEW.username := public.generate_username_from_name(NEW.full_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_auto_generate_username ON public.profiles;
CREATE TRIGGER trigger_auto_generate_username
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_username();