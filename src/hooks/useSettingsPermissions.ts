import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useOrgOwner } from './useOrgOwner';
import { supabase } from '@/integrations/supabase/client';

// Section keys for settings module (CONSOLIDATED - reduced from 25 to 16)
export type SettingsSectionKey = 
  // User level
  | 'profile'
  | 'notifications'      // Merged: personal notifications + org preferences + chat RBAC
  | 'security'
  | 'tour'
  // Organization level
  | 'organization'
  | 'organization_plans'
  | 'ai_settings'        // Merged: portfolio_ai + organization_ai + assistant
  | 'ambassadors'
  | 'permissions'        // Merged: organization_permissions + global_permissions
  | 'audit_log'
  // Platform level (Root only)
  | 'organization_registrations'
  | 'platform_users'
  | 'referrals'
  | 'billing'            // Merged: subscription_management + user_plans + currency + billing_control
  | 'platform_config'    // Merged: app_settings + appearance + integrations
  | 'platform_admin'     // Merged: platform_security + root_admin
  | 'tracking';          // Tracking & Analytics engine (platform level)

export interface SectionPermission {
  canAccess: boolean;
  canView: boolean;
  canCreate: boolean;
  canModify: boolean;
  reason?: string; // Why access is denied
}

export interface SettingsPermissions {
  loading: boolean;
  isOrgOwner: boolean;
  isOrgAdmin: boolean;
  isPlatformRoot: boolean;
  currentOrgId: string | null;
  getPermission: (sectionKey: SettingsSectionKey) => SectionPermission;
  canAccess: (sectionKey: SettingsSectionKey) => boolean;
  canView: (sectionKey: SettingsSectionKey) => boolean;
  canModify: (sectionKey: SettingsSectionKey) => boolean;
  canCreate: (sectionKey: SettingsSectionKey) => boolean;
  refetch: () => Promise<void>;
}

// Define which level each section belongs to
const SECTION_LEVELS: Record<SettingsSectionKey, 'user' | 'organization' | 'platform'> = {
  // User level - everyone can access their own
  profile: 'user',
  notifications: 'user',
  security: 'user',
  tour: 'user',
  // Organization level - org admin/owner only
  organization: 'organization',
  organization_plans: 'organization',
  ai_settings: 'organization',
  ambassadors: 'organization',
  permissions: 'organization',
  audit_log: 'organization',
  // Platform level - root only
  organization_registrations: 'platform',
  platform_users: 'platform',
  referrals: 'platform',
  billing: 'platform',
  platform_config: 'platform',
  platform_admin: 'platform',
  tracking: 'platform',
};

// Module key mapping for database lookup
const SECTION_TO_MODULE: Partial<Record<SettingsSectionKey, string>> = {
  profile: 'settings_profile',
  organization: 'settings_organization',
  organization_plans: 'settings_plans',
  ambassadors: 'settings_ambassadors',
  ai_settings: 'settings_ai',
  audit_log: 'settings_audit',
  permissions: 'settings_permissions',
  tracking: 'settings_tracking',
};

const ROOT_EMAIL = "jacsolucionesgraficas@gmail.com";

export function useSettingsPermissions(): SettingsPermissions {
  const { profile, isAdmin, roles } = useAuth();
  const { isOrgOwner, isPlatformRoot: isPlatformRootFromHook, currentOrgId, loading: orgLoading } = useOrgOwner();
  
  const [orgPermissions, setOrgPermissions] = useState<Record<string, { can_view: boolean; can_create: boolean; can_modify: boolean }>>({});
  const [loading, setLoading] = useState(true);

  // Determine if user is platform root
  const isPlatformRoot = useMemo(() => {
    return profile?.email === ROOT_EMAIL || isPlatformRootFromHook;
  }, [profile?.email, isPlatformRootFromHook]);

  // Determine if user is org admin (has admin role within org)
  const isOrgAdmin = useMemo(() => {
    return isAdmin || roles.includes('admin');
  }, [isAdmin, roles]);

  // Fetch organization-level permission overrides
  const fetchOrgPermissions = useCallback(async () => {
    if (!currentOrgId || !profile?.id) {
      setLoading(false);
      return;
    }

    try {
      // Get user's primary role in the organization
      const userRole = roles[0] || 'creator';
      
      // Fetch org overrides for this role (use any to handle new table not in types yet)
      const { data: orgData } = await supabase
        .from('org_role_permissions' as any)
        .select('module_key, can_view, can_create, can_modify')
        .eq('organization_id', currentOrgId)
        .eq('role', userRole) as { data: Array<{ module_key: string; can_view: boolean; can_create: boolean; can_modify: boolean }> | null };

      const permissions: Record<string, { can_view: boolean; can_create: boolean; can_modify: boolean }> = {};
      
      if (orgData) {
        orgData.forEach((p: { module_key: string; can_view: boolean; can_create: boolean; can_modify: boolean }) => {
          permissions[p.module_key] = {
            can_view: p.can_view,
            can_create: p.can_create,
            can_modify: p.can_modify,
          };
        });
      }
      
      setOrgPermissions(permissions);
    } catch (error) {
      console.error('Error fetching org permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [currentOrgId, profile?.id, roles]);

  useEffect(() => {
    if (!orgLoading) {
      fetchOrgPermissions();
    }
  }, [fetchOrgPermissions, orgLoading]);

  // Get permission for a specific section
  const getPermission = useCallback((sectionKey: SettingsSectionKey): SectionPermission => {
    const level = SECTION_LEVELS[sectionKey];
    
    // Platform root has full access to everything
    if (isPlatformRoot) {
      return { canAccess: true, canView: true, canCreate: true, canModify: true };
    }

    // Platform level sections - only root can access
    if (level === 'platform') {
      return { 
        canAccess: false, 
        canView: false, 
        canCreate: false, 
        canModify: false,
        reason: 'Solo el administrador de plataforma puede acceder' 
      };
    }

    // Organization level sections - org owner/admin can access
    if (level === 'organization') {
      if (!isOrgOwner && !isOrgAdmin) {
        return { 
          canAccess: false, 
          canView: false, 
          canCreate: false, 
          canModify: false,
          reason: 'Solo administradores de organización pueden acceder' 
        };
      }

      // Check for org-level overrides
      const moduleKey = SECTION_TO_MODULE[sectionKey];
      if (moduleKey && orgPermissions[moduleKey]) {
        const perm = orgPermissions[moduleKey];
        return {
          canAccess: perm.can_view,
          canView: perm.can_view,
          canCreate: perm.can_create,
          canModify: perm.can_modify,
        };
      }

      // Default for org admins/owners - full access to org sections
      return { canAccess: true, canView: true, canCreate: true, canModify: true };
    }

    // User level sections - everyone can access their own
    return { canAccess: true, canView: true, canCreate: true, canModify: true };
  }, [isPlatformRoot, isOrgOwner, isOrgAdmin, orgPermissions]);

  // Convenience methods
  const canAccess = useCallback((sectionKey: SettingsSectionKey) => {
    return getPermission(sectionKey).canAccess;
  }, [getPermission]);

  const canView = useCallback((sectionKey: SettingsSectionKey) => {
    return getPermission(sectionKey).canView;
  }, [getPermission]);

  const canModify = useCallback((sectionKey: SettingsSectionKey) => {
    return getPermission(sectionKey).canModify;
  }, [getPermission]);

  const canCreate = useCallback((sectionKey: SettingsSectionKey) => {
    return getPermission(sectionKey).canCreate;
  }, [getPermission]);

  return {
    loading: loading || orgLoading,
    isOrgOwner,
    isOrgAdmin,
    isPlatformRoot,
    currentOrgId,
    getPermission,
    canAccess,
    canView,
    canModify,
    canCreate,
    refetch: fetchOrgPermissions,
  };
}
