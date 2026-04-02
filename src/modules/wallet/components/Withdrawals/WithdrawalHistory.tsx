import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  Ban,
  Filter,
  ExternalLink,
  ArrowUpCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useWithdrawals, useWithdrawalMutations } from '../../hooks/useWithdrawals';
import { WithdrawalStatusTimeline } from './WithdrawalStatusTimeline';
import { WithdrawalStatusCard } from './WithdrawalStatus';
import type { WithdrawalDisplay, WithdrawalStatus as WStatus } from '../../types';
import { NoWithdrawalsState, WithdrawalListSkeleton } from '../common';

const STATUS_ICONS: Record<WStatus, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  processing: Loader2,
  completed: CheckCircle,
  rejected: XCircle,
  cancelled: Ban,
};

const STATUS_OPTIONS: { value: WStatus; label: string }[] = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'processing', label: 'Procesando' },
  { value: 'completed', label: 'Completado' },
  { value: 'rejected', label: 'Rechazado' },
  { value: 'cancelled', label: 'Cancelado' },
];

interface WithdrawalHistoryProps {
  walletId?: string;
  className?: string;
}

export function WithdrawalHistory({ walletId, className }: WithdrawalHistoryProps) {
  const [statusFilter, setStatusFilter] = useState<WStatus[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalDisplay | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { withdrawals, isLoading } = useWithdrawals({
    walletId,
    status: statusFilter.length > 0 ? statusFilter : undefined,
  });
  const { cancelWithdrawal, isCancelling } = useWithdrawalMutations();

  const handleStatusToggle = (status: WStatus) => {
    setStatusFilter(prev =>
      prev.includes(status)
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const handleSelectWithdrawal = (withdrawal: WithdrawalDisplay) => {
    setSelectedWithdrawal(withdrawal);
    setDrawerOpen(true);
  };

  const handleCancelWithdrawal = () => {
    if (!selectedWithdrawal) return;
    cancelWithdrawal(selectedWithdrawal.id, {
      onSuccess: () => {
        setDrawerOpen(false);
        setSelectedWithdrawal(null);
      },
    });
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-sm bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
              <ArrowUpCircle className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Mis Solicitudes de Retiro</CardTitle>
          </div>

          {/* Filter dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
                {statusFilter.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 min-w-5">
                    {statusFilter.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Estado</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUS_OPTIONS.map(option => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={statusFilter.includes(option.value)}
                  onCheckedChange={() => handleStatusToggle(option.value)}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-xs"
                    onClick={() => setStatusFilter([])}
                  >
                    Limpiar filtros
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <WithdrawalListSkeleton count={5} />
        ) : withdrawals.length === 0 ? (
          <NoWithdrawalsState />
        ) : (
          <div className="space-y-3">
            {withdrawals.map((withdrawal, index) => {
              const Icon = STATUS_ICONS[withdrawal.status];

              return (
                <motion.div
                  key={withdrawal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleSelectWithdrawal(withdrawal)}
                  className={cn(
                    'p-4 rounded-sm cursor-pointer transition-all',
                    'bg-[hsl(270,100%,60%,0.03)] hover:bg-[hsl(270,100%,60%,0.08)]',
                    'border border-transparent hover:border-[hsl(270,100%,60%,0.1)]'
                  )}
                >
                  <div className="flex items-center gap-4">
                    {/* Status icon */}
                    <div
                      className={cn(
                        'p-2 rounded-full',
                        withdrawal.status === 'pending' && 'bg-amber-500/10',
                        withdrawal.status === 'processing' && 'bg-blue-500/10',
                        withdrawal.status === 'completed' && 'bg-emerald-500/10',
                        withdrawal.status === 'rejected' && 'bg-red-500/10',
                        withdrawal.status === 'cancelled' && 'bg-gray-500/10'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-5 w-5',
                          withdrawal.status === 'pending' && 'text-amber-400',
                          withdrawal.status === 'processing' && 'text-blue-400 animate-spin',
                          withdrawal.status === 'completed' && 'text-emerald-400',
                          withdrawal.status === 'rejected' && 'text-red-400',
                          withdrawal.status === 'cancelled' && 'text-gray-400'
                        )}
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-white">
                          {withdrawal.formattedNetAmount}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px]',
                            withdrawal.status === 'pending' && 'border-amber-500/30 text-amber-400',
                            withdrawal.status === 'processing' && 'border-blue-500/30 text-blue-400',
                            withdrawal.status === 'completed' && 'border-emerald-500/30 text-emerald-400',
                            withdrawal.status === 'rejected' && 'border-red-500/30 text-red-400',
                            withdrawal.status === 'cancelled' && 'border-gray-500/30 text-gray-400'
                          )}
                        >
                          {withdrawal.statusLabel}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {withdrawal.methodLabel} • {withdrawal.paymentSummary}
                      </p>
                    </div>

                    {/* Date & actions */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {withdrawal.formattedDate}
                      </p>
                      {withdrawal.payment_proof_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs mt-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(withdrawal.payment_proof_url!, '_blank');
                          }}
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Comprobante
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Detail drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="pb-6">
            <SheetTitle>Detalle de Solicitud</SheetTitle>
          </SheetHeader>

          {selectedWithdrawal && (
            <div className="space-y-6">
              {/* Status card */}
              <WithdrawalStatusCard
                withdrawal={selectedWithdrawal}
                onCancel={
                  selectedWithdrawal.status === 'pending' ? handleCancelWithdrawal : undefined
                }
                isCancelling={isCancelling}
              />

              {/* Timeline */}
              <div>
                <p className="text-sm font-medium text-white mb-4">Seguimiento</p>
                <WithdrawalStatusTimeline withdrawal={selectedWithdrawal} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </Card>
  );
}
