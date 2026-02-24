import { Construction } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface UnderConstructionGuardProps {
  moduleName: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * Wraps a module page so only platform admins can use it.
 * Non-platform-admin users see a clean "En Construcción" screen.
 */
export function UnderConstructionGuard({ moduleName, description, children }: UnderConstructionGuardProps) {
  const { isPlatformAdmin } = useAuth();

  if (isPlatformAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
      <div className="p-4 rounded-full bg-amber-500/10">
        <Construction className="h-12 w-12 text-amber-500" />
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">{moduleName}</h2>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          En construccion
        </Badge>
      </div>
      <p className="text-muted-foreground max-w-md">
        {description || `Este modulo esta actualmente en desarrollo. Pronto estara disponible para todos los usuarios.`}
      </p>
    </div>
  );
}
