
-- CLEANUP: Fix duplicated and incorrect roles in organization_member_roles
-- UGC Colombia org ID: c8ae6c6d-a15d-46d9-b69e-465f7371595e

-- Step 1: Remove duplicate admin role for Alexander (keep first by assigned_at)
DELETE FROM organization_member_roles 
WHERE user_id = '8569be04-9e86-49d8-9714-3d81423e836e' 
  AND role = 'admin'
  AND id NOT IN (
    SELECT id FROM organization_member_roles 
    WHERE user_id = '8569be04-9e86-49d8-9714-3d81423e836e' AND role = 'admin'
    ORDER BY assigned_at ASC NULLS LAST
    LIMIT 1
  );

-- Step 2: Remove non-admin roles from admin users
-- Root admin: jacsolucionesgraficas@gmail.com
DELETE FROM organization_member_roles 
WHERE user_id = '06aa55b0-61ea-41f0-9708-7a3d322b6795'
  AND role NOT IN ('admin', 'strategist');

-- Admin: alexander7818@gmail.com - keep only admin and strategist
DELETE FROM organization_member_roles 
WHERE user_id = '8569be04-9e86-49d8-9714-3d81423e836e'
  AND role NOT IN ('admin', 'strategist');

-- Admin: ale312109@gmail.com - keep only admin
DELETE FROM organization_member_roles 
WHERE user_id = '10842b38-4a80-490d-ada3-b3fc35d91822'
  AND role != 'admin';

-- Admin: mile_160711@hotmail.com - keep only admin
DELETE FROM organization_member_roles 
WHERE user_id = '45f51c68-6c95-40c8-a5c3-4fdd792edd0d'
  AND role != 'admin';

-- Step 3: Remove client role from creators who are NOT clients
DELETE FROM organization_member_roles 
WHERE user_id = '230389fb-312c-4398-9aec-a3d75f16e539'
  AND role = 'client';

-- Step 4: Sync organization_member_roles for users missing from the table
INSERT INTO organization_member_roles (organization_id, user_id, role)
SELECT om.organization_id, om.user_id, om.role
FROM organization_members om
WHERE NOT EXISTS (
  SELECT 1 FROM organization_member_roles omr 
  WHERE omr.user_id = om.user_id 
    AND omr.organization_id = om.organization_id
    AND omr.role = om.role
)
ON CONFLICT (organization_id, user_id, role) DO NOTHING;

-- Step 5: Update active_role for admins
UPDATE profiles SET active_role = 'admin'
WHERE email IN ('jacsolucionesgraficas@gmail.com', 'alexander7818@gmail.com', 'ale312109@gmail.com', 'mile_160711@hotmail.com', 'kairosgp.sas@gmail.com');

-- Step 6: Update active_role for strategist
UPDATE profiles SET active_role = 'strategist'
WHERE email = 'comercialugccolombia@gmail.com';

-- Step 7: Set active_role = 'client' for actual clients
UPDATE profiles SET active_role = 'client'
WHERE id IN (
  SELECT user_id FROM organization_members WHERE role = 'client'
)
AND active_role IS NULL;
