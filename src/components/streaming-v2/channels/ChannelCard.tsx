/**
 * ChannelCard - Tarjeta de canal de streaming
 */

import { useState } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import {
  MoreVertical,
  Edit,
  Trash2,
  Wifi,
  WifiOff,
  Eye,
  RefreshCw,
  Key,
  Star,
} from 'lucide-react';
import { PlatformIcon } from '../shared/PlatformIcon';
import { ChannelStatusIndicator } from '../shared/ChannelStatusIndicator';
import type { StreamingChannel, StreamingChannelStatus } from '@/types/streaming.types';

interface ChannelCardProps {
  channel: StreamingChannel;
  sessionStatus?: StreamingChannelStatus;
  viewerCount?: number;
  onEdit?: (channel: StreamingChannel) => void;
  onDelete?: (channelId: string) => void;
  onTest?: (channelId: string) => Promise<{ success: boolean; latency_ms?: number; error?: string }>;
  onToggleEnabled?: (channelId: string, enabled: boolean) => void;
  onSetPrimary?: (channelId: string) => void;
  isLoading?: boolean;
  className?: string;
}

export function ChannelCard({
  channel,
  sessionStatus,
  viewerCount,
  onEdit,
  onDelete,
  onTest,
  onToggleEnabled,
  onSetPrimary,
  isLoading,
  className,
}: ChannelCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; latency_ms?: number; error?: string } | null>(null);

  const handleTest = async () => {
    if (!onTest) return;
    setTesting(true);
    setTestResult(null);
    try {
      const result = await onTest(channel.id);
      setTestResult(result);
    } finally {
      setTesting(false);
    }
  };

  const status = sessionStatus || 'idle';
  const isLive = status === 'live';
  const hasRTMPKey = !!channel.rtmp_key_encrypted;

  return (
    <>
      <Card
        className={cn(
          'group relative overflow-hidden transition-all',
          isLive && 'ring-2 ring-green-500/50',
          !channel.is_active && 'opacity-60',
          className
        )}
      >
        {channel.is_primary && (
          <div className="absolute right-2 top-2">
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
              <Star className="mr-1 h-3 w-3" />
              Principal
            </Badge>
          </div>
        )}

        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <PlatformIcon platform={channel.platform} size="lg" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">
                  {channel.platform_display_name || channel.platform}
                </h3>
                <ChannelStatusIndicator status={status} size="sm" />
              </div>

              <p className="text-sm text-muted-foreground mt-1">
                {channel.max_resolution} • {channel.max_bitrate} kbps
              </p>

              {/* RTMP Status */}
              <div className="flex items-center gap-2 mt-2">
                {hasRTMPKey ? (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                    <Key className="mr-1 h-3 w-3" />
                    Configurado
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                    <Key className="mr-1 h-3 w-3" />
                    Sin clave
                  </Badge>
                )}
              </div>

              {/* Test result */}
              {testResult && (
                <div
                  className={cn(
                    'mt-2 text-sm',
                    testResult.success ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {testResult.success
                    ? `✓ Conectado (${testResult.latency_ms}ms)`
                    : `✗ ${testResult.error || 'Error de conexión'}`}
                </div>
              )}

              {/* Live stats */}
              {isLive && viewerCount !== undefined && (
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{viewerCount}</span>
                  <span className="text-muted-foreground">viewers</span>
                </div>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onTest && (
                  <DropdownMenuItem onClick={handleTest} disabled={testing}>
                    <RefreshCw className={cn('mr-2 h-4 w-4', testing && 'animate-spin')} />
                    Probar conexión
                  </DropdownMenuItem>
                )}
                {onSetPrimary && !channel.is_primary && (
                  <DropdownMenuItem onClick={() => onSetPrimary(channel.id)}>
                    <Star className="mr-2 h-4 w-4" />
                    Establecer como principal
                  </DropdownMenuItem>
                )}
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(channel)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>

        <CardFooter className="justify-between border-t pt-4">
          <div className="flex items-center gap-2">
            {isLive ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {isLive ? 'Transmitiendo' : 'Desconectado'}
            </span>
          </div>

          {onToggleEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {channel.is_active ? 'Activo' : 'Inactivo'}
              </span>
              <Switch
                checked={channel.is_active}
                onCheckedChange={(checked) => onToggleEnabled(channel.id, checked)}
                disabled={isLoading || isLive}
              />
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar canal?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el canal "{channel.platform_display_name || channel.platform}".
              Tendrás que volver a configurar la conexión si deseas transmitir a esta plataforma.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete?.(channel.id);
                setShowDeleteDialog(false);
              }}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ChannelCard;
