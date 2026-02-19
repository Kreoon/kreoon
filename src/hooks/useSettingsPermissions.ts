import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { useOrgOwner } from './useOrgOwner';
import { supabase } from '@/integrations/supabase/client';

// Section keys for settings module (CONSOLIDATED - reduced from 25 to 17)
export type SettingsSectionKey = 
  // User level
  | 'profile'
  | 'notifications'      // Merged: personal notifications + org preferences + chat RBAC
  | 'security'
  | 'tour'
  | 'marketplace'        // Marketplace profile, roles, services, availability
  // Organization level
  | 'organization'
  | 'org_registration_settings' // Registration & invite settings
  | 'organization_plans'
  | 'ai_settings'        // Merged: portfolio_ai + organization_ai + assistant
  | 'permissions'        // Merged: organization_permissions + global_permissions
  | 'audit_log'
  | 'org_marketplace'    // Marketplace access control & public portfolio
  | 'org_agency_profile' // Public agency profile for marketplace
  | 'live_streaming_org' // KREOON Live - Organization level config
  | 'white_label'        // White-label branding, domain, email config
  // Platform level (Root only)
  | 'organization_registrations'
  | 'referrals'
  | 'billing'            // Merged: subscription_management + user_plans + currency + billing_control
  | 'platform_config'    // Merged: app_settings + appearance + integrations
  | 'platform_admin'     // Merged: platform_security + root_admin
  | 'tracking'           // Tracking & Analytics engine (platform level)
  | 'ai_tokenization'    // AI-powered profile tokenization
  | 'live_streaming';    // KREOON Live - Platform level config

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
  marketplace: 'user',
  // Organization level - org admin/owner only
  organization: 'organization',
  org_registration_settings: 'organization',
  organization_plans: 'organization',
  ai_settings: 'organization',
  permissions: 'organization',
  audit_log: 'organization',
  org_marketplace: 'organization', // Marketplace control & portfolio
  org_agency_profile: 'organization', // Agency profile for marketplace
  live_streaming_org: 'organization', // KREOON Live org config
  white_label: 'organization',       // White-label settings
  // Platform level - root only
  organization_registrations: 'platform',
  referrals: 'user', // Accessible to all users (perpetual referral program)
  billing: 'platform',
  platform_config: 'platform',
  platform_admin: 'platform',
  tracking: 'platform',
  ai_tokenization: 'platform',
  live_streaming: 'platform', // KREOON Live platform config
};

// Module key mapping for database lookup
const SECTION_TO_MODULE: Partial<Record<SettingsSectionKey, string>> = {
  profile: 'settings_profile',
  organization: 'settings_organization',
  organization_plans: 'settings_plans',
  ai_settings: 'settings_ai',
  audit_log: 'settings_audit',
  permissions: 'settings_permissions',
  tracking: 'settings_tracking',
};

const ROOT_EMAILS = ["jacsolucionesgraficas@gmail.com", "kairosgp.sas@gmail.com"];

// Sections that strategists can access (limited org access)
const STRATEGIST_ACCESSIBLE_SECTIONS: SettingsSectionKey[] = [
  'organization', // View org info
  'org_registration_settings', // Manage registrations
  'ai_settings', // AI configuration
];

export function useSettingsPermissions(): SettingsPermissions {
  const { user, profile, isAdmin, roles, activeRole, isStrategist } = useAuth();
  const { isOrgOwner, isPlatformRoot: isPlatformRootFromHook, currentOrgId, loading: orgLoading } = useOrgOwner();
  
  const [orgPermissions, setOrgPermissions] = useState<Record<string, { can_view: boolean; can_create: boolean; can_modify: boolean }>>({});
  const [loading, setLoading] = useState(true);

  // Determine if user is platform root
  const isPlatformRoot = useMemo(() => {
    // IMPORTANT: during migrations profile can fail to load by auth.uid();
    // use auth user email as the source of truth.
    return (user?.email && ROOT_EMAILS.includes(user.email)) || isPlatformRootFromHook;
  }, [user?.email, isPlatformRootFromHook]);

  // Determine if user is org admin (uses permission group from useAuth)
  const isOrgAdmin = useMemo(() => {
    return isAdmin; // isAdmin already checks via permission group in useAuth
  }, [isAdmin]);

  // Determine if user is strategist with limited org access
  const isOrgStrategist = useMemo(() => {
    return isStrategist; // isStrategist already checks via permission group in useAuth
  }, [isStrategist]);

  // Fetch organization-level permission overrides
  const fetchOrgPermissions = useCallback(async () => {
    if (!currentOrgId || !profile?.id) {
      setLoading(false);
      return;
    }

    try {
      // Use activeRole instead of roles[0] to respect role switching
      const userRole = activeRole || roles[0] || 'creator';
      
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
  // Include activeRole in dependencies to refetch when role changes
  }, [currentOrgId, profile?.id, roles, activeRole]);

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
      // Strategists have limited access to some org sections
      if (isOrgStrategist && STRATEGIST_ACCESSIBLE_SECTIONS.includes(sectionKey)) {
        // Check for org-level overrides first
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
        // Strategists get full access to their allowed sections
        return { canAccess: true, canView: true, canCreate: true, canModify: true };
      }

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
  }, [isPlatformRoot, isOrgOwner, isOrgAdmin, isOrgStrategist, orgPermissions]);

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
