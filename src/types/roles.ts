// ============================================================
// ROLE CATALOG — All 36 specific roles + 7 groups
// ============================================================

export type RoleId =
  // Content Creation (12)
  | 'ugc_creator' | 'lifestyle_creator'
  | 'micro_influencer' | 'nano_influencer' | 'macro_influencer'
  | 'brand_ambassador' | 'live_streamer' | 'podcast_host'
  | 'photographer' | 'copywriter' | 'graphic_designer' | 'voice_artist'
  // Post-Production (7)
  | 'video_editor' | 'motion_graphics' | 'sound_designer' | 'colorist'
  | 'director' | 'producer' | 'animator_2d3d'
  // Strategy & Marketing (10)
  | 'content_strategist' | 'social_media_manager' | 'community_manager'
  | 'digital_strategist' | 'trafficker' | 'seo_specialist'
  | 'email_marketer' | 'growth_hacker' | 'crm_specialist' | 'conversion_optimizer'
  // Technology (3)
  | 'web_developer' | 'app_developer' | 'ai_specialist'
  // Education (2)
  | 'online_instructor' | 'workshop_facilitator'
  // Client (2)
  | 'brand_manager' | 'marketing_director';

export type RoleGroup = 'creator' | 'editor' | 'strategist' | 'tech' | 'education' | 'client' | 'admin' | 'developer' | 'educator';

export const ROLE_TO_GROUP: Record<RoleId, RoleGroup> = {
  // Content Creation → creator
  ugc_creator: 'creator',
  lifestyle_creator: 'creator',
  micro_influencer: 'creator',
  nano_influencer: 'creator',
  macro_influencer: 'creator',
  brand_ambassador: 'creator',
  live_streamer: 'creator',
  podcast_host: 'creator',
  photographer: 'creator',
  voice_artist: 'creator',
  copywriter: 'creator',
  graphic_designer: 'editor',

  // Post-Production → editor
  video_editor: 'editor',
  motion_graphics: 'editor',
  sound_designer: 'editor',
  colorist: 'editor',
  director: 'editor',
  producer: 'editor',
  animator_2d3d: 'editor',

  // Strategy & Marketing → strategist
  content_strategist: 'strategist',
  social_media_manager: 'strategist',
  community_manager: 'strategist',
  digital_strategist: 'strategist',
  trafficker: 'strategist',
  seo_specialist: 'strategist',
  email_marketer: 'strategist',
  growth_hacker: 'strategist',
  crm_specialist: 'strategist',
  conversion_optimizer: 'strategist',

  // Technology → tech
  developer: 'tech',
  web_developer: 'tech',
  app_developer: 'tech',
  ai_specialist: 'tech',

  // Education → education
  educator: 'education',
  online_instructor: 'education',
  workshop_facilitator: 'education',

  // Client → client
  brand_manager: 'client',
  marketing_director: 'client',
};

// ============================================================
// Role Group Configuration
// ============================================================

export interface RoleGroupConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  canCreate: boolean;
  workspaceType: 'script' | 'checklist' | 'specs' | 'document' | 'curriculum' | 'brief';
}

export const ROLE_GROUP_CONFIG: Record<RoleGroup, RoleGroupConfig> = {
  creator: {
    label: 'Creador',
    icon: 'Video',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    canCreate: false,
    workspaceType: 'script',
  },
  editor: {
    label: 'Editor',
    icon: 'Film',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    canCreate: false,
    workspaceType: 'checklist',
  },
  strategist: {
    label: 'Estratega',
    icon: 'TrendingUp',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    canCreate: true,
    workspaceType: 'document',
  },
  tech: {
    label: 'Desarrollador',
    icon: 'Code',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    canCreate: false,
    workspaceType: 'specs',
  },
  education: {
    label: 'Educador',
    icon: 'GraduationCap',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    canCreate: false,
    workspaceType: 'curriculum',
  },
  client: {
    label: 'Cliente',
    icon: 'Building2',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    canCreate: true,
    workspaceType: 'brief',
  },
  admin: {
    label: 'Administrador',
    icon: 'Shield',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    canCreate: true,
    workspaceType: 'brief',
  },
};

// ============================================================
// Helpers
// ============================================================

/** Human-readable label for a role ID (e.g. 'ugc_creator' → 'UGC Creator') */
export function getRoleLabel(roleId: string): string {
  return roleId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .replace('2d3d', '2D/3D')
    .replace('Ugc', 'UGC')
    .replace('Seo', 'SEO')
    .replace('Crm', 'CRM')
    .replace('Ai', 'AI');
}

/** Get the RoleGroup for a given roleId. Falls back to 'creator' for unknown. */
export function getRoleGroup(roleId: string): RoleGroup {
  return ROLE_TO_GROUP[roleId as RoleId] || 'creator';
}

/** Get all RoleIds belonging to a specific group */
export function getRolesByGroup(group: RoleGroup): RoleId[] {
  return (Object.entries(ROLE_TO_GROUP) as [RoleId, RoleGroup][])
    .filter(([, g]) => g === group)
    .map(([id]) => id);
}

/** Get the group config for a RoleId */
export function getRoleGroupConfig(roleId: string): RoleGroupConfig {
  const group = getRoleGroup(roleId);
  return ROLE_GROUP_CONFIG[group];
}
