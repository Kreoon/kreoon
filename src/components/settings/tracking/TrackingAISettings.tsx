import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Brain, Bell, Lightbulb, Zap } from 'lucide-react';
import { useTrackingConfig } from '@/hooks/useTrackingConfig';
import type { AnalysisFrequency } from '@/types/tracking';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TrackingAISettingsProps {
  organizationId: string;
}

const AI_MODELS = [
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash', description: 'Rápido y económico' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: 'Mayor precisión' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini', description: 'Balance costo/calidad' },
  { value: 'openai/gpt-5', label: 'GPT-5', description: 'Máxima precisión' },
];

const FREQUENCIES: { value: AnalysisFrequency; label: string; description: string }[] = [
  { value: 'realtime', label: 'Tiempo Real', description: 'Análisis inmediato (más costoso)' },
  { value: 'hourly', label: 'Cada Hora', description: 'Análisis frecuente' },
  { value: 'daily', label: 'Diario', description: 'Análisis una vez al día (recomendado)' },
  { value: 'weekly', label: 'Semanal', description: 'Análisis cada semana' },
];

export function TrackingAISettings({ organizationId }: TrackingAISettingsProps) {
  const { aiConfig, loading, saving, saveAIConfig } = useTrackingConfig({ organizationId });
  
  const [formState, setFormState] = useState({
    enabled: true,
    provider: 'kreoon' as 'kreoon' | 'openai' | 'google',
    model: 'google/gemini-2.5-flash',
    analysisFrequency: 'daily' as AnalysisFrequency,
    autoAlertsEnabled: true,
    autoRecommendationsEnabled: true,
  });

  useEffect(() => {
    if (aiConfig) {
      setFormState({
        enabled: aiConfig.enabled,
        provider: aiConfig.provider,
        model: aiConfig.model,
        analysisFrequency: aiConfig.analysisFrequency,
        autoAlertsEnabled: aiConfig.autoAlertsEnabled,
        autoRecommendationsEnabled: aiConfig.autoRecommendationsEnabled,
      });
    }
  }, [aiConfig]);

  const handleSave = () => {
    saveAIConfig(formState);
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
      {/* AI Insights Overview */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Insights Engine
          </CardTitle>
          <CardDescription>
            Analiza automáticamente tus eventos y genera alertas y recomendaciones inteligentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-enabled">Habilitar AI Insights</Label>
              <p className="text-sm text-muted-foreground">
                Activa el motor de análisis inteligente
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={formState.enabled}
              onCheckedChange={(checked) => setFormState(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
        </CardContent>
      </Card>

      {formState.enabled && (
        <>
          {/* Model & Frequency */}
          <Card>
            <CardHeader>
              <CardTitle>Modelo y Frecuencia</CardTitle>
              <CardDescription>Configura el modelo de IA y la frecuencia de análisis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Modelo de IA</Label>
                <Select
                  value={formState.model}
                  onValueChange={(value) => setFormState(prev => ({ ...prev, model: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div className="flex flex-col">
                          <span>{model.label}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Usa Kreoon IA sin necesidad de API keys externos
                </p>
              </div>

              <div className="space-y-2">
                <Label>Frecuencia de Análisis</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {FREQUENCIES.map((freq) => (
                    <div
                      key={freq.value}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        formState.analysisFrequency === freq.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-accent'
                      }`}
                      onClick={() => setFormState(prev => ({ ...prev, analysisFrequency: freq.value }))}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{freq.label}</span>
                        {formState.analysisFrequency === freq.value && (
                          <Badge variant="default" className="ml-2">Activo</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{freq.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts & Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Alertas y Recomendaciones</CardTitle>
              <CardDescription>Configura qué tipos de insights generar automáticamente</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Bell className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-alerts">Alertas Automáticas</Label>
                    <p className="text-sm text-muted-foreground">
                      Genera alertas cuando detecte anomalías o situaciones críticas
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="outline" className="text-xs">Proyecto estancado</Badge>
                      <Badge variant="outline" className="text-xs">Pico de errores</Badge>
                      <Badge variant="outline" className="text-xs">Engagement bajo</Badge>
                    </div>
                  </div>
                </div>
                <Switch
                  id="auto-alerts"
                  checked={formState.autoAlertsEnabled}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, autoAlertsEnabled: checked }))}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-recommendations">Recomendaciones Automáticas</Label>
                    <p className="text-sm text-muted-foreground">
                      Sugiere acciones basadas en el análisis de eventos
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Badge variant="outline" className="text-xs">Asignar editor</Badge>
                      <Badge variant="outline" className="text-xs">Mejor hora para publicar</Badge>
                      <Badge variant="outline" className="text-xs">Optimizar workflow</Badge>
                    </div>
                  </div>
                </div>
                <Switch
                  id="auto-recommendations"
                  checked={formState.autoRecommendationsEnabled}
                  onCheckedChange={(checked) => setFormState(prev => ({ ...prev, autoRecommendationsEnabled: checked }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Usage Info */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Zap className="h-4 w-4 text-primary" />
                <span>
                  El AI Insights Engine usa Kreoon IA, incluido en tu plan sin costos adicionales por API keys.
                </span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

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
