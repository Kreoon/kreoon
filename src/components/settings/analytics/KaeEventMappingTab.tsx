import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save } from 'lucide-react';
import { useKaeConfig } from '@/hooks/useKaeConfig';

const KAE_EVENTS = [
  { name: 'signup', label: 'Registro', description: 'Usuario crea una cuenta' },
  { name: 'trial_start', label: 'Inicio de Prueba', description: 'Usuario inicia un trial' },
  { name: 'subscription', label: 'Suscripci\u00f3n', description: 'Usuario paga/suscribe' },
  { name: 'content_created', label: 'Contenido Creado', description: 'Primer contenido creado' },
];

const PLATFORM_LABELS: Record<string, string> = {
  meta: 'Meta',
  tiktok: 'TikTok',
  google: 'Google',
  linkedin: 'LinkedIn',
};

export function KaeEventMappingTab() {
  const { platforms, loading, saving, savePlatform } = useKaeConfig();
  const [mappings, setMappings] = useState<Record<string, Record<string, string>>>({});
  const [initialized, setInitialized] = useState(false);

  // Initialize mappings from platforms data
  if (!initialized && platforms.length > 0) {
    const initial: Record<string, Record<string, string>> = {};
    for (const p of platforms) {
      initial[p.platform] = { ...(p.event_mapping || {}) };
    }
    setMappings(initial);
    setInitialized(true);
  }

  const updateMapping = (platform: string, kaeEvent: string, platformEvent: string) => {
    setMappings((prev) => ({
      ...prev,
      [platform]: { ...(prev[platform] || {}), [kaeEvent]: platformEvent },
    }));
  };

  const handleSave = async (platformName: string) => {
    await savePlatform({
      platform: platformName,
      event_mapping: mappings[platformName] || {},
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapeo de Eventos</CardTitle>
          <CardDescription>
            Configura c\u00f3mo los eventos de KAE se traducen a eventos de cada plataforma de ads.
            Cada plataforma tiene nombres espec\u00edficos para sus eventos de conversi\u00f3n.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 pr-4 font-medium">Evento KAE</th>
                  {platforms.map((p) => (
                    <th key={p.platform} className="text-left py-3 px-2 font-medium">
                      <div className="flex items-center gap-2">
                        {PLATFORM_LABELS[p.platform] || p.platform}
                        {!p.enabled && (
                          <Badge variant="secondary" className="text-xs">Off</Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {KAE_EVENTS.map((event) => (
                  <tr key={event.name} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <div>
                        <div className="font-medium">{event.label}</div>
                        <div className="text-xs text-muted-foreground">{event.name}</div>
                      </div>
                    </td>
                    {platforms.map((p) => (
                      <td key={p.platform} className="py-3 px-2">
                        <Input
                          value={mappings[p.platform]?.[event.name] || ''}
                          onChange={(e) => updateMapping(p.platform, event.name, e.target.value)}
                          placeholder="Nombre del evento"
                          className="h-8 text-xs"
                          disabled={!p.enabled}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 mt-4">
            {platforms.filter((p) => p.enabled).map((p) => (
              <Button
                key={p.platform}
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={() => handleSave(p.platform)}
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                Guardar {PLATFORM_LABELS[p.platform]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
