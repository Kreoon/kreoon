import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Plus, UserCheck, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { LiveEventCreator } from '@/hooks/useKreoonLive';
import { StreamingEvent } from '@/hooks/useLiveStreaming';

interface Creator {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface KreoonCreatorsTabProps {
  events: StreamingEvent[];
  eventCreators: LiveEventCreator[];
  availableCreators: Creator[];
  onAssign: (eventId: string, creatorId: string, role: 'host' | 'co_host' | 'support' | 'guest') => Promise<void>;
  onConfirm: (assignmentId: string, confirmed: boolean) => Promise<void>;
  onRemove: (assignmentId: string) => Promise<void>;
}

const ROLE_LABELS: Record<string, string> = {
  host: 'Host Principal',
  co_host: 'Co-Host',
  support: 'Soporte',
  guest: 'Invitado',
};

const ROLE_COLORS: Record<string, string> = {
  host: 'bg-primary text-primary-foreground',
  co_host: 'bg-blue-500/10 text-blue-500',
  support: 'bg-orange-500/10 text-orange-500',
  guest: 'bg-muted text-muted-foreground',
};

export function KreoonCreatorsTab({ 
  events,
  eventCreators, 
  availableCreators,
  onAssign,
  onConfirm,
  onRemove 
}: KreoonCreatorsTabProps) {
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedCreatorId, setSelectedCreatorId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'host' | 'co_host' | 'support' | 'guest'>('host');

  const handleAssign = async () => {
    if (!selectedEventId || !selectedCreatorId) return;
    await onAssign(selectedEventId, selectedCreatorId, selectedRole);
    setShowAssignDialog(false);
    setSelectedEventId('');
    setSelectedCreatorId('');
  };

  const upcomingEvents = events.filter(e => e.status === 'scheduled' || e.status === 'live');

  // Group creators by event
  const creatorsByEvent = eventCreators.reduce((acc, ec) => {
    if (!acc[ec.event_id]) acc[ec.event_id] = [];
    acc[ec.event_id].push(ec);
    return acc;
  }, {} as Record<string, LiveEventCreator[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Asignación de Creadores
              </CardTitle>
              <CardDescription>
                Asigna creadores a eventos de streaming
              </CardDescription>
            </div>
            <Button onClick={() => setShowAssignDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Asignar Creador
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {upcomingEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Sin eventos próximos</h3>
              <p className="text-sm text-muted-foreground">
                Crea un evento primero para asignar creadores
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {upcomingEvents.map((event) => {
                const creators = creatorsByEvent[event.id] || [];
                
                return (
                  <div key={event.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="font-semibold">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {event.scheduled_at 
                            ? format(new Date(event.scheduled_at), "dd/MM/yyyy HH:mm", { locale: es })
                            : 'Sin fecha'}
                        </p>
                      </div>
                      <Badge variant={event.status === 'live' ? 'destructive' : 'secondary'}>
                        {event.status === 'live' ? 'EN VIVO' : 'Programado'}
                      </Badge>
                    </div>

                    {creators.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Sin creadores asignados
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Creador</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {creators.map((ec) => (
                            <TableRow key={ec.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8">
                                    <AvatarImage src={ec.creator?.avatar_url || undefined} />
                                    <AvatarFallback>
                                      {ec.creator?.full_name?.charAt(0) || 'C'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{ec.creator?.full_name || 'Creador'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={ROLE_COLORS[ec.role] || ''}>
                                  {ROLE_LABELS[ec.role] || ec.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {ec.confirmed_at ? (
                                  <Badge variant="default" className="gap-1">
                                    <UserCheck className="h-3 w-3" />
                                    Confirmado
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">Pendiente</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {!ec.confirmed_at && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => onConfirm(ec.id, true)}
                                    >
                                      <UserCheck className="h-4 w-4 mr-1" />
                                      Confirmar
                                    </Button>
                                  )}
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => onRemove(ec.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Creator Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Creador a Evento</DialogTitle>
            <DialogDescription>
              Selecciona el evento y el creador a asignar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Evento</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un evento" />
                </SelectTrigger>
                <SelectContent>
                  {upcomingEvents.map((event) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Creador</Label>
              <Select value={selectedCreatorId} onValueChange={setSelectedCreatorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un creador" />
                </SelectTrigger>
                <SelectContent>
                  {availableCreators.map((creator) => (
                    <SelectItem key={creator.id} value={creator.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={creator.avatar_url || undefined} />
                          <AvatarFallback>{creator.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        {creator.full_name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="host">Host Principal</SelectItem>
                  <SelectItem value="co_host">Co-Host</SelectItem>
                  <SelectItem value="support">Soporte</SelectItem>
                  <SelectItem value="guest">Invitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!selectedEventId || !selectedCreatorId}
            >
              Asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
