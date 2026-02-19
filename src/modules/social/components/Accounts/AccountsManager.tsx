import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, RefreshCw, Unlink, AlertTriangle, CheckCircle2,
  Building2, User, Globe, Building,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSocialAccounts } from '../../hooks/useSocialAccounts';
import { useAccountGroups } from '../../hooks/useAccountGroups';
import { PlatformIcon } from '../common/PlatformIcon';
import { PLATFORM_LIST } from '../../config';
import type { SocialAccount, SocialPlatform, SocialAccountOwnerType } from '../../types/social.types';
import { toast } from 'sonner';

const OWNER_TYPE_LABELS: Record<SocialAccountOwnerType, { label: string; icon: typeof User }> = {
  user: { label: 'Personal', icon: User },
  brand: { label: 'Marca', icon: Building2 },
  client: { label: 'Empresa', icon: Building },
  organization: { label: 'Organización', icon: Globe },
};

export function AccountsManager() {
  const { profile } = useAuth();
  const orgId = profile?.current_organization_id;

  const {
    accounts,
    accountsByPlatform,
    isLoading,
    connectAccount,
    disconnectAccount,
    refreshToken,
    assignAccountToClient,
    isTokenExpiring,
  } = useSocialAccounts();
  const { groups, addAccountToGroup, removeAccountFromGroup } = useAccountGroups();

  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);
  const [connectOwnerType, setConnectOwnerType] = useState<SocialAccountOwnerType>('user');
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  // Fetch clients (empresas) for the org
  const { data: orgClients = [] } = useQuery({
    queryKey: ['org-clients-for-social', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('clients')
        .select('id, name, logo_url')
        .eq('organization_id', orgId)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });

  const handleConnect = async (platform: SocialPlatform) => {
    if (connectOwnerType === 'client' && !selectedClientId) {
      toast.error('Selecciona una empresa primero');
      return;
    }
    setConnecting(platform);
    try {
      const result = await connectAccount.mutateAsync({
        platform,
        owner_type: connectOwnerType,
        client_id: connectOwnerType === 'client' ? selectedClientId : undefined,
      });
      if (result.url) {
        window.open(result.url, '_blank', 'width=600,height=700');
      }
    } catch (err: any) {
      toast.error(`Error al conectar ${platform}: ${err.message}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (account: SocialAccount) => {
    try {
      await disconnectAccount.mutateAsync(account.id);
      toast.success(`${account.platform_display_name || account.platform} desconectado`);
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleRefresh = async (account: SocialAccount) => {
    try {
      await refreshToken.mutateAsync(account.id);
      toast.success('Token actualizado');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleAssignToClient = async (accountId: string, clientId: string | null) => {
    try {
      await assignAccountToClient.mutateAsync({ accountId, clientId });
      toast.success(clientId ? 'Cuenta asignada a empresa' : 'Asignación removida');
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Connected accounts */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Cuentas Conectadas
          </h3>
          <div className="grid gap-3">
            {accounts.map((account) => {
              const ownerInfo = OWNER_TYPE_LABELS[account.owner_type || 'user'];
              const OwnerIcon = ownerInfo.icon;
              return (
                <Card key={account.id} className="bg-card/50">
                  <CardContent className="flex items-center gap-4 py-4">
                    <PlatformIcon platform={account.platform} size="lg" showBg />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">
                          {account.platform_display_name || account.platform_username || account.platform}
                        </p>
                        {account.platform_page_name && (
                          <Badge variant="outline" className="text-[10px]">
                            {account.platform_page_name}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] gap-1">
                          <OwnerIcon className="w-2.5 h-2.5" />
                          {ownerInfo.label}
                        </Badge>
                        {account.owner_type === 'client' && account.client_name && (
                          <Badge variant="outline" className="text-[10px] gap-1 border-blue-500/30 text-blue-400">
                            <Building className="w-2.5 h-2.5" />
                            {account.client_name}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        @{account.platform_username || account.platform_user_id}
                      </p>
                      {/* Group badges */}
                      {account.groups && account.groups.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {account.groups.map(g => (
                            <span
                              key={g.group_id}
                              className="text-[9px] px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: g.group_color + '20', color: g.group_color }}
                            >
                              {g.group_name}
                            </span>
                          ))}
                        </div>
                      )}
                      {account.last_error && (
                        <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {account.last_error}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Assign to client dropdown */}
                      {orgClients.length > 0 && account.owner_type !== 'organization' && (
                        <Select
                          value={account.client_id || '__none__'}
                          onValueChange={(v) => handleAssignToClient(account.id, v === '__none__' ? null : v)}
                        >
                          <SelectTrigger className="w-[130px] h-7 text-[10px]">
                            <SelectValue placeholder="Empresa..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Sin empresa</SelectItem>
                            {orgClients.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {isTokenExpiring(account) ? (
                        <Badge variant="destructive" className="text-[10px]">
                          Token expira pronto
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-green-500/30 text-green-400">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Activo
                        </Badge>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => handleRefresh(account)}
                        disabled={refreshToken.isPending}
                      >
                        <RefreshCw className={cn('w-4 h-4', refreshToken.isPending && 'animate-spin')} />
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-300"
                        onClick={() => handleDisconnect(account)}
                        disabled={disconnectAccount.isPending}
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Connect new accounts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {accounts.length > 0 ? 'Conectar Más Redes' : 'Conecta tus Redes Sociales'}
          </h3>
          <div className="flex items-center gap-2">
            <Select value={connectOwnerType} onValueChange={(v) => setConnectOwnerType(v as SocialAccountOwnerType)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Personal</SelectItem>
                <SelectItem value="brand">Marca</SelectItem>
                <SelectItem value="client">Empresa</SelectItem>
                <SelectItem value="organization">Organización</SelectItem>
              </SelectContent>
            </Select>

            {connectOwnerType === 'client' && (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Seleccionar empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {orgClients.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {PLATFORM_LIST.map((platform) => {
            const connected = accountsByPlatform[platform.id]?.length || 0;
            const isConnecting = connecting === platform.id;

            return (
              <Card
                key={platform.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md hover:border-primary/30',
                  connected > 0 && 'border-green-500/20'
                )}
                onClick={() => handleConnect(platform.id)}
              >
                <CardContent className="flex flex-col items-center gap-3 py-5">
                  <PlatformIcon platform={platform.id} size="lg" showBg />
                  <div className="text-center">
                    <p className="text-sm font-medium">{platform.name}</p>
                    {connected > 0 ? (
                      <p className="text-xs text-green-400">{connected} conectada{connected > 1 ? 's' : ''}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">No conectada</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant={connected > 0 ? 'outline' : 'default'}
                    className="w-full text-xs"
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Plus className="w-3 h-3 mr-1" />
                    )}
                    {connected > 0 ? 'Agregar otra' : 'Conectar'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
