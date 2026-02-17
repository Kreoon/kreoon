import { AppRole, AmbassadorLevel } from '@/types/database';
import { getPermissionGroup, isDeprecatedRole, isSystemRole, type PermissionGroup } from './permissionGroups';
import { MARKETPLACE_ROLES, MARKETPLACE_ROLES_MAP } from '@/components/marketplace/roles/marketplaceRoleConfig';
import type { MarketplaceRoleId } from '@/components/marketplace/types/marketplace';

// ============= 8 GLOBAL NICHE ROLES =============
// These are the primary roles shown in role pickers (instead of 36 marketplace specializations)
const GLOBAL_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  team_leader: 'Líder de Equipo',
  creator: 'Creador de Contenido',
  editor: 'Editor / Post-Producción',
  strategist: 'Estratega & Marketing',
  developer: 'Desarrollador',
  educator: 'Educador',
  client: 'Cliente',
};

// ============= GROUP-BASED LABELS =============
// Base labels per permission group (fallback when marketplace config doesn't have a specific label)
const GROUP_LABELS: Record<PermissionGroup, string> = {
  admin: 'Administrador',
  team_leader: 'Líder de Equipo',
  creator: 'Creador de Contenido',
  editor: 'Editor / Post-Producción',
  strategist: 'Estratega',
  client: 'Cliente',
};

const GROUP_LABELS_SHORT: Record<PermissionGroup, string> = {
  admin: 'Admin',
  team_leader: 'Líder',
  creator: 'Creador',
  editor: 'Editor',
  strategist: 'Estratega',
  client: 'Cliente',
};

// ============= GROUP-BASED COLORS =============
const GROUP_COLORS: Record<PermissionGroup, string> = {
  admin: 'bg-destructive/20 text-destructive',
  team_leader: 'bg-indigo-500/20 text-indigo-500',
  creator: 'bg-primary/20 text-primary',
  editor: 'bg-purple-500/20 text-purple-500',
  strategist: 'bg-orange-500/20 text-orange-500',
  client: 'bg-info/20 text-info',
};

const GROUP_BADGE_COLORS: Record<PermissionGroup, string> = {
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  team_leader: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  creator: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  editor: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  strategist: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  client: 'bg-green-500/10 text-green-500 border-green-500/20',
};

const GROUP_SOLID_COLORS: Record<PermissionGroup, string> = {
  admin: 'bg-primary',
  team_leader: 'bg-indigo-500',
  creator: 'bg-purple-500',
  editor: 'bg-blue-500',
  strategist: 'bg-orange-500',
  client: 'bg-green-500',
};

// ============= AMBASSADOR BADGE STYLING =============
// Ambassador is a badge/privilege, NOT a role
// Use organization_member_badges table for ambassador status
export const AMBASSADOR_BADGE_LABELS: Record<AmbassadorLevel, string> = {
  bronze: 'Embajador Bronce',
  silver: 'Embajador Plata',
  gold: 'Embajador Oro'
};

export const AMBASSADOR_BADGE_COLORS: Record<AmbassadorLevel, string> = {
  bronze: 'bg-amber-600/20 text-amber-600',
  silver: 'bg-slate-400/20 text-slate-400',
  gold: 'bg-yellow-500/20 text-yellow-500'
};

export const AMBASSADOR_BADGE_SOLID_COLORS: Record<AmbassadorLevel, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-slate-400',
  gold: 'bg-yellow-500'
};

// ============= HELPER FUNCTIONS =============

/** Get the display label for any role (global niche → marketplace-specific → group fallback) */
export function getRoleLabel(role: AppRole | string): string {
  if (GLOBAL_ROLE_LABELS[role]) return GLOBAL_ROLE_LABELS[role];
  const mktRole = MARKETPLACE_ROLES_MAP[role as MarketplaceRoleId];
  if (mktRole) return mktRole.label;
  const group = getPermissionGroup(role);
  return GROUP_LABELS[group] || role;
}

/** Get the short display label for any role */
export function getRoleLabelShort(role: AppRole | string): string {
  const mktRole = MARKETPLACE_ROLES_MAP[role as MarketplaceRoleId];
  if (mktRole) return mktRole.label; // marketplace roles use their full label as short too
  const group = getPermissionGroup(role);
  return GROUP_LABELS_SHORT[group] || role;
}

/** Get the color class for any role (marketplace-specific or group fallback) */
export function getRoleColor(role: AppRole | string): string {
  const mktRole = MARKETPLACE_ROLES_MAP[role as MarketplaceRoleId];
  if (mktRole) return `${mktRole.bgColor} ${mktRole.color}`;
  const group = getPermissionGroup(role);
  return GROUP_COLORS[group] || '';
}

/** Get the badge color class for any role */
export function getRoleBadgeColor(role: AppRole | string): string {
  const group = getPermissionGroup(role);
  return GROUP_BADGE_COLORS[group] || '';
}

/** Get the solid color class for any role */
export function getRoleSolidColor(role: AppRole | string): string {
  const group = getPermissionGroup(role);
  return GROUP_SOLID_COLORS[group] || 'bg-muted';
}

// Get the primary role from an array (priority: by permission group weight)
export function getPrimaryRole(roles: AppRole[]): AppRole | null {
  if (roles.length === 0) return null;

  // Priority order by permission group
  const groupPriority: PermissionGroup[] = ['admin', 'team_leader', 'strategist', 'editor', 'creator', 'client'];

  for (const group of groupPriority) {
    const match = roles.find(r => getPermissionGroup(r) === group);
    if (match) return match;
  }

  return roles[0];
}

// Get role badge info (label + color) for display
export function getRoleBadgeInfo(roles: AppRole[]): { label: string; color: string } | null {
  const primary = getPrimaryRole(roles);
  if (!primary) return null;

  return {
    label: getRoleLabelShort(primary),
    color: getRoleSolidColor(primary)
  };
}

// Check if a role array contains admin
export function isAdminRole(roles: AppRole[]): boolean {
  return roles.some(r => getPermissionGroup(r) === 'admin');
}

// ============= ROLE ARRAYS =============

// The 8 global niche roles (simplified role system)
export const GLOBAL_NICHE_ROLES: AppRole[] = [
  'admin', 'team_leader', 'creator', 'editor', 'strategist', 'developer', 'educator', 'client',
];

// All marketplace roles (specializations within creator_profiles, not for org assignment)
export const MARKETPLACE_ASSIGNABLE_ROLES: AppRole[] = MARKETPLACE_ROLES.map(r => r.id as AppRole);

// All roles that can appear in UI selectors
export const SELECTABLE_ROLES: AppRole[] = [...GLOBAL_NICHE_ROLES];

// All available roles (global + marketplace + legacy for backward compat)
export const ALL_ROLES: AppRole[] = [
  ...GLOBAL_NICHE_ROLES,
  ...MARKETPLACE_ASSIGNABLE_ROLES,
  'ambassador', 'trafficker',
];

// Roles that can be assigned by org owners (8 global minus admin)
export const ORG_ASSIGNABLE_ROLES: AppRole[] = [
  'team_leader', 'creator', 'editor', 'strategist', 'developer', 'educator', 'client',
];

// Ambassador badge levels for selection
export const AMBASSADOR_LEVELS: AmbassadorLevel[] = ['bronze', 'silver', 'gold'];

// ============= BACKWARD COMPAT EXPORTS =============
// These Record objects are kept for any code that still imports them directly.
// They use Partial<Record> to avoid exhaustive key requirements.

export const ROLE_LABELS: Partial<Record<AppRole, string>> = {
  admin: 'Administrador',
  team_leader: 'Líder de Equipo',
  creator: 'Creador de Contenido',
  editor: 'Editor / Post-Producción',
  strategist: 'Estratega & Marketing',
  developer: 'Desarrollador',
  educator: 'Educador',
  client: 'Cliente',
  trafficker: 'Trafficker',
  ambassador: 'Embajador',
};

export const ROLE_LABELS_SHORT: Partial<Record<AppRole, string>> = {
  admin: 'Admin',
  team_leader: 'Líder',
  creator: 'Creador',
  editor: 'Editor',
  strategist: 'Estratega',
  developer: 'Dev',
  educator: 'Educador',
  client: 'Cliente',
  trafficker: 'Trafficker',
  ambassador: 'Embajador',
};

export const ROLE_COLORS: Partial<Record<AppRole, string>> = {
  admin: 'bg-destructive/20 text-destructive',
  team_leader: 'bg-indigo-500/20 text-indigo-500',
  creator: 'bg-primary/20 text-primary',
  editor: 'bg-purple-500/20 text-purple-500',
  strategist: 'bg-orange-500/20 text-orange-500',
  developer: 'bg-cyan-500/20 text-cyan-500',
  educator: 'bg-yellow-500/20 text-yellow-500',
  client: 'bg-info/20 text-info',
  trafficker: 'bg-cyan-500/20 text-cyan-500',
  ambassador: 'bg-amber-500/20 text-amber-500',
};

export const ROLE_BADGE_COLORS: Partial<Record<AppRole, string>> = {
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  team_leader: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  creator: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  editor: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  strategist: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  developer: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  educator: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  client: 'bg-green-500/10 text-green-500 border-green-500/20',
  trafficker: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  ambassador: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

export const ROLE_SOLID_COLORS: Partial<Record<AppRole, string>> = {
  admin: 'bg-primary',
  team_leader: 'bg-indigo-500',
  creator: 'bg-purple-500',
  editor: 'bg-blue-500',
  strategist: 'bg-orange-500',
  developer: 'bg-cyan-500',
  educator: 'bg-yellow-500',
  client: 'bg-green-500',
  trafficker: 'bg-cyan-500',
  ambassador: 'bg-amber-500',
};
