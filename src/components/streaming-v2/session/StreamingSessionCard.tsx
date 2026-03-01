/**
 * StreamingSessionCard - Tarjeta de sesión de streaming
 */

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Play,
  Pause,
  Square,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Calendar,
  Users,
  Eye,
  ShoppingBag,
  Clock,
  Radio,
} from 'lucide-react';
import { SessionStatusBadge } from '../shared/SessionStatusBadge';
import { PlatformIcon } from '../shared/PlatformIcon';
import type { StreamingSession, StreamingPlatform } from '@/types/streaming.types';

interface StreamingSessionCardProps {
  session: StreamingSession;
  onStart?: (sessionId: string) => void;
  onPause?: (sessionId: string) => void;
  onStop?: (sessionId: string) => void;
  onEdit?: (session: StreamingSession) => void;
  onDuplicate?: (session: StreamingSession) => void;
  onDelete?: (sessionId: string) => void;
  onClick?: (session: StreamingSession) => void;
  isLoading?: boolean;
  className?: string;
}

export function StreamingSessionCard({
  session,
  onStart,
  onPause,
  onStop,
  onEdit,
  onDuplicate,
  onDelete,
  onClick,
  isLoading,
  className,
}: StreamingSessionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const isLive = session.status === 'live';
  const isPaused = session.status === 'paused';
  const canStart = ['draft', 'scheduled', 'preparing'].includes(session.status);
  const canStop = ['live', 'paused'].includes(session.status);

  // Extract unique platforms from channels
  const platforms: StreamingPlatform[] = session.channels
    ? [...new Set(session.channels.map((c) => c.channel?.platform).filter(Boolean))] as StreamingPlatform[]
    : [];

  return (
    <>
      <Card
        className={cn(
          'group relative overflow-hidden transition-all hover:shadow-lg',
          isLive && 'ring-2 ring-red-500/50',
          onClick && 'cursor-pointer',
          className
        )}
        onClick={() => onClick?.(session)}
      >
        {/* Live indicator bar */}
        {isLive && (
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 animate-pulse" />
        )}

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <SessionStatusBadge status={session.status} size="sm" />
                {session.session_type === 'shopping' && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                    <ShoppingBag className="mr-1 h-3 w-3" />
                    Shopping
                  </Badge>
                )}
              </div>
              <h3 className="font-semibold text-lg truncate">{session.title}</h3>
              {session.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {session.description}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(session)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                )}
                {onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(session)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar
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
        </CardHeader>

        <CardContent className="pb-3">
          {/* Platforms */}
          {platforms.length > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-muted-foreground">Plataformas:</span>
              <div className="flex gap-1">
                {platforms.map((platform) => (
                  <PlatformIcon key={platform} platform={platform} size="sm" />
                ))}
              </div>
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-muted/50 p-2">
              <Eye className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">{session.peak_viewers || 0}</p>
              <p className="text-xs text-muted-foreground">Viewers</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-2">
              <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-semibold">{session.total_messages || 0}</p>
              <p className="text-xs text-muted-foreground">Mensajes</p>
            </div>
            {session.is_shopping_enabled && (
              <div className="rounded-lg bg-muted/50 p-2">
                <ShoppingBag className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  ${session.total_revenue_usd?.toFixed(0) || 0}
                </p>
                <p className="text-xs text-muted-foreground">Ventas</p>
              </div>
            )}
            {!session.is_shopping_enabled && (
              <div className="rounded-lg bg-muted/50 p-2">
                <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-lg font-semibold">
                  {session.started_at
                    ? Math.round(
                        (new Date(session.ended_at || Date.now()).getTime() -
                          new Date(session.started_at).getTime()) /
                          60000
                      )
                    : 0}m
                </p>
                <p className="text-xs text-muted-foreground">Duración</p>
              </div>
            )}
          </div>

          {/* Scheduled time */}
          {session.scheduled_at && session.status === 'scheduled' && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(session.scheduled_at), "d 'de' MMMM, HH:mm", { locale: es })}
              </span>
            </div>
          )}
        </CardContent>

        <CardFooter className="gap-2">
          {canStart && onStart && (
            <Button
              className="flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onStart(session.id);
              }}
              disabled={isLoading}
            >
              <Radio className="mr-2 h-4 w-4" />
              Iniciar
            </Button>
          )}
          {isLive && (
            <>
              {onPause && (
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPause(session.id);
                  }}
                  disabled={isLoading}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Pausar
                </Button>
              )}
              {onStop && (
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStop(session.id);
                  }}
                  disabled={isLoading}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Terminar
                </Button>
              )}
            </>
          )}
          {isPaused && (
            <>
              {onStart && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStart(session.id);
                  }}
                  disabled={isLoading}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Reanudar
                </Button>
              )}
              {onStop && (
                <Button
                  variant="destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onStop(session.id);
                  }}
                  disabled={isLoading}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Terminar
                </Button>
              )}
            </>
          )}
          {session.status === 'ended' && onClick && (
            <Button variant="outline" className="flex-1">
              Ver Resumen
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la sesión "{session.title}" y todos sus
              datos asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete?.(session.id);
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

export default StreamingSessionCard;
