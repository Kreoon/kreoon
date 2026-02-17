/**
 * Permission Groups - Unified Role System
 *
 * Maps all 44 roles (8 legacy + 36 marketplace) to 6 permission groups.
 * Every permission check in the platform should use getPermissionGroup()
 * instead of checking individual role strings.
 */

export type PermissionGroup = 'admin' | 'team_leader' | 'creator' | 'editor' | 'strategist' | 'client';

// Every role (legacy + marketplace) maps to exactly one permission group
const ROLE_TO_PERMISSION_GROUP: Record<string, PermissionGroup> = {
  // System roles (identity mapping)
  admin: 'admin',
  team_leader: 'team_leader',

  // Global niche roles (primary assignment roles)
  creator: 'creator',
  editor: 'editor',
  strategist: 'strategist',
  client: 'client',
  developer: 'creator',
  educator: 'creator',
  ambassador: 'creator',
  trafficker: 'strategist',

  // Content Creation (12) → creator
  ugc_creator: 'creator',
  lifestyle_creator: 'creator',
  micro_influencer: 'creator',
  nano_influencer: 'creator',
  macro_influencer: 'creator',
  brand_ambassador: 'creator',
  live_streamer: 'creator',
  podcast_host: 'creator',
  photographer: 'creator',
  copywriter: 'creator',
  graphic_designer: 'creator',
  voice_artist: 'creator',

  // Post-Production (7) → editor
  video_editor: 'editor',
  motion_graphics: 'editor',
  sound_designer: 'editor',
  colorist: 'editor',
  director: 'editor',
  producer: 'editor',
  animator_2d3d: 'editor',

  // Strategy & Marketing (10) → strategist
  content_strategist: 'strategist',
  social_media_manager: 'strategist',
  community_manager: 'strategist',
  digital_strategist: 'strategist',
  seo_specialist: 'strategist',
  email_marketer: 'strategist',
  growth_hacker: 'strategist',
  crm_specialist: 'strategist',
  conversion_optimizer: 'strategist',

  // Technology (3) → creator
  web_developer: 'creator',
  app_developer: 'creator',
  ai_specialist: 'creator',

  // Education (2) → creator
  online_instructor: 'creator',
  workshop_facilitator: 'creator',

  // Client (2) → client
  brand_manager: 'client',
  marketing_director: 'client',
};

/** Get the permission group for any role (legacy or marketplace) */
export function getPermissionGroup(role: string | null | undefined): PermissionGroup {
  if (!role) return 'creator';
  return ROLE_TO_PERMISSION_GROUP[role] || 'creator';
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

/** System-only roles that cannot be selected as marketplace specializations */
export const SYSTEM_ONLY_ROLES = ['admin', 'team_leader'] as const;

/** Legacy roles that still work but should not appear in role pickers for new assignments */
export const DEPRECATED_ROLES = ['ambassador', 'trafficker'] as const;

/** Check if a role is a system-only role */
export function isSystemRole(role: string): boolean {
  return (SYSTEM_ONLY_ROLES as readonly string[]).includes(role);
}

/** Check if a role is a deprecated legacy role */
export function isDeprecatedRole(role: string): boolean {
  return (DEPRECATED_ROLES as readonly string[]).includes(role);
}

// ─── Role Areas (finer-grained than permission groups) ─────────────────────
// Permission groups are for ACCESS CONTROL (6 groups).
// Role areas are for UI PERSONALIZATION (7 areas) — they reflect the user's
// professional domain so the UI can adapt labels, descriptions, and features.

export type RoleArea =
  | 'content_creation'    // Creación de Contenido (12 roles)
  | 'post_production'     // Post-Producción (7 roles)
  | 'strategy_marketing'  // Estrategia & Marketing (10 roles)
  | 'technology'          // Tecnología (3 roles)
  | 'education'           // Educación (2 roles)
  | 'client'              // Cliente (2 roles)
  | 'system';             // Admin / Team Leader

const ROLE_TO_AREA: Record<string, RoleArea> = {
  // System
  admin: 'system',
  team_leader: 'system',

  // Content Creation
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
  strategist: 'strategy_marketing',
  trafficker: 'strategy_marketing',
  content_strategist: 'strategy_marketing',
  social_media_manager: 'strategy_marketing',
  community_manager: 'strategy_marketing',
  digital_strategist: 'strategy_marketing',
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

/** Get the professional area for any role */
export function getRoleArea(role: string | null | undefined): RoleArea {
  if (!role) return 'content_creation';
  return ROLE_TO_AREA[role] || 'content_creation';
}

/** Human-readable labels for each area */
export const ROLE_AREA_LABELS: Record<RoleArea, string> = {
  content_creation: 'Creación de Contenido',
  post_production: 'Post-Producción',
  strategy_marketing: 'Estrategia & Marketing',
  technology: 'Tecnología',
  education: 'Educación',
  client: 'Cliente',
  system: 'Administración',
};

/** Dashboard path for each permission group */
export const GROUP_DASHBOARD_PATHS: Record<PermissionGroup, string> = {
  admin: '/dashboard',
  team_leader: '/dashboard',
  strategist: '/strategist-dashboard',
  creator: '/creator-dashboard',
  editor: '/editor-dashboard',
  client: '/client-dashboard',
};

/** Get the dashboard path for a role based on its permission group */
export function getDashboardForRole(role: string | null | undefined): string {
  const group = getPermissionGroup(role);
  return GROUP_DASHBOARD_PATHS[group];
}
