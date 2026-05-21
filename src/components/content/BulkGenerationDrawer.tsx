import { useState, useEffect, useCallback } from 'react';
import { Sparkles, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGenerationJob } from '@/contexts/GenerationJobContext';

// ─── Constantes ───────────────────────────────────────────────────────────────

const VIDEO_DURATIONS = [
  { value: '15s',  label: '15 segundos' },
  { value: '30s',  label: '30 segundos' },
  { value: '45s',  label: '45 segundos' },
  { value: '60s',  label: '60 segundos (1 min)' },
  { value: '90s',  label: '90 segundos (1:30 min)' },
  { value: '120s', label: '2 minutos' },
  { value: '180s', label: '3 minutos' },
];

const COUNTRIES = [
  'México', 'Colombia', 'Argentina', 'España', 'Chile', 'Perú', 'Estados Unidos (Latino)', 'Otro',
];

const NARRATIVE_STRUCTURES = [
  'problema-solucion', 'educativo', 'entretenimiento', 'mitos-realidades', 'comparativa',
  'detras-camaras', 'unboxing', 'reaccion', 'lista', 'pov', 'controversia', 'trend',
  'dia-en-vida', 'storytime', 'pregunta-respuesta',
];

const CREATOR_TYPE_OPTIONS = [
  { value: 'ugc',            label: '📱 UGC — Usuario real' },
  { value: 'marca-personal', label: '🌟 Marca Personal — Dueño de marca' },
  { value: 'egc',            label: '🏢 EGC — Empleado/equipo' },
  { value: 'fgc',            label: '❤️ FGC — Fan apasionado' },
  { value: 'bgc',            label: '🎯 BGC — Contenido oficial marca' },
  { value: 'pgc',            label: '🎬 PGC — Profesional contratado' },
  { value: 'igc',            label: '✨ IGC — Influencer' },
  { value: 'cgc',            label: '⭐ CGC — Cliente que ya compró' },
  { value: 'aigc',           label: '🤖 AIGC — Generado por IA pura' },
  { value: 'ai-ugc',         label: '🧠 AI-UGC — Híbrido IA+UGC' },
];

const VIDEO_POV_OPTIONS = [
  { value: 'primera_persona', label: '🙋 Primera Persona' },
  { value: 'segunda_persona', label: '👥 Segunda Persona/POV' },
  { value: 'testimonial',     label: '⭐ Testimonial' },
  { value: 'demo',            label: '📱 Demo del producto' },
  { value: 'voz_en_off',      label: '🎙️ Voz en Off' },
  { value: 'entrevista',      label: '🎤 Entrevista/Q&A' },
];

const CREATOR_TYPE_INSTRUCTIONS: Record<string, string> = {
  'ugc': 'Tono espontáneo y auténtico como usuario real. Imperfecciones naturales, primera persona, lenguaje cotidiano.',
  'marca-personal': 'El dueño de la marca graba en primera persona. "Mi método", "Yo te enseño". Autoridad personal y cercana.',
  'egc': 'Empleado interno con perspectiva insider. "Yo trabajo aquí y te digo que...". Credibilidad basada en conocimiento interno.',
  'fgc': 'Fan apasionado que lo usa por convicción. Tono entusiasta y genuino. Emoción y amor por la marca como eje.',
  'bgc': 'La marca misma produce el contenido. Tono pulido y on-brand. Directo en el mensaje de ventas.',
  'pgc': 'Creador profesional contratado. Alta producción, guión estructurado. Tono experto y fluido.',
  'igc': 'Influencer con audiencia propia. Autoridad social. "Como siempre les comparto lo que yo uso..."',
  'cgc': 'Cliente real post-compra. Reseña honesta, antes/después, resultados reales. Recomendación genuina.',
  'aigc': 'Contenido generado por IA. Evitar imperfecciones. Guión perfectamente articulado para síntesis de voz.',
  'ai-ugc': 'Parece UGC orgánico pero optimizado por IA. Espontaneidad aparente con estructura narrativa precisa.',
};

const VIDEO_POV_INSTRUCTIONS: Record<string, string> = {
  'primera_persona': 'Escribe en primera persona ("Yo", "Me", "Mi"). El creador habla de su propia experiencia directa.',
  'segunda_persona': 'Escribe en segunda persona ("Tú", "Tu", "Te"). El espectador ES el protagonista.',
  'testimonial': 'Formato de reseña. Historia de transformación: antes/durante/después. Caso de éxito.',
  'demo': 'El creador muestra el producto en acción. Instrucciones paso a paso de lo que está haciendo.',
  'voz_en_off': 'Narrador sin aparecer en cámara. Narración sobre imágenes. Narrador externo describiendo lo que se ve.',
  'entrevista': 'Formato Q&A. "Me preguntan mucho sobre...", "La pregunta que más recibo es..."',
};

const CAST_INFO: Record<string, { letter: string; label: string; color: string; objective: string; audience: string; tone: string; ctaStyle: string }> = {
  engage: {
    letter: 'C', label: 'Conocer',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    objective: 'Awareness puro: viralidad, enganche, disrupción.',
    audience: 'Audiencia FRÍA — no conocen el producto ni saben que tienen un problema.',
    tone: 'Disruptivo, viral, llamativo. Romper patrones, generar curiosidad extrema.',
    ctaStyle: 'Suave: invitar a seguir, comentar, guardar. NO vender directamente.',
  },
  solution: {
    letter: 'A', label: 'Atraer',
    color: 'bg-green-500/10 text-green-400 border-green-500/20',
    objective: 'Atraer mostrando una solución diferenciada. El producto ES la solución.',
    audience: 'Audiencia TIBIA — ya saben que tienen el problema, buscan solución.',
    tone: 'Persuasivo, confiado, enfocado en beneficios y transformación.',
    ctaStyle: 'Directo: invitar a probar, registrarse, conocer más.',
  },
  remarketing: {
    letter: 'S', label: 'Seducir',
    color: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    objective: 'Generar confianza y disparar la decisión de compra. Cerrar la venta.',
    audience: 'Audiencia CALIENTE — vieron el producto pero no compraron.',
    tone: 'Urgente, resolutivo, escasez y FOMO. Atacar objeciones directamente.',
    ctaStyle: 'Urgente: comprar ahora, última oportunidad, no esperes más.',
  },
  fidelize: {
    letter: 'T', label: 'Transformar',
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    objective: 'Retención y advocacy. Convertir clientes en embajadores.',
    audience: 'CLIENTES — compradores recientes, lista activa.',
    tone: 'Cercano, exclusivo, valorando al cliente. Comunidad.',
    ctaStyle: 'Comunitario: compartir, etiquetar amigos, dejar reseña.',
  },
};

const DEFAULT_SCRIPT_PROMPT = `Eres un experto en UGC (User Generated Content) y copywriting para redes sociales en LATAM.
Escribe un guión de video AUTÉNTICO, CONVERSACIONAL y con ALTO POTENCIAL DE CONVERSIÓN.

ESTRUCTURA OBLIGATORIA:
1. HOOK (primeros 3 segundos): Captura atención inmediata — empieza por la escena más impactante
2. PROBLEMA/CONTEXTO (3-8s): Conecta con el dolor o deseo del avatar
3. SOLUCIÓN (8-20s): Presenta el producto como la respuesta natural
4. PRUEBA SOCIAL o DEMOSTRACIÓN (20-28s): Genera confianza
5. CTA (últimos 2-3s): Llamada a la acción clara y urgente

REGLAS:
- Hablar en primera persona o segunda persona directa
- Lenguaje coloquial latinoamericano, sin tecnicismos
- Cada escena = máximo 2 líneas de diálogo
- Termina siempre con un CTA específico`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContentItem {
  id: string;
  title: string;
  sphere_phase: string | null;
  script: string | null;
  products: {
    id: string;
    name: string;
    description: string | null;
    strategy: string | null;
    market_research: string | null;
    ideal_avatar: string | null;
    sales_angles: string | null;
  } | null;
}

interface GlobalConfig {
  country: string;
  duration: string;
  cta: string;
  creator_type: string;
  video_pov: string;
}

interface ItemConfig {
  pain: string;
  desire: string;
  avatar: string;
  objection: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomNarrative(): string {
  return NARRATIVE_STRUCTURES[Math.floor(Math.random() * NARRATIVE_STRUCTURES.length)];
}

function buildSimpleContext(item: ContentItem, itemCfg: ItemConfig, global: GlobalConfig): string {
  const p = item.products;
  const cast = item.sphere_phase ? CAST_INFO[item.sphere_phase] : null;
  let ctx = '';
  if (p?.name)            ctx += `\nPRODUCTO: ${p.name}`;
  if (p?.description)     ctx += `\nDESCRIPCIÓN: ${p.description}`;
  const avatar = itemCfg.avatar || p?.ideal_avatar;
  if (avatar)             ctx += `\nAVATAR IDEAL: ${avatar}`;
  if (p?.strategy)        ctx += `\nESTRATEGIA DE MARCA: ${p.strategy}`;
  if (p?.market_research) ctx += `\nINVESTIGACIÓN DE MERCADO: ${p.market_research.substring(0, 1000)}`;
  if (p?.sales_angles)    ctx += `\nÁNGULOS DE VENTA: ${p.sales_angles}`;
  if (itemCfg.pain)       ctx += `\nDOLOR PRINCIPAL: ${itemCfg.pain}`;
  if (itemCfg.desire)     ctx += `\nDESEO PRINCIPAL: ${itemCfg.desire}`;
  if (itemCfg.objection)  ctx += `\nOBJECIÓN A ATACAR: ${itemCfg.objection}`;
  if (global.cta)         ctx += `\nCTA ESPECÍFICO: ${global.cta}`;
  if (cast) {
    ctx += `\n\n=== CAPA CAST: ${cast.letter} — ${cast.label} ===`;
    ctx += `\nObjetivo: ${cast.objective}`;
    ctx += `\nAudiencia: ${cast.audience}`;
    ctx += `\nTono: ${cast.tone}`;
    ctx += `\nCTA sugerido: ${cast.ctaStyle}`;
  }
  ctx += `\n\nDURACIÓN OBJETIVO: ${global.duration}`;
  ctx += `\nPAÍS OBJETIVO: ${global.country}`;
  ctx += `\nPLATAFORMA: TikTok/Instagram`;
  if (global.creator_type) {
    const ct = CREATOR_TYPE_OPTIONS.find(o => o.value === global.creator_type);
    const ctInstr = CREATOR_TYPE_INSTRUCTIONS[global.creator_type] || '';
    ctx += `\n\n=== TIPO DE CREADOR: ${ct?.label || global.creator_type} ===\n${ctInstr}`;
  }
  if (global.video_pov) {
    const pov = VIDEO_POV_OPTIONS.find(o => o.value === global.video_pov);
    const povInstr = VIDEO_POV_INSTRUCTIONS[global.video_pov] || '';
    ctx += `\n\n=== FORMATO DE NARRACIÓN: ${pov?.label || global.video_pov} ===\n${povInstr}`;
  }
  return ctx;
}

function buildBody(item: ContentItem, itemCfg: ItemConfig, global: GlobalConfig, organizationId: string) {
  const p = item.products;
  const narrative = randomNarrative();
  const avatar = itemCfg.avatar || p?.ideal_avatar;
  return {
    action: 'generate_script',
    organizationId,
    prompt: `${DEFAULT_SCRIPT_PROMPT}\n\n---\nCONTEXTO:\n${buildSimpleContext(item, itemCfg, global)}`,
    product: {
      id: p?.id,
      name: p?.name,
      description: p?.description,
      strategy: p?.strategy,
      market_research: p?.market_research,
      ideal_avatar: avatar,
      sales_angles: p?.sales_angles,
    },
    generation_type: 'script',
    use_skills: true,
    ai_provider: 'gemini',
    script_params: {
      hooks_count: '3',
      target_country: global.country,
      video_duration: global.duration,
      target_platform: 'instagram',
      platform: 'TikTok/Instagram',
      narrative_structure: narrative,
      ...(global.cta          && { cta: global.cta }),
      ...(avatar               && { ideal_avatar: avatar }),
      ...(itemCfg.pain        && { selected_pain: itemCfg.pain }),
      ...(itemCfg.desire      && { selected_desire: itemCfg.desire }),
      ...(itemCfg.objection   && { selected_objection: itemCfg.objection }),
      product_category: p?.name,
      creator_type: global.creator_type,
      video_pov: global.video_pov,
    },
  };
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

function ContentRow({
  item,
  checked,
  onCheck,
  config,
  onConfigChange,
  jobStatus,
}: {
  item: ContentItem;
  checked: boolean;
  onCheck: (v: boolean) => void;
  config: ItemConfig;
  onConfigChange: (c: Partial<ItemConfig>) => void;
  jobStatus: 'running' | 'completed' | 'error' | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const cast = item.sphere_phase ? CAST_INFO[item.sphere_phase] : null;
  const isDone    = jobStatus === 'completed';
  const isError   = jobStatus === 'error';
  const isRunning = jobStatus === 'running';

  return (
    <div className={cn(
      'rounded-lg border transition-colors',
      isDone   ? 'border-green-500/30 bg-green-500/5' :
      isError  ? 'border-destructive/30 bg-destructive/5' :
      checked  ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
    )}>
      <div className="flex items-center gap-3 p-3">
        {isRunning ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
        ) : isDone ? (
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
        ) : isError ? (
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        ) : (
          <Checkbox
            checked={checked}
            onCheckedChange={onCheck}
            disabled={isRunning || isDone}
          />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {item.products?.name && (
              <p className="text-xs text-muted-foreground truncate">{item.products.name}</p>
            )}
            {item.script
              ? <span className="text-[10px] text-green-400 shrink-0">• con guión</span>
              : <span className="text-[10px] text-yellow-400 shrink-0">• sin guión</span>
            }
          </div>
        </div>

        {cast && (
          <Badge variant="outline" className={cn('text-[10px] shrink-0 px-1.5 py-0', cast.color)}>
            {cast.letter} — {cast.label}
          </Badge>
        )}

        {!isDone && !isRunning && (
          <button
            onClick={() => setExpanded(v => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        )}
      </div>

      {expanded && !isDone && !isRunning && (
        <div className="px-3 pb-3 border-t border-border/50 pt-2 space-y-2">
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide">
            Campos del item — opcional
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Dolor</p>
              <Input
                value={config.pain}
                onChange={e => onConfigChange({ pain: e.target.value })}
                placeholder="¿Qué le duele?"
                className="h-7 text-xs"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Deseo</p>
              <Input
                value={config.desire}
                onChange={e => onConfigChange({ desire: e.target.value })}
                placeholder="¿Qué quiere lograr?"
                className="h-7 text-xs"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Avatar</p>
              <Input
                value={config.avatar}
                onChange={e => onConfigChange({ avatar: e.target.value })}
                placeholder="¿Quién es?"
                className="h-7 text-xs"
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Objeción</p>
              <Input
                value={config.objection}
                onChange={e => onConfigChange({ objection: e.target.value })}
                placeholder="¿Qué frena la compra?"
                className="h-7 text-xs"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BulkGenerationDrawer({ open, onOpenChange, clientId }: Props) {
  const { profile } = useAuth();
  const orgId = profile?.current_organization_id ?? '';
  const { startScriptGeneration, jobs } = useGenerationJob();

  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [configs, setConfigs] = useState<Record<string, ItemConfig>>({});
  const [filterNoScript, setFilterNoScript] = useState(false);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    country: 'Colombia',
    duration: '30s',
    cta: '',
    creator_type: 'ugc',
    video_pov: 'primera_persona',
  });

  useEffect(() => {
    if (!open) return;
    if (!clientId && !orgId) return;

    let cancelled = false;
    setLoading(true);
    setItems([]);

    async function load() {
      let contentQuery = supabase
        .from('content')
        .select('id, title, sphere_phase, script, product_id, status')
        .eq('status', 'draft')
        .order('created_at', { ascending: false })
        .limit(150);

      if (clientId) {
        contentQuery = contentQuery.eq('client_id', clientId);
      } else {
        contentQuery = contentQuery.eq('organization_id', orgId);
      }

      const { data: contentData, error: contentError } = await contentQuery;

      if (cancelled) return;
      if (contentError || !contentData?.length) {
        setItems([]);
        setLoading(false);
        return;
      }

      const productIds = [...new Set(contentData.map(c => c.product_id).filter(Boolean))] as string[];
      const productMap = new Map<string, ContentItem['products']>();

      if (productIds.length) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, name, description, strategy, market_research, ideal_avatar, sales_angles')
          .in('id', productIds);

        if (!cancelled) {
          (productsData ?? []).forEach(p => productMap.set(p.id, p as ContentItem['products']));
        }
      }

      if (cancelled) return;

      const list: ContentItem[] = contentData.map(c => ({
        id: c.id,
        title: c.title,
        sphere_phase: c.sphere_phase,
        script: c.script,
        products: c.product_id ? productMap.get(c.product_id) ?? null : null,
      }));

      setItems(list);
      const defaultConfigs: Record<string, ItemConfig> = {};
      list.forEach(item => {
        defaultConfigs[item.id] = { pain: '', desire: '', avatar: '', objection: '' };
      });
      setConfigs(defaultConfigs);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [open, orgId, clientId]);

  const displayed = filterNoScript ? items.filter(i => !i.script) : items;

  const toggleItem = useCallback((id: string, v: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      v ? next.add(id) : next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const eligible = displayed.filter(i => !jobs.get(i.id)).map(i => i.id);
    setSelected(prev => prev.size === eligible.length ? new Set() : new Set(eligible));
  }, [displayed, jobs]);

  const updateConfig = useCallback((id: string, patch: Partial<ItemConfig>) => {
    setConfigs(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }, []);

  const handleGenerate = useCallback(() => {
    if (!orgId) {
      console.error('[BulkGeneration] No organization ID available');
      return;
    }
    const toGenerate = displayed.filter(i => selected.has(i.id) && !jobs.get(i.id));
    toGenerate.forEach(item => {
      const itemCfg = configs[item.id] ?? { pain: '', desire: '', avatar: '', objection: '' };
      const body = buildBody(item, itemCfg, globalConfig, orgId);
      startScriptGeneration({
        contentId: item.id,
        projectTitle: item.title,
        body,
        onProgress: () => {},
        onResult: () => {},
        onError: () => {},
        saveFn: async (result) => {
          if (!result.script) return;
          await supabase
            .from('content')
            .update({ script: result.script })
            .eq('id', item.id);
        },
      });
    });
    setSelected(new Set());
  }, [displayed, selected, configs, globalConfig, orgId, jobs, startScriptGeneration]);

  const activeCount   = [...jobs.values()].filter(j => j.status === 'running').length;
  const doneCount     = [...jobs.values()].filter(j => j.status === 'completed').length;
  const selectedCount = [...selected].filter(id => !jobs.get(id)).length;
  const noScript      = items.filter(i => !i.script).length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0">

        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Generar guiones en lote
          </SheetTitle>
          <SheetDescription className="text-xs">
            {items.length} en estado Creado
            {noScript > 0 ? ` · ${noScript} sin guión` : ''}
            {activeCount > 0 ? ` · ${activeCount} generando` : ''}
            {doneCount > 0 ? ` · ${doneCount} completados` : ''}
          </SheetDescription>
        </SheetHeader>

        {/* Configuración global */}
        <div className="px-4 py-3 border-b bg-muted/20 space-y-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            Configuración global
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">País</p>
              <Select value={globalConfig.country} onValueChange={v => setGlobalConfig(g => ({ ...g, country: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">Duración</p>
              <Select value={globalConfig.duration} onValueChange={v => setGlobalConfig(g => ({ ...g, duration: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_DURATIONS.map(d => (
                    <SelectItem key={d.value} value={d.value} className="text-xs">{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-1">CTA — llamada a la acción</p>
            <Input
              value={globalConfig.cta}
              onChange={e => setGlobalConfig(g => ({ ...g, cta: e.target.value }))}
              placeholder="Ej: Sigue el link en bio para pedirlo"
              className="h-8 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">🎙️ Tipo de Creador</p>
              <Select value={globalConfig.creator_type} onValueChange={v => setGlobalConfig(g => ({ ...g, creator_type: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREATOR_TYPE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1">🎬 Formato / POV</p>
              <Select value={globalConfig.video_pov} onValueChange={v => setGlobalConfig(g => ({ ...g, video_pov: v }))}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VIDEO_POV_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/50">
            Narrativa, ángulos y hooks se asignan aleatoriamente por item.
          </p>
        </div>

        {/* Filtro / selección */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <button
            onClick={() => setFilterNoScript(v => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {filterNoScript
              ? `Mostrar todos (${items.length})`
              : `Solo sin guión (${items.filter(i => !i.script).length})`}
          </button>
          <button
            onClick={toggleAll}
            className="text-xs text-primary hover:underline"
          >
            {selected.size > 0 && selected.size === displayed.filter(i => !jobs.get(i.id)).length
              ? 'Deseleccionar todo'
              : 'Seleccionar todo'}
          </button>
        </div>

        {/* Lista de items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              {filterNoScript ? 'Todos los contenidos ya tienen guión' : 'No hay contenidos en estado Creado'}
            </div>
          ) : displayed.map(item => (
            <ContentRow
              key={item.id}
              item={item}
              checked={selected.has(item.id)}
              onCheck={v => toggleItem(item.id, v)}
              config={configs[item.id] ?? { pain: '', desire: '', avatar: '', objection: '' }}
              onConfigChange={patch => updateConfig(item.id, patch)}
              jobStatus={jobs.get(item.id)?.status ?? null}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-card">
          <Button
            className="w-full gap-2"
            disabled={selectedCount === 0}
            onClick={handleGenerate}
          >
            <Sparkles className="h-4 w-4" />
            {selectedCount > 0
              ? `Generar ${selectedCount} guión${selectedCount > 1 ? 'es' : ''}`
              : 'Selecciona contenidos'}
          </Button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Las generaciones corren en paralelo en segundo plano
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
