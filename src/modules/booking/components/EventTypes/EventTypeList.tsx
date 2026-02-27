// Lista de tipos de evento configurados

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  ExternalLink,
  Clock,
  Video,
  Phone,
  MapPin,
  Link as LinkIcon,
} from 'lucide-react';
import { useEventTypes } from '../../hooks';
import { EventTypeForm } from './EventTypeForm';
import type { BookingEventType, EventTypeInput, BookingLocationType } from '../../types';
import { LOCATION_TYPE_LABELS } from '../../types';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/useProfile';

const LOCATION_ICONS: Record<BookingLocationType, React.ComponentType<{ className?: string }>> = {
  google_meet: Video,
  zoom: Video,
  phone: Phone,
  in_person: MapPin,
  custom: LinkIcon,
};

export function EventTypeList() {
  const { profile } = useProfile();
  const {
    eventTypes,
    isLoading,
    createEventType,
    updateEventType,
    deleteEventType,
    toggleEventType,
  } = useEventTypes();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingType, setEditingType] = useState<BookingEventType | null>(null);
  const [deletingType, setDeletingType] = useState<BookingEventType | null>(null);

  const handleCreate = (data: EventTypeInput) => {
    createEventType.mutate(data, {
      onSuccess: () => setIsCreateOpen(false),
    });
  };

  const handleUpdate = (data: EventTypeInput) => {
    if (!editingType) return;
    updateEventType.mutate(
      { id: editingType.id, ...data },
      {
        onSuccess: () => setEditingType(null),
      }
    );
  };

  const handleDelete = () => {
    if (!deletingType) return;
    deleteEventType.mutate(deletingType.id, {
      onSuccess: () => setDeletingType(null),
    });
  };

  const handleCopyLink = (eventType: BookingEventType) => {
    const username = profile?.username || profile?.id;
    const url = `${window.location.origin}/book/${username}/${eventType.slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Enlace copiado al portapapeles');
  };

  const handleOpenLink = (eventType: BookingEventType) => {
    const username = profile?.username || profile?.id;
    const url = `${window.location.origin}/book/${username}/${eventType.slug}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded w-1/3 mb-2" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con botón crear */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Tipos de evento</h3>
          <p className="text-sm text-muted-foreground">
            Configura los tipos de citas que ofreces
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo tipo
        </Button>
      </div>

      {/* Lista de tipos */}
      {eventTypes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="text-lg font-medium mb-2">No tienes tipos de evento</h4>
            <p className="text-muted-foreground mb-4">
              Crea tu primer tipo de evento para que la gente pueda agendar contigo
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Crear tipo de evento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {eventTypes.map((eventType) => {
            const LocationIcon = LOCATION_ICONS[eventType.location_type];

            return (
              <Card
                key={eventType.id}
                className={`transition-opacity ${
                  !eventType.is_active ? 'opacity-60' : ''
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                      {/* Color indicator */}
                      <div
                        className="w-1 h-full rounded-full min-h-[60px]"
                        style={{ backgroundColor: eventType.color }}
                      />

                      <div>
                        <h4 className="font-medium">{eventType.title}</h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {eventType.duration_minutes} min
                          </span>
                          <span className="flex items-center gap-1">
                            <LocationIcon className="h-3.5 w-3.5" />
                            {LOCATION_TYPE_LABELS[eventType.location_type]}
                          </span>
                        </div>
                        {eventType.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {eventType.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Switch
                        checked={eventType.is_active}
                        onCheckedChange={(checked) =>
                          toggleEventType.mutate({ id: eventType.id, is_active: checked })
                        }
                      />

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenLink(eventType)}>
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Ver página
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyLink(eventType)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar enlace
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setEditingType(eventType)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeletingType(eventType)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog crear */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear tipo de evento</DialogTitle>
          </DialogHeader>
          <EventTypeForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateOpen(false)}
            isLoading={createEventType.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog editar */}
      <Dialog open={!!editingType} onOpenChange={() => setEditingType(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar tipo de evento</DialogTitle>
          </DialogHeader>
          {editingType && (
            <EventTypeForm
              eventType={editingType}
              onSubmit={handleUpdate}
              onCancel={() => setEditingType(null)}
              isLoading={updateEventType.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Alert eliminar */}
      <AlertDialog open={!!deletingType} onOpenChange={() => setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tipo de evento</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres eliminar "{deletingType?.title}"? Esta acción
              no se puede deshacer y se eliminarán todas las reservas pendientes asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
