import { useState } from 'react';
import { useImpersonation, useImpersonationData, ImpersonationTarget } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, Building2, User, Shield, AlertTriangle, Settings2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppRole } from '@/types/database';
import { useNavigate } from 'react-router-dom';

const ROLE_OPTIONS: { value: AppRole; label: string; defaultRoute: string }[] = [
  { value: 'admin', label: 'Admin', defaultRoute: '/' },
  { value: 'strategist', label: 'Estratega', defaultRoute: '/strategist-dashboard' },
  { value: 'creator', label: 'Creador', defaultRoute: '/creator-dashboard' },
  { value: 'editor', label: 'Editor', defaultRoute: '/editor-dashboard' },
  { value: 'client', label: 'Cliente', defaultRoute: '/client-dashboard' },
  { value: 'ambassador', label: 'Embajador', defaultRoute: '/creator-dashboard' },
];

export function ImpersonationBanner() {
  const { isImpersonating, impersonationTarget, stopImpersonation, startImpersonation } = useImpersonation();
  const { clients, users } = useImpersonationData();
  const [isEditing, setIsEditing] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<ImpersonationTarget>>({});
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const { clientId, clientName, role, userId, userName } = impersonationTarget;

  // Track pending changes
  const currentClientId = pendingChanges.clientId !== undefined ? pendingChanges.clientId : clientId;
  const currentRole = pendingChanges.role !== undefined ? pendingChanges.role : role;
  const currentUserId = pendingChanges.userId !== undefined ? pendingChanges.userId : userId;

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  const handleClientChange = (value: string) => {
    const newClientId = value === '__none__' ? null : value;
    const newClientName = newClientId ? clients.find(c => c.id === newClientId)?.name || null : null;
    setPendingChanges(prev => ({ ...prev, clientId: newClientId, clientName: newClientName }));
  };

  const handleRoleChange = (value: string) => {
    setPendingChanges(prev => ({ ...prev, role: value as AppRole }));
  };

  const handleUserChange = (value: string) => {
    const newUserId = value === '__none__' ? null : value;
    const newUserName = newUserId ? users.find(u => u.id === newUserId)?.full_name || null : null;
    setPendingChanges(prev => ({ ...prev, userId: newUserId, userName: newUserName }));
  };

  const handleApplyChanges = async () => {
    const newTarget: ImpersonationTarget = {
      clientId: pendingChanges.clientId !== undefined ? pendingChanges.clientId : clientId,
      clientName: pendingChanges.clientName !== undefined ? pendingChanges.clientName : clientName,
      role: pendingChanges.role !== undefined ? pendingChanges.role : role,
      userId: pendingChanges.userId !== undefined ? pendingChanges.userId : userId,
      userName: pendingChanges.userName !== undefined ? pendingChanges.userName : userName,
    };
    
    await startImpersonation(newTarget);
    setPendingChanges({});
    setIsEditing(false);

    // Navigate to the appropriate dashboard for the role
    const roleConfig = ROLE_OPTIONS.find(r => r.value === newTarget.role);
    if (roleConfig) {
      // Use navigate with state to force re-render
      navigate(roleConfig.defaultRoute, { replace: true });
      // Small timeout then navigate again to force component remount
      setTimeout(() => {
        navigate(roleConfig.defaultRoute, { replace: true });
      }, 50);
    }
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
                <Select value={currentClientId || '__none__'} onValueChange={handleClientChange}>
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
                <Select value={currentRole || ''} onValueChange={handleRoleChange}>
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
                <Select value={currentUserId || '__none__'} onValueChange={handleUserChange}>
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

              {/* Apply button */}
              {hasPendingChanges && (
                <Button
                  onClick={handleApplyChanges}
                  size="sm"
                  className="h-8 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Aplicar
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Use centralized role utilities from lib/roles.ts
import { getRoleLabel as getLabel } from '@/lib/roles';

function getRoleLabel(role: string): string {
  return getLabel(role);
}
