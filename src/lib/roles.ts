import { AppRole, AmbassadorLevel } from '@/types/database';

// ============= LABELS =============
export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  creator: 'Creador de Contenido',
  editor: 'Productor Audio-Visual',
  client: 'Cliente',
  strategist: 'Estratega',
  trafficker: 'Trafficker',
  team_leader: 'Líder de Equipo',
  ambassador: 'Embajador'
};

export const ROLE_LABELS_SHORT: Record<AppRole, string> = {
  admin: 'Admin',
  creator: 'Creador',
  editor: 'Productor AV',
  client: 'Cliente',
  strategist: 'Estratega',
  trafficker: 'Trafficker',
  team_leader: 'Líder',
  ambassador: 'Embajador'
};

// ============= COLORS =============
export const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive/20 text-destructive',
  creator: 'bg-primary/20 text-primary',
  editor: 'bg-purple-500/20 text-purple-500',
  client: 'bg-info/20 text-info',
  strategist: 'bg-orange-500/20 text-orange-500',
  trafficker: 'bg-cyan-500/20 text-cyan-500',
  team_leader: 'bg-indigo-500/20 text-indigo-500',
  ambassador: 'bg-amber-500/20 text-amber-500'
};

export const ROLE_BADGE_COLORS: Record<AppRole, string> = {
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  creator: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  editor: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  client: 'bg-green-500/10 text-green-500 border-green-500/20',
  strategist: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  trafficker: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  team_leader: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  ambassador: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
};

export const ROLE_SOLID_COLORS: Record<AppRole, string> = {
  admin: 'bg-primary',
  creator: 'bg-purple-500',
  editor: 'bg-blue-500',
  client: 'bg-green-500',
  strategist: 'bg-orange-500',
  trafficker: 'bg-cyan-500',
  team_leader: 'bg-indigo-500',
  ambassador: 'bg-amber-500'
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
export function getRoleLabel(role: AppRole | string): string {
  return ROLE_LABELS[role as AppRole] || role;
}

export function getRoleLabelShort(role: AppRole | string): string {
  return ROLE_LABELS_SHORT[role as AppRole] || role;
}

export function getRoleColor(role: AppRole | string): string {
  return ROLE_COLORS[role as AppRole] || '';
}

export function getRoleBadgeColor(role: AppRole | string): string {
  return ROLE_BADGE_COLORS[role as AppRole] || '';
}

export function getRoleSolidColor(role: AppRole | string): string {
  return ROLE_SOLID_COLORS[role as AppRole] || 'bg-muted';
}

// Get the primary role from an array (priority order)
export function getPrimaryRole(roles: AppRole[]): AppRole | null {
  if (roles.length === 0) return null;
  
  const priority: AppRole[] = ['admin', 'team_leader', 'strategist', 'trafficker', 'ambassador', 'creator', 'editor', 'client'];
  
  for (const role of priority) {
    if (roles.includes(role)) {
      return role;
    }
  }
  
  return roles[0];
}

// Get role badge info (label + color) for display
export function getRoleBadgeInfo(roles: AppRole[]): { label: string; color: string } | null {
  const primary = getPrimaryRole(roles);
  if (!primary) return null;
  
  return {
    label: ROLE_LABELS_SHORT[primary],
    color: ROLE_SOLID_COLORS[primary]
  };
}

// Check if a role array contains admin
export function isAdminRole(roles: AppRole[]): boolean {
  return roles.includes('admin');
}

// Roles that can appear in UI selectors
export const SELECTABLE_ROLES: AppRole[] = ['admin', 'team_leader', 'strategist', 'trafficker', 'ambassador', 'creator', 'editor', 'client'];

// All available roles
export const ALL_ROLES: AppRole[] = ['admin', 'team_leader', 'strategist', 'trafficker', 'ambassador', 'creator', 'editor', 'client'];

// Roles that can be assigned by org owners
export const ORG_ASSIGNABLE_ROLES: AppRole[] = ['team_leader', 'strategist', 'trafficker', 'ambassador', 'creator', 'editor', 'client'];

// Ambassador badge levels for selection
export const AMBASSADOR_LEVELS: AmbassadorLevel[] = ['bronze', 'silver', 'gold'];
