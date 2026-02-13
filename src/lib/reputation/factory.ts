/**
 * Calculator Factory — Returns the appropriate calculator for a role archetype
 */

import { BasePointCalculator } from './base';
import { CreativeRoleCalculator } from './creative';
import { PerformanceRoleCalculator } from './performance';
import { TrustRoleCalculator } from './trust';
import type { RoleArchetype, UnifiedReputationConfig, EffortArchetype, PointActions } from './types';

/**
 * Get the appropriate calculator for a role's archetype.
 */
export function getCalculatorForRole(
  roleConfig: RoleArchetype,
  orgConfig: UnifiedReputationConfig | null = null
): BasePointCalculator {
  switch (roleConfig.archetype) {
    case 'high_volume':
    case 'balanced':
    case 'high_effort':
      return new CreativeRoleCalculator(roleConfig, orgConfig);
    case 'trust_based':
      return new TrustRoleCalculator(roleConfig, orgConfig);
    default:
      return new CreativeRoleCalculator(roleConfig, orgConfig);
  }
}

/**
 * Get calculator for a role that uses KPI-based scoring.
 */
export function getPerformanceCalculator(
  roleConfig: RoleArchetype,
  orgConfig: UnifiedReputationConfig | null = null
): BasePointCalculator {
  return new PerformanceRoleCalculator(roleConfig, orgConfig);
}

// ─── Legacy compatibility: delivery point calculation ────────

interface DeliveryResult {
  eventKey: string;
  points: number;
  eventSubtype: string;
}

/**
 * Calculate delivery points for a role based on days to deliver.
 * Uses the role's point_actions config for thresholds.
 */
export function calculateDeliveryPoints(
  roleKey: string,
  daysToDeliver: number,
  pointActions?: PointActions
): DeliveryResult {
  const defaults: PointActions = pointActions ?? {
    task_completed: 50,
    early_delivery_bonus: 20,
    on_time_delivery: 0,
    late_delivery_penalty: -30,
    revision_penalty: -10,
    clean_approval_bonus: 10,
    recovery_bonus: 10,
    streak_weekly: 100,
    streak_monthly: 500,
  };

  const maxDays = getMaxDeliveryDays(roleKey);
  const earlyThreshold = Math.max(1, Math.floor(maxDays * 0.66));

  if (daysToDeliver <= earlyThreshold) {
    return {
      eventKey: 'early_delivery',
      eventSubtype: 'early',
      points: defaults.task_completed + defaults.early_delivery_bonus,
    };
  }
  if (daysToDeliver <= maxDays) {
    return {
      eventKey: 'on_time_delivery',
      eventSubtype: 'on_time',
      points: defaults.task_completed + defaults.on_time_delivery,
    };
  }
  return {
    eventKey: 'late_delivery',
    eventSubtype: 'late',
    points: defaults.task_completed + defaults.late_delivery_penalty,
  };
}

/** Max delivery days per role (hardcoded defaults, overridable by config) */
function getMaxDeliveryDays(roleKey: string): number {
  const map: Record<string, number> = {
    // System roles
    creator: 3,
    editor: 2,
    strategist: 5,
    // High volume
    trafficker: 1, micro_influencer: 1, nano_influencer: 1,
    copywriter: 1, social_media_manager: 1, community_manager: 1,
    email_marketer: 1, growth_hacker: 1, crm_specialist: 1,
    // Balanced
    ugc_creator: 3, lifestyle_creator: 3, brand_ambassador: 3,
    live_streamer: 3, photographer: 3, graphic_designer: 3,
    voice_artist: 3, video_editor: 3, sound_designer: 3,
    colorist: 3, content_strategist: 3, digital_strategist: 3,
    seo_specialist: 3, conversion_optimizer: 3,
    brand_manager: 3, marketing_director: 3,
    // High effort
    macro_influencer: 7, podcast_host: 7, motion_graphics: 7,
    director: 7, producer: 7, animator_2d3d: 7,
    web_developer: 7, app_developer: 7, ai_specialist: 7,
    online_instructor: 7, workshop_facilitator: 7,
  };
  return map[roleKey] ?? 3;
}

/** Reassignment threshold per role */
export function getReassignmentThreshold(roleKey: string): number {
  const map: Record<string, number> = {
    creator: 8, editor: 6, strategist: 10,
    trafficker: 3, micro_influencer: 3, nano_influencer: 3,
    copywriter: 3, social_media_manager: 3, community_manager: 3,
    ugc_creator: 8, lifestyle_creator: 8, brand_ambassador: 8,
    video_editor: 8, sound_designer: 8, graphic_designer: 8,
    macro_influencer: 14, podcast_host: 14, motion_graphics: 14,
    director: 14, producer: 14, animator_2d3d: 14,
    web_developer: 14, app_developer: 14, ai_specialist: 14,
  };
  return map[roleKey] ?? 8;
}

/**
 * Calculate days between two dates in Colombia timezone (UTC-5).
 * Day 1 is the start date itself.
 * @param pausedHours — hours to subtract (e.g. client review delays)
 */
export function calculateDaysInColombia(startDate: Date, endDate: Date, pausedHours = 0): number {
  const colombiaOffset = -5 * 60;

  const startColombia = new Date(startDate.getTime() + (startDate.getTimezoneOffset() + colombiaOffset) * 60000);
  const endColombia = new Date(endDate.getTime() + (endDate.getTimezoneOffset() + colombiaOffset) * 60000);

  const startDay = new Date(startColombia.getFullYear(), startColombia.getMonth(), startColombia.getDate());
  const endDay = new Date(endColombia.getFullYear(), endColombia.getMonth(), endColombia.getDate());

  const diffTime = endDay.getTime() - startDay.getTime();
  const adjustedTime = diffTime - (pausedHours * 3600000);
  const diffDays = Math.floor(Math.max(0, adjustedTime) / (1000 * 60 * 60 * 24)) + 1;

  return diffDays;
}
