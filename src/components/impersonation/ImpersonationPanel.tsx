import { useState, useMemo } from 'react';
import { useImpersonation, useImpersonationData, ImpersonationTarget } from '@/contexts/ImpersonationContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { 
  Eye, 
  Building2, 
  Shield, 
  User, 
  Loader2, 
  Sparkles,
  Search,
  Zap
} from 'lucide-react';
import { AppRole } from '@/types/database';
import { cn } from '@/lib/utils';

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'strategist', label: 'Estratega' },
  { value: 'creator', label: 'Creador' },
  { value: 'editor', label: 'Editor' },
  { value: 'client', label: 'Cliente' },
];

const QUICK_PRESETS = [
  { label: 'Cliente nuevo', role: 'client' as AppRole, description: 'Ver como cliente sin contenido' },
  { label: 'Cliente activo', role: 'client' as AppRole, description: 'Ver como cliente con contenido' },
  { label: 'Creador', role: 'creator' as AppRole, description: 'Ver como creador asignado' },
  { label: 'Editor', role: 'editor' as AppRole, description: 'Ver como editor de contenido' },
  { label: 'Estratega', role: 'strategist' as AppRole, description: 'Ver como estratega' },
];

export function ImpersonationPanel() {
  const { isRootAdmin, isImpersonating, startImpersonation, stopImpersonation } = useImpersonation();
  const { clients, users, loading } = useImpersonationData();
  
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  // Filter users based on search and selected role
  const filteredUsers = useMemo(() => {
    let result = users;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(u => 
        u.full_name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      );
    }
    
    if (selectedRole) {
      result = result.filter(u => u.roles.includes(selectedRole));
    }
    
    return result;
  }, [users, searchQuery, selectedRole]);

  // Get selected client name
  const selectedClientName = clients.find(c => c.id === selectedClientId)?.name || null;
  
  // Get selected user name
  const selectedUserName = users.find(u => u.id === selectedUserId)?.full_name || null;

  if (!isRootAdmin) return null;

  const handleStartImpersonation = async () => {
    if (!selectedRole) return;
    
    setIsStarting(true);
    try {
      const target: ImpersonationTarget = {
        clientId: selectedClientId || null,
        clientName: selectedClientName,
        role: selectedRole,
        userId: selectedUserId || null,
        userName: selectedUserName,
      };
      await startImpersonation(target);
    } finally {
      setIsStarting(false);
    }
  };

  const handleQuickPreset = async (preset: typeof QUICK_PRESETS[0]) => {
    setIsStarting(true);
    try {
      // Find a user with this role
      const userWithRole = users.find(u => u.roles.includes(preset.role));
      
      // Find any active client for client role
      let clientForPreset = null;
      if (preset.role === 'client' && clients.length > 0) {
        clientForPreset = clients[0];
      }

      const target: ImpersonationTarget = {
        clientId: clientForPreset?.id || null,
        clientName: clientForPreset?.name || null,
        role: preset.role,
        userId: userWithRole?.id || null,
        userName: userWithRole?.full_name || null,
      };
      await startImpersonation(target);
    } finally {
      setIsStarting(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Cargando datos...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-sm bg-primary/10">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Modo Root - Impersonación</CardTitle>
            <CardDescription>
              Visualiza la plataforma como cualquier usuario, negocio o rol
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {isImpersonating ? (
          <div className="text-center py-4">
            <Badge variant="secondary" className="text-base px-4 py-2 bg-amber-100 text-amber-800">
              Modo simulación activo
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              Usa el banner superior para salir del modo simulación
            </p>
          </div>
        ) : (
          <>
            {/* Quick Presets */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <Label className="text-sm font-medium">Accesos rápidos</Label>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_PRESETS.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPreset(preset)}
                    disabled={isStarting}
                    className="text-xs"
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom Selection */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Configuración personalizada</Label>
              
              {/* Business Selection */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Negocio (opcional)
                </Label>
                <Select value={selectedClientId || '__none__'} onValueChange={(v) => setSelectedClientId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sin negocio (vista neutra)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin negocio (vista neutra)</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Rol a simular
                </Label>
                <Select 
                  value={selectedRole} 
                  onValueChange={(v) => {
                    setSelectedRole(v as AppRole);
                    setSelectedUserId(''); // Reset user when role changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* User Selection (optional) */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Usuario específico (opcional)
                </Label>
                
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar usuario..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={selectedUserId || '__none__'} onValueChange={(v) => setSelectedUserId(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Rol genérico (sin identidad)" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="__none__">Rol genérico (sin identidad)</SelectItem>
                    {filteredUsers.slice(0, 50).map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <span>{user.full_name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({user.roles.length > 0 ? user.roles.join(', ') : 'sin rol'})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Button */}
              <Button
                onClick={handleStartImpersonation}
                disabled={!selectedRole || isStarting}
                className="w-full"
              >
                {isStarting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Iniciar simulación
                  </>
                )}
              </Button>
            </div>

            {/* Info */}
            <div className="rounded-sm bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium">Información importante:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Puedes realizar cambios como el usuario simulado</li>
                <li>Todas las acciones quedan registradas en logs</li>
                <li>Verás exactamente lo que ve el usuario simulado</li>
                <li>Los cambios afectarán datos reales</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
