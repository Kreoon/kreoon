import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, CreditCard, ExternalLink, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PaymentMethodCard } from './PaymentMethodCard';
import { PaymentMethodDrawer } from './PaymentMethodDrawer';
import { usePaymentMethods, usePaymentMethodMutations, type PaymentMethodDisplay } from '../../hooks/usePaymentMethods';
import { useStripeConnect } from '../../hooks/useStripeConnect';
import { useWallet } from '../../hooks/useWallet';
import { NoPaymentMethodsState } from '../common';

interface PaymentMethodListProps {
  className?: string;
}

export function PaymentMethodList({ className }: PaymentMethodListProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethodDisplay | null>(null);

  const { methods, isLoading } = usePaymentMethods();
  const {
    setDefault,
    deleteMethod,
    isSettingDefault,
    isDeleting,
  } = usePaymentMethodMutations();

  const { wallet } = useWallet();
  const {
    connectStatus,
    startOnboarding,
    isStartingOnboarding,
    getLoginLink,
    isGettingLoginLink,
    refreshOnboarding,
  } = useStripeConnect(wallet?.id || null);

  const handleEdit = (method: PaymentMethodDisplay) => {
    setEditingMethod(method);
    setDrawerOpen(true);
  };

  const handleAddNew = () => {
    setEditingMethod(null);
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    setEditingMethod(null);
  };

  if (isLoading) {
    return (
      <Card className={cn('', className)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Métodos de Pago</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-[hsl(270,100%,60%,0.05)] animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-[hsl(270,100%,60%,0.1)]" />
                  <div className="flex-1">
                    <div className="h-4 w-32 bg-[hsl(270,100%,60%,0.1)] rounded mb-2" />
                    <div className="h-3 w-24 bg-[hsl(270,100%,60%,0.05)] rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Stripe Connect Section — only show when wallet exists */}
      {wallet && (
        <Card className={cn('mb-4', className)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10">
                  <CreditCard className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Stripe Connect</p>
                  <p className="text-xs text-muted-foreground">
                    {connectStatus === 'active'
                      ? 'Recibe pagos directos a tu cuenta Stripe'
                      : 'Conecta tu cuenta para retiros instantáneos'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {connectStatus === 'active' && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                )}
                {connectStatus === 'pending' && (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Pendiente
                  </Badge>
                )}
                {connectStatus === 'active' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => getLoginLink()}
                    disabled={isGettingLoginLink}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Dashboard
                  </Button>
                ) : connectStatus === 'pending' ? (
                  <Button
                    size="sm"
                    onClick={() => refreshOnboarding()}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Completar configuración
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => startOnboarding()}
                    disabled={isStartingOnboarding}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isStartingOnboarding ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : null}
                    Conectar Stripe
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card className={cn('', className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Métodos de Pago</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {methods.length} método{methods.length !== 1 ? 's' : ''} configurado{methods.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <Button onClick={handleAddNew}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {methods.length === 0 ? (
            <NoPaymentMethodsState onAction={handleAddNew} />
          ) : (
            <div className="space-y-3">
              {methods.map((method, index) => (
                <motion.div
                  key={method.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PaymentMethodCard
                    method={method}
                    onSetDefault={setDefault}
                    onEdit={handleEdit}
                    onDelete={deleteMethod}
                    isSettingDefault={isSettingDefault}
                    isDeleting={isDeleting}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit drawer */}
      <PaymentMethodDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        editingMethod={editingMethod}
      />
    </>
  );
}
