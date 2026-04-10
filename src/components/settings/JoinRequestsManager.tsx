import { useState } from 'react';
import { useJoinRequests, JoinRequest } from '@/hooks/useJoinRequests';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Textarea } from '@/components/ui/textarea';
import {
  UserPlus,
  Check,
  X,
  Clock,
  Mail,
  Calendar,
  Globe,
  Users,
  Gift,
} from 'lucide-react';
import { getRoleLabel, getRoleBadgeColor } from '@/lib/roles';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function JoinRequestsManager() {
  const {
    pendingRequests,
    processedRequests,
    isLoading,
    approveRequest,
    rejectRequest,
    isApproving,
    isRejecting,
  } = useJoinRequests();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Solicitudes de Ingreso
          </h3>
          <p className="text-sm text-muted-foreground">
            Gestiona las solicitudes de usuarios que quieren unirse a tu organización
          </p>
        </div>
        {pendingRequests.length > 0 && (
          <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">
            {pendingRequests.length} pendiente{pendingRequests.length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pendientes
            {pendingRequests.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processed" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Procesadas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {pendingRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sin solicitudes pendientes</h3>
                <p className="text-muted-foreground max-w-md">
                  Cuando alguien solicite unirse a tu organización, aparecerá aquí para que puedas aprobarlo o rechazarlo.
                </p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request) => (
              <JoinRequestCard
                key={request.id}
                request={request}
                onApprove={() => approveRequest(request.id)}
                onReject={(reason) => rejectRequest({ requestId: request.id, reason })}
                isApproving={isApproving}
                isRejecting={isRejecting}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="processed" className="space-y-3">
          {processedRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No hay solicitudes procesadas</p>
              </CardContent>
            </Card>
          ) : (
            processedRequests.map((request) => (
              <ProcessedRequestCard key={request.id} request={request} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function JoinRequestCard({
  request,
  onApprove,
  onReject,
  isApproving,
  isRejecting,
}: {
  request: JoinRequest;
  onApprove: () => void;
  onReject: (reason?: string) => void;
  isApproving: boolean;
  isRejecting: boolean;
}) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const user = request.user;
  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  return (
    <>
      <Card className="border-orange-500/20 bg-orange-500/5">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* User Info */}
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="h-12 w-12 border-2 border-orange-500/30">
                <AvatarImage src={user?.avatar_url || undefined} />
                <AvatarFallback className="bg-orange-500/20 text-orange-500">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">
                    {user?.full_name || 'Usuario'}
                  </span>
                  <Badge variant="outline" className={getRoleBadgeColor(request.requested_role)}>
                    {getRoleLabel(request.requested_role)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{user?.email}</span>
                </div>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-col sm:items-end gap-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDistanceToNow(new Date(request.created_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
              {request.source && (
                <div className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  <span>{request.source}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                onClick={() => setShowRejectDialog(true)}
                disabled={isRejecting}
              >
                <X className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                onClick={onApprove}
                disabled={isApproving}
              >
                <Check className="h-4 w-4 mr-1" />
                {isApproving ? 'Aprobando...' : 'Aprobar'}
              </Button>
            </div>
          </div>

          {/* Message */}
          {request.message && (
            <div className="mt-3 p-3 rounded-md bg-background/50 text-sm">
              <p className="text-muted-foreground">{request.message}</p>
            </div>
          )}

          {/* Benefits indicator */}
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Gift className="h-3 w-3 text-orange-500" />
            <span>Al aprobar, se activarán los beneficios de comunidad pendientes</span>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar solicitud</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de rechazar la solicitud de {user?.full_name || 'este usuario'}?
              Puedes agregar una razón opcional.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Razón del rechazo (opcional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="mt-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                onReject(rejectReason || undefined);
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ProcessedRequestCard({ request }: { request: JoinRequest }) {
  const user = request.user;
  const initials = user?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '??';

  const statusConfig = {
    approved: {
      label: 'Aprobada',
      color: 'bg-green-500/10 text-green-500 border-green-500/30',
      icon: Check,
    },
    rejected: {
      label: 'Rechazada',
      color: 'bg-red-500/10 text-red-500 border-red-500/30',
      icon: X,
    },
    cancelled: {
      label: 'Cancelada',
      color: 'bg-gray-500/10 text-gray-500 border-gray-500/30',
      icon: X,
    },
  };

  const status = statusConfig[request.status as keyof typeof statusConfig] || statusConfig.cancelled;
  const StatusIcon = status.icon;

  return (
    <Card className="opacity-70">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{user?.full_name || 'Usuario'}</span>
              <Badge variant="outline" className={status.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
          <div className="text-sm text-muted-foreground">
            {request.reviewed_at && (
              <span>
                {formatDistanceToNow(new Date(request.reviewed_at), {
                  addSuffix: true,
                  locale: es,
                })}
              </span>
            )}
          </div>
        </div>
        {request.rejection_reason && (
          <div className="mt-2 p-2 rounded bg-red-500/5 text-sm text-red-400">
            Razón: {request.rejection_reason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
