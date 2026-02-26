-- Reset platform_access_unlocked for test user
-- This user was grandfathered by the referral gate migration but needs to complete the gate

UPDATE profiles
SET platform_access_unlocked = false
WHERE email = 'cafetiandopodcast@gmail.com';

-- Also ensure any new users created after this migration have the correct default
-- (This is already the default, but making it explicit)
ALTER TABLE profiles ALTER COLUMN platform_access_unlocked SET DEFAULT false;
