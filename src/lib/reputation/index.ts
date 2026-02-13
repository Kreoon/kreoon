/**
 * Unified Reputation Engine — Public API
 */

// Types
export type {
  EffortArchetype,
  RoleCategory,
  RoleArchetype,
  MetricsConfig,
  PointActions,
  UnifiedReputationConfig,
  LevelConfig,
  ReputationEvent,
  UserReputationTotals,
  MarketplaceReputation,
  ReputationSeason,
  ClientTrustScore,
  AIArbitrationLog,
  ReputationEventInput,
  CalculationResult,
  RankingEntry,
} from './types';

export { ARCHETYPE_META, LEVEL_META } from './types';

// Calculators
export { BasePointCalculator } from './base';
export { CreativeRoleCalculator } from './creative';
export { PerformanceRoleCalculator } from './performance';
export { TrustRoleCalculator } from './trust';

// Factory
export {
  getCalculatorForRole,
  getPerformanceCalculator,
  calculateDeliveryPoints,
  getReassignmentThreshold,
  calculateDaysInColombia,
} from './factory';
