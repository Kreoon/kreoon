import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, 
  Lightbulb, 
  Layers,
  Save,
  Plus,
  Zap,
  RefreshCw,
  Heart,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { SPHERE_PHASES, SpherePhase, getSpherePhaseConfig } from "./types";

interface MarketingStrategyProps {
  organizationId: string | null | undefined;
  selectedClientId?: string | null;
}

const SPHERE_ICONS: Record<SpherePhase, React.ReactNode> = {
  engage: <Zap className="h-4 w-4" />,
  solution: <Lightbulb className="h-4 w-4" />,
  remarketing: <RefreshCw className="h-4 w-4" />,
  fidelize: <Heart className="h-4 w-4" />,
};

export function MarketingStrategy({ organizationId, selectedClientId }: MarketingStrategyProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const [activeSection, setActiveSection] = useState("objective");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  useEffect(() => {
    if (organizationId) {
      fetchStrategy();
    }
  }, [organizationId, selectedClientId]);

  const fetchStrategy = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('marketing_strategies')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setStrategy(data);
      const strategyData = data as any;
      if (strategyData?.associated_products) {
        setSelectedProductIds(strategyData.associated_products);
      } else {
        setSelectedProductIds([]);
      }
    } catch (error) {
      console.error('Error fetching strategy:', error);
      toast.error('Error al cargar estrategia');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId || !strategy) return;
    setSaving(true);

    try {
      if (strategy.id) {
        const { error } = await supabase
          .from('marketing_strategies')
          .update({
            business_objective: strategy.business_objective,
            business_objective_type: strategy.business_objective_type,
            buyer_persona: strategy.buyer_persona,
            value_proposition: strategy.value_proposition,
            main_offer: strategy.main_offer,
            esfera_engage: strategy.esfera_engage,
            esfera_solution: strategy.esfera_solution,
            esfera_remarketing: strategy.esfera_remarketing,
            esfera_fidelize: strategy.esfera_fidelize,
            strategic_kpis: strategy.strategic_kpis,
            associated_products: selectedProductIds,
          })
          .eq('id', strategy.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('marketing_strategies')
          .insert({
            organization_id: organizationId,
            created_by: user?.id,
            business_objective: strategy.business_objective,
            business_objective_type: strategy.business_objective_type,
            buyer_persona: strategy.buyer_persona || [],
            value_proposition: strategy.value_proposition,
            main_offer: strategy.main_offer,
            esfera_engage: strategy.esfera_engage || getDefaultEsferaData('engage'),
            esfera_solution: strategy.esfera_solution || getDefaultEsferaData('solution'),
            esfera_remarketing: strategy.esfera_remarketing || getDefaultEsferaData('remarketing'),
            esfera_fidelize: strategy.esfera_fidelize || getDefaultEsferaData('fidelize'),
            strategic_kpis: strategy.strategic_kpis || [],
            associated_products: selectedProductIds,
          })
          .select()
          .single();

        if (error) throw error;
        setStrategy(data);
      }

      toast.success('Estrategia guardada');
    } catch (error) {
      console.error('Error saving strategy:', error);
      toast.error('Error al guardar estrategia');
    } finally {
      setSaving(false);
    }
  };

  const getDefaultEsferaData = (phase: SpherePhase) => {
    const config = getSpherePhaseConfig(phase);
    return {
      description: '',
      objective: config.objective,
      content_types: config.contentTypes,
      metrics: config.metrics,
      tactics: [],
      angles: [],
    };
  };

  const createNewStrategy = () => {
    setStrategy({
      business_objective: '',
      business_objective_type: 'sales',
      buyer_persona: [],
      value_proposition: '',
      main_offer: '',
      esfera_engage: getDefaultEsferaData('engage'),
      esfera_solution: getDefaultEsferaData('solution'),
      esfera_remarketing: getDefaultEsferaData('remarketing'),
      esfera_fidelize: getDefaultEsferaData('fidelize'),
      strategic_kpis: [],
      associated_products: [],
    });
    setSelectedProductIds([]);
  };

  const updateField = (field: string, value: any) => {
    setStrategy((prev: any) => prev ? { ...prev, [field]: value } : null);
  };

  const updateEsferaPhase = (phase: SpherePhase, field: string, value: any) => {
    const key = `esfera_${phase}`;
    setStrategy((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        [key]: {
          ...(prev[key] || {}),
          [field]: value,
        },
      };
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <Card className="p-8 text-center">
        <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">Define tu Estrategia con el Método Esfera</h3>
        <p className="text-muted-foreground mb-4">
          Crea una estrategia con las 4 fases: Enganchar, Solución, Remarketing y Fidelizar.
        </p>
        <Button onClick={createNewStrategy} className="gap-2">
          <Plus className="h-4 w-4" />
          Crear Estrategia Esfera
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Layers className="h-3 w-3" />
            Método Esfera
          </Badge>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="objective"><Target className="h-4 w-4 mr-2" />Objetivo</TabsTrigger>
          <TabsTrigger value="value"><Lightbulb className="h-4 w-4 mr-2" />Propuesta</TabsTrigger>
          <TabsTrigger value="esfera" className="gap-1">
            <Layers className="h-4 w-4" />
            Esfera
          </TabsTrigger>
          <TabsTrigger value="kpis"><TrendingUp className="h-4 w-4 mr-2" />KPIs</TabsTrigger>
        </TabsList>

        <TabsContent value="objective">
          <Card>
            <CardHeader>
              <CardTitle>Objetivo de Negocio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {['sales', 'leads', 'traffic', 'awareness'].map(type => (
                  <Button
                    key={type}
                    variant={strategy.business_objective_type === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => updateField('business_objective_type', type)}
                  >
                    {type === 'sales' && 'Ventas'}
                    {type === 'leads' && 'Leads'}
                    {type === 'traffic' && 'Tráfico'}
                    {type === 'awareness' && 'Awareness'}
                  </Button>
                ))}
              </div>
              <Textarea
                value={strategy.business_objective || ''}
                onChange={(e) => updateField('business_objective', e.target.value)}
                placeholder="Describe tu objetivo principal..."
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="value">
          <Card>
            <CardHeader>
              <CardTitle>Propuesta de Valor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={strategy.value_proposition || ''}
                onChange={(e) => updateField('value_proposition', e.target.value)}
                placeholder="¿Qué hace única tu oferta?"
                className="min-h-[120px]"
              />
              <Label>Oferta Principal</Label>
              <Textarea
                value={strategy.main_offer || ''}
                onChange={(e) => updateField('main_offer', e.target.value)}
                placeholder="Tu oferta irresistible..."
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="esfera">
          <div className="grid gap-4 md:grid-cols-2">
            {SPHERE_PHASES.map((phase) => {
              const phaseData = strategy[`esfera_${phase.value}`] || {};
              return (
                <Card key={phase.value} className={`border-l-4 ${phase.bgColor.replace('bg-', 'border-l-')}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge className={`${phase.bgColor} ${phase.color} gap-1`}>
                        {SPHERE_ICONS[phase.value]}
                        {phase.label}
                      </Badge>
                    </div>
                    <CardDescription className="mt-2">
                      <strong>Objetivo:</strong> {phase.objective}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Descripción de la estrategia</Label>
                      <Textarea
                        value={phaseData.description || ''}
                        onChange={(e) => updateEsferaPhase(phase.value, 'description', e.target.value)}
                        placeholder={`Define tu estrategia para ${phase.labelEs}...`}
                        className="min-h-[80px] mt-1"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <Label className="text-xs text-muted-foreground">Tipos de contenido</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {phase.contentTypes.map(type => (
                            <Badge key={type} variant="outline" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Métricas clave</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {phase.metrics.map(metric => (
                            <Badge key={metric} variant="secondary" className="text-xs">
                              {metric}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="kpis">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                KPIs Estratégicos
              </CardTitle>
              <CardDescription>
                Define los indicadores clave de rendimiento para medir el éxito de la estrategia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={strategy.strategic_kpis ? JSON.stringify(strategy.strategic_kpis, null, 2) : ''}
                onChange={(e) => {
                  try {
                    updateField('strategic_kpis', JSON.parse(e.target.value));
                  } catch {}
                }}
                placeholder='["ROAS objetivo: 3x", "CPA máximo: $15", "CTR mínimo: 2%", "Conversiones mensuales: 100"]'
                className="min-h-[200px] font-mono text-sm"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}