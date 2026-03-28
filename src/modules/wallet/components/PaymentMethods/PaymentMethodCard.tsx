import { useState } from 'react';
import {
  Building2,
  Globe,
  CreditCard,
  Wallet,
  Smartphone,
  Bitcoin,
  Zap,
  Send,
  MoreVertical,
  Star,
  Trash2,
  Edit2,
  Shield,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { PaymentMethodDisplay } from '../../hooks/usePaymentMethods';
import type { PaymentMethodType } from '../../types';

const METHOD_ICONS: Record<PaymentMethodType, React.ComponentType<{ className?: string }>> = {
  bank_transfer_colombia: Building2,
  bank_transfer_international: Globe,
  paypal: CreditCard,
  payoneer: Wallet,
  nequi: Smartphone,
  daviplata: Smartphone,
  crypto: Bitcoin,
  zelle: Zap,
  wise: Send,
};

interface PaymentMethodCardProps {
  method: PaymentMethodDisplay;
  onSetDefault?: (id: string) => void;
  onEdit?: (method: PaymentMethodDisplay) => void;
  onDelete?: (id: string) => void;
  isSettingDefault?: boolean;
  isDeleting?: boolean;
  className?: string;
}

export function PaymentMethodCard({
  method,
  onSetDefault,
  onEdit,
  onDelete,
  isSettingDefault,
  isDeleting,
  className,
}: PaymentMethodCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const Icon = METHOD_ICONS[method.method_type];

  const handleDelete = () => {
    onDelete?.(method.id);
    setShowDeleteDialog(false);
  };

  return (
    <>
      <Card
        className={cn(
          'p-4 transition-all',
          'bg-[hsl(270,100%,60%,0.03)] hover:bg-[hsl(270,100%,60%,0.06)]',
          'border border-[hsl(270,100%,60%,0.1)]',
          method.is_default && 'border-[hsl(270,100%,60%,0.3)] bg-[hsl(270,100%,60%,0.05)]',
          className
        )}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className={cn(
              'p-3 rounded-sm',
              method.is_default
                ? 'bg-[hsl(270,100%,60%,0.15)]'
                : 'bg-[hsl(270,100%,60%,0.08)]'
            )}
          >
            <Icon
              className={cn(
                'h-6 w-6',
                method.is_default ? 'text-primary' : 'text-muted-foreground'
              )}
            />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="font-medium text-white truncate">{method.label}</p>
              {method.is_verified && (
                <Shield className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{method.typeLabel}</p>
            <p className="text-sm text-muted-foreground truncate mt-1">
              {method.summary}
            </p>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-3">
              {method.is_default && (
                <Badge className="bg-[hsl(270,100%,60%,0.2)] text-primary border-0">
                  <Star className="h-3 w-3 mr-1" />
                  Predeterminado
                </Badge>
              )}
              {method.is_verified && (
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-400">
                  <Shield className="h-3 w-3 mr-1" />
                  Verificado
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!method.is_default && onSetDefault && (
                <DropdownMenuItem
                  onClick={() => onSetDefault(method.id)}
                  disabled={isSettingDefault}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Establecer como predeterminado
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(method)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-red-400 focus:text-red-400"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar método de pago?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar <strong>{method.label}</strong>. Esta acción no se puede
              deshacer. Si tienes retiros pendientes usando este método, deberás seleccionar
              otro método.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeleting}
            >
              {isDeleting ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
