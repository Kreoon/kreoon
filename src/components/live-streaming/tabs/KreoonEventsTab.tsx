import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Play, Square, Clock, Users, Plus, Video, Eye, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { StreamingEvent } from '@/hooks/useLiveStreaming';
import { AddEventDialog } from '@/components/live-streaming/dialogs/AddEventDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface KreoonEventsTabProps {
  events: StreamingEvent[];
  onSave: (event: Partial<StreamingEvent>) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAssignCreator?: (eventId: string) => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  scheduled: { label: 'Programado', variant: 'secondary' },
  live: { label: 'EN VIVO', variant: 'destructive' },
  ended: { label: 'Finalizado', variant: 'outline' },
  cancelled: { label: 'Cancelado', variant: 'outline' },
};

export function KreoonEventsTab({ 
  events, 
  onSave, 
  onUpdateStatus, 
  onDelete,
  onAssignCreator 
}: KreoonEventsTabProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<StreamingEvent | null>(null);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all');

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

  const handleSave = async (data: Partial<StreamingEvent>) => {
    await onSave({ ...editingEvent, ...data });
    setEditingEvent(null);
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
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {event.status === 'scheduled' && (
                              <DropdownMenuItem onClick={() => onUpdateStatus(event.id, 'live')}>
                                <Play className="h-4 w-4 mr-2" />
                                Iniciar Live
                              </DropdownMenuItem>
                            )}
                            {event.status === 'live' && (
                              <DropdownMenuItem onClick={() => onUpdateStatus(event.id, 'ended')}>
                                <Square className="h-4 w-4 mr-2" />
                                Finalizar Live
                              </DropdownMenuItem>
                            )}
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
        onSave={async (data) => { await handleSave(data); return true; }}
      />
    </div>
  );
}
