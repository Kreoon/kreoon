import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { PendingWithdrawals } from '../components/Admin';

export function AdminWalletsPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="flex flex-col items-center justify-center py-16">
          <Shield className="h-16 w-16 text-destructive/30 mb-4" />
          <h2 className="text-xl font-semibold text-white">Acceso Denegado</h2>
          <p className="text-[hsl(270,30%,60%)] mt-2">
            No tienes permisos para acceder a esta sección
          </p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            Ir al Inicio
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
          onClick={() => navigate('/admin')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Admin
        </Button>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-[hsl(270,100%,60%,0.2)] to-[hsl(280,100%,60%,0.1)]">
            <Wallet className="h-8 w-8 text-[hsl(270,100%,70%)]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-[hsl(270,100%,85%)] to-[hsl(270,100%,70%)] bg-clip-text text-transparent">
              Gestión de Wallets
            </h1>
            <p className="text-[hsl(270,30%,60%)] mt-1">
              Administra retiros y transacciones de la plataforma
            </p>
          </div>
        </div>
      </div>

      <PendingWithdrawals />
    </div>
  );
}
