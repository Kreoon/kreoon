/**
 * Permission Groups - Simplified Role System
 *
 * Maps 7 base roles to 3 permission levels: admin, talent, client.
 * - admin: Full system access
 * - talent: All creative/operational roles (content_creator, editor, digital_strategist, creative_strategist, community_manager)
 * - client: External client access
 *
 * Every permission check in the platform should use getPermissionGroup()
 * instead of checking individual role strings.
 */

export type PermissionGroup = 'admin' | 'talent' | 'client';

// 7 base roles mapped to 3 permission levels
const ROLE_TO_PERMISSION_GROUP: Record<string, PermissionGroup> = {
  // Admin - Full access
  admin: 'admin',

  // Talent - All creative/operational roles
  content_creator: 'talent',
  editor: 'talent',
  digital_strategist: 'talent',
  creative_strategist: 'talent',
  community_manager: 'talent',

  // Client - External access
  client: 'client',

  // ─── Legacy Role Mappings (backwards compatibility) ─────────────────────
  // These roles are deprecated but still supported for existing data

  // Legacy system roles → admin
  team_leader: 'admin',

  // Legacy talent roles → talent
  creator: 'talent',
  ambassador: 'talent',
  strategist: 'talent',
  trafficker: 'talent',
  developer: 'talent',
  educator: 'talent',

  // Legacy marketplace Content Creation → talent
  ugc_creator: 'talent',
  lifestyle_creator: 'talent',
  micro_influencer: 'talent',
  nano_influencer: 'talent',
  macro_influencer: 'talent',
  brand_ambassador: 'talent',
  live_streamer: 'talent',
  podcast_host: 'talent',
  photographer: 'talent',
  copywriter: 'talent',
  graphic_designer: 'talent',
  voice_artist: 'talent',

  // Legacy marketplace Post-Production → talent
  video_editor: 'talent',
  motion_graphics: 'talent',
  sound_designer: 'talent',
  colorist: 'talent',
  director: 'talent',
  producer: 'talent',
  animator_2d3d: 'talent',

  // Legacy marketplace Strategy & Marketing → talent
  content_strategist: 'talent',
  social_media_manager: 'talent',
  // community_manager already defined above
  // digital_strategist already defined above
  seo_specialist: 'talent',
  email_marketer: 'talent',
  growth_hacker: 'talent',
  crm_specialist: 'talent',
  conversion_optimizer: 'talent',

  // Legacy marketplace Technology → talent
  web_developer: 'talent',
  app_developer: 'talent',
  ai_specialist: 'talent',

  // Legacy marketplace Education → talent
  online_instructor: 'talent',
  workshop_facilitator: 'talent',

  // Legacy client roles → client
  brand_manager: 'client',
  marketing_director: 'client',
};

/** Get the permission group for any role (base or legacy) */
export function getPermissionGroup(role: string | null | undefined): PermissionGroup {
  if (!role) return 'talent';
  return ROLE_TO_PERMISSION_GROUP[role] || 'talent';
}

/** Check if a role belongs to a specific permission group */
export function hasPermissionGroup(role: string | null | undefined, group: PermissionGroup): boolean {
  return getPermissionGroup(role) === group;
}

/** Check if any role in the array belongs to the group */
export function anyRoleHasPermissionGroup(roles: string[], group: PermissionGroup): boolean {
  return roles.some(r => getPermissionGroup(r) === group);
}

/** Get all roles that belong to a permission group */
export function getRolesForGroup(group: PermissionGroup): string[] {
  return Object.entries(ROLE_TO_PERMISSION_GROUP)
    .filter(([, g]) => g === group)
    .map(([role]) => role);
}

/** The 7 base roles in the simplified system */
export const BASE_ROLES = [
  'admin',
  'content_creator',
  'editor',
  'digital_strategist',
  'creative_strategist',
  'community_manager',
  'client',
] as const;

export type BaseRole = (typeof BASE_ROLES)[number];

/** Talent roles (all except admin and client) */
export const TALENT_ROLES = [
  'content_creator',
  'editor',
  'digital_strategist',
  'creative_strategist',
  'community_manager',
] as const;

export type TalentRole = (typeof TALENT_ROLES)[number];

/** System-only roles that cannot be selected by users */
export const SYSTEM_ONLY_ROLES = ['admin'] as const;

/** Legacy roles - still work but deprecated for new assignments */
export const DEPRECATED_ROLES = [
  'team_leader',
  'creator',
  'ambassador',
  'strategist',
  'trafficker',
  'developer',
  'educator',
  'ugc_creator',
  'lifestyle_creator',
  'micro_influencer',
  'nano_influencer',
  'macro_influencer',
  'brand_ambassador',
  'live_streamer',
  'podcast_host',
  'photographer',
  'copywriter',
  'graphic_designer',
  'voice_artist',
  'video_editor',
  'motion_graphics',
  'sound_designer',
  'colorist',
  'director',
  'producer',
  'animator_2d3d',
  'content_strategist',
  'social_media_manager',
  'seo_specialist',
  'email_marketer',
  'growth_hacker',
  'crm_specialist',
  'conversion_optimizer',
  'web_developer',
  'app_developer',
  'ai_specialist',
  'online_instructor',
  'workshop_facilitator',
  'brand_manager',
  'marketing_director',
] as const;

/** Check if a role is a base role */
export function isBaseRole(role: string): boolean {
  return (BASE_ROLES as readonly string[]).includes(role);
}

/** Check if a role is a talent role */
export function isTalentRole(role: string): boolean {
  return getPermissionGroup(role) === 'talent';
}

/** Check if a role is a system-only role */
export function isSystemRole(role: string): boolean {
  return (SYSTEM_ONLY_ROLES as readonly string[]).includes(role);
}

/** Check if a role is a deprecated legacy role */
export function isDeprecatedRole(role: string): boolean {
  return (DEPRECATED_ROLES as readonly string[]).includes(role);
}

/** Check if a role has admin permissions */
export function isAdmin(role: string | null | undefined): boolean {
  return getPermissionGroup(role) === 'admin';
}

/** Check if a role has talent permissions */
export function isTalent(role: string | null | undefined): boolean {
  return getPermissionGroup(role) === 'talent';
}

/** Check if a role has client permissions */
export function isClient(role: string | null | undefined): boolean {
  return getPermissionGroup(role) === 'client';
}

// ─── Permission Group Labels ─────────────────────────────────────────────
// Human-readable labels for permission groups

/** Human-readable labels for each permission group */
export const PERMISSION_GROUP_LABELS: Record<PermissionGroup, string> = {
  admin: 'Administración',
  talent: 'Talento',
  client: 'Cliente',
};

/** Dashboard path for each permission group */
export const GROUP_DASHBOARD_PATHS: Record<PermissionGroup, string> = {
  admin: '/dashboard',
  talent: '/talent-dashboard',
  client: '/client-dashboard',
};

/** Get the dashboard path for a role based on its permission group */
export function getDashboardForRole(role: string | null | undefined): string {
  const group = getPermissionGroup(role);
  return GROUP_DASHBOARD_PATHS[group];
}

// ─── Role Labels (for UI display) ────────────────────────────────────────

/** Human-readable labels for the 7 base roles */
export const BASE_ROLE_LABELS: Record<BaseRole, string> = {
  admin: 'Administrador',
  content_creator: 'Creador de Contenido',
  editor: 'Editor',
  digital_strategist: 'Estratega Digital',
  creative_strategist: 'Estratega Creativo',
  community_manager: 'Community Manager',
  client: 'Cliente',
};

/** Get human-readable label for any role */
export function getRoleLabel(role: string | null | undefined): string {
  if (!role) return 'Sin rol';
  if (isBaseRole(role)) {
    return BASE_ROLE_LABELS[role as BaseRole];
  }
  // For legacy roles, return a formatted version
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ─── Legacy RoleArea Support (backwards compatibility) ───────────────────
// These are kept for backwards compatibility with existing code.
// New code should use PermissionGroup ('admin' | 'talent' | 'client') instead.

/** @deprecated Use PermissionGroup instead. Kept for backwards compatibility. */
export type RoleArea =
  | 'content_creation'
  | 'post_production'
  | 'strategy_marketing'
  | 'technology'
  | 'education'
  | 'client'
  | 'system';

/** @deprecated Maps roles to legacy RoleArea for backwards compatibility */
const ROLE_TO_AREA: Record<string, RoleArea> = {
  // System (admin)
  admin: 'system',
  team_leader: 'system',

  // Content Creation
  content_creator: 'content_creation',
  creator: 'content_creation',
  ambassador: 'content_creation',
  ugc_creator: 'content_creation',
  lifestyle_creator: 'content_creation',
  micro_influencer: 'content_creation',
  nano_influencer: 'content_creation',
  macro_influencer: 'content_creation',
  brand_ambassador: 'content_creation',
  live_streamer: 'content_creation',
  podcast_host: 'content_creation',
  photographer: 'content_creation',
  copywriter: 'content_creation',
  graphic_designer: 'content_creation',
  voice_artist: 'content_creation',

  // Post-Production
  editor: 'post_production',
  video_editor: 'post_production',
  motion_graphics: 'post_production',
  sound_designer: 'post_production',
  colorist: 'post_production',
  director: 'post_production',
  producer: 'post_production',
  animator_2d3d: 'post_production',

  // Strategy & Marketing
  digital_strategist: 'strategy_marketing',
  creative_strategist: 'strategy_marketing',
  community_manager: 'strategy_marketing',
  strategist: 'strategy_marketing',
  trafficker: 'strategy_marketing',
  content_strategist: 'strategy_marketing',
  social_media_manager: 'strategy_marketing',
  seo_specialist: 'strategy_marketing',
  email_marketer: 'strategy_marketing',
  growth_hacker: 'strategy_marketing',
  crm_specialist: 'strategy_marketing',
  conversion_optimizer: 'strategy_marketing',

  // Technology
  developer: 'technology',
  web_developer: 'technology',
  app_developer: 'technology',
  ai_specialist: 'technology',

  // Education
  educator: 'education',
  online_instructor: 'education',
  workshop_facilitator: 'education',

  // Client
  client: 'client',
  brand_manager: 'client',
  marketing_director: 'client',
};

/** @deprecated Use getPermissionGroup() instead. Kept for backwards compatibility. */
export function getRoleArea(role: string | null | undefined): RoleArea {
  if (!role) return 'content_creation';
  return ROLE_TO_AREA[role] || 'content_creation';
}

/** @deprecated Use PERMISSION_GROUP_LABELS instead. Kept for backwards compatibility. */
export const ROLE_AREA_LABELS: Record<RoleArea, string> = {
  content_creation: 'Creación de Contenido',
  post_production: 'Post-Producción',
  strategy_marketing: 'Estrategia & Marketing',
  technology: 'Tecnología',
  education: 'Educación',
  client: 'Cliente',
  system: 'Administración',
};
