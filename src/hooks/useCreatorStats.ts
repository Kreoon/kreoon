/**
 * useCreatorStats - Hook para obtener estadísticas unificadas del creador
 *
 * Combina datos de:
 * - creator_profiles (rating, proyectos, tiempos)
 * - portfolio_items (vistas, likes)
 * - social_metrics (seguidores por red social)
 * - creator_reviews (distribución ratings)
 * - marketplace_projects (ganancias, clientes)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface CreatorUnifiedStats {
  // Proyectos
  completedProjects: number;
  marketplaceProjects: number;
  orgProjects: number;
  activeProjects: number;
  cancelledProjects: number;
  cancellationRate: number;

  // Ratings
  ratingAvg: number;
  ratingCount: number;
  ratingDistribution: Record<number, number>; // {5: 10, 4: 5, 3: 2, 2: 0, 1: 1}

  // Tiempos y calidad
  responseTimeHours: number;
  onTimeDeliveryPct: number;
  avgDeliveryDays: number;

  // Clientes
  uniqueClients: number;
  repeatClients: number;
  repeatClientsPct: number;

  // Financiero (solo visible para el propio creador)
  totalEarned: number;

  // Antigüedad
  memberSince: string;
  daysOnPlatform: number;

  // Verificaciones
  isVerified: boolean;
  emailVerified: boolean;
  paymentVerified: boolean;
  onboardingCompleted: boolean;

  // Portfolio engagement
  portfolioViews: number;
  portfolioLikes: number;
  portfolioSaves: number;
  portfolioItems: number;

  // Redes sociales (agregado de todas las conexiones)
  social: {
    totalFollowers: number;
    platforms: {
      platform: string;
      username: string;
      followers: number;
      engagement: number;
      lastSynced: string | null;
    }[];
  };

  // Comunicación
  invitationResponseRate: number;
  invitationsReceived: number;
}

export interface UseCreatorStatsOptions {
  creatorProfileId?: string;
  userId?: string;
  /** Si es true, incluye datos financieros (solo para el propio usuario) */
  includeFinancials?: boolean;
  enabled?: boolean;
}

// ─── Funciones de fetch ─────────────────────────────────────────────────────

async function fetchCreatorStats(
  creatorProfileId: string,
  includeFinancials: boolean
): Promise<CreatorUnifiedStats> {
  // 1. Obtener perfil básico del creador
  const { data: profile, error: profileError } = await supabase
    .from('creator_profiles')
    .select(`
      user_id,
      rating_avg,
      rating_count,
      completed_projects,
      response_time_hours,
      on_time_delivery_pct,
      repeat_clients_pct,
      level,
      is_verified,
      created_at
    `)
    .eq('id', creatorProfileId)
    .single();

  if (profileError) throw profileError;

  // 2. Obtener estadísticas de portfolio
  const { data: portfolioStats } = await supabase
    .from('portfolio_items')
    .select('views_count, likes_count, is_public')
    .eq('creator_profile_id', creatorProfileId)
    .eq('is_public', true);

  const portfolioAgg = {
    views: portfolioStats?.reduce((sum, p) => sum + (p.views_count || 0), 0) || 0,
    likes: portfolioStats?.reduce((sum, p) => sum + (p.likes_count || 0), 0) || 0,
    items: portfolioStats?.length || 0,
  };

  // 3. Obtener conexiones de redes sociales
  const { data: socialAccounts } = await supabase
    .from('social_accounts')
    .select(`
      id,
      platform,
      platform_username,
      is_active,
      last_synced_at
    `)
    .eq('user_id', profile.user_id)
    .eq('is_active', true);

  // 4. Obtener métricas más recientes de cada red social
  const socialPlatforms: CreatorUnifiedStats['social']['platforms'] = [];
  let totalFollowers = 0;

  if (socialAccounts && socialAccounts.length > 0) {
    for (const account of socialAccounts) {
      const { data: metrics } = await supabase
        .from('social_metrics')
        .select('followers_count, engagement, recorded_at')
        .eq('social_account_id', account.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single();

      const followers = metrics?.followers_count || 0;
      totalFollowers += followers;

      socialPlatforms.push({
        platform: account.platform,
        username: account.platform_username || '',
        followers,
        engagement: metrics?.engagement || 0,
        lastSynced: account.last_synced_at,
      });
    }
  }

  // 5. Obtener distribución de ratings
  const { data: reviews } = await supabase
    .from('creator_reviews')
    .select('rating')
    .eq('creator_id', creatorProfileId)
    .eq('status', 'approved');

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews?.forEach((r) => {
    const rating = Math.round(r.rating);
    if (rating >= 1 && rating <= 5) {
      ratingDistribution[rating]++;
    }
  });

  // 6. Obtener estadísticas de proyectos marketplace
  const { data: marketplaceStats } = await supabase
    .from('marketplace_projects')
    .select('status, creator_payout, client_id')
    .eq('creator_id', creatorProfileId);

  const projectStats = {
    active: marketplaceStats?.filter((p) => p.status === 'in_progress').length || 0,
    completed: marketplaceStats?.filter((p) => p.status === 'completed').length || 0,
    cancelled: marketplaceStats?.filter((p) => p.status === 'cancelled').length || 0,
    totalEarned: includeFinancials
      ? marketplaceStats
          ?.filter((p) => p.status === 'completed')
          .reduce((sum, p) => sum + (p.creator_payout || 0), 0) || 0
      : 0,
    uniqueClients: new Set(marketplaceStats?.map((p) => p.client_id).filter(Boolean)).size,
  };

  // 7. Obtener invitaciones
  const { data: invitations } = await supabase
    .from('marketplace_invitations')
    .select('status')
    .eq('creator_id', creatorProfileId);

  const invitationStats = {
    received: invitations?.length || 0,
    responseRate:
      invitations && invitations.length > 0
        ? (invitations.filter((i) => i.status !== 'pending').length / invitations.length) * 100
        : 0,
  };

  // 8. Calcular días en plataforma
  const memberSince = profile.created_at || new Date().toISOString();
  const daysOnPlatform = Math.floor(
    (Date.now() - new Date(memberSince).getTime()) / (1000 * 60 * 60 * 24)
  );

  return {
    // Proyectos
    completedProjects: profile.completed_projects || 0,
    marketplaceProjects: projectStats.completed,
    orgProjects: (profile.completed_projects || 0) - projectStats.completed,
    activeProjects: projectStats.active,
    cancelledProjects: projectStats.cancelled,
    cancellationRate:
      projectStats.completed + projectStats.cancelled > 0
        ? (projectStats.cancelled / (projectStats.completed + projectStats.cancelled)) * 100
        : 0,

    // Ratings
    ratingAvg: profile.rating_avg || 0,
    ratingCount: profile.rating_count || 0,
    ratingDistribution,

    // Tiempos
    responseTimeHours: profile.response_time_hours || 0,
    onTimeDeliveryPct: profile.on_time_delivery_pct || 0,
    avgDeliveryDays: 0, // TODO: calcular desde proyectos

    // Clientes
    uniqueClients: projectStats.uniqueClients,
    repeatClients: 0, // TODO: calcular clientes con >1 proyecto
    repeatClientsPct: profile.repeat_clients_pct || 0,

    // Financiero
    totalEarned: projectStats.totalEarned,

    // Antigüedad
    memberSince,
    daysOnPlatform,

    // Verificaciones
    isVerified: profile.is_verified || false,
    emailVerified: true, // Asumimos que si tiene perfil, verificó email
    paymentVerified: false, // TODO: verificar withdrawal_methods
    onboardingCompleted: true,

    // Portfolio
    portfolioViews: portfolioAgg.views,
    portfolioLikes: portfolioAgg.likes,
    portfolioSaves: 0, // TODO: si existe tabla de saves
    portfolioItems: portfolioAgg.items,

    // Redes sociales
    social: {
      totalFollowers,
      platforms: socialPlatforms,
    },

    // Comunicación
    invitationResponseRate: invitationStats.responseRate,
    invitationsReceived: invitationStats.received,
  };
}

// ─── Hook principal ─────────────────────────────────────────────────────────

export function useCreatorStats({
  creatorProfileId,
  userId,
  includeFinancials = false,
  enabled = true,
}: UseCreatorStatsOptions) {
  return useQuery({
    queryKey: ['creator-stats', creatorProfileId || userId, includeFinancials],
    queryFn: async () => {
      let profileId = creatorProfileId;

      // Si no tenemos creatorProfileId pero sí userId, buscamos el perfil
      if (!profileId && userId) {
        const { data } = await supabase
          .from('creator_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();
        profileId = data?.id;
      }

      if (!profileId) {
        throw new Error('No se encontró el perfil del creador');
      }

      return fetchCreatorStats(profileId, includeFinancials);
    },
    enabled: enabled && !!(creatorProfileId || userId),
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
  });
}

// ─── Tipos de métricas disponibles para el builder ───────────────────────────

export type StatMetricKey =
  | 'completedProjects'
  | 'activeProjects'
  | 'ratingAvg'
  | 'ratingCount'
  | 'responseTimeHours'
  | 'onTimeDeliveryPct'
  | 'repeatClientsPct'
  | 'uniqueClients'
  | 'portfolioViews'
  | 'portfolioLikes'
  | 'portfolioItems'
  | 'socialTotalFollowers'
  | 'daysOnPlatform'
  | 'invitationResponseRate';

export interface StatMetricDefinition {
  key: StatMetricKey;
  label: string;
  icon: 'users' | 'star' | 'briefcase' | 'eye' | 'heart' | 'trending' | 'clock' | 'check' | 'calendar';
  format: 'number' | 'decimal' | 'percentage' | 'compact' | 'hours';
  category: 'projects' | 'quality' | 'engagement' | 'social' | 'general';
}

export const STAT_METRICS: StatMetricDefinition[] = [
  // Proyectos
  { key: 'completedProjects', label: 'Proyectos', icon: 'briefcase', format: 'number', category: 'projects' },
  { key: 'activeProjects', label: 'En progreso', icon: 'trending', format: 'number', category: 'projects' },
  { key: 'uniqueClients', label: 'Clientes', icon: 'users', format: 'number', category: 'projects' },

  // Calidad
  { key: 'ratingAvg', label: 'Rating', icon: 'star', format: 'decimal', category: 'quality' },
  { key: 'ratingCount', label: 'Reseñas', icon: 'star', format: 'number', category: 'quality' },
  { key: 'onTimeDeliveryPct', label: 'A tiempo', icon: 'check', format: 'percentage', category: 'quality' },
  { key: 'responseTimeHours', label: 'Respuesta', icon: 'clock', format: 'hours', category: 'quality' },
  { key: 'repeatClientsPct', label: 'Recurrentes', icon: 'heart', format: 'percentage', category: 'quality' },

  // Engagement
  { key: 'portfolioViews', label: 'Vistas', icon: 'eye', format: 'compact', category: 'engagement' },
  { key: 'portfolioLikes', label: 'Likes', icon: 'heart', format: 'compact', category: 'engagement' },
  { key: 'portfolioItems', label: 'Trabajos', icon: 'briefcase', format: 'number', category: 'engagement' },

  // Social
  { key: 'socialTotalFollowers', label: 'Seguidores', icon: 'users', format: 'compact', category: 'social' },

  // General
  { key: 'daysOnPlatform', label: 'Días activo', icon: 'calendar', format: 'number', category: 'general' },
  { key: 'invitationResponseRate', label: 'Respuesta inv.', icon: 'check', format: 'percentage', category: 'general' },
];

// ─── Helper para formatear valores ──────────────────────────────────────────

export function formatStatValue(value: number, format: StatMetricDefinition['format']): string {
  if (value === null || value === undefined || isNaN(value)) return '—';

  switch (format) {
    case 'number':
      return value.toLocaleString('es-CO');
    case 'decimal':
      return value.toFixed(1);
    case 'percentage':
      return `${Math.round(value)}%`;
    case 'compact':
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
      return value.toString();
    case 'hours':
      if (value < 1) return '<1h';
      if (value < 24) return `${Math.round(value)}h`;
      return `${Math.round(value / 24)}d`;
    default:
      return String(value);
  }
}

// ─── Helper para obtener valor de una métrica ───────────────────────────────

export function getStatValue(stats: CreatorUnifiedStats, key: StatMetricKey): number {
  switch (key) {
    case 'socialTotalFollowers':
      return stats.social.totalFollowers;
    default:
      return (stats[key] as number) || 0;
  }
}
