import { useImpersonation } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Building2, User, Shield, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ImpersonationBanner() {
  const { isImpersonating, impersonationTarget, stopImpersonation, isReadOnlyMode } = useImpersonation();

  if (!isImpersonating) return null;

  const { clientName, role, userName } = impersonationTarget;

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the fixed banner */}
      <div className="h-12" />
      
      <div className={cn(
        "fixed top-0 left-0 right-0 z-[100] bg-amber-500/95 backdrop-blur-sm",
        "border-b-2 border-amber-600 shadow-lg"
      )}>
        <div className="max-w-screen-2xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-900" />
              <span className="font-semibold text-amber-900">Modo Simulación</span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {clientName && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300">
                  <Building2 className="h-3 w-3 mr-1" />
                  {clientName}
                </Badge>
              )}
              
              {role && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300">
                  <Shield className="h-3 w-3 mr-1" />
                  {getRoleLabel(role)}
                </Badge>
              )}
              
              {userName && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-300">
                  <User className="h-3 w-3 mr-1" />
                  {userName}
                </Badge>
              )}
            </div>

            {isReadOnlyMode && (
              <div className="flex items-center gap-1.5 text-amber-900/80 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Solo lectura - Las acciones están bloqueadas</span>
              </div>
            )}
          </div>

          <Button
            onClick={stopImpersonation}
            variant="secondary"
            size="sm"
            className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300 shrink-0"
          >
            <EyeOff className="h-4 w-4 mr-2" />
            Salir de simulación
          </Button>
        </div>
      </div>
    </>
  );
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    creator: 'Creador',
    editor: 'Editor',
    client: 'Cliente',
    ambassador: 'Embajador',
    strategist: 'Estratega',
  };
  return labels[role] || role;
}
