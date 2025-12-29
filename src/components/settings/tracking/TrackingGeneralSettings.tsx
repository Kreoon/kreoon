import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Save, Shield, Eye, Clock, Bug } from 'lucide-react';
import { useTrackingConfig } from '@/hooks/useTrackingConfig';
import type { EventCategory } from '@/types/tracking';

interface TrackingGeneralSettingsProps {
  organizationId: string;
}

const EVENT_CATEGORIES: { value: EventCategory; label: string; description: string }[] = [
  { value: 'user', label: 'Usuario', description: 'Registro, login, perfil' },
  { value: 'organization', label: 'Organización', description: 'Miembros, planes' },
  { value: 'content', label: 'Contenido', description: 'Uploads, aprobaciones' },
  { value: 'project', label: 'Proyectos', description: 'Estados, cambios' },
  { value: 'board', label: 'Board', description: 'Tarjetas, movimientos' },
  { value: 'portfolio', label: 'Portfolio', description: 'Views, likes, shares' },
  { value: 'chat', label: 'Chat', description: 'Mensajes, archivos' },
  { value: 'ai', label: 'IA', description: 'Solicitudes, respuestas' },
  { value: 'navigation', label: 'Navegación', description: 'Page views' },
  { value: 'interaction', label: 'Interacción', description: 'Clicks, forms' },
  { value: 'system', label: 'Sistema', description: 'Errores, logs' },
];

export function TrackingGeneralSettings({ organizationId }: TrackingGeneralSettingsProps) {
  const { config, loading, saving, saveConfig } = useTrackingConfig({ organizationId });
  
  const [formState, setFormState] = useState({
    trackingEnabled: true,
    externalTrackingEnabled: false,
    anonymizeSensitiveData: true,
    requireConsent: true,
    debugMode: false,
    retentionDays: 365,
    allowedEventCategories: EVENT_CATEGORIES.map(c => c.value) as EventCategory[],
  });

  useEffect(() => {
    if (config) {
      setFormState({
        trackingEnabled: config.trackingEnabled,
        externalTrackingEnabled: config.externalTrackingEnabled,
        anonymizeSensitiveData: config.anonymizeSensitiveData,
        requireConsent: config.requireConsent,
        debugMode: config.debugMode,
        retentionDays: config.retentionDays,
        allowedEventCategories: config.allowedEventCategories,
      });
    }
  }, [config]);

  const handleCategoryToggle = (category: EventCategory, checked: boolean) => {
    setFormState(prev => ({
      ...prev,
      allowedEventCategories: checked 
        ? [...prev.allowedEventCategories, category]
        : prev.allowedEventCategories.filter(c => c !== category),
    }));
  };

  const handleSave = () => {
    saveConfig(formState);
  };

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
      {/* Main Toggles */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración General</CardTitle>
          <CardDescription>Controla el comportamiento general del tracking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="tracking-enabled">Tracking Interno</Label>
              <p className="text-sm text-muted-foreground">
                Registra eventos en la base de datos interna
              </p>
            </div>
            <Switch
              id="tracking-enabled"
              checked={formState.trackingEnabled}
              onCheckedChange={(checked) => setFormState(prev => ({ ...prev, trackingEnabled: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="external-tracking">Tracking Externo</Label>
              <p className="text-sm text-muted-foreground">
                Envía eventos a plataformas externas (GA4, Meta, etc.)
              </p>
            </div>
            <Switch
              id="external-tracking"
              checked={formState.externalTrackingEnabled}
              onCheckedChange={(checked) => setFormState(prev => ({ ...prev, externalTrackingEnabled: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Bug className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="debug-mode">Modo Debug</Label>
                <p className="text-sm text-muted-foreground">
                  Muestra eventos en la consola del navegador
                </p>
              </div>
            </div>
            <Switch
              id="debug-mode"
              checked={formState.debugMode}
              onCheckedChange={(checked) => setFormState(prev => ({ ...prev, debugMode: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Compliance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacidad y Compliance
          </CardTitle>
          <CardDescription>Configuración de privacidad y cumplimiento GDPR</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="anonymize">Anonimizar Datos Sensibles</Label>
                <p className="text-sm text-muted-foreground">
                  Oculta información personal en eventos marcados como sensibles
                </p>
              </div>
            </div>
            <Switch
              id="anonymize"
              checked={formState.anonymizeSensitiveData}
              onCheckedChange={(checked) => setFormState(prev => ({ ...prev, anonymizeSensitiveData: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="consent">Requerir Consentimiento</Label>
              <p className="text-sm text-muted-foreground">
                Solo trackear usuarios que hayan dado consentimiento explícito
              </p>
            </div>
            <Switch
              id="consent"
              checked={formState.requireConsent}
              onCheckedChange={(checked) => setFormState(prev => ({ ...prev, requireConsent: checked }))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-0.5">
                <Label htmlFor="retention">Retención de Datos (días)</Label>
                <p className="text-sm text-muted-foreground">
                  Tiempo que se conservan los eventos antes de eliminarlos
                </p>
              </div>
            </div>
            <Input
              id="retention"
              type="number"
              min={30}
              max={730}
              className="w-24"
              value={formState.retentionDays}
              onChange={(e) => setFormState(prev => ({ ...prev, retentionDays: parseInt(e.target.value) || 365 }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categorías de Eventos</CardTitle>
          <CardDescription>Selecciona qué categorías de eventos deseas trackear</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EVENT_CATEGORIES.map((category) => (
              <div 
                key={category.value}
                className="flex items-start space-x-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={`category-${category.value}`}
                  checked={formState.allowedEventCategories.includes(category.value)}
                  onCheckedChange={(checked) => handleCategoryToggle(category.value, !!checked)}
                />
                <div className="space-y-1">
                  <Label 
                    htmlFor={`category-${category.value}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {category.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-2 mt-4">
            <Badge variant="outline">
              {formState.allowedEventCategories.length} de {EVENT_CATEGORIES.length} categorías activas
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
