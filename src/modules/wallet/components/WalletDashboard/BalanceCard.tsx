import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Lock, Clock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WalletDisplay } from '../../types';

interface BalanceCardProps {
  wallet: WalletDisplay | null;
  isLoading?: boolean;
  showBreakdown?: boolean;
  className?: string;
}

export function BalanceCard({ wallet, isLoading, showBreakdown = true, className }: BalanceCardProps) {
  const [isHidden, setIsHidden] = useState(false);

  if (isLoading) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 bg-[hsl(270,100%,60%,0.1)] rounded animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-12 w-48 bg-[hsl(270,100%,60%,0.1)] rounded animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-[hsl(270,100%,60%,0.05)] rounded-sm animate-pulse" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!wallet) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Wallet className="h-12 w-12 text-[hsl(270,100%,60%,0.3)] mb-4" />
          <p className="text-muted-foreground">No tienes un wallet activo</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      {/* Decorative gradient orb */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-[hsl(270,100%,60%,0.15)] rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-sm bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <span>Mi Wallet</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsHidden(!isHidden)}
            className="h-8 w-8"
          >
            {isHidden ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-6">
          {/* Total Balance */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Balance Total</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={isHidden ? 'hidden' : 'visible'}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
              >
                {isHidden ? (
                  <div className="text-4xl font-bold text-white">•••••••</div>
                ) : (
                  <div className="text-4xl font-bold bg-gradient-to-r from-white via-[hsl(270,100%,85%)] to-[hsl(270,100%,70%)] bg-clip-text text-transparent">
                    {wallet.formattedTotal}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Balance Breakdown */}
          {showBreakdown && !isHidden && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              {/* Available */}
              <div className="p-3 rounded-sm bg-[hsl(270,100%,60%,0.08)] border border-[hsl(270,100%,60%,0.1)]">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-xs text-muted-foreground">Disponible</span>
                </div>
                <p className="text-lg font-semibold text-emerald-400">
                  {wallet.formattedAvailable}
                </p>
              </div>

              {/* Pending */}
              <div className="p-3 rounded-sm bg-[hsl(270,100%,60%,0.08)] border border-[hsl(270,100%,60%,0.1)]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs text-muted-foreground">Pendiente</span>
                </div>
                <p className="text-lg font-semibold text-amber-400">
                  {wallet.formattedPending}
                </p>
              </div>

              {/* Reserved */}
              <div className="p-3 rounded-sm bg-[hsl(270,100%,60%,0.08)] border border-[hsl(270,100%,60%,0.1)]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">Reservado</span>
                </div>
                <p className="text-lg font-semibold text-primary">
                  {wallet.formattedReserved}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
