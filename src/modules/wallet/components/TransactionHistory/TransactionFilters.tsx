import { useState } from 'react';
import { Filter, X, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  TransactionFilters as TFilters,
  TransactionType,
  TransactionStatus,
} from '../../types';
import { TRANSACTION_TYPE_LABELS, TRANSACTION_STATUS_LABELS } from '../../types';

interface TransactionFiltersProps {
  filters: TFilters;
  onFiltersChange: (filters: TFilters) => void;
  className?: string;
}

const TRANSACTION_TYPES: TransactionType[] = [
  'deposit',
  'withdrawal',
  'transfer_in',
  'transfer_out',
  'escrow_hold',
  'escrow_release',
  'escrow_refund',
  'payment_received',
  'platform_fee',
  'adjustment',
];

const TRANSACTION_STATUSES: TransactionStatus[] = [
  'pending',
  'completed',
  'failed',
  'cancelled',
  'reversed',
];

export function TransactionFilters({
  filters,
  onFiltersChange,
  className,
}: TransactionFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFilterCount = [
    filters.types?.length,
    filters.status,
    filters.dateFrom,
    filters.dateTo,
    filters.minAmount,
    filters.maxAmount,
  ].filter(Boolean).length;

  const clearFilters = () => {
    onFiltersChange({});
  };

  const toggleType = (type: TransactionType) => {
    const currentTypes = filters.types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    onFiltersChange({ ...filters, types: newTypes.length ? newTypes : undefined });
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2', className)}
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-white">Filtrar Transacciones</h4>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          {/* Transaction Types */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Tipo de Transacción</Label>
            <div className="flex flex-wrap gap-1.5">
              {TRANSACTION_TYPES.map(type => (
                <Badge
                  key={type}
                  variant={filters.types?.includes(type) ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  onClick={() => toggleType(type)}
                >
                  {TRANSACTION_TYPE_LABELS[type]}
                </Badge>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Estado</Label>
            <Select
              value={filters.status || ''}
              onValueChange={(value) =>
                onFiltersChange({
                  ...filters,
                  status: value ? (value as TransactionStatus) : undefined,
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los estados</SelectItem>
                {TRANSACTION_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {TRANSACTION_STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Desde</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      dateFrom: e.target.value || undefined,
                    })
                  }
                  className="h-9 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Hasta</Label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      dateTo: e.target.value || undefined,
                    })
                  }
                  className="h-9 pl-9"
                />
              </div>
            </div>
          </div>

          {/* Amount Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Monto Mín</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  value={filters.minAmount || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      minAmount: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-9 pl-9"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Monto Máx</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  min="0"
                  value={filters.maxAmount || ''}
                  onChange={(e) =>
                    onFiltersChange({
                      ...filters,
                      maxAmount: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="h-9 pl-9"
                  placeholder="∞"
                />
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
