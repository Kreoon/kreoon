/**
 * BasePointCalculator — Abstract base for role-specific point calculators
 */

import type { RoleArchetype, UnifiedReputationConfig, ReputationEventInput, CalculationResult, PointActions } from './types';

export abstract class BasePointCalculator {
  protected roleConfig: RoleArchetype;
  protected orgConfig: UnifiedReputationConfig | null;

  constructor(roleConfig: RoleArchetype, orgConfig: UnifiedReputationConfig | null = null) {
    this.roleConfig = roleConfig;
    this.orgConfig = orgConfig;
  }

  abstract calculatePoints(event: ReputationEventInput): CalculationResult;

  get pointActions(): PointActions {
    return this.roleConfig.point_actions;
  }

  /** Normalize points by volume — reduce returns for exceeding the volume cap */
  protected normalizeByVolume(basePoints: number, currentMonthlyVolume: number): number {
    const { expected_monthly_volume, volume_normalization_cap } = this.roleConfig;

    if (currentMonthlyVolume > volume_normalization_cap) {
      const volumeFactor = expected_monthly_volume / currentMonthlyVolume;
      return Math.round(basePoints * Math.max(0.3, volumeFactor));
    }

    return basePoints;
  }

  /** Apply org-level multipliers (speed, quality, volume) */
  protected applyOrgMultipliers(result: CalculationResult, eventType: string): CalculationResult {
    if (!this.orgConfig) return result;

    let finalMultiplier = result.multiplier;

    if (eventType.includes('early') || eventType.includes('speed') || eventType.includes('delivery')) {
      finalMultiplier *= this.orgConfig.speed_multiplier;
    }
    if (eventType.includes('approval') || eventType.includes('quality')) {
      finalMultiplier *= this.orgConfig.quality_multiplier;
    }

    return {
      ...result,
      multiplier: Math.round(finalMultiplier * 100) / 100,
      finalPoints: Math.round(result.basePoints * finalMultiplier),
    };
  }
}
