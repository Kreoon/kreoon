import { AppRole } from '@/types/database';

// ============= LABELS =============
export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Administrador',
  creator: 'Creador',
  editor: 'Editor',
  client: 'Cliente',
  ambassador: 'Embajador',
  strategist: 'Estratega'
};

export const ROLE_LABELS_SHORT: Record<AppRole, string> = {
  admin: 'Admin',
  creator: 'Creador',
  editor: 'Editor',
  client: 'Cliente',
  ambassador: 'Embajador',
  strategist: 'Estratega'
};

// ============= COLORS =============
export const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive/20 text-destructive',
  creator: 'bg-primary/20 text-primary',
  editor: 'bg-purple-500/20 text-purple-500',
  client: 'bg-info/20 text-info',
  ambassador: 'bg-success/20 text-success',
  strategist: 'bg-orange-500/20 text-orange-500'
};

export const ROLE_BADGE_COLORS: Record<AppRole, string> = {
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  creator: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  editor: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  client: 'bg-green-500/10 text-green-500 border-green-500/20',
  ambassador: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  strategist: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
};

export const ROLE_SOLID_COLORS: Record<AppRole, string> = {
  admin: 'bg-primary',
  creator: 'bg-purple-500',
  editor: 'bg-blue-500',
  client: 'bg-green-500',
  ambassador: 'bg-yellow-500',
  strategist: 'bg-orange-500'
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
  
  const priority: AppRole[] = ['admin', 'ambassador', 'strategist', 'creator', 'editor', 'client'];
  
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

// All available roles for selection
export const ALL_ROLES: AppRole[] = ['admin', 'strategist', 'creator', 'editor', 'client', 'ambassador'];

// Roles that can be assigned by org owners (not platform-level)
export const ORG_ASSIGNABLE_ROLES: AppRole[] = ['strategist', 'creator', 'editor', 'client', 'ambassador'];
