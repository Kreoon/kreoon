import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Calendar, Play, Square, Clock, Users, Plus, Video, Eye, MoreHorizontal, AlertTriangle, Lock, Unlock, Timer } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StreamingEvent, StreamingAccount } from '@/hooks/useLiveStreaming';
import { AddEventDialog } from '@/components/live-streaming/dialogs/AddEventDialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface EnhancedStreamingEvent extends StreamingEvent {
  estimated_duration_hours?: number;
  actual_duration_hours?: number;
  hours_reserved?: number;
  hours_consumed?: number;
  reservation_status?: 'pending' | 'reserved' | 'consumed' | 'released';
}

interface KreoonEventsTabProps {
  events: StreamingEvent[];
  accounts: StreamingAccount[];
  onSave: (event: Partial<StreamingEvent> & { title: string }) => Promise<boolean>;
  onUpdateStatus: (id: string, status: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onAssignCreator?: (eventId: string) => void;
  onConsumeHours?: (eventId: string) => Promise<boolean>;
  canClientStartLive?: (clientId: string) => Promise<boolean>;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  draft: { label: 'Borrador', variant: 'outline', color: 'text-muted-foreground' },
  scheduled: { label: 'Programado', variant: 'secondary', color: 'text-blue-500' },
  live: { label: 'EN VIVO', variant: 'destructive', color: 'text-red-500' },
  ended: { label: 'Finalizado', variant: 'outline', color: 'text-green-500' },
  cancelled: { label: 'Cancelado', variant: 'outline', color: 'text-muted-foreground' },
};

const RESERVATION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: 'Sin reservar', icon: <Unlock className="h-3 w-3" />, color: 'text-yellow-500' },
  reserved: { label: 'Reservado', icon: <Lock className="h-3 w-3" />, color: 'text-blue-500' },
  consumed: { label: 'Consumido', icon: <Timer className="h-3 w-3" />, color: 'text-green-500' },
  released: { label: 'Liberado', icon: <Unlock className="h-3 w-3" />, color: 'text-muted-foreground' },
};

export function KreoonEventsTab({ 
  events, 
  accounts,
  onSave, 
  onUpdateStatus, 
  onDelete,
  onAssignCreator,
  onConsumeHours,
  canClientStartLive
}: KreoonEventsTabProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<StreamingEvent | null>(null);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const filteredEvents = events.filter(e => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  const liveCount = events.filter(e => e.status === 'live').length;
  const scheduledCount = events.filter(e => e.status === 'scheduled').length;

  const openEdit = (event: StreamingEvent) => {
    setEditingEvent(event);
    setShowAddDialog(true);
  };

  const handleSave = async (data: Partial<StreamingEvent> & { title: string }) => {
    await onSave({ ...editingEvent, ...data } as Partial<StreamingEvent> & { title: string });
    setEditingEvent(null);
  };

  // Reserve hours for an event
  const handleReserveHours = async (event: EnhancedStreamingEvent) => {
    if (!event.client_id) {
      toast({
        title: 'Sin cliente asignado',
        description: 'Asigna un cliente al evento primero',
        variant: 'destructive',
      });
      return;
    }

    setLoadingAction(event.id);
    try {
      const hours = event.estimated_duration_hours || 1;
      const { error } = await (supabase as any).rpc('reserve_live_hours', {
        _event_id: event.id,
        _hours: hours
      });

      if (error) throw error;

      toast({ title: 'Horas reservadas', description: `${hours} horas reservadas para este evento` });
      // Trigger refresh in parent
    } catch (error: any) {
      console.error('Error reserving hours:', error);
      toast({
        title: 'Error al reservar horas',
        description: error.message || 'No se pudieron reservar las horas',
        variant: 'destructive',
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle starting a live event with hour verification
  const handleStartLive = async (event: EnhancedStreamingEvent) => {
    if (!event.client_id) {
      toast({
        title: 'Sin cliente asignado',
        description: 'Este evento no tiene un cliente asignado',
        variant: 'destructive',
      });
      return;
    }

    // Check if hours are reserved
    if (event.reservation_status !== 'reserved') {
      toast({
        title: 'Horas no reservadas',
        description: 'Debes reservar las horas antes de iniciar el live',
        variant: 'destructive',
      });
      return;
    }

    setLoadingAction(event.id);
    try {
      // Verify client can start live
      if (canClientStartLive) {
        const canStart = await canClientStartLive(event.client_id);
        if (!canStart) {
          toast({
            title: 'Sin horas disponibles',
            description: 'El cliente no tiene horas de live disponibles o el feature no está habilitado',
            variant: 'destructive',
          });
          return;
        }
      }

      await onUpdateStatus(event.id, 'live');
    } finally {
      setLoadingAction(null);
    }
  };

  // Handle ending a live event with hour consumption
  const handleEndLive = async (event: EnhancedStreamingEvent) => {
    setLoadingAction(event.id);
    try {
      // First update status
      const success = await onUpdateStatus(event.id, 'ended');
      
      // Then consume hours - calculate actual duration
      if (success) {
        const startedAt = event.started_at ? new Date(event.started_at) : new Date();
        const endedAt = new Date();
        const actualHours = Math.ceil((endedAt.getTime() - startedAt.getTime()) / (1000 * 60 * 60) * 100) / 100;

        const { error } = await (supabase as any).rpc('consume_live_hours', {
          _event_id: event.id,
          _actual_hours: actualHours
        });

        if (error) {
          console.error('Error consuming hours:', error);
        } else {
          toast({
            title: 'Transmisión finalizada',
            description: `Se consumieron ${actualHours.toFixed(2)} horas`
          });
        }
      }
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Eventos Live
              </CardTitle>
              <CardDescription>
                Programa y gestiona transmisiones en vivo
              </CardDescription>
            </div>
            <Button onClick={() => { setEditingEvent(null); setShowAddDialog(true); }} className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Evento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Summary */}
          <div className="flex items-center gap-4">
            {liveCount > 0 && (
              <Badge variant="destructive" className="gap-2 animate-pulse">
                <Video className="h-3 w-3" />
                {liveCount} EN VIVO
              </Badge>
            )}
            <Badge variant="outline" className="gap-2">
              <Clock className="h-3 w-3" />
              {scheduledCount} Programados
            </Badge>
          </div>

          {/* Filters */}
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList>
              <TabsTrigger value="all">Todos ({events.length})</TabsTrigger>
              <TabsTrigger value="live">En Vivo ({liveCount})</TabsTrigger>
              <TabsTrigger value="scheduled">Programados ({scheduledCount})</TabsTrigger>
              <TabsTrigger value="ended">Finalizados</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Events Table */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Sin eventos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primer evento de streaming
              </p>
              <Button onClick={() => setShowAddDialog(true)}>Crear Evento</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Duración Est.</TableHead>
                  <TableHead>Viewers</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => {
                  const status = STATUS_CONFIG[event.status] || STATUS_CONFIG.scheduled;
                  
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{event.title}</div>
                          {event.client && (
                            <div className="text-xs text-muted-foreground">{event.client.name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {event.event_type === 'shopping' ? 'Live Shopping' : 'Streaming'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>
                          {event.status === 'live' && <span className="animate-pulse mr-1">●</span>}
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.scheduled_at 
                          ? format(new Date(event.scheduled_at), "dd/MM/yyyy HH:mm", { locale: es })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {(event as any).estimated_duration_minutes 
                          ? `${(event as any).estimated_duration_minutes} min`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4 text-muted-foreground" />
                          {event.peak_viewers || 0}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={loadingAction === event.id}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Reserve hours option */}
                            {(event as EnhancedStreamingEvent).reservation_status !== 'reserved' && 
                             (event as EnhancedStreamingEvent).reservation_status !== 'consumed' &&
                             event.status !== 'live' && event.status !== 'ended' && (
                              <DropdownMenuItem onClick={() => handleReserveHours(event as EnhancedStreamingEvent)}>
                                <Lock className="h-4 w-4 mr-2" />
                                Reservar Horas
                              </DropdownMenuItem>
                            )}
                            {event.status === 'scheduled' && (event as EnhancedStreamingEvent).reservation_status === 'reserved' && (
                              <DropdownMenuItem onClick={() => handleStartLive(event as EnhancedStreamingEvent)}>
                                <Play className="h-4 w-4 mr-2" />
                                Iniciar Live
                              </DropdownMenuItem>
                            )}
                            {event.status === 'scheduled' && (event as EnhancedStreamingEvent).reservation_status !== 'reserved' && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center px-2 py-1.5 text-sm text-muted-foreground cursor-not-allowed">
                                      <AlertTriangle className="h-4 w-4 mr-2" />
                                      Iniciar Live
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Reserva las horas primero</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {event.status === 'live' && (
                              <DropdownMenuItem onClick={() => handleEndLive(event as EnhancedStreamingEvent)}>
                                <Square className="h-4 w-4 mr-2" />
                                Finalizar Live
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {onAssignCreator && (
                              <DropdownMenuItem onClick={() => onAssignCreator(event.id)}>
                                <Users className="h-4 w-4 mr-2" />
                                Asignar Creadores
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openEdit(event)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onDelete(event.id)}
                              className="text-destructive"
                            >
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Event Dialog */}
      <AddEventDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) setEditingEvent(null);
        }}
        onSave={onSave}
        accounts={accounts}
        editingEvent={editingEvent}
      />
    </div>
  );
}
