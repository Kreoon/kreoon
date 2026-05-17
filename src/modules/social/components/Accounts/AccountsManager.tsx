import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, RefreshCw, Unlink, Building2, User, Globe, Building, Facebook,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
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

const CONNECTION_METHOD_LABELS: Record<string, string> = {
  facebook: 'via Facebook',
  direct: 'Directo',
};

export function AccountsManager() {
  const { user, profile } = useAuth();
  const orgId = profile?.current_organization_id;
  const queryClient = useQueryClient();

  const {
    accounts,
    accountsByPlatform,
    isLoading,
    connectAccount,
    disconnectAccount,
    refreshToken,
    assignAccountToClient,
    isTokenExpiring,
    isManagerRole,
    permissionGroup,
    userClientIds,
  } = useSocialAccounts();
  const { groups, addAccountToGroup, removeAccountFromGroup } = useAccountGroups();

  const [connecting, setConnecting] = useState<SocialPlatform | null>(null);
  const [connectOwnerType, setConnectOwnerType] = useState<SocialAccountOwnerType>(
    permissionGroup === 'client' ? 'client' : 'user'
  );
  const [selectedClientId, setSelectedClientId] = useState<string>(
    permissionGroup === 'client' && userClientIds.length > 0 ? userClientIds[0] : ''
  );
  const [showIgMethodDialog, setShowIgMethodDialog] = useState(false);

  // Sync selectedClientId when userClientIds loads
  useEffect(() => {
    if (permissionGroup === 'client' && userClientIds.length > 0 && !selectedClientId) {
      setSelectedClientId(userClientIds[0]);
    }
  }, [permissionGroup, userClientIds, selectedClientId]);

  // Listen for OAuth popup result via postMessage
  const handleOAuthMessage = useCallback((event: MessageEvent) => {
    if (event.data?.type !== 'social-auth-result') return;
    const { success, platform, error } = event.data;
    if (success) {
      toast.success(`${platform} conectado correctamente`);
      // Refetch social accounts
      queryClient.invalidateQueries({ queryKey: ['social-accounts'] });
    } else {
      toast.error(`Error al conectar ${platform}: ${error || 'Unknown error'}`);
    }
  }, [queryClient]);

  useEffect(() => {
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [handleOAuthMessage]);

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

  const doConnect = async (platform: SocialPlatform, method?: 'facebook' | 'direct') => {
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
        method,
      });
      if (result.url) {
        window.open(result.url, 'kreoon-oauth', 'width=600,height=700,popup=yes');
      }
    } catch (err: any) {
      toast.error(`Error al conectar ${platform}: ${err.message}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleConnect = (platform: SocialPlatform) => {
    // Show method selection dialog for Instagram
    if (platform === 'instagram') {
      setShowIgMethodDialog(true);
      return;
    }
    doConnect(platform);
  };

  const handleInstagramConnect = (method: 'facebook' | 'direct') => {
    setShowIgMethodDialog(false);
    doConnect('instagram', method);
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
    <div className="space-y-8">
      {/* Connected accounts */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            ✅ Cuentas conectadas
            <span className="text-xs font-normal text-muted-foreground">({accounts.length})</span>
          </p>
          <div className="space-y-2">
            {accounts.map((account) => {
              const ownerInfo = OWNER_TYPE_LABELS[account.owner_type || 'user'];
              const OwnerIcon = ownerInfo.icon;
              const expiring = isTokenExpiring(account);
              return (
                <div
                  key={account.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors',
                    expiring ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/60 bg-card/30',
                  )}
                >
                  <PlatformIcon platform={account.platform} size="md" showBg />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-semibold text-sm truncate">
                        {account.platform_display_name || account.platform_username || account.platform}
                      </p>
                      {account.platform_page_name && (
                        <span className="text-[10px] text-muted-foreground">({account.platform_page_name})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <OwnerIcon className="w-2.5 h-2.5" /> {ownerInfo.label}
                      </span>
                      {account.owner_type === 'client' && account.client_name && (
                        <span className="text-[10px] text-blue-400">🏢 {account.client_name}</span>
                      )}
                      {account.groups?.map(g => (
                        <span key={g.group_id} className="text-[9px] px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: g.group_color + '20', color: g.group_color }}>
                          {g.group_name}
                        </span>
                      ))}
                    </div>
                    {account.last_error && (
                      <p className="text-[10px] text-red-400 flex items-center gap-1 mt-0.5">
                        ⚠️ {account.last_error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Assign to client */}
                    {isManagerRole && orgClients.length > 0 && account.owner_type !== 'organization' && (
                      <Select
                        value={account.client_id || '__none__'}
                        onValueChange={(v) => handleAssignToClient(account.id, v === '__none__' ? null : v)}
                      >
                        <SelectTrigger className="w-[120px] h-7 text-[10px]">
                          <SelectValue placeholder="Empresa..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Sin empresa</SelectItem>
                          {orgClients.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {expiring ? (
                      <span className="text-[10px] text-amber-400 font-medium">⚠️ Expira pronto</span>
                    ) : (
                      <span className="text-[10px] text-green-400 font-medium">✅ Activo</span>
                    )}

                    <Button size="icon" variant="ghost" className="h-7 w-7"
                      onClick={() => handleRefresh(account)} disabled={refreshToken.isPending}>
                      <RefreshCw className={cn('w-3.5 h-3.5', refreshToken.isPending && 'animate-spin')} />
                    </Button>

                    {(isManagerRole || account.user_id === user?.id) && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400 hover:text-red-300"
                        onClick={() => handleDisconnect(account)} disabled={disconnectAccount.isPending}>
                        <Unlink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connect new accounts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-sm font-semibold">
            {accounts.length > 0 ? '➕ Conectar más redes' : '🔗 Conecta tus redes sociales'}
          </p>
          <div className="flex items-center gap-2">
            {isManagerRole && (
              <Select value={connectOwnerType} onValueChange={(v) => setConnectOwnerType(v as SocialAccountOwnerType)}>
                <SelectTrigger className="w-[140px] h-8 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">👤 Personal</SelectItem>
                  <SelectItem value="brand">🏷️ Marca</SelectItem>
                  <SelectItem value="client">🏢 Empresa</SelectItem>
                  <SelectItem value="organization">🌐 Organización</SelectItem>
                </SelectContent>
              </Select>
            )}
            {!isManagerRole && permissionGroup !== 'client' && (
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">👤 Personal</span>
            )}
            {!isManagerRole && permissionGroup === 'client' && (
              <span className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">🏢 Empresa</span>
            )}
            {connectOwnerType === 'client' && isManagerRole && (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger className="w-[180px] h-8 text-xs rounded-xl">
                  <SelectValue placeholder="Seleccionar empresa..." />
                </SelectTrigger>
                <SelectContent>
                  {orgClients.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
            const isSoon = platform.comingSoon;

            return (
              <button
                key={platform.id}
                disabled={isSoon || isConnecting}
                onClick={() => !isSoon && handleConnect(platform.id)}
                className={cn(
                  'flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition-all text-center',
                  isSoon
                    ? 'opacity-50 cursor-default border-border/40 bg-muted/10'
                    : connected > 0
                      ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10 cursor-pointer active:scale-[0.97]'
                      : 'border-border hover:border-primary/40 hover:bg-muted/30 cursor-pointer active:scale-[0.97]',
                )}
              >
                <PlatformIcon platform={platform.id} size="lg" showBg />
                <div>
                  <p className="text-sm font-semibold">{platform.name}</p>
                  {isSoon ? (
                    <p className="text-xs text-amber-400 mt-0.5">⏳ Muy pronto</p>
                  ) : connected > 0 ? (
                    <p className="text-xs text-green-400 mt-0.5">
                      ✅ {connected} conectada{connected > 1 ? 's' : ''}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-0.5">Toca para conectar</p>
                  )}
                </div>
                {!isSoon && (
                  <div className={cn(
                    'w-full py-1.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1',
                    connected > 0
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-primary/10 text-primary',
                  )}>
                    {isConnecting ? (
                      <><RefreshCw className="w-3 h-3 animate-spin" /> Conectando...</>
                    ) : connected > 0 ? (
                      <><Plus className="w-3 h-3" /> Agregar otra</>
                    ) : (
                      <><Plus className="w-3 h-3" /> Conectar</>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Instagram Connection Method Dialog */}
      <Dialog open={showIgMethodDialog} onOpenChange={setShowIgMethodDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlatformIcon platform="instagram" size="md" showBg />
              Conectar Instagram
            </DialogTitle>
            <DialogDescription>
              ¿Cómo quieres conectar tu cuenta?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => handleInstagramConnect('facebook')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-purple-500/40 hover:bg-purple-500/5 text-left transition-all active:scale-[0.98]"
            >
              <div className="flex -space-x-2 shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center z-10 ring-2 ring-background">
                  <Facebook className="w-5 h-5 text-white" />
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center ring-2 ring-background">
                  <PlatformIcon platform="instagram" size="sm" />
                </div>
              </div>
              <div>
                <p className="font-semibold text-sm">⭐ Con Facebook Page</p>
                <p className="text-xs text-muted-foreground">Más métricas y stories insights</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Requiere página de Facebook vinculada</p>
              </div>
            </button>

            <button
              onClick={() => handleInstagramConnect('direct')}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-border hover:border-purple-500/40 hover:bg-purple-500/5 text-left transition-all active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shrink-0">
                <PlatformIcon platform="instagram" size="sm" />
              </div>
              <div>
                <p className="font-semibold text-sm">Solo Instagram</p>
                <p className="text-xs text-muted-foreground">Publicar posts y reels</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">No requiere Facebook</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
