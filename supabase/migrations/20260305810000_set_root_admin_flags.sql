-- Set is_platform_admin and is_superadmin for root users
-- This is more reliable than checking email in the function

UPDATE profiles
SET
  is_platform_admin = true,
  is_superadmin = true
WHERE email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com');

-- Also ensure these columns exist (in case they were added later)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_platform_admin') THEN
    ALTER TABLE profiles ADD COLUMN is_platform_admin BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_superadmin') THEN
    ALTER TABLE profiles ADD COLUMN is_superadmin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Run the update again after ensuring columns exist
UPDATE profiles
SET
  is_platform_admin = true,
  is_superadmin = true
WHERE email IN ('jacsolucionesgraficas@gmail.com', 'kairosgp.sas@gmail.com');
