-- ============================================================================
-- Migration: Add user_type to profiles
-- Description: Adds account type field to differentiate platform versions
--              (client, organization, talent)
-- ============================================================================

-- Add user_type column to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_type TEXT
CHECK (user_type IN ('client', 'organization', 'talent'));

-- Create index for queries by user type
CREATE INDEX IF NOT EXISTS idx_profiles_user_type ON profiles(user_type);

-- Add comment
COMMENT ON COLUMN profiles.user_type IS 'Tipo de cuenta: client (marca/empresa), organization (agencia), talent (creador independiente)';

-- ============================================================================
-- Migrate existing users based on their current data
-- ============================================================================

UPDATE profiles p
SET user_type = CASE
    -- Users with client role -> client
    WHEN p.active_role = 'client' THEN 'client'

    -- Users in client_users table -> client
    WHEN EXISTS (
        SELECT 1 FROM client_users cu WHERE cu.user_id = p.id
    ) THEN 'client'

    -- Organization owners -> organization
    WHEN EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = p.id
        AND om.is_owner = true
        AND om.deleted_at IS NULL
    ) THEN 'organization'

    -- Everyone else -> talent (default)
    ELSE 'talent'
END
WHERE p.user_type IS NULL;

-- ============================================================================
-- Update get_full_user_detail RPC to include user_type
-- ============================================================================

CREATE OR REPLACE FUNCTION get_full_user_detail(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result json;
BEGIN
    SELECT json_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'username', p.username,
        'avatar_url', p.avatar_url,
        'phone', p.phone,
        'bio', p.bio,
        'city', p.city,
        'country', p.country,
        'nationality', p.nationality,
        'date_of_birth', p.date_of_birth,
        'gender', p.gender,
        'document_type', p.document_type,
        'document_number', p.document_number,
        'active_role', p.active_role,
        'user_type', p.user_type,
        'current_organization_id', p.current_organization_id,
        'is_active', p.is_active,
        'is_superadmin', p.is_superadmin,
        'is_platform_admin', p.is_platform_admin,
        'platform_access_unlocked', p.platform_access_unlocked,
        'profile_completed', p.profile_completed,
        'onboarding_completed', p.onboarding_completed,
        'legal_consents_completed', p.legal_consents_completed,
        'age_verified', p.age_verified,
        'created_at', p.created_at,
        'updated_at', p.updated_at,
        -- Social links
        'instagram', p.instagram,
        'facebook', p.facebook,
        'tiktok', p.tiktok,
        'social_instagram', p.social_instagram,
        'social_facebook', p.social_facebook,
        'social_tiktok', p.social_tiktok,
        'social_youtube', p.social_youtube,
        'social_linkedin', p.social_linkedin,
        'social_twitter', p.social_twitter,
        'social_x', p.social_x,
        -- Organization info
        'organization', (
            SELECT json_build_object(
                'id', o.id,
                'name', o.name,
                'slug', o.slug
            )
            FROM organizations o
            WHERE o.id = p.current_organization_id
        ),
        -- Roles in current organization
        'organization_roles', (
            SELECT COALESCE(json_agg(omr.role), '[]'::json)
            FROM organization_member_roles omr
            WHERE omr.user_id = p.id
            AND omr.organization_id = p.current_organization_id
        ),
        -- Specializations
        'specializations', (
            SELECT COALESCE(json_agg(us.specialization), '[]'::json)
            FROM user_specializations us
            WHERE us.user_id = p.id
        )
    ) INTO result
    FROM profiles p
    WHERE p.id = p_user_id;

    RETURN result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_full_user_detail(uuid) TO authenticated;
