import { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, MessageCircle, Bell, Building2, Clock, Check, X, Palmtree } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCreatorAvailability } from '@/hooks/useCreatorAvailability';
import { useAuth } from '@/hooks/useAuth';
import type { CreatorAvailability, AvailabilityStatus } from '@/types/marketplace';

interface HireButtonProps {
  creatorId: string;
  isIndependent?: boolean;
  organizationId?: string | null;
  organizationName?: string | null;
  preferredService?: string;
  onHire?: () => void;
  onMessage?: () => void;
  onNotifyAvailable?: () => void;
  onContactOrg?: () => void;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function HireButton({
  creatorId,
  isIndependent = true,
  organizationId,
  organizationName,
  preferredService,
  onHire,
  onMessage,
  onNotifyAvailable,
  onContactOrg,
  className,
  size = 'default',
}: HireButtonProps) {
  const { user } = useAuth();
  const { availability, isLoading, getStatusDisplay, isAcceptingProjects } = useCreatorAvailability({
    userId: creatorId,
  });

  const [isHovered, setIsHovered] = useState(false);

  // Don't show for own profile
  if (user?.id === creatorId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className={cn("flex gap-2", className)}>
        <div className="h-10 w-32 bg-social-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  const statusDisplay = getStatusDisplay();
  const accepting = isAcceptingProjects();

  // If creator belongs to an organization
  if (!isIndependent && organizationId) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm text-social-muted-foreground">
          <Building2 className="h-4 w-4" />
          <span>Trabaja con @{organizationName || 'Organización'}</span>
        </div>
        <Button
          variant="outline"
          size={size}
          onClick={onContactOrg}
          className="w-full gap-2"
        >
          <Building2 className="h-4 w-4" />
          Contactar organización
        </Button>
      </div>
    );
  }

  // Available status
  if (availability?.status === 'available' || !availability) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-green-500 font-medium">Disponible</span>
        </div>
        <div className="flex gap-2">
          <Button
            size={size}
            onClick={onHire}
            className="flex-1 gap-2 bg-gradient-to-r from-social-accent to-purple-600 hover:opacity-90"
          >
            <Briefcase className="h-4 w-4" />
            Contratar
          </Button>
          {onMessage && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size={size}
                    onClick={onMessage}
                    className="px-3"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Enviar mensaje</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  }

  // Busy status
  if (availability.status === 'busy') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-yellow-500" />
          <span className="text-yellow-500 font-medium">
            Ocupado
            {availability.typical_response_hours && (
              <span className="text-social-muted-foreground font-normal">
                {' '}· Responde en ~{availability.typical_response_hours}h
              </span>
            )}
          </span>
        </div>
        <Button
          variant="outline"
          size={size}
          onClick={onHire}
          className="w-full gap-2"
        >
          <Briefcase className="h-4 w-4" />
          Enviar propuesta
        </Button>
      </div>
    );
  }

  // Unavailable status
  if (availability.status === 'unavailable') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm">
          <X className="h-4 w-4 text-red-500" />
          <span className="text-red-500 font-medium">No disponible ahora</span>
        </div>
        <Button
          variant="outline"
          size={size}
          onClick={onNotifyAvailable}
          className="w-full gap-2"
        >
          <Bell className="h-4 w-4" />
          Notificarme cuando esté disponible
        </Button>
      </div>
    );
  }

  // Vacation status
  if (availability.status === 'vacation') {
    const vacationEnd = availability.vacation_until
      ? new Date(availability.vacation_until)
      : null;
    const formattedDate = vacationEnd
      ? vacationEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
      : '';

    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2 text-sm">
          <Palmtree className="h-4 w-4 text-blue-500" />
          <span className="text-blue-500 font-medium">
            De vacaciones
            {formattedDate && (
              <span className="text-social-muted-foreground font-normal">
                {' '}hasta {formattedDate}
              </span>
            )}
          </span>
        </div>
        <Button
          variant="outline"
          size={size}
          onClick={onNotifyAvailable}
          className="w-full gap-2"
        >
          <Bell className="h-4 w-4" />
          Recordarme
        </Button>
      </div>
    );
  }

  // Fallback
  return (
    <div className={cn("flex gap-2", className)}>
      <Button
        variant="outline"
        size={size}
        onClick={onHire}
        className="flex-1 gap-2"
      >
        <Briefcase className="h-4 w-4" />
        Enviar propuesta
      </Button>
    </div>
  );
}

// Compact version for cards
export function HireButtonCompact({
  creatorId,
  isIndependent = true,
  organizationId,
  onHire,
  className,
}: Omit<HireButtonProps, 'size' | 'onMessage' | 'onNotifyAvailable' | 'onContactOrg'>) {
  const { availability, isLoading, isAcceptingProjects } = useCreatorAvailability({
    userId: creatorId,
  });

  const { user } = useAuth();

  if (user?.id === creatorId) return null;

  if (isLoading) {
    return <div className="h-8 w-20 bg-social-muted rounded animate-pulse" />;
  }

  if (!isIndependent && organizationId) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("text-xs gap-1", className)}
      >
        <Building2 className="h-3 w-3" />
        Org
      </Button>
    );
  }

  const accepting = isAcceptingProjects();
  const status = availability?.status || 'available';

  const statusConfig: Record<AvailabilityStatus, { icon: typeof Check; color: string; text: string }> = {
    available: { icon: Check, color: 'text-green-500', text: 'Contratar' },
    busy: { icon: Clock, color: 'text-yellow-500', text: 'Proponer' },
    unavailable: { icon: X, color: 'text-red-500', text: 'No disp.' },
    vacation: { icon: Palmtree, color: 'text-blue-500', text: 'Vacaciones' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Button
      variant={status === 'available' ? 'default' : 'outline'}
      size="sm"
      onClick={accepting ? onHire : undefined}
      disabled={!accepting}
      className={cn(
        "text-xs gap-1",
        status === 'available' && "bg-gradient-to-r from-social-accent to-purple-600",
        className
      )}
    >
      <Icon className={cn("h-3 w-3", config.color)} />
      {config.text}
    </Button>
  );
}
