import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Target, 
  Users, 
  Lightbulb, 
  Gift, 
  Layers,
  BarChart3,
  Save,
  Plus,
  Trash2,
  Pencil,
  Check
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";

interface MarketingStrategyProps {
  organizationId: string | null | undefined;
}

export function MarketingStrategy({ organizationId }: MarketingStrategyProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [strategy, setStrategy] = useState<any>(null);
  const [activeSection, setActiveSection] = useState("objective");

  useEffect(() => {
    if (organizationId) {
      fetchStrategy();
    }
  }, [organizationId]);

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
            funnel_tofu: strategy.funnel_tofu,
            funnel_mofu: strategy.funnel_mofu,
            funnel_bofu: strategy.funnel_bofu,
            strategic_kpis: strategy.strategic_kpis,
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
            funnel_tofu: strategy.funnel_tofu || {},
            funnel_mofu: strategy.funnel_mofu || {},
            funnel_bofu: strategy.funnel_bofu || {},
            strategic_kpis: strategy.strategic_kpis || [],
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

  const createNewStrategy = () => {
    setStrategy({
      business_objective: '',
      business_objective_type: 'sales',
      buyer_persona: [],
      value_proposition: '',
      main_offer: '',
      funnel_tofu: { description: '', tactics: [], channels: [] },
      funnel_mofu: { description: '', tactics: [], channels: [] },
      funnel_bofu: { description: '', tactics: [], channels: [] },
      strategic_kpis: [],
    });
  };

  const updateField = (field: string, value: any) => {
    setStrategy((prev: any) => prev ? { ...prev, [field]: value } : null);
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
        <h3 className="font-semibold text-lg mb-2">Define tu Estrategia de Marketing</h3>
        <p className="text-muted-foreground mb-4">
          Crea una estrategia con objetivos, buyer personas y funnel de conversión.
        </p>
        <Button onClick={createNewStrategy} className="gap-2">
          <Plus className="h-4 w-4" />
          Crear Estrategia
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">Centro Estratégico</Badge>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <Tabs value={activeSection} onValueChange={setActiveSection}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="objective"><Target className="h-4 w-4 mr-2" />Objetivo</TabsTrigger>
          <TabsTrigger value="persona"><Users className="h-4 w-4 mr-2" />Persona</TabsTrigger>
          <TabsTrigger value="value"><Lightbulb className="h-4 w-4 mr-2" />Propuesta</TabsTrigger>
          <TabsTrigger value="funnel"><Layers className="h-4 w-4 mr-2" />Funnel</TabsTrigger>
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

        <TabsContent value="persona">
          <Card>
            <CardHeader>
              <CardTitle>Buyer Persona</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={JSON.stringify(strategy.buyer_persona || [], null, 2)}
                onChange={(e) => {
                  try {
                    updateField('buyer_persona', JSON.parse(e.target.value));
                  } catch {}
                }}
                placeholder='[{"name": "Cliente Ideal", "age_range": "25-35", "pain_points": [...]}]'
                className="min-h-[200px] font-mono text-sm"
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

        <TabsContent value="funnel">
          <div className="grid gap-4 md:grid-cols-3">
            {['tofu', 'mofu', 'bofu'].map((stage) => (
              <Card key={stage}>
                <CardHeader className="pb-2">
                  <Badge variant="outline">{stage.toUpperCase()}</Badge>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={(strategy[`funnel_${stage}`] as any)?.description || ''}
                    onChange={(e) => updateField(`funnel_${stage}`, { 
                      ...(strategy[`funnel_${stage}`] || {}), 
                      description: e.target.value 
                    })}
                    placeholder="Descripción de la etapa..."
                    className="min-h-[100px]"
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
