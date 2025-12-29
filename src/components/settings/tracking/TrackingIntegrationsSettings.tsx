import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, ExternalLink, Save } from 'lucide-react';
import { useTrackingConfig } from '@/hooks/useTrackingConfig';
import type { TrackingProvider } from '@/types/tracking';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TrackingIntegrationsSettingsProps {
  organizationId: string;
}

const PROVIDERS: { 
  value: TrackingProvider; 
  label: string; 
  description: string;
  idPlaceholder: string;
  docsUrl: string;
  icon: string;
}[] = [
  { 
    value: 'google_analytics', 
    label: 'Google Analytics 4', 
    description: 'Tracking web y conversiones',
    idPlaceholder: 'G-XXXXXXXXXX',
    docsUrl: 'https://analytics.google.com/',
    icon: '📊'
  },
  { 
    value: 'meta_pixel', 
    label: 'Meta Pixel', 
    description: 'Facebook/Instagram Ads',
    idPlaceholder: '1234567890123456',
    docsUrl: 'https://business.facebook.com/events_manager',
    icon: '📘'
  },
  { 
    value: 'tiktok_pixel', 
    label: 'TikTok Pixel', 
    description: 'TikTok Ads tracking',
    idPlaceholder: 'XXXXXXXXXXXXXXXXX',
    docsUrl: 'https://ads.tiktok.com/help/article/tiktok-pixel',
    icon: '🎵'
  },
  { 
    value: 'linkedin_insight', 
    label: 'LinkedIn Insight', 
    description: 'LinkedIn Ads tracking',
    idPlaceholder: '123456',
    docsUrl: 'https://www.linkedin.com/help/lms/answer/a418880',
    icon: '💼'
  },
  { 
    value: 'hotjar', 
    label: 'Hotjar', 
    description: 'Heatmaps y grabaciones',
    idPlaceholder: '1234567',
    docsUrl: 'https://www.hotjar.com/',
    icon: '🔥'
  },
  { 
    value: 'clarity', 
    label: 'Microsoft Clarity', 
    description: 'Heatmaps gratuitos',
    idPlaceholder: 'abcdefghij',
    docsUrl: 'https://clarity.microsoft.com/',
    icon: '🔍'
  },
  { 
    value: 'custom_webhook', 
    label: 'Custom Webhook', 
    description: 'Envía eventos a tu endpoint',
    idPlaceholder: 'https://your-api.com/webhook',
    docsUrl: '',
    icon: '🔗'
  },
];

export function TrackingIntegrationsSettings({ organizationId }: TrackingIntegrationsSettingsProps) {
  const { integrations, loading, saving, saveIntegration, deleteIntegration } = useTrackingConfig({ organizationId });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<TrackingProvider | null>(null);
  const [formState, setFormState] = useState({
    provider: '' as TrackingProvider,
    providerId: '',
    enabled: true,
  });

  const handleAddIntegration = () => {
    setEditingProvider(null);
    setFormState({ provider: '' as TrackingProvider, providerId: '', enabled: true });
    setDialogOpen(true);
  };

  const handleEditIntegration = (provider: TrackingProvider) => {
    const integration = integrations.find(i => i.provider === provider);
    if (integration) {
      setEditingProvider(provider);
      setFormState({
        provider: integration.provider,
        providerId: integration.providerId || '',
        enabled: integration.enabled,
      });
      setDialogOpen(true);
    }
  };

  const handleSaveIntegration = async () => {
    const existingIntegration = integrations.find(i => i.provider === formState.provider);
    await saveIntegration({
      id: existingIntegration?.id,
      provider: formState.provider,
      providerId: formState.providerId,
      enabled: formState.enabled,
    });
    setDialogOpen(false);
  };

  const handleDeleteIntegration = async (integrationId: string) => {
    if (confirm('¿Estás seguro de eliminar esta integración?')) {
      await deleteIntegration(integrationId);
    }
  };

  const getProviderInfo = (provider: TrackingProvider) => {
    return PROVIDERS.find(p => p.value === provider);
  };

  const availableProviders = PROVIDERS.filter(
    p => !integrations.some(i => i.provider === p.value)
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Integraciones de Tracking</CardTitle>
            <CardDescription>
              Conecta plataformas externas para enviar eventos automáticamente
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleAddIntegration} disabled={availableProviders.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProvider ? 'Editar Integración' : 'Nueva Integración'}
                </DialogTitle>
                <DialogDescription>
                  Configura los detalles de la integración de tracking
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {!editingProvider && (
                  <div className="space-y-2">
                    <Label>Plataforma</Label>
                    <Select
                      value={formState.provider}
                      onValueChange={(value) => setFormState(prev => ({ ...prev, provider: value as TrackingProvider }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una plataforma" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviders.map((provider) => (
                          <SelectItem key={provider.value} value={provider.value}>
                            <span className="flex items-center gap-2">
                              <span>{provider.icon}</span>
                              <span>{provider.label}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {formState.provider && (
                  <>
                    <div className="space-y-2">
                      <Label>
                        {formState.provider === 'custom_webhook' ? 'URL del Webhook' : 'ID / Pixel ID'}
                      </Label>
                      <Input
                        value={formState.providerId}
                        onChange={(e) => setFormState(prev => ({ ...prev, providerId: e.target.value }))}
                        placeholder={getProviderInfo(formState.provider)?.idPlaceholder}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Habilitado</Label>
                      <Switch
                        checked={formState.enabled}
                        onCheckedChange={(checked) => setFormState(prev => ({ ...prev, enabled: checked }))}
                      />
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSaveIntegration} 
                  disabled={!formState.provider || !formState.providerId || saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay integraciones configuradas</p>
              <p className="text-sm">Agrega una integración para enviar eventos a plataformas externas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations.map((integration) => {
                const providerInfo = getProviderInfo(integration.provider);
                return (
                  <div 
                    key={integration.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{providerInfo?.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{providerInfo?.label}</h4>
                          <Badge variant={integration.enabled ? 'default' : 'secondary'}>
                            {integration.enabled ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {integration.providerId || 'Sin configurar'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {providerInfo?.docsUrl && (
                        <Button variant="ghost" size="icon" asChild>
                          <a href={providerInfo.docsUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditIntegration(integration.provider)}
                      >
                        Editar
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteIntegration(integration.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Providers */}
      {availableProviders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Integraciones Disponibles</CardTitle>
            <CardDescription>Plataformas que puedes agregar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {availableProviders.map((provider) => (
                <div 
                  key={provider.value}
                  className="flex items-start gap-3 p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors cursor-pointer"
                  onClick={() => {
                    setFormState({ provider: provider.value, providerId: '', enabled: true });
                    setEditingProvider(null);
                    setDialogOpen(true);
                  }}
                >
                  <span className="text-2xl">{provider.icon}</span>
                  <div>
                    <h4 className="font-medium">{provider.label}</h4>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
