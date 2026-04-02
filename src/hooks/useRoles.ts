import { useMemo } from 'react';
import { useAuth } from './useAuth';
import { AppRole, UserType, Specialization, TalentRole } from '@/types/database';
import { getPermissionGroup, type PermissionGroup } from '@/lib/permissionGroups';

// =============================================================================
// HELPER FUNCTIONS (standalone, can be used without hooks)
// =============================================================================

/**
 * Determine the user type based on their roles
 * Priority: admin > client > talent
 *
 * @param roles - Array of user roles
 * @returns UserType - 'admin', 'client', or 'talent'
 */
export function getUserType(roles: AppRole[]): UserType {
  if (!roles || roles.length === 0) return 'talent';

  // Check permission groups for flexibility with marketplace roles
  const groups = roles.map(r => getPermissionGroup(r));

  if (groups.includes('admin')) return 'admin';
  if (groups.includes('client')) return 'client';
  return 'talent';
}

/**
 * Check if user is a talent (content creator, editor, strategist, etc.)
 * Talent = anyone who is NOT exclusively a client or admin
 *
 * @param roles - Array of user roles
 * @returns boolean
 */
export function isTalentUser(roles: AppRole[]): boolean {
  return getUserType(roles) === 'talent';
}

/**
 * Check if user is a client
 *
 * @param roles - Array of user roles
 * @returns boolean
 */
export function isClientUser(roles: AppRole[]): boolean {
  return getUserType(roles) === 'client';
}

/**
 * Check if user is an admin
 *
 * @param roles - Array of user roles
 * @returns boolean
 */
export function isAdminUser(roles: AppRole[]): boolean {
  return getUserType(roles) === 'admin';
}

/**
 * Get all talent roles from a user's role array
 * Filters out admin and client roles
 *
 * @param roles - Array of user roles
 * @returns Array of talent roles only
 */
export function getTalentRoles(roles: AppRole[]): TalentRole[] {
  const talentRoles: TalentRole[] = [
    'content_creator',
    'editor',
    'digital_strategist',
    'creative_strategist',
    'community_manager',
  ];
  return roles.filter((r): r is TalentRole => talentRoles.includes(r as TalentRole));
}

/**
 * Check if user has any talent roles (even if also admin/client)
 * Useful for showing talent-specific UI elements
 *
 * @param roles - Array of user roles
 * @returns boolean
 */
export function hasTalentRoles(roles: AppRole[]): boolean {
  return getTalentRoles(roles).length > 0;
}

/**
 * Check if user has client role (even if also has other roles)
 *
 * @param roles - Array of user roles
 * @returns boolean
 */
export function hasClientRole(roles: AppRole[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some(r => getPermissionGroup(r) === 'client');
}

/**
 * Check if user has admin role
 *
 * @param roles - Array of user roles
 * @returns boolean
 */
export function hasAdminRole(roles: AppRole[]): boolean {
  if (!roles || roles.length === 0) return false;
  return roles.some(r => getPermissionGroup(r) === 'admin');
}

/**
 * Get the primary role for a user (highest priority)
 * Priority: admin > team_leader > digital_strategist > creative_strategist >
 *           content_creator > editor > community_manager > client
 *
 * @param roles - Array of user roles
 * @returns Primary AppRole or null
 */
export function getPrimaryRole(roles: AppRole[]): AppRole | null {
  if (!roles || roles.length === 0) return null;

  const priority: AppRole[] = [
    'admin',
    'digital_strategist',
    'creative_strategist',
    'content_creator',
    'editor',
    'community_manager',
    'client',
  ];

  for (const role of priority) {
    if (roles.includes(role)) return role;
  }

  return roles[0];
}

/**
 * Get permission groups for all user roles
 *
 * @param roles - Array of user roles
 * @returns Array of unique permission groups
 */
export function getUserPermissionGroups(roles: AppRole[]): PermissionGroup[] {
  if (!roles || roles.length === 0) return [];
  const groups = roles.map(r => getPermissionGroup(r));
  return [...new Set(groups)];
}

// =============================================================================
// SPECIALIZATION HELPERS
// =============================================================================

// Mapping of specializations to their parent role
const SPECIALIZATION_TO_ROLE: Record<Specialization, AppRole> = {
  // Content Creator
  ugc: 'content_creator',
  nano_influencer: 'content_creator',
  micro_influencer: 'content_creator',
  macro_influencer: 'content_creator',
  lifestyle: 'content_creator',
  photographer: 'content_creator',
  live_streamer: 'content_creator',
  podcast_host: 'content_creator',
  voice_artist: 'content_creator',
  // Editor
  video_editor: 'editor',
  motion_graphics: 'editor',
  colorist: 'editor',
  sound_designer: 'editor',
  animator: 'editor',
  director: 'editor',
  producer: 'editor',
  // Digital Strategist
  seo: 'digital_strategist',
  sem: 'digital_strategist',
  trafficker: 'digital_strategist',
  email_marketing: 'digital_strategist',
  growth_hacker: 'digital_strategist',
  cro: 'digital_strategist',
  crm: 'digital_strategist',
  // Creative Strategist
  content_strategy: 'creative_strategist',
  social_media: 'creative_strategist',
  copywriting: 'creative_strategist',
  graphic_design: 'creative_strategist',
  // Client
  brand_manager: 'client',
  marketing_director: 'client',
  agency: 'client',
};

// Available specializations grouped by role
export const SPECIALIZATIONS_BY_ROLE: Record<AppRole, Specialization[]> = {
  admin: [],
  content_creator: ['ugc', 'nano_influencer', 'micro_influencer', 'macro_influencer', 'lifestyle', 'photographer', 'live_streamer', 'podcast_host', 'voice_artist'],
  editor: ['video_editor', 'motion_graphics', 'colorist', 'sound_designer', 'animator', 'director', 'producer'],
  digital_strategist: ['seo', 'sem', 'trafficker', 'email_marketing', 'growth_hacker', 'cro', 'crm'],
  creative_strategist: ['content_strategy', 'social_media', 'copywriting', 'graphic_design'],
  community_manager: [],
  client: ['brand_manager', 'marketing_director', 'agency'],
};

/**
 * Get the parent role for a specialization
 *
 * @param specialization - The specialization to check
 * @returns The parent AppRole
 */
export function getSpecializationRole(specialization: Specialization): AppRole {
  return SPECIALIZATION_TO_ROLE[specialization];
}

/**
 * Get available specializations for a set of roles
 *
 * @param roles - Array of user roles
 * @returns Array of available specializations
 */
export function getAvailableSpecializations(roles: AppRole[]): Specialization[] {
  if (!roles || roles.length === 0) return [];

  const specializations: Specialization[] = [];
  for (const role of roles) {
    const roleSpecs = SPECIALIZATIONS_BY_ROLE[role] || [];
    specializations.push(...roleSpecs);
  }

  return [...new Set(specializations)];
}

/**
 * Validate if specializations are valid for the given roles
 *
 * @param roles - Array of user roles
 * @param specializations - Array of specializations to validate
 * @returns Object with valid and invalid specializations
 */
export function validateSpecializations(
  roles: AppRole[],
  specializations: Specialization[]
): { valid: Specialization[]; invalid: Specialization[] } {
  const available = getAvailableSpecializations(roles);
  const valid = specializations.filter(s => available.includes(s));
  const invalid = specializations.filter(s => !available.includes(s));
  return { valid, invalid };
}

// =============================================================================
// REACT HOOK
// =============================================================================

interface UseRolesReturn {
  // User type helpers
  userType: UserType;
  isTalent: boolean;
  isClient: boolean;
  isAdmin: boolean;

  // Role access
  roles: AppRole[];
  activeRole: AppRole | null;
  primaryRole: AppRole | null;
  talentRoles: TalentRole[];
  permissionGroups: PermissionGroup[];

  // Role checks
  hasRole: (role: AppRole) => boolean;
  hasTalentRole: boolean;
  hasClientRole: boolean;
  hasAdminRole: boolean;

  // Specialization helpers (requires additional data)
  getAvailableSpecializations: () => Specialization[];
}

/**
 * Hook for accessing user roles and type information
 * Extends useAuth with additional role-specific utilities
 *
 * @example
 * const { userType, isTalent, isClient, roles } = useRoles();
 *
 * if (isTalent) {
 *   // Show talent dashboard
 * } else if (isClient) {
 *   // Show client dashboard
 * }
 */
export function useRoles(): UseRolesReturn {
  const { roles, activeRole, hasRole } = useAuth();

  // Memoize computed values
  const userType = useMemo(() => getUserType(roles), [roles]);
  const isTalent = useMemo(() => userType === 'talent', [userType]);
  const isClient = useMemo(() => userType === 'client', [userType]);
  const isAdmin = useMemo(() => userType === 'admin', [userType]);

  const primaryRole = useMemo(() => getPrimaryRole(roles), [roles]);
  const talentRoles = useMemo(() => getTalentRoles(roles), [roles]);
  const permissionGroups = useMemo(() => getUserPermissionGroups(roles), [roles]);

  const hasTalentRole = useMemo(() => hasTalentRoles(roles), [roles]);
  const hasClientRoleFlag = useMemo(() => hasClientRole(roles), [roles]);
  const hasAdminRoleFlag = useMemo(() => hasAdminRole(roles), [roles]);

  const getAvailableSpecializationsFn = useMemo(
    () => () => getAvailableSpecializations(roles),
    [roles]
  );

  return {
    // User type
    userType,
    isTalent,
    isClient,
    isAdmin,

    // Roles
    roles,
    activeRole,
    primaryRole,
    talentRoles,
    permissionGroups,

    // Role checks
    hasRole,
    hasTalentRole,
    hasClientRole: hasClientRoleFlag,
    hasAdminRole: hasAdminRoleFlag,

    // Specializations
    getAvailableSpecializations: getAvailableSpecializationsFn,
  };
}

export default useRoles;
