import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionHistory } from '../components/TransactionHistory';
import { useWallet } from '../hooks';

export function TransactionsPage() {
  const navigate = useNavigate();
  const { walletDisplay, isLoading } = useWallet();

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-[hsl(270,100%,60%,0.1)] rounded" />
          <div className="h-[600px] bg-[hsl(270,100%,60%,0.05)] rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!walletDisplay) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
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
    <div className="container mx-auto py-6 px-4 max-w-7xl">
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
          Historial de Transacciones
        </h1>
        <p className="text-[hsl(270,30%,60%)] mt-1">
          Todas las transacciones de tu wallet
        </p>
      </div>

      <TransactionHistory walletId={walletDisplay.id} currency={walletDisplay.currency} />
    </div>
  );
}
