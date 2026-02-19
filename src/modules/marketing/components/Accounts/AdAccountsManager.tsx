import { useState } from 'react';
import { Plus, RefreshCw, Trash2, ExternalLink, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAdAccounts } from '../../hooks/useAdAccounts';
import { AdPlatformIcon } from '../common/AdPlatformIcon';
import { AD_PLATFORMS, AD_PLATFORM_LIST } from '../../config';
import type { AdPlatform, MarketingAdAccount } from '../../types/marketing.types';
import { toast } from 'sonner';

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function AdAccountsManager() {
  const { accounts, isLoading, connect, disconnect, refresh } = useAdAccounts();
  const [connecting, setConnecting] = useState<AdPlatform | null>(null);

  const handleConnect = async (platform: AdPlatform) => {
    setConnecting(platform);
    try {
      const result = await connect.mutateAsync(platform);
      if (result.auth_url) {
        window.open(result.auth_url, '_blank', 'width=600,height=700');
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (account: MarketingAdAccount) => {
    try {
      await disconnect.mutateAsync(account.id);
      toast.success('Cuenta desconectada');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRefresh = async (account: MarketingAdAccount) => {
    try {
      await refresh.mutateAsync(account.id);
      toast.success('Token actualizado');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse bg-muted/20"><CardContent className="h-20" /></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connected accounts */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Cuentas conectadas
          </h3>
          <div className="space-y-2">
            {accounts.map(account => {
              const isExpiring = account.token_expires_at &&
                new Date(account.token_expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

              return (
                <Card key={account.id} className="bg-card/50">
                  <CardContent className="flex items-center gap-4 py-3">
                    <AdPlatformIcon platform={account.platform} size="md" withBg />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{account.account_name}</p>
                        <Badge variant="outline" className="text-[9px]">
                          {AD_PLATFORMS[account.platform].name}
                        </Badge>
                        {isExpiring && (
                          <Badge className="text-[9px] bg-yellow-500/20 text-yellow-400 border-0">
                            <AlertCircle className="w-2.5 h-2.5 mr-0.5" />
                            Token expira pronto
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">
                          ID: {account.platform_account_id}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Gasto mes: {fmt(account.monthly_spend)}
                        </span>
                        {account.last_synced_at && (
                          <span className="text-[10px] text-muted-foreground">
                            Sync: {new Date(account.last_synced_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => handleRefresh(account)}
                        title="Refrescar token"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-red-400 hover:text-red-300"
                        onClick={() => handleDisconnect(account)}
                        title="Desconectar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Connect new */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Conectar plataforma de ads
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {AD_PLATFORM_LIST.map(platform => {
            const connectedCount = accounts.filter(a => a.platform === platform.id).length;
            return (
              <Card
                key={platform.id}
                className={cn(
                  'bg-card/50 cursor-pointer transition-all hover:border-primary/30',
                  connecting === platform.id && 'opacity-50 pointer-events-none'
                )}
                onClick={() => handleConnect(platform.id)}
              >
                <CardContent className="flex flex-col items-center gap-3 py-6">
                  <AdPlatformIcon platform={platform.id} size="lg" withBg />
                  <div className="text-center">
                    <p className="text-sm font-medium">{platform.name}</p>
                    {connectedCount > 0 ? (
                      <p className="text-[10px] text-green-400 mt-0.5">
                        {connectedCount} cuenta{connectedCount > 1 ? 's' : ''} conectada{connectedCount > 1 ? 's' : ''}
                      </p>
                    ) : (
                      <p className="text-[10px] text-muted-foreground mt-0.5">No conectada</p>
                    )}
                  </div>
                  <Button size="sm" variant={connectedCount > 0 ? 'outline' : 'default'} className="text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    {connectedCount > 0 ? 'Agregar otra' : 'Conectar'}
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
