import { useState } from 'react';
import { useImpersonation, useImpersonationData, ImpersonationTarget } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Building2, User, Shield, AlertTriangle, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppRole } from '@/types/database';

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'strategist', label: 'Estratega' },
  { value: 'creator', label: 'Creador' },
  { value: 'editor', label: 'Editor' },
  { value: 'client', label: 'Cliente' },
  { value: 'ambassador', label: 'Embajador' },
];

export function ImpersonationBanner() {
  const { isImpersonating, impersonationTarget, stopImpersonation, startImpersonation } = useImpersonation();
  const { clients, users } = useImpersonationData();
  const [isEditing, setIsEditing] = useState(false);

  if (!isImpersonating) return null;

  const { clientId, clientName, role, userId, userName } = impersonationTarget;

  const handleClientChange = (value: string) => {
    const newClientId = value === '__none__' ? null : value;
    const newClientName = newClientId ? clients.find(c => c.id === newClientId)?.name || null : null;
    
    const newTarget: ImpersonationTarget = {
      ...impersonationTarget,
      clientId: newClientId,
      clientName: newClientName,
    };
    startImpersonation(newTarget);
  };

  const handleRoleChange = (value: string) => {
    const newTarget: ImpersonationTarget = {
      ...impersonationTarget,
      role: value as AppRole,
    };
    startImpersonation(newTarget);
  };

  const handleUserChange = (value: string) => {
    const newUserId = value === '__none__' ? null : value;
    const newUserName = newUserId ? users.find(u => u.id === newUserId)?.full_name || null : null;
    
    const newTarget: ImpersonationTarget = {
      ...impersonationTarget,
      userId: newUserId,
      userName: newUserName,
    };
    startImpersonation(newTarget);
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the fixed banner */}
      <div className={cn("transition-all", isEditing ? "h-24" : "h-12")} />
      
      <div className={cn(
        "fixed top-0 left-0 right-0 z-[100] bg-amber-500/95 backdrop-blur-sm",
        "border-b-2 border-amber-600 shadow-lg"
      )}>
        <div className="max-w-screen-2xl mx-auto px-4 py-2">
          {/* Main row */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-amber-900" />
                <span className="font-semibold text-amber-900">Modo Simulación</span>
              </div>
              
              {!isEditing && (
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
              )}

              <div className="flex items-center gap-1.5 text-amber-900/80 text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">Los cambios son reales</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={() => setIsEditing(!isEditing)}
                variant="secondary"
                size="sm"
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
              >
                <Settings2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{isEditing ? 'Cerrar' : 'Cambiar'}</span>
              </Button>
              
              <Button
                onClick={stopImpersonation}
                variant="secondary"
                size="sm"
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
              >
                <EyeOff className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Salir</span>
              </Button>
            </div>
          </div>

          {/* Edit row */}
          {isEditing && (
            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-amber-600/30 flex-wrap">
              {/* Client selector */}
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-amber-900" />
                <Select value={clientId || '__none__'} onValueChange={handleClientChange}>
                  <SelectTrigger className="w-[160px] h-8 bg-amber-100 border-amber-300 text-amber-900 text-sm">
                    <SelectValue placeholder="Sin negocio" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin negocio</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role selector */}
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-900" />
                <Select value={role || ''} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-[130px] h-8 bg-amber-100 border-amber-300 text-amber-900 text-sm">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User selector */}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-amber-900" />
                <Select value={userId || '__none__'} onValueChange={handleUserChange}>
                  <SelectTrigger className="w-[180px] h-8 bg-amber-100 border-amber-300 text-amber-900 text-sm">
                    <SelectValue placeholder="Usuario genérico" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__none__">Usuario genérico</SelectItem>
                    {users.slice(0, 50).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
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
