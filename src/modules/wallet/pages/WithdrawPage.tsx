import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WithdrawalForm, WithdrawalList } from '../components/Withdrawals';
import { useWallet, useWithdrawals } from '../hooks';

export function WithdrawPage() {
  const navigate = useNavigate();
  const { walletDisplay, isLoading: isWalletLoading } = useWallet();
  const { withdrawals, isLoading: isWithdrawalsLoading } = useWithdrawals({
    walletId: walletDisplay?.id,
  });

  if (isWalletLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-[hsl(270,100%,60%,0.1)] rounded" />
          <div className="h-[400px] bg-[hsl(270,100%,60%,0.05)] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!walletDisplay) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-[hsl(270,30%,60%)]">No tienes un wallet activo</p>
          <Button className="mt-4" onClick={() => navigate('/wallet')}>
            Ir a Wallet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/wallet')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Wallet
        </Button>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-[hsl(270,100%,85%)] to-[hsl(270,100%,70%)] bg-clip-text text-transparent">
          Retirar Fondos
        </h1>
        <p className="text-[hsl(270,30%,60%)] mt-1">
          Solicita un retiro de tu balance disponible
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WithdrawalForm
          wallet={walletDisplay}
          onSuccess={() => navigate('/wallet')}
          onCancel={() => navigate('/wallet')}
        />

        <div>
          <h2 className="text-lg font-semibold text-white mb-4">
            Solicitudes Recientes
          </h2>
          <WithdrawalList
            withdrawals={withdrawals.slice(0, 5)}
            isLoading={isWithdrawalsLoading}
          />
        </div>
      </div>
    </div>
  );
}
