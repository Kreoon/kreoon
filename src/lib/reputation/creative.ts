/**
 * CreativeRoleCalculator — For creators, editors, designers, etc.
 *
 * Calculates points based on delivery speed, quality, streaks.
 */

import { BasePointCalculator } from './base';
import type { ReputationEventInput, CalculationResult } from './types';

export class CreativeRoleCalculator extends BasePointCalculator {

  calculatePoints(event: ReputationEventInput): CalculationResult {
    const actions = this.pointActions;
    let basePoints = 0;
    const breakdown: CalculationResult['breakdown'] = { base: 0 };

    switch (event.eventType) {
      case 'delivery': {
        basePoints = actions.task_completed;
        breakdown.base = basePoints;

        if (event.eventSubtype === 'early') {
          const speedBonus = actions.early_delivery_bonus || 20;
          basePoints += speedBonus;
          breakdown.speedBonus = speedBonus;
        } else if (event.eventSubtype === 'late') {
          const penalty = actions.late_delivery_penalty || -40;
          basePoints += penalty;
          breakdown.penalties = penalty;
        }
        break;
      }

      case 'approval': {
        if (event.eventSubtype === 'clean') {
          basePoints = actions.clean_approval_bonus || 10;
          breakdown.base = basePoints;
        }
        break;
      }

      case 'revision': {
        basePoints = actions.revision_penalty || -10;
        breakdown.penalties = basePoints;
        break;
      }

      case 'recovery': {
        basePoints = actions.recovery_bonus || 10;
        breakdown.recoveryBonus = basePoints;
        break;
      }

      case 'streak': {
        const streakDays = event.metadata?.streakDays || 0;
        if (streakDays >= 30) {
          basePoints = actions.streak_monthly || 500;
        } else if (streakDays >= 7) {
          basePoints = actions.streak_weekly || 100;
        }
        breakdown.streakBonus = basePoints;
        break;
      }
    }

    const result: CalculationResult = {
      basePoints,
      multiplier: this.roleConfig.complexity_multiplier,
      finalPoints: Math.round(basePoints * this.roleConfig.complexity_multiplier),
      breakdown,
    };

    return this.applyOrgMultipliers(result, event.eventType);
  }
}
