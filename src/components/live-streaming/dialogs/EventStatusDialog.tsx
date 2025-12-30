import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowRight, FileEdit, Calendar, Radio, CheckCircle2, XCircle, AlertTriangle, Play, Square } from 'lucide-react';
import { STATUS_COLORS, EVENT_STATUS_FLOW } from '../LiveStreamingConstants';
import type { StreamingEvent, StreamingEventStatus } from '@/hooks/useLiveStreaming';

interface EventStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: StreamingEvent | null;
  onUpdateStatus: (eventId: string, status: StreamingEventStatus) => Promise<boolean>;
  connectedChannelsCount: number;
}

const STATUS_INFO: Record<string, { label: string; icon: React.ReactNode; description: string; color: string }> = {
  draft: { 
    label: 'Borrador', 
    icon: <FileEdit className="h-4 w-4" />, 
    description: 'Evento en preparación',
    color: 'text-muted-foreground'
  },
  scheduled: { 
    label: 'Programado', 
    icon: <Calendar className="h-4 w-4" />, 
    description: 'Listo para transmitir',
    color: 'text-blue-500'
  },
  live: { 
    label: 'En Vivo', 
    icon: <Radio className="h-4 w-4" />, 
    description: 'Transmitiendo ahora',
    color: 'text-red-500'
  },
  ended: { 
    label: 'Finalizado', 
    icon: <CheckCircle2 className="h-4 w-4" />, 
    description: 'Transmisión terminada',
    color: 'text-green-500'
  },
  cancelled: { 
    label: 'Cancelado', 
    icon: <XCircle className="h-4 w-4" />, 
    description: 'Evento cancelado',
    color: 'text-destructive'
  },
};

export function EventStatusDialog({ open, onOpenChange, event, onUpdateStatus, connectedChannelsCount }: EventStatusDialogProps) {
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');

  if (!event) return null;

  const currentIndex = EVENT_STATUS_FLOW.indexOf(event.status);
  
  // Validation checks
  const hasScheduledDate = !!event.scheduled_at;
  const hasChannels = connectedChannelsCount > 0 || (event.target_accounts && event.target_accounts.length > 0);
  
  const canSchedule = event.status === 'draft' && hasScheduledDate;
  const canGoLive = event.status === 'scheduled' && hasChannels;
  const canEnd = event.status === 'live';
  const canCancel = event.status !== 'ended' && event.status !== 'cancelled';

  const handleStatusChange = async (newStatus: StreamingEventStatus) => {
    setLoading(true);
    const success = await onUpdateStatus(event.id, newStatus);
    setLoading(false);
    
    if (success) {
      setNotes('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Estado del Evento</DialogTitle>
          <DialogDescription>
            {event.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status Timeline */}
          <div className="flex items-center justify-between">
            {EVENT_STATUS_FLOW.map((status, index) => {
              const info = STATUS_INFO[status];
              const isCompleted = index < currentIndex;
              const isCurrent = event.status === status;
              const isPending = index > currentIndex && event.status !== 'cancelled';
              
              return (
                <div key={status} className="flex items-center">
                  <div className={`flex flex-col items-center ${isPending ? 'opacity-40' : ''}`}>
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isCompleted ? 'bg-green-500 text-white' : ''}
                      ${isCurrent ? `bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2` : ''}
                      ${isPending ? 'bg-muted text-muted-foreground' : ''}
                      ${event.status === 'cancelled' && status !== 'cancelled' ? 'opacity-30' : ''}
                    `}>
                      {info.icon}
                    </div>
                    <span className={`text-xs mt-1 ${isCurrent ? 'font-semibold' : ''}`}>
                      {info.label}
                    </span>
                  </div>
                  {index < EVENT_STATUS_FLOW.length - 1 && (
                    <ArrowRight className={`h-4 w-4 mx-1 ${index >= currentIndex ? 'text-muted-foreground' : 'text-green-500'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Current Status */}
          <div className="p-4 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Estado actual:</span>
              <Badge className={STATUS_COLORS[event.status] || STATUS_COLORS.draft}>
                {STATUS_INFO[event.status]?.label || event.status}
              </Badge>
            </div>
            <p className="text-sm">{STATUS_INFO[event.status]?.description}</p>
          </div>

          {/* Validation Warnings */}
          {event.status === 'draft' && !hasScheduledDate && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Debes establecer una fecha y hora para poder programar el evento.
              </AlertDescription>
            </Alert>
          )}

          {event.status === 'scheduled' && !hasChannels && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No hay canales conectados. Conecta al menos un canal antes de iniciar la transmisión.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <Label>Acciones disponibles</Label>
            <div className="grid grid-cols-2 gap-3">
              {event.status === 'draft' && (
                <Button 
                  onClick={() => handleStatusChange('scheduled')}
                  disabled={loading || !canSchedule}
                  className="gap-2"
                >
                  <Calendar className="h-4 w-4" />
                  Programar
                </Button>
              )}

              {event.status === 'scheduled' && (
                <Button 
                  onClick={() => handleStatusChange('live')}
                  disabled={loading || !canGoLive}
                  className="gap-2 bg-red-600 hover:bg-red-700"
                >
                  <Play className="h-4 w-4" />
                  Iniciar Live
                </Button>
              )}

              {event.status === 'live' && (
                <Button 
                  onClick={() => handleStatusChange('ended')}
                  disabled={loading}
                  variant="destructive"
                  className="gap-2"
                >
                  <Square className="h-4 w-4" />
                  Detener Live
                </Button>
              )}

              {canCancel && event.status !== 'live' && (
                <Button 
                  onClick={() => handleStatusChange('cancelled')}
                  disabled={loading}
                  variant="outline"
                  className="gap-2 text-destructive border-destructive/50"
                >
                  <XCircle className="h-4 w-4" />
                  Cancelar Evento
                </Button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Agregar notas sobre este cambio..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
