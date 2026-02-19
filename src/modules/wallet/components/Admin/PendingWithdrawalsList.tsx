import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Loader2,
  User,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  Play,
  Square,
  CheckSquare,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useAdminWithdrawals } from '../../hooks/useWithdrawals';
import { ProcessWithdrawalDrawer } from './ProcessWithdrawalDrawer';
import { RejectWithdrawalModal } from './RejectWithdrawalModal';
import type { WithdrawalDisplay, WithdrawalStatus } from '../../types';

interface PendingWithdrawalsListProps {
  status?: WithdrawalStatus[];
  className?: string;
}

export function PendingWithdrawalsList({
  status: initialStatus = ['pending', 'processing'],
  className,
}: PendingWithdrawalsListProps) {
  const [statusFilter, setStatusFilter] = useState<WithdrawalStatus[]>(initialStatus);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalDisplay | null>(null);
  const [rejectingWithdrawal, setRejectingWithdrawal] = useState<WithdrawalDisplay | null>(null);

  const {
    withdrawals,
    isLoading,
    refreshWithdrawals,
    processWithdrawal,
    isProcessing,
  } = useAdminWithdrawals({ status: statusFilter });

  // Filter by search
  const filteredWithdrawals = useMemo(() => {
    if (!searchQuery) return withdrawals;
    const query = searchQuery.toLowerCase();
    return withdrawals.filter(w => {
      const profile = (w as any).profiles;
      return (
        w.id.toLowerCase().includes(query) ||
        profile?.email?.toLowerCase().includes(query) ||
        profile?.full_name?.toLowerCase().includes(query) ||
        w.paymentSummary.toLowerCase().includes(query)
      );
    });
  }, [withdrawals, searchQuery]);

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredWithdrawals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWithdrawals.map(w => w.id)));
    }
  };

  const handleProcess = (withdrawal: WithdrawalDisplay) => {
    setSelectedWithdrawal(withdrawal);
  };

  const handleReject = (withdrawal: WithdrawalDisplay) => {
    setRejectingWithdrawal(withdrawal);
  };

  const handleProcessSubmit = (input: any) => {
    processWithdrawal(input, {
      onSuccess: () => {
        setSelectedWithdrawal(null);
        setRejectingWithdrawal(null);
        selectedIds.delete(input.withdrawal_id);
        setSelectedIds(new Set(selectedIds));
      },
    });
  };

  const handleRejectSubmit = (reason: string) => {
    if (!rejectingWithdrawal) return;
    handleProcessSubmit({
      withdrawal_id: rejectingWithdrawal.id,
      status: 'rejected',
      rejection_reason: reason,
    });
  };

  const allSelected = filteredWithdrawals.length > 0 && selectedIds.size === filteredWithdrawals.length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuario, email..."
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
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshWithdrawals}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-[hsl(270,100%,60%,0.05)] animate-pulse">
                  <div className="h-5 w-5 rounded bg-[hsl(270,100%,60%,0.1)]" />
                  <div className="h-10 w-10 rounded-full bg-[hsl(270,100%,60%,0.1)]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-[hsl(270,100%,60%,0.1)] rounded" />
                    <div className="h-3 w-32 bg-[hsl(270,100%,60%,0.05)] rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredWithdrawals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <CheckCircle className="h-12 w-12 text-emerald-400/30 mb-4" />
              <p className="text-muted-foreground">No hay solicitudes pendientes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={selectAll}
                      />
                    </TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead className="hidden md:table-cell">Método</TableHead>
                    <TableHead className="hidden lg:table-cell">Destino</TableHead>
                    <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWithdrawals.map((withdrawal, index) => {
                    const profile = (withdrawal as any).profiles;
                    const isSelected = selectedIds.has(withdrawal.id);

                    return (
                      <motion.tr
                        key={withdrawal.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={cn(
                          'group',
                          isSelected && 'bg-[hsl(270,100%,60%,0.05)]'
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(withdrawal.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={profile?.avatar_url} />
                              <AvatarFallback>
                                <User className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-white truncate max-w-[150px]">
                                {profile?.full_name || 'Usuario'}
                              </p>
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {profile?.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-white">
                              {withdrawal.formattedNetAmount}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              (Total: {withdrawal.formattedAmount})
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {withdrawal.methodLabel.split(' ')[0]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                            {withdrawal.paymentSummary}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <p className="text-xs text-muted-foreground">
                            {withdrawal.formattedDate}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px]',
                              withdrawal.status === 'pending' && 'border-amber-500/30 text-amber-400',
                              withdrawal.status === 'processing' && 'border-blue-500/30 text-blue-400'
                            )}
                          >
                            {withdrawal.status === 'processing' && (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            )}
                            {withdrawal.status === 'pending' && (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {withdrawal.statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                              onClick={() => handleProcess(withdrawal)}
                              title="Procesar"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => handleReject(withdrawal)}
                              title="Rechazar"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Process drawer */}
      <ProcessWithdrawalDrawer
        withdrawal={selectedWithdrawal}
        open={!!selectedWithdrawal}
        onClose={() => setSelectedWithdrawal(null)}
        onProcess={handleProcessSubmit}
        isProcessing={isProcessing}
      />

      {/* Reject modal */}
      <RejectWithdrawalModal
        withdrawal={rejectingWithdrawal}
        open={!!rejectingWithdrawal}
        onClose={() => setRejectingWithdrawal(null)}
        onReject={handleRejectSubmit}
        isProcessing={isProcessing}
      />
    </div>
  );
}
