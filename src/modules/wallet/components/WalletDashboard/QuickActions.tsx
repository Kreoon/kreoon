import { ArrowUpCircle, ArrowDownCircle, Send, History, Settings, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { WalletDisplay } from '../../types';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
}

interface QuickActionsProps {
  wallet: WalletDisplay | null;
  onWithdraw?: () => void;
  onDeposit?: () => void;
  onTransfer?: () => void;
  onHistory?: () => void;
  onSettings?: () => void;
  onPaymentMethods?: () => void;
  className?: string;
}

export function QuickActions({
  wallet,
  onWithdraw,
  onDeposit,
  onTransfer,
  onHistory,
  onSettings,
  onPaymentMethods,
  className,
}: QuickActionsProps) {
  const hasBalance = wallet && wallet.available_balance > 0;

  const actions: QuickAction[] = [
    {
      id: 'withdraw',
      label: 'Retirar',
      icon: <ArrowUpCircle className="h-5 w-5" />,
      onClick: onWithdraw || (() => {}),
      disabled: !hasBalance || !onWithdraw,
      variant: 'default',
    },
    {
      id: 'deposit',
      label: 'Depositar',
      icon: <ArrowDownCircle className="h-5 w-5" />,
      onClick: onDeposit || (() => {}),
      disabled: !onDeposit,
      variant: 'outline',
    },
    {
      id: 'transfer',
      label: 'Transferir',
      icon: <Send className="h-5 w-5" />,
      onClick: onTransfer || (() => {}),
      disabled: !hasBalance || !onTransfer,
      variant: 'outline',
    },
    {
      id: 'history',
      label: 'Historial',
      icon: <History className="h-5 w-5" />,
      onClick: onHistory || (() => {}),
      disabled: !onHistory,
      variant: 'ghost',
    },
    {
      id: 'payment-methods',
      label: 'Métodos de Pago',
      icon: <CreditCard className="h-5 w-5" />,
      onClick: onPaymentMethods || (() => {}),
      disabled: !onPaymentMethods,
      variant: 'ghost',
    },
    {
      id: 'settings',
      label: 'Configuración',
      icon: <Settings className="h-5 w-5" />,
      onClick: onSettings || (() => {}),
      disabled: !onSettings,
      variant: 'ghost',
    },
  ];

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {actions.map(action => (
            <Button
              key={action.id}
              variant={action.variant}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                'h-auto py-4 flex flex-col gap-2 w-full',
                action.disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {action.icon}
              <span className="text-xs">{action.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Compact version for sidebars
export function QuickActionsCompact({
  wallet,
  onWithdraw,
  onHistory,
  className,
}: Pick<QuickActionsProps, 'wallet' | 'onWithdraw' | 'onHistory' | 'className'>) {
  const hasBalance = wallet && wallet.available_balance > 0;

  return (
    <div className={cn('flex gap-2', className)}>
      <Button
        variant="default"
        size="sm"
        onClick={onWithdraw}
        disabled={!hasBalance || !onWithdraw}
        className="flex-1"
      >
        <ArrowUpCircle className="h-4 w-4 mr-1.5" />
        Retirar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onHistory}
        disabled={!onHistory}
        className="flex-1"
      >
        <History className="h-4 w-4 mr-1.5" />
        Historial
      </Button>
    </div>
  );
}
