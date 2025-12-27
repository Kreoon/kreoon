import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Content } from '@/types/database';
import {
  ScriptSubTab,
  ScriptPermissions,
  ScriptPermissionsHook,
  ScriptPermissionRow,
  DEFAULT_PERMISSIONS,
  SCRIPT_SUB_TABS,
} from './types';

// Extended content type for DB fields not in local type
interface ContentWithOrgFields extends Content {
  organization_id?: string | null;
  custom_status_id?: string | null;
}

/**
 * Hook that provides granular script permissions based on:
 * - Organization configuration (script_permissions table)
 * - User role
 * - Current content status (for status-based overrides)
 */
export function useScriptPermissions(
  content: Content | null,
  organizationId?: string | null
): ScriptPermissionsHook {
  const { user, isAdmin, isCreator, isEditor, isClient } = useAuth();
  const [dbPermissions, setDbPermissions] = useState<ScriptPermissionRow | null>(null);
  const [loading, setLoading] = useState(true);

  // Cast content to include optional DB fields
  const contentExt = content as ContentWithOrgFields | null;

  // Determine effective role
  const effectiveRole = useMemo(() => {
    if (isAdmin) return 'admin';
    if (content?.strategist_id === user?.id) return 'strategist';
    if (isCreator && content?.creator_id === user?.id) return 'creator';
    if (isEditor && content?.editor_id === user?.id) return 'editor';
    if (isClient) return 'client';
    return 'guest';
  }, [isAdmin, isCreator, isEditor, isClient, content, user?.id]);

  // Fetch permissions from database
  useEffect(() => {
    const fetchPermissions = async () => {
      const orgId = organizationId || contentExt?.organization_id;
      if (!orgId || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('script_permissions')
          .select('*')
          .eq('organization_id', orgId)
          .eq('role', effectiveRole)
          .maybeSingle();

        if (error) {
          console.error('Error fetching script permissions:', error);
        } else if (data) {
          setDbPermissions(data as ScriptPermissionRow);
        }
      } catch (err) {
        console.error('Error in fetchPermissions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [organizationId, contentExt?.organization_id, effectiveRole, user?.id]);

  // Build permissions object from DB or defaults
  const permissions = useMemo((): ScriptPermissions => {
    // Get base permissions
    let base: ScriptPermissions = DEFAULT_PERMISSIONS[effectiveRole] || DEFAULT_PERMISSIONS.client;

    // Override with DB permissions if available
    if (dbPermissions) {
      base = {
        ia: {
          view: dbPermissions.ia_view,
          edit: dbPermissions.ia_edit,
          generate: dbPermissions.ia_generate,
        },
        script: {
          view: dbPermissions.script_view,
          edit: dbPermissions.script_edit,
          approve: dbPermissions.script_approve,
        },
        editor: {
          view: dbPermissions.editor_view,
          edit: dbPermissions.editor_edit,
        },
        strategist: {
          view: dbPermissions.strategist_view,
          edit: dbPermissions.strategist_edit,
        },
        designer: {
          view: dbPermissions.designer_view,
          edit: dbPermissions.designer_edit,
        },
        trafficker: {
          view: dbPermissions.trafficker_view,
          edit: dbPermissions.trafficker_edit,
        },
        admin: {
          view: dbPermissions.admin_view,
          edit: dbPermissions.admin_edit,
          lock: dbPermissions.admin_lock,
        },
      };

      // Apply status-based overrides if applicable
      const currentStatusId = contentExt?.custom_status_id;
      if (currentStatusId && dbPermissions.status_overrides?.[currentStatusId]) {
        const overrides = dbPermissions.status_overrides[currentStatusId];
        Object.keys(overrides).forEach((tabKey) => {
          const tab = tabKey as ScriptSubTab;
          if (overrides[tab]) {
            base[tab] = { ...base[tab], ...overrides[tab] };
          }
        });
      }
    }

    return base;
  }, [dbPermissions, effectiveRole, contentExt?.custom_status_id]);

  // Permission check functions
  const canView = useCallback(
    (tab: ScriptSubTab): boolean => {
      return permissions[tab]?.view ?? false;
    },
    [permissions]
  );

  const canEdit = useCallback(
    (tab: ScriptSubTab): boolean => {
      return permissions[tab]?.edit ?? false;
    },
    [permissions]
  );

  const canGenerate = useCallback((): boolean => {
    return permissions.ia?.generate ?? false;
  }, [permissions]);

  const canApprove = useCallback((): boolean => {
    return permissions.script?.approve ?? false;
  }, [permissions]);

  const canLock = useCallback((): boolean => {
    return permissions.admin?.lock ?? false;
  }, [permissions]);

  const isReadOnly = useCallback(
    (tab: ScriptSubTab): boolean => {
      return canView(tab) && !canEdit(tab);
    },
    [canView, canEdit]
  );

  // Get visible tabs (those with view permission)
  const visibleTabs = useMemo((): ScriptSubTab[] => {
    return SCRIPT_SUB_TABS.filter((tab) => canView(tab.key)).map((tab) => tab.key);
  }, [canView]);

  return {
    permissions,
    loading,
    canView,
    canEdit,
    canGenerate,
    canApprove,
    canLock,
    isReadOnly,
    visibleTabs,
  };
}
