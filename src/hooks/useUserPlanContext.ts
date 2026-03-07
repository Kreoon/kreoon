/**
 * Hook para determinar el contexto de plan del usuario.
 *
 * Cuando un usuario pertenece a una organización pero tiene plan básico gratis,
 * debe ver:
 * - Su plan personal (no el de la org)
 * - Sus coins personales (no los de la org)
 * - Menú reducido de freelancer (no todos los módulos de la org)
 */

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { getPermissionGroup } from '@/lib/permissionGroups';

export type UserPlanTier = 'free' | 'basic' | 'pro' | 'business' | 'enterprise';

interface UserPlanContext {
  /** Si el usuario tiene plan personal (no heredado de org) */
  hasPersonalPlan: boolean;
  /** Tier del plan personal del usuario */
  personalTier: UserPlanTier;
  /** Si el usuario debe ver menú reducido (plan free/basic sin acceso a módulos de org) */
  shouldUseReducedMenu: boolean;
  /** Si el usuario debe ver sus coins personales en vez de los de la org */
  usePersonalCoins: boolean;
  /** Loading state */
  isLoading: boolean;
}

/**
 * Roles que dan acceso completo a los módulos de la organización
 * independientemente del plan personal del usuario.
 */
const FULL_ORG_ACCESS_ROLES = ['admin', 'team_leader', 'strategist'];

export function useUserPlanContext(): UserPlanContext {
  const { user, profile, activeRole } = useAuth();
  const organizationId = profile?.current_organization_id;
  const permissionGroup = activeRole ? getPermissionGroup(activeRole) : null;

  // Query para obtener la suscripción personal del usuario
  const { data: personalSubscription, isLoading } = useQuery({
    queryKey: ['user-personal-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Buscar suscripción personal (sin organization_id)
      const { data, error } = await supabase
        .from('platform_subscriptions')
        .select('tier, status')
        .eq('user_id', user.id)
        .is('organization_id', null)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('[useUserPlanContext] Error fetching subscription:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Determinar el tier del plan personal
  let personalTier: UserPlanTier = 'free';
  if (personalSubscription?.tier) {
    const tier = personalSubscription.tier as string;
    if (tier.includes('enterprise')) personalTier = 'enterprise';
    else if (tier.includes('business')) personalTier = 'business';
    else if (tier.includes('pro')) personalTier = 'pro';
    else if (tier.includes('starter') || tier.includes('basic')) personalTier = 'basic';
    else personalTier = 'free';
  }

  // Determinar si tiene plan personal activo
  const hasPersonalPlan = !!personalSubscription;

  // ¿Debe usar menú reducido?
  // Sí, si:
  // 1. Pertenece a una org
  // 2. No tiene rol de acceso completo (admin, team_leader, strategist)
  // 3. Tiene plan free o básico personal
  const hasFullOrgAccessRole = permissionGroup && FULL_ORG_ACCESS_ROLES.includes(permissionGroup);
  const hasLimitedPlan = personalTier === 'free' || personalTier === 'basic';

  const shouldUseReducedMenu = !!(
    organizationId &&
    !hasFullOrgAccessRole &&
    (hasLimitedPlan || !hasPersonalPlan)
  );

  // ¿Debe ver coins personales?
  // Sí, si está en una org pero no tiene rol de acceso completo Y tiene plan limitado
  // (misma lógica que shouldUseReducedMenu)
  const usePersonalCoins = shouldUseReducedMenu;

  return {
    hasPersonalPlan,
    personalTier,
    shouldUseReducedMenu,
    usePersonalCoins,
    isLoading,
  };
}
