import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrgOwner } from '@/hooks/useOrgOwner';

export interface UPPermissions {
  // View permissions
  canViewOwnUP: boolean;
  canViewRanking: boolean;
  canViewOthersUP: boolean;
  canViewQualityScore: boolean;
  canViewFraudAlerts: boolean;
  
  // Management permissions
  canCreateRules: boolean;
  canEditRules: boolean;
  canDeleteRules: boolean;
  canActivateAIFeatures: boolean;
  canApproveAIEvents: boolean;
  canManualAdjust: boolean;
  canManageSeasons: boolean;
  canViewAnalytics: boolean;
}

const DEFAULT_PERMISSIONS: UPPermissions = {
  canViewOwnUP: true,
  canViewRanking: true,
  canViewOthersUP: false,
  canViewQualityScore: true,
  canViewFraudAlerts: false,
  canCreateRules: false,
  canEditRules: false,
  canDeleteRules: false,
  canActivateAIFeatures: false,
  canApproveAIEvents: false,
  canManualAdjust: false,
  canManageSeasons: false,
  canViewAnalytics: false,
};

const ADMIN_PERMISSIONS: UPPermissions = {
  canViewOwnUP: true,
  canViewRanking: true,
  canViewOthersUP: true,
  canViewQualityScore: true,
  canViewFraudAlerts: true,
  canCreateRules: true,
  canEditRules: true,
  canDeleteRules: true,
  canActivateAIFeatures: true,
  canApproveAIEvents: true,
  canManualAdjust: true,
  canManageSeasons: true,
  canViewAnalytics: true,
};

export function useUPPermissions() {
  const { user, roles, activeRole } = useAuth();
  const { currentOrgId, isOrgOwner } = useOrgOwner();
  const [permissions, setPermissions] = useState<UPPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && currentOrgId) {
      fetchPermissions();
    } else {
      setLoading(false);
    }
  }, [user, currentOrgId, roles, activeRole]);

  const fetchPermissions = async () => {
    if (!user || !currentOrgId) return;

    setLoading(true);
    try {
      // Check if user is admin or org owner - they get full permissions
      // Use activeRole to determine current context
      const isAdmin = activeRole === 'admin';
      
      if (isAdmin || isOrgOwner) {
        setPermissions(ADMIN_PERMISSIONS);
        setLoading(false);
        return;
      }

      // Use activeRole instead of roles[0] to respect role switching
      const userRole = activeRole || roles[0] || 'creator';

      // Try to fetch permissions for this role from up_permissions table
      const { data, error } = await supabase
        .from('up_permissions')
        .select('can_view_own_up, can_view_ranking, can_view_others_up, can_create_rules, can_edit_rules, can_toggle_ai, can_approve_ai_events, can_manual_adjust, can_view_fraud_alerts, can_view_quality_scores, can_manage_quests, can_manage_seasons')
        .eq('organization_id', currentOrgId)
        .eq('role', userRole)
        .maybeSingle();

      if (error) {
        console.error('Error fetching UP permissions:', error);
        setPermissions(getRoleBasedPermissions());
        return;
      }

      if (data) {
        setPermissions({
          canViewOwnUP: data.can_view_own_up ?? true,
          canViewRanking: data.can_view_ranking ?? true,
          canViewOthersUP: data.can_view_others_up ?? false,
          canViewQualityScore: data.can_view_quality_scores ?? true,
          canViewFraudAlerts: data.can_view_fraud_alerts ?? false,
          canCreateRules: data.can_create_rules ?? false,
          canEditRules: data.can_edit_rules ?? false,
          canDeleteRules: data.can_create_rules ?? false,
          canActivateAIFeatures: data.can_toggle_ai ?? false,
          canApproveAIEvents: data.can_approve_ai_events ?? false,
          canManualAdjust: data.can_manual_adjust ?? false,
          canManageSeasons: data.can_manage_seasons ?? false,
          canViewAnalytics: data.can_view_ranking ?? false,
        });
      } else {
        setPermissions(getRoleBasedPermissions());
      }
    } catch (error) {
      console.error('Error in useUPPermissions:', error);
      setPermissions(getRoleBasedPermissions());
    } finally {
      setLoading(false);
    }
  };

  // Use activeRole for role-based permission fallback
  const getRoleBasedPermissions = (): UPPermissions => {
    const currentRole = activeRole || roles[0];
    
    if (currentRole === 'strategist') {
      return {
        ...DEFAULT_PERMISSIONS,
        canViewOthersUP: true,
        canViewAnalytics: true,
        canViewFraudAlerts: true,
      };
    }

    if (currentRole === 'editor' || currentRole === 'creator') {
      return {
        ...DEFAULT_PERMISSIONS,
        canViewQualityScore: true,
      };
    }

    // Client role gets minimal permissions
    if (currentRole === 'client') {
      return {
        ...DEFAULT_PERMISSIONS,
        canViewOwnUP: false,
        canViewRanking: false,
      };
    }

    return DEFAULT_PERMISSIONS;
  };

  return {
    permissions,
    loading,
    refetch: fetchPermissions,
    isAdmin: activeRole === 'admin' || isOrgOwner,
    activeRole,
  };
}