// =====================================================
// ADMIN DASHBOARD TYPES
// Tipos para el dashboard de administracion de plataforma
// =====================================================

// ========== PERIOD TYPE ==========
export type DashboardPeriod = '1d' | '7d' | '30d' | 'ytd';

// ========== MAIN STATS ==========
export interface AdminUsersStats {
  total: number;
  new_period: number;
  onboarding_completed: number;
  onboarding_pending: number;
  profile_complete: number;
  profile_incomplete: number;
  email_confirmed: number;
  email_unconfirmed: number;
  banned: number;
  superadmins: number;
}

export interface AdminActivityStats {
  active_today: number;
  active_7d: number;
  active_30d: number;
  inactive_7d: number;
  inactive_30d: number;
  never_logged_in: number;
}

export interface AdminHealthStats {
  healthy: number;
  at_risk: number;
  churning: number;
  churned: number;
  needs_attention: number;
  avg_health_score: number;
}

export interface AdminOrganizationsStats {
  total: number;
  new_period: number;
  by_tier: Record<string, number>;
}

export interface AdminCreatorsStats {
  total: number;
  new_period: number;
  verified: number;
  active: number;
  available: number;
  avg_rating: number | null;
  by_level: Record<string, number>;
}

export interface AdminClientsStats {
  total: number;
  new_period: number;
}

export interface AdminLeadsStats {
  total: number;
  new_period: number;
  converted_period: number;
}

export interface AdminDashboardStats {
  users: AdminUsersStats;
  activity: AdminActivityStats;
  health: AdminHealthStats;
  organizations: AdminOrganizationsStats;
  creators: AdminCreatorsStats;
  clients: AdminClientsStats;
  leads: AdminLeadsStats;
  generated_at: string;
  period: DashboardPeriod;
}

// ========== AI STATS ==========
export interface AdminAICallsStats {
  total: number;
  successful: number;
  failed: number;
  success_rate: number;
}

export interface AdminAITokensStats {
  total_input: number;
  total_output: number;
  total_combined: number;
}

export interface AdminAICostsStats {
  total_usd: number;
  avg_per_call_usd: number | null;
}

export interface AdminAIPerformanceStats {
  avg_response_time_ms: number | null;
  avg_user_rating: number | null;
  regeneration_rate: number;
}

export interface AdminAIModuleUsage {
  module: string;
  calls: number;
  tokens: number;
  cost_usd: number;
}

export interface AdminAIProviderUsage {
  provider: string;
  model: string;
  calls: number;
  cost_usd: number;
}

export interface AdminAIOrgTokensStats {
  orgs_with_tokens: number;
  orgs_custom_api: number;
  total_tokens_remaining: number;
  total_tokens_used_period: number;
}

export interface AdminAIStats {
  calls: AdminAICallsStats;
  tokens: AdminAITokensStats;
  costs: AdminAICostsStats;
  performance: AdminAIPerformanceStats;
  by_module: AdminAIModuleUsage[];
  by_provider: AdminAIProviderUsage[];
  org_tokens: AdminAIOrgTokensStats;
  generated_at: string;
  period: string;
}

// ========== TIMELINE ==========
export interface TimelineDataPoint {
  period: string;
  count?: number;
  calls?: number;
  cost_usd?: number;
}

export interface AdminActivityTimeline {
  registrations: TimelineDataPoint[];
  logins: TimelineDataPoint[];
  ai_calls: TimelineDataPoint[];
  generated_at: string;
  days: number;
  granularity: 'hour' | 'day' | 'week';
}

// ========== DISTRIBUTIONS ==========
export interface DistributionItem {
  label: string;
  value: number;
}

export interface AdminUserDistribution {
  by_role: Array<{ role: string; count: number }>;
  by_country: Array<{ country: string; count: number }>;
  by_lead_source: Array<{ source: string; count: number }>;
  creator_categories: Array<{ category: string; count: number }>;
  generated_at: string;
}

// ========== KPI CARD ==========
export interface AdminKPI {
  id: string;
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'purple' | 'blue' | 'green' | 'pink' | 'orange' | 'cyan' | 'yellow';
  icon: string;
}

// ========== ALERTS ==========
export interface AdminAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  entity_type?: string;
  entity_id?: string;
  action_url?: string;
  created_at: string;
}

// ========== DETAILED ENTITIES ==========

export interface AdminDetailedUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  // Status
  onboarding_completed: boolean;
  profile_data_completed: boolean;
  // Organizacion
  organization_id: string | null;
  organization_name: string | null;
  primary_role: string | null;
  all_roles: string[];
  is_org_owner: boolean;
  // Plan/Suscripcion
  subscription_tier: string | null;
  is_paid: boolean;
  // Tokens IA
  ai_tokens_balance: number;
  ai_tokens_consumed: number;
  // Marketplace
  has_creator_profile: boolean;
  is_marketplace_published: boolean;
  // Health
  health_score: number | null;
  health_status: string | null;
}

export interface AdminDetailedOrganization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  is_blocked: boolean;
  subscription_tier: string | null;
  members_count: number;
  ai_tokens_balance: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminUserFilters {
  search?: string;
  hasOrganization?: boolean;
  inMarketplace?: boolean;
  isPaid?: boolean;
  role?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminOrgFilters {
  search?: string;
  tier?: string;
  page?: number;
  pageSize?: number;
}
