// Integraciones con calendarios externos (Google Calendar, Outlook, etc.)

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Settings,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import type { CalendarIntegration, CalendarProvider } from '../../types';

interface CalendarIntegrationsProps {
  integrations: CalendarIntegration[];
  onConnect: (provider: CalendarProvider) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Pick<CalendarIntegration, 'sync_enabled' | 'check_conflicts' | 'create_events'>>) => Promise<void>;
  onSync?: (id: string) => Promise<void>;
  isLoading?: boolean;
}

const PROVIDERS: { value: CalendarProvider; label: string; icon: string; color: string }[] = [
  {
    value: 'google',
    label: 'Google Calendar',
    icon: '/icons/google-calendar.svg',
    color: '#4285F4',
  },
  {
    value: 'outlook',
    label: 'Outlook Calendar',
    icon: '/icons/outlook.svg',
    color: '#0078D4',
  },
  {
    value: 'apple',
    label: 'Apple Calendar',
    icon: '/icons/apple.svg',
    color: '#000000',
  },
];

export function CalendarIntegrations({
  integrations,
  onConnect,
  onDisconnect,
  onUpdate,
  onSync,
  isLoading,
}: CalendarIntegrationsProps) {
  const [connectingProvider, setConnectingProvider] = useState<CalendarProvider | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleConnect = async (provider: CalendarProvider) => {
    setConnectingProvider(provider);
    try {
      await onConnect(provider);
      toast.success(`${PROVIDERS.find((p) => p.value === provider)?.label} conectado`);
    } catch (error) {
      toast.error('Error al conectar calendario');
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    setDisconnectingId(id);
    try {
      await onDisconnect(id);
      toast.success('Calendario desconectado');
    } finally {
      setDisconnectingId(null);
    }
  };

  const handleSync = async (id: string) => {
    if (!onSync) return;
    setSyncingId(id);
    try {
      await onSync(id);
      toast.success('Sincronización completada');
    } catch (error) {
      toast.error('Error al sincronizar');
    } finally {
      setSyncingId(null);
    }
  };

  const connectedProviders = new Set(integrations.map((i) => i.provider));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-violet-500" />
          Integraciones de calendario
        </h3>
        <p className="text-sm text-slate-500 mt-1">
          Sincroniza tus reservas con calendarios externos
        </p>
      </div>

      {/* Calendarios conectados */}
      <div className="space-y-3">
        <AnimatePresence>
          {integrations.map((integration) => {
            const provider = PROVIDERS.find((p) => p.value === integration.provider);
            const isExpanded = expandedId === integration.id;

            return (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white border border-slate-200 rounded-sm overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-sm flex items-center justify-center"
                      style={{ backgroundColor: `${provider?.color}15` }}
                    >
                      <Calendar
                        className="w-6 h-6"
                        style={{ color: provider?.color }}
                      />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-slate-900">
                          {provider?.label}
                        </h4>
                        {integration.sync_enabled ? (
                          <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 text-xs font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Conectado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium">
                            Pausado
                          </span>
                        )}
                      </div>
                      {integration.calendar_name && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          {integration.calendar_name}
                        </p>
                      )}
                      {integration.last_sync_at && (
                        <p className="text-xs text-slate-400 mt-1">
                          Última sincronización:{' '}
                          {new Date(integration.last_sync_at).toLocaleString('es')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {onSync && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSync(integration.id)}
                          disabled={syncingId === integration.id}
                          className="text-slate-400 hover:text-violet-600"
                        >
                          {syncingId === integration.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedId(isExpanded ? null : integration.id)}
                        className="text-slate-400 hover:text-violet-600"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(integration.id)}
                        disabled={disconnectingId === integration.id}
                        className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                      >
                        {disconnectingId === integration.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Settings expandidas */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-100"
                    >
                      <div className="p-4 bg-slate-50 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium text-slate-900">
                              Sincronización activa
                            </Label>
                            <p className="text-xs text-slate-500">
                              Mantén sincronizadas las reservas con tu calendario
                            </p>
                          </div>
                          <Switch
                            checked={integration.sync_enabled}
                            onCheckedChange={(checked) =>
                              onUpdate(integration.id, { sync_enabled: checked })
                            }
                            className="data-[state=checked]:bg-violet-500"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium text-slate-900">
                              Verificar conflictos
                            </Label>
                            <p className="text-xs text-slate-500">
                              Bloquear slots ocupados en tu calendario externo
                            </p>
                          </div>
                          <Switch
                            checked={integration.check_conflicts}
                            onCheckedChange={(checked) =>
                              onUpdate(integration.id, { check_conflicts: checked })
                            }
                            className="data-[state=checked]:bg-violet-500"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium text-slate-900">
                              Crear eventos
                            </Label>
                            <p className="text-xs text-slate-500">
                              Crear evento en calendario externo al confirmar reserva
                            </p>
                          </div>
                          <Switch
                            checked={integration.create_events}
                            onCheckedChange={(checked) =>
                              onUpdate(integration.id, { create_events: checked })
                            }
                            className="data-[state=checked]:bg-violet-500"
                          />
                        </div>

                        {integration.sync_errors && (
                          <div className="p-3 rounded-sm bg-red-50 border border-red-100">
                            <div className="flex items-start gap-2 text-red-600">
                              <AlertCircle className="w-4 h-4 mt-0.5" />
                              <div>
                                <p className="text-sm font-medium">Error de sincronización</p>
                                <p className="text-xs mt-1">
                                  {JSON.stringify(integration.sync_errors)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Conectar nuevos calendarios */}
      {PROVIDERS.filter((p) => !connectedProviders.has(p.value)).length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">
            Conectar calendario
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PROVIDERS.filter((p) => !connectedProviders.has(p.value)).map((provider) => (
              <motion.button
                key={provider.value}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleConnect(provider.value)}
                disabled={connectingProvider === provider.value}
                className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-sm hover:border-violet-300 hover:shadow-md transition-all disabled:opacity-50 text-left group"
              >
                <div
                  className="w-10 h-10 rounded-sm flex items-center justify-center"
                  style={{ backgroundColor: `${provider.color}15` }}
                >
                  {connectingProvider === provider.value ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: provider.color }} />
                  ) : (
                    <Calendar className="w-5 h-5" style={{ color: provider.color }} />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{provider.label}</p>
                  <p className="text-xs text-slate-500">Clic para conectar</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 transition-colors" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {integrations.length === 0 && (
        <div className="text-center py-8 bg-slate-50 rounded-sm border-2 border-dashed border-slate-200">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <h4 className="font-medium text-slate-900 mb-2">
            Sin calendarios conectados
          </h4>
          <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
            Conecta tu calendario para sincronizar reservas y verificar disponibilidad automáticamente
          </p>
        </div>
      )}
    </div>
  );
}
