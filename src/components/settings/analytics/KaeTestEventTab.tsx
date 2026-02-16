import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, AlertTriangle } from 'lucide-react';
import { useKaeConfig } from '@/hooks/useKaeConfig';

const TEST_EVENTS = [
  { value: 'signup', label: 'Registro (signup)' },
  { value: 'trial_start', label: 'Inicio de Trial (trial_start)' },
  { value: 'subscription', label: 'Suscripci\u00f3n (subscription)' },
  { value: 'content_created', label: 'Contenido Creado (content_created)' },
];

export function KaeTestEventTab() {
  const { platforms, saving, sendTestEvent } = useKaeConfig();
  const [selectedEvent, setSelectedEvent] = useState('signup');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [lastResult, setLastResult] = useState<string | null>(null);

  const enabledPlatforms = platforms.filter((p) => p.enabled);

  const handleSend = async () => {
    if (!selectedPlatform) return;
    setLastResult(null);
    await sendTestEvent(selectedPlatform, selectedEvent);
    setLastResult(`Evento "${selectedEvent}" enviado a ${selectedPlatform} - revisa la tab de Logs para ver el resultado`);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Enviar Evento de Prueba</CardTitle>
          <CardDescription>
            Env\u00eda un evento de conversi\u00f3n de prueba a trav\u00e9s del pipeline completo
            (kae-conversion → plataforma de ads) para verificar la integraci\u00f3n.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {enabledPlatforms.length === 0 ? (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  No hay plataformas habilitadas
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Activa al menos una plataforma en la tab "Plataformas" para enviar eventos de prueba.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Tipo de Evento</label>
                  <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona evento" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_EVENTS.map((e) => (
                        <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Plataforma Destino</label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      {enabledPlatforms.map((p) => (
                        <SelectItem key={p.platform} value={p.platform}>
                          {p.platform.charAt(0).toUpperCase() + p.platform.slice(1)}
                          {p.test_mode && ' (Test Mode)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  onClick={handleSend}
                  disabled={saving || !selectedPlatform}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar Evento de Prueba
                </Button>

                {enabledPlatforms.some((p) => p.test_mode) && (
                  <Badge variant="outline" className="text-amber-600 border-amber-300">
                    Plataformas en modo test enviar\u00e1n con test_event_code
                  </Badge>
                )}
              </div>

              {lastResult && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
                  {lastResult}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Pipeline explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline de Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">1. Client SDK</Badge>
            <span>→</span>
            <Badge variant="secondary">2. kae-conversion</Badge>
            <span>→</span>
            <Badge variant="secondary">3. kae_events + kae_conversions</Badge>
            <span>→</span>
            <Badge variant="secondary">4. Ad Platform CAPI</Badge>
            <span>→</span>
            <Badge variant="secondary">5. kae_platform_logs</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
