import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getPermissionGroup } from '@/lib/permissionGroups';
import { useOrganizationTrial } from '@/hooks/useOrganizationTrial';
import { useSubscription } from '@/hooks/useSubscription';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Check, Crown, Zap, Building2, Users, Video, Sparkles, Clock,
  AlertTriangle, CheckCircle2, CreditCard, ExternalLink, Briefcase, UserCircle,
  Shield, Compass, Film, Camera, Gift,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBillingAnalytics } from '@/analytics';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PLANS as PLAN_DEFS, type PlanDef } from '@/lib/finance/constants';
import { useAITokens } from '@/hooks/useAITokens';
import type { SubscriptionTier, BillingCycle } from '@/types/unified-finance.types';

interface CommunityMembership {
  id: string;
  community_id: string;
  free_months_granted: number;
  commission_discount_applied: number;
  bonus_tokens_granted: number;
  status: string;
  community: {
    name: string;
    custom_badge_text: string | null;
    custom_badge_color: string | null;
  };
}

type Segment = PlanDef['segment'];

// Map plan IDs to subscription tier IDs
const PLAN_TO_TIER: Record<string, SubscriptionTier> = {
  'marcas-starter': 'brand_starter',
  'marcas-pro': 'brand_pro',
  'marcas-business': 'brand_business',
  'creadores-pro': 'creator_pro',
  'agencias-starter': 'org_starter',
  'agencias-pro': 'org_pro',
};

const SEGMENT_CONFIG: Record<Segment, { label: string; icon: React.ReactNode }> = {
  marcas: { label: 'Marcas', icon: <Building2 className="h-4 w-4" /> },
  creadores: { label: 'Creadores', icon: <UserCircle className="h-4 w-4" /> },
  agencias: { label: 'Agencias', icon: <Briefcase className="h-4 w-4" /> },
};

function getPlanFeatures(plan: PlanDef): string[] {
  const features: string[] = [];

  // Common features based on limits
  if (plan.users !== undefined) {
    features.push(`Hasta ${plan.users ?? 'ilimitados'} usuarios`);
  }
  if (plan.contentPerMonth !== undefined && plan.contentPerMonth !== null) {
    features.push(`${plan.contentPerMonth} proyectos/mes`);
  } else if (plan.contentPerMonth === null && plan.priceMonthly > 0) {
    features.push('Proyectos ilimitados');
  }
  if (plan.storage && plan.storage !== '—') {
    features.push(`${plan.storage} almacenamiento`);
  }
  features.push(`${plan.aiTokens >= 1000 ? `${(plan.aiTokens / 1000).toFixed(0)}k` : plan.aiTokens} Kreoon Coins/mes`);

  // Agency-specific: role-based limits
  if (plan.adminUsers !== undefined) {
    features.push(`${plan.adminUsers ?? 'Ilimitados'} admins`);
    features.push(`${plan.strategists ?? 'Ilimitados'} estrategas`);
    features.push(`${plan.editors ?? 'Ilimitados'} post-produccion`);
    features.push(`${plan.creators ?? 'Ilimitados'} creadores activos`);
  }
  if (plan.clients !== undefined) {
    features.push(`Hasta ${plan.clients ?? 'ilimitados'} clientes`);
  }

  // Segment + tier specific features
  switch (plan.id) {
    // Marcas
    case 'marcas-free':
      features.push('Exploracion de la plataforma');
      break;
    case 'marcas-starter':
      features.push('Soporte por email');
      features.push('Board Kanban basico');
      break;
    case 'marcas-pro':
      features.push('Soporte prioritario');
      features.push('Board Kanban avanzado');
      features.push('Integraciones basicas');
      features.push('Reportes de rendimiento');
      break;
    case 'marcas-business':
      features.push('Soporte 24/7');
      features.push('Todas las integraciones');
      features.push('API access');
      features.push('Reportes avanzados');
      features.push('White-label');
      features.push('Manager dedicado');
      break;
    // Creadores
    case 'creadores-basico':
      features.push('Portafolio publico');
      features.push('Postulacion a campanas');
      break;
    case 'creadores-pro':
      features.push('Badge verificado');
      features.push('Prioridad en campanas');
      features.push('Estadisticas avanzadas');
      features.push('Soporte prioritario');
      break;
    // Agencias
    case 'agencias-starter':
      features.push('Gestion multi-cliente');
      features.push('Board Kanban avanzado');
      features.push('Reportes por cliente');
      break;
    case 'agencias-pro':
      features.push('Gestion multi-cliente');
      features.push('Todas las integraciones');
      features.push('White-label');
      features.push('API access');
      features.push('Manager dedicado');
      break;
    case 'agencias-enterprise':
      features.push('Todo de Agency Pro');
      features.push('SLA personalizado');
      features.push('Onboarding dedicado');
      features.push('Infraestructura dedicada');
      break;
  }

  return features;
}

function getPopularPlanId(segment: Segment): string {
  switch (segment) {
    case 'marcas': return 'marcas-pro';
    case 'creadores': return 'creadores-pro';
    case 'agencias': return 'agencias-pro';
  }
}

function getPlanIcon(planId: string) {
  if (planId.includes('business') || planId.includes('enterprise')) {
    return <Crown className="h-5 w-5 text-amber-500" />;
  }
  if (planId.includes('pro')) {
    return <Zap className="h-5 w-5 text-primary" />;
  }
  return null;
}

interface OrganizationPlansPageProps {
  fixedSegment?: Segment;
}

export function OrganizationPlansPage({ fixedSegment }: OrganizationPlansPageProps = {}) {
  const { user, profile, activeRole } = useAuth();
  const { trackPlanSelected, trackPlanViewed } = useBillingAnalytics();
  const organizationId = profile?.current_organization_id;

  // Talent users (freelancers) have their OWN subscription (not the org's)
  const accountType = user?.user_metadata?.account_type;
  const isTalentUser = accountType === 'talent';

  // Client users also have their OWN subscription (not the org's)
  const permissionGroup = activeRole ? getPermissionGroup(activeRole) : null;
  // Brand members detection: active_brand_id or active_role='client' (for independent brands without org roles)
  const isBrandMember = !!(profile as any)?.active_brand_id ||
    (profile as any)?.active_role === 'client';
  const isClientUser = permissionGroup === 'client' || isBrandMember;

  // Personal subscription scope: talents and clients use user_id, others use org_id
  const hasPersonalSubscription = isTalentUser || isClientUser;
  // null = user-level tokens/subscription, string = org-level
  const subscriptionScopeId = hasPersonalSubscription ? null : organizationId;

  // Only fetch org trial status for non-personal subscriptions
  const trialStatus = useOrganizationTrial(hasPersonalSubscription ? null : organizationId);
  const { totalAvailable: kreoonCoins, loading: tokensLoading } = useAITokens(subscriptionScopeId);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const {
    subscription,
    isActive,
    isFree,
    isPastDue,
    isCancellingSubscription: subIsCancelling,
    currentTier,
    periodEnd,
    createCheckout,
    isCheckingOut,
    openBillingPortal,
    isOpeningPortal,
    cancelSubscription,
    isLoading: subLoading,
    activateCommunityStarter,
    isActivatingCommunity,
    refetch: refetchSubscription,
  } = useSubscription(subscriptionScopeId);

  // Auto-detect segment based on current subscription tier
  const getSegmentFromTier = (tier: string): Segment => {
    if (tier.startsWith('org_')) return 'agencias';
    if (tier.startsWith('creator_')) return 'creadores';
    return 'marcas';
  };

  const [segment, setSegment] = useState<Segment>(() => {
    if (fixedSegment) return fixedSegment;
    // Will be updated by useEffect when subscription loads
    return 'marcas';
  });

  // Update segment when subscription loads (auto-navigate to correct segment)
  useEffect(() => {
    if (!fixedSegment && currentTier && currentTier !== 'brand_free' && currentTier !== 'creator_free') {
      const detectedSegment = getSegmentFromTier(currentTier);
      setSegment(detectedSegment);
    }
  }, [currentTier, fixedSegment]);

  // Fetch current organization data (skip for personal subscription users — talents & clients)
  const { data: organization, isLoading } = useQuery({
    queryKey: ['organization-plan', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, selected_plan, subscription_status, trial_end_date, trial_active')
        .eq('id', organizationId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId && !hasPersonalSubscription,
  });

  // Fetch partner community membership for the user (benefits like free months)
  const { data: communityMembership, isFetched: communityFetched } = useQuery({
    queryKey: ['partner-community-membership', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // First get the membership
      const { data: membership, error: membershipError } = await supabase
        .from('partner_community_memberships')
        .select('id, community_id, free_months_granted, commission_discount_applied, bonus_tokens_granted, status')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gt('free_months_granted', 0)
        .order('free_months_granted', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (membershipError) {
        console.error('Error fetching community membership:', membershipError);
        return null;
      }
      if (!membership) return null;

      // Then get the community info
      const { data: community, error: communityError } = await supabase
        .from('partner_communities')
        .select('name, custom_badge_text, custom_badge_color')
        .eq('id', membership.community_id)
        .single();

      if (communityError) {
        console.error('Error fetching community:', communityError);
        // Return membership without community details
        return {
          ...membership,
          community: { name: 'Partner', custom_badge_text: null, custom_badge_color: null },
        } as CommunityMembership;
      }

      return {
        ...membership,
        community,
      } as CommunityMembership;
    },
    enabled: !!user?.id,
    staleTime: 0, // Always refetch to avoid stale cache issues
  });

  // Check if user has pending community benefits (free months not yet used)
  const hasCommunityBenefits = communityMembership && communityMembership.free_months_granted > 0;
  const communityFreeMonths = communityMembership?.free_months_granted || 0;
  const communityName = communityMembership?.community?.name || 'Partner';

  // Auto-activate Community Starter for community members
  const activationAttemptedRef = useRef(false);

  useEffect(() => {
    // Only auto-activate if:
    // 1. Community query has actually fetched (not just cached data)
    // 2. User has community benefits with free months
    // 3. User does NOT have an active subscription
    // 4. We haven't attempted activation yet in this session
    // 5. Not loading
    if (
      communityFetched &&
      hasCommunityBenefits &&
      !isActive &&
      !subLoading &&
      !activationAttemptedRef.current &&
      !isActivatingCommunity
    ) {
      activationAttemptedRef.current = true;
      activateCommunityStarter()
        .then(() => {
          refetchSubscription();
        })
        .catch((err) => {
          // Silently ignore if no membership - user just doesn't have community benefits
          if (!err?.message?.includes('membresía de comunidad')) {
            console.error('Error auto-activating community starter:', err);
          }
        });
    }
  }, [communityFetched, hasCommunityBenefits, isActive, subLoading, isActivatingCommunity, activateCommunityStarter, refetchSubscription]);

  // Get plans for the selected segment
  const segmentPlans = PLAN_DEFS.filter(p => p.segment === segment);
  const popularPlanId = getPopularPlanId(segment);

  const handleSelectPlan = async (planId: string) => {
    const plan = PLAN_DEFS.find(p => p.id === planId);
    if (!plan) return;

    // Enterprise plan → WhatsApp
    if (planId === 'agencias-enterprise') {
      const msg = encodeURIComponent('Hola, estoy interesado en el Plan Agency Enterprise de Kreoon. Me gustaria recibir mas informacion.');
      window.open(`https://wa.me/573132947776?text=${msg}`, '_blank');
      return;
    }

    trackPlanViewed({
      plan_id: plan.id,
      plan_name: plan.name,
      is_current_plan: plan.id === currentTier,
    });

    trackPlanSelected({
      plan_id: plan.id,
      plan_name: plan.name,
      is_current_plan: false,
    });

    try {
      const tier = PLAN_TO_TIER[plan.id] || plan.id as SubscriptionTier;
      await createCheckout(tier, billingCycle);
    } catch (err: any) {
      toast.error(err?.message || 'Error al crear checkout');
    }
  };

  // Active subscription from platform_subscriptions takes priority over old trial system
  // For personal subscriptions (talents/clients), don't show org trial status
  const isTrialActive = !hasPersonalSubscription && !isActive && !isPastDue && trialStatus.isTrialActive && !trialStatus.isExpired;

  // Check if personal subscription is in "trialing" status (e.g., referral reward)
  const isPersonalTrial = hasPersonalSubscription && subscription?.status === 'trialing';

  if (isLoading || subLoading || isActivatingCommunity) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        {isActivatingCommunity && (
          <p className="ml-3 text-sm text-muted-foreground">Activando tu plan de comunidad...</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {hasPersonalSubscription ? <UserCircle className="h-5 w-5" /> : <Building2 className="h-5 w-5" />}
                Estado de tu Suscripcion
              </CardTitle>
              <CardDescription>
                {hasPersonalSubscription
                  ? (profile?.full_name || 'Tu cuenta personal')
                  : (organization?.name || 'Tu organizacion')}
              </CardDescription>
            </div>
            <Badge
              variant={
                isPersonalTrial ? 'default' :
                isTrialActive ? 'secondary' :
                isPastDue ? 'destructive' :
                isActive ? 'default' :
                hasCommunityBenefits ? 'default' :
                (!hasPersonalSubscription && trialStatus.isExpired) ? 'destructive' :
                'secondary'
              }
              className={cn(
                "text-sm",
                hasCommunityBenefits && !isActive && "bg-amber-500/20 text-amber-600 border-amber-500/30"
              )}
            >
              {isPersonalTrial ? 'Plan Activo' :
               isTrialActive ? 'Periodo de prueba' :
               isPastDue ? 'Pago pendiente' :
               isActive ? 'Activo' :
               hasCommunityBenefits ? `Miembro ${communityName}` :
               (!hasPersonalSubscription && trialStatus.isExpired) ? 'Expirado' :
               isFree ? 'Plan gratuito' : 'Inactivo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Personal subscription status (talents with referral rewards, etc.) */}
          {isPersonalTrial && subscription && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Plan activo: {
                  PLAN_DEFS.find(p => PLAN_TO_TIER[p.id] === currentTier)?.name ||
                  (currentTier === 'creator_pro' ? 'Creator Pro' : currentTier)
                }</span>
              </div>
              {subscription.billing_cycle === 'referral_reward' && (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2 text-amber-500 mb-1">
                    <Sparkles className="h-4 w-4" />
                    <span className="text-sm font-medium">Reward por referidos</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Conseguiste tus 3 llaves y activaste {(subscription.metadata as any)?.reward_months || 3} meses gratis de Creator Pro
                  </p>
                </div>
              )}
              {periodEnd && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Dias restantes</span>
                    <span className="font-medium">
                      {Math.max(0, Math.ceil((periodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} dias
                    </span>
                  </div>
                  <Progress
                    value={Math.max(0, Math.min(100, ((periodEnd.getTime() - Date.now()) / (90 * 24 * 60 * 60 * 1000)) * 100))}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tu plan se renueva el {format(periodEnd, "d 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </>
              )}
            </div>
          )}

          {/* Organization trial status */}
          {isTrialActive && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Dias restantes</span>
                <span className="font-medium">{trialStatus.daysRemaining} dias</span>
              </div>
              <Progress value={(trialStatus.daysRemaining / 30) * 100} className="h-2" />
              {trialStatus.trialEndDate && (
                <p className="text-xs text-muted-foreground">
                  Tu periodo de prueba termina el {format(trialStatus.trialEndDate, "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              )}
            </>
          )}

          {isPastDue && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Tu ultimo pago fallo. Actualiza tu metodo de pago para evitar la suspension del servicio.
              </AlertDescription>
            </Alert>
          )}

          {!hasPersonalSubscription && trialStatus.isExpired && !isActive && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Tu periodo de prueba ha expirado. Selecciona un plan para continuar usando todas las funcionalidades.
              </AlertDescription>
            </Alert>
          )}

          {isActive && !isTrialActive && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span>Plan activo: {
                  PLAN_DEFS.find(p => PLAN_TO_TIER[p.id] === currentTier)?.name || currentTier
                }</span>
              </div>
              {periodEnd && (
                <p className="text-xs text-muted-foreground">
                  Proximo cobro: {format(periodEnd, "d 'de' MMMM, yyyy", { locale: es })}
                  {subIsCancelling && ' (se cancela al final del periodo)'}
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openBillingPortal()} disabled={isOpeningPortal}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isOpeningPortal ? 'Abriendo...' : 'Gestionar facturacion'}
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Kreoon Coins Balance */}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Kreoon Coins</span>
            </div>
            <div className="text-right">
              {tokensLoading ? (
                <span className="text-sm text-muted-foreground">Cargando...</span>
              ) : (
                <span className="text-lg font-bold text-amber-500">
                  {kreoonCoins.toLocaleString()}
                </span>
              )}
              <p className="text-[10px] text-muted-foreground">disponibles</p>
            </div>
          </div>
          {/* Community tokens bonus info */}
          {communityMembership && communityMembership.bonus_tokens_granted > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-2">
              <Gift className="h-3 w-3" />
              Incluye {communityMembership.bonus_tokens_granted.toLocaleString()} tokens de bienvenida de {communityName}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Partner Community Benefits Banner */}
      {hasCommunityBenefits && (
        <Card className="border-amber-500/50 bg-gradient-to-r from-amber-500/10 to-orange-500/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-amber-500/20">
                {isActive ? (
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                ) : (
                  <Gift className="h-6 w-6 text-amber-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-amber-600 dark:text-amber-400">
                    {isActive ? 'Plan Starter Activo' : `Beneficios de ${communityName}`}
                  </h4>
                  {communityMembership?.community?.custom_badge_text && (
                    <Badge
                      style={{
                        backgroundColor: communityMembership.community.custom_badge_color || '#f59e0b',
                        color: 'white',
                      }}
                      className="text-xs"
                    >
                      {communityMembership.community.custom_badge_text}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {isActive ? (
                    <>
                      Tu plan <span className="font-bold text-green-600 dark:text-green-400">Starter</span> está activo con <span className="font-bold text-amber-600 dark:text-amber-400">{communityFreeMonths} {communityFreeMonths === 1 ? 'mes' : 'meses'} gratis</span> por ser parte de {communityName}.
                    </>
                  ) : (
                    <>
                      Tienes <span className="font-bold text-amber-600 dark:text-amber-400">{communityFreeMonths} {communityFreeMonths === 1 ? 'mes' : 'meses'} gratis</span> del plan Starter por ser parte de la comunidad {communityName}.
                    </>
                  )}
                  {communityMembership?.commission_discount_applied && communityMembership.commission_discount_applied > 0 && (
                    <> Además, disfrutas de un <span className="font-bold text-amber-600 dark:text-amber-400">descuento de {communityMembership.commission_discount_applied}%</span> en comisiones del marketplace.</>
                  )}
                </p>
                {isActive && periodEnd && (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 bg-green-500/10 p-2 rounded-lg">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Tu periodo gratuito termina el {format(periodEnd, "d 'de' MMMM, yyyy", { locale: es })}</span>
                  </div>
                )}
                {!isActive && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-500/10 p-2 rounded-lg">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span>Tu plan se está activando automáticamente...</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segment Tabs — hidden when segment is fixed by role */}
      {!fixedSegment && (
        <Tabs value={segment} onValueChange={(v) => setSegment(v as Segment)}>
          <TabsList className="grid w-full grid-cols-3">
            {(Object.entries(SEGMENT_CONFIG) as [Segment, typeof SEGMENT_CONFIG[Segment]][]).map(([key, cfg]) => (
              <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                {cfg.icon}
                {cfg.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant={billingCycle === 'monthly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBillingCycle('monthly')}
        >
          Mensual
        </Button>
        <Button
          variant={billingCycle === 'annual' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBillingCycle('annual')}
        >
          Anual
          <Badge variant="secondary" className="ml-2 text-xs">-17%</Badge>
        </Button>
      </div>

      {/* Plans Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Planes para {SEGMENT_CONFIG[segment].label}
        </h2>
        <div className={cn(
          "grid gap-6",
          segmentPlans.length <= 2 && "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto",
          segmentPlans.length === 3 && "grid-cols-1 md:grid-cols-3",
          segmentPlans.length >= 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
        )}>
          {segmentPlans.map((plan) => {
            const tier = PLAN_TO_TIER[plan.id] || plan.id;
            const isCurrentPlan = currentTier === tier;
            const isFreeplan = plan.priceMonthly === 0 && plan.id !== 'agencias-enterprise';
            const isEnterprise = plan.id === 'agencias-enterprise';
            const price = billingCycle === 'annual' && plan.priceAnnual
              ? Math.round(plan.priceAnnual / 12)
              : plan.priceMonthly;
            const isPopular = plan.id === popularPlanId;
            const features = getPlanFeatures(plan);

            return (
              <Card
                key={plan.id}
                className={cn(
                  "relative transition-all duration-200 flex flex-col",
                  isPopular && "border-primary shadow-lg",
                  (plan.highlighted && !isPopular) && "border-primary/50",
                  isCurrentPlan && isActive && "bg-primary/5"
                )}
              >
                {(isPopular || plan.badge) && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={cn(
                      isPopular ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    )}>
                      {isPopular ? 'Mas popular' : plan.badge}
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <CardTitle className="flex items-center justify-center gap-2">
                    {getPlanIcon(plan.id)}
                    {plan.name}
                  </CardTitle>
                  <div className="mt-4">
                    {isEnterprise ? (
                      <>
                        <span className="text-3xl font-bold">Personalizado</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Contacta a ventas para una cotizacion
                        </p>
                      </>
                    ) : isFreeplan ? (
                      <>
                        <span className="text-4xl font-bold">Gratis</span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Sin tarjeta de credito
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">${price}</span>
                        <span className="text-muted-foreground">/mes</span>
                        {billingCycle === 'annual' && plan.priceAnnual > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            ${plan.priceAnnual}/ano facturado anualmente
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 flex-1">
                  <Separator />

                  {/* Limits */}
                  {plan.adminUsers !== undefined ? (
                    /* Agency plans: role-based grid */
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Shield className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                          <span className="font-medium">{plan.adminUsers ?? '∞'}</span>
                          <p className="text-muted-foreground">admins</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Compass className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                          <span className="font-medium">{plan.strategists ?? '∞'}</span>
                          <p className="text-muted-foreground">estrategas</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Film className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                          <span className="font-medium">{plan.editors ?? '∞'}</span>
                          <p className="text-muted-foreground">editores</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Camera className="h-4 w-4 mx-auto mb-1 text-green-500" />
                          <span className="font-medium">{plan.creators ?? '∞'}</span>
                          <p className="text-muted-foreground">creadores</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Briefcase className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <span className="font-medium">{plan.clients ?? '∞'}</span>
                          <p className="text-muted-foreground">clientes</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Sparkles className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <span className="font-medium">{plan.aiTokens >= 1000 ? `${(plan.aiTokens / 1000).toFixed(0)}k` : plan.aiTokens}</span>
                          <p className="text-muted-foreground">coins</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Video className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <span className="font-medium">∞</span>
                          <p className="text-muted-foreground">proyectos</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Non-agency plans: standard grid */
                    <div className={cn(
                      "grid gap-2 text-center text-xs",
                      "grid-cols-3"
                    )}>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <span className="font-medium">
                          {plan.users ?? '∞'}
                        </span>
                        <p className="text-muted-foreground">usuarios</p>
                      </div>
                      {plan.contentPerMonth !== undefined && (
                        <div className="p-2 rounded-lg bg-muted/50">
                          <Video className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                          <span className="font-medium">
                            {plan.contentPerMonth ?? '∞'}
                          </span>
                          <p className="text-muted-foreground">proyectos</p>
                        </div>
                      )}
                      <div className="p-2 rounded-lg bg-muted/50">
                        <Sparkles className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                        <span className="font-medium">{plan.aiTokens >= 1000 ? `${(plan.aiTokens / 1000).toFixed(0)}k` : plan.aiTokens}</span>
                        <p className="text-muted-foreground">coins</p>
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* Features */}
                  <ul className="space-y-2">
                    {features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="flex-col gap-2">
                  {isFreeplan ? (
                    <Button className="w-full" variant="outline" disabled>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Plan incluido
                    </Button>
                  ) : isEnterprise ? (
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={() => handleSelectPlan(plan.id)}
                    >
                      Contactar ventas
                    </Button>
                  ) : (
                    <>
                      <Button
                        className="w-full"
                        variant={isCurrentPlan && isActive ? "outline" : isPopular ? "default" : "secondary"}
                        disabled={(isCurrentPlan && isActive) || isCheckingOut}
                        onClick={() => handleSelectPlan(plan.id)}
                      >
                        {isCurrentPlan && isActive ? (
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Plan activo
                          </span>
                        ) : isCheckingOut ? (
                          <>
                            <Clock className="h-4 w-4 mr-2 animate-spin" />
                            Procesando...
                          </>
                        ) : (
                          'Seleccionar plan'
                        )}
                      </Button>
                      {isCurrentPlan && isActive && hasCommunityBenefits && (
                        <p className="text-xs text-center text-green-600 dark:text-green-400">
                          {communityFreeMonths} {communityFreeMonths === 1 ? 'mes' : 'meses'} gratis de comunidad
                        </p>
                      )}
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Pago seguro con Stripe</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Todos los pagos son procesados de forma segura a traves de Stripe.
                Aceptamos tarjetas de credito/debito Visa, Mastercard y American Express.
                Puedes cancelar en cualquier momento desde el portal de facturacion.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
