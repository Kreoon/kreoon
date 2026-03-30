import { AppRole, AmbassadorLevel } from '@/types/database';
import { getPermissionGroup, isDeprecatedRole, isSystemRole, type PermissionGroup } from './permissionGroups';
import { MARKETPLACE_ROLES, MARKETPLACE_ROLES_MAP } from '@/components/marketplace/roles/marketplaceRoleConfig';
import type { MarketplaceRoleId } from '@/components/marketplace/types/marketplace';
import {
  Shield,
  Camera,
  Film,
  TrendingUp,
  Palette,
  Users,
  Building2,
  LucideIcon
} from 'lucide-react';

// ============= 7 BASE ROLES =============
// Simplified role system with 7 core roles
export type BaseRole =
  | 'admin'
  | 'content_creator'
  | 'editor'
  | 'digital_strategist'
  | 'creative_strategist'
  | 'community_manager'
  | 'client';

// Primary role labels in Spanish
const BASE_ROLE_LABELS: Record<BaseRole, string> = {
  admin: 'Administrador',
  content_creator: 'Creador de Contenido',
  editor: 'Editor y Producción',
  digital_strategist: 'Estratega Digital',
  creative_strategist: 'Estratega Creativo',
  community_manager: 'Community Manager',
  client: 'Cliente / Marca',
};

// Short labels for badges and compact UI
const BASE_ROLE_LABELS_SHORT: Record<BaseRole, string> = {
  admin: 'Admin',
  content_creator: 'Creador',
  editor: 'Editor',
  digital_strategist: 'Estratega Digital',
  creative_strategist: 'Estratega Creativo',
  community_manager: 'CM',
  client: 'Cliente',
};

// Descriptive text for each role
const BASE_ROLE_DESCRIPTIONS: Record<BaseRole, string> = {
  admin: 'Acceso completo al sistema y gestión de la organización',
  content_creator: 'Creación de contenido audiovisual y escrito',
  editor: 'Edición de video, audio y post-producción',
  digital_strategist: 'Estrategia de marketing digital y analytics',
  creative_strategist: 'Dirección creativa y concepto de marca',
  community_manager: 'Gestión de comunidad y redes sociales',
  client: 'Acceso de cliente para revisar contenido y aprobar entregas',
};

// Role colors (bg/text classes for badges)
const BASE_ROLE_COLORS: Record<BaseRole, string> = {
  admin: 'bg-purple-500/20 text-purple-500',
  content_creator: 'bg-pink-500/20 text-pink-500',
  editor: 'bg-blue-500/20 text-blue-500',
  digital_strategist: 'bg-green-500/20 text-green-500',
  creative_strategist: 'bg-orange-500/20 text-orange-500',
  community_manager: 'bg-teal-500/20 text-teal-500',
  client: 'bg-amber-500/20 text-amber-500',
};

// Badge colors with border
const BASE_ROLE_BADGE_COLORS: Record<BaseRole, string> = {
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  content_creator: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  editor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  digital_strategist: 'bg-green-500/10 text-green-500 border-green-500/20',
  creative_strategist: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  community_manager: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  client: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

// Solid background colors
const BASE_ROLE_SOLID_COLORS: Record<BaseRole, string> = {
  admin: 'bg-purple-500',
  content_creator: 'bg-pink-500',
  editor: 'bg-blue-500',
  digital_strategist: 'bg-green-500',
  creative_strategist: 'bg-orange-500',
  community_manager: 'bg-teal-500',
  client: 'bg-amber-500',
};

// Lucide icons for each role
const BASE_ROLE_ICONS: Record<BaseRole, LucideIcon> = {
  admin: Shield,
  content_creator: Camera,
  editor: Film,
  digital_strategist: TrendingUp,
  creative_strategist: Palette,
  community_manager: Users,
  client: Building2,
};

// ============= LEGACY ROLE MAPPING =============
// Maps old roles to new base roles for backward compatibility
const LEGACY_TO_BASE_ROLE: Record<string, BaseRole> = {
  // Direct mappings
  admin: 'admin',
  client: 'client',

  // Old creator roles → content_creator
  creator: 'content_creator',
  ugc_creator: 'content_creator',
  lifestyle_creator: 'content_creator',
  micro_influencer: 'content_creator',
  nano_influencer: 'content_creator',
  macro_influencer: 'content_creator',
  brand_ambassador: 'content_creator',
  live_streamer: 'content_creator',
  podcast_host: 'content_creator',
  photographer: 'content_creator',
  copywriter: 'content_creator',
  voice_artist: 'content_creator',

  // Old editor roles → editor
  editor: 'editor',
  video_editor: 'editor',
  motion_graphics: 'editor',
  sound_designer: 'editor',
  colorist: 'editor',
  director: 'editor',
  producer: 'editor',
  animator_2d3d: 'editor',
  graphic_designer: 'editor',

  // Old strategist roles → digital_strategist or creative_strategist
  strategist: 'digital_strategist',
  digital_strategist: 'digital_strategist',
  content_strategist: 'creative_strategist',
  seo_specialist: 'digital_strategist',
  email_marketer: 'digital_strategist',
  growth_hacker: 'digital_strategist',
  crm_specialist: 'digital_strategist',
  conversion_optimizer: 'digital_strategist',
  trafficker: 'digital_strategist',

  // Community roles → community_manager
  community_manager: 'community_manager',
  social_media_manager: 'community_manager',

  // Tech roles → digital_strategist (closest fit)
  developer: 'digital_strategist',
  web_developer: 'digital_strategist',
  app_developer: 'digital_strategist',
  ai_specialist: 'digital_strategist',

  // Education → content_creator (they create educational content)
  educator: 'content_creator',
  online_instructor: 'content_creator',
  workshop_facilitator: 'content_creator',

  // Client variants → client
  brand_manager: 'client',
  marketing_director: 'client',

  // Team leadership → admin (elevated permissions)
  team_leader: 'admin',

  // Ambassador (legacy badge, map to content_creator)
  ambassador: 'content_creator',
};

// ============= BACKWARD COMPAT: OLD GLOBAL ROLE LABELS =============
// Kept for any code that still references GLOBAL_ROLE_LABELS
const GLOBAL_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  team_leader: 'Líder de Equipo',
  creator: 'Creador de Contenido',
  editor: 'Editor / Post-Producción',
  strategist: 'Estratega & Marketing',
  developer: 'Desarrollador',
  educator: 'Educador',
  client: 'Cliente',
  // New roles
  content_creator: 'Creador de Contenido',
  digital_strategist: 'Estratega Digital',
  creative_strategist: 'Estratega Creativo',
  community_manager: 'Community Manager',
};

// ============= PERMISSION GROUP-BASED LABELS =============
// Labels per permission group (3 groups: admin, talent, client)
const PERMISSION_GROUP_LABELS: Record<PermissionGroup, string> = {
  admin: 'Administrador',
  talent: 'Talento',
  client: 'Cliente / Marca',
};

const PERMISSION_GROUP_LABELS_SHORT: Record<PermissionGroup, string> = {
  admin: 'Admin',
  talent: 'Talento',
  client: 'Cliente',
};

// ============= PERMISSION GROUP-BASED COLORS =============
const PERMISSION_GROUP_COLORS: Record<PermissionGroup, string> = {
  admin: 'bg-purple-500/20 text-purple-500',
  talent: 'bg-pink-500/20 text-pink-500',
  client: 'bg-amber-500/20 text-amber-500',
};

const PERMISSION_GROUP_BADGE_COLORS: Record<PermissionGroup, string> = {
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  talent: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  client: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
};

const PERMISSION_GROUP_SOLID_COLORS: Record<PermissionGroup, string> = {
  admin: 'bg-purple-500',
  talent: 'bg-pink-500',
  client: 'bg-amber-500',
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

/** Get the mapped base role for any role (new or legacy) */
export function getBaseRole(role: AppRole | string | null | undefined): BaseRole {
  if (!role) return 'content_creator';
  // Check if it's already a base role
  if (BASE_ROLE_LABELS[role as BaseRole]) return role as BaseRole;
  // Map legacy role to base role
  return LEGACY_TO_BASE_ROLE[role] || 'content_creator';
}

/** Get the display label for any role (base role → legacy mapping → group fallback) */
export function getRoleLabel(role: AppRole | string): string {
  // Check base roles first
  if (BASE_ROLE_LABELS[role as BaseRole]) {
    return BASE_ROLE_LABELS[role as BaseRole];
  }
  // Check global role labels (includes legacy)
  if (GLOBAL_ROLE_LABELS[role]) return GLOBAL_ROLE_LABELS[role];
  // Check marketplace roles
  const mktRole = MARKETPLACE_ROLES_MAP[role as MarketplaceRoleId];
  if (mktRole) return mktRole.label;
  // Fallback to base role mapping
  const baseRole = getBaseRole(role);
  return BASE_ROLE_LABELS[baseRole];
}

/** Get the short display label for any role */
export function getRoleLabelShort(role: AppRole | string): string {
  // Check base roles first
  if (BASE_ROLE_LABELS_SHORT[role as BaseRole]) {
    return BASE_ROLE_LABELS_SHORT[role as BaseRole];
  }
  // Check marketplace roles
  const mktRole = MARKETPLACE_ROLES_MAP[role as MarketplaceRoleId];
  if (mktRole) return mktRole.label;
  // Fallback to base role mapping
  const baseRole = getBaseRole(role);
  return BASE_ROLE_LABELS_SHORT[baseRole];
}

/** Get the description for any role */
export function getRoleDescription(role: AppRole | string): string {
  const baseRole = getBaseRole(role);
  return BASE_ROLE_DESCRIPTIONS[baseRole];
}

/** Get the color class for any role (bg/text classes) */
export function getRoleColor(role: AppRole | string): string {
  // Check base roles first
  if (BASE_ROLE_COLORS[role as BaseRole]) {
    return BASE_ROLE_COLORS[role as BaseRole];
  }
  // Check marketplace roles
  const mktRole = MARKETPLACE_ROLES_MAP[role as MarketplaceRoleId];
  if (mktRole) return `${mktRole.bgColor} ${mktRole.color}`;
  // Fallback to base role mapping
  const baseRole = getBaseRole(role);
  return BASE_ROLE_COLORS[baseRole];
}

/** Get the badge color class for any role (with border) */
export function getRoleBadgeColor(role: AppRole | string): string {
  // Check base roles first
  if (BASE_ROLE_BADGE_COLORS[role as BaseRole]) {
    return BASE_ROLE_BADGE_COLORS[role as BaseRole];
  }
  // Fallback to base role mapping
  const baseRole = getBaseRole(role);
  return BASE_ROLE_BADGE_COLORS[baseRole];
}

/** Get the solid color class for any role */
export function getRoleSolidColor(role: AppRole | string): string {
  // Check base roles first
  if (BASE_ROLE_SOLID_COLORS[role as BaseRole]) {
    return BASE_ROLE_SOLID_COLORS[role as BaseRole];
  }
  // Fallback to base role mapping
  const baseRole = getBaseRole(role);
  return BASE_ROLE_SOLID_COLORS[baseRole];
}

/** Get the Lucide icon component for any role */
export function getRoleIcon(role: AppRole | string): LucideIcon {
  // Check base roles first
  if (BASE_ROLE_ICONS[role as BaseRole]) {
    return BASE_ROLE_ICONS[role as BaseRole];
  }
  // Fallback to base role mapping
  const baseRole = getBaseRole(role);
  return BASE_ROLE_ICONS[baseRole];
}

// ============= 7 BASE ROLES ARRAY =============
export const BASE_ROLES: BaseRole[] = [
  'admin',
  'content_creator',
  'editor',
  'digital_strategist',
  'creative_strategist',
  'community_manager',
  'client',
];

// Roles that can be assigned to team members (excludes admin)
export const ASSIGNABLE_BASE_ROLES: BaseRole[] = [
  'content_creator',
  'editor',
  'digital_strategist',
  'creative_strategist',
  'community_manager',
  'client',
];

// Functional roles that can be used as active_role (includes legacy for backward compat)
export const FUNCTIONAL_ROLES: AppRole[] = [
  'admin', 'team_leader', 'strategist', 'trafficker', 'creator', 'editor', 'client',
  // New base roles
  'content_creator', 'digital_strategist', 'creative_strategist', 'community_manager',
] as AppRole[];

// Check if a role is a functional role (can be used as active_role)
export function isFunctionalRole(role: string): boolean {
  return FUNCTIONAL_ROLES.includes(role as AppRole);
}

// Check if a role is one of the 7 base roles
export function isBaseRole(role: string): role is BaseRole {
  return BASE_ROLES.includes(role as BaseRole);
}

// Get the primary role from an array (priority order) - only returns functional roles
export function getPrimaryRole(roles: AppRole[]): AppRole | null {
  if (roles.length === 0) return null;

  // Priority order: admin first, then by functional importance
  const priority: AppRole[] = [
    'admin', 'team_leader',
    'digital_strategist', 'creative_strategist', 'strategist',
    'community_manager',
    'content_creator', 'creator',
    'editor',
    'trafficker',
    'client',
  ] as AppRole[];

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
    label: getRoleLabelShort(primary),
    color: getRoleSolidColor(primary)
  };
}

// Check if a role array contains admin
export function isAdminRole(roles: AppRole[]): boolean {
  return roles.some(r => getPermissionGroup(r) === 'admin');
}

// ============= ROLE ARRAYS =============

// The 7 base roles (new simplified role system)
export const GLOBAL_NICHE_ROLES: AppRole[] = [
  'admin', 'content_creator', 'editor', 'digital_strategist', 'creative_strategist', 'community_manager', 'client',
] as AppRole[];

// Legacy roles kept for backward compatibility
export const LEGACY_ROLES: AppRole[] = [
  'team_leader', 'creator', 'strategist', 'developer', 'educator', 'trafficker', 'ambassador',
] as AppRole[];

// All marketplace roles (specializations within creator_profiles, not for org assignment)
export const MARKETPLACE_ASSIGNABLE_ROLES: AppRole[] = MARKETPLACE_ROLES.map(r => r.id as AppRole);

// Roles that can appear in UI role-switching selectors (7 base roles)
export const SELECTABLE_ROLES: AppRole[] = [...GLOBAL_NICHE_ROLES];

// All available roles (base + marketplace + legacy for backward compat)
export const ALL_ROLES: AppRole[] = [
  ...GLOBAL_NICHE_ROLES,
  ...LEGACY_ROLES,
  ...MARKETPLACE_ASSIGNABLE_ROLES,
];

// Roles that can be assigned by org owners (7 base minus admin)
export const ORG_ASSIGNABLE_ROLES: AppRole[] = [
  'content_creator', 'editor', 'digital_strategist', 'creative_strategist', 'community_manager', 'client',
] as AppRole[];

// Ambassador badge levels for selection
export const AMBASSADOR_LEVELS: AmbassadorLevel[] = ['bronze', 'silver', 'gold'];

// ============= BACKWARD COMPAT EXPORTS =============
// These Record objects are kept for any code that still imports them directly.
// They use Partial<Record> to avoid exhaustive key requirements.

export const ROLE_LABELS: Partial<Record<AppRole, string>> = {
  // 7 new base roles
  admin: 'Administrador',
  content_creator: 'Creador de Contenido',
  editor: 'Editor y Producción',
  digital_strategist: 'Estratega Digital',
  creative_strategist: 'Estratega Creativo',
  community_manager: 'Community Manager',
  client: 'Cliente / Marca',
  // Legacy roles (for backward compatibility)
  team_leader: 'Administrador',
  creator: 'Creador de Contenido',
  strategist: 'Estratega Digital',
  developer: 'Estratega Digital',
  educator: 'Creador de Contenido',
  trafficker: 'Estratega Digital',
  ambassador: 'Creador de Contenido',
};

export const ROLE_LABELS_SHORT: Partial<Record<AppRole, string>> = {
  // 7 new base roles
  admin: 'Admin',
  content_creator: 'Creador',
  editor: 'Editor',
  digital_strategist: 'Estratega Digital',
  creative_strategist: 'Estratega Creativo',
  community_manager: 'CM',
  client: 'Cliente',
  // Legacy roles
  team_leader: 'Admin',
  creator: 'Creador',
  strategist: 'Estratega',
  developer: 'Dev',
  educator: 'Educador',
  trafficker: 'Trafficker',
  ambassador: 'Embajador',
};

export const ROLE_COLORS: Partial<Record<AppRole, string>> = {
  // 7 new base roles
  admin: 'bg-purple-500/20 text-purple-500',
  content_creator: 'bg-pink-500/20 text-pink-500',
  editor: 'bg-blue-500/20 text-blue-500',
  digital_strategist: 'bg-green-500/20 text-green-500',
  creative_strategist: 'bg-orange-500/20 text-orange-500',
  community_manager: 'bg-teal-500/20 text-teal-500',
  client: 'bg-amber-500/20 text-amber-500',
  // Legacy roles (mapped to new colors)
  team_leader: 'bg-purple-500/20 text-purple-500',
  creator: 'bg-pink-500/20 text-pink-500',
  strategist: 'bg-green-500/20 text-green-500',
  developer: 'bg-green-500/20 text-green-500',
  educator: 'bg-pink-500/20 text-pink-500',
  trafficker: 'bg-green-500/20 text-green-500',
  ambassador: 'bg-pink-500/20 text-pink-500',
};

export const ROLE_BADGE_COLORS: Partial<Record<AppRole, string>> = {
  // 7 new base roles
  admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  content_creator: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  editor: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  digital_strategist: 'bg-green-500/10 text-green-500 border-green-500/20',
  creative_strategist: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  community_manager: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  client: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  // Legacy roles
  team_leader: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  creator: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  strategist: 'bg-green-500/10 text-green-500 border-green-500/20',
  developer: 'bg-green-500/10 text-green-500 border-green-500/20',
  educator: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  trafficker: 'bg-green-500/10 text-green-500 border-green-500/20',
  ambassador: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
};

export const ROLE_SOLID_COLORS: Partial<Record<AppRole, string>> = {
  // 7 new base roles
  admin: 'bg-purple-500',
  content_creator: 'bg-pink-500',
  editor: 'bg-blue-500',
  digital_strategist: 'bg-green-500',
  creative_strategist: 'bg-orange-500',
  community_manager: 'bg-teal-500',
  client: 'bg-amber-500',
  // Legacy roles
  team_leader: 'bg-purple-500',
  creator: 'bg-pink-500',
  strategist: 'bg-green-500',
  developer: 'bg-green-500',
  educator: 'bg-pink-500',
  trafficker: 'bg-green-500',
  ambassador: 'bg-pink-500',
};

// ============= ROLE ICONS EXPORT =============
// Export icons map for components that need direct access
export const ROLE_ICONS: Partial<Record<AppRole, LucideIcon>> = {
  admin: Shield,
  content_creator: Camera,
  editor: Film,
  digital_strategist: TrendingUp,
  creative_strategist: Palette,
  community_manager: Users,
  client: Building2,
  // Legacy mappings
  team_leader: Shield,
  creator: Camera,
  strategist: TrendingUp,
  developer: TrendingUp,
  educator: Camera,
  trafficker: TrendingUp,
  ambassador: Camera,
};
