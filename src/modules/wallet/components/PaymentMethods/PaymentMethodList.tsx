import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, CreditCard, ExternalLink, CheckCircle2, Loader2, Construction } from 'lucide-react';
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
            <div className="p-2 rounded-sm bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
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
                className="p-4 rounded-sm bg-[hsl(270,100%,60%,0.05)] animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-sm bg-[hsl(270,100%,60%,0.1)]" />
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
      {/* Stripe Connect Section — development mode */}
      {wallet && (
        <Card className={cn('mb-4 opacity-75', className)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-sm bg-gradient-to-br from-indigo-500/20 to-purple-500/10">
                  <CreditCard className="h-5 w-5 text-indigo-400" />
                </div>
                <div>
                  <p className="font-medium">Stripe Connect</p>
                  <p className="text-xs text-muted-foreground">
                    Conecta tu cuenta para retiros instantaneos
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                  <Construction className="h-3 w-3 mr-1" />
                  En desarrollo
                </Badge>
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
              <div className="p-2 rounded-sm bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
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
