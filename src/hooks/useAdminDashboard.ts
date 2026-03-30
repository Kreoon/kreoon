import { useQuery } from '@tanstack/react-query';
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
import * as adminService from '@/services/admin/adminDashboardService';

// =====================================================
// QUERY KEYS
// =====================================================

export const ADMIN_QUERY_KEYS = {
  dashboardStats: (period: DashboardPeriod) => ['admin-dashboard-stats', period],
  aiStats: (period: DashboardPeriod) => ['admin-ai-stats', period],
  activityTimeline: (days: number, granularity: string) => ['admin-activity-timeline', days, granularity],
  userDistribution: ['admin-user-distribution'],
  detailedUsers: (filters: AdminUserFilters) => ['admin-detailed-users', filters],
  detailedOrganizations: (filters: AdminOrgFilters) => ['admin-detailed-organizations', filters],
} as const;

// =====================================================
// STALE TIMES
// =====================================================

const ADMIN_STALE_TIMES = {
  dashboardStats: 2 * 60 * 1000,    // 2 min - datos criticos
  aiStats: 2 * 60 * 1000,           // 2 min - monitoreo de costos
  activityTimeline: 10 * 60 * 1000, // 10 min - datos historicos
  userDistribution: 10 * 60 * 1000, // 10 min - distribuciones
  detailedUsers: 3 * 60 * 1000,     // 3 min - listados detallados
  detailedOrganizations: 3 * 60 * 1000,
} as const;

// =====================================================
// HOOKS
// =====================================================

/**
 * Hook para obtener estadisticas principales del dashboard admin
 */
export function useAdminDashboardStats(period: DashboardPeriod = '30d') {
  return useQuery<AdminDashboardStats>({
    queryKey: ADMIN_QUERY_KEYS.dashboardStats(period),
    queryFn: () => adminService.getAdminDashboardStats(period),
    staleTime: ADMIN_STALE_TIMES.dashboardStats,
    refetchInterval: ADMIN_STALE_TIMES.dashboardStats,
  });
}

/**
 * Hook para obtener estadisticas de uso de IA
 */
export function useAdminAIStats(period: DashboardPeriod = '30d') {
  return useQuery<AdminAIStats>({
    queryKey: ADMIN_QUERY_KEYS.aiStats(period),
    queryFn: () => adminService.getAdminAIStats(period),
    staleTime: ADMIN_STALE_TIMES.aiStats,
    refetchInterval: ADMIN_STALE_TIMES.aiStats,
  });
}

/**
 * Hook para obtener timeline de actividad
 */
export function useAdminActivityTimeline(
  days: number = 30,
  granularity: 'hour' | 'day' | 'week' = 'day'
) {
  return useQuery<AdminActivityTimeline>({
    queryKey: ADMIN_QUERY_KEYS.activityTimeline(days, granularity),
    queryFn: () => adminService.getAdminActivityTimeline(days, granularity),
    staleTime: ADMIN_STALE_TIMES.activityTimeline,
  });
}

/**
 * Hook para obtener distribucion de usuarios
 */
export function useAdminUserDistribution() {
  return useQuery<AdminUserDistribution>({
    queryKey: ADMIN_QUERY_KEYS.userDistribution,
    queryFn: () => adminService.getAdminUserDistribution(),
    staleTime: ADMIN_STALE_TIMES.userDistribution,
  });
}

/**
 * Hook para obtener usuarios detallados con filtros y paginacion
 */
export function useAdminDetailedUsers(filters: AdminUserFilters = {}) {
  return useQuery<PaginatedResult<AdminDetailedUser>>({
    queryKey: ADMIN_QUERY_KEYS.detailedUsers(filters),
    queryFn: () => adminService.getDetailedUsers(filters),
    staleTime: ADMIN_STALE_TIMES.detailedUsers,
  });
}

/**
 * Hook para obtener organizaciones detalladas con filtros y paginacion
 */
export function useAdminDetailedOrganizations(filters: AdminOrgFilters = {}) {
  return useQuery<PaginatedResult<AdminDetailedOrganization>>({
    queryKey: ADMIN_QUERY_KEYS.detailedOrganizations(filters),
    queryFn: () => adminService.getDetailedOrganizations(filters),
    staleTime: ADMIN_STALE_TIMES.detailedOrganizations,
  });
}

/**
 * Hook combinado para obtener todos los datos del dashboard admin
 */
export function useAdminDashboardData(period: DashboardPeriod = '30d') {
  const stats = useAdminDashboardStats(period);
  const aiStats = useAdminAIStats(period);
  const timeline = useAdminActivityTimeline(
    period === '1d' ? 1 : period === '7d' ? 7 : 30,
    period === '1d' ? 'hour' : 'day'
  );
  const distribution = useAdminUserDistribution();

  return {
    stats,
    aiStats,
    timeline,
    distribution,
    isLoading: stats.isLoading || aiStats.isLoading,
    isError: stats.isError || aiStats.isError,
    error: stats.error || aiStats.error,
    refetch: () => {
      stats.refetch();
      aiStats.refetch();
      timeline.refetch();
      distribution.refetch();
    },
  };
}

// =====================================================
// UTILITIES
// =====================================================

/**
 * Formatea numero grande con sufijo (K, M, B)
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Formatea moneda USD
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Calcula porcentaje de cambio
 */
export function calculateTrend(current: number, previous: number): { value: number; isPositive: boolean } {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, isPositive: current > 0 };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    value: Math.abs(Math.round(change)),
    isPositive: change >= 0,
  };
}

/**
 * Obtiene label del periodo
 */
export function getPeriodLabel(period: DashboardPeriod): string {
  switch (period) {
    case '1d': return 'Hoy';
    case '7d': return 'Ultimos 7 dias';
    case '30d': return 'Ultimos 30 dias';
    case 'ytd': return 'Este ano';
    default: return period;
  }
}
