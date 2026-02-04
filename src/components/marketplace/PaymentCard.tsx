import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Lock,
  Unlock,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useMarketplacePayments, usePaymentDisputes } from '@/hooks/useMarketplacePayments';
import type { MarketplacePayment, PaymentStatus, DisputeReason } from '@/types/payments';
import { DISPUTE_REASON_LABELS } from '@/types/payments';

interface PaymentCardProps {
  payment: MarketplacePayment;
  viewAs: 'company' | 'creator';
  onViewDetails?: () => void;
  className?: string;
}

const STATUS_CONFIG: Record<PaymentStatus, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}> = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
  },
  funded: {
    label: 'En escrow',
    icon: Lock,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  in_progress: {
    label: 'En progreso',
    icon: Clock,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  review: {
    label: 'En revisión',
    icon: Clock,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
  },
  released: {
    label: 'Liberado',
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
  },
  disputed: {
    label: 'En disputa',
    icon: AlertTriangle,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
  },
  refunded: {
    label: 'Reembolsado',
    icon: XCircle,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'text-gray-500',
    bg: 'bg-gray-500/10',
  },
};

export function PaymentCard({
  payment,
  viewAs,
  onViewDetails,
  className,
}: PaymentCardProps) {
  const { releasePayment, releaseMilestone, isReleasing } = useMarketplacePayments();
  const { openDispute, isOpening } = usePaymentDisputes();

  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('work_not_as_described');
  const [disputeDescription, setDisputeDescription] = useState('');

  const statusConfig = STATUS_CONFIG[payment.status];
  const StatusIcon = statusConfig.icon;

  const otherUser = viewAs === 'company' ? payment.creator_user : payment.company_user;

  // Calculate milestone progress
  const completedMilestones = payment.milestones?.filter(
    (m) => m.status === 'released'
  ).length || 0;
  const totalMilestones = payment.milestones?.length || 0;
  const milestoneProgress = totalMilestones > 0
    ? (completedMilestones / totalMilestones) * 100
    : payment.status === 'released' ? 100 : 0;

  const handleRelease = async () => {
    await releasePayment(payment.id);
    setShowReleaseDialog(false);
  };

  const handleOpenDispute = async () => {
    await openDispute({
      payment_id: payment.id,
      reason: disputeReason,
      description: disputeDescription,
    });
    setShowDisputeDialog(false);
    setDisputeDescription('');
  };

  return (
    <>
      <motion.div
        className={cn(
          "p-4 rounded-xl bg-social-card border border-social-border",
          "hover:border-social-accent/30 transition-all cursor-pointer",
          className
        )}
        onClick={onViewDetails}
        whileHover={{ y: -2 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={otherUser?.avatar_url || undefined} />
              <AvatarFallback>
                {otherUser?.full_name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-social-foreground">
                {otherUser?.full_name}
              </p>
              <p className="text-sm text-social-muted-foreground">
                {payment.description || 'Proyecto'}
              </p>
            </div>
          </div>

          <Badge className={cn(statusConfig.bg, statusConfig.color, "border-0")}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig.label}
          </Badge>
        </div>

        {/* Amount */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-2xl font-bold text-social-foreground">
              ${viewAs === 'creator' ? payment.net_amount.toLocaleString() : payment.gross_amount.toLocaleString()}
            </p>
            {viewAs === 'company' && (
              <p className="text-xs text-social-muted-foreground">
                ${payment.net_amount.toLocaleString()} al creador + ${payment.platform_fee.toLocaleString()} fee
              </p>
            )}
          </div>

          {payment.status === 'funded' && viewAs === 'company' && (
            <div className="flex items-center gap-1 text-sm text-blue-500">
              <Lock className="h-4 w-4" />
              Escrow
            </div>
          )}
        </div>

        {/* Milestones progress */}
        {totalMilestones > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-social-muted-foreground">
                Milestones
              </span>
              <span className="text-social-foreground">
                {completedMilestones}/{totalMilestones}
              </span>
            </div>
            <Progress value={milestoneProgress} className="h-2" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t border-social-border">
          {/* Company actions */}
          {viewAs === 'company' && payment.status === 'funded' && (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowReleaseDialog(true);
              }}
              className="flex-1 gap-2"
            >
              <Unlock className="h-4 w-4" />
              Liberar pago
            </Button>
          )}

          {/* Dispute button */}
          {['funded', 'in_progress', 'review'].includes(payment.status) && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowDisputeDialog(true);
              }}
              className="gap-2"
            >
              <AlertTriangle className="h-4 w-4" />
              Disputar
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onViewDetails}
            className="ml-auto"
          >
            Ver detalles
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </motion.div>

      {/* Release dialog */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent className="bg-social-card border-social-border">
          <DialogHeader>
            <DialogTitle className="text-social-foreground">
              Liberar pago
            </DialogTitle>
            <DialogDescription>
              Al liberar el pago, los fondos serán transferidos al creador.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="p-4 rounded-lg bg-social-muted">
              <div className="flex items-center justify-between">
                <span className="text-social-muted-foreground">Monto a liberar</span>
                <span className="text-xl font-bold text-social-foreground">
                  ${payment.net_amount.toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-social-muted-foreground mt-2">
                Para: {payment.creator_user?.full_name}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReleaseDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRelease}
              disabled={isReleasing}
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              {isReleasing ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Confirmar liberación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dispute dialog */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent className="bg-social-card border-social-border">
          <DialogHeader>
            <DialogTitle className="text-social-foreground">
              Abrir disputa
            </DialogTitle>
            <DialogDescription>
              Describe el problema y nuestro equipo revisará el caso.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-social-foreground">
                Motivo de la disputa
              </label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value as DisputeReason)}
                className="w-full p-2 rounded-lg bg-social-muted border border-social-border text-social-foreground"
              >
                {Object.entries(DISPUTE_REASON_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-social-foreground">
                Descripción detallada
              </label>
              <Textarea
                placeholder="Explica el problema con el mayor detalle posible..."
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                className="bg-social-muted border-social-border min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisputeDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleOpenDispute}
              disabled={isOpening || !disputeDescription.trim()}
              variant="destructive"
              className="gap-2"
            >
              {isOpening ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              Abrir disputa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Compact payment badge for lists
export function PaymentBadge({ payment }: { payment: MarketplacePayment }) {
  const statusConfig = STATUS_CONFIG[payment.status];

  return (
    <div className={cn(
      "inline-flex items-center gap-2 px-3 py-1.5 rounded-full",
      statusConfig.bg
    )}>
      <DollarSign className={cn("h-4 w-4", statusConfig.color)} />
      <span className={cn("font-medium", statusConfig.color)}>
        ${payment.gross_amount.toLocaleString()}
      </span>
      <Badge variant="outline" className={cn("text-xs", statusConfig.color)}>
        {statusConfig.label}
      </Badge>
    </div>
  );
}
