import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const ROOT_EMAIL = "jacsolucionesgraficas@gmail.com";

export interface OrgOwnerStatus {
  isOrgOwner: boolean;
  isPlatformRoot: boolean;
  currentOrgId: string | null;
  currentOrgName: string | null;
  loading: boolean;
}

/**
 * Hook to determine if the current user is:
 * - Platform root admin (jacsolucionesgraficas@gmail.com)
 * - Organization owner (is_owner = true in organization_members for their current org)
 * 
 * This is critical for access control between platform-level and org-level permissions.
 */
export function useOrgOwner(): OrgOwnerStatus {
  const { user, profile } = useAuth();
  const [isOrgOwner, setIsOrgOwner] = useState(false);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [currentOrgName, setCurrentOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isPlatformRoot = profile?.email === ROOT_EMAIL;

  useEffect(() => {
    const checkOwnerStatus = async () => {
      if (!user || !profile?.current_organization_id) {
        setIsOrgOwner(false);
        setCurrentOrgId(null);
        setCurrentOrgName(null);
        setLoading(false);
        return;
      }

      try {
        // Check if user is owner of their current organization
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('is_owner')
          .eq('user_id', user.id)
          .eq('organization_id', profile.current_organization_id)
          .maybeSingle();

        setIsOrgOwner(memberData?.is_owner || false);
        setCurrentOrgId(profile.current_organization_id);

        // Fetch org name
        const { data: orgData } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.current_organization_id)
          .maybeSingle();

        setCurrentOrgName(orgData?.name || null);
      } catch (error) {
        console.error('Error checking org owner status:', error);
        setIsOrgOwner(false);
      } finally {
        setLoading(false);
      }
    };

    checkOwnerStatus();
  }, [user, profile?.current_organization_id]);

  return {
    isOrgOwner,
    isPlatformRoot,
    currentOrgId,
    currentOrgName,
    loading
  };
}
