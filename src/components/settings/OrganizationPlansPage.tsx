import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useOrganizationTrial } from '@/hooks/useOrganizationTrial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Check, Crown, Zap, Building2, Users, Video, Sparkles, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  features: string[];
  limits: {
    users: number | 'unlimited';
    content: number | 'unlimited';
    storage: string;
  };
  highlighted?: boolean;
  badge?: string;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    currency: 'USD',
    period: 'mes',
    features: [
      'Hasta 3 usuarios',
      '50 proyectos/mes',
      '5GB almacenamiento',
      'Soporte por email',
      'Board Kanban básico',
    ],
    limits: {
      users: 3,
      content: 50,
      storage: '5GB',
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 49,
    currency: 'USD',
    period: 'mes',
    features: [
      'Hasta 10 usuarios',
      '200 proyectos/mes',
      '50GB almacenamiento',
      'Soporte prioritario',
      'Board Kanban avanzado',
      'Integraciones básicas',
      'Reportes de rendimiento',
    ],
    limits: {
      users: 10,
      content: 200,
      storage: '50GB',
    },
    highlighted: true,
    badge: 'Más popular',
  },
  {
    id: 'business',
    name: 'Business',
    price: 149,
    currency: 'USD',
    period: 'mes',
    features: [
      'Usuarios ilimitados',
      'Proyectos ilimitados',
      '500GB almacenamiento',
      'Soporte 24/7',
      'Todas las integraciones',
      'API access',
      'Reportes avanzados',
      'White-label',
      'Manager dedicado',
    ],
    limits: {
      users: 'unlimited',
      content: 'unlimited',
      storage: '500GB',
    },
    badge: 'Enterprise',
  },
];

export function OrganizationPlansPage() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const organizationId = profile?.current_organization_id;
  
  const trialStatus = useOrganizationTrial(organizationId || null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Fetch current organization data
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
    enabled: !!organizationId,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      if (!organizationId) throw new Error('No organization');
      
      const { error } = await supabase
        .from('organizations')
        .update({ 
          selected_plan: planId,
          subscription_status: 'active',
          trial_active: false,
        })
        .eq('id', organizationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization-plan'] });
      queryClient.invalidateQueries({ queryKey: ['organization-trial'] });
      toast.success('Plan actualizado', {
        description: 'Tu plan ha sido actualizado exitosamente.',
      });
      setIsUpgrading(false);
      setSelectedPlan(null);
    },
    onError: () => {
      toast.error('Error al actualizar plan');
      setIsUpgrading(false);
    },
  });

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleConfirmUpgrade = () => {
    if (!selectedPlan) return;
    setIsUpgrading(true);
    updatePlanMutation.mutate(selectedPlan);
  };

  const currentPlan = organization?.selected_plan || 'starter';
  const isTrialActive = trialStatus.isTrialActive && !trialStatus.isExpired;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
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
                <Building2 className="h-5 w-5" />
                Estado de tu Suscripción
              </CardTitle>
              <CardDescription>
                {organization?.name || 'Tu organización'}
              </CardDescription>
            </div>
            <Badge 
              variant={isTrialActive ? 'secondary' : trialStatus.isExpired ? 'destructive' : 'default'}
              className="text-sm"
            >
              {isTrialActive ? 'Periodo de prueba' : trialStatus.isExpired ? 'Expirado' : 'Activo'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isTrialActive && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Días restantes</span>
                <span className="font-medium">{trialStatus.daysRemaining} días</span>
              </div>
              <Progress value={(trialStatus.daysRemaining / 30) * 100} className="h-2" />
              {trialStatus.trialEndDate && (
                <p className="text-xs text-muted-foreground">
                  Tu periodo de prueba termina el {format(trialStatus.trialEndDate, "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              )}
            </>
          )}
          
          {trialStatus.isExpired && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Tu periodo de prueba ha expirado. Selecciona un plan para continuar usando todas las funcionalidades.
              </AlertDescription>
            </Alert>
          )}

          {!isTrialActive && !trialStatus.isExpired && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>Plan activo: {PLANS.find(p => p.id === currentPlan)?.name || currentPlan}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plans Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Selecciona tu Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrentPlan = currentPlan === plan.id;
            const isSelected = selectedPlan === plan.id;
            
            return (
              <Card 
                key={plan.id}
                className={cn(
                  "relative transition-all duration-200 cursor-pointer",
                  plan.highlighted && "border-primary shadow-lg",
                  isSelected && "ring-2 ring-primary",
                  isCurrentPlan && !isTrialActive && "bg-primary/5"
                )}
                onClick={() => handleSelectPlan(plan.id)}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-2">
                  <CardTitle className="flex items-center justify-center gap-2">
                    {plan.id === 'business' && <Crown className="h-5 w-5 text-amber-500" />}
                    {plan.id === 'professional' && <Zap className="h-5 w-5 text-primary" />}
                    {plan.name}
                  </CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/{plan.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <Separator />
                  
                  {/* Limits */}
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <span className="font-medium">
                        {plan.limits.users === 'unlimited' ? '∞' : plan.limits.users}
                      </span>
                      <p className="text-muted-foreground">usuarios</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <Video className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <span className="font-medium">
                        {plan.limits.content === 'unlimited' ? '∞' : plan.limits.content}
                      </span>
                      <p className="text-muted-foreground">proyectos</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <Sparkles className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <span className="font-medium">{plan.limits.storage}</span>
                      <p className="text-muted-foreground">storage</p>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Features */}
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={isCurrentPlan && !isTrialActive ? "outline" : plan.highlighted ? "default" : "secondary"}
                    disabled={isCurrentPlan && !isTrialActive}
                  >
                    {isCurrentPlan && !isTrialActive ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        Plan actual
                      </span>
                    ) : isSelected ? (
                      'Seleccionado'
                    ) : (
                      'Seleccionar'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Confirm Selection */}
      {selectedPlan && selectedPlan !== currentPlan && (
        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-center md:text-left">
                <h3 className="font-semibold">
                  {selectedPlan === 'starter' ? 'Cambiar a plan Starter' : `Actualizar a ${PLANS.find(p => p.id === selectedPlan)?.name}`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedPlan === 'starter' 
                    ? 'Este es el plan gratuito con funcionalidades limitadas.'
                    : 'Próximamente podrás pagar con tarjeta de crédito o transferencia.'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSelectedPlan(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmUpgrade} disabled={isUpgrading}>
                  {isUpgrading ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>Confirmar selección</>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Próximamente: Pagos en línea</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Estamos trabajando en la integración de pagos. Por ahora, al seleccionar un plan 
                nuestro equipo se pondrá en contacto contigo para coordinar el pago.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
