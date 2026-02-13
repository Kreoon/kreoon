/**
 * Unified Reputation Engine — Type Definitions
 */

// ─── Archetypes ──────────────────────────────────

export type EffortArchetype = 'high_volume' | 'high_effort' | 'balanced' | 'trust_based';

export type RoleCategory = 'system' | 'creative' | 'production' | 'strategy' | 'performance' | 'client' | 'technology' | 'education';

// ─── DB Row Types ────────────────────────────────

export interface RoleArchetype {
  id: string;
  organization_id: string | null;
  role_key: string;
  role_display_name: string;
  role_category: RoleCategory;
  archetype: EffortArchetype;
  base_weight: number;
  complexity_multiplier: number;
  metrics_config: MetricsConfig;
  point_actions: PointActions;
  expected_monthly_volume: number;
  volume_normalization_cap: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetricsConfig {
  tracks_speed: boolean;
  tracks_quality: boolean;
  tracks_volume: boolean;
  tracks_kpi: boolean;
  tracks_trust: boolean;
}

export interface PointActions {
  task_completed: number;
  early_delivery_bonus: number;
  on_time_delivery: number;
  late_delivery_penalty: number;
  revision_penalty: number;
  clean_approval_bonus: number;
  recovery_bonus: number;
  streak_weekly: number;
  streak_monthly: number;
}

export interface UnifiedReputationConfig {
  id: string;
  organization_id: string;
  config_version: number;
  levels: LevelConfig[];
  speed_multiplier: number;
  quality_multiplier: number;
  volume_multiplier: number;
  compliance_fund_enabled: boolean;
  compliance_fund_penalty_rate: number;
  season_duration_days: number;
  current_season_start: string | null;
  ai_auto_adjust: boolean;
  ai_fraud_detection: boolean;
  created_at: string;
  updated_at: string;
}

export interface LevelConfig {
  name: string;
  min_score: number;
  badge_color: string;
  perks: string[];
}

export interface ReputationEvent {
  id: string;
  organization_id: string;
  user_id: string;
  role_key: string;
  reference_type: string;
  reference_id: string;
  event_type: string;
  event_subtype: string | null;
  base_points: number;
  multiplier: number;
  final_points: number;
  calculation_breakdown: Record<string, any> | null;
  ai_decision_id: string | null;
  season_id: string | null;
  event_date: string;
  created_at: string;
}

export interface UserReputationTotals {
  id: string;
  organization_id: string;
  user_id: string;
  role_key: string;
  lifetime_points: number;
  lifetime_tasks: number;
  season_points: number;
  season_tasks: number;
  rolling_30d_points: number;
  rolling_30d_tasks: number;
  rolling_30d_average: number;
  current_level: string;
  current_level_progress: number;
  on_time_rate: number;
  approval_rate: number;
  revision_rate: number;
  current_streak_days: number;
  best_streak_days: number;
  last_activity_date: string | null;
  normalized_score: number;
  last_calculated_at: string;
}

export interface MarketplaceReputation {
  user_id: string;
  global_score: number;
  global_level: string;
  total_projects_completed: number;
  avg_rating: number;
  on_time_delivery_rate: number;
  public_badges: any[];
  specialties: string[];
  is_verified: boolean;
  verification_level: number;
  last_synced_at: string;
}

export interface ReputationSeason {
  id: string;
  organization_id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  rewards_config: Record<string, any>;
  compliance_fund_total: number;
  created_at: string;
}

export interface ClientTrustScore {
  id: string;
  organization_id: string;
  client_user_id: string;
  approval_speed_avg_hours: number;
  brief_clarity_score: number;
  payment_punctuality_rate: number;
  trust_level: 'Standard' | 'Trusted' | 'Premium' | 'VIP' | 'Flagged';
  rejection_rate: number;
  is_flagged_toxic: boolean;
  toxic_flag_reason: string | null;
  total_projects: number;
  total_approved: number;
  total_rejected: number;
  last_calculated_at: string;
}

export interface AIArbitrationLog {
  id: string;
  organization_id: string;
  decision_type: string;
  affected_user_id: string | null;
  affected_reference_id: string | null;
  input_data: Record<string, any>;
  decision: Record<string, any>;
  confidence_score: number | null;
  status: 'pending' | 'approved' | 'rejected' | 'auto_applied';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ─── Calculator Interfaces ───────────────────────

export interface ReputationEventInput {
  eventType: string;
  eventSubtype?: string;
  referenceType: string;
  referenceId: string;
  metadata?: Record<string, any>;
}

export interface CalculationResult {
  basePoints: number;
  multiplier: number;
  finalPoints: number;
  breakdown: {
    base: number;
    speedBonus?: number;
    qualityMultiplier?: number;
    volumeAdjustment?: number;
    penalties?: number;
    streakBonus?: number;
    recoveryBonus?: number;
    kpiBonus?: string;
    roasBonus?: number;
  };
}

// ─── Leaderboard Types ───────────────────────────

export interface RankingEntry {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role_key: string;
  lifetime_points: number;
  season_points: number;
  normalized_score: number;
  current_level: string;
  current_level_progress: number;
  on_time_rate: number;
  lifetime_tasks: number;
  current_streak_days: number;
  archetype: string;
  base_weight: number;
}

// ─── Archetype Metadata ─────────────────────────

export const ARCHETYPE_META: Record<EffortArchetype, {
  label: string;
  description: string;
  icon: string;
  color: string;
}> = {
  high_volume: {
    label: 'Alto Volumen',
    description: 'Muchas micro-tareas (ej: Community Manager, Trafficker)',
    icon: '⚡',
    color: '#f59e0b',
  },
  high_effort: {
    label: 'Alta Complejidad',
    description: 'Pocas tareas muy complejas (ej: Animador 2D/3D, Dev)',
    icon: '🔥',
    color: '#ef4444',
  },
  balanced: {
    label: 'Equilibrado',
    description: 'Balance entre volumen y complejidad (ej: Creador, Editor)',
    icon: '⚖️',
    color: '#3b82f6',
  },
  trust_based: {
    label: 'Basado en Confianza',
    description: 'Mide confianza, no volumen (ej: Clientes)',
    icon: '🤝',
    color: '#10b981',
  },
};

export const LEVEL_META: Record<string, {
  icon: string;
  color: string;
  bgColor: string;
}> = {
  Novato: { icon: '🌱', color: '#94a3b8', bgColor: '#f1f5f9' },
  Pro:    { icon: '⚡', color: '#60a5fa', bgColor: '#eff6ff' },
  Elite:  { icon: '🔥', color: '#a78bfa', bgColor: '#f5f3ff' },
  Master: { icon: '👑', color: '#fbbf24', bgColor: '#fffbeb' },
  Legend: { icon: '💎', color: '#f472b6', bgColor: '#fdf2f8' },
};
