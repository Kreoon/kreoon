import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Loader2,
  User,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAdminWithdrawals } from '../../hooks/useWithdrawals';
import { ProcessWithdrawalDialog } from './ProcessWithdrawal';
import type { WithdrawalDisplay, WithdrawalStatus } from '../../types';

interface PendingWithdrawalsProps {
  className?: string;
}

export function PendingWithdrawals({ className }: PendingWithdrawalsProps) {
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus[]>(['pending', 'processing']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalDisplay | null>(null);

  const {
    withdrawals,
    isLoading,
    refreshWithdrawals,
    processWithdrawal,
    isProcessing,
  } = useAdminWithdrawals({ status: statusFilter });

  // Filter by search
  const filteredWithdrawals = withdrawals.filter(w => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const profile = (w as any).profiles;
    return (
      w.id.toLowerCase().includes(query) ||
      profile?.email?.toLowerCase().includes(query) ||
      profile?.full_name?.toLowerCase().includes(query) ||
      w.paymentSummary.toLowerCase().includes(query)
    );
  });

  // Stats
  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const processingCount = withdrawals.filter(w => w.status === 'processing').length;
  const totalPendingAmount = withdrawals
    .filter(w => ['pending', 'processing'].includes(w.status))
    .reduce((sum, w) => sum + w.net_amount, 0);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{pendingCount}</p>
                <p className="text-sm text-[hsl(270,30%,60%)]">Pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Loader2 className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{processingCount}</p>
                <p className="text-sm text-[hsl(270,30%,60%)]">Procesando</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[hsl(270,100%,60%,0.1)]">
                <AlertCircle className="h-6 w-6 text-[hsl(270,100%,70%)]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  ${totalPendingAmount.toLocaleString()}
                </p>
                <p className="text-sm text-[hsl(270,30%,60%)]">Total por procesar</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main list */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Solicitudes de Retiro</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(270,30%,50%)]" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Select
                value={statusFilter.join(',')}
                onValueChange={(value) =>
                  setStatusFilter(value.split(',') as WithdrawalStatus[])
                }
              >
                <SelectTrigger className="w-40 h-9">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending,processing">Por procesar</SelectItem>
                  <SelectItem value="pending">Solo pendientes</SelectItem>
                  <SelectItem value="processing">Solo procesando</SelectItem>
                  <SelectItem value="completed">Completados</SelectItem>
                  <SelectItem value="rejected">Rechazados</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={refreshWithdrawals}>
                Actualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-[hsl(270,100%,60%,0.1)]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-48 bg-[hsl(270,100%,60%,0.1)] rounded" />
                      <div className="h-3 w-32 bg-[hsl(270,100%,60%,0.05)] rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-12 w-12 text-emerald-400/30 mb-4" />
              <p className="text-[hsl(270,30%,60%)]">No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawals.map((withdrawal, index) => {
                const profile = (withdrawal as any).profiles;

                return (
                  <motion.div
                    key={withdrawal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={cn(
                      'p-4 rounded-xl transition-all',
                      'bg-[hsl(270,100%,60%,0.03)] hover:bg-[hsl(270,100%,60%,0.08)]',
                      'border border-transparent hover:border-[hsl(270,100%,60%,0.1)]'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      {/* User info */}
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback>
                          <User className="h-6 w-6" />
                        </AvatarFallback>
                      </Avatar>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white truncate">
                            {profile?.full_name || 'Usuario'}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn('text-[10px]', withdrawal.statusColor)}
                          >
                            {withdrawal.statusLabel}
                          </Badge>
                        </div>
                        <p className="text-sm text-[hsl(270,30%,60%)] truncate">
                          {profile?.email}
                        </p>
                        <p className="text-xs text-[hsl(270,30%,50%)]">
                          {withdrawal.methodLabel} • {withdrawal.paymentSummary}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          {withdrawal.formattedNetAmount}
                        </p>
                        <p className="text-xs text-[hsl(270,30%,50%)]">
                          Solicitado: {withdrawal.formattedAmount}
                        </p>
                        <p className="text-xs text-[hsl(270,30%,50%)]">
                          {withdrawal.formattedDate}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => setSelectedWithdrawal(withdrawal)}
                        >
                          Procesar
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process dialog */}
      {selectedWithdrawal && (
        <ProcessWithdrawalDialog
          withdrawal={selectedWithdrawal}
          open={!!selectedWithdrawal}
          onOpenChange={(open) => !open && setSelectedWithdrawal(null)}
          onProcess={(input) => {
            processWithdrawal(input);
            setSelectedWithdrawal(null);
          }}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
