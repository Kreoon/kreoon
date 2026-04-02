import { User, Film, Building2, HelpCircle, Clock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { EscrowDisplay, Currency } from '../../types';
import { formatCurrency } from '../../types';

interface Recipient {
  type: 'creator' | 'editor' | 'platform';
  name?: string;
  username?: string;
  avatarUrl?: string;
  amount: number;
  percentage: number;
  status: 'pending' | 'released' | 'unassigned';
}

interface EscrowDistributionProps {
  escrow: EscrowDisplay;
  size?: 'compact' | 'full';
  showStatus?: boolean;
  className?: string;
}

export function EscrowDistribution({
  escrow,
  size = 'full',
  showStatus = true,
  className,
}: EscrowDistributionProps) {
  const recipients: Recipient[] = [
    {
      type: 'creator',
      name: (escrow as any).creator?.full_name,
      username: (escrow as any).creator?.username,
      avatarUrl: (escrow as any).creator?.avatar_url,
      amount: escrow.creator_amount,
      percentage: escrow.creator_percentage,
      status: escrow.creator_id
        ? escrow.status === 'released'
          ? 'released'
          : 'pending'
        : 'unassigned',
    },
    {
      type: 'editor',
      name: (escrow as any).editor?.full_name,
      username: (escrow as any).editor?.username,
      avatarUrl: (escrow as any).editor?.avatar_url,
      amount: escrow.editor_amount,
      percentage: escrow.editor_percentage,
      status: escrow.editor_id
        ? escrow.status === 'released'
          ? 'released'
          : 'pending'
        : 'unassigned',
    },
    {
      type: 'platform',
      name: 'Kreoon',
      amount: escrow.platform_fee,
      percentage: escrow.platform_percentage,
      status: escrow.status === 'released' ? 'released' : 'pending',
    },
  ];

  const currency = escrow.currency;

  if (size === 'compact') {
    return (
      <CompactDistribution
        recipients={recipients}
        currency={currency}
        className={className}
      />
    );
  }

  return (
    <FullDistribution
      recipients={recipients}
      totalAmount={escrow.total_amount}
      currency={currency}
      showStatus={showStatus}
      className={className}
    />
  );
}

// Compact version for cards
function CompactDistribution({
  recipients,
  currency,
  className,
}: {
  recipients: Recipient[];
  currency: Currency;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 flex-wrap text-xs', className)}>
      {recipients.map((r, index) => (
        <span key={r.type} className="flex items-center gap-1">
          <span
            className={cn(
              'font-medium',
              r.type === 'creator' && 'text-emerald-400',
              r.type === 'editor' && 'text-blue-400',
              r.type === 'platform' && 'text-primary'
            )}
          >
            {r.type === 'creator' ? 'Creador' : r.type === 'editor' ? 'Editor' : 'Fee'}:
          </span>
          <span className="text-white">
            {formatCurrency(r.amount, currency)}
          </span>
          <span className="text-muted-foreground">({r.percentage}%)</span>
          {index < recipients.length - 1 && (
            <span className="text-[hsl(270,30%,40%)] mx-1">│</span>
          )}
        </span>
      ))}
    </div>
  );
}

// Full version for drawer/detail view
function FullDistribution({
  recipients,
  totalAmount,
  currency,
  showStatus,
  className,
}: {
  recipients: Recipient[];
  totalAmount: number;
  currency: Currency;
  showStatus: boolean;
  className?: string;
}) {
  const getIcon = (type: Recipient['type']) => {
    switch (type) {
      case 'creator':
        return User;
      case 'editor':
        return Film;
      case 'platform':
        return Building2;
    }
  };

  const getLabel = (type: Recipient['type']) => {
    switch (type) {
      case 'creator':
        return 'Creador';
      case 'editor':
        return 'Editor';
      case 'platform':
        return 'Comisión Plataforma';
    }
  };

  const getColor = (type: Recipient['type']) => {
    switch (type) {
      case 'creator':
        return 'bg-emerald-500';
      case 'editor':
        return 'bg-blue-500';
      case 'platform':
        return 'bg-[hsl(270,100%,60%)]';
    }
  };

  const getTextColor = (type: Recipient['type']) => {
    switch (type) {
      case 'creator':
        return 'text-emerald-400';
      case 'editor':
        return 'text-blue-400';
      case 'platform':
        return 'text-primary';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Distribution bar */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-white">Distribución de Fondos</p>
        <div className="h-3 rounded-full overflow-hidden flex bg-[hsl(270,100%,60%,0.1)]">
          {recipients.map((r, index) => (
            <div
              key={r.type}
              className={cn(
                'h-full transition-all',
                getColor(r.type),
                index === 0 && 'rounded-l-full',
                index === recipients.length - 1 && 'rounded-r-full'
              )}
              style={{ width: `${r.percentage}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          {recipients.map(r => (
            <span key={r.type}>{r.percentage}%</span>
          ))}
        </div>
      </div>

      {/* Recipients list */}
      <div className="space-y-3">
        {recipients.map(r => {
          const Icon = getIcon(r.type);

          return (
            <div
              key={r.type}
              className="p-3 rounded-sm bg-[hsl(270,100%,60%,0.03)] border border-[hsl(270,100%,60%,0.05)]"
            >
              <div className="flex items-center gap-3">
                {/* Avatar/Icon */}
                {r.type === 'platform' ? (
                  <div className="p-2 rounded-sm bg-[hsl(270,100%,60%,0.1)]">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                ) : r.status === 'unassigned' ? (
                  <div className="p-2 rounded-sm bg-[hsl(270,100%,60%,0.05)]">
                    <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  </div>
                ) : (
                  <Avatar className="h-10 w-10">
                    {r.avatarUrl && <AvatarImage src={r.avatarUrl} />}
                    <AvatarFallback>
                      <Icon className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs', getTextColor(r.type))}>
                      {getLabel(r.type)}
                    </span>
                    {showStatus && (
                      <StatusBadge status={r.status} />
                    )}
                  </div>
                  <p className="font-medium text-white truncate">
                    {r.status === 'unassigned'
                      ? 'Por asignar'
                      : r.name || (r.username ? `@${r.username}` : r.type === 'platform' ? 'Kreoon' : 'Usuario')}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className={cn('font-semibold', getTextColor(r.type))}>
                    {formatCurrency(r.amount, currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.percentage}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-3 border-t border-[hsl(270,100%,60%,0.1)]">
        <span className="text-sm text-muted-foreground">Total en Escrow</span>
        <span className="text-lg font-bold text-white">
          {formatCurrency(totalAmount, currency)}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Recipient['status'] }) {
  if (status === 'released') {
    return (
      <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10 gap-1">
        <CheckCircle className="h-2.5 w-2.5" />
        Liberado
      </Badge>
    );
  }
  if (status === 'unassigned') {
    return (
      <Badge variant="outline" className="text-[10px] border-[hsl(270,30%,40%)] text-muted-foreground gap-1">
        <HelpCircle className="h-2.5 w-2.5" />
        Sin asignar
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10 gap-1">
      <Clock className="h-2.5 w-2.5" />
      Pendiente
    </Badge>
  );
}
