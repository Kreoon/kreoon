import { useMemo } from 'react';
import { Content } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { getRoleArea } from '@/lib/permissionGroups';
import { ContentResource, ContentAction, ContentPermissions, TabKey } from '../types';

/**
 * RBAC Permission Matrix
 * Defines what each role can do on each resource
 * Format: { [role]: { [resource]: [actions] } }
 */
const PERMISSION_MATRIX: Record<string, Partial<Record<ContentResource, ContentAction[]>>> = {
  admin: {
    'content.title': ['view', 'edit'],
    'content.status': ['view', 'edit', 'approve'],
    'content.scripts': ['view', 'edit'],
    'content.scripts.creator': ['view', 'edit'],
    'content.scripts.editor': ['view', 'edit'],
    'content.scripts.trafficker': ['view', 'edit'],
    'content.scripts.strategist': ['view', 'edit'],
    'content.scripts.designer': ['view', 'edit'],
    'content.scripts.admin': ['view', 'edit'],
    'content.video': ['view', 'edit'],
    'content.video.upload': ['view', 'edit'],
    'content.video.download': ['view'],
    'content.video.thumbnail': ['view', 'edit'],
    'content.material': ['view', 'edit'],
    'content.material.raw_videos': ['view', 'edit'],
    'content.material.drive': ['view', 'edit'],
    'content.general': ['view', 'edit'],
    'content.team': ['view', 'edit'],
    'content.dates': ['view', 'edit'],
    'content.payments': ['view', 'edit'],
    'content.comments': ['view', 'edit'],
    'content.delete': ['edit'],
  },
  creator: {
    'content.title': ['view'],
    'content.status': ['view', 'edit'], // Can advance status (recording -> recorded)
    'content.scripts': ['view'],
    'content.scripts.creator': ['view', 'edit'], // Can edit their own block
    'content.scripts.editor': ['view'],
    'content.scripts.trafficker': ['view'],
    'content.scripts.strategist': ['view'],
    'content.scripts.designer': ['view'],
    'content.scripts.admin': ['view'],
    'content.video': ['view'],
    'content.video.download': ['view'],
    'content.material': ['view', 'edit'],
    'content.material.raw_videos': ['view', 'edit'],
    'content.material.drive': ['view', 'edit'],
    'content.general': ['view'],
    'content.comments': ['view', 'edit'],
  },
  editor: {
    'content.title': ['view'],
    'content.status': ['view', 'edit'], // Can advance status (editing -> delivered)
    'content.scripts': ['view'],
    'content.scripts.creator': ['view'],
    'content.scripts.editor': ['view', 'edit'], // Can edit their own block
    'content.scripts.trafficker': ['view'],
    'content.scripts.strategist': ['view'],
    'content.scripts.designer': ['view'],
    'content.scripts.admin': ['view'],
    'content.video': ['view', 'edit'],
    'content.video.upload': ['view', 'edit'],
    'content.video.download': ['view'],
    'content.material': ['view'],
    'content.general': ['view'],
    'content.comments': ['view', 'edit'],
  },
  strategist: {
    'content.title': ['view', 'edit'],
    'content.status': ['view', 'edit', 'approve'], // Strategist can approve content
    'content.scripts': ['view', 'edit'],
    'content.scripts.creator': ['view', 'edit'],
    'content.scripts.editor': ['view', 'edit'],
    'content.scripts.trafficker': ['view', 'edit'],
    'content.scripts.strategist': ['view', 'edit'],
    'content.scripts.designer': ['view', 'edit'],
    'content.scripts.admin': ['view'],
    'content.video': ['view', 'edit'],
    'content.video.upload': ['view', 'edit'],
    'content.video.download': ['view'],
    'content.video.thumbnail': ['view', 'edit'],
    'content.material': ['view', 'edit'],
    'content.material.raw_videos': ['view', 'edit'],
    'content.material.drive': ['view', 'edit'],
    'content.general': ['view', 'edit'],
    'content.team': ['view', 'edit'], // Strategist can assign team members
    'content.dates': ['view', 'edit'], // Strategist can edit dates and deadlines
    'content.comments': ['view', 'edit'],
  },
  client: {
    'content.title': ['view'],
    'content.status': ['view', 'approve'], // Can approve
    'content.scripts': ['view'],
    'content.scripts.creator': ['view'],
    'content.scripts.editor': ['view'],
    'content.scripts.trafficker': ['view'],
    'content.scripts.strategist': ['view'],
    'content.scripts.designer': ['view'],
    'content.scripts.admin': ['view'],
    'content.video': ['view'],
    'content.video.download': ['view'],
    'content.comments': ['view', 'edit'],
  },
};

/**
 * Tab visibility by role
 */
const TAB_VISIBILITY: Record<string, TabKey[]> = {
  admin: ['scripts', 'video', 'material', 'thumbnail', 'general', 'team', 'dates', 'payments'],
  creator: ['scripts', 'video', 'material', 'general'],
  editor: ['scripts', 'video', 'material', 'thumbnail', 'general'],
  strategist: ['scripts', 'video', 'material', 'thumbnail', 'general', 'team', 'dates'],
  client: ['scripts', 'video'],
};

/**
 * Hook that provides permission checking for content resources
 * Uses RBAC matrix instead of hardcoded role checks
 */
export function useContentPermissions(content: Content | null): ContentPermissions {
  const { user, isAdmin, isCreator, isEditor, isClient, isStrategist, activeRole } = useAuth();

  return useMemo(() => {
    // Determine effective role - resolve to RBAC matrix key
    const getEffectiveRole = (): string => {
      // Use getRoleArea which properly distinguishes content_creation vs post_production
      const area = activeRole ? getRoleArea(activeRole) : null;

      if (area) {
        // Admin/system role → admin permissions
        if (area === 'system') return 'admin';

        // Strategist roles → strategist permissions (if assigned)
        if (area === 'strategy_marketing' && content?.strategist_id === user?.id) return 'strategist';

        // Content creation roles (content_creator, creator, etc.) → creator permissions (if assigned)
        if (area === 'content_creation' && content?.creator_id === user?.id) return 'creator';

        // Post-production roles (editor, video_editor, etc.) → editor permissions (if assigned)
        if (area === 'post_production' && content?.editor_id === user?.id) return 'editor';

        // Client roles
        if (area === 'client') return 'client';

        // Talent not assigned to this specific content - give them guest view
        return 'guest';
      }

      // Fallback to checking boolean flags (already group-based via useAuth)
      if (isAdmin) return 'admin';
      if (content?.strategist_id === user?.id) return 'strategist';
      if (isCreator && content?.creator_id === user?.id) return 'creator';
      if (isEditor && content?.editor_id === user?.id) return 'editor';
      if (isClient) return 'client';
      return 'guest';
    };

    const effectiveRole = getEffectiveRole();
    const rolePermissions = PERMISSION_MATRIX[effectiveRole] || {};

    // Check if user can perform action on resource
    const can = (resource: ContentResource, action: ContentAction): boolean => {
      const allowedActions = rolePermissions[resource];
      if (!allowedActions) return false;
      return allowedActions.includes(action);
    };

    // Check if resource is read-only for current user
    const isReadOnly = (resource: ContentResource): boolean => {
      return can(resource, 'view') && !can(resource, 'edit');
    };

    // Get visible tabs for role
    const visibleTabs = TAB_VISIBILITY[effectiveRole] || ['scripts', 'video'];

    // Can user enter edit mode at all?
    const canEnterEditMode = Object.values(rolePermissions).some(
      actions => actions?.includes('edit')
    );

    return {
      can,
      visibleTabs,
      isReadOnly,
      canEnterEditMode,
    };
  }, [content, user?.id, isAdmin, isCreator, isEditor, isClient, isStrategist, activeRole]);
}
