import { supabase } from '@/integrations/supabase/client';
import type {
  PlatformLead,
  PlatformLeadInsert,
  PlatformLeadUpdate,
  PlatformLeadInteraction,
  PlatformLeadInteractionInsert,
  PlatformLeadSummary,
  PlatformUserHealth,
  UserNeedingAttention,
  LeadStats,
  LeadType,
  LeadStage,
  TalentCategory,
  SpecificRole,
  RegistrationIntent,
  ExperienceLevel,
  FullUserDetail,
  FullCreatorDetail,
} from '@/types/crm.types';

// =====================================================
// FILTERS
// =====================================================

export interface LeadFilters {
  stage?: LeadStage;
  lead_type?: LeadType;
  lead_source?: string;
  assigned_to?: string;
  search?: string;
  tags?: string[];
  min_score?: number;
  talent_category?: TalentCategory;
  specific_role?: SpecificRole;
  registration_intent?: RegistrationIntent;
  experience_level?: ExperienceLevel;
  country?: string;
  limit?: number;
  offset?: number;
}

// =====================================================
// LEADS
// =====================================================

export async function getLeads(filters?: LeadFilters): Promise<PlatformLeadSummary[]> {
  let query = (supabase as any)
    .from('v_platform_leads_summary')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.stage) query = query.eq('stage', filters.stage);
  if (filters?.lead_type) query = query.eq('lead_type', filters.lead_type);
  if (filters?.lead_source) query = query.eq('lead_source', filters.lead_source);
  if (filters?.assigned_to) query = query.eq('assigned_to', filters.assigned_to);
  if (filters?.min_score) query = query.gte('lead_score', filters.min_score);
  if (filters?.tags?.length) query = query.overlaps('tags', filters.tags);
  if (filters?.talent_category) query = query.eq('talent_category', filters.talent_category);
  if (filters?.specific_role) query = query.eq('specific_role', filters.specific_role);
  if (filters?.registration_intent) query = query.eq('registration_intent', filters.registration_intent);
  if (filters?.experience_level) query = query.eq('experience_level', filters.experience_level);
  if (filters?.country) query = query.eq('country', filters.country);
  if (filters?.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data as PlatformLeadSummary[];
}

export async function getLeadById(id: string): Promise<PlatformLead> {
  const { data, error } = await (supabase as any)
    .from('platform_leads')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as PlatformLead;
}

export async function createLead(input: PlatformLeadInsert): Promise<PlatformLead> {
  const { data, error } = await (supabase as any)
    .from('platform_leads')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as PlatformLead;
}

export async function updateLead(id: string, input: PlatformLeadUpdate): Promise<PlatformLead> {
  const { data, error } = await (supabase as any)
    .from('platform_leads')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as PlatformLead;
}

export async function deleteLead(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from('platform_leads')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// =====================================================
// LEAD INTERACTIONS
// =====================================================

export async function getLeadInteractions(leadId: string): Promise<PlatformLeadInteraction[]> {
  const { data, error } = await (supabase as any)
    .from('platform_lead_interactions')
    .select('*')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as PlatformLeadInteraction[];
}

export async function addLeadInteraction(
  leadId: string,
  input: Omit<PlatformLeadInteractionInsert, 'lead_id'>
): Promise<PlatformLeadInteraction> {
  const { data, error } = await (supabase as any)
    .from('platform_lead_interactions')
    .insert({ lead_id: leadId, ...input })
    .select()
    .single();
  if (error) throw error;
  return data as PlatformLeadInteraction;
}

// =====================================================
// STATS & HEALTH
// =====================================================

export async function getLeadStats(days: number = 30): Promise<LeadStats> {
  const { data, error } = await (supabase as any)
    .rpc('get_lead_stats', { days });
  if (error) throw error;
  return data as LeadStats;
}

export async function getUsersNeedingAttention(): Promise<UserNeedingAttention[]> {
  const { data, error } = await (supabase as any)
    .from('v_users_needing_attention')
    .select('*')
    .order('health_score', { ascending: true });
  if (error) throw error;
  return data as UserNeedingAttention[];
}

export async function getUserHealth(userId: string): Promise<PlatformUserHealth | null> {
  const { data, error } = await (supabase as any)
    .from('platform_user_health')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as PlatformUserHealth | null;
}

export async function recalculateHealthScore(userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .rpc('update_user_health_score', { p_user_id: userId });
  if (error) throw error;
}

export async function convertLeadToUser(leadId: string, userId: string): Promise<void> {
  const { error } = await (supabase as any)
    .rpc('convert_lead_to_user', { p_lead_id: leadId, p_user_id: userId });
  if (error) throw error;
}

// =====================================================
// ROLE & CATEGORY QUERIES
// =====================================================

export interface LeadDistribution {
  by_category: { category: TalentCategory | null; count: number }[];
  by_role: { role: SpecificRole | null; count: number }[];
  by_intent: { intent: RegistrationIntent | null; count: number }[];
  by_experience: { level: ExperienceLevel | null; count: number }[];
  by_subtype: { subtype: string | null; count: number }[];
  by_country: { country: string | null; count: number }[];
}

export async function getLeadsByCategory(category: TalentCategory): Promise<PlatformLeadSummary[]> {
  const { data, error } = await (supabase as any)
    .from('v_platform_leads_summary')
    .select('*')
    .eq('talent_category', category)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as PlatformLeadSummary[];
}

export async function getLeadsByRole(role: SpecificRole): Promise<PlatformLeadSummary[]> {
  const { data, error } = await (supabase as any)
    .from('v_platform_leads_summary')
    .select('*')
    .eq('specific_role', role)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as PlatformLeadSummary[];
}

// =====================================================
// DASHBOARD RPCs
// =====================================================

export interface PlatformOverviewStats {
  total_leads: number;
  total_organizations: number;
  total_creators: number;
  total_users: number;
  new_leads_this_month: number;
  new_orgs_this_month: number;
  new_creators_this_month: number;
  new_users_this_month: number;
}

export interface LeadsByMonthEntry {
  month: string;
  label: string;
  total: number;
  converted: number;
}

export interface RecentInteraction {
  id: string;
  interaction_type: string;
  subject: string | null;
  content: string | null;
  created_at: string;
  lead_name: string;
  lead_email: string;
  performed_by_name: string | null;
}

export async function getPlatformOverviewStats(): Promise<PlatformOverviewStats> {
  const { data, error } = await (supabase as any).rpc('get_platform_overview_stats');
  if (error) throw error;
  return data as PlatformOverviewStats;
}

export async function getLeadsByMonth(months: number = 6): Promise<LeadsByMonthEntry[]> {
  const { data, error } = await (supabase as any).rpc('get_leads_by_month', { p_months: months });
  if (error) throw error;
  return (data || []) as LeadsByMonthEntry[];
}

export async function getRecentLeadInteractions(limit: number = 10): Promise<RecentInteraction[]> {
  const { data, error } = await (supabase as any).rpc('get_recent_lead_interactions', { p_limit: limit });
  if (error) throw error;
  return (data || []) as RecentInteraction[];
}

export async function getLeadDistribution(): Promise<LeadDistribution> {
  const { data, error } = await (supabase as any)
    .from('platform_leads')
    .select('talent_category, specific_role, registration_intent, experience_level, talent_subtype, country');
  if (error) throw error;

  const rows = (data || []) as Array<{
    talent_category: string | null;
    specific_role: string | null;
    registration_intent: string | null;
    experience_level: string | null;
    talent_subtype: string | null;
    country: string | null;
  }>;

  const catMap: Record<string, number> = {};
  const roleMap: Record<string, number> = {};
  const intentMap: Record<string, number> = {};
  const expMap: Record<string, number> = {};
  const subMap: Record<string, number> = {};
  const countryMap: Record<string, number> = {};

  for (const row of rows) {
    if (row.talent_category) catMap[row.talent_category] = (catMap[row.talent_category] || 0) + 1;
    if (row.specific_role) roleMap[row.specific_role] = (roleMap[row.specific_role] || 0) + 1;
    if (row.registration_intent) intentMap[row.registration_intent] = (intentMap[row.registration_intent] || 0) + 1;
    if (row.experience_level) expMap[row.experience_level] = (expMap[row.experience_level] || 0) + 1;
    if (row.talent_subtype) subMap[row.talent_subtype] = (subMap[row.talent_subtype] || 0) + 1;
    if (row.country) countryMap[row.country] = (countryMap[row.country] || 0) + 1;
  }

  const toArr = <T>(map: Record<string, number>, key: string) =>
    Object.entries(map)
      .map(([k, count]) => ({ [key]: k as T, count }) as any)
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count);

  return {
    by_category: toArr<TalentCategory>(catMap, 'category'),
    by_role: toArr<SpecificRole>(roleMap, 'role'),
    by_intent: toArr<RegistrationIntent>(intentMap, 'intent'),
    by_experience: toArr<ExperienceLevel>(expMap, 'level'),
    by_subtype: toArr<string>(subMap, 'subtype'),
    by_country: toArr<string>(countryMap, 'country'),
  };
}

// =====================================================
// ORGANIZATIONS WITH METRICS
// =====================================================

export interface OrganizationWithMetrics {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  created_at: string;
  settings: Record<string, any> | null;
  member_count: number;
  creator_count: number;
  total_spent: number;
  content_count: number;
  last_activity_at: string | null;
}

export async function getOrganizationsWithMetrics(): Promise<OrganizationWithMetrics[]> {
  const { data, error } = await (supabase as any).rpc('get_platform_organizations_with_metrics');
  if (error) throw error;
  return (data || []) as OrganizationWithMetrics[];
}

// =====================================================
// CREATORS WITH METRICS
// =====================================================

export interface CreatorWithMetrics {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  categories: string[];
  content_types: string[];
  platforms: string[];
  marketplace_roles: string[];
  level: string;
  is_verified: boolean;
  is_active: boolean;
  is_available: boolean;
  rating_avg: number;
  rating_count: number;
  completed_projects: number;
  base_price: number | null;
  currency: string;
  location_city: string | null;
  location_country: string | null;
  total_earned: number;
  created_at: string;
}

export async function getCreatorsWithMetrics(): Promise<CreatorWithMetrics[]> {
  const { data, error } = await (supabase as any).rpc('get_platform_creators_with_metrics');
  if (error) throw error;
  return (data || []) as CreatorWithMetrics[];
}

// =====================================================
// USERS WITH HEALTH
// =====================================================

export interface UserWithHealth {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  organization_id: string | null;
  organization_name: string | null;
  health_score: number;
  health_status: string;
  total_logins: number;
  days_since_last_activity: number | null;
  last_login_at: string | null;
  total_actions: number;
  needs_attention: boolean;
  created_at: string;
  // Auth-level fields
  email_confirmed_at: string | null;
  is_banned: boolean;
  has_profile: boolean;
  is_platform_admin: boolean;
}

export async function getUsersWithHealth(): Promise<UserWithHealth[]> {
  const { data, error } = await (supabase as any).rpc('get_platform_users_with_health');
  if (error) throw error;
  return (data || []) as UserWithHealth[];
}

// =====================================================
// FULL DETAIL RPCs
// =====================================================

export async function getFullUserDetail(userId: string): Promise<FullUserDetail> {
  const { data, error } = await (supabase as any)
    .rpc('get_full_user_detail', { p_user_id: userId });
  if (error) throw error;
  return data as FullUserDetail;
}

export async function getFullCreatorDetail(creatorProfileId: string): Promise<FullCreatorDetail> {
  const { data, error } = await (supabase as any)
    .rpc('get_full_creator_detail', { p_creator_profile_id: creatorProfileId });
  if (error) throw error;
  return data as FullCreatorDetail;
}
