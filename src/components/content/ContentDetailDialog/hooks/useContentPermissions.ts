import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Content, AppRole } from '@/types/database';
import { 
  ContentResource, 
  ContentAction, 
  TabKey, 
  ContentPermissions 
} from '../types';

interface UseContentPermissionsOptions {
  content: Content | null;
  organizationId?: string;
}

// ============= PERMISSION MATRIX =============
// Define what each role can do with each resource
// This is the single source of truth for permissions
const PERMISSION_MATRIX: Record<AppRole, Partial<Record<ContentResource, ContentAction[]>>> = {
  admin: {
    'content.scripts': ['view', 'create', 'edit', 'delete', 'approve'],
    'content.scripts.creador': ['view', 'edit'],
    'content.scripts.editor': ['view', 'edit'],
    'content.scripts.trafficker': ['view', 'edit'],
    'content.scripts.estratega': ['view', 'edit'],
    'content.scripts.disenador': ['view', 'edit'],
    'content.scripts.admin': ['view', 'edit'],
    'content.video': ['view', 'create', 'edit', 'delete'],
    'content.video.upload': ['view', 'create', 'edit'],
    'content.video.download': ['view'],
    'content.video.thumbnail': ['view', 'edit'],
    'content.material': ['view', 'create', 'edit'],
    'content.material.raw_videos': ['view', 'create', 'edit'],
    'content.material.drive': ['view', 'edit'],
    'content.general': ['view', 'edit'],
    'content.team': ['view', 'edit'],
    'content.dates': ['view', 'edit'],
    'content.payments': ['view', 'edit'],
    'content.comments': ['view', 'create'],
    'content.status': ['view', 'edit'],
    'content.delete': ['delete'],
  },
  strategist: {
    'content.scripts': ['view', 'create', 'edit'],
    'content.scripts.creador': ['view', 'edit'],
    'content.scripts.editor': ['view', 'edit'],
    'content.scripts.trafficker': ['view', 'edit'],
    'content.scripts.estratega': ['view', 'edit'],
    'content.scripts.disenador': ['view', 'edit'],
    'content.scripts.admin': ['view', 'edit'],
    'content.video': ['view', 'edit'],
    'content.video.upload': ['view', 'edit'],
    'content.video.download': ['view'],
    'content.video.thumbnail': ['view', 'edit'],
    'content.material': ['view', 'edit'],
    'content.material.raw_videos': ['view', 'edit'],
    'content.material.drive': ['view', 'edit'],
    'content.general': ['view', 'edit'],
    'content.team': ['view'],
    'content.dates': ['view'],
    'content.payments': ['view'],
    'content.comments': ['view', 'create'],
    'content.status': ['view', 'edit'],
    'content.delete': [],
  },
  creator: {
    'content.scripts': ['view'],
    'content.scripts.creador': ['view'],
    'content.scripts.editor': ['view'],
    'content.scripts.trafficker': [],
    'content.scripts.estratega': [],
    'content.scripts.disenador': [],
    'content.scripts.admin': [],
    'content.video': ['view'],
    'content.video.upload': [],
    'content.video.download': ['view'],
    'content.video.thumbnail': [],
    'content.material': ['view', 'edit'],
    'content.material.raw_videos': ['view', 'create', 'edit'],
    'content.material.drive': ['view', 'edit'],
    'content.general': ['view', 'edit'],
    'content.team': [],
    'content.dates': [],
    'content.payments': [],
    'content.comments': ['view', 'create'],
    'content.status': ['view'],
    'content.delete': [],
  },
  editor: {
    'content.scripts': ['view'],
    'content.scripts.creador': ['view'],
    'content.scripts.editor': ['view'],
    'content.scripts.trafficker': [],
    'content.scripts.estratega': [],
    'content.scripts.disenador': [],
    'content.scripts.admin': [],
    'content.video': ['view', 'edit'],
    'content.video.upload': ['view', 'edit'],
    'content.video.download': ['view'],
    'content.video.thumbnail': [],
    'content.material': ['view'],
    'content.material.raw_videos': ['view'],
    'content.material.drive': ['view'],
    'content.general': ['view', 'edit'],
    'content.team': [],
    'content.dates': [],
    'content.payments': [],
    'content.comments': ['view', 'create'],
    'content.status': ['view'],
    'content.delete': [],
  },
  client: {
    'content.scripts': ['view', 'approve'],
    'content.scripts.creador': ['view'],
    'content.scripts.editor': [],
    'content.scripts.trafficker': [],
    'content.scripts.estratega': [],
    'content.scripts.disenador': [],
    'content.scripts.admin': [],
    'content.video': ['view'],
    'content.video.upload': [],
    'content.video.download': ['view'],
    'content.video.thumbnail': [],
    'content.material': [],
    'content.material.raw_videos': [],
    'content.material.drive': [],
    'content.general': [],
    'content.team': [],
    'content.dates': [],
    'content.payments': [],
    'content.comments': ['view', 'create'],
    'content.status': ['view', 'edit'],
    'content.delete': [],
  },
  ambassador: {
    'content.scripts': ['view'],
    'content.scripts.creador': ['view'],
    'content.scripts.editor': ['view'],
    'content.scripts.trafficker': [],
    'content.scripts.estratega': [],
    'content.scripts.disenador': [],
    'content.scripts.admin': [],
    'content.video': ['view'],
    'content.video.upload': [],
    'content.video.download': ['view'],
    'content.video.thumbnail': [],
    'content.material': ['view', 'edit'],
    'content.material.raw_videos': ['view', 'create', 'edit'],
    'content.material.drive': ['view', 'edit'],
    'content.general': ['view', 'edit'],
    'content.team': [],
    'content.dates': [],
    'content.payments': [],
    'content.comments': ['view', 'create'],
    'content.status': ['view'],
    'content.delete': [],
  },
};

// Define which tabs each role can see
const TAB_VISIBILITY: Record<AppRole, TabKey[]> = {
  admin: ['scripts', 'video', 'material', 'general', 'equipo', 'fechas', 'pagos'],
  strategist: ['scripts', 'video', 'material', 'general'],
  creator: ['scripts', 'video', 'material', 'general'],
  editor: ['scripts', 'video', 'material', 'general'],
  client: ['scripts', 'video'],
  ambassador: ['scripts', 'video', 'material', 'general'],
};

export function useContentPermissions({ 
  content, 
  organizationId 
}: UseContentPermissionsOptions): ContentPermissions {
  const { user, activeRole, isAdmin } = useAuth();

  return useMemo(() => {
    const role = (activeRole || 'client') as AppRole;
    const userId = user?.id;

    // Check if user is the assigned creator/editor/strategist
    const isAssignedCreator = content?.creator_id === userId;
    const isAssignedEditor = content?.editor_id === userId;
    const isAssignedStrategist = content?.strategist_id === userId;

    const can = (resource: ContentResource, action: ContentAction): boolean => {
      // Admin always has full access
      if (isAdmin) return true;

      // Get base permissions from matrix
      const rolePermissions = PERMISSION_MATRIX[role];
      if (!rolePermissions) return false;

      const resourcePermissions = rolePermissions[resource];
      if (!resourcePermissions) return false;

      const hasBasePermission = resourcePermissions.includes(action);
      if (!hasBasePermission) return false;

      // Additional checks based on assignment
      // Creators can only edit material if they're assigned
      if (role === 'creator' && resource.startsWith('content.material') && action === 'edit') {
        return isAssignedCreator;
      }

      // Editors can only edit video if they're assigned
      if (role === 'editor' && resource.startsWith('content.video') && action === 'edit') {
        return isAssignedEditor;
      }

      // Strategists can only edit scripts if they're assigned
      if (role === 'strategist' && resource.startsWith('content.scripts') && action === 'edit') {
        return isAssignedStrategist;
      }

      return hasBasePermission;
    };

    const isReadOnly = (resource: ContentResource): boolean => {
      return !can(resource, 'edit');
    };

    const visibleTabs = TAB_VISIBILITY[role] || ['scripts', 'video'];

    const canEnterEditMode = 
      isAdmin || 
      (role === 'creator' && isAssignedCreator) ||
      (role === 'editor' && isAssignedEditor) ||
      (role === 'strategist' && isAssignedStrategist);

    return {
      can,
      visibleTabs,
      isReadOnly,
      canEnterEditMode,
    };
  }, [user?.id, activeRole, isAdmin, content?.creator_id, content?.editor_id, content?.strategist_id]);
}
