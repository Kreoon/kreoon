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
import { useUserPlanContext } from '@/hooks/useUserPlanContext';
import { useGeoCountry } from '@/hooks/useGeoCountry';
import type { SubscriptionTier, BillingCycle } from '@/types/unified-finance.types';

const COP_RATE = 4_300;

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
  'marcas-growth': 'brand_growth',
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

interface FeatureItem {
  label: string;
  included: boolean;
  highlight?: boolean;
}

function getPlanTagline(planId: string): string {
  const taglines: Record<string, string> = {
    'creadores-basico':    'Para comenzar a mostrar tu trabajo',
    'creadores-pro':       'Para creadores que quieren crecer en serio',
    'creadores-premium':   'Para creadores en modo profesional full-time',
    'marcas-free':         'Explora la plataforma sin costo',
    'marcas-starter':      'Para marcas que están dando sus primeros pasos',
    'marcas-growth':       'Para marcas en crecimiento activo con UGC',
    'marcas-pro':          'Para equipos de marketing con alto volumen',
    'marcas-business':     'Para empresas con operaciones UGC a escala',
    'agencias-starter':    'Para agencias que gestionan múltiples clientes',
    'agencias-pro':        'Para agencias consolidadas con equipo completo',
    'agencias-enterprise': 'Para operaciones a gran escala con SLA personalizado',
  };
  return taglines[planId] ?? '';
}

function getPlanFeatureItems(plan: PlanDef): FeatureItem[] {
  if (plan.segment === 'creadores') {
    const isBasico  = plan.id === 'creadores-basico';
    const isPremium = plan.id === 'creadores-premium';
    return [
      { label: 'Portafolio público de creador',          included: true },
      { label: 'Postulación a campañas del Marketplace', included: true },
      {
        label: isBasico ? '50 posts en Social Hub/mes' : 'Posts en Social Hub ilimitados',
        included: true,
        highlight: !isBasico,
      },
      {
        label: isBasico ? 'ADN Recargados — guiones con IA' : `${plan.adnRecargadosPerMonth} ADN Recargados/mes`,
        included: !isBasico,
        highlight: !isBasico,
      },
      { label: isPremium ? 'Badge Premium en perfil 👑'    : 'Badge verificado en perfil ⚡', included: !isBasico, highlight: !isBasico },
      { label: 'Prioridad en búsquedas y campañas',      included: !isBasico },
      { label: 'Estadísticas avanzadas de perfil',       included: !isBasico },
      { label: isPremium ? 'Soporte VIP 24/7'             : 'Soporte prioritario',            included: !isBasico },
      {
        label: `${plan.aiTokens >= 1000 ? `${(plan.aiTokens / 1000).toFixed(0)}.000` : plan.aiTokens} tokens IA/mes`,
        included: true,
        highlight: !isBasico,
      },
    ];
  }
  return getPlanFeatures(plan).map(f => ({ label: f, included: true }));
}

function getPlanFeatures(plan: PlanDef): string[] {
  const features: string[] = [];

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
  features.push(`${plan.aiTokens >= 1000 ? `${(plan.aiTokens / 1000).toFixed(0)}k` : plan.aiTokens} Tokens IA/mes`);

  if (plan.adminUsers !== undefined) {
    features.push(`${plan.adminUsers ?? 'Ilimitados'} admins`);
    features.push(`${plan.strategists ?? 'Ilimitados'} estrategas`);
    features.push(`${plan.editors ?? 'Ilimitados'} post-producción`);
    features.push(`${plan.creators ?? 'Ilimitados'} creadores activos`);
  }
  if (plan.clients !== undefined) {
    features.push(`Hasta ${plan.clients ?? 'ilimitados'} clientes`);
  }

  switch (plan.id) {
    case 'marcas-free':
      features.push('1 contacto revelado de creador/mes');
      features.push('1 campaña activa');
      features.push('Sin canjes');
      break;
    case 'marcas-starter':
      features.push('5 contactos revelados/mes');
      features.push('5 canjes/mes');
      features.push('5 campañas activas');
      features.push('Soporte por email');
      break;
    case 'marcas-growth':
      features.push('10 contactos revelados/mes');
      features.push('10 canjes/mes');
      features.push('10 campañas activas');
      features.push('3 ADN Recargados/mes');
      features.push('Analytics básicos');
      break;
    case 'marcas-pro':
      features.push('20 contactos revelados/mes');
      features.push('20 canjes/mes');
      features.push('Campañas ilimitadas');
      features.push('5 ADN Recargados/mes');
      features.push('Soporte prioritario');
      features.push('Reportes de rendimiento');
      break;
    case 'marcas-business':
      features.push('Contactos revelados ilimitados');
      features.push('Canjes ilimitados');
      features.push('Campañas ilimitadas');
      features.push('ADN Recargados ilimitados');
      features.push('Soporte 24/7');
      features.push('API access');
      features.push('Manager dedicado');
      break;
    case 'agencias-starter':
      features.push('Gestión multi-cliente');
      features.push('Board Kanban avanzado');
      features.push('Reportes por cliente');
      features.push('ADN Recargados ilimitados');
      features.push('Social Hub ilimitado');
      break;
    case 'agencias-pro':
      features.push('Todo de Agency Starter');
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
    case 'marcas': return 'marcas-growth';
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
  const { shouldUseReducedMenu, usePersonalCoins } = useUserPlanContext();

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
  // Also include org members with basic/free personal plan (shouldUseReducedMenu)
  const hasPersonalSubscription = isTalentUser || isClientUser || shouldUseReducedMenu;
  // null = user-level tokens/subscription, string = org-level
  const subscriptionScopeId = hasPersonalSubscription ? null : organizationId;

  // Only fetch org trial status for non-personal subscriptions
  const trialStatus = useOrganizationTrial(hasPersonalSubscription ? null : organizationId);
  const { totalAvailable: kreoonCoins, loading: tokensLoading } = useAITokens(subscriptionScopeId);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const { isColombia } = useGeoCountry();

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

          {/* Tokens IA Balance */}
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium">Tokens IA</span>
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
          <Badge variant="secondary" className="ml-2 text-xs">-30%</Badge>
        </Button>
      </div>

      {/* Plans Grid */}
      {(() => {
        // Tier visual config
        const TIER_STYLES: Record<string, {
          bar: string; cardBg: string; accentText: string;
          metricBg: string; metricText: string; btnClass: string; emoji: string;
        }> = {
          'marcas-free':     { bar: 'bg-zinc-500',   cardBg: 'bg-zinc-900',                    accentText: 'text-zinc-300',   metricBg: 'bg-zinc-800',     metricText: 'text-zinc-200',   btnClass: 'bg-zinc-700 hover:bg-zinc-600 text-white',   emoji: '🆓' },
          'marcas-starter':  { bar: 'bg-blue-500',   cardBg: 'bg-[#0c1929]',                   accentText: 'text-blue-300',   metricBg: 'bg-blue-950',     metricText: 'text-blue-200',   btnClass: 'bg-blue-600 hover:bg-blue-500 text-white',   emoji: '🚀' },
          'marcas-growth':   { bar: 'bg-purple-500', cardBg: 'bg-[#140f1f]',                   accentText: 'text-purple-200', metricBg: 'bg-purple-950',   metricText: 'text-purple-100', btnClass: 'bg-purple-600 hover:bg-purple-500 text-white',emoji: '⚡' },
          'marcas-pro':      { bar: 'bg-orange-500', cardBg: 'bg-[#1a0f00]',                   accentText: 'text-orange-300', metricBg: 'bg-orange-950',   metricText: 'text-orange-200', btnClass: 'bg-orange-600 hover:bg-orange-500 text-white',emoji: '🔥' },
          'marcas-business': { bar: 'bg-amber-400',  cardBg: 'bg-[#1a1200]',                   accentText: 'text-amber-300',  metricBg: 'bg-amber-950',    metricText: 'text-amber-200',  btnClass: 'bg-amber-500 hover:bg-amber-400 text-black',  emoji: '👑' },
          'creadores-basico':  { bar: 'bg-zinc-500',   cardBg: 'bg-zinc-900',   accentText: 'text-zinc-300',   metricBg: 'bg-zinc-800',   metricText: 'text-zinc-200',   btnClass: 'bg-zinc-700 hover:bg-zinc-600 text-white',    emoji: '🎬' },
          'creadores-pro':     { bar: 'bg-purple-500', cardBg: 'bg-[#140f1f]', accentText: 'text-purple-200', metricBg: 'bg-purple-950', metricText: 'text-purple-100', btnClass: 'bg-purple-600 hover:bg-purple-500 text-white', emoji: '⭐' },
          'creadores-premium': { bar: 'bg-amber-400',  cardBg: 'bg-[#1a1200]', accentText: 'text-amber-300',  metricBg: 'bg-amber-950',  metricText: 'text-amber-200',  btnClass: 'bg-amber-500 hover:bg-amber-400 text-black',   emoji: '👑' },
          'agencias-starter':{ bar: 'bg-blue-500',   cardBg: 'bg-[#0c1929]',                   accentText: 'text-blue-300',   metricBg: 'bg-blue-950',     metricText: 'text-blue-200',   btnClass: 'bg-blue-600 hover:bg-blue-500 text-white',   emoji: '🏢' },
          'agencias-pro':    { bar: 'bg-purple-500', cardBg: 'bg-[#140f1f]',                   accentText: 'text-purple-200', metricBg: 'bg-purple-950',   metricText: 'text-purple-100', btnClass: 'bg-purple-600 hover:bg-purple-500 text-white',emoji: '🏆' },
          'agencias-enterprise':{ bar:'bg-amber-400',cardBg: 'bg-[#1a1200]',                   accentText: 'text-amber-300',  metricBg: 'bg-amber-950',    metricText: 'text-amber-200',  btnClass: 'bg-amber-500 hover:bg-amber-400 text-black',  emoji: '👑' },
        };
        const DEFAULT_TIER_STYLE = { bar: 'bg-primary', cardBg: 'bg-zinc-900', accentText: 'text-primary', metricBg: 'bg-primary/10', metricText: 'text-primary', btnClass: 'bg-primary hover:bg-primary/90 text-white', emoji: '📦' };

        const isMarcas = segment === 'marcas';
        const row1 = isMarcas ? segmentPlans.slice(0, 3) : segmentPlans;
        const row2 = isMarcas ? segmentPlans.slice(3) : [];

        const StatBox = ({ emoji, value, label, dim = false, bg, text }: { emoji: string; value: string; label: string; dim?: boolean; bg: string; text: string }) => (
          <div className={cn("flex flex-col items-center justify-center rounded-xl py-3 px-2 text-center gap-0.5", dim ? 'bg-zinc-800/40 opacity-40' : bg)}>
            <span className="text-xl leading-none">{emoji}</span>
            <span className={cn("text-xl font-black leading-none mt-1", dim ? 'text-zinc-500' : text)}>{value}</span>
            <span className="text-[10px] text-zinc-500 leading-tight mt-0.5">{label}</span>
          </div>
        );

        const renderCard = (plan: (typeof segmentPlans)[0]) => {
          const planTier = PLAN_TO_TIER[plan.id] || plan.id;
          const isCurrentPlan = currentTier === planTier;
          const isFreeplan = plan.priceMonthly === 0 && plan.id !== 'agencias-enterprise';
          const isEnterprise = plan.id === 'agencias-enterprise';
          const price = billingCycle === 'annual' && plan.priceAnnual
            ? Math.round(plan.priceAnnual / 12)
            : plan.priceMonthly;
          const isPopular = plan.id === popularPlanId;
          const features = getPlanFeatures(plan);
          const ts = TIER_STYLES[plan.id] ?? DEFAULT_TIER_STYLE;

          const monthlyAnnualPrice = plan.priceAnnual ? Math.round(plan.priceAnnual / 12) : 0;
          const annualSaving = plan.priceMonthly > 0 && plan.priceAnnual
            ? Math.round((plan.priceMonthly - monthlyAnnualPrice) * 12)
            : 0;
          const annualSavingCOP = plan.priceMonthlyCOP && plan.priceAnnualCOP
            ? Math.round(plan.priceMonthlyCOP * 12 - plan.priceAnnualCOP)
            : annualSaving * COP_RATE;

          const hasContacts = plan.creatorContactsPerMonth !== undefined;
          const hasCanjes = plan.canjesPerMonth !== undefined;
          const showMarcasMetrics = hasContacts || hasCanjes;

          const getCOPDisplay = () => {
            const isAnnual = billingCycle === 'annual';
            const copPrice = isAnnual && plan.priceAnnualCOP
              ? Math.round(plan.priceAnnualCOP / 12)
              : (plan.priceMonthlyCOP ?? price * COP_RATE);
            return copPrice >= 1_000_000
              ? `$${(copPrice / 1_000_000).toFixed(1).replace('.0', '')}M`
              : `$${(copPrice / 1_000).toFixed(0)}K`;
          };
          const priceDisplay = isEnterprise ? null : isFreeplan ? 'Gratis' : isColombia
            ? getCOPDisplay()
            : `$${price}`;
          const priceSuffix = isFreeplan || isEnterprise ? '' : isColombia ? ' COP/mes' : '/mes';

          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl overflow-hidden transition-all duration-200",
                ts.cardBg,
                "border border-zinc-700/50",
                isPopular && "border-purple-500/40 shadow-[0_0_32px_rgba(124,58,237,0.25)]",
                isCurrentPlan && isActive && "ring-2 ring-emerald-500/50",
              )}
            >
              {/* Colored top bar */}
              <div className={cn("h-1.5 w-full", ts.bar)} />

              {/* Popular badge */}
              {isPopular && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-[0_0_12px_rgba(124,58,237,0.5)]">
                    <Sparkles className="h-3 w-3" /> Más popular
                  </span>
                </div>
              )}
              {isCurrentPlan && isActive && (
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                    <CheckCircle2 className="h-3 w-3" /> Activo
                  </span>
                </div>
              )}

              <div className="flex flex-col flex-1 p-5 gap-5">
                {/* Plan name + tagline */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{ts.emoji}</span>
                    <h3 className={cn("text-xl font-black tracking-tight", ts.accentText)}>{plan.name}</h3>
                  </div>
                  <p className="text-xs text-zinc-400 leading-snug">
                    {isEnterprise ? 'Contacta al equipo para un plan a medida' : getPlanTagline(plan.id)}
                  </p>
                </div>

                {/* Price — BIG */}
                {!isEnterprise && (
                  <div className="flex items-end gap-1">
                    <span className="text-5xl font-black text-white leading-none">{priceDisplay}</span>
                    {priceSuffix && <span className="text-zinc-400 text-sm mb-1">{priceSuffix}</span>}
                  </div>
                )}
                {isEnterprise && (
                  <span className="text-4xl font-black text-white">A medida</span>
                )}

                {/* Savings hint */}
                {!isFreeplan && !isEnterprise && billingCycle === 'monthly' && annualSaving > 0 && (
                  <div className="flex items-center gap-1.5 -mt-2">
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      {isColombia
                        ? `💰 Ahorra $${(annualSavingCOP / 1_000).toFixed(0)}K COP/año en anual`
                        : `💰 Ahorra $${annualSaving}/año en anual`}
                    </span>
                  </div>
                )}
                {!isFreeplan && !isEnterprise && billingCycle === 'annual' && (
                  <div className="flex items-center gap-1.5 -mt-2">
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      ✅ 30% de descuento aplicado
                    </span>
                  </div>
                )}

                {/* Marcas metrics — 4 stat boxes */}
                {showMarcasMetrics && (
                  <div className="grid grid-cols-2 gap-2">
                    <StatBox emoji="👥" value={plan.creatorContactsPerMonth === null ? '∞' : String(plan.creatorContactsPerMonth ?? 0)} label="contactos/mes" bg={ts.metricBg} text={ts.metricText} />
                    <StatBox emoji="🤝" value={plan.canjesPerMonth === null ? '∞' : plan.canjesPerMonth === 0 ? '—' : String(plan.canjesPerMonth)} label="canjes/mes" dim={plan.canjesPerMonth === 0} bg={ts.metricBg} text={ts.metricText} />
                    <StatBox emoji="📢" value={plan.contentPerMonth === null ? '∞' : String(plan.contentPerMonth ?? '?')} label="contenidos/mes" bg={ts.metricBg} text={ts.metricText} />
                    <StatBox emoji="✨" value={plan.aiTokens >= 1000 ? `${(plan.aiTokens/1000).toFixed(0)}k` : String(plan.aiTokens)} label="tokens IA" bg={ts.metricBg} text={ts.metricText} />
                  </div>
                )}

                {/* Agency metrics */}
                {plan.adminUsers !== undefined && (
                  <div className="grid grid-cols-2 gap-2">
                    <StatBox emoji="🛡️" value={plan.adminUsers === null ? '∞' : String(plan.adminUsers)} label="admins" bg={ts.metricBg} text={ts.metricText} />
                    <StatBox emoji="🎯" value={plan.strategists === null ? '∞' : String(plan.strategists ?? '∞')} label="estrategas" bg={ts.metricBg} text={ts.metricText} />
                    <StatBox emoji="🎬" value={plan.editors === null ? '∞' : String(plan.editors ?? '∞')} label="editores" bg={ts.metricBg} text={ts.metricText} />
                    <StatBox emoji="✨" value={plan.aiTokens >= 1000 ? `${(plan.aiTokens/1000).toFixed(0)}k` : String(plan.aiTokens)} label="tokens IA" bg={ts.metricBg} text={ts.metricText} />
                  </div>
                )}

                {/* Creadores metrics */}
                {!showMarcasMetrics && plan.adminUsers === undefined && (
                  <div className="grid grid-cols-3 gap-2">
                    <StatBox
                      emoji="📝"
                      value={plan.adnRecargadosPerMonth === null ? '∞' : plan.adnRecargadosPerMonth === 0 ? '—' : String(plan.adnRecargadosPerMonth)}
                      label="ADN/mes"
                      dim={plan.adnRecargadosPerMonth === 0}
                      bg={ts.metricBg}
                      text={ts.metricText}
                    />
                    <StatBox
                      emoji="📱"
                      value={plan.socialPostsPerMonth === null ? '∞' : String(plan.socialPostsPerMonth ?? 0)}
                      label="posts/mes"
                      bg={ts.metricBg}
                      text={ts.metricText}
                    />
                    <StatBox
                      emoji="✨"
                      value={plan.aiTokens >= 1000 ? `${(plan.aiTokens / 1000).toFixed(0)}k` : String(plan.aiTokens)}
                      label="tokens IA"
                      bg={ts.metricBg}
                      text={ts.metricText}
                    />
                  </div>
                )}

                {/* Separator */}
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-zinc-700/50" />
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                    {plan.segment === 'creadores' ? 'Características' : 'Incluye'}
                  </span>
                  <div className="h-px flex-1 bg-zinc-700/50" />
                </div>

                {/* Features */}
                <ul className="flex-1 space-y-2">
                  {(plan.segment === 'creadores' ? getPlanFeatureItems(plan) : features.map(f => ({ label: f, included: true, highlight: false }))).map((item, idx) => (
                    <li key={idx} className={cn('flex items-start gap-2 text-sm', item.included ? 'text-zinc-300' : 'text-zinc-600')}>
                      <span className={cn('shrink-0 leading-none mt-0.5 text-base', item.included ? 'text-emerald-400' : 'text-zinc-700')}>
                        {item.included ? '✓' : '✗'}
                      </span>
                      <span className={cn(item.highlight && item.included ? 'font-semibold' : '')}>{item.label}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="pt-1">
                  {isFreeplan ? (
                    <div className="w-full py-3 rounded-xl border border-zinc-700 text-sm text-zinc-500 flex items-center justify-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      Plan gratuito incluido
                    </div>
                  ) : isEnterprise ? (
                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      className={cn("w-full py-3 rounded-xl text-sm font-bold transition-all", ts.btnClass)}
                    >
                      Contactar ventas →
                    </button>
                  ) : (
                    <>
                      <button
                        disabled={(isCurrentPlan && isActive) || isCheckingOut}
                        onClick={() => handleSelectPlan(plan.id)}
                        className={cn(
                          "w-full py-3 rounded-xl text-sm font-bold transition-all",
                          isCurrentPlan && isActive
                            ? "bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-700"
                            : ts.btnClass,
                          isCheckingOut && "opacity-50 cursor-wait",
                        )}
                      >
                        {isCurrentPlan && isActive ? (
                          <span className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            Plan activo
                          </span>
                        ) : isCheckingOut ? (
                          <span className="flex items-center justify-center gap-2">
                            <Clock className="h-4 w-4 animate-spin" />
                            Procesando...
                          </span>
                        ) : (
                          'Seleccionar plan →'
                        )}
                      </button>
                      {isCurrentPlan && isActive && hasCommunityBenefits && (
                        <p className="text-xs text-center text-emerald-400 mt-1.5">
                          🎁 {communityFreeMonths} {communityFreeMonths === 1 ? 'mes' : 'meses'} gratis de comunidad
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        };

        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">
              Planes para {SEGMENT_CONFIG[segment].label}
            </h2>

            {isMarcas ? (
              <>
                {/* Row label 1 */}
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-zinc-700/40" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Planes de inicio</span>
                  <div className="h-px flex-1 bg-zinc-700/40" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {row1.map(renderCard)}
                </div>

                {/* Row label 2 */}
                <div className="flex items-center gap-3 mt-4">
                  <div className="h-px flex-1 bg-zinc-700/40" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Planes avanzados</span>
                  <div className="h-px flex-1 bg-zinc-700/40" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {row2.map(renderCard)}
                </div>
              </>
            ) : (
              <div className={cn(
                "grid gap-5",
                segmentPlans.length <= 2 && "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto",
                segmentPlans.length === 3 && "grid-cols-1 md:grid-cols-3",
                segmentPlans.length >= 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
              )}>
                {row1.map(renderCard)}
              </div>
            )}
          </div>
        );
      })()}

      {/* Info Card */}
      <Card className="bg-zinc-50 dark:bg-[#14141f] border-zinc-200 dark:border-zinc-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-zinc-900 dark:text-zinc-100">Pago seguro con Stripe</h4>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
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
