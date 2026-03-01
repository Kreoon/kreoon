// Editor de webhooks para notificaciones de booking

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Webhook,
  Plus,
  Trash2,
  Edit2,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
  History,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import type { BookingWebhook, BookingWebhookInput, WebhookEvent, WebhookLog } from '../../types';

interface WebhooksEditorProps {
  webhooks: BookingWebhook[];
  logs?: WebhookLog[];
  onAdd: (webhook: BookingWebhookInput) => Promise<void>;
  onUpdate: (id: string, webhook: Partial<BookingWebhookInput>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTest?: (id: string) => Promise<void>;
  isLoading?: boolean;
}

const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; description: string }[] = [
  { value: 'booking.created', label: 'Reserva creada', description: 'Cuando se crea una nueva reserva' },
  { value: 'booking.confirmed', label: 'Reserva confirmada', description: 'Cuando confirmas una reserva' },
  { value: 'booking.cancelled', label: 'Reserva cancelada', description: 'Cuando se cancela una reserva' },
  { value: 'booking.rescheduled', label: 'Reserva reprogramada', description: 'Cuando se cambia la fecha/hora' },
  { value: 'booking.completed', label: 'Reserva completada', description: 'Cuando la cita termina' },
];

export function WebhooksEditor({
  webhooks,
  logs = [],
  onAdd,
  onUpdate,
  onDelete,
  onTest,
  isLoading,
}: WebhooksEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newEvents, setNewEvents] = useState<WebhookEvent[]>(['booking.created', 'booking.confirmed', 'booking.cancelled']);
  const [addingLoading, setAddingLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSecretId, setShowSecretId] = useState<string | null>(null);
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedWebhookLogs, setSelectedWebhookLogs] = useState<WebhookLog[]>([]);
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newUrl.trim()) return;

    setAddingLoading(true);
    try {
      await onAdd({
        url: newUrl,
        name: newName || undefined,
        events: newEvents,
      });
      setNewUrl('');
      setNewName('');
      setNewEvents(['booking.created', 'booking.confirmed', 'booking.cancelled']);
      setIsAdding(false);
      toast.success('Webhook creado correctamente');
    } catch (error) {
      toast.error('Error al crear webhook');
    } finally {
      setAddingLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
      toast.success('Webhook eliminado');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await onUpdate(id, { active });
    toast.success(active ? 'Webhook activado' : 'Webhook desactivado');
  };

  const handleTest = async (id: string) => {
    if (!onTest) return;
    setTestingId(id);
    try {
      await onTest(id);
      toast.success('Webhook de prueba enviado');
    } catch (error) {
      toast.error('Error al enviar prueba');
    } finally {
      setTestingId(null);
    }
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copiado');
  };

  const openLogs = (webhookId: string) => {
    const webhookLogs = logs.filter((l) => l.webhook_id === webhookId);
    setSelectedWebhookLogs(webhookLogs);
    setLogsDialogOpen(true);
  };

  const toggleEvent = (event: WebhookEvent) => {
    setNewEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Webhook className="w-5 h-5 text-violet-500" />
            Webhooks
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Notifica a sistemas externos cuando ocurran eventos de booking
          </p>
        </div>
        {!isAdding && (
          <Button
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo webhook
          </Button>
        )}
      </div>

      {/* Lista de webhooks */}
      <div className="space-y-3">
        <AnimatePresence>
          {webhooks.map((webhook) => (
            <motion.div
              key={webhook.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      webhook.active ? 'bg-green-50' : 'bg-slate-100'
                    }`}
                  >
                    <Webhook
                      className={`w-5 h-5 ${
                        webhook.active ? 'text-green-600' : 'text-slate-400'
                      }`}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900 truncate">
                        {webhook.name || 'Webhook'}
                      </h4>
                      {!webhook.active && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                          Inactivo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 truncate mt-0.5">
                      {webhook.url}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {webhook.events.map((event) => (
                        <span
                          key={event}
                          className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 text-xs font-medium"
                        >
                          {WEBHOOK_EVENTS.find((e) => e.value === event)?.label || event}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {onTest && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(webhook.id)}
                        disabled={testingId === webhook.id}
                        className="text-slate-400 hover:text-violet-600"
                      >
                        {testingId === webhook.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openLogs(webhook.id)}
                      className="text-slate-400 hover:text-violet-600"
                    >
                      <History className="w-4 h-4" />
                    </Button>

                    <Switch
                      checked={webhook.active}
                      onCheckedChange={(checked) => handleToggle(webhook.id, checked)}
                      className="data-[state=checked]:bg-violet-500"
                    />

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(webhook.id)}
                      disabled={deletingId === webhook.id}
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                    >
                      {deletingId === webhook.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Secret */}
                {webhook.secret && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-slate-500">Secret:</Label>
                      <div className="flex items-center gap-1 flex-1">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono flex-1 truncate">
                          {showSecretId === webhook.id
                            ? webhook.secret
                            : '••••••••••••••••••••••••••••••••'}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setShowSecretId(
                              showSecretId === webhook.id ? null : webhook.id
                            )
                          }
                          className="h-6 w-6 p-0"
                        >
                          {showSecretId === webhook.id ? (
                            <EyeOff className="w-3 h-3" />
                          ) : (
                            <Eye className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copySecret(webhook.secret!)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {webhooks.length === 0 && !isAdding && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Webhook className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h4 className="font-medium text-slate-900 mb-2">Sin webhooks</h4>
          <p className="text-sm text-slate-500 mb-4">
            Crea tu primer webhook para recibir notificaciones en tiempo real
          </p>
          <Button
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="rounded-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crear webhook
          </Button>
        </div>
      )}

      {/* Formulario para agregar */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-violet-50 border border-violet-200 rounded-xl p-5 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-slate-700">Nombre (opcional)</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Mi webhook"
                  className="mt-1 bg-white"
                />
              </div>
              <div>
                <Label className="text-sm text-slate-700">URL del endpoint *</Label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://tu-servidor.com/webhook"
                  className="mt-1 bg-white"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-slate-700 mb-3 block">
                Eventos a notificar
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <div
                    key={event.value}
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200"
                  >
                    <Checkbox
                      id={event.value}
                      checked={newEvents.includes(event.value)}
                      onCheckedChange={() => toggleEvent(event.value)}
                      className="mt-0.5 border-slate-300 data-[state=checked]:bg-violet-600"
                    />
                    <div>
                      <Label
                        htmlFor={event.value}
                        className="text-sm font-medium text-slate-900 cursor-pointer"
                      >
                        {event.label}
                      </Label>
                      <p className="text-xs text-slate-500">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setIsAdding(false)}
                className="rounded-lg"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAdd}
                disabled={!newUrl.trim() || newEvents.length === 0 || addingLoading}
                className="rounded-lg bg-violet-600 hover:bg-violet-700"
              >
                {addingLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear webhook
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog de logs */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Historial de envíos</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {selectedWebhookLogs.length === 0 ? (
              <p className="text-center py-8 text-slate-500">
                No hay registros de envíos
              </p>
            ) : (
              selectedWebhookLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <div
                    className={`p-1.5 rounded-full ${
                      log.response_status && log.response_status >= 200 && log.response_status < 300
                        ? 'bg-green-100'
                        : 'bg-red-100'
                    }`}
                  >
                    {log.response_status && log.response_status >= 200 && log.response_status < 300 ? (
                      <Check className="w-3 h-3 text-green-600" />
                    ) : (
                      <AlertCircle className="w-3 h-3 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {WEBHOOK_EVENTS.find((e) => e.value === log.event_type)?.label || log.event_type}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(log.sent_at).toLocaleString('es')} · {log.response_time_ms}ms
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      log.response_status && log.response_status >= 200 && log.response_status < 300
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {log.response_status || 'Error'}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
