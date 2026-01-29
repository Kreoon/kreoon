import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type PortfolioPermission = 
  | 'portfolio.feed.view'
  | 'portfolio.explore.view'
  | 'portfolio.creators.view'
  | 'portfolio.videos.view'
  | 'portfolio.profile.view'
  | 'portfolio.profile.edit'
  | 'portfolio.saved.view'
  | 'portfolio.posts.create'
  | 'portfolio.stories.create'
  | 'portfolio.internal.view'
  | 'portfolio.ai.use';

export type BlockVisibility = 'public' | 'owner' | 'org_admin' | 'roles';

export interface ProfileBlock {
  key: string;
  label: string;
  enabled: boolean;
  order: number;
  visibility: BlockVisibility;
  is_internal: boolean;
  allowed_roles?: string[];
  settings?: Record<string, unknown>;
}

export interface PortfolioPermissions {
  permissions: Record<PortfolioPermission, boolean>;
  loading: boolean;
  can: (permission: PortfolioPermission) => boolean;
  canViewBlock: (block: ProfileBlock, isOwner: boolean, targetUserId?: string) => boolean;
  canEditBlock: (block: ProfileBlock, isOwner: boolean) => boolean;
  isOrgAdmin: boolean;
  refetch: () => Promise<void>;
}

const DEFAULT_PERMISSIONS: Record<PortfolioPermission, boolean> = {
  'portfolio.feed.view': true,
  'portfolio.explore.view': true,
  'portfolio.creators.view': true,
  'portfolio.videos.view': true,
  'portfolio.profile.view': true,
  'portfolio.profile.edit': false,
  'portfolio.saved.view': true,
  'portfolio.posts.create': false,
  'portfolio.stories.create': false,
  'portfolio.internal.view': false,
  'portfolio.ai.use': false,
};

const ADMIN_PERMISSIONS: Record<PortfolioPermission, boolean> = {
  'portfolio.feed.view': true,
  'portfolio.explore.view': true,
  'portfolio.creators.view': true,
  'portfolio.videos.view': true,
  'portfolio.profile.view': true,
  'portfolio.profile.edit': true,
  'portfolio.saved.view': true,
  'portfolio.posts.create': true,
  'portfolio.stories.create': true,
  'portfolio.internal.view': true,
  'portfolio.ai.use': true,
};

const CREATOR_PERMISSIONS: Record<PortfolioPermission, boolean> = {
  'portfolio.feed.view': true,
  'portfolio.explore.view': true,
  'portfolio.creators.view': true,
  'portfolio.videos.view': true,
  'portfolio.profile.view': true,
  'portfolio.profile.edit': true,
  'portfolio.saved.view': true,
  'portfolio.posts.create': true,
  'portfolio.stories.create': true,
  'portfolio.internal.view': false,
  'portfolio.ai.use': true,
};

export function usePortfolioPermissions(): PortfolioPermissions {
  const { user, profile, isAdmin, isCreator, isClient, roles, activeRole } = useAuth();
  const organizationId = profile?.current_organization_id;
  const [permissions, setPermissions] = useState<Record<PortfolioPermission, boolean>>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);
  const [isOrgOwner, setIsOrgOwner] = useState(false);

  const fetchPermissions = useCallback(async () => {
    if (!user?.id) {
      setPermissions(DEFAULT_PERMISSIONS);
      setLoading(false);
      return;
    }

    try {
      // Check if user is org owner
      if (organizationId) {
        const { data: memberData } = await supabase
          .from('organization_members')
          .select('is_owner')
          .eq('user_id', user.id)
          .eq('organization_id', organizationId)
          .single();
        
        setIsOrgOwner(memberData?.is_owner || false);

        // If admin or org owner, grant all permissions
        if (isAdmin || memberData?.is_owner) {
          setPermissions(ADMIN_PERMISSIONS);
          setLoading(false);
          return;
        }

        // Fetch role-based permissions from DB
        const userRoles = roles || [];
        if (userRoles.length > 0) {
          const { data: permData } = await supabase
            .from('portfolio_permissions')
            .select('permissions')
            .eq('organization_id', organizationId)
            .in('role', userRoles);

          if (permData && permData.length > 0) {
            // Merge permissions (grant if any role has permission)
            const merged = { ...DEFAULT_PERMISSIONS };
            permData.forEach(p => {
              const perms = p.permissions as Record<string, boolean>;
              Object.keys(perms).forEach(key => {
                if (perms[key]) {
                  merged[key as PortfolioPermission] = true;
                }
              });
            });
            setPermissions(merged);
            setLoading(false);
            return;
          }
        }
      }

      // Fallback to role-based defaults using activeRole
      // Client role = company context, limited portfolio access
      if (isClient || activeRole === 'client') {
        setPermissions({
          ...DEFAULT_PERMISSIONS,
          'portfolio.profile.view': true,
          'portfolio.feed.view': true,
          'portfolio.videos.view': true,
        });
      } else if (isCreator || activeRole === 'creator') {
        setPermissions(CREATOR_PERMISSIONS);
      } else {
        setPermissions(DEFAULT_PERMISSIONS);
      }
    } catch (error) {
      console.error('[usePortfolioPermissions] Error fetching permissions:', error);
      setPermissions(DEFAULT_PERMISSIONS);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin, isCreator, isClient, roles, activeRole, organizationId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const can = useCallback((permission: PortfolioPermission): boolean => {
    return permissions[permission] ?? false;
  }, [permissions]);

  const canViewBlock = useCallback((
    block: ProfileBlock, 
    isOwner: boolean, 
    targetUserId?: string
  ): boolean => {
    if (!block.enabled) return false;

    const isOrgAdmin = isAdmin || isOrgOwner;

    switch (block.visibility) {
      case 'public':
        return true;
      case 'owner':
        return isOwner || isOrgAdmin;
      case 'org_admin':
        return isOrgAdmin;
      case 'roles':
        if (isOrgAdmin) return true;
        if (!block.allowed_roles || block.allowed_roles.length === 0) return false;
        return (roles || []).some(r => block.allowed_roles!.includes(r));
      default:
        return false;
    }
  }, [isAdmin, isOrgOwner, roles]);

  const canEditBlock = useCallback((block: ProfileBlock, isOwner: boolean): boolean => {
    if (!block.enabled) return false;
    if (block.is_internal) return isAdmin || isOrgOwner;
    return isOwner || isAdmin || isOrgOwner;
  }, [isAdmin, isOrgOwner]);

  const isOrgAdmin = useMemo(() => isAdmin || isOrgOwner, [isAdmin, isOrgOwner]);

  return {
    permissions,
    loading,
    can,
    canViewBlock,
    canEditBlock,
    isOrgAdmin,
    refetch: fetchPermissions,
  };
}
