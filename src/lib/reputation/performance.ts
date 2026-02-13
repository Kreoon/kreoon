/**
 * PerformanceRoleCalculator — For traffickers, growth hackers, etc.
 *
 * Points based on KPI achievement, ROAS, campaign results.
 */

import { BasePointCalculator } from './base';
import type { ReputationEventInput, CalculationResult } from './types';

export class PerformanceRoleCalculator extends BasePointCalculator {

  calculatePoints(event: ReputationEventInput): CalculationResult {
    const actions = this.pointActions;
    let basePoints = 0;
    const breakdown: CalculationResult['breakdown'] = { base: 0 };

    switch (event.eventType) {
      case 'kpi_hit': {
        const rate = event.metadata?.achievementRate || 0;

        if (rate >= 1.5) {
          basePoints = 200;
          breakdown.kpiBonus = 'exceptional';
        } else if (rate >= 1.0) {
          basePoints = 100;
          breakdown.kpiBonus = 'met';
        } else if (rate >= 0.8) {
          basePoints = 50;
          breakdown.kpiBonus = 'near';
        } else {
          basePoints = 0;
          breakdown.kpiBonus = 'missed';
        }
        breakdown.base = basePoints;
        break;
      }

      case 'campaign_completion': {
        basePoints = actions.task_completed * 2;
        breakdown.base = basePoints;

        const roas = event.metadata?.roas || 0;
        if (roas >= 3) {
          basePoints += 100;
          breakdown.roasBonus = 100;
        } else if (roas >= 2) {
          basePoints += 50;
          breakdown.roasBonus = 50;
        }
        break;
      }

      case 'delivery': {
        // Performance roles can also deliver tasks
        basePoints = actions.task_completed;
        breakdown.base = basePoints;

        if (event.eventSubtype === 'early') {
          const bonus = actions.early_delivery_bonus || 10;
          basePoints += bonus;
          breakdown.speedBonus = bonus;
        } else if (event.eventSubtype === 'late') {
          const penalty = actions.late_delivery_penalty || -20;
          basePoints += penalty;
          breakdown.penalties = penalty;
        }
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
