import { useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Users, Heart, PlayCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// TikTok icon component
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48 6.3 6.3 0 001.83-4.47V8.76a8.26 8.26 0 004.75 1.5V6.8a4.83 4.83 0 01-1-.11z" />
    </svg>
  );
}

interface TikTokConnectProps {
  creatorProfileId: string;
  onConnected?: () => void;
  compact?: boolean;
}

interface TikTokConnection {
  id: string;
  platform: 'tiktok';
  platform_username: string;
  followers_count: number;
  following_count: number;
  posts_count: number;
  likes_count: number;
  engagement_rate: number;
  is_verified: boolean;
  verification_status: 'verified' | 'mismatch' | 'pending' | 'error' | null;
  last_synced_at: string;
  token_expires_at: string;
  metadata: {
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    avg_views?: number;
    avg_likes?: number;
  };
}

export function TikTokConnect({ creatorProfileId, onConnected, compact = false }: TikTokConnectProps) {
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch existing connection
  const { data: connection, isLoading } = useQuery({
    queryKey: ['tiktok-connection', creatorProfileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_social_connections')
        .select('*')
        .eq('creator_profile_id', creatorProfileId)
        .eq('platform', 'tiktok')
        .maybeSingle();

      if (error) throw error;
      return data as TikTokConnection | null;
    },
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      setIsConnecting(true);
      const { data, error } = await supabase.functions.invoke('social-tiktok/connect', {
        body: {
          profile_id: creatorProfileId,
          return_url: window.location.href,
        },
      });

      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => {
      // Open OAuth window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.url,
        'tiktok_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      // Listen for callback
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'social-auth-result' && event.data?.platform === 'tiktok') {
          window.removeEventListener('message', handleMessage);
          setIsConnecting(false);

          if (event.data.success) {
            toast.success('Cuenta de TikTok conectada exitosamente');
            queryClient.invalidateQueries({ queryKey: ['tiktok-connection', creatorProfileId] });
            onConnected?.();
          } else {
            toast.error(`Error al conectar: ${event.data.error || 'Error desconocido'}`);
          }
        }
      };

      window.addEventListener('message', handleMessage);

      // Fallback: check URL params after popup closes
      const checkInterval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkInterval);
          setIsConnecting(false);
          queryClient.invalidateQueries({ queryKey: ['tiktok-connection', creatorProfileId] });
        }
      }, 1000);
    },
    onError: (error) => {
      setIsConnecting(false);
      toast.error(`Error: ${error.message}`);
    },
  });

  // Refresh metrics mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!connection?.id) throw new Error('No connection found');

      const { data, error } = await supabase.functions.invoke(`social-tiktok/metrics/${connection.id}`);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Metricas actualizadas');
      queryClient.invalidateQueries({ queryKey: ['tiktok-connection', creatorProfileId] });
    },
    onError: (error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      if (!connection?.id) throw new Error('No connection found');

      const { error } = await supabase
        .from('creator_social_connections')
        .delete()
        .eq('id', connection.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cuenta desconectada');
      queryClient.invalidateQueries({ queryKey: ['tiktok-connection', creatorProfileId] });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Token expiry check
  const isTokenExpired = connection?.token_expires_at
    ? new Date(connection.token_expires_at) < new Date()
    : false;

  const isTokenExpiringSoon = connection?.token_expires_at
    ? new Date(connection.token_expires_at) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    : false;

  // Compact view for profile cards
  if (compact && connection) {
    return (
      <div className="flex items-center gap-2">
        <TikTokIcon className="h-4 w-4" />
        <span className="text-sm font-medium">
          {connection.followers_count.toLocaleString()}
        </span>
        {connection.is_verified && (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        )}
      </div>
    );
  }

  // Not connected state
  if (!connection) {
    return (
      <Card className="bg-gradient-to-br from-black/50 to-pink-900/20 border-pink-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-black">
              <TikTokIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Conectar TikTok</CardTitle>
              <CardDescription className="text-xs">
                Verifica tus seguidores y engagement
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => connectMutation.mutate()}
            disabled={isConnecting}
            className="w-full bg-black hover:bg-gray-900 text-white"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Conectando...
              </>
            ) : (
              <>
                <TikTokIcon className="h-4 w-4 mr-2" />
                Conectar cuenta
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Conecta tu cuenta para obtener el badge de verificado
          </p>
        </CardContent>
      </Card>
    );
  }

  // Connected state
  return (
    <Card className={cn(
      "bg-card/50 border-border/50",
      connection.is_verified && "border-green-500/30",
      isTokenExpired && "border-red-500/30"
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-black">
              <TikTokIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">@{connection.platform_username}</span>
                {connection.is_verified ? (
                  <Badge variant="outline" className="text-green-500 border-green-500/50 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Verificado
                  </Badge>
                ) : connection.verification_status === 'mismatch' ? (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-xs">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Discrepancia
                  </Badge>
                ) : null}
              </div>
              <span className="text-xs text-muted-foreground">TikTok</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            title="Actualizar metricas"
          >
            <RefreshCw className={cn("h-4 w-4", refreshMutation.isPending && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Token warnings */}
        {isTokenExpired && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Token expirado. Reconecta tu cuenta.</span>
            <Button
              variant="link"
              size="sm"
              onClick={() => connectMutation.mutate()}
              className="text-red-400 h-auto p-0 ml-auto"
            >
              Reconectar
            </Button>
          </div>
        )}

        {isTokenExpiringSoon && !isTokenExpired && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 text-amber-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>El token expirara pronto.</span>
            <Button
              variant="link"
              size="sm"
              onClick={() => connectMutation.mutate()}
              className="text-amber-400 h-auto p-0 ml-auto"
            >
              Renovar
            </Button>
          </div>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="font-bold text-sm">{connection.followers_count.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">Seguidores</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <PlayCircle className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="font-bold text-sm">{connection.posts_count.toLocaleString()}</div>
            <div className="text-[10px] text-muted-foreground">Videos</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <Heart className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="font-bold text-sm">
              {connection.likes_count >= 1000000
                ? `${(connection.likes_count / 1000000).toFixed(1)}M`
                : connection.likes_count >= 1000
                ? `${(connection.likes_count / 1000).toFixed(1)}K`
                : connection.likes_count.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">Likes</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/30">
            <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <div className="font-bold text-sm">{connection.engagement_rate?.toFixed(1) || '0'}%</div>
            <div className="text-[10px] text-muted-foreground">Eng. Rate</div>
          </div>
        </div>

        {/* Additional metrics */}
        {connection.metadata && (
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {connection.metadata.avg_views && (
              <span>~{connection.metadata.avg_views.toLocaleString()} vistas/video</span>
            )}
            {connection.metadata.avg_likes && (
              <span>~{connection.metadata.avg_likes.toLocaleString()} likes/video</span>
            )}
          </div>
        )}

        {/* Last synced */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Actualizado: {connection.last_synced_at
              ? new Date(connection.last_synced_at).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'Nunca'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => disconnectMutation.mutate()}
            disabled={disconnectMutation.isPending}
            className="text-red-400 hover:text-red-300 h-auto py-1"
          >
            Desconectar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
