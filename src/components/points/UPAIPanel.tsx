import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, Sparkles, Shield, Target, AlertTriangle,
  Lightbulb, TrendingUp, Eye, Settings2, Cpu, Save,
  RefreshCw, Loader2
} from 'lucide-react';
import { UPAIConfig, useUPEngine } from '@/hooks/useUPEngine';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useOrganizationAI, AI_PROVIDERS_CONFIG } from '@/hooks/useOrganizationAI';
import { AIProviderSelector } from '@/components/ai/AIProviderSelector';

interface UPAIPanelProps {
  organizationId: string;
  aiConfig: UPAIConfig | null;
}

export function UPAIPanel({ organizationId, aiConfig }: UPAIPanelProps) {
  const { 
    updateAIConfig, 
    checkAntiFraud,
    generateQuests,
    getRuleRecommendations,
    applyRecommendation
  } = useUPEngine(organizationId);
  const { toast } = useToast();
  
  // Organization AI configuration
  const { 
    getModuleConfig, 
    updateDefaults, 
    saving: savingAI,
    getEnabledProviders,
    hasValidApiKey
  } = useOrganizationAI(organizationId);

  const [loading, setLoading] = useState<string | null>(null);
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);
  const [generatedQuests, setGeneratedQuests] = useState<any[]>([]);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // AI provider selection for this module
  const [selectedAI, setSelectedAI] = useState<{ provider: string; model: string }>({ 
    provider: 'lovable', 
    model: 'google/gemini-2.5-flash' 
  });
  
  // Initialize selected AI from module config
  useEffect(() => {
    const config = getModuleConfig('sistema_up');
    setSelectedAI(config);
  }, [getModuleConfig]);
  
  // Editable config state
  const [editableConfig, setEditableConfig] = useState({
    min_quality_for_approval: aiConfig?.min_quality_for_approval || 60,
  });
  
  // Handle AI provider/model change
  const handleAIChange = async (config: { provider: string; model: string }) => {
    setSelectedAI(config);
    try {
      await updateDefaults({
        sistema_up_provider: config.provider,
        sistema_up_model: config.model
      });
      toast({ title: 'Modelo de IA actualizado' });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudo actualizar el modelo de IA.',
        variant: 'destructive'
      });
    }
  };

  const handleToggle = async (key: keyof UPAIConfig, value: boolean) => {
    try {
      await updateAIConfig({ [key]: value });
      toast({ title: 'Configuración actualizada' });
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: 'No se pudo actualizar la configuración.',
        variant: 'destructive'
      });
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      await updateAIConfig({
        min_quality_for_approval: editableConfig.min_quality_for_approval,
      });
      toast({ title: 'Configuración guardada' });
    } catch (error) {
      toast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGetRecommendations = async () => {
    setLoading('recommendations');
    setLastAction('recommendations');
    try {
      const recs = await getRuleRecommendations();
      const results = recs?.recommendations || recs || [];
      setRecommendations(results);
      toast({ 
        title: results.length > 0 ? 'Recomendaciones generadas' : 'Sin recomendaciones',
        description: results.length > 0 ? `${results.length} sugerencias encontradas` : 'No hay recomendaciones en este momento'
      });
    } catch (error) {
      toast({ title: 'Error al generar recomendaciones', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleCheckFraud = async () => {
    setLoading('fraud');
    setLastAction('fraud');
    try {
      const result = await checkAntiFraud();
      const alerts = result?.alerts || [];
      setFraudAlerts(alerts);
      toast({ 
        title: alerts.length > 0 ? `${alerts.length} alertas detectadas` : 'Sin alertas de fraude',
        description: alerts.length === 0 ? 'No se detectaron patrones sospechosos' : undefined
      });
    } catch (error) {
      toast({ title: 'Error al verificar fraude', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateQuests = async () => {
    setLoading('quests');
    setLastAction('quests');
    try {
      const result = await generateQuests();
      const quests = result?.quests || [];
      setGeneratedQuests(quests);
      toast({ 
        title: quests.length > 0 ? 'Misiones generadas' : 'Sin misiones nuevas',
        description: quests.length > 0 ? `${quests.length} misiones sugeridas` : 'No hay misiones para generar en este momento'
      });
    } catch (error) {
      toast({ title: 'Error al generar misiones', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  // Create initial config if none exists
  const handleInitializeConfig = async () => {
    setLoading('init');
    try {
      await updateAIConfig({
        quality_score_enabled: false,
        event_detection_enabled: false,
        anti_fraud_enabled: false,
        quest_generation_enabled: false,
        rule_recommendations_enabled: false,
        min_quality_for_approval: 60,
      });
      toast({ title: 'Configuración de IA inicializada' });
    } catch (error) {
      toast({ title: 'Error al inicializar', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  if (!aiConfig) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium mb-1">IA Co-Pilot no configurado</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Inicializa la configuración del Co-Pilot de IA para esta organización
          </p>
          <Button onClick={handleInitializeConfig} disabled={loading === 'init'}>
            {loading === 'init' ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Inicializando...
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4 mr-2" />
                Inicializar IA Co-Pilot
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="features" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            <span className="hidden sm:inline">Funciones</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Configuración</span>
          </TabsTrigger>
          <TabsTrigger value="actions" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Acciones</span>
          </TabsTrigger>
        </TabsList>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Quality Score
                </CardTitle>
                <CardDescription>
                  IA evalúa la calidad del contenido (0-100)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm">
                      {aiConfig.quality_score_enabled ? 'Activo' : 'Inactivo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Umbral mínimo: {aiConfig.min_quality_for_approval || 60}
                    </p>
                  </div>
                  <Switch 
                    checked={aiConfig.quality_score_enabled}
                    onCheckedChange={(checked) => handleToggle('quality_score_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-5 h-5 text-cyan-500" />
                  Detección de Eventos
                </CardTitle>
                <CardDescription>
                  IA detecta eventos implícitos automáticamente
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm">
                      {aiConfig.event_detection_enabled ? 'Activo' : 'Inactivo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Analiza acciones y sugiere eventos
                    </p>
                  </div>
                  <Switch 
                    checked={aiConfig.event_detection_enabled}
                    onCheckedChange={(checked) => handleToggle('event_detection_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="w-5 h-5 text-red-500" />
                  Anti-Fraude
                </CardTitle>
                <CardDescription>
                  Detecta patrones sospechosos de gaming
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm">
                      {aiConfig.anti_fraud_enabled ? 'Activo' : 'Inactivo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Alertas automáticas de comportamiento anómalo
                    </p>
                  </div>
                  <Switch 
                    checked={aiConfig.anti_fraud_enabled}
                    onCheckedChange={(checked) => handleToggle('anti_fraud_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-5 h-5 text-green-500" />
                  Misiones Automáticas
                </CardTitle>
                <CardDescription>
                  Genera misiones semanales por rol
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm">
                      {aiConfig.quest_generation_enabled ? 'Activo' : 'Inactivo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Basadas en cuellos de botella reales
                    </p>
                  </div>
                  <Switch 
                    checked={aiConfig.quest_generation_enabled}
                    onCheckedChange={(checked) => handleToggle('quest_generation_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Recomendaciones de Reglas
                </CardTitle>
                <CardDescription>
                  IA sugiere ajustes a las reglas de puntos basándose en métricas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm">
                      {aiConfig.rule_recommendations_enabled ? 'Activo' : 'Inactivo'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Analiza rendimiento y propone optimizaciones
                    </p>
                  </div>
                  <Switch 
                    checked={aiConfig.rule_recommendations_enabled}
                    onCheckedChange={(checked) => handleToggle('rule_recommendations_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                Configuración del IA Co-Pilot
              </CardTitle>
              <CardDescription>
                Ajusta los parámetros del sistema de inteligencia artificial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Model Selector */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 mb-2">
                  <Cpu className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-medium">Modelo de IA</h4>
                    <p className="text-sm text-muted-foreground">Selecciona el motor de procesamiento para Sistema UP</p>
                  </div>
                </div>
                <AIProviderSelector
                  organizationId={organizationId}
                  module="sistema_up"
                  value={selectedAI}
                  onChange={handleAIChange}
                  disabled={savingAI}
                />
              </div>

              <Separator />

              {/* Quality Score Threshold */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Umbral de Calidad Mínima</Label>
                    <p className="text-sm text-muted-foreground">
                      Puntuación mínima para aprobar contenido automáticamente
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editableConfig.min_quality_for_approval}
                      onChange={(e) => setEditableConfig(prev => ({
                        ...prev,
                        min_quality_for_approval: parseInt(e.target.value) || 0
                      }))}
                      className="w-20 text-center"
                    />
                    <span className="text-muted-foreground">/100</span>
                  </div>
                </div>
                <Slider
                  value={[editableConfig.min_quality_for_approval]}
                  onValueChange={([value]) => setEditableConfig(prev => ({
                    ...prev,
                    min_quality_for_approval: value
                  }))}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0 - Muy permisivo</span>
                  <span>50 - Moderado</span>
                  <span>100 - Muy estricto</span>
                </div>
              </div>

              <Separator />

              {/* Current Config Summary */}
              <div className="space-y-3">
                <Label className="text-base">Estado actual</Label>
                
                {/* Current AI Model */}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Modelo IA activo:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {AI_PROVIDERS_CONFIG[selectedAI.provider as keyof typeof AI_PROVIDERS_CONFIG]?.label || selectedAI.provider}
                      </Badge>
                      <Badge variant="outline">
                        {AI_PROVIDERS_CONFIG[selectedAI.provider as keyof typeof AI_PROVIDERS_CONFIG]?.models.find(m => m.value === selectedAI.model)?.label || selectedAI.model}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Features status */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      aiConfig.quality_score_enabled ? "bg-green-500" : "bg-muted-foreground"
                    )} />
                    <span>Quality Score</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      aiConfig.event_detection_enabled ? "bg-green-500" : "bg-muted-foreground"
                    )} />
                    <span>Detección Eventos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      aiConfig.anti_fraud_enabled ? "bg-green-500" : "bg-muted-foreground"
                    )} />
                    <span>Anti-Fraude</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      aiConfig.quest_generation_enabled ? "bg-green-500" : "bg-muted-foreground"
                    )} />
                    <span>Misiones Auto</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      aiConfig.rule_recommendations_enabled ? "bg-green-500" : "bg-muted-foreground"
                    )} />
                    <span>Recomendaciones</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setEditableConfig({
                    min_quality_for_approval: aiConfig?.min_quality_for_approval || 60,
                  })}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Restablecer
                </Button>
                <Button onClick={handleSaveConfig} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Tab */}
        <TabsContent value="actions" className="space-y-4">
          {/* AI Actions */}
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Acciones IA
              </CardTitle>
              <CardDescription>
                Ejecuta análisis y genera contenido con IA (GPT-4o-mini)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={handleGetRecommendations}
                  disabled={loading === 'recommendations'}
                >
                  {loading === 'recommendations' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Lightbulb className="w-5 h-5" />
                  )}
                  <span className="text-xs">Recomendaciones</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={handleCheckFraud}
                  disabled={loading === 'fraud'}
                >
                  {loading === 'fraud' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                  <span className="text-xs">Verificar Fraude</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  onClick={handleGenerateQuests}
                  disabled={loading === 'quests'}
                >
                  {loading === 'quests' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Target className="w-5 h-5" />
                  )}
                  <span className="text-xs">Generar Misiones</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-auto py-4 flex-col gap-2"
                  disabled
                >
                  <TrendingUp className="w-5 h-5" />
                  <span className="text-xs">Calibrar Quality</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results Panel - Always visible after any action */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-primary" />
                Resultados
                {lastAction && (
                  <Badge variant="outline" className="ml-2 capitalize">
                    {lastAction === 'recommendations' && 'Recomendaciones'}
                    {lastAction === 'fraud' && 'Verificación Fraude'}
                    {lastAction === 'quests' && 'Misiones'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!lastAction && (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Ejecuta una acción para ver los resultados aquí</p>
                  <p className="text-xs mt-1">Haz clic en uno de los botones de arriba</p>
                </div>
              )}

              {/* Recommendations Results */}
              {lastAction === 'recommendations' && (
                <div className="space-y-3">
                  {recommendations.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Lightbulb className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay recomendaciones disponibles</p>
                      <p className="text-xs mt-1">El sistema no encontró mejoras sugeridas en este momento</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3 pr-4">
                        {recommendations.map((rec, index) => (
                          <div 
                            key={index}
                            className="p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-medium">{rec.title}</h4>
                                <p className="text-sm text-muted-foreground mt-1">{rec.why}</p>
                                <p className="text-xs text-primary mt-2">
                                  Impacto esperado: {rec.impact}
                                </p>
                                {rec.proposedRule && (
                                  <div className="mt-2 p-2 rounded bg-muted/50 text-xs">
                                    <span className="text-muted-foreground">Regla propuesta:</span>
                                    <span className="ml-1 font-mono">
                                      {rec.proposedRule.eventType} → {rec.proposedRule.points > 0 ? '+' : ''}{rec.proposedRule.points} UP
                                    </span>
                                  </div>
                                )}
                              </div>
                              <Button 
                                size="sm"
                                disabled={applyingIndex === index}
                                onClick={async () => {
                                  if (!rec.proposedRule) {
                                    toast({ title: 'Sin regla propuesta', variant: 'destructive' });
                                    return;
                                  }
                                  setApplyingIndex(index);
                                  try {
                                    const result = await applyRecommendation(rec);
                                    if (result) {
                                      setRecommendations(prev => prev.filter((_, i) => i !== index));
                                      toast({ title: 'Regla aplicada', description: `Se creó la regla "${rec.title}"` });
                                    }
                                  } catch (error) {
                                    toast({ title: 'Error al aplicar', variant: 'destructive' });
                                  } finally {
                                    setApplyingIndex(null);
                                  }
                                }}
                              >
                                {applyingIndex === index ? 'Aplicando...' : 'Aplicar'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}

              {/* Fraud Check Results */}
              {lastAction === 'fraud' && (
                <div className="space-y-3">
                  {fraudAlerts.length === 0 ? (
                    <div className="text-center py-6">
                      <Shield className="w-10 h-10 mx-auto mb-2 text-green-500" />
                      <p className="text-sm font-medium text-green-600">Sin alertas de fraude</p>
                      <p className="text-xs text-muted-foreground mt-1">No se detectaron patrones sospechosos de gaming</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3 pr-4">
                        {fraudAlerts.map((alert, index) => (
                          <div 
                            key={index}
                            className={cn(
                              "p-4 rounded-lg border",
                              alert.severity === 'high' && "bg-destructive/10 border-destructive/30",
                              alert.severity === 'medium' && "bg-amber-500/10 border-amber-500/30",
                              alert.severity === 'low' && "bg-muted"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <AlertTriangle className={cn(
                                "w-5 h-5 shrink-0 mt-0.5",
                                alert.severity === 'high' && "text-destructive",
                                alert.severity === 'medium' && "text-amber-500",
                                alert.severity === 'low' && "text-muted-foreground"
                              )} />
                              <div className="flex-1">
                                <p className="font-medium">{alert.reason}</p>
                                {alert.user_id && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Usuario: {alert.user_id}
                                  </p>
                                )}
                                <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside">
                                  {alert.evidence?.map((e: string, i: number) => (
                                    <li key={i}>{e}</li>
                                  ))}
                                </ul>
                              </div>
                              <Badge 
                                variant={alert.severity === 'high' ? 'destructive' : 'secondary'}
                                className="shrink-0"
                              >
                                {alert.severity}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}

              {/* Quests Generation Results */}
              {lastAction === 'quests' && (
                <div className="space-y-3">
                  {generatedQuests.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Target className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay misiones nuevas para generar</p>
                      <p className="text-xs mt-1">Las misiones se generan según los cuellos de botella detectados</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3 pr-4">
                        {generatedQuests.map((quest, index) => (
                          <div 
                            key={index}
                            className="p-4 rounded-lg border bg-gradient-to-r from-green-500/5 to-transparent"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Target className="w-4 h-4 text-green-500" />
                                  <h4 className="font-medium">{quest.title}</h4>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{quest.description}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs">
                                  {quest.target_role && (
                                    <Badge variant="outline" className="capitalize">
                                      {quest.target_role}
                                    </Badge>
                                  )}
                                  {quest.points_reward && (
                                    <span className="text-primary font-medium">
                                      +{quest.points_reward} UP
                                    </span>
                                  )}
                                  {quest.duration && (
                                    <span className="text-muted-foreground">
                                      {quest.duration}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Badge variant="secondary">
                                {quest.difficulty || 'normal'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
