// Event Type List - Calendly-inspired design

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
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
  Calendar,
  Sparkles,
  ArrowRight,
  CheckCircle2,
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

// Calendly-style design tokens
const styles = {
  card: {
    background: '#FFFFFF',
    borderRadius: '16px',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
  },
  emptyState: {
    background: 'linear-gradient(135deg, #FAFBFC 0%, #F1F5F9 100%)',
    borderRadius: '20px',
    border: '2px dashed #E2E8F0',
    padding: '48px',
    textAlign: 'center' as const,
  },
  createButton: {
    background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    color: '#FFFFFF',
    fontWeight: 600,
    padding: '12px 24px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    boxShadow: '0 4px 14px rgba(139, 92, 246, 0.25)',
    transition: 'all 0.2s ease',
  },
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    setCopiedId(eventType.id);
    toast.success('Enlace copiado');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenLink = (eventType: BookingEventType) => {
    const username = profile?.username || profile?.id;
    const url = `${window.location.origin}/book/${username}/${eventType.slug}`;
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={styles.card}
            className="animate-pulse p-6"
          >
            <div className="flex gap-4">
              <div className="w-1 h-16 bg-slate-200 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="h-5 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
      >
        <div>
          <h3 className="text-xl font-semibold text-slate-900">
            Tipos de evento
          </h3>
          <p className="text-slate-500 text-sm mt-1">
            Configura los tipos de citas que ofreces a tus clientes
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, boxShadow: '0 6px 20px rgba(139, 92, 246, 0.3)' }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsCreateOpen(true)}
          style={styles.createButton}
        >
          <Plus className="w-5 h-5" />
          Nuevo evento
        </motion.button>
      </motion.div>

      {/* Lista de tipos */}
      {eventTypes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={styles.emptyState}
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-violet-50 mb-6">
            <Calendar className="w-8 h-8 text-violet-500" />
          </div>
          <h4 className="text-xl font-semibold text-slate-900 mb-2">
            Crea tu primer tipo de evento
          </h4>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            Define diferentes tipos de citas como consultas, demos, o llamadas de seguimiento.
            Cada tipo puede tener su propia duración y configuración.
          </p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsCreateOpen(true)}
            style={styles.createButton}
          >
            <Sparkles className="w-5 h-5" />
            Crear tipo de evento
          </motion.button>
        </motion.div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {eventTypes.map((eventType, index) => {
              const LocationIcon = LOCATION_ICONS[eventType.location_type];

              return (
                <motion.div
                  key={eventType.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: index * 0.05 }}
                  style={styles.card}
                  className={`group hover:shadow-lg hover:border-violet-200 ${
                    !eventType.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-stretch">
                    {/* Color bar */}
                    <div
                      className="w-1.5 flex-shrink-0"
                      style={{ backgroundColor: eventType.color }}
                    />

                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-slate-900 text-lg truncate">
                              {eventType.title}
                            </h4>
                            {!eventType.is_active && (
                              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                                Inactivo
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 mt-2">
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                              <Clock className="w-4 h-4 text-slate-400" />
                              {eventType.duration_minutes} minutos
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                              <LocationIcon className="w-4 h-4 text-slate-400" />
                              {LOCATION_TYPE_LABELS[eventType.location_type]}
                            </span>
                          </div>

                          {eventType.description && (
                            <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                              {eventType.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {/* Quick copy button */}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleCopyLink(eventType)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-lg hover:bg-slate-100"
                          >
                            {copiedId === eventType.id ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4 text-slate-400" />
                            )}
                          </motion.button>

                          {/* Toggle */}
                          <Switch
                            checked={eventType.is_active}
                            onCheckedChange={(checked) =>
                              toggleEventType.mutate({ id: eventType.id, is_active: checked })
                            }
                          />

                          {/* More options */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
                                <MoreVertical className="w-5 h-5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleOpenLink(eventType)}>
                                <ExternalLink className="w-4 h-4 mr-2" />
                                Ver página
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyLink(eventType)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Copiar enlace
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setEditingType(eventType)}>
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => setDeletingType(eventType)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog crear */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6 border-b bg-slate-50">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Crear tipo de evento
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6">
            <EventTypeForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreateOpen(false)}
              isLoading={createEventType.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog editar */}
      <Dialog open={!!editingType} onOpenChange={() => setEditingType(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6 border-b bg-slate-50">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Editar tipo de evento
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="p-6">
            {editingType && (
              <EventTypeForm
                eventType={editingType}
                onSubmit={handleUpdate}
                onCancel={() => setEditingType(null)}
                isLoading={updateEventType.isPending}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Alert eliminar */}
      <AlertDialog open={!!deletingType} onOpenChange={() => setDeletingType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar tipo de evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente "{deletingType?.title}" y todas las
              reservas pendientes asociadas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
