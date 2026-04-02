import { supabase } from '@/integrations/supabase/client';
import type {
  AdminDashboardStats,
  AdminAIStats,
  AdminActivityTimeline,
  AdminUserDistribution,
  AdminDetailedUser,
  AdminDetailedOrganization,
  AdminUserFilters,
  AdminOrgFilters,
  PaginatedResult,
  DashboardPeriod,
} from '@/types/admin-dashboard.types';

// =====================================================
// HELPERS
// =====================================================

function getPeriodInterval(period: DashboardPeriod): string {
  switch (period) {
    case '1d': return '1 day';
    case '7d': return '7 days';
    case '30d': return '30 days';
    case 'ytd': return '365 days'; // Aproximado para YTD
    default: return '30 days';
  }
}

function getPeriodDays(period: DashboardPeriod): number {
  switch (period) {
    case '1d': return 1;
    case '7d': return 7;
    case '30d': return 30;
    case 'ytd': return 365;
    default: return 30;
  }
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export async function getAdminDashboardStats(period: DashboardPeriod = '30d'): Promise<AdminDashboardStats> {
  const days = getPeriodDays(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString();

  // Ejecutar queries en paralelo para mejor performance
  const [
    profilesResult,
    profilesNewResult,
    profilesOnboardingResult,
    profilesCompleteResult,
    healthResult,
    orgsResult,
    orgsNewResult,
    orgsTierResult,
    creatorsResult,
    creatorsNewResult,
    clientsResult,
    clientsNewResult,
    leadsResult,
    leadsNewResult,
    leadsConvertedResult,
  ] = await Promise.all([
    // Total usuarios
    (supabase as any).from('profiles').select('id', { count: 'exact', head: true }),
    // Nuevos usuarios periodo
    (supabase as any).from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', startDateStr),
    // Onboarding stats
    (supabase as any).from('profiles').select('onboarding_completed'),
    // Profile complete stats
    (supabase as any).from('profiles').select('profile_data_completed'),
    // Health stats
    (supabase as any).from('platform_user_health').select('health_status, health_score, needs_attention'),
    // Total orgs (filtrar eliminadas)
    (supabase as any).from('organizations').select('id, selected_plan, is_blocked', { count: 'exact' }).is('deleted_at', null),
    // Nuevas orgs
    (supabase as any).from('organizations').select('id', { count: 'exact', head: true }).gte('created_at', startDateStr),
    // Orgs por tier (campo real: selected_plan)
    (supabase as any).from('organizations').select('selected_plan').is('deleted_at', null),
    // Total creators
    (supabase as any).from('creator_profiles').select('id', { count: 'exact', head: true }),
    // Nuevos creators
    (supabase as any).from('creator_profiles').select('id', { count: 'exact', head: true }).gte('created_at', startDateStr),
    // Total clients
    (supabase as any).from('clients').select('id', { count: 'exact', head: true }),
    // Nuevos clients
    (supabase as any).from('clients').select('id', { count: 'exact', head: true }).gte('created_at', startDateStr),
    // Total leads
    (supabase as any).from('platform_leads').select('id', { count: 'exact', head: true }),
    // Nuevos leads
    (supabase as any).from('platform_leads').select('id', { count: 'exact', head: true }).gte('created_at', startDateStr),
    // Leads convertidos
    (supabase as any).from('platform_leads').select('id', { count: 'exact', head: true }).eq('stage', 'converted').gte('converted_at', startDateStr),
  ]);

  // Procesar onboarding stats
  const onboardingData = profilesOnboardingResult.data || [];
  const onboardingCompleted = onboardingData.filter((p: any) => p.onboarding_completed === true).length;
  const onboardingPending = onboardingData.filter((p: any) => p.onboarding_completed !== true).length;

  // Procesar profile complete stats
  const profileData = profilesCompleteResult.data || [];
  const profileComplete = profileData.filter((p: any) => p.profile_data_completed === true).length;
  const profileIncomplete = profileData.filter((p: any) => p.profile_data_completed !== true).length;

  // Procesar health stats
  const healthData = healthResult.data || [];
  const healthy = healthData.filter((h: any) => h.health_status === 'healthy').length;
  const atRisk = healthData.filter((h: any) => h.health_status === 'at_risk').length;
  const churning = healthData.filter((h: any) => h.health_status === 'churning').length;
  const churned = healthData.filter((h: any) => h.health_status === 'churned').length;
  const needsAttention = healthData.filter((h: any) => h.needs_attention === true).length;
  const avgHealthScore = healthData.length > 0
    ? Math.round(healthData.reduce((sum: number, h: any) => sum + (h.health_score || 0), 0) / healthData.length)
    : 0;

  // Procesar orgs por tier (campo real: selected_plan)
  const tierData = orgsTierResult.data || [];
  const byTier: Record<string, number> = {};
  tierData.forEach((o: any) => {
    const tier = o.selected_plan || 'free';
    byTier[tier] = (byTier[tier] || 0) + 1;
  });

  return {
    users: {
      total: profilesResult.count || 0,
      new_period: profilesNewResult.count || 0,
      onboarding_completed: onboardingCompleted,
      onboarding_pending: onboardingPending,
      profile_complete: profileComplete,
      profile_incomplete: profileIncomplete,
      email_confirmed: 0, // Requiere acceso a auth.users
      email_unconfirmed: 0,
      banned: 0,
      superadmins: 0,
    },
    activity: {
      active_today: 0, // Requiere tracking de sesiones
      active_7d: 0,
      active_30d: 0,
      inactive_7d: 0,
      inactive_30d: 0,
      never_logged_in: 0,
    },
    health: {
      healthy,
      at_risk: atRisk,
      churning,
      churned,
      needs_attention: needsAttention,
      avg_health_score: avgHealthScore,
    },
    organizations: {
      total: orgsResult.count || 0,
      new_period: orgsNewResult.count || 0,
      by_tier: byTier,
    },
    creators: {
      total: creatorsResult.count || 0,
      new_period: creatorsNewResult.count || 0,
      verified: 0,
      active: 0,
      available: 0,
      avg_rating: null,
      by_level: {},
    },
    clients: {
      total: clientsResult.count || 0,
      new_period: clientsNewResult.count || 0,
    },
    leads: {
      total: leadsResult.count || 0,
      new_period: leadsNewResult.count || 0,
      converted_period: leadsConvertedResult.count || 0,
    },
    generated_at: new Date().toISOString(),
    period,
  };
}

// =====================================================
// AI STATS
// =====================================================

export async function getAdminAIStats(period: DashboardPeriod = '30d'): Promise<AdminAIStats> {
  const days = getPeriodDays(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString();

  // Intentar obtener datos de ai_usage_logs si existe
  let aiData: any[] = [];
  let orgTokensData: any[] = [];

  try {
    const { data, error } = await (supabase as any)
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', startDateStr);

    if (!error && data) {
      aiData = data;
    }
  } catch (e) {
    console.log('ai_usage_logs table not available');
  }

  try {
    const { data, error } = await (supabase as any)
      .from('organization_ai_tokens')
      .select('*');

    if (!error && data) {
      orgTokensData = data;
    }
  } catch (e) {
    console.log('organization_ai_tokens table not available');
  }

  // Filtrar providers internos/de desarrollo
  const HIDDEN_PROVIDERS_LIST = ['lovable'];
  const filteredAiData = aiData.filter((a: any) =>
    !HIDDEN_PROVIDERS_LIST.includes((a.provider || '').toLowerCase())
  );

  // Procesar AI stats (sin providers ocultos)
  const totalCalls = filteredAiData.length;
  const successfulCalls = filteredAiData.filter((a: any) => a.success === true).length;
  const failedCalls = filteredAiData.filter((a: any) => a.success === false).length;
  const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;

  const totalInput = filteredAiData.reduce((sum: number, a: any) => sum + (a.tokens_input || 0), 0);
  const totalOutput = filteredAiData.reduce((sum: number, a: any) => sum + (a.tokens_output || 0), 0);
  const totalCost = filteredAiData.reduce((sum: number, a: any) => sum + (a.estimated_cost || 0), 0);

  // Agrupar por modulo (sin providers ocultos)
  const byModuleMap: Record<string, { calls: number; tokens: number; cost: number }> = {};
  filteredAiData.forEach((a: any) => {
    const module = a.module || 'unknown';
    if (!byModuleMap[module]) {
      byModuleMap[module] = { calls: 0, tokens: 0, cost: 0 };
    }
    byModuleMap[module].calls += 1;
    byModuleMap[module].tokens += (a.tokens_input || 0) + (a.tokens_output || 0);
    byModuleMap[module].cost += a.estimated_cost || 0;
  });

  const byModule = Object.entries(byModuleMap).map(([module, stats]) => ({
    module,
    calls: stats.calls,
    tokens: stats.tokens,
    cost_usd: Math.round(stats.cost * 10000) / 10000,
  })).sort((a, b) => b.calls - a.calls).slice(0, 10);

  // Agrupar por provider (sin providers ocultos)
  const byProviderMap: Record<string, { calls: number; cost: number }> = {};
  filteredAiData.forEach((a: any) => {
    const key = `${a.provider || 'unknown'}|${a.model || 'unknown'}`;
    if (!byProviderMap[key]) {
      byProviderMap[key] = { calls: 0, cost: 0 };
    }
    byProviderMap[key].calls += 1;
    byProviderMap[key].cost += a.estimated_cost || 0;
  });

  // Filtrar providers internos/de desarrollo
  const HIDDEN_PROVIDERS = ['lovable'];

  const byProvider = Object.entries(byProviderMap)
    .map(([key, stats]) => {
      const [provider, model] = key.split('|');
      return {
        provider,
        model,
        calls: stats.calls,
        cost_usd: Math.round(stats.cost * 10000) / 10000,
      };
    })
    .filter(p => !HIDDEN_PROVIDERS.includes(p.provider.toLowerCase()))
    .sort((a, b) => b.calls - a.calls);

  // Procesar org tokens
  const orgsWithTokens = orgTokensData.length;
  const orgsCustomApi = orgTokensData.filter((o: any) => o.custom_api_enabled === true).length;
  const totalTokensRemaining = orgTokensData.reduce((sum: number, o: any) => sum + (o.tokens_remaining || 0), 0);
  const totalTokensUsed = orgTokensData.reduce((sum: number, o: any) => sum + (o.tokens_used_this_period || 0), 0);

  return {
    calls: {
      total: totalCalls,
      successful: successfulCalls,
      failed: failedCalls,
      success_rate: successRate,
    },
    tokens: {
      total_input: totalInput,
      total_output: totalOutput,
      total_combined: totalInput + totalOutput,
    },
    costs: {
      total_usd: Math.round(totalCost * 10000) / 10000,
      avg_per_call_usd: totalCalls > 0 ? Math.round((totalCost / totalCalls) * 1000000) / 1000000 : null,
    },
    performance: {
      avg_response_time_ms: null,
      avg_user_rating: null,
      regeneration_rate: 0,
    },
    by_module: byModule,
    by_provider: byProvider,
    org_tokens: {
      orgs_with_tokens: orgsWithTokens,
      orgs_custom_api: orgsCustomApi,
      total_tokens_remaining: totalTokensRemaining,
      total_tokens_used_period: totalTokensUsed,
    },
    generated_at: new Date().toISOString(),
    period,
  };
}

// =====================================================
// ACTIVITY TIMELINE
// =====================================================

export async function getAdminActivityTimeline(
  days: number = 30,
  granularity: 'hour' | 'day' | 'week' = 'day'
): Promise<AdminActivityTimeline> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startDateStr = startDate.toISOString();

  // Obtener registros de usuarios
  const { data: profilesData } = await (supabase as any)
    .from('profiles')
    .select('created_at')
    .gte('created_at', startDateStr)
    .order('created_at', { ascending: true });

  // Agrupar por periodo
  const registrations: Record<string, number> = {};
  (profilesData || []).forEach((p: any) => {
    const date = new Date(p.created_at);
    let key: string;

    if (granularity === 'hour') {
      key = `${date.toISOString().slice(0, 13)}:00`;
    } else if (granularity === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().slice(0, 10);
    } else {
      key = date.toISOString().slice(0, 10);
    }

    registrations[key] = (registrations[key] || 0) + 1;
  });

  const registrationsArray = Object.entries(registrations)
    .map(([period, count]) => ({ period, count }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return {
    registrations: registrationsArray,
    logins: [], // Requiere tracking de sesiones
    ai_calls: [], // Se puede agregar si ai_usage_logs existe
    generated_at: new Date().toISOString(),
    days,
    granularity,
  };
}

// =====================================================
// USER DISTRIBUTION
// =====================================================

export async function getAdminUserDistribution(): Promise<AdminUserDistribution> {
  const [rolesResult, countryResult, leadsSourceResult] = await Promise.all([
    (supabase as any).from('profiles').select('active_role'),
    (supabase as any).from('profiles').select('country'),
    (supabase as any).from('platform_leads').select('lead_source'),
  ]);

  // Por rol
  const roleMap: Record<string, number> = {};
  (rolesResult.data || []).forEach((p: any) => {
    const role = p.active_role || 'unknown';
    roleMap[role] = (roleMap[role] || 0) + 1;
  });
  const byRole = Object.entries(roleMap)
    .map(([role, count]) => ({ role, count }))
    .sort((a, b) => b.count - a.count);

  // Por pais
  const countryMap: Record<string, number> = {};
  (countryResult.data || []).forEach((p: any) => {
    const country = p.country || 'unknown';
    countryMap[country] = (countryMap[country] || 0) + 1;
  });
  const byCountry = Object.entries(countryMap)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Por fuente de lead
  const sourceMap: Record<string, number> = {};
  (leadsSourceResult.data || []).forEach((l: any) => {
    const source = l.lead_source || 'direct';
    sourceMap[source] = (sourceMap[source] || 0) + 1;
  });
  const byLeadSource = Object.entries(sourceMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return {
    by_role: byRole,
    by_country: byCountry,
    by_lead_source: byLeadSource,
    creator_categories: [],
    generated_at: new Date().toISOString(),
  };
}

// =====================================================
// DETAILED USERS
// =====================================================

export async function getDetailedUsers(
  filters: AdminUserFilters = {}
): Promise<PaginatedResult<AdminDetailedUser>> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Query base de profiles
  let query = (supabase as any)
    .from('profiles')
    .select('id, email, full_name, avatar_url, created_at, onboarding_completed, profile_data_completed, ai_tokens_balance, active_role', { count: 'exact' });

  // Filtro de busqueda
  if (filters.search) {
    query = query.or(`full_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
  }

  // Paginacion
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data: profiles, count, error } = await query;

  if (error || !profiles) {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const userIds = profiles.map((p: any) => p.id);

  // Queries paralelas para enriquecer datos
  const [membersResult, creatorsResult, healthResult, aiUsageResult] = await Promise.all([
    // Membresías de org (campo real: selected_plan)
    (supabase as any)
      .from('organization_members')
      .select('user_id, role, is_owner, organization_id, organizations(name, selected_plan)')
      .in('user_id', userIds),
    // Perfiles de creator
    (supabase as any)
      .from('creator_profiles')
      .select('user_id, is_published')
      .in('user_id', userIds),
    // Health
    (supabase as any)
      .from('platform_user_health')
      .select('user_id, health_score, health_status')
      .in('user_id', userIds),
    // Consumo IA
    (supabase as any)
      .from('ai_usage_logs')
      .select('user_id, tokens_input, tokens_output')
      .in('user_id', userIds),
  ]);

  const members = membersResult.data || [];
  const creators = creatorsResult.data || [];
  const healthData = healthResult.data || [];
  const aiUsage = aiUsageResult.data || [];

  // Indexar por user_id
  const membersByUser: Record<string, any[]> = {};
  members.forEach((m: any) => {
    if (!membersByUser[m.user_id]) membersByUser[m.user_id] = [];
    membersByUser[m.user_id].push(m);
  });

  const creatorByUser: Record<string, any> = {};
  creators.forEach((c: any) => { creatorByUser[c.user_id] = c; });

  const healthByUser: Record<string, any> = {};
  healthData.forEach((h: any) => { healthByUser[h.user_id] = h; });

  const aiConsumedByUser: Record<string, number> = {};
  aiUsage.forEach((a: any) => {
    aiConsumedByUser[a.user_id] = (aiConsumedByUser[a.user_id] || 0) + (a.tokens_input || 0) + (a.tokens_output || 0);
  });

  // Construir resultado
  let detailedUsers: AdminDetailedUser[] = profiles.map((p: any) => {
    const userMembers = membersByUser[p.id] || [];
    const primaryMember = userMembers[0] || null;
    const creator = creatorByUser[p.id];
    const health = healthByUser[p.id];
    const orgData = primaryMember?.organizations;
    const tier = orgData?.selected_plan || null;

    return {
      id: p.id,
      email: p.email || '',
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      created_at: p.created_at,
      onboarding_completed: p.onboarding_completed || false,
      profile_data_completed: p.profile_data_completed || false,
      organization_id: primaryMember?.organization_id || null,
      organization_name: orgData?.name || null,
      primary_role: primaryMember?.role || p.active_role || null,
      all_roles: userMembers.map((m: any) => m.role).filter(Boolean),
      is_org_owner: userMembers.some((m: any) => m.is_owner === true),
      subscription_tier: tier,
      is_paid: tier !== null && tier !== 'free',
      ai_tokens_balance: p.ai_tokens_balance || 0,
      ai_tokens_consumed: aiConsumedByUser[p.id] || 0,
      has_creator_profile: !!creator,
      is_marketplace_published: creator?.is_published === true,
      health_score: health?.health_score ?? null,
      health_status: health?.health_status ?? null,
    };
  });

  // Filtros post-query
  if (filters.hasOrganization !== undefined) {
    detailedUsers = detailedUsers.filter(u =>
      filters.hasOrganization ? u.organization_id !== null : u.organization_id === null
    );
  }
  if (filters.inMarketplace !== undefined) {
    detailedUsers = detailedUsers.filter(u => u.is_marketplace_published === filters.inMarketplace);
  }
  if (filters.isPaid !== undefined) {
    detailedUsers = detailedUsers.filter(u => u.is_paid === filters.isPaid);
  }
  if (filters.role) {
    detailedUsers = detailedUsers.filter(u => u.all_roles.includes(filters.role!));
  }

  const total = count || 0;
  return {
    data: detailedUsers,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

// =====================================================
// DETAILED ORGANIZATIONS
// =====================================================

export async function getDetailedOrganizations(
  filters: AdminOrgFilters = {}
): Promise<PaginatedResult<AdminDetailedOrganization>> {
  const page = filters.page || 1;
  const pageSize = filters.pageSize || 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = (supabase as any)
    .from('organizations')
    .select('id, name, slug, logo_url, created_at, is_blocked, selected_plan', { count: 'exact' })
    .is('deleted_at', null);

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,slug.ilike.%${filters.search}%`);
  }
  if (filters.tier) {
    query = query.eq('selected_plan', filters.tier);
  }

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data: orgs, count, error } = await query;

  if (error || !orgs) {
    return { data: [], total: 0, page, pageSize, totalPages: 0 };
  }

  const orgIds = orgs.map((o: any) => o.id);

  // Queries paralelas
  const [membersCountResult, tokensResult] = await Promise.all([
    (supabase as any)
      .from('organization_members')
      .select('organization_id')
      .in('organization_id', orgIds),
    (supabase as any)
      .from('organization_ai_tokens')
      .select('organization_id, tokens_remaining')
      .in('organization_id', orgIds),
  ]);

  const membersData = membersCountResult.data || [];
  const tokensData = tokensResult.data || [];

  // Contar miembros por org
  const memberCountByOrg: Record<string, number> = {};
  membersData.forEach((m: any) => {
    memberCountByOrg[m.organization_id] = (memberCountByOrg[m.organization_id] || 0) + 1;
  });

  // Tokens por org
  const tokensByOrg: Record<string, number> = {};
  tokensData.forEach((t: any) => {
    tokensByOrg[t.organization_id] = t.tokens_remaining || 0;
  });

  const detailedOrgs: AdminDetailedOrganization[] = orgs.map((o: any) => ({
    id: o.id,
    name: o.name || '',
    slug: o.slug || '',
    logo_url: o.logo_url,
    created_at: o.created_at,
    is_blocked: o.is_blocked || false,
    subscription_tier: o.selected_plan,  // Campo real: selected_plan
    members_count: memberCountByOrg[o.id] || 0,
    ai_tokens_balance: tokensByOrg[o.id] || 0,
  }));

  const total = count || 0;
  return {
    data: detailedOrgs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
