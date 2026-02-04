import { useState } from 'react';
import {
  CheckCircle,
  RefreshCw,
  AlertTriangle,
  XCircle,
  Unlock,
  Eye,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { EscrowDisplay, EscrowStatus } from '../../types';

type UserRole = 'brand' | 'creator' | 'editor' | 'admin';

interface EscrowAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: 'default' | 'outline' | 'destructive' | 'ghost';
  description?: string;
}

function getAvailableActions(
  escrow: EscrowDisplay,
  userRole: UserRole
): EscrowAction[] {
  const actions: EscrowAction[] = [];
  const status = escrow.status;

  // Brand actions
  if (userRole === 'brand') {
    if (status === 'pending_approval') {
      actions.push({
        id: 'approve',
        label: 'Aprobar Contenido',
        icon: CheckCircle,
        variant: 'default',
        description: 'Liberar fondos a los participantes',
      });
      actions.push({
        id: 'request_changes',
        label: 'Solicitar Cambios',
        icon: RefreshCw,
        variant: 'outline',
        description: 'Pedir modificaciones al contenido',
      });
      actions.push({
        id: 'open_dispute',
        label: 'Abrir Disputa',
        icon: AlertTriangle,
        variant: 'destructive',
        description: 'Reportar un problema con la entrega',
      });
    }
    if (status === 'active') {
      actions.push({
        id: 'cancel_campaign',
        label: 'Cancelar Campaña',
        icon: XCircle,
        variant: 'destructive',
        description: 'Cancelar y solicitar reembolso',
      });
    }
    if (status === 'disputed') {
      actions.push({
        id: 'view_dispute',
        label: 'Ver Disputa',
        icon: Eye,
        variant: 'outline',
      });
    }
  }

  // Creator actions
  if (userRole === 'creator') {
    if (status === 'pending_approval') {
      actions.push({
        id: 'view_status',
        label: 'Ver Estado',
        icon: Eye,
        variant: 'outline',
        description: 'El cliente está revisando tu entrega',
      });
    }
    if (status === 'disputed') {
      actions.push({
        id: 'respond_dispute',
        label: 'Responder Disputa',
        icon: MessageSquare,
        variant: 'outline',
        description: 'Proporcionar tu versión de los hechos',
      });
    }
  }

  // Editor actions
  if (userRole === 'editor') {
    if (status === 'pending_approval') {
      actions.push({
        id: 'view_status',
        label: 'Ver Estado',
        icon: Eye,
        variant: 'outline',
        description: 'El cliente está revisando el contenido',
      });
    }
    if (status === 'disputed') {
      actions.push({
        id: 'respond_dispute',
        label: 'Responder Disputa',
        icon: MessageSquare,
        variant: 'outline',
      });
    }
  }

  // Admin actions (all available)
  if (userRole === 'admin') {
    if (['active', 'pending_editor', 'pending_approval'].includes(status)) {
      actions.push({
        id: 'manual_release',
        label: 'Liberar Manual',
        icon: Unlock,
        variant: 'default',
        description: 'Liberar fondos manualmente',
      });
      actions.push({
        id: 'refund',
        label: 'Reembolsar',
        icon: RefreshCw,
        variant: 'outline',
        description: 'Devolver fondos al pagador',
      });
    }
    if (status === 'disputed') {
      actions.push({
        id: 'resolve_dispute',
        label: 'Resolver Disputa',
        icon: CheckCircle,
        variant: 'default',
        description: 'Tomar decisión sobre la disputa',
      });
    }
    // Admin can always view
    actions.push({
      id: 'view_details',
      label: 'Ver Detalles',
      icon: Eye,
      variant: 'ghost',
    });
  }

  return actions;
}

interface EscrowActionsProps {
  escrow: EscrowDisplay;
  userRole: UserRole;
  onAction: (actionId: string) => void;
  isLoading?: boolean;
  loadingAction?: string;
  showCard?: boolean;
  className?: string;
}

export function EscrowActions({
  escrow,
  userRole,
  onAction,
  isLoading,
  loadingAction,
  showCard = true,
  className,
}: EscrowActionsProps) {
  const actions = getAvailableActions(escrow, userRole);

  if (actions.length === 0) {
    return null;
  }

  const content = (
    <div className={cn('space-y-3', !showCard && className)}>
      {actions.map((action, index) => {
        const Icon = action.icon;
        const isActionLoading = isLoading && loadingAction === action.id;

        return (
          <div key={action.id}>
            <Button
              variant={action.variant}
              className={cn(
                'w-full justify-start h-auto py-3',
                action.variant === 'default' && 'bg-emerald-600 hover:bg-emerald-700'
              )}
              onClick={() => onAction(action.id)}
              disabled={isLoading}
            >
              <Icon
                className={cn(
                  'h-5 w-5 mr-3',
                  isActionLoading && 'animate-spin'
                )}
              />
              <div className="text-left">
                <p className="font-medium">
                  {isActionLoading ? 'Procesando...' : action.label}
                </p>
                {action.description && (
                  <p className="text-xs opacity-70 mt-0.5">{action.description}</p>
                )}
              </div>
            </Button>
            {index < actions.length - 1 && action.variant === 'default' && (
              <Separator className="my-3 bg-[hsl(270,100%,60%,0.1)]" />
            )}
          </div>
        );
      })}
    </div>
  );

  if (!showCard) {
    return content;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Acciones Disponibles</CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

// Export types for external use
export type { UserRole, EscrowAction };
