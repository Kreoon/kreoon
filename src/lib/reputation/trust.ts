/**
 * TrustRoleCalculator — For client roles (trust_based archetype)
 *
 * Measures trust and reliability rather than volume or speed.
 */

import { BasePointCalculator } from './base';
import type { ReputationEventInput, CalculationResult } from './types';

export class TrustRoleCalculator extends BasePointCalculator {

  calculatePoints(event: ReputationEventInput): CalculationResult {
    let basePoints = 0;
    const breakdown: CalculationResult['breakdown'] = { base: 0 };

    switch (event.eventType) {
      case 'fast_approval': {
        // Client approved quickly
        const hours = event.metadata?.hoursToApprove || 48;
        if (hours <= 12) {
          basePoints = 30;
        } else if (hours <= 24) {
          basePoints = 20;
        } else if (hours <= 48) {
          basePoints = 10;
        }
        breakdown.base = basePoints;
        break;
      }

      case 'clear_brief': {
        // Content approved without revisions (clear instructions)
        basePoints = 15;
        breakdown.base = basePoints;
        break;
      }

      case 'slow_review': {
        // Penalty for taking too long to review
        basePoints = -10;
        breakdown.penalties = basePoints;
        break;
      }

      case 'excessive_revisions': {
        // Too many revision requests
        basePoints = -15;
        breakdown.penalties = basePoints;
        break;
      }
    }

    const result: CalculationResult = {
      basePoints,
      multiplier: this.roleConfig.complexity_multiplier,
      finalPoints: Math.round(basePoints * this.roleConfig.complexity_multiplier),
      breakdown,
    };

    return result; // No org multipliers for trust-based
  }
}
