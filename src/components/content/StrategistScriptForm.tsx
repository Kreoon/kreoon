import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useScriptPrompts } from "@/hooks/useScriptPrompts";
import { useOrganizationAI } from "@/hooks/useOrganizationAI";
import { useUnifiedTokens } from "@/hooks/useUnifiedTokens";
import { AI_TOKEN_COSTS } from "@/lib/finance/constants";
import {
  Sparkles, Loader2, Target, Users, Globe, FileText,
  MessageSquare, ListOrdered, Plus, X, Wand2, Settings2,
  Video, ChevronDown, CheckCircle2, Bot, RefreshCw, FileSearch, AlertCircle, Search,
  Brain, Zap, ChevronRight, Hash
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { SkillsLoadingState } from "./SkillsLoadingState";

import { parseProductResearch, formatResearchForPrompt } from "@/lib/productResearchParser";

interface Product {
  id: string;
  name: string;
  description?: string | null;
  strategy: string | null;
  market_research: string | null;
  ideal_avatar: string | null;
  sales_angles: string[] | null;
  brief_url?: string | null;
  onboarding_url?: string | null;
  research_url?: string | null;
  // Extended research fields
  avatar_profiles?: unknown;
  sales_angles_data?: unknown;
  competitor_analysis?: unknown;
  brief_data?: unknown;
  business_type?: 'product_service' | 'personal_brand' | null;
  ai_analysis?: unknown; // ADN V2
}

interface GeneratedContent {
  script: string;
  director_output?: string;
  marketing_output?: string;
  captions?: string;
  broll_output?: string;
}

interface StrategistScriptFormProps {
  product: Product | null;
  contentId: string;
  onScriptGenerated: (content: GeneratedContent) => void;
  organizationId?: string;
  spherePhase?: string | null;
}

interface DocumentContent {
  brief: string;
  onboarding: string;
  research: string;
}

interface ScriptFormData {
  cta: string;
  sales_angle: string;
  hooks_count: string;
  ideal_avatar: string;
  selected_pain: string;
  selected_desire: string;
  selected_objection: string;
  target_country: string;
  narrative_structure: string;
  additional_instructions: string;
  hooks: string[];
  script_prompt: string;
  director_prompt: string;
  marketing_prompt: string;
  captions_prompt: string;
  broll_prompt: string;
  reference_transcription: string;
  video_strategies: string;
  ai_model: string;
  video_duration: string;
  target_platform: string;
  use_perplexity: boolean;
}

interface PerplexityQueriesState {
  trends: boolean;
  hooks: boolean;
  competitors: boolean;
  audience: boolean;
}

interface GenerationStep {
  key: "script" | "director" | "marketing" | "captions" | "broll";
  label: string;
  status: "pending" | "generating" | "done" | "error";
}

// AI Models available - real model IDs
const AI_MODELS = [
  // Gemini
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Recomendado)" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Avanzado)" },
  { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash (Rápido)" },
  // OpenAI
  { value: "openai/gpt-4o", label: "GPT-4o" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (Rápido)" },
  // Anthropic
  { value: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4 (Avanzado)" },
  { value: "anthropic/claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (Rápido)" },
  // Perplexity (con búsqueda en tiempo real)
  { value: "perplexity/llama-3.1-sonar-large-128k-online", label: "Perplexity Sonar Large (Búsqueda Online)" },
  { value: "perplexity/llama-3.1-sonar-small-128k-online", label: "Perplexity Sonar Small (Rápido)" },
];

const NARRATIVE_STRUCTURES = [
  { value: "problema-solucion", label: "Problema → Solución", description: "Presenta el dolor y ofrece la solución" },
  { value: "historia-personal", label: "Historia Personal", description: "Storytelling desde la experiencia propia" },
  { value: "antes-despues", label: "Antes/Después", description: "Transformación visual o narrativa" },
  { value: "tutorial", label: "Tutorial paso a paso", description: "Guía práctica de uso" },
  { value: "testimonio", label: "Testimonio", description: "Experiencia de un cliente real" },
  { value: "urgencia", label: "Urgencia/Escasez", description: "FOMO y acción inmediata" },
  { value: "educativo", label: "Educativo/Informativo", description: "Enseña algo valioso" },
  { value: "entretenimiento", label: "Entretenimiento", description: "Engancha con humor o creatividad" },
  { value: "mitos-realidades", label: "Mitos vs Realidades", description: "Desmiente creencias falsas" },
  { value: "comparativa", label: "Comparativa", description: "vs competencia o alternativas" },
  { value: "detras-camaras", label: "Detrás de Cámaras", description: "Muestra el proceso o equipo" },
  { value: "unboxing", label: "Unboxing/Reveal", description: "Descubrimiento del producto" },
  { value: "reaccion", label: "Reacción", description: "Respuesta espontánea al producto" },
  { value: "lista", label: "Lista/Top", description: "X razones, tips o beneficios" },
  { value: "pov", label: "POV (Punto de Vista)", description: "Perspectiva del avatar ideal" },
  { value: "controversia", label: "Opinión Controversial", description: "Declaración que genera debate" },
  { value: "trend", label: "Trend/Tendencia", description: "Adaptación de formato viral" },
  { value: "dia-en-vida", label: "Día en la Vida", description: "Rutina usando el producto" },
  { value: "pregunta-respuesta", label: "Q&A", description: "Responde preguntas frecuentes" },
  { value: "storytime", label: "Storytime", description: "Historia larga y envolvente" },
];

const COUNTRIES = [
  "México", "Colombia", "Argentina", "España", "Chile", "Perú", "Estados Unidos (Latino)", "Otro",
];

// Video duration options
const VIDEO_DURATIONS = [
  { value: "15-30s", label: "15-30 segundos (Story/Reel)" },
  { value: "30-60s", label: "30-60 segundos (Short-form)" },
  { value: "1-3min", label: "1-3 minutos (Medio)" },
  { value: "3-5min", label: "3-5 minutos (Largo)" },
  { value: "5-10min", label: "5-10 minutos (YouTube)" },
];

// Target platform options
const TARGET_PLATFORMS = [
  { value: "instagram", label: "Instagram (Reels/Stories)" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube_shorts", label: "YouTube Shorts" },
  { value: "youtube", label: "YouTube" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "multi", label: "Multi-plataforma" },
];

// Sphere phase info for AI context - Aligned with Método Esfera
const SPHERE_PHASE_INFO: Record<string, { 
  label: string; 
  objective: string; 
  audience: string; 
  tone: string;
  techniques: string[];
  keywords: string[];
  ctaStyle: string;
}> = {
  engage: {
    label: 'ENGANCHAR (Fase 1)',
    objective: 'Viralidad, enganche, disrupción, educar. Que las personas conozcan el producto o servicio y se den cuenta que tienen el problema.',
    audience: 'Audiencia FRÍA - personas que nunca han interactuado con la marca, no conocen el producto ni saben que tienen un problema',
    tone: 'Disruptivo, viral, llamativo, sorprendente. Romper patrones, generar curiosidad extrema.',
    techniques: [
      'Hooks ultra potentes en los primeros 1-3 segundos',
      'Pattern interrupts (romper patrones visuales/auditivos)',
      'Declaraciones controversiales o contraintuitivas',
      'Preguntas que despiertan curiosidad',
      'Mostrar el problema de forma dramatizada',
      'Contenido educativo que revele un problema oculto'
    ],
    keywords: ['¿Sabías que...?', 'Esto es lo que nadie te cuenta', 'Error #1', 'Por qué no funciona', 'La verdad sobre', 'Descubrí que'],
    ctaStyle: 'Suave - invitar a seguir, comentar, guardar. NO vender directamente.',
  },
  solution: {
    label: 'SOLUCIÓN (Fase 2)',
    objective: 'Venta directa, persuadir para comprar, ser el mejor vendiendo. Mostrar que el producto ES la solución perfecta.',
    audience: 'Audiencia TIBIA - personas que ya saben que tienen el problema y buscan activamente una solución',
    tone: 'Persuasivo, confiado, enfocado en beneficios y transformación. Venta directa pero no agresiva.',
    techniques: [
      'Demostración del producto en acción',
      'Antes y después transformacionales',
      'Testimonios de clientes reales',
      'Comparación sutil con alternativas',
      'Storytelling de éxito',
      'Beneficios específicos y cuantificables'
    ],
    keywords: ['La solución es', 'Esto cambió todo', 'Finalmente', 'Por eso creamos', 'Resultados garantizados', 'Funciona porque'],
    ctaStyle: 'Directo - invitar a comprar, probar, registrarse. Link en bio, desliza arriba.',
  },
  remarketing: {
    label: 'REMARKETING (Fase 3)',
    objective: 'Mostrar lo que se está perdiendo, crear urgencia, superar objeciones finales. Cerrar la venta.',
    audience: 'Audiencia CALIENTE - personas que ya vieron el producto, visitaron el sitio, agregaron al carrito pero NO compraron',
    tone: 'Urgente, resolutivo, enfocado en pérdida (FOMO). Atacar objeciones directamente.',
    techniques: [
      'Escasez real (stock limitado, tiempo limitado)',
      'Social proof masivo (X personas ya compraron)',
      'Responder objeciones comunes',
      'Garantías y eliminación de riesgo',
      'Comparación de precio vs valor',
      'Recordatorio de beneficios clave'
    ],
    keywords: ['Últimas unidades', 'Se acaba en', 'No te pierdas', 'Mientras lees esto', 'Si no ahora, cuándo', 'Otros ya lo tienen'],
    ctaStyle: 'Urgente - comprar ahora, última oportunidad, no esperes más.',
  },
  fidelize: {
    label: 'FIDELIZAR (Fase 4)',
    objective: 'Entregar valor y confianza, buscar que nos refieran y recompren. Crear comunidad y lealtad.',
    audience: 'CLIENTES existentes - personas que ya compraron y queremos que vuelvan a comprar y nos recomienden',
    tone: 'Cercano, exclusivo, valorando al cliente. Contenido de alto valor, tips, comunidad.',
    techniques: [
      'Contenido exclusivo para clientes',
      'Tips de uso avanzado del producto',
      'Historias de otros clientes exitosos',
      'Ofertas exclusivas para clientes',
      'Invitación a programas de referidos',
      'Behind the scenes y contenido humano'
    ],
    keywords: ['Para ti que ya eres cliente', 'Tip exclusivo', 'Gracias por confiar', 'Comparte con', 'Tu experiencia importa', 'Familia [marca]'],
    ctaStyle: 'Comunitario - compartir, etiquetar amigos, dejar reseña, referir.',
  },
};

function getSpherePhaseInfo(phase: string) {
  return SPHERE_PHASE_INFO[phase] || null;
}

const CAST_LAYER_INFO: Record<string, {
  letter: string;
  layerName: string;
  label: string;
  funnel: string;
  objective: string;
  audience: string;
  tone: string;
  techniques: string[];
  keywords: string[];
  ctaStyle: string;
  kpis: string[];
  creativeFocus: string;
}> = {
  engage: {
    letter: 'C',
    layerName: 'Conocer',
    label: 'C — Conocer',
    funnel: 'TOFU',
    objective: 'Viralidad, enganche, disrupción. Que el avatar descubra que tiene el problema.',
    audience: 'Audiencia FRÍA — no conocen la marca ni el producto',
    tone: 'Disruptivo, viral, sorprendente. Rompe patrones, genera curiosidad extrema.',
    techniques: ['Hooks ultra potentes 1-3s', 'Pattern interrupts', 'Declaraciones contraintuitivas', 'Mostrar el problema dramatizado'],
    keywords: ['¿Sabías que...?', 'Esto es lo que nadie te cuenta', 'Error #1', 'La verdad sobre'],
    ctaStyle: 'Suave — seguir, comentar, guardar. No vender directamente.',
    kpis: ['Alcance', 'Reproducciones', 'Guardados'],
    creativeFocus: 'Impacto visual + hook verbal. Primeros 2s son todo.',
  },
  solution: {
    letter: 'A',
    layerName: 'Atraer',
    label: 'A — Atraer',
    funnel: 'MOFU',
    objective: 'Mostrar que el producto ES la solución perfecta. Persuadir para explorar.',
    audience: 'Audiencia TIBIA — saben que tienen el problema, buscan solución',
    tone: 'Persuasivo, confiado, enfocado en beneficios y transformación.',
    techniques: ['Demostración en acción', 'Antes y después', 'Testimonios reales', 'Beneficios cuantificables'],
    keywords: ['La solución es', 'Esto cambió todo', 'Finalmente', 'Resultados garantizados'],
    ctaStyle: 'Directo — link en bio, probar, registrarse.',
    kpis: ['Clics', 'Visitas web', 'Leads'],
    creativeFocus: 'Demostración clara del producto + transformación del avatar.',
  },
  remarketing: {
    letter: 'S',
    layerName: 'Seducir',
    label: 'S — Seducir',
    funnel: 'BOFU',
    objective: 'Crear urgencia, superar objeciones finales. Cerrar la venta.',
    audience: 'Audiencia CALIENTE — vieron el producto pero no compraron',
    tone: 'Urgente, resolutivo, FOMO. Atacar objeciones directamente.',
    techniques: ['Escasez real', 'Social proof masivo', 'Responder objeciones', 'Garantías'],
    keywords: ['Últimas unidades', 'No te pierdas', 'Mientras lees esto', 'Si no ahora cuándo'],
    ctaStyle: 'Urgente — comprar ahora, última oportunidad.',
    kpis: ['Conversiones', 'ROAS', 'CPA'],
    creativeFocus: 'Objeción principal resuelta + CTA de urgencia.',
  },
  fidelize: {
    letter: 'T',
    layerName: 'Transformar',
    label: 'T — Transformar',
    funnel: 'Retención',
    objective: 'Entregar valor, buscar recompra y referidos. Crear comunidad y lealtad.',
    audience: 'CLIENTES existentes — ya compraron, queremos que vuelvan y recomienden',
    tone: 'Cercano, exclusivo, valora al cliente. Contenido de alto valor.',
    techniques: ['Contenido exclusivo', 'Tips avanzados', 'Historias de éxito', 'Programas de referidos'],
    keywords: ['Para ti que ya eres cliente', 'Tip exclusivo', 'Gracias por confiar', 'Familia [marca]'],
    ctaStyle: 'Comunitario — compartir, etiquetar amigos, dejar reseña, referir.',
    kpis: ['LTV', 'Retención', 'NPS'],
    creativeFocus: 'Comunidad + exclusividad + gratitud hacia el cliente.',
  },
};

function getCastLayerInfo(phase: string) {
  return CAST_LAYER_INFO[phase] || null;
}

const BLOCK_ACTION_KEYS: Record<string, string> = {
  script: "scripts.block.script",
  director: "scripts.block.director",
  marketing: "scripts.block.marketing",
  captions: "scripts.block.captions",
  broll: "scripts.block.broll",
};

const BLOCK_LABELS: Record<string, { emoji: string; short: string }> = {
  script: { emoji: "\uD83C\uDFAC", short: "Guion" },
  director: { emoji: "\uD83C\uDFA5", short: "Director" },
  marketing: { emoji: "\uD83D\uDCCA", short: "Marketing" },
  captions: { emoji: "\uD83D\uDCF1", short: "Captions" },
  broll: { emoji: "\uD83C\uDFAC", short: "B-Roll" },
};

const CONTENT_AI_FUNCTION = "content-ai";

const DEFAULT_PROMPTS = {
  script: `🎬 GUIÓN TELEPROMPTER UGC

⚠️ IMPORTANTE: Genera el guión COMPLETO. NO te detengas hasta terminar TODAS las escenas incluyendo el CTA final y las notas para el creador.

ESTRUCTURA REQUERIDA (HTML):
1. <h2>🎥 GUION DE VIDEO UGC</h2>
2. Escenas 1A, 1B, 1C (HOOKS - genera EXACTAMENTE {cantidad_hooks})
3. Escenas 2-3 (DESARROLLO)
4. Escenas 4-5 (SOLUCIÓN con producto)
5. Escena final (CTA: {cta})
6. <h3>📝 NOTAS PARA EL CREADOR</h3> con vestuario, props, locación

Cada escena incluye: Número, Tiempo (ej: 0-3s), Acción visual [entre corchetes], Diálogo exacto "entre comillas"

REGLAS:
- Genera {cantidad_hooks} hooks alternativos (1A, 1B, 1C...)
- Adapta lenguaje a {pais_objetivo}
- COMPLETA TODO hasta las notas finales`,

  director: `🎥 TABLA DE PRODUCCIÓN - DIRECTOR

⚠️ IMPORTANTE: Genera la tabla COMPLETA para TODAS las escenas del guión (1A, 1B, 1C, 2, 3, 4, 5, CTA). NO omitas ninguna.

ESTRUCTURA HTML REQUERIDA:
<h2>🎬 TABLA DE PRODUCCIÓN</h2>
<p>Duración: X segundos | Escenas: X | Setup: [lista]</p>

<table>
<tr><th>#</th><th>Tiempo</th><th>Guión Verbal</th><th>Guión Visual</th><th>Plano</th><th>Notas</th></tr>
[Una fila por CADA escena del guión]
</table>

<h3>📋 CHECKLIST PRE-PRODUCCIÓN</h3>
[Lista de verificación]

<h3>🎬 EQUIPO NECESARIO</h3>
[Cámara, luces, audio, etc.]

<h3>⏱️ TIEMPO ESTIMADO DE GRABACIÓN</h3>

Planos: PP (primer plano), PM (plano medio), PE (plano entero), PD (detalle)
Producto: {producto_nombre} | País: {pais_objetivo}

COMPLETA TODAS las escenas y secciones.`,

  marketing: `📊 ESTRATEGIA DE MARKETING Y PAUTA

⚠️ IMPORTANTE: Genera TODAS las secciones COMPLETAS. NO te detengas hasta terminar presupuesto y próximos contenidos.

ESTRUCTURA HTML REQUERIDA:
<h2>📊 BLOQUE MARKETING</h2>

<h3>🎯 ESTRATEGIA</h3>
Fase ESFERA | Objetivo | KPI Principal

<h3>👥 AUDIENCIAS</h3>
🔵 COLD: Intereses, comportamientos, lookalike
🟡 WARM: Retargeting (video viewers, engagement, web)
🔴 HOT: Cart abandonados, visitantes producto

<h3>📱 DISTRIBUCIÓN</h3>
<table><tr><th>Plataforma</th><th>Formato</th><th>Budget %</th><th>Objetivo</th></tr>
[Meta 60%, TikTok 30%, YouTube 10%]</table>

<h3>🔥 3 VARIACIONES DE AD</h3>
Variación A (Cold): Hook + Copy + CTA
Variación B (Warm): Hook + Copy + CTA
Variación C (Hot): Hook + Copy + CTA

<h3>📈 MÉTRICAS OBJETIVO</h3>
Hook Rate, CTR, CPC, ROAS (mínimo/objetivo/excelente)

<h3>💵 PRESUPUESTO</h3>
Testing: $X/día x X días | Escala: $X/día

<h3>📅 PRÓXIMOS CONTENIDOS</h3>
3 videos sugeridos para el embudo

Producto: {producto_nombre} | Avatar: {producto_avatar} | País: {pais_objetivo} | CTA: {cta}

COMPLETA TODAS las secciones.`,

  captions: `📱 CAPTIONS PARA REDES SOCIALES

⚠️ IMPORTANTE: Genera los 4 captions COMPLETOS. Cada uno con su texto íntegro, hashtags (orgánicos) y especificaciones.

ESTRUCTURA HTML REQUERIDA:
<h2>📱 CAPTIONS GENERADOS</h2>

<h3>📱 ORGÁNICO #1: Hook + Storytelling</h3>
[Caption COMPLETO 150-200 caracteres con emojis + 8-10 hashtags relevantes]
Objetivo: Engagement | Plataforma: Feed IG/FB

<h3>📱 ORGÁNICO #2: Trend/Humor</h3>
[Caption COMPLETO con referencia cultural/trend + hashtags trending]
Objetivo: Viralidad | Plataforma: Reels/TikTok

<h3>💰 ADS #1: Problema-Solución</h3>
[Caption COMPLETO 80-125 caracteres, beneficio + CTA directo, SIN hashtags]
Objetivo: Conversión | Cumple políticas: ✅

<h3>💰 ADS #2: FOMO/Urgencia</h3>
[Caption COMPLETO con escasez/urgencia + CTA, SIN hashtags]
Objetivo: Ventas | Cumple políticas: ✅

Producto: {producto_nombre} | Avatar: {producto_avatar} | País: {pais_objetivo} | CTA: {cta}

REGLAS: No claims médicos, no "milagro", beneficios verificables.
COMPLETA los 4 captions sin truncar.`,

  broll: `🎬 IDEAS DE B-ROLL

⚠️ IMPORTANTE: Genera las tablas COMPLETAS con 10-14 B-Rolls totales. NO te detengas hasta completar todas las secciones.

FORMATO: Solo HTML con estilos inline. Usa color:#1f2937 en TODAS las celdas td.

ESTRUCTURA REQUERIDA:
<h2 style="color:#1a1a1a;">🎬 IDEAS DE B-ROLL</h2>
<p>Producto: {producto_nombre} | Setup: Celular + Trípode + Ring light</p>

<h3 style="color:#059669;">📋 B-ROLLS ESENCIALES (6-8 tomas)</h3>
<table><tr style="background:#d1fae5;"><th style="color:#065f46;">#</th><th style="color:#065f46;">TOMA</th><th style="color:#065f46;">ESCENA</th><th style="color:#065f46;">QUÉ FILMAR</th><th style="color:#065f46;">PLANO</th><th style="color:#065f46;">DUR</th></tr>
[6-8 filas con descripciones MUY específicas, color:#1f2937 en cada td]
</table>

<h3 style="color:#f59e0b;">⭐ B-ROLLS OPCIONALES (4-6 tomas)</h3>
<table>[4-6 filas adicionales con color:#1f2937]</table>

<h3 style="color:#3b82f6;">🎯 SECUENCIA DE GRABACIÓN</h3>
Setup 1 Cenital: B-Rolls X, X, X
Setup 2 Lateral: B-Rolls X, X
Setup 3 En uso: B-Rolls X, X, X

<h3 style="color:#8b5cf6;">💡 TIPS</h3>
Iluminación | Configuración (1080p, 30-60fps) | Cantidad (2-3 tomas cada uno)

REGLAS:
- Solo HTML, color:#1f2937 en todas las celdas
- B-Rolls ESPECÍFICOS ("Close-up pipeta dispensando 3 gotas" NO "toma del producto")
- Planos: PD, PM, PP, PE | Duración: 2-5s

COMPLETA las 10-14 tomas y todas las secciones.`,
};

export function StrategistScriptForm({ product, contentId, onScriptGenerated, organizationId: propOrgId, spherePhase }: StrategistScriptFormProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const organizationId = propOrgId || profile?.current_organization_id;
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [newHook, setNewHook] = useState("");

  // Block selection state
  const [selectedBlocks, setSelectedBlocks] = useState<Record<string, boolean>>({
    script: true, director: true, marketing: true, captions: true, broll: true,
  });

  // Token balance
  const { balance, getTokenCost, refetchBalance } = useUnifiedTokens(organizationId);

  const totalCost = useMemo(() =>
    Object.entries(selectedBlocks)
      .filter(([, sel]) => sel)
      .reduce((sum, [key]) => sum + getTokenCost(BLOCK_ACTION_KEYS[key]), 0),
    [selectedBlocks, getTokenCost]
  );

  const selectedCount = useMemo(() =>
    Object.values(selectedBlocks).filter(Boolean).length,
    [selectedBlocks]
  );

  const totalAvailable = balance?.total_available ?? Infinity;
  const insufficientTokens = totalAvailable < totalCost && totalAvailable !== Infinity;
  const [promptsOpen, setPromptsOpen] = useState(false);
  
  // Load custom prompts from organization settings
  const { prompts: customPrompts, loading: loadingPrompts } = useScriptPrompts(organizationId);
  
  // Load enabled AI providers from organization settings
  const { getEnabledProviders, hasValidApiKey, loading: loadingAI } = useOrganizationAI(organizationId);
  
  // Check which providers are enabled (kreoon is always enabled)
  const enabledProviderKeys = useMemo(() => {
    const enabled = getEnabledProviders();
    return enabled.map(e => e.key);
  }, [getEnabledProviders]);

  // Check if a provider is enabled
  const isProviderEnabled = (providerValue: string) => {
    if (providerValue === 'kreoon') return true; // Always enabled
    return enabledProviderKeys.includes(providerValue);
  };
  
  // Document content from Drive
  const [documentContent, setDocumentContent] = useState<DocumentContent>({
    brief: "",
    onboarding: "",
    research: "",
  });
  const [docsLoaded, setDocsLoaded] = useState(false);

  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { key: "script", label: "🎬 Guión Principal", status: "pending" },
    { key: "director", label: "🎥 Modo Director", status: "pending" },
    { key: "marketing", label: "📊 Marketing (Tráfico + Estrategia)", status: "pending" },
    { key: "captions", label: "📱 Captions (4 variaciones)", status: "pending" },
    { key: "broll", label: "🎬 B-Roll (Ideas de tomas)", status: "pending" },
  ]);

  const [formData, setFormData] = useState<ScriptFormData>({
    cta: "",
    sales_angle: "",
    hooks_count: "3",
    ideal_avatar: "",
    selected_pain: "",
    selected_desire: "",
    selected_objection: "",
    target_country: "",
    narrative_structure: "",
    additional_instructions: "",
    hooks: [],
    script_prompt: DEFAULT_PROMPTS.script,
    director_prompt: DEFAULT_PROMPTS.director,
    marketing_prompt: DEFAULT_PROMPTS.marketing,
    captions_prompt: DEFAULT_PROMPTS.captions,
    broll_prompt: DEFAULT_PROMPTS.broll,
    reference_transcription: "",
    video_strategies: "",
    ai_model: "mistralai/mistral-large-latest",
    video_duration: "",
    target_platform: "",
    use_perplexity: false,
  });
  const [perplexityQueries, setPerplexityQueries] = useState<PerplexityQueriesState>({
    trends: true,
    hooks: true,
    competitors: false,
    audience: false,
  });
  const [customPerplexityQuery, setCustomPerplexityQuery] = useState("");

  // Track AI prefill status
  const [prefillStatus, setPrefillStatus] = useState<{
    isPrefilled: boolean;
    prefilledAt: string | null;
    fieldsLoaded: string[];
  }>({
    isPrefilled: false,
    prefilledAt: null,
    fieldsLoaded: [],
  });

  // Load prefill data from content record if available
  useEffect(() => {
    let cancelled = false;

    const loadPrefillData = async () => {
      if (!contentId) return;

      try {
        const { data: contentData, error } = await supabase
          .from('content')
          .select('ai_prefilled, ai_prefilled_at, selected_pain, selected_desire, selected_objection, target_country, narrative_structure, video_duration, ideal_avatar, sales_angle, suggested_hooks, cta, target_platform')
          .eq('id', contentId)
          .maybeSingle();

        if (error || !contentData || cancelled) return;

        // Check if this content was AI-prefilled
        if (contentData.ai_prefilled) {
          const fieldsLoaded: string[] = [];
          const updates: Partial<ScriptFormData> = {};

          // Load prefilled values into form if they exist and form fields are empty
          if (contentData.selected_pain) {
            updates.selected_pain = contentData.selected_pain;
            fieldsLoaded.push('dolor');
          }
          if (contentData.selected_desire) {
            updates.selected_desire = contentData.selected_desire;
            fieldsLoaded.push('deseo');
          }
          if (contentData.selected_objection) {
            updates.selected_objection = contentData.selected_objection;
            fieldsLoaded.push('objeción');
          }
          if (contentData.target_country) {
            updates.target_country = contentData.target_country;
            fieldsLoaded.push('país');
          }
          if (contentData.narrative_structure) {
            updates.narrative_structure = contentData.narrative_structure;
            fieldsLoaded.push('estructura');
          }
          if (contentData.video_duration) {
            updates.video_duration = contentData.video_duration;
            fieldsLoaded.push('duración');
          }
          if (contentData.ideal_avatar) {
            updates.ideal_avatar = contentData.ideal_avatar;
            fieldsLoaded.push('avatar');
          }
          if (contentData.sales_angle) {
            updates.sales_angle = contentData.sales_angle;
            fieldsLoaded.push('ángulo');
          }
          if (contentData.cta) {
            updates.cta = contentData.cta;
            fieldsLoaded.push('CTA');
          }
          if (contentData.target_platform) {
            updates.target_platform = contentData.target_platform;
            fieldsLoaded.push('plataforma');
          }
          // Handle suggested_hooks (JSONB array)
          if (contentData.suggested_hooks && Array.isArray(contentData.suggested_hooks)) {
            updates.hooks = contentData.suggested_hooks as string[];
            fieldsLoaded.push('hooks');
          }

          if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, ...updates }));
            setPrefillStatus({
              isPrefilled: true,
              prefilledAt: contentData.ai_prefilled_at,
              fieldsLoaded,
            });
          }
        }
      } catch (e) {
        console.error('[StrategistScriptForm] Error loading prefill data:', e);
      }
    };

    loadPrefillData();

    return () => {
      cancelled = true;
    };
  }, [contentId]);

  // Update prompts when custom prompts are loaded
  useEffect(() => {
    if (!loadingPrompts && customPrompts) {
      setFormData(prev => ({
        ...prev,
        script_prompt: customPrompts.script || DEFAULT_PROMPTS.script,
        director_prompt: customPrompts.director || DEFAULT_PROMPTS.director,
        marketing_prompt: customPrompts.marketing || DEFAULT_PROMPTS.marketing,
        captions_prompt: customPrompts.captions || DEFAULT_PROMPTS.captions,
      }));
    }
  }, [customPrompts, loadingPrompts]);

  // No provider selection needed - using Kreoon AI

  // Pre-fill avatar from product if available
  useEffect(() => {
    if (product?.ideal_avatar && typeof product.ideal_avatar === 'string') {
      const strippedAvatar = product.ideal_avatar.replace(/<[^>]*>/g, '').substring(0, 200);
      setFormData(prev => ({
        ...prev,
        ideal_avatar: strippedAvatar
      }));
    }
  }, [product]);

  // Cargar la investigación COMPLETA del producto (avatar_profiles + sales_angles_data + market_research)
  const [researchProduct, setResearchProduct] = useState<any | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchResearchProduct = async () => {
      if (!product?.id) {
        setResearchProduct(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, avatar_profiles, sales_angles_data, market_research, sales_angles, ideal_avatar, ai_analysis")
          .eq("id", product.id)
          .maybeSingle();

        if (error) throw error;

        const normalized = (() => {
          if (!data) return null;
          const result = { ...(data as any) };
          
          // Parse market_research if it's a string
          const mr = result.market_research;
          if (typeof mr === "string") {
            try {
              result.market_research = JSON.parse(mr);
            } catch {
              // Keep as string if parse fails
            }
          }
          
          // Parse sales_angles_data if it's a string
          const sad = result.sales_angles_data;
          if (typeof sad === "string") {
            try {
              result.sales_angles_data = JSON.parse(sad);
            } catch {
              // Keep as string if parse fails
            }
          }
          
          // Parse avatar_profiles if it's a string
          const ap = result.avatar_profiles;
          if (typeof ap === "string") {
            try {
              result.avatar_profiles = JSON.parse(ap);
            } catch {
              // Keep as string if parse fails
            }
          }
          
          return result;
        })();

        if (!cancelled) setResearchProduct(normalized);
      } catch (e) {
        console.error("[StrategistScriptForm] Error fetching product research", e);
        if (!cancelled) setResearchProduct(null);
      }
    };

    fetchResearchProduct();

    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  const researchAvatars = useMemo(() => {
    const profiles = researchProduct?.avatar_profiles?.profiles;
    if (Array.isArray(profiles) && profiles.length) return profiles;

    const strategicAvatars = researchProduct?.market_research?.strategicAvatars;
    if (Array.isArray(strategicAvatars) && strategicAvatars.length) return strategicAvatars;

    return [];
  }, [researchProduct]);

  const researchAngles = useMemo(() => {
    const angles = researchProduct?.sales_angles_data?.angles;
    if (Array.isArray(angles) && angles.length) return angles;

    const salesAngles = researchProduct?.market_research?.salesAngles;
    if (Array.isArray(salesAngles) && salesAngles.length) return salesAngles;

    const fallback = (researchProduct?.sales_angles ?? product?.sales_angles) as any;
    if (Array.isArray(fallback) && fallback.length) return fallback.map((a: any) => ({ angle: a }));

    return [];
  }, [researchProduct, product?.sales_angles]);

  // Parsear ideal_avatar si es un JSON string para extraer JTBD
  const parsedIdealAvatar = useMemo(() => {
    const avatar = researchProduct?.ideal_avatar || product?.ideal_avatar;
    if (!avatar || typeof avatar !== 'string') return null;
    try {
      return JSON.parse(avatar);
    } catch {
      return null;
    }
  }, [researchProduct, product]);

  // Extraer dolores desde la investigación de mercado o ideal_avatar.jtbd
  const researchPains = useMemo(() => {
    // 1. Buscar en market_research.pains
    const pains = researchProduct?.market_research?.pains;
    if (Array.isArray(pains) && pains.length) return pains;

    // 2. Buscar en market_research.jtbd.pains
    const jtbdPains = researchProduct?.market_research?.jtbd?.pains;
    if (Array.isArray(jtbdPains) && jtbdPains.length) return jtbdPains;

    // 3. Buscar en ideal_avatar.jtbd.pains (JSON parseado)
    const avatarJtbdPains = parsedIdealAvatar?.jtbd?.pains;
    if (Array.isArray(avatarJtbdPains) && avatarJtbdPains.length) return avatarJtbdPains;

    return [];
  }, [researchProduct, parsedIdealAvatar]);

  // Extraer deseos desde la investigación de mercado o ideal_avatar.jtbd
  const researchDesires = useMemo(() => {
    // 1. Buscar en market_research.desires
    const desires = researchProduct?.market_research?.desires;
    if (Array.isArray(desires) && desires.length) return desires;

    // 2. Buscar en market_research.jtbd.desires
    const jtbdDesires = researchProduct?.market_research?.jtbd?.desires;
    if (Array.isArray(jtbdDesires) && jtbdDesires.length) return jtbdDesires;

    // 3. Buscar en ideal_avatar.jtbd.desires (JSON parseado)
    const avatarJtbdDesires = parsedIdealAvatar?.jtbd?.desires;
    if (Array.isArray(avatarJtbdDesires) && avatarJtbdDesires.length) return avatarJtbdDesires;

    return [];
  }, [researchProduct, parsedIdealAvatar]);

  // Extraer objeciones desde la investigación de mercado o ideal_avatar.jtbd
  const researchObjections = useMemo(() => {
    // 1. Buscar en market_research.objections
    const objections = researchProduct?.market_research?.objections;
    if (Array.isArray(objections) && objections.length) return objections;

    // 2. Buscar en market_research.jtbd.objections
    const jtbdObjections = researchProduct?.market_research?.jtbd?.objections;
    if (Array.isArray(jtbdObjections) && jtbdObjections.length) return jtbdObjections;

    // 3. Buscar en ideal_avatar.jtbd.objections (JSON parseado)
    const avatarJtbdObjections = parsedIdealAvatar?.jtbd?.objections;
    if (Array.isArray(avatarJtbdObjections) && avatarJtbdObjections.length) return avatarJtbdObjections;

    return [];
  }, [researchProduct, parsedIdealAvatar]);

  // ADN V2 — datos de ai_analysis
  const researchHookSuggestions = useMemo(() => {
    const raw = (researchProduct as any)?.ai_analysis;
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
    const cb = parsed?.creative_brief;
    const arr = cb?.hooks_suggestions ?? cb?.hooksSuggestions ?? [];
    return Array.isArray(arr) ? arr.filter((s: unknown) => typeof s === 'string' && s.trim()) as string[] : [];
  }, [researchProduct]);

  const researchKeyMessages = useMemo(() => {
    const raw = (researchProduct as any)?.ai_analysis;
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
    const cb = parsed?.creative_brief;
    const arr = cb?.key_messages ?? cb?.keyMessages ?? [];
    return Array.isArray(arr) ? arr.filter((s: unknown) => typeof s === 'string' && s.trim()) as string[] : [];
  }, [researchProduct]);

  const researchCtaSuggestions = useMemo(() => {
    const raw = (researchProduct as any)?.ai_analysis;
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
    const cb = parsed?.creative_brief;
    const arr = cb?.cta_recommendations ?? cb?.ctaRecommendations ?? [];
    return Array.isArray(arr) ? arr.filter((s: unknown) => typeof s === 'string' && s.trim()) as string[] : [];
  }, [researchProduct]);

  const researchBuyingTriggers = useMemo(() => {
    const raw = (researchProduct as any)?.ai_analysis;
    if (!raw) return [];
    const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
    const ta = parsed?.target_audience;
    const arr = ta?.buying_triggers ?? ta?.buyingTriggers ?? [];
    return Array.isArray(arr) ? arr.filter((s: unknown) => typeof s === 'string' && s.trim()) as string[] : [];
  }, [researchProduct]);

  const hasV2Data = researchHookSuggestions.length > 0 || researchKeyMessages.length > 0;

  // Auto-fill sales_angle and narrative_structure from research when available
  useEffect(() => {
    // Only auto-fill if fields are empty and we have research data
    if (!researchProduct) return;
    
    setFormData(prev => {
      const updates: Partial<ScriptFormData> = {};
      
      // Auto-fill first sales angle if empty
      if (!prev.sales_angle) {
        const angles = researchProduct?.sales_angles_data?.angles;
        if (Array.isArray(angles) && angles.length > 0) {
          const firstAngle = angles[0];
          const angleText = firstAngle?.angle || firstAngle?.salesAngle || firstAngle?.name || "";
          if (angleText) {
            updates.sales_angle = angleText;
          }
        }
      }
      
      // Auto-fill narrative structure based on sales angle type if empty
      if (!prev.narrative_structure) {
        const angles = researchProduct?.sales_angles_data?.angles;
        if (Array.isArray(angles) && angles.length > 0) {
          const firstAngle = angles[0];
          const type = firstAngle?.type?.toLowerCase() || "";
          
          // Map angle type to narrative structure
          if (type.includes("problema") || type.includes("dolor")) {
            updates.narrative_structure = "problema-solucion";
          } else if (type.includes("transform") || type.includes("antes")) {
            updates.narrative_structure = "antes-despues";
          } else if (type.includes("testimon")) {
            updates.narrative_structure = "testimonio";
          } else if (type.includes("tutorial") || type.includes("educa")) {
            updates.narrative_structure = "tutorial";
          } else if (type.includes("urgencia") || type.includes("escasez")) {
            updates.narrative_structure = "urgencia";
          } else if (type.includes("prueba") || type.includes("social")) {
            updates.narrative_structure = "testimonio";
          } else {
            // Default to problema-solucion as it's most versatile
            updates.narrative_structure = "problema-solucion";
          }
        }
      }
      
      // Auto-suggest CTA from sales_angles_data.puv if empty
      if (!prev.cta) {
        const puv = researchProduct?.sales_angles_data?.puv;
        if (puv?.tangibleResult) {
          // Use tangible result as a suggestion for CTA
          updates.cta = "Descubre cómo lograrlo";
        }
      }
      
      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
  }, [researchProduct]);
  const fetchDocument = async (url: string): Promise<{ content: string; warning?: string }> => {
    if (!url) return { content: "" };
    
    try {
      const { data, error } = await supabase.functions.invoke("fetch-document", {
        body: { url },
      });

      if (error) {
        console.error("Error fetching document:", error);
        return { content: "", warning: error.message };
      }

      return { 
        content: data?.content || "", 
        warning: data?.warning 
      };
    } catch (error) {
      console.error("Error fetching document:", error);
      return { content: "", warning: error instanceof Error ? error.message : "Error desconocido" };
    }
  };

  // Fetch content from uploaded file or fallback to Drive URL
  const fetchDocumentContent = async (fileUrl: string | undefined, driveUrl: string | undefined): Promise<{ content: string; warning?: string; source?: string }> => {
    // Priority: uploaded file > drive URL
    if (fileUrl) {
      try {
        const response = await fetch(fileUrl);
        if (response.ok) {
          const text = await response.text();
          return { content: text, source: "file" };
        }
      } catch (error) {
        console.error("Error fetching uploaded file:", error);
      }
    }
    
    // Fallback to Drive URL
    if (driveUrl) {
      return { ...await fetchDocument(driveUrl), source: "drive" };
    }
    
    return { content: "" };
  };

  // Load all product documents
  const loadProductDocuments = async () => {
    if (!product) return;

    setLoadingDocs(true);
    const warnings: string[] = [];
    
    try {
      // Check for uploaded files first, then fall back to Drive URLs
      const [briefResult, onboardingResult, researchResult] = await Promise.all([
        fetchDocumentContent((product as any).brief_file_url, product.brief_url || undefined),
        fetchDocumentContent((product as any).onboarding_file_url, product.onboarding_url || undefined),
        fetchDocumentContent((product as any).research_file_url, product.research_url || undefined),
      ]);

      // Collect warnings
      if (briefResult.warning) warnings.push(`Brief: ${briefResult.warning}`);
      if (onboardingResult.warning) warnings.push(`Onboarding: ${onboardingResult.warning}`);
      if (researchResult.warning) warnings.push(`Research: ${researchResult.warning}`);

      setDocumentContent({
        brief: briefResult.content,
        onboarding: onboardingResult.content,
        research: researchResult.content,
      });
      setDocsLoaded(true);

      const loadedCount = [briefResult.content, onboardingResult.content, researchResult.content].filter(c => c.length > 0).length;
      const sources = [briefResult, onboardingResult, researchResult]
        .filter(r => r.content)
        .map(r => r.source === "file" ? "archivo" : "Drive");
      
      if (warnings.length > 0) {
        toast({
          title: `${loadedCount} documentos cargados`,
          description: warnings.join(". "),
          variant: loadedCount === 0 ? "destructive" : "default",
        });
      } else if (loadedCount > 0) {
        toast({
          title: "Documentos cargados",
          description: `Se cargaron ${loadedCount} documento(s) desde ${[...new Set(sources)].join(" y ")}`,
        });
      }
    } catch (error) {
      console.error("Error loading documents:", error);
      toast({
        title: "Error al cargar documentos",
        description: "Algunos documentos no pudieron ser cargados",
        variant: "destructive",
      });
    } finally {
      setLoadingDocs(false);
    }
  };


  const addHook = () => {
    if (newHook.trim() && formData.hooks.length < parseInt(formData.hooks_count)) {
      setFormData({
        ...formData,
        hooks: [...formData.hooks, newHook.trim()]
      });
      setNewHook("");
    }
  };

  const removeHook = (index: number) => {
    setFormData({
      ...formData,
      hooks: formData.hooks.filter((_, i) => i !== index)
    });
  };

  const updateStepStatus = (key: string, status: GenerationStep["status"]) => {
    setGenerationSteps(prev => 
      prev.map(step => step.key === key ? { ...step, status } : step)
    );
  };

  const resetSteps = () => {
    setGenerationSteps([
      { key: "script", label: "🎬 Guión", status: "pending" },
      { key: "director", label: "🎥 Director", status: "pending" },
      { key: "marketing", label: "📊 Marketing", status: "pending" },
      { key: "captions", label: "📱 Captions", status: "pending" },
    ]);
  };

  const buildBaseContext = () => {
    const narrativeLabel = NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label || formData.narrative_structure;
    
    // Determine sphere phase info
    const sphereInfo = spherePhase ? getSpherePhaseInfo(spherePhase) : null;
    
    // Get business type
    const businessType = (product?.business_type as 'product_service' | 'personal_brand') || 'product_service';
    const isPersonalBrand = businessType === 'personal_brand';
    
    // Parse structured research data (V1 + V2)
    const researchData = product ? parseProductResearch({
      market_research: product.market_research,
      avatar_profiles: product.avatar_profiles,
      sales_angles: product.sales_angles,
      sales_angles_data: product.sales_angles_data,
      competitor_analysis: product.competitor_analysis,
      brief_data: product.brief_data,
      ai_analysis: (researchProduct as any)?.ai_analysis ?? product.ai_analysis,
    }) : null;
    
    // Format research for prompt
    const formattedResearch = researchData 
      ? formatResearchForPrompt(researchData, businessType)
      : '';
    
    // Get duration and platform labels
    const durationLabel = VIDEO_DURATIONS.find(d => d.value === formData.video_duration)?.label || formData.video_duration;
    const platformLabel = TARGET_PLATFORMS.find(p => p.value === formData.target_platform)?.label || formData.target_platform;
    
    let context = `${isPersonalBrand ? '🎯 MARCA PERSONAL' : '📦 PRODUCTO/SERVICIO'}: ${product?.name}
DESCRIPCIÓN: ${product?.description || 'No disponible'}
CTA: ${formData.cta}
ÁNGULO DE VENTA: ${formData.sales_angle}
ESTRUCTURA NARRATIVA: ${narrativeLabel}
PAÍS OBJETIVO: ${formData.target_country}
${formData.video_duration ? `DURACIÓN DEL VIDEO: ${durationLabel}` : ''}
${formData.target_platform ? `PLATAFORMA DESTINO: ${platformLabel}` : ''}
AVATAR/CLIENTE IDEAL: ${formData.ideal_avatar}

⚠️ CANTIDAD DE HOOKS: ${formData.hooks_count} (OBLIGATORIO: genera EXACTAMENTE esta cantidad en la ESCENA 1)

`;

    // Add research variables if selected
    if (formData.selected_pain || formData.selected_desire || formData.selected_objection) {
      context += `=== VARIABLES DE INVESTIGACIÓN SELECCIONADAS ===
`;
      if (formData.selected_pain) {
        context += `😰 DOLOR A EXPLOTAR: ${formData.selected_pain}
`;
      }
      if (formData.selected_desire) {
        context += `✨ DESEO A ACTIVAR: ${formData.selected_desire}
`;
      }
      if (formData.selected_objection) {
        context += `🚫 OBJECIÓN A ROMPER: ${formData.selected_objection}
`;
      }
      context += `
`;
    }

    // Add personal brand context
    if (isPersonalBrand) {
      context += `⚠️ IMPORTANTE - MARCA PERSONAL:
- El dueño de la marca será quien grabe el contenido (NO un creador externo)
- Los guiones deben estar en PRIMERA PERSONA ("Yo te enseño", "Mi método", etc.)
- El tono debe ser personal, auténtico y cercano
- Incluir referencias a la experiencia y trayectoria personal

`;
    }

    // Add detailed sphere phase context
    if (sphereInfo) {
      context += `=== FASE DEL MÉTODO ESFERA: ${sphereInfo.label} ===
🎯 OBJETIVO DE FASE: ${sphereInfo.objective}
👥 TIPO DE AUDIENCIA: ${sphereInfo.audience}
🎨 TONO RECOMENDADO: ${sphereInfo.tone}

📋 TÉCNICAS OBLIGATORIAS (usar al menos 2):
${sphereInfo.techniques.map((t, i) => `${i + 1}. ${t}`).join('\n')}

💬 FRASES/KEYWORDS SUGERIDAS:
${sphereInfo.keywords.map(k => `• "${k}"`).join('\n')}

📢 ESTILO DE CTA: ${sphereInfo.ctaStyle}

⚠️ IMPORTANTE: El guión DEBE estar 100% alineado con los objetivos de ${sphereInfo.label}.

`;
    }

    context += `ESTRATEGIA DEL PRODUCTO:
${product?.strategy || 'No disponible'}

${formattedResearch ? `=== INVESTIGACIÓN DE MERCADO DETALLADA ===
${formattedResearch}

` : `INVESTIGACIÓN DE MERCADO:
${product?.market_research || 'No disponible'}

`}ÁNGULOS DE VENTA DISPONIBLES:
${product?.sales_angles?.join(', ') || 'No definidos'}

HOOKS SUGERIDOS:
${formData.hooks.length > 0 ? formData.hooks.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'Generar automáticamente'}`;

    // Agregar datos exclusivos del ADN V2 si están disponibles
    if (researchData?.keyMessages?.length) {
      context += `\n\nMENSAJES CLAVE (ADN V2):\n${researchData.keyMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}`;
    }
    if (researchData?.ctaRecommendations?.length) {
      context += `\n\nCTAs RECOMENDADOS (ADN V2):\n${researchData.ctaRecommendations.slice(0, 4).map((c, i) => `${i + 1}. ${c}`).join('\n')}`;
    }
    if (researchData?.trends?.length) {
      context += `\n\nTENDENCIAS DE MERCADO (ADN V2):\n${researchData.trends.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
    }
    if (researchData?.buyingTriggers?.length) {
      context += `\n\nDISPARADORES DE COMPRA (ADN V2):\n${researchData.buyingTriggers.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
    }

    // Add document content if loaded
    if (documentContent.brief) {
      context += `\n\n--- BRIEF DEL CLIENTE ---\n${documentContent.brief.substring(0, 3000)}`;
    }
    if (documentContent.onboarding) {
      context += `\n\n--- ONBOARDING ---\n${documentContent.onboarding.substring(0, 3000)}`;
    }
    if (documentContent.research) {
      context += `\n\n--- INVESTIGACIÓN ---\n${documentContent.research.substring(0, 3000)}`;
    }

    if (formData.reference_transcription) {
      context += `\n\nTRANSCRIPCIÓN VIDEO DE REFERENCIA:\n${formData.reference_transcription}`;
    }
    if (formData.video_strategies) {
      context += `\n\nESTRATEGIAS/ESTRUCTURAS DE VIDEO:\n${formData.video_strategies}`;
    }
    if (formData.additional_instructions) {
      context += `\n\nINSTRUCCIONES ADICIONALES:\n${formData.additional_instructions}`;
    }

    return context;
  };

  const generateContent = async (
    type: "script" | "director" | "marketing" | "captions" | "broll" | "editor" | "strategist" | "trafficker" | "designer" | "admin",
    customPrompt: string,
    previousScript?: string
  ): Promise<string> => {
    const baseContext = buildBaseContext();
    
    let fullPrompt = `${customPrompt}\n\n---\nCONTEXTO:\n${baseContext}`;
    
    if (previousScript && type !== "script") {
      fullPrompt += `\n\n---\nGUIÓN GENERADO:\n${previousScript}`;
    }

    const { data, error } = await supabase.functions.invoke(CONTENT_AI_FUNCTION, {
      body: {
        action: formData.use_perplexity ? "research_and_generate" : "generate_script",
        organizationId,
        prompt: fullPrompt,
        product: {
          id: product?.id,
          name: product?.name,
          description: product?.description,
          strategy: product?.strategy,
          market_research: product?.market_research,
          ideal_avatar: product?.ideal_avatar,
          sales_angles: product?.sales_angles,
        },
        generation_type: type,
        ai_provider: "gemini",
        ai_model: formData.ai_model,
        use_perplexity: formData.use_perplexity,
        perplexity_queries: formData.use_perplexity ? perplexityQueries : undefined,
        custom_perplexity_query: formData.use_perplexity && customPerplexityQuery.trim() ? customPerplexityQuery.trim() : undefined,
        script_params: {
          cta: formData.cta,
          sales_angle: formData.sales_angle,
          hooks_count: formData.hooks_count,
          target_country: formData.target_country,
          narrative_structure: formData.narrative_structure,
          video_duration: formData.video_duration,
          target_platform: formData.target_platform,
          ideal_avatar: formData.ideal_avatar,
          platform: formData.target_platform || "TikTok",
          product_category: product?.name,
          video_strategies: formData.video_strategies,
          reference_transcription: formData.reference_transcription,
          hooks: formData.hooks,
          additional_instructions: formData.additional_instructions,
          document_brief: documentContent.brief,
          document_onboarding: documentContent.onboarding,
          document_research: documentContent.research,
        },
      },
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Respuesta vacía de la IA");
    if (data.error) throw new Error(data.error);

    return data.script || data.result || "";
  };

  const handleGenerate = async () => {
    if (!product) {
      toast({
        title: "Selecciona un producto",
        description: "Primero debes asociar un producto al proyecto",
        variant: "destructive",
      });
      return;
    }

    if (!formData.cta || !formData.sales_angle || !formData.narrative_structure) {
      toast({
        title: "Campos requeridos",
        description: "Completa CTA, Ángulo de venta y Estructura narrativa",
        variant: "destructive",
      });
      return;
    }

    if (selectedCount === 0) {
      toast({
        title: "Selecciona al menos un bloque",
        description: "Debes seleccionar al menos un bloque para generar",
        variant: "destructive",
      });
      return;
    }

    // Pre-check token balance
    if (insufficientTokens) {
      toast({
        title: "Tokens insuficientes",
        description: `Necesitas ${totalCost} tokens pero tienes ${totalAvailable}. Compra mas tokens o selecciona menos bloques.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    resetSteps();

    const generatedContent: GeneratedContent = {
      script: "",
      director_output: "",
      marketing_output: "",
      captions: "",
    };

    const emitProgress = (patch: Partial<GeneratedContent>) => {
      console.log("[StrategistScriptForm] emitProgress", {
        script: patch.script?.length,
        director: patch.director_output?.length,
        marketing: patch.marketing_output?.length,
        captions: patch.captions?.length,
      });
      onScriptGenerated({ ...generatedContent, ...patch });
    };

    // Determine script context: generate new or use existing
    let scriptContext = "";

    try {
      // Step 1: Script block (generate or use existing as context)
      if (selectedBlocks.script) {
        updateStepStatus("script", "generating");
        try {
          generatedContent.script = await generateContent("script", formData.script_prompt);
          updateStepStatus("script", "done");
          emitProgress({ script: generatedContent.script });
          scriptContext = generatedContent.script;
        } catch (error: any) {
          updateStepStatus("script", "error");
          if (error?.message?.includes("insufficient_tokens") || error?.message?.includes("402")) {
            toast({ title: "Tokens insuficientes", description: "No hay tokens suficientes para continuar.", variant: "destructive" });
            refetchBalance();
            return;
          }
          throw error;
        }
      } else {
        // Use existing script from form data as context for other blocks
        scriptContext = formData.script_prompt;
      }

      // Step 2-5: Other blocks (only selected ones)
      const otherBlocks: Array<{
        key: "director" | "marketing" | "captions" | "broll";
        field: keyof GeneratedContent;
        prompt: string;
      }> = [
        { key: "director", field: "director_output", prompt: formData.director_prompt || "" },
        { key: "marketing", field: "marketing_output", prompt: formData.marketing_prompt || "" },
        { key: "captions", field: "captions", prompt: formData.captions_prompt || "" },
        { key: "broll", field: "broll_output", prompt: formData.broll_prompt || "" },
      ];

      for (const block of otherBlocks) {
        if (!selectedBlocks[block.key]) continue;

        updateStepStatus(block.key, "generating");
        try {
          const result = await generateContent(block.key, block.prompt, scriptContext);
          (generatedContent as any)[block.field] = result;
          updateStepStatus(block.key, "done");
          emitProgress({ [block.field]: result });
        } catch (error: any) {
          updateStepStatus(block.key, "error");
          if (error?.message?.includes("insufficient_tokens") || error?.message?.includes("402")) {
            toast({ title: "Tokens insuficientes", description: "Se agotaron los tokens. Los bloques anteriores se conservaron.", variant: "destructive" });
            refetchBalance();
            return;
          }
          throw error;
        }
      }

      toast({
        title: "Contenido generado exitosamente",
        description: `${selectedCount} bloque${selectedCount > 1 ? 's' : ''} generado${selectedCount > 1 ? 's' : ''} con IA`,
      });
    } catch (error) {
      console.error("Error:", error);
      const currentStep = generationSteps.find(s => s.status === "generating");
      if (currentStep) {
        updateStepStatus(currentStep.key, "error");
      }
      toast({
        title: "Error al generar",
        description: error instanceof Error ? error.message : "No se pudo generar el contenido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      refetchBalance();
    }
  };

  if (!product) {
    return (
      <div className="p-4 sm:p-6 border rounded-sm bg-muted/50 text-center">
        <FileText className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-2 sm:mb-3 text-muted-foreground" />
        <p className="text-xs sm:text-sm text-muted-foreground">
          Selecciona un producto para crear el brief del guión
        </p>
      </div>
    );
  }

  const hasDocumentUrls = product.brief_url || product.onboarding_url || product.research_url;

  return (
    <div className="space-y-3 sm:space-y-6 p-3 sm:p-6 border rounded-sm bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg">
          <Wand2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          Formulario de Guión
        </h4>
        <Badge variant="secondary" className="text-[10px] sm:text-xs bg-primary/10 text-primary border-primary/20 truncate max-w-[140px] sm:max-w-none">
          {AI_MODELS.find(m => m.value === formData.ai_model)?.label || "IA"}
        </Badge>
      </div>

      {/* AI Prefill Banner */}
      {prefillStatus.isPrefilled && (
        <div className="p-2 sm:p-3 rounded-sm bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <div className="flex items-start sm:items-center gap-2">
            <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-green-800 dark:text-green-200">
                Pre-llenado con IA
              </p>
              <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                Campos sugeridos desde la investigación.
                {prefillStatus.fieldsLoaded.length > 0 && (
                  <span className="hidden sm:inline"> Campos: {prefillStatus.fieldsLoaded.join(', ')}.</span>
                )}
              </p>
            </div>
            {prefillStatus.prefilledAt && (
              <Badge variant="outline" className="text-[10px] sm:text-xs text-green-600 border-green-600 shrink-0">
                {new Date(prefillStatus.prefilledAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* CAST Layer Banner */}
      {spherePhase && (() => {
        const castInfo = getCastLayerInfo(spherePhase);
        if (!castInfo) return null;
        const bgMap: Record<string, string> = {
          C: 'from-blue-500/10 to-cyan-500/10 border-blue-500/30 text-blue-400',
          A: 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30 text-yellow-400',
          S: 'from-red-500/10 to-rose-500/10 border-red-500/30 text-red-400',
          T: 'from-green-500/10 to-emerald-500/10 border-green-500/30 text-green-400',
        };
        const colors = bgMap[castInfo.letter] || bgMap['C'];
        return (
          <div className={`p-2.5 sm:p-3 rounded-sm bg-gradient-to-r ${colors} border flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg font-bold shrink-0">{castInfo.letter}</span>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold leading-tight">{castInfo.label} · {castInfo.funnel}</p>
                <p className="text-[10px] sm:text-xs opacity-80 line-clamp-1">{castInfo.objective}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 ml-auto shrink-0">
              {castInfo.kpis.slice(0, 3).map(kpi => (
                <span key={kpi} className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-background/40 font-mono">{kpi}</span>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Panel Intel de Investigación ADN */}
      {(hasV2Data || researchAngles.length > 0 || researchPains.length > 0) && (
        <Accordion type="single" collapsible defaultValue={hasV2Data ? "intel" : undefined}>
          <AccordionItem value="intel" className="border rounded-sm bg-gradient-to-br from-violet-500/5 to-purple-500/10 border-violet-500/20">
            <AccordionTrigger className="px-3 sm:px-4 py-2.5 sm:py-3 hover:no-underline [&>svg]:shrink-0">
              <div className="flex items-center gap-2 text-left min-w-0">
                <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-violet-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-violet-300">Inteligencia de Investigación ADN</span>
                <div className="flex flex-wrap gap-1 ml-1">
                  {researchAngles.length > 0 && (
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300">{researchAngles.length} ángulos</span>
                  )}
                  {researchPains.length > 0 && (
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300">{researchPains.length} dolores</span>
                  )}
                  {researchHookSuggestions.length > 0 && (
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">{researchHookSuggestions.length} hooks</span>
                  )}
                  {hasV2Data && (
                    <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-300 font-semibold">V2 ADN</span>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4">

              {/* Hooks sugeridos ADN V2 */}
              {researchHookSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] sm:text-xs font-semibold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Zap className="h-3 w-3" /> Hooks sugeridos (ADN V2)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {researchHookSuggestions.slice(0, 6).map((hook, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="text-[10px] sm:text-xs px-2 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/25 transition-colors text-left max-w-[200px] truncate"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          hooks: prev.hooks.includes(hook) ? prev.hooks : [...prev.hooks, hook].slice(0, parseInt(prev.hooks_count)),
                        }))}
                        title={hook}
                      >
                        + {hook}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mensajes clave */}
              {researchKeyMessages.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] sm:text-xs font-semibold text-violet-400 uppercase tracking-wide flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3" /> Mensajes clave (ADN V2)
                  </p>
                  <ul className="space-y-1">
                    {researchKeyMessages.slice(0, 5).map((msg, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <ChevronRight className="h-3 w-3 text-violet-400 shrink-0 mt-0.5" />
                        <span className="text-[10px] sm:text-xs text-muted-foreground">{msg}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTAs recomendados */}
              {researchCtaSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] sm:text-xs font-semibold text-green-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Hash className="h-3 w-3" /> CTAs recomendados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {researchCtaSuggestions.slice(0, 4).map((cta, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="text-[10px] sm:text-xs px-2 py-1 rounded-full border border-green-500/30 bg-green-500/10 text-green-200 hover:bg-green-500/25 transition-colors"
                        onClick={() => setFormData(prev => ({ ...prev, cta }))}
                        title={`Aplicar CTA: ${cta}`}
                      >
                        {cta}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Disparadores de compra */}
              {researchBuyingTriggers.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] sm:text-xs font-semibold text-orange-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Zap className="h-3 w-3" /> Disparadores de compra
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {researchBuyingTriggers.slice(0, 5).map((trigger, idx) => (
                      <span key={idx} className="text-[10px] sm:text-xs px-2 py-1 rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-200">
                        {trigger}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón Auto-aplicar */}
              {hasV2Data && (
                <button
                  type="button"
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-sm border border-violet-500/30 bg-violet-500/15 hover:bg-violet-500/25 transition-colors text-xs sm:text-sm font-medium text-violet-200"
                  onClick={() => {
                    const updates: Partial<typeof formData> = {};
                    if (!formData.sales_angle && researchAngles.length > 0) {
                      const a = researchAngles[0] as any;
                      updates.sales_angle = a?.angle || a?.salesAngle || a?.name || '';
                    }
                    if (!formData.selected_pain && researchPains.length > 0) {
                      const p = researchPains[0] as any;
                      updates.selected_pain = typeof p === 'string' ? p : (p?.pain || p?.description || '');
                    }
                    if (!formData.selected_desire && researchDesires.length > 0) {
                      const d = researchDesires[0] as any;
                      updates.selected_desire = typeof d === 'string' ? d : (d?.desire || d?.description || '');
                    }
                    if (!formData.cta && researchCtaSuggestions.length > 0) {
                      updates.cta = researchCtaSuggestions[0];
                    }
                    if (formData.hooks.length === 0 && researchHookSuggestions.length > 0) {
                      updates.hooks = researchHookSuggestions.slice(0, parseInt(formData.hooks_count));
                    }
                    if (Object.keys(updates).length > 0) setFormData(prev => ({ ...prev, ...updates }));
                  }}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto-aplicar mejores sugerencias ADN
                </button>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Block Selection */}
      <div className="p-2.5 sm:p-4 rounded-sm bg-muted/50 border space-y-2 sm:space-y-3">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
          <Label className="text-xs sm:text-sm font-medium">Bloques a generar</Label>
        </div>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {Object.entries(BLOCK_LABELS).map(([key, { emoji, short }]) => {
            const cost = getTokenCost(BLOCK_ACTION_KEYS[key]);
            const isSelected = selectedBlocks[key];
            return (
              <Badge
                key={key}
                variant={isSelected ? "default" : "outline"}
                className={`cursor-pointer select-none transition-all text-[10px] sm:text-xs px-2 py-1 ${
                  isSelected ? "" : "opacity-50"
                }`}
                onClick={() =>
                  setSelectedBlocks((prev) => ({ ...prev, [key]: !prev[key] }))
                }
              >
                {emoji} {short} <span className="ml-1 font-mono">{cost}</span>
              </Badge>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
          <span>
            Total: <span className="font-semibold text-foreground">{totalCost} tokens</span>
            {balance && (
              <span className="ml-2">
                Saldo: <span className={`font-semibold ${insufficientTokens ? "text-destructive" : "text-foreground"}`}>
                  {totalAvailable.toLocaleString()}
                </span>
              </span>
            )}
          </span>
          {selectedCount < 6 && (
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() =>
                setSelectedBlocks({ script: true, editor: true, trafficker: true, strategist: true, designer: true, admin: true })
              }
            >
              Seleccionar todos
            </button>
          )}
        </div>
        {insufficientTokens && (
          <p className="text-[10px] sm:text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            Tokens insuficientes. Selecciona menos bloques o compra mas tokens.
          </p>
        )}
      </div>

      {/* Document Loading Section */}
      {hasDocumentUrls && (
        <div className="p-2.5 sm:p-4 rounded-sm bg-muted/50 border space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <FileSearch className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <Label className="text-xs sm:text-sm font-medium truncate">Documentos</Label>
              {docsLoaded && (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 sm:hidden" />
              )}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              {docsLoaded && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600 hidden sm:flex">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Cargados
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadProductDocuments}
                disabled={loadingDocs}
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
              >
                {loadingDocs ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span className="ml-1.5 hidden sm:inline">{docsLoaded ? "Recargar" : "Cargar Docs"}</span>
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs">
            {product.brief_url && (
              <Badge variant={documentContent.brief ? "default" : "secondary"}>
                Brief {documentContent.brief ? `(${Math.round(documentContent.brief.length / 100)}kb)` : ""}
              </Badge>
            )}
            {product.onboarding_url && (
              <Badge variant={documentContent.onboarding ? "default" : "secondary"}>
                Onboarding {documentContent.onboarding ? `(${Math.round(documentContent.onboarding.length / 100)}kb)` : ""}
              </Badge>
            )}
            {product.research_url && (
              <Badge variant={documentContent.research ? "default" : "secondary"}>
                Research {documentContent.research ? `(${Math.round(documentContent.research.length / 100)}kb)` : ""}
              </Badge>
            )}
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* CTA */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> CTA *
          </Label>
          <Input
            value={formData.cta}
            onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
            placeholder="Ej: Haz clic en el link de la bio"
            className="text-sm"
          />
        </div>

        {/* Ángulo de Venta */}
        <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Ángulo de Venta *
          </Label>

          {/* Input de texto libre (para ángulo personalizado) */}
          <Input
            value={formData.sales_angle}
            onChange={(e) => setFormData(prev => ({ ...prev, sales_angle: e.target.value }))}
            placeholder="Escribe o selecciona un ángulo de venta..."
            className="text-sm"
          />

          {/* Tarjetas de ángulos de la investigación */}
          {researchAngles.length > 0 && (
            <div className="max-h-52 overflow-y-auto rounded-sm border bg-muted/20 p-2">
              <p className="text-[10px] text-muted-foreground mb-2 px-1">
                {researchAngles.length} ángulo{researchAngles.length !== 1 ? 's' : ''} de la investigación — haz click para seleccionar:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {researchAngles.map((a: any, idx: number) => {
                  const angleText = a?.angle || a?.salesAngle || a?.name || "";
                  if (!angleText) return null;
                  const angleType = a?.type || a?.category || a?.funnelPhase || "";
                  const description = a?.description || a?.explicacion || "";
                  const isSelected = formData.sales_angle === angleText;
                  const isV2 = !!(a?._source === 'v2' || (!a?.type && !a?.category && idx >= (product?.sales_angles?.length ?? 0)));

                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`text-left p-2.5 rounded-sm border transition-all ${
                        isSelected
                          ? 'ring-2 ring-primary border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50 bg-background'
                      }`}
                      onClick={() => setFormData(prev => ({ ...prev, sales_angle: angleText }))}
                    >
                      <p className="text-xs font-medium leading-snug line-clamp-2">{angleText}</p>
                      {description && (
                        <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{description}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                        {angleType && (
                          <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                            {angleType}
                          </Badge>
                        )}
                        {isV2 && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-green-500/50 text-green-400">
                            V2 ADN
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Número de Hooks */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <ListOrdered className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Hooks
          </Label>
          <Select 
            value={formData.hooks_count} 
            onValueChange={(v) => setFormData({ ...formData, hooks_count: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(n => (
                <SelectItem key={n} value={String(n)}>{n} Hook{n > 1 ? 's' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* País Objetivo */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> País
          </Label>
          <Select 
            value={formData.target_country} 
            onValueChange={(v) => setFormData({ ...formData, target_country: v })}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar país..." /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((country) => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Duración del Video */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Duración
          </Label>
          <Select 
            value={formData.video_duration} 
            onValueChange={(v) => setFormData({ ...formData, video_duration: v })}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar duración..." /></SelectTrigger>
            <SelectContent>
              {VIDEO_DURATIONS.map((duration) => (
                <SelectItem key={duration.value} value={duration.value}>{duration.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Plataforma Destino */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Plataforma
          </Label>
          <Select 
            value={formData.target_platform} 
            onValueChange={(v) => setFormData({ ...formData, target_platform: v })}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar plataforma..." /></SelectTrigger>
            <SelectContent>
              {TARGET_PLATFORMS.map((platform) => (
                <SelectItem key={platform.value} value={platform.value}>{platform.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Perplexity Research */}
        <div className="space-y-4 sm:col-span-2">
          <div className="flex items-center justify-between p-2.5 sm:p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-sm border border-purple-500/20 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-sm shrink-0">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
              </div>
              <div className="min-w-0">
                <Label className="text-xs sm:text-sm font-medium">Investigación en tiempo real</Label>
                <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                  Usa Perplexity para buscar tendencias y hooks actuales
                </p>
              </div>
            </div>
            <Switch
              checked={formData.use_perplexity}
              onCheckedChange={(checked) => setFormData({ ...formData, use_perplexity: checked })}
            />
          </div>

          {formData.use_perplexity && (
            <div className="ml-4 space-y-2 animate-in slide-in-from-top-2">
              <p className="text-sm font-medium text-muted-foreground">¿Qué investigar?</p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant={perplexityQueries.trends ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setPerplexityQueries((q) => ({ ...q, trends: !q.trends }))}
                >
                  📈 Tendencias actuales
                </Badge>
                <Badge
                  variant={perplexityQueries.hooks ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setPerplexityQueries((q) => ({ ...q, hooks: !q.hooks }))}
                >
                  🎣 Hooks efectivos
                </Badge>
                <Badge
                  variant={perplexityQueries.competitors ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setPerplexityQueries((q) => ({ ...q, competitors: !q.competitors }))}
                >
                  🏢 Competencia
                </Badge>
                <Badge
                  variant={perplexityQueries.audience ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setPerplexityQueries((q) => ({ ...q, audience: !q.audience }))}
                >
                  👥 Audiencia
                </Badge>
              </div>

              <Collapsible>
                <CollapsibleTrigger className="text-sm text-purple-400 hover:text-purple-300">
                  + Agregar búsqueda personalizada
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Textarea
                    placeholder="Ej: ¿Cuáles son los challenges virales de TikTok esta semana relacionados con skincare?"
                    value={customPerplexityQuery}
                    onChange={(e) => setCustomPerplexityQuery(e.target.value)}
                    className="mt-2"
                    rows={2}
                  />
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        {/* Estructura Narrativa */}
        <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Estructura Narrativa *
          </Label>
          <Select 
            value={formData.narrative_structure} 
            onValueChange={(v) => setFormData({ ...formData, narrative_structure: v })}
          >
            <SelectTrigger><SelectValue placeholder="Seleccionar estructura..." /></SelectTrigger>
            <SelectContent>
              {NARRATIVE_STRUCTURES.map((structure) => (
                <SelectItem key={structure.value} value={structure.value}>{structure.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Avatar Ideal */}
        <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Avatar / Cliente Ideal
          </Label>
          <Textarea
            value={formData.ideal_avatar}
            onChange={(e) => setFormData({ ...formData, ideal_avatar: e.target.value })}
            placeholder="Describe al cliente ideal..."
            rows={2}
          />

          {/* Selector desplegable para avatares */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Seleccionar avatar ({researchAvatars.length})
                </span>
                <ChevronDown className="h-4 w-4 shrink-0" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 border rounded-sm bg-background p-2 space-y-1 max-h-60 overflow-y-auto">
              {researchAvatars.slice(0, 5).map((a: any, idx: number) => {
                const name = a?.name || a?.avatarName || `Avatar ${idx + 1}`;
                const rawSituation = a?.situation || a?.currentSituation;
                const situation = typeof rawSituation === 'string'
                  ? rawSituation
                  : (rawSituation?.dayToDay || '');

                const formatted = [
                  `AVATAR: ${name}`,
                  situation ? `SITUACIÓN: ${situation}` : "",
                ]
                  .filter(Boolean)
                  .join("\n");

                return (
                  <button
                    key={idx}
                    type="button"
                    className="w-full text-left p-2 rounded hover:bg-muted/50 transition-colors"
                    onClick={() => setFormData(prev => ({ ...prev, ideal_avatar: formatted }))}
                  >
                    <p className="text-sm font-medium">{name}</p>
                    {situation ? (
                      <p className="text-xs text-muted-foreground line-clamp-1">{situation}</p>
                    ) : null}
                  </button>
                );
              })}

              {researchAvatars.length === 0 && (
                <p className="text-sm text-muted-foreground p-2">
                  Selecciona un producto con investigación para ver los avatares.
                </p>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Dolores */}
        <div className="space-y-2 sm:col-span-2">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            💔 Dolor Seleccionado
          </Label>
          <Input
            value={formData.selected_pain}
            onChange={(e) => setFormData({ ...formData, selected_pain: e.target.value })}
            placeholder="Escribe o selecciona un dolor de la investigación..."
            className="text-sm"
          />
          {researchPains.length > 0 && (
            <PainDesireChips
              items={researchPains}
              selected={formData.selected_pain}
              onSelect={(text) => setFormData(prev => ({ ...prev, selected_pain: text }))}
              colorClass="border-rose-500/30 bg-rose-500/10 text-rose-200 hover:bg-rose-500/25 data-[selected=true]:bg-rose-500/30 data-[selected=true]:border-rose-500"
              textExtractor={(p: any) => typeof p === 'string' ? p : (p?.pain || p?.description || p?.text || '')}
            />
          )}
        </div>

        {/* Deseos */}
        <div className="space-y-2 sm:col-span-2">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            ✨ Deseo Seleccionado
          </Label>
          <Input
            value={formData.selected_desire}
            onChange={(e) => setFormData({ ...formData, selected_desire: e.target.value })}
            placeholder="Escribe o selecciona un deseo de la investigación..."
            className="text-sm"
          />
          {researchDesires.length > 0 && (
            <PainDesireChips
              items={researchDesires}
              selected={formData.selected_desire}
              onSelect={(text) => setFormData(prev => ({ ...prev, selected_desire: text }))}
              colorClass="border-primary/30 bg-primary/10 text-primary-foreground/80 hover:bg-primary/25 data-[selected=true]:bg-primary/30 data-[selected=true]:border-primary"
              textExtractor={(d: any) => typeof d === 'string' ? d : (d?.desire || d?.description || d?.text || '')}
            />
          )}
        </div>

        {/* Objeciones */}
        <div className="space-y-2 sm:col-span-2">
          <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
            🚫 Objeción Seleccionada
          </Label>
          <Input
            value={formData.selected_objection}
            onChange={(e) => setFormData({ ...formData, selected_objection: e.target.value })}
            placeholder="Escribe o selecciona una objeción de la investigación..."
            className="text-sm"
          />
          {researchObjections.length > 0 && (
            <PainDesireChips
              items={researchObjections}
              selected={formData.selected_objection}
              onSelect={(text) => setFormData(prev => ({ ...prev, selected_objection: text }))}
              colorClass="border-orange-500/30 bg-orange-500/10 text-orange-200 hover:bg-orange-500/25 data-[selected=true]:bg-orange-500/30 data-[selected=true]:border-orange-500"
              textExtractor={(o: any) => typeof o === 'string' ? o : (o?.objection || o?.description || o?.text || '')}
            />
          )}
        </div>
      </div>

      {/* Video Strategies */}
      <div className="space-y-1.5 sm:space-y-2 pt-3 sm:pt-4 border-t">
        <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <Video className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Estrategias de Video
        </Label>
        <Textarea
          value={formData.video_strategies}
          onChange={(e) => setFormData({ ...formData, video_strategies: e.target.value })}
          placeholder="Ej: POV, Storytime, ASMR, Unboxing, Tutorial rápido..."
          rows={2}
        />
      </div>

      {/* Reference Transcription */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Transcripción de Referencia <span className="text-muted-foreground font-normal hidden sm:inline">(opcional)</span>
        </Label>
        <Textarea
          value={formData.reference_transcription}
          onChange={(e) => setFormData({ ...formData, reference_transcription: e.target.value })}
          placeholder="Pega aquí la transcripción de un video de referencia..."
          rows={3}
        />
      </div>

      {/* Hooks personalizados */}
      <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t">
        <Label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Hooks Sugeridos <span className="text-muted-foreground font-normal hidden sm:inline">(opcional)</span>
        </Label>
        
        <div className="flex gap-2">
          <Input
            value={newHook}
            onChange={(e) => setNewHook(e.target.value)}
            placeholder="Ej: ¿Sabías que el 80% de las personas...?"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHook())}
            disabled={formData.hooks.length >= parseInt(formData.hooks_count)}
          />
          <Button type="button" onClick={addHook} variant="outline" disabled={formData.hooks.length >= parseInt(formData.hooks_count)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {formData.hooks.length > 0 && (
          <div className="space-y-2">
            {formData.hooks.map((hook, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-sm">
                <Badge variant="outline" className="shrink-0">{idx + 1}</Badge>
                <span className="flex-1 text-sm">{hook}</span>
                <button type="button" onClick={() => removeHook(idx)} className="p-1 hover:bg-destructive/20 rounded">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instrucciones adicionales */}
      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm">Instrucciones adicionales</Label>
        <Textarea
          value={formData.additional_instructions}
          onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
          placeholder="Agrega cualquier indicación especial..."
          rows={2}
        />
      </div>

      {/* Custom Prompts Section */}
      <Collapsible open={promptsOpen} onOpenChange={setPromptsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Personalizar Prompts de IA
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${promptsOpen ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt para Guión</Label>
            <Textarea
              value={formData.script_prompt}
              onChange={(e) => setFormData({ ...formData, script_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">🎥 Prompt para Modo Director</Label>
            <Textarea
              value={formData.director_prompt}
              onChange={(e) => setFormData({ ...formData, director_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">📊 Prompt para Marketing</Label>
            <Textarea
              value={formData.marketing_prompt}
              onChange={(e) => setFormData({ ...formData, marketing_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">📱 Prompt para Captions</Label>
            <Textarea
              value={formData.captions_prompt}
              onChange={(e) => setFormData({ ...formData, captions_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setFormData(prev => ({
              ...prev,
              script_prompt: DEFAULT_PROMPTS.script,
              director_prompt: DEFAULT_PROMPTS.director,
              marketing_prompt: DEFAULT_PROMPTS.marketing,
              captions_prompt: DEFAULT_PROMPTS.captions,
            }))}
          >
            Restaurar prompts por defecto
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Generation Progress */}
      {loading && (
        <div className="space-y-4">
          {/* Skills Loading State */}
          <SkillsLoadingState isGenerating={loading} />

          {/* Blocks Progress */}
          <div className="space-y-1.5 sm:space-y-2 p-2.5 sm:p-4 bg-muted/50 rounded-sm">
            <p className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">Progreso por bloques:</p>
            <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 sm:gap-2">
              {generationSteps.filter((step) => selectedBlocks[step.key]).map((step) => (
                <div key={step.key} className="flex items-center gap-1.5 sm:gap-3">
                  {step.status === "pending" && <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                  {step.status === "generating" && <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary shrink-0" />}
                  {step.status === "done" && <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />}
                  {step.status === "error" && <X className="h-4 w-4 sm:h-5 sm:w-5 text-destructive shrink-0" />}
                  <span className={`text-xs sm:text-sm truncate ${step.status === "generating" ? "text-primary font-medium" : ""}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={loading || insufficientTokens || selectedCount === 0}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generando con IA...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Generar {selectedCount === 6 ? "Todo" : `${selectedCount} bloque${selectedCount !== 1 ? "s" : ""}`} con IA
            <span className="ml-1.5 opacity-75 font-mono text-xs">({totalCost})</span>
          </>
        )}
      </Button>
    </div>
  );
}

// ─── Componente auxiliar: chips de selección para dolor/deseo/objeción ────────

interface PainDesireChipsProps {
  items: unknown[];
  selected: string;
  onSelect: (text: string) => void;
  colorClass: string;
  textExtractor: (item: unknown) => string;
}

function PainDesireChips({ items, selected, onSelect, colorClass, textExtractor }: PainDesireChipsProps) {
  const [showAll, setShowAll] = useState(false);
  const MAX_VISIBLE = 8;
  const texts = items.map(textExtractor).filter(Boolean);
  const visible = showAll ? texts : texts.slice(0, MAX_VISIBLE);

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((text, idx) => {
        const isSelected = selected === text;
        return (
          <button
            key={idx}
            type="button"
            data-selected={isSelected}
            className={`text-[10px] sm:text-xs px-2.5 py-1 rounded-full border transition-all ${colorClass} ${
              isSelected ? 'ring-1 ring-offset-1 ring-offset-background font-semibold' : ''
            }`}
            onClick={() => onSelect(isSelected ? '' : text)}
            title={text}
          >
            <span className="line-clamp-1 max-w-[200px]">{text}</span>
          </button>
        );
      })}
      {texts.length > MAX_VISIBLE && (
        <button
          type="button"
          className="text-[10px] sm:text-xs px-2 py-1 rounded-full border border-muted text-muted-foreground hover:border-foreground/30 transition-colors"
          onClick={() => setShowAll(v => !v)}
        >
          {showAll ? 'Ver menos' : `+${texts.length - MAX_VISIBLE} más`}
        </button>
      )}
    </div>
  );
}
