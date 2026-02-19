import { motion } from 'framer-motion';
import { TrendingUp, Clock, Lock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { WalletDisplay } from '../../types';

interface BalanceBreakdownProps {
  wallet: WalletDisplay | null;
  className?: string;
}

interface BalanceSegment {
  key: string;
  label: string;
  value: number;
  formatted: string;
  color: string;
  bgColor: string;
  icon: React.ComponentType<{ className?: string }>;
  tooltip: string;
}

export function BalanceBreakdown({ wallet, className }: BalanceBreakdownProps) {
  if (!wallet) return null;

  const total = wallet.balance.total || 1; // Prevent division by zero

  const segments: BalanceSegment[] = [
    {
      key: 'available',
      label: 'Disponible',
      value: wallet.available_balance,
      formatted: wallet.formattedAvailable,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-500/10',
      icon: TrendingUp,
      tooltip: 'Fondos que puedes retirar o usar inmediatamente',
    },
    {
      key: 'pending',
      label: 'Pendiente',
      value: wallet.pending_balance,
      formatted: wallet.formattedPending,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-500/10',
      icon: Clock,
      tooltip: 'Fondos en proceso de retiro o liberación',
    },
    {
      key: 'reserved',
      label: 'Reservado',
      value: wallet.reserved_balance,
      formatted: wallet.formattedReserved,
      color: 'bg-[hsl(270,100%,60%)]',
      bgColor: 'bg-[hsl(270,100%,60%,0.1)]',
      icon: Lock,
      tooltip: 'Fondos comprometidos en campañas activas (escrow)',
    },
  ];

  // Calculate percentages
  const segmentsWithPercentage = segments.map((segment) => ({
    ...segment,
    percentage: total > 0 ? (segment.value / total) * 100 : 0,
  }));

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[hsl(270,100%,60%,0.1)]">
            <Info className="h-4 w-4 text-primary" />
          </div>
          Desglose de Fondos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="relative h-3 rounded-full overflow-hidden bg-[hsl(270,100%,60%,0.1)]">
          <TooltipProvider>
            {segmentsWithPercentage.map((segment, index) => {
              // Calculate offset
              const offset = segmentsWithPercentage
                .slice(0, index)
                .reduce((acc, s) => acc + s.percentage, 0);

              if (segment.percentage <= 0) return null;

              return (
                <Tooltip key={segment.key}>
                  <TooltipTrigger asChild>
                    <motion.div
                      className={cn('absolute h-full', segment.color)}
                      initial={{ width: 0 }}
                      animate={{ width: `${segment.percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      style={{ left: `${offset}%` }}
                    />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {segment.label}: {segment.formatted} ({segment.percentage.toFixed(1)}%)
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>

        {/* Legend */}
        <div className="space-y-3">
          {segmentsWithPercentage.map((segment) => {
            const Icon = segment.icon;

            return (
              <motion.div
                key={segment.key}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-lg', segment.bgColor)}>
                    <Icon className={cn('h-4 w-4', segment.color.replace('bg-', 'text-').replace('-500', '-400'))} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{segment.label}</span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right" className="max-w-xs">
                            <p className="text-xs">{segment.tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {segment.percentage.toFixed(1)}% del total
                    </span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-white">{segment.formatted}</span>
              </motion.div>
            );
          })}
        </div>

        {/* Total */}
        <div className="pt-3 border-t border-[hsl(270,100%,60%,0.1)]">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance Total</span>
            <span className="text-lg font-bold bg-gradient-to-r from-white to-[hsl(270,100%,80%)] bg-clip-text text-transparent">
              {wallet.formattedTotal}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
