import { WalletDashboard } from '../components/WalletDashboard';

export function WalletPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-[hsl(270,100%,85%)] to-[hsl(270,100%,70%)] bg-clip-text text-transparent">
          Mi Wallet
        </h1>
        <p className="text-[hsl(270,30%,60%)] mt-1">
          Gestiona tu balance, retiros y transacciones
        </p>
      </div>

      <WalletDashboard />
    </div>
  );
}
