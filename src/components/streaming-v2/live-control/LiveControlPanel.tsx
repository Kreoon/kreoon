/**
 * LiveControlPanel - Panel principal de control en vivo
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  Play,
  Pause,
  Square,
  Video,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  Settings,
  MessageSquare,
  ShoppingBag,
  Eye,
  Users,
  Clock,
  Wifi,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { SessionStatusBadge } from '../shared/SessionStatusBadge';
import { StreamTimer } from '../shared/StreamTimer';
import { PlatformIcon } from '../shared/PlatformIcon';
import type {
  StreamingSession,
  StreamingSessionChannel,
  OBSConnectionState,
} from '@/types/streaming.types';

interface LiveControlPanelProps {
  session: StreamingSession;
  channels?: StreamingSessionChannel[];
  obsState?: OBSConnectionState;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  onOpenChat?: () => void;
  onOpenProducts?: () => void;
  onOpenSettings?: () => void;
  isMicOn?: boolean;
  isCameraOn?: boolean;
  isScreenSharing?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function LiveControlPanel({
  session,
  channels = [],
  obsState,
  onStart,
  onPause,
  onResume,
  onStop,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onOpenChat,
  onOpenProducts,
  onOpenSettings,
  isMicOn = true,
  isCameraOn = true,
  isScreenSharing = false,
  isLoading,
  className,
}: LiveControlPanelProps) {
  const isLive = session.status === 'live';
  const isPaused = session.status === 'paused';
  const canStart = ['draft', 'scheduled', 'preparing'].includes(session.status);

  // Calculate total viewers across all channels
  const totalViewers = channels.reduce((sum, ch) => sum + (ch.viewers_current || 0), 0);
  const peakViewers = session.peak_viewers || 0;

  // Check for channel issues
  const channelsWithErrors = channels.filter((ch) => ch.status === 'error');
  const allChannelsLive = channels.length > 0 && channels.every((ch) => ch.status === 'live');

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SessionStatusBadge status={session.status} size="lg" />
            <div>
              <CardTitle className="text-lg">{session.title}</CardTitle>
              {isLive && (
                <StreamTimer
                  startedAt={session.started_at || undefined}
                  isPaused={isPaused}
                  size="sm"
                  className="mt-1"
                />
              )}
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onOpenSettings}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main controls */}
        <div className="flex items-center justify-center gap-3">
          {canStart && onStart && (
            <Button
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white px-8"
              onClick={onStart}
              disabled={isLoading}
            >
              <Play className="mr-2 h-5 w-5" />
              Iniciar Live
            </Button>
          )}

          {isLive && (
            <>
              {onPause && (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={onPause}
                  disabled={isLoading}
                >
                  <Pause className="mr-2 h-5 w-5" />
                  Pausar
                </Button>
              )}
              {onStop && (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={onStop}
                  disabled={isLoading}
                >
                  <Square className="mr-2 h-5 w-5" />
                  Terminar
                </Button>
              )}
            </>
          )}

          {isPaused && (
            <>
              {onResume && (
                <Button
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white px-8"
                  onClick={onResume}
                  disabled={isLoading}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Reanudar
                </Button>
              )}
              {onStop && (
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={onStop}
                  disabled={isLoading}
                >
                  <Square className="mr-2 h-5 w-5" />
                  Terminar
                </Button>
              )}
            </>
          )}
        </div>

        {/* Media controls */}
        {(isLive || isPaused) && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant={isMicOn ? 'secondary' : 'outline'}
              size="icon"
              className={cn(!isMicOn && 'text-red-400')}
              onClick={onToggleMic}
            >
              {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
            </Button>
            <Button
              variant={isCameraOn ? 'secondary' : 'outline'}
              size="icon"
              className={cn(!isCameraOn && 'text-red-400')}
              onClick={onToggleCamera}
            >
              {isCameraOn ? <Camera className="h-5 w-5" /> : <CameraOff className="h-5 w-5" />}
            </Button>
            <Button
              variant={isScreenSharing ? 'secondary' : 'outline'}
              size="icon"
              className={cn(isScreenSharing && 'bg-blue-500/20 text-blue-400')}
              onClick={onToggleScreenShare}
            >
              <Monitor className="h-5 w-5" />
            </Button>
          </div>
        )}

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Eye className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{totalViewers}</p>
            <p className="text-xs text-muted-foreground">Viendo ahora</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{peakViewers}</p>
            <p className="text-xs text-muted-foreground">Pico viewers</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
              <MessageSquare className="h-4 w-4" />
            </div>
            <p className="text-2xl font-bold">{session.total_messages || 0}</p>
            <p className="text-xs text-muted-foreground">Mensajes</p>
          </div>
          {session.is_shopping_enabled && (
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <ShoppingBag className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold">${session.total_revenue_usd?.toFixed(0) || 0}</p>
              <p className="text-xs text-muted-foreground">Ventas</p>
            </div>
          )}
        </div>

        <Separator />

        {/* Channels status */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Canales ({channels.length})</h4>
            {channelsWithErrors.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {channelsWithErrors.length} con error
              </Badge>
            )}
            {allChannelsLive && channels.length > 0 && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 text-xs">
                <Wifi className="mr-1 h-3 w-3" />
                Todos conectados
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            {channels.map((channel) => (
              <div
                key={channel.id}
                className={cn(
                  'flex items-center justify-between rounded-lg border p-2',
                  channel.status === 'error' && 'border-red-500/50 bg-red-500/5',
                  channel.status === 'live' && 'border-green-500/50 bg-green-500/5'
                )}
              >
                <div className="flex items-center gap-2">
                  <PlatformIcon platform={channel.channel?.platform || 'custom_rtmp'} size="sm" />
                  <span className="text-sm font-medium">
                    {channel.channel?.platform_display_name || channel.channel?.platform}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {channel.status === 'live' && (
                    <span className="text-sm text-muted-foreground">
                      {channel.viewers_current || 0} viewers
                    </span>
                  )}
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs',
                      channel.status === 'live' && 'bg-green-500/20 text-green-400',
                      channel.status === 'connecting' && 'bg-yellow-500/20 text-yellow-400',
                      channel.status === 'error' && 'bg-red-500/20 text-red-400'
                    )}
                  >
                    {channel.status === 'live' && 'En vivo'}
                    {channel.status === 'connecting' && 'Conectando...'}
                    {channel.status === 'idle' && 'Esperando'}
                    {channel.status === 'error' && 'Error'}
                    {channel.status === 'ended' && 'Finalizado'}
                  </Badge>
                </div>
              </div>
            ))}

            {channels.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay canales configurados
              </p>
            )}
          </div>
        </div>

        {/* OBS Status */}
        {obsState && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">OBS Studio</span>
              </div>
              <Badge
                variant="secondary"
                className={cn(
                  obsState.connected
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-gray-500/20 text-gray-400'
                )}
              >
                {obsState.connected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
            {obsState.connected && obsState.stats && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>CPU: {obsState.stats.cpu_usage?.toFixed(1)}%</span>
                <span>FPS: {obsState.stats.fps?.toFixed(0)}</span>
                {obsState.current_scene && (
                  <span>Escena: {obsState.current_scene}</span>
                )}
              </div>
            )}
          </>
        )}

        {/* Quick actions */}
        <div className="flex gap-2">
          {onOpenChat && (
            <Button variant="outline" className="flex-1" onClick={onOpenChat}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Chat
            </Button>
          )}
          {session.is_shopping_enabled && onOpenProducts && (
            <Button variant="outline" className="flex-1" onClick={onOpenProducts}>
              <ShoppingBag className="mr-2 h-4 w-4" />
              Productos
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default LiveControlPanel;
