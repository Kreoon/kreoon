/**
 * AccountBlockedBanner - Banner que se muestra cuando una cuenta esta bloqueada
 *
 * Muestra informacion sobre el bloqueo y opciones para regularizar la situacion.
 */

import { AlertTriangle, CreditCard, Building2, XCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { BlockType } from '@/hooks/useAccountBlock';
import { getBlockTypeMessage, getBlockTypeTitle } from '@/hooks/useAccountBlock';

interface AccountBlockedBannerProps {
  blockType: BlockType | null;
  blockReason?: string | null;
  blockedSince?: Date | null;
  className?: string;
  onContactSupport?: () => void;
  onUpdatePayment?: () => void;
}

/**
 * Banner de cuenta bloqueada
 *
 * @example
 * ```tsx
 * <AccountBlockedBanner
 *   blockType="client_payment_default"
 *   blockReason="Factura de febrero vencida"
 *   onContactSupport={() => window.open('mailto:soporte@kreoon.com')}
 * />
 * ```
 */
export function AccountBlockedBanner({
  blockType,
  blockReason,
  blockedSince,
  className,
  onContactSupport,
  onUpdatePayment,
}: AccountBlockedBannerProps) {
  const title = getBlockTypeTitle(blockType);
  const message = blockReason || getBlockTypeMessage(blockType);

  const getIcon = () => {
    switch (blockType) {
      case 'client_payment_default':
        return <XCircle className="h-5 w-5" />;
      case 'organization_payment_default':
        return <Building2 className="h-5 w-5" />;
      case 'organization_no_payment_method':
        return <CreditCard className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  const formatDate = (date: Date | null | undefined) => {
    if (!date) return null;
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(date);
  };

  return (
    <Alert
      variant="destructive"
      className={cn(
        'border-destructive/50 bg-destructive/10',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5 text-destructive">
          {getIcon()}
        </div>
        <div className="flex-1 space-y-2">
          <AlertTitle className="text-destructive font-semibold">
            {title}
          </AlertTitle>
          <AlertDescription className="text-destructive/90">
            {message}
          </AlertDescription>

          {blockedSince && (
            <p className="text-xs text-destructive/70">
              Bloqueado desde: {formatDate(blockedSince)}
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {blockType === 'organization_no_payment_method' && onUpdatePayment && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onUpdatePayment}
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Agregar metodo de pago
              </Button>
            )}

            {(blockType === 'client_payment_default' ||
              blockType === 'organization_payment_default') && onUpdatePayment && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onUpdatePayment}
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Regularizar pago
              </Button>
            )}

            {onContactSupport && (
              <Button
                size="sm"
                variant="outline"
                onClick={onContactSupport}
                className="border-destructive/30 text-destructive hover:bg-destructive/10"
              >
                Contactar soporte
              </Button>
            )}
          </div>
        </div>
      </div>
    </Alert>
  );
}

/**
 * Variante compacta del banner para usar en headers o sidebars
 */
export function AccountBlockedBadge({
  blockType,
  onClick,
}: {
  blockType: BlockType | null;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-destructive/10 text-destructive text-sm font-medium',
        'hover:bg-destructive/20 transition-colors',
        'border border-destructive/20'
      )}
    >
      <XCircle className="h-4 w-4" />
      <span>{getBlockTypeTitle(blockType)}</span>
    </button>
  );
}

export default AccountBlockedBanner;
