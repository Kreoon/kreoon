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
  const { user, roles } = useAuth();
  const { currentOrgId, isOrgOwner } = useOrgOwner();
  const [permissions, setPermissions] = useState<UPPermissions>(DEFAULT_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && currentOrgId) {
      fetchPermissions();
    } else {
      setLoading(false);
    }
  }, [user, currentOrgId, roles]);

  const fetchPermissions = async () => {
    if (!user || !currentOrgId) return;

    setLoading(true);
    try {
      // Check if user is admin or org owner - they get full permissions
      const isAdmin = roles.includes('admin');
      
      if (isAdmin || isOrgOwner) {
        setPermissions(ADMIN_PERMISSIONS);
        setLoading(false);
        return;
      }

      // Get user's primary role for this org
      const userRole = roles[0] || 'creator';

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

  const getRoleBasedPermissions = (): UPPermissions => {
    if (roles.includes('strategist')) {
      return {
        ...DEFAULT_PERMISSIONS,
        canViewOthersUP: true,
        canViewAnalytics: true,
        canViewFraudAlerts: true,
      };
    }

    if (roles.includes('editor') || roles.includes('creator')) {
      return {
        ...DEFAULT_PERMISSIONS,
        canViewQualityScore: true,
      };
    }

    return DEFAULT_PERMISSIONS;
  };

  return {
    permissions,
    loading,
    refetch: fetchPermissions,
    isAdmin: roles.includes('admin') || isOrgOwner,
  };
}