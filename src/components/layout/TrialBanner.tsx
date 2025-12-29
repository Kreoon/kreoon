import { AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOrganizationTrial } from '@/hooks/useOrganizationTrial';
import { cn } from '@/lib/utils';

interface TrialBannerProps {
  organizationId: string | null;
  onUpgrade?: () => void;
}

export function TrialBanner({ organizationId, onUpgrade }: TrialBannerProps) {
  const { 
    showWarningBanner, 
    daysRemaining, 
    isExpired, 
    billingEnabled,
    subscriptionStatus 
  } = useOrganizationTrial(organizationId);

  // Don't show anything if billing is disabled or subscription is active
  if (!billingEnabled || subscriptionStatus === 'active') {
    return null;
  }

  // Expired state
  if (isExpired) {
    return (
      <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Tu periodo de prueba ha terminado
              </p>
              <p className="text-xs text-destructive/80">
                La organización está en modo solo lectura. Activa tu plan para continuar.
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            className="bg-destructive hover:bg-destructive/90 shrink-0"
            onClick={onUpgrade}
          >
            Activar plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Warning state (7 or 3 days remaining)
  if (showWarningBanner) {
    const isUrgent = daysRemaining <= 3;
    
    return (
      <div className={cn(
        "w-full border-b px-4 py-3",
        isUrgent 
          ? "bg-amber-500/10 border-amber-500/30" 
          : "bg-primary/5 border-primary/20"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className={cn(
              "h-5 w-5 shrink-0",
              isUrgent ? "text-amber-500" : "text-primary"
            )} />
            <div>
              <p className={cn(
                "text-sm font-medium",
                isUrgent ? "text-amber-500" : "text-primary"
              )}>
                Tu periodo de prueba termina en {daysRemaining} día{daysRemaining !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                Activa tu plan para mantener el acceso completo a todas las funcionalidades.
              </p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant={isUrgent ? "default" : "outline"}
            className={cn(
              "shrink-0",
              isUrgent && "bg-amber-500 hover:bg-amber-600"
            )}
            onClick={onUpgrade}
          >
            Activar plan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
