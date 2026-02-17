import type {
  UnifiedProject,
  UnifiedPermissions,
  UnifiedResource,
  UnifiedAction,
  UnifiedSectionKey,
  RolePermissions,
  ProjectParticipantRole,
  Permission,
  ProjectAssignment,
} from '@/types/unifiedProject.types';
import {
  getProjectTypeConfig,
  resolveParticipantRole,
  getRolePermissions,
  ROLE_PERMISSION_PRESETS,
} from '@/types/unifiedProject.types';

interface UserContext {
  userId: string;
  isAdmin: boolean;
  roles: string[];
  /** For marketplace: is the current user the brand owner? */
  isBrandOwner?: boolean;
  /** For marketplace: is the current user the assigned creator? */
  isProjectCreator?: boolean;
  /** For marketplace: is the current user the assigned editor? */
  isProjectEditor?: boolean;
}

// ============================================================
// CONTENT-SOURCE PERMISSIONS
// Delegates to the existing ContentPermissions & BlockConfig
// hooks when in content mode. This is just the adapter shape.
// ============================================================

/** Default full-access role permissions (used as fallback for content adapter) */
const FULL_ROLE_PERMISSIONS: RolePermissions = {
  header: { status: 'edit', title: 'edit', dates: 'edit' },
  brief: { view: 'view', edit: 'edit' },
  workspace: { own_block: 'edit', other_blocks: 'edit' },
  materials: { view: 'view', upload: 'edit' },
  deliverables: { view: 'view', upload: 'edit', approve: 'approve' },
  team: 'edit',
  payments: { view_own: true, view_all: true, edit: true },
  delete: 'edit',
};

/** Resolve participant role from assignments only (for content source adapter) */
function resolveParticipantRoleFromAssignments(
  userId?: string,
  assignments?: ProjectAssignment[],
): ProjectParticipantRole {
  if (!userId || !assignments?.length) return 'admin'; // default for content
  const match = assignments.find(a => a.userId === userId && a.status !== 'cancelled');
  if (!match) return 'admin';
  switch (match.roleGroup) {
    case 'creator': return 'assigned_creator';
    case 'editor': return 'assigned_editor';
    case 'strategist': return 'assigned_strategist';
    default: return 'assigned_talent';
  }
}

/**
 * Adapt existing ContentPermissions + BlockConfigHook into UnifiedPermissions.
 * Called from useUnifiedProject when source='content'.
 */
export function adaptContentPermissions(
  contentPermissions: {
    can: (resource: string, action: string) => boolean;
    visibleTabs: string[];
    isReadOnly: (resource: string) => boolean;
    canEnterEditMode: boolean;
  },
  blockConfig: {
    canViewBlock: (key: string) => boolean;
    canEditBlock: (key: string) => boolean;
    isBlockLocked: (key: string) => boolean;
  },
  userId?: string,
  assignments?: ProjectAssignment[],
): UnifiedPermissions {
  // Map content resource keys to unified resource keys
  const contentToUnified: Record<string, UnifiedResource> = {
    'content.title': 'project.title',
    'content.status': 'project.status',
    'content.scripts': 'project.workspace',
    'content.video': 'project.deliverables',
    'content.material': 'project.materials',
    'content.general': 'project.brief',
    'content.team': 'project.team',
    'content.dates': 'project.dates',
    'content.payments': 'project.payments',
    'content.delete': 'project.delete',
  };

  // Map content tab keys to unified section keys
  const tabToSection: Record<string, UnifiedSectionKey> = {
    scripts: 'workspace',
    video: 'deliverables',
    material: 'materials',
    general: 'brief',
    team: 'team',
    dates: 'dates',
    payments: 'payments',
  };

  const visibleSections: UnifiedSectionKey[] = contentPermissions.visibleTabs
    .map(tab => tabToSection[tab])
    .filter((s): s is UnifiedSectionKey => !!s);

  return {
    can: (resource: UnifiedResource, action: UnifiedAction) => {
      // Handle sub-resource keys by mapping to parent
      const baseResource = resource.replace(/\.(own_block|other_blocks|upload|approve)$/, '') as string;
      const contentKey = Object.entries(contentToUnified).find(([, v]) => v === baseResource || v === resource)?.[0];
      if (!contentKey) return false;
      return contentPermissions.can(contentKey, action);
    },
    visibleSections,
    isReadOnly: (resource: UnifiedResource) => {
      const baseResource = resource.replace(/\.(own_block|other_blocks|upload|approve)$/, '') as string;
      const contentKey = Object.entries(contentToUnified).find(([, v]) => v === baseResource || v === resource)?.[0];
      if (!contentKey) return true;
      return contentPermissions.isReadOnly(contentKey);
    },
    canEnterEditMode: contentPermissions.canEnterEditMode,
    // Content source uses the existing 3-layer permission system;
    // rolePermissions here is a best-effort approximation
    rolePermissions: FULL_ROLE_PERMISSIONS,
    participantRole: resolveParticipantRoleFromAssignments(userId, assignments),
  };
}

// ============================================================
// MARKETPLACE-SOURCE PERMISSIONS
// Uses granular RolePermissions resolved from presets.
// ============================================================

/** Check if a Permission level satisfies a requested action */
function permissionSatisfies(perm: Permission, action: UnifiedAction): boolean {
  if (perm === 'none') return false;
  if (action === 'view') return perm === 'view' || perm === 'edit' || perm === 'approve';
  if (action === 'edit') return perm === 'edit' || perm === 'approve';
  if (action === 'approve') return perm === 'approve';
  return false;
}

export function buildMarketplacePermissions(
  project: UnifiedProject,
  user: UserContext,
): UnifiedPermissions {
  const config = getProjectTypeConfig(project.projectType);

  // Resolve participant role
  const participantRole = resolveParticipantRole(
    project,
    user.userId,
    user.isAdmin,
    !!user.isBrandOwner,
  );

  // Get granular permissions for this role
  const rp = getRolePermissions(project.projectType, participantRole);

  // Determine visible sections
  const visibleSections = config.visibleTabs.filter(section => {
    switch (section) {
      case 'workspace': return permissionSatisfies(rp.workspace.own_block, 'view') || permissionSatisfies(rp.workspace.other_blocks, 'view');
      case 'brief': return permissionSatisfies(rp.brief.view, 'view');
      case 'deliverables': return permissionSatisfies(rp.deliverables.view, 'view');
      case 'materials': return permissionSatisfies(rp.materials.view, 'view');
      case 'review': return permissionSatisfies(rp.deliverables.approve, 'view') || permissionSatisfies(rp.deliverables.view, 'view');
      case 'team': return permissionSatisfies(rp.team, 'view');
      case 'dates': return permissionSatisfies(rp.header.dates, 'view');
      case 'payments': return rp.payments.view_own || rp.payments.view_all;
      default: return false;
    }
  });

  const canEnterEditMode =
    permissionSatisfies(rp.workspace.own_block, 'edit') ||
    permissionSatisfies(rp.brief.edit, 'edit') ||
    permissionSatisfies(rp.deliverables.upload, 'edit') ||
    permissionSatisfies(rp.header.title, 'edit') ||
    rp.payments.edit;

  return {
    can: (resource: UnifiedResource, action: UnifiedAction) => {
      switch (resource) {
        case 'project.title': return permissionSatisfies(rp.header.title, action);
        case 'project.status': return permissionSatisfies(rp.header.status, action);
        case 'project.dates': return permissionSatisfies(rp.header.dates, action);
        case 'project.brief': return action === 'view' ? permissionSatisfies(rp.brief.view, action) : permissionSatisfies(rp.brief.edit, action);
        case 'project.workspace': return permissionSatisfies(rp.workspace.own_block, action) || permissionSatisfies(rp.workspace.other_blocks, action);
        case 'project.workspace.own_block': return permissionSatisfies(rp.workspace.own_block, action);
        case 'project.workspace.other_blocks': return permissionSatisfies(rp.workspace.other_blocks, action);
        case 'project.materials': return action === 'view' ? permissionSatisfies(rp.materials.view, action) : permissionSatisfies(rp.materials.upload, action);
        case 'project.materials.upload': return permissionSatisfies(rp.materials.upload, action);
        case 'project.deliverables': return action === 'approve' ? permissionSatisfies(rp.deliverables.approve, action) : action === 'view' ? permissionSatisfies(rp.deliverables.view, action) : permissionSatisfies(rp.deliverables.upload, action);
        case 'project.deliverables.upload': return permissionSatisfies(rp.deliverables.upload, action);
        case 'project.deliverables.approve': return permissionSatisfies(rp.deliverables.approve, action);
        case 'project.review': return permissionSatisfies(rp.deliverables.view, action);
        case 'project.team': return permissionSatisfies(rp.team, action);
        case 'project.payments': return action === 'view' ? (rp.payments.view_own || rp.payments.view_all) : rp.payments.edit;
        case 'project.delete': return permissionSatisfies(rp.delete, action);
        default: return false;
      }
    },
    visibleSections,
    isReadOnly: (resource: UnifiedResource) => {
      switch (resource) {
        case 'project.workspace': return !permissionSatisfies(rp.workspace.own_block, 'edit');
        case 'project.brief': return !permissionSatisfies(rp.brief.edit, 'edit');
        case 'project.deliverables': return !permissionSatisfies(rp.deliverables.upload, 'edit');
        case 'project.materials': return !permissionSatisfies(rp.materials.upload, 'edit');
        case 'project.team': return !permissionSatisfies(rp.team, 'edit');
        case 'project.dates': return !permissionSatisfies(rp.header.dates, 'edit');
        case 'project.payments': return !rp.payments.edit;
        case 'project.title': return !permissionSatisfies(rp.header.title, 'edit');
        case 'project.status': return !permissionSatisfies(rp.header.status, 'edit');
        default: return true;
      }
    },
    canEnterEditMode,
    rolePermissions: rp,
    participantRole,
  };
}
