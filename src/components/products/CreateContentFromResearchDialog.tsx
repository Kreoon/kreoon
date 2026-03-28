/**
 * CreateContentFromResearchDialog
 *
 * Dialog that lets users distribute content items across Esfera funnel phases
 * AFTER the ADN Recargado research is complete. Each content item gets unique
 * DNA-enriched prefills (pain, desire, avatar, angle, hooks) so no two are alike.
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  generatePrefillData,
  buildDNAEnrichedGuidelines,
} from '@/services/scriptPrefillService';
import { Loader2, Sparkles, Zap, Lightbulb, RotateCcw, Gem, Plus, Minus } from 'lucide-react';

// ── Esfera phases ──────────────────────────────────────────────────────
const ESFERA_PHASES = [
  {
    key: 'engage' as const,
    label: 'ENGANCHAR',
    icon: <Zap className="h-4 w-4" />,
    emoji: '⚡',
    color: 'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-300 dark:border-cyan-700',
    textColor: 'text-cyan-700 dark:text-cyan-300',
    description: 'Captar atencion de audiencia fria',
    audience: 'Audiencia FRIA: Nunca han visto tu marca',
    metaCampaign: 'Campanas de RECONOCIMIENTO o ALCANCE',
    contentExamples: 'Hooks impactantes, problemas visibles, patrones rotos, contenido viral',
  },
  {
    key: 'solution' as const,
    label: 'SOLUCION',
    icon: <Lightbulb className="h-4 w-4" />,
    emoji: '💡',
    color: 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    description: 'Venta directa - Mostrar tu producto como LA solucion',
    audience: 'Audiencia TIBIA: Saben que tienen un problema',
    metaCampaign: 'Campanas de VENTAS o CONVERSIONES',
    contentExamples: 'Demostraciones, beneficios claros, ofertas, llamados a la accion directos',
  },
  {
    key: 'remarketing' as const,
    label: 'REMARKETING',
    icon: <RotateCcw className="h-4 w-4" />,
    emoji: '🔄',
    color: 'bg-amber-100 dark:bg-amber-900/40 border-amber-300 dark:border-amber-700',
    textColor: 'text-amber-700 dark:text-amber-300',
    description: 'Recuperar a quienes no compraron',
    audience: 'Audiencia CALIENTE: Ya interactuaron contigo',
    metaCampaign: 'Campanas de RETARGETING',
    contentExamples: 'Testimonios, garantias, urgencia, comparativas, respuesta a objeciones',
  },
  {
    key: 'fidelize' as const,
    label: 'FIDELIZAR',
    icon: <Gem className="h-4 w-4" />,
    emoji: '💎',
    color: 'bg-purple-100 dark:bg-purple-900/40 border-purple-300 dark:border-purple-700',
    textColor: 'text-purple-700 dark:text-purple-300',
    description: 'Que vuelvan a comprar y te recomienden',
    audience: 'CLIENTES: Ya te compraron antes',
    metaCampaign: 'Campanas de ENGAGEMENT',
    contentExamples: 'Tips exclusivos, nuevos productos, upsells, programa de referidos',
  },
];

const PHASE_DEFAULTS: Record<string, {
  defaultCTA: string;
  funnelStage: string;
  objective: string;
  techniques: string[];
  tone: string;
}> = {
  engage: {
    defaultCTA: 'Sigueme para mas tips',
    funnelStage: 'tofu',
    objective: 'Captar atencion y generar awareness',
    techniques: ['Hook disruptivo', 'Pattern interrupt', 'Curiosidad'],
    tone: 'Disruptivo, viral, llamativo',
  },
  solution: {
    defaultCTA: 'Link en la bio',
    funnelStage: 'mofu',
    objective: 'Demostrar valor y generar interes',
    techniques: ['Demostracion', 'Beneficios claros', 'Testimonios'],
    tone: 'Persuasivo, confiado, directo',
  },
  remarketing: {
    defaultCTA: 'Aprovecha ahora',
    funnelStage: 'bofu',
    objective: 'Superar objeciones y cerrar venta',
    techniques: ['Objeciones', 'Garantias', 'Escasez'],
    tone: 'Urgente, resolutivo, confiable',
  },
  fidelize: {
    defaultCTA: 'Comparte con alguien',
    funnelStage: 'post',
    objective: 'Aumentar LTV y generar referidos',
    techniques: ['Comunidad', 'Exclusividad', 'Behind scenes'],
    tone: 'Cercano, exclusivo, agradecido',
  },
};

type PhaseKey = 'engage' | 'solution' | 'remarketing' | 'fidelize';
type PhaseDistribution = Record<PhaseKey, number>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  clientId: string;
  organizationId?: string | null;
  onCreated?: (count: number) => void;
}

export function CreateContentFromResearchDialog({
  open,
  onOpenChange,
  productId,
  productName,
  clientId,
  organizationId,
  onCreated,
}: Props) {
  const { toast } = useToast();
  const [distribution, setDistribution] = useState<PhaseDistribution>({
    engage: 0, solution: 0, remarketing: 0, fidelize: 0,
  });
  const [videosOwed, setVideosOwed] = useState(0);
  const [videosUsed, setVideosUsed] = useState(0);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [creating, setCreating] = useState(false);
  const [resolvedOrgId, setResolvedOrgId] = useState<string | null>(organizationId || null);

  const videosAvailable = Math.max(0, videosOwed - videosUsed);
  const totalSelected = Object.values(distribution).reduce((s, v) => s + v, 0);

  // Fetch client packages + organization_id
  useEffect(() => {
    if (!open || !clientId) return;

    const fetchData = async () => {
      setLoadingPackages(true);
      try {
        // Fetch organization_id from client if not provided
        if (!organizationId) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('organization_id')
            .eq('id', clientId)
            .single();
          setResolvedOrgId(clientData?.organization_id || null);
        }

        const { data: packages } = await supabase
          .from('client_packages')
          .select('id, content_quantity, is_active')
          .eq('client_id', clientId)
          .eq('is_active', true);

        const { count } = await supabase
          .from('content')
          .select('id', { count: 'exact', head: true })
          .eq('client_id', clientId);

        const totalOwed = (packages || []).reduce((sum, p) => sum + (p.content_quantity || 0), 0);
        setVideosOwed(totalOwed);
        setVideosUsed(count || 0);
      } catch (err) {
        console.error('Error fetching packages:', err);
      } finally {
        setLoadingPackages(false);
      }
    };

    fetchData();
    // Reset distribution when opening
    setDistribution({ engage: 0, solution: 0, remarketing: 0, fidelize: 0 });
  }, [open, clientId, organizationId]);

  const updateCount = (phase: PhaseKey, delta: number) => {
    setDistribution(prev => {
      const newVal = Math.max(0, prev[phase] + delta);
      const currentTotal = Object.values(prev).reduce((s, v) => s + v, 0);
      const othersTotal = currentTotal - prev[phase];
      // If videosAvailable > 0, clamp to that; otherwise allow unlimited
      const maxForPhase = videosAvailable > 0 ? videosAvailable - othersTotal : 99;
      return { ...prev, [phase]: Math.min(newVal, maxForPhase) };
    });
  };

  const handleCreate = async () => {
    if (totalSelected === 0) return;
    setCreating(true);

    try {
      const contentItems: any[] = [];
      // Global content index across all phases for maximum variety
      let globalIndex = 0;

      for (const phase of ESFERA_PHASES) {
        const count = distribution[phase.key];
        if (count === 0) continue;

        const defaults = PHASE_DEFAULTS[phase.key];

        for (let i = 0; i < count; i++) {
          // Get AI prefill from research + DNA data
          const prefill = await generatePrefillData({
            productId,
            spherePhase: phase.key,
            contentIndex: globalIndex,
          });

          // Build DNA-enriched strategist guidelines (unique per item)
          const guidelines = await buildDNAEnrichedGuidelines(
            productId,
            phase,
            defaults,
            globalIndex,
          );

          contentItems.push({
            title: `${productName} - ${phase.label} ${i + 1}`,
            client_id: clientId,
            product_id: productId,
            status: 'draft',
            organization_id: resolvedOrgId || null,
            sphere_phase: phase.key,
            funnel_stage: defaults.funnelStage,
            content_objective: defaults.objective,
            cta: prefill?.cta || defaults.defaultCTA,
            hooks_count: 3,
            target_platform: 'instagram',
            description: `Contenido para fase ${phase.label}: ${phase.description}.\nObjetivo: ${defaults.objective}\nTecnicas: ${defaults.techniques.join(', ')}\nTono: ${defaults.tone}`,
            strategist_guidelines: guidelines,
            // AI-prefilled fields from research + DNA
            selected_pain: prefill?.selected_pain || '',
            selected_desire: prefill?.selected_desire || '',
            selected_objection: prefill?.selected_objection || '',
            narrative_structure: prefill?.narrative_structure || '',
            video_duration: prefill?.video_duration || '',
            ideal_avatar: prefill?.ideal_avatar || '',
            sales_angle: prefill?.sales_angle || '',
            suggested_hooks: prefill?.suggested_hooks || [],
            target_country: prefill?.target_country || 'Mexico',
            ai_prefilled: true,
            ai_prefilled_at: new Date().toISOString(),
          });

          globalIndex++;
        }
      }

      const { error } = await supabase.from('content').insert(contentItems);

      if (error) {
        console.error('Error creating content:', error);
        toast({
          title: 'Error al crear contenidos',
          description: error.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: `${contentItems.length} creativo${contentItems.length > 1 ? 's' : ''} creado${contentItems.length > 1 ? 's' : ''} en el board`,
        description: 'Cada uno tiene datos unicos del ADN de marca y producto.',
      });

      onCreated?.(contentItems.length);
      onOpenChange(false);
    } catch (err: any) {
      console.error('Error creating content:', err);
      toast({
        title: 'Error',
        description: err.message || 'Error al crear los contenidos',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-1rem)] sm:w-full max-w-2xl max-h-[85dvh] sm:max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Crear Contenidos desde ADN
          </DialogTitle>
          <DialogDescription>
            Distribuye los videos por fase del embudo. Cada creativo se pre-llena con datos unicos del ADN de marca y producto.
          </DialogDescription>
        </DialogHeader>

        {/* Package info */}
        <div className="bg-muted/50 rounded-sm p-3 space-y-2">
          {loadingPackages ? (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando paquetes...
            </div>
          ) : videosAvailable > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {videosOwed} contratados
              </Badge>
              <Badge variant="outline" className="text-xs">
                {videosUsed} creados
              </Badge>
              <Badge className="text-xs bg-emerald-600">
                {videosAvailable} disponibles
              </Badge>
            </div>
          ) : (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              No hay videos disponibles en los paquetes activos. Puedes crear contenidos de todas formas escribiendo la cantidad manualmente.
            </p>
          )}
        </div>

        {/* Phase distribution */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Distribucion por fase (Metodo Esfera)</Label>
            <Badge variant={totalSelected > 0 ? 'default' : 'outline'} className="text-xs">
              {totalSelected}{videosAvailable > 0 ? ` / ${videosAvailable}` : ''} seleccionados
            </Badge>
          </div>

          {ESFERA_PHASES.map(phase => (
            <div
              key={phase.key}
              className={`p-3 rounded-sm border-2 ${phase.color} transition-all`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{phase.emoji}</span>
                    <span className={`font-bold text-sm ${phase.textColor}`}>{phase.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateCount(phase.key, -1)}
                    disabled={distribution[phase.key] <= 0}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className={`w-8 text-center font-bold text-xl ${phase.textColor}`}>
                    {distribution[phase.key]}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => updateCount(phase.key, 1)}
                    disabled={videosAvailable > 0 && totalSelected >= videosAvailable}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalSelected > 0 && (
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700 rounded-sm">
            <p className="text-sm text-emerald-800 dark:text-emerald-200">
              Se crearan <strong>{totalSelected}</strong> proyectos en el board, cada uno con dolor, deseo, avatar, angulo de venta y hooks unicos extraidos del ADN.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={creating}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={totalSelected === 0 || creating}>
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creando {totalSelected} creativos...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Crear {totalSelected} Creativos
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
