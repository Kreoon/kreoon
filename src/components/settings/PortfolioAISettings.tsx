import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Search, MessageSquare, User, Shield, TrendingUp, Users } from 'lucide-react';
import { usePortfolioAIConfig, PortfolioAIFeatures } from '@/hooks/usePortfolioAIConfig';
import { toast } from 'sonner';

const AI_FEATURES: { key: keyof PortfolioAIFeatures; label: string; description: string; icon: React.ReactNode }[] = [
  { key: 'ai_search', label: 'Búsqueda Inteligente', description: 'Búsqueda semántica con IA', icon: <Search className="h-4 w-4" /> },
  { key: 'ai_feed_ranking', label: 'Feed Ranking IA', description: 'Ordenar feed por relevancia', icon: <TrendingUp className="h-4 w-4" /> },
  { key: 'ai_caption_helper', label: 'Asistente de Captions', description: 'Generar captions con IA', icon: <MessageSquare className="h-4 w-4" /> },
  { key: 'ai_bio_helper', label: 'Asistente de Bio', description: 'Mejorar bio del perfil', icon: <User className="h-4 w-4" /> },
  { key: 'ai_moderation', label: 'Moderación IA', description: 'Revisar contenido automáticamente', icon: <Shield className="h-4 w-4" /> },
  { key: 'ai_insights', label: 'Insights IA', description: 'Análisis de rendimiento', icon: <Sparkles className="h-4 w-4" /> },
  { key: 'ai_recommendations', label: 'Recomendaciones', description: 'Sugerir creadores y contenido', icon: <Users className="h-4 w-4" /> },
];

// AI Models available via Kreoon AI - no external API key required
const AI_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (Recomendado)' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avanzado)' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Rápido)' },
  { value: 'openai/gpt-5', label: 'GPT-5' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (Rápido)' },
];

export function PortfolioAISettings() {
  const { config, loading, saving, updateConfig, toggleFeature } = usePortfolioAIConfig();
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleSave = async () => {
    const success = await updateConfig(localConfig);
    if (success) {
      toast.success('Configuración de IA guardada');
    } else {
      toast.error('Error al guardar configuración');
    }
  };

  const handleToggleFeature = async (feature: keyof PortfolioAIFeatures) => {
    const success = await toggleFeature(feature);
    if (!success) {
      toast.error('Error al cambiar feature');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          IA en Portfolio / Red Social
        </CardTitle>
        <CardDescription>
          Configura las funciones de inteligencia artificial para el módulo de portfolio y red social
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between p-4 rounded-sm border bg-muted/50">
          <div>
            <Label className="text-base font-medium">Habilitar IA</Label>
            <p className="text-sm text-muted-foreground">Activar todas las funciones de IA en este módulo</p>
          </div>
          <Switch
            checked={localConfig.enabled}
            onCheckedChange={(enabled) => setLocalConfig(prev => ({ ...prev, enabled }))}
          />
        </div>

        {/* Provider & Model */}
        {localConfig.enabled && (
          <div className="space-y-2">
            <Label>Modelo IA</Label>
            <Select
              value={localConfig.model}
              onValueChange={(model) => setLocalConfig(prev => ({ ...prev, model, provider: 'gemini' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_MODELS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Feature Toggles */}
        {localConfig.enabled && (
          <div className="space-y-3">
            <Label className="text-base">Funciones de IA</Label>
            <div className="grid gap-3">
              {AI_FEATURES.map(feature => (
                <div 
                  key={feature.key}
                  className="flex items-center justify-between p-3 rounded-sm border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-sm bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <div>
                      <Label className="font-medium">{feature.label}</Label>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={config.features[feature.key]}
                    onCheckedChange={() => handleToggleFeature(feature.key)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar Configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
