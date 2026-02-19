import type { SocialHubPermissionLevel } from '../types/social.types';

// Maps organization roles to Social Hub permission levels
export const ROLE_PERMISSION_MAP: Record<string, SocialHubPermissionLevel> = {
  admin: 'admin',
  team_leader: 'admin',
  strategist: 'creator',
  trafficker: 'creator',
  creator: 'creator',
  editor: 'viewer',
  client: 'viewer',
};

// Default permissions per level
export const PERMISSION_DEFAULTS: Record<SocialHubPermissionLevel, {
  can_view: boolean;
  can_post: boolean;
  can_schedule: boolean;
  can_analytics: boolean;
  can_manage: boolean;
}> = {
  viewer: {
    can_view: true,
    can_post: false,
    can_schedule: false,
    can_analytics: false,
    can_manage: false,
  },
  creator: {
    can_view: true,
    can_post: true,
    can_schedule: true,
    can_analytics: true,
    can_manage: false,
  },
  admin: {
    can_view: true,
    can_post: true,
    can_schedule: true,
    can_analytics: true,
    can_manage: true,
  },
};

export function getPermissionLevel(role: string): SocialHubPermissionLevel {
  return ROLE_PERMISSION_MAP[role] || 'viewer';
}
