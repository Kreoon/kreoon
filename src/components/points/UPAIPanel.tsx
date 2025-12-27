import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Brain, Sparkles, Shield, Target, AlertTriangle,
  Lightbulb, TrendingUp, Eye
} from 'lucide-react';
import { UPAIConfig, useUPEngine } from '@/hooks/useUPEngine';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface UPAIPanelProps {
  organizationId: string;
  aiConfig: UPAIConfig | null;
}

export function UPAIPanel({ organizationId, aiConfig }: UPAIPanelProps) {
  const { 
    updateAIConfig, 
    checkAntiFraud,
    generateQuests,
    getRuleRecommendations
  } = useUPEngine(organizationId);
  const { toast } = useToast();

  const [loading, setLoading] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [fraudAlerts, setFraudAlerts] = useState<any[]>([]);

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

  const handleGetRecommendations = async () => {
    setLoading('recommendations');
    try {
      const recs = await getRuleRecommendations();
      setRecommendations(recs || []);
      toast({ title: 'Recomendaciones generadas' });
    } catch (error) {
      toast({ title: 'Error al generar recomendaciones', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleCheckFraud = async () => {
    setLoading('fraud');
    try {
      const alerts = await checkAntiFraud();
      setFraudAlerts(alerts || []);
      toast({ 
        title: alerts?.length ? `${alerts.length} alertas detectadas` : 'Sin alertas de fraude'
      });
    } catch (error) {
      toast({ title: 'Error al verificar fraude', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateQuests = async () => {
    setLoading('quests');
    try {
      await generateQuests();
      toast({ title: 'Misiones generadas correctamente' });
    } catch (error) {
      toast({ title: 'Error al generar misiones', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  if (!aiConfig) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-medium mb-1">IA no configurada</h3>
          <p className="text-sm text-muted-foreground">
            Configura el Co-Pilot de IA para esta organización
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Feature Toggles */}
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
      </div>

      {/* AI Actions */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Acciones IA
          </CardTitle>
          <CardDescription>
            Ejecuta análisis y genera contenido con IA
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
              <Lightbulb className={cn(
                "w-5 h-5",
                loading === 'recommendations' && "animate-spin"
              )} />
              <span className="text-xs">Recomendaciones</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={handleCheckFraud}
              disabled={loading === 'fraud'}
            >
              <Shield className={cn(
                "w-5 h-5",
                loading === 'fraud' && "animate-spin"
              )} />
              <span className="text-xs">Verificar Fraude</span>
            </Button>

            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2"
              onClick={handleGenerateQuests}
              disabled={loading === 'quests'}
            >
              <Target className={cn(
                "w-5 h-5",
                loading === 'quests' && "animate-spin"
              )} />
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

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              Recomendaciones IA
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                      </div>
                      <Button size="sm">
                        Aplicar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Fraud Alerts */}
      {fraudAlerts.length > 0 && (
        <Card className="border-2 border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Alertas de Fraude
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-3 pr-4">
                {fraudAlerts.map((alert, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "p-4 rounded-lg border",
                      alert.severity === 'high' && "bg-destructive/10 border-destructive/30",
                      alert.severity === 'med' && "bg-warning/10 border-warning/30",
                      alert.severity === 'low' && "bg-muted"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className={cn(
                        "w-5 h-5 shrink-0 mt-0.5",
                        alert.severity === 'high' && "text-destructive",
                        alert.severity === 'med' && "text-warning",
                        alert.severity === 'low' && "text-muted-foreground"
                      )} />
                      <div>
                        <p className="font-medium">{alert.reason}</p>
                        <ul className="text-sm text-muted-foreground mt-1 list-disc list-inside">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
