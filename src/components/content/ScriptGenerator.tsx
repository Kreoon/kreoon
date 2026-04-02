import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationAI } from "@/hooks/useOrganizationAI";
import { NovaInput, NovaTextarea, NovaButton } from "@/components/ui/nova";
import {
  Sparkles,
  Loader2,
  Target,
  Users,
  Globe,
  FileText,
  MessageSquare,
  ListOrdered,
  Plus,
  X,
  Wand2,
  Settings2,
  Video,
  ChevronDown,
  CheckCircle2,
  Bot,
  RefreshCw,
  FileSearch,
  AlertCircle,
  Search,
} from "lucide-react";


import { parseProductResearch, formatResearchForPrompt } from "@/lib/productResearchParser";
import { AIFeedbackWidget } from "@/components/ai/AIFeedbackWidget";

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
}

interface GeneratedContent {
  script: string;
  editor_guidelines?: string;
  strategist_guidelines?: string;
  trafficker_guidelines?: string;
}

interface ScriptGeneratorProps {
  product: Product | null;
  contentId?: string;
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
  target_country: string;
  narrative_structure: string;
  additional_instructions: string;
  hooks: string[];
  script_prompt: string;
  editor_prompt: string;
  strategist_prompt: string;
  trafficker_prompt: string;
  reference_transcription: string;
  video_strategies: string;
  ai_model: string;
}

interface GenerationStep {
  key: "script" | "editor" | "strategist" | "trafficker";
  label: string;
  status: "pending" | "generating" | "done" | "error";
}

// AI Models available via Kreoon AI - no external API key required
const AI_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Recomendado)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro (Avanzado)" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Rápido)" },
  { value: "openai/gpt-5", label: "GPT-5" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini (Rápido)" },
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

const CONTENT_AI_FUNCTION = "content-ai";

const DEFAULT_PROMPTS = {
  script: `Actúa como un estratega digital experto en contenido UGC, storytelling y performance ads.

Tu tarea es crear el **BLOQUE DEL CREADOR** para un video publicitario o contenido orgánico.

IMPORTANTE: Debes entregar el contenido en formato HTML limpio y estructurado, listo para ser usado por creadores de contenido.

### 🧍‍♂️ BLOQUE CREADOR - Entrega:

1. **Título del video**
2. **Objetivo del video**
3. **Duración sugerida**
4. **Formato** (9:16, 1:1, etc.)
5. **Avatar o perfil ideal del público**
6. **Perfil de persona para grabar** (género, tono de voz, energía, entorno, outfit sugerido)
7. **Tono de comunicación** (cercano, tipo chisme, educativo, inspirador)
8. **3 Hooks disruptivos para scroll stopper en formato director (A/B/C)** - potentes para pruebas
9. **Guion formato director** con descripciones visuales y emocionales
10. **Guion para teleprompter** (texto hablado natural, fluido y conversacional)
11. **CTA sugerido** (tanto para orgánico como para ads)

### ⚙️ INSTRUCCIONES:
- Usa tono cercano, tipo conversación o chisme entre amigos.
- Evita lenguaje publicitario forzado.
- Prioriza autenticidad, ritmo natural y storytelling.
- Adáptalo al **tono y estilo de UGC Colombia**: natural, humano, colaborativo y con enfoque en resultados.

### 📋 FORMATO DE ENTREGA (HTML):
Entrega el contenido en HTML estructurado siguiendo este formato exacto:

<h2>Guión para Redes Sociales</h2>

<h3>🎯 HOOKS</h3>
<p><em>[Indicación de tono: Serio, honesto, directo, etc.]</em></p>
<p>"Texto del hook aquí..."</p>

<h3>💬 DESARROLLO</h3>
<p><em>[Indicación de tono: Cercano, empático]</em></p>
<p>Texto del desarrollo aquí con nombre del avatar...</p>

<p><em>[Indicación de tono: Emocionado]</em></p>
<p>Continuación del desarrollo...</p>

<h3>📢 CIERRE / CTA</h3>
<p><em>[Indicación de tono: Inspirador]</em></p>
<p>Texto del cierre con llamada a la acción...</p>

IMPORTANTE:
- Usa etiquetas HTML semánticas: <h2>, <h3>, <p>, <em>, <strong>, <ul>, <li>
- Incluye emojis relevantes en los encabezados (🎯, 💬, 📢, 🎬, etc.)
- Las indicaciones de tono van entre corchetes y en cursiva con <em>
- Los textos hablados van entre comillas
- Mantén el formato limpio y fácil de leer`,

  editor: `Actúa como un editor de video experto en contenido UGC y performance ads.

Basándote en el guión generado, crea el **BLOQUE DEL EDITOR**.

IMPORTANTE: Debes entregar el contenido en formato HTML limpio y estructurado.

### 🎬 BLOQUE EDITOR - Entrega:

1. **Notas de edición** (velocidad, ritmo, estilo de corte, duración por escena)
2. **Storyboard con 4–6 escenas**:
   - Tipo de plano
   - Movimiento de cámara
   - Elementos visuales
   - Emoción transmitida
3. **Música o ambientación sugerida** (género, energía, referencias)
4. **Estilo de subtítulos / animaciones** (tipografía, colores, efectos)
5. **Filtros o color grading** recomendados
6. **Timing de cortes** y momentos clave

### ⚙️ INSTRUCCIONES:
- El ritmo debe ser dinámico para retener atención.
- Prioriza cortes rápidos en los primeros 3 segundos.
- Sugiere efectos que refuercen el mensaje sin distraer.

### 📋 FORMATO DE ENTREGA (HTML):
Entrega el contenido en HTML estructurado siguiendo este formato:

<h2>🎬 Pautas de Edición</h2>

<h3>📝 Notas Generales</h3>
<ul>
  <li><strong>Ritmo:</strong> Descripción del ritmo</li>
  <li><strong>Duración:</strong> XX segundos</li>
  <li><strong>Estilo de corte:</strong> Descripción</li>
</ul>

<h3>🎥 Storyboard</h3>
<h4>Escena 1: Nombre</h4>
<ul>
  <li><strong>Plano:</strong> Tipo de plano</li>
  <li><strong>Cámara:</strong> Movimiento</li>
  <li><strong>Visual:</strong> Elementos</li>
  <li><strong>Emoción:</strong> Sentimiento</li>
</ul>

<h3>🎵 Música y Audio</h3>
<p>Descripción de la música sugerida...</p>

<h3>✨ Efectos y Subtítulos</h3>
<ul>
  <li>Tipografía sugerida</li>
  <li>Colores recomendados</li>
  <li>Efectos de texto</li>
</ul>

IMPORTANTE:
- Usa etiquetas HTML semánticas
- Incluye emojis en encabezados
- Usa listas <ul><li> para elementos enumerados
- Usa <strong> para destacar conceptos clave`,

  strategist: `Actúa como un estratega de contenido digital experto en funnels y growth.

Basándote en el guión, crea el **BLOQUE DEL ESTRATEGA**.

IMPORTANTE: Debes entregar el contenido en formato HTML limpio y estructurado.

### 🧠 BLOQUE ESTRATEGA - Entrega:

1. **Fase del embudo** (Enganche / Solución / Fidelizar / Envolver)
2. **Objetivo estratégico del video**
3. **Hipótesis del mensaje o prueba A/B**
4. **Insight emocional o racional** que se busca activar
5. **Métrica de éxito esperada**
6. **Mejor horario de publicación**
7. **Hashtags recomendados** (10-15 relevantes)
8. **Caption sugerido** para la publicación
9. **Estrategia de engagement** (comentarios fijados, preguntas, stickers)
10. **Sugerencia de contenido complementario** (siguiente video o remarketing)

### ⚙️ INSTRUCCIONES:
- Si es Fase de Enganche → genera confianza y valor.
- Si es Fase de Solución → lleva al clic, venta o diagnóstico.
- Si es Fase de Fidelizar → crea comunidad o validación social.
- Si es Fase de Envolver → reimpacta y recuerda beneficios.

### 📋 FORMATO DE ENTREGA (HTML):
Entrega el contenido en HTML estructurado siguiendo este formato:

<h2>🧠 Estrategia de Publicación</h2>

<h3>📊 Análisis del Embudo</h3>
<p><strong>Fase:</strong> Nombre de la fase</p>
<p><strong>Objetivo:</strong> Descripción del objetivo</p>

<h3>🎯 Hipótesis y Testing</h3>
<p>Descripción de la hipótesis A/B...</p>

<h3>💡 Insight Principal</h3>
<p><em>Insight emocional o racional a activar...</em></p>

<h3>📅 Publicación</h3>
<ul>
  <li><strong>Mejor horario:</strong> Día y hora</li>
  <li><strong>Métrica clave:</strong> KPI esperado</li>
</ul>

<h3>#️⃣ Hashtags</h3>
<p>#hashtag1 #hashtag2 #hashtag3...</p>

<h3>📝 Caption Sugerido</h3>
<p>Texto del caption con emojis...</p>

<h3>💬 Estrategia de Engagement</h3>
<ul>
  <li>Comentario fijado sugerido</li>
  <li>Preguntas para generar interacción</li>
</ul>

IMPORTANTE:
- Usa etiquetas HTML semánticas
- Incluye emojis relevantes
- Los hashtags van juntos en un párrafo
- El caption debe ser copiable directamente`,

  trafficker: `Actúa como un trafficker/media buyer experto en performance ads y conversiones.

Basándote en el guión, crea el **BLOQUE DEL TRAFFICKER**.

IMPORTANTE: Debes entregar el contenido en formato HTML limpio y estructurado.

### 💰 BLOQUE TRAFFICKER - Entrega:

1. **Ángulo de venta principal** (emocional, educativo, aspiracional, prueba social)
2. **Objetivo de campaña** (clics, leads, awareness, engagement, conversión)
3. **Público objetivo y segmentación sugerida**:
   - Intereses
   - Comportamientos
   - Demografía
   - Lookalikes sugeridos
4. **Formato de anuncio recomendado** (story, reels, feed, TikTok)
5. **CTA publicitario principal**
6. **3 variaciones de anuncio (Hook + copy corto)** para testing
7. **4 variaciones de copy largo para ads**:
   - Versión emocional
   - Versión educativa
   - Versión storytelling
   - Versión directa
8. **KPIs a medir** (CTR, CPL, ROAS, retención de video, CPM)
9. **Presupuesto sugerido** para pruebas iniciales

### ⚙️ INSTRUCCIONES:
- Prioriza copies que generen curiosidad y urgencia.
- Los hooks deben ser disruptivos y scroll-stopping.
- Incluye emojis estratégicos en los copies.

### 📋 FORMATO DE ENTREGA (HTML):
Entrega el contenido en HTML estructurado siguiendo este formato:

<h2>💰 Pautas de Pauta Publicitaria</h2>

<h3>🎯 Estrategia de Campaña</h3>
<ul>
  <li><strong>Ángulo:</strong> Tipo de ángulo</li>
  <li><strong>Objetivo:</strong> Objetivo de campaña</li>
  <li><strong>Formato:</strong> Formato recomendado</li>
</ul>

<h3>👥 Segmentación</h3>
<h4>Intereses</h4>
<ul>
  <li>Interés 1</li>
  <li>Interés 2</li>
</ul>
<h4>Demografía</h4>
<p>Edad, género, ubicación...</p>

<h3>📢 CTA Principal</h3>
<p><strong>"Texto del CTA aquí"</strong></p>

<h3>🔥 Variaciones de Anuncio</h3>
<h4>Versión A</h4>
<p><strong>Hook:</strong> "Texto del hook"</p>
<p><strong>Copy:</strong> Texto del copy...</p>

<h4>Versión B</h4>
<p><strong>Hook:</strong> "Texto del hook"</p>
<p><strong>Copy:</strong> Texto del copy...</p>

<h3>📊 KPIs y Presupuesto</h3>
<ul>
  <li><strong>CTR esperado:</strong> X%</li>
  <li><strong>CPL objetivo:</strong> $X</li>
  <li><strong>Presupuesto inicial:</strong> $X/día</li>
</ul>

IMPORTANTE:
- Usa etiquetas HTML semánticas
- Los copies deben ser copiables directamente
- Incluye emojis estratégicos
- Formatea las variaciones claramente`,
};

export function ScriptGenerator({ product, contentId, onScriptGenerated, organizationId: propOrgId, spherePhase }: ScriptGeneratorProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const organizationId = propOrgId || profile?.current_organization_id;
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [newHook, setNewHook] = useState("");
  const [promptsOpen, setPromptsOpen] = useState(false);
  
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
  const [lastExecutionId, setLastExecutionId] = useState<string | null>(null);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);
  const [usePerplexity, setUsePerplexity] = useState(false);
  const [perplexityQueries, setPerplexityQueries] = useState({
    trends: true,
    hooks: true,
    competitors: false,
    audience: false,
  });
  const [customPerplexityQuery, setCustomPerplexityQuery] = useState("");

  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { key: "script", label: "Guión", status: "pending" },
    { key: "editor", label: "Pautas Editor", status: "pending" },
    { key: "strategist", label: "Pautas Estratega", status: "pending" },
    { key: "trafficker", label: "Pautas Trafficker", status: "pending" },
  ]);

  const [formData, setFormData] = useState<ScriptFormData>({
    cta: "",
    sales_angle: "",
    hooks_count: "3",
    ideal_avatar: "",
    target_country: "",
    narrative_structure: "",
    additional_instructions: "",
    hooks: [],
    script_prompt: DEFAULT_PROMPTS.script,
    editor_prompt: DEFAULT_PROMPTS.editor,
    strategist_prompt: DEFAULT_PROMPTS.strategist,
    trafficker_prompt: DEFAULT_PROMPTS.trafficker,
    reference_transcription: "",
    video_strategies: "",
    ai_model: "google/gemini-3-flash-preview",
  });

  // Pre-fill avatar from product if available
  useEffect(() => {
    if (product?.ideal_avatar && typeof product.ideal_avatar === 'string') {
      const strippedAvatar = product.ideal_avatar.replace(/<[^>]*>/g, "").substring(0, 200);
      setFormData((prev) => ({
        ...prev,
        ideal_avatar: strippedAvatar,
      }));
    }
  }, [product]);

  // Cargar la investigación COMPLETA del producto (avatar_profiles + sales_angles_data)
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
          .select("id, avatar_profiles, sales_angles_data, market_research, sales_angles, ideal_avatar")
          .eq("id", product.id)
          .maybeSingle();

        if (error) throw error;
        
        // Parse JSON strings if needed
        const normalized = (() => {
          if (!data) return null;
          const result = { ...(data as any) };
          
          // Parse market_research if it's a string
          if (typeof result.market_research === "string") {
            try { result.market_research = JSON.parse(result.market_research); } catch {}
          }
          
          // Parse sales_angles_data if it's a string
          if (typeof result.sales_angles_data === "string") {
            try { result.sales_angles_data = JSON.parse(result.sales_angles_data); } catch {}
          }
          
          // Parse avatar_profiles if it's a string
          if (typeof result.avatar_profiles === "string") {
            try { result.avatar_profiles = JSON.parse(result.avatar_profiles); } catch {}
          }
          
          return result;
        })();
        
        if (!cancelled) setResearchProduct(normalized);
      } catch (e) {
        console.error("[ScriptGenerator] Error fetching product research", e);
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
    return Array.isArray(profiles) ? profiles : [];
  }, [researchProduct]);

  const researchAngles = useMemo(() => {
    const angles = researchProduct?.sales_angles_data?.angles;
    if (Array.isArray(angles)) return angles;

    // fallback (si algún producto guarda ángulos como array simple)
    if (Array.isArray(product?.sales_angles) && product?.sales_angles?.length) {
      return product.sales_angles.map((a) => ({ angle: a }));
    }

    return [];
  }, [researchProduct, product?.sales_angles]);

  // Auto-fill sales_angle and narrative_structure from research when available
  useEffect(() => {
    if (!researchProduct) return;
    
    setFormData(prev => {
      const updates: Partial<typeof prev> = {};
      
      // Auto-fill first sales angle if empty
      if (!prev.sales_angle) {
        const angles = researchProduct?.sales_angles_data?.angles;
        if (Array.isArray(angles) && angles.length > 0) {
          const firstAngle = angles[0];
          const angleText = firstAngle?.angle || firstAngle?.salesAngle || firstAngle?.name || "";
          if (angleText) updates.sales_angle = angleText;
        }
      }
      
      // Auto-fill narrative structure if empty
      if (!prev.narrative_structure) {
        const angles = researchProduct?.sales_angles_data?.angles;
        if (Array.isArray(angles) && angles.length > 0) {
          const type = (angles[0]?.type || "").toLowerCase();
          if (type.includes("problema") || type.includes("dolor")) updates.narrative_structure = "problema-solucion";
          else if (type.includes("transform")) updates.narrative_structure = "antes-despues";
          else if (type.includes("testimon")) updates.narrative_structure = "testimonio";
          else updates.narrative_structure = "problema-solucion";
        }
      }
      
      // Auto-suggest CTA if empty
      if (!prev.cta) {
        const puv = researchProduct?.sales_angles_data?.puv;
        if (puv?.tangibleResult) updates.cta = "Descubre cómo lograrlo";
      }
      
      if (Object.keys(updates).length === 0) return prev;
      return { ...prev, ...updates };
    });
  }, [researchProduct]);

  const formatAvatarForField = (a: any, index: number) => {
    const name = a?.name || a?.avatarName || `Avatar ${index + 1}`;
    const situation = a?.situation || a?.currentSituation || "";
    const awareness = a?.awarenessLevel || a?.awareness || "";
    const drivers = Array.isArray(a?.drivers)
      ? a.drivers.join(", ")
      : a?.drivers || a?.emotionalDrivers || "";
    const objections = Array.isArray(a?.objections)
      ? a.objections.join(", ")
      : a?.objections || a?.mainObjections || "";
    const phrases = Array.isArray(a?.phrases) ? a.phrases : Array.isArray(a?.typicalPhrases) ? a.typicalPhrases : [];

    return [
      `AVATAR: ${name}`,
      situation ? `SITUACIÓN: ${situation}` : "",
      awareness ? `NIVEL DE CONSCIENCIA: ${awareness}` : "",
      drivers ? `DRIVERS: ${drivers}` : "",
      objections ? `OBJECIONES: ${objections}` : "",
      phrases?.length ? `FRASES TEXTUALES: ${phrases.join(" | ")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  };
  // Fetch document from URL - returns { content, warning }
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

  // Load all product documents
  const loadProductDocuments = async () => {
    if (!product) return;

    setLoadingDocs(true);
    const warnings: string[] = [];
    
    try {
      const [briefResult, onboardingResult, researchResult] = await Promise.all([
        product.brief_url ? fetchDocument(product.brief_url) : Promise.resolve({ content: "", warning: undefined }),
        product.onboarding_url ? fetchDocument(product.onboarding_url) : Promise.resolve({ content: "", warning: undefined }),
        product.research_url ? fetchDocument(product.research_url) : Promise.resolve({ content: "", warning: undefined }),
      ]);

      // Collect warnings
      if (product.brief_url && briefResult.warning) warnings.push(`Brief: ${briefResult.warning}`);
      if (product.onboarding_url && onboardingResult.warning) warnings.push(`Onboarding: ${onboardingResult.warning}`);
      if (product.research_url && researchResult.warning) warnings.push(`Research: ${researchResult.warning}`);

      setDocumentContent({
        brief: briefResult.content,
        onboarding: onboardingResult.content,
        research: researchResult.content,
      });
      setDocsLoaded(true);

      const loadedCount = [briefResult.content, onboardingResult.content, researchResult.content].filter(c => c.length > 0).length;
      const totalDocs = [product.brief_url, product.onboarding_url, product.research_url].filter(Boolean).length;
      
      if (warnings.length > 0) {
        toast({
          title: `${loadedCount}/${totalDocs} documentos cargados`,
          description: warnings.join(". "),
          variant: loadedCount === 0 ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Documentos cargados",
          description: `Se cargaron ${loadedCount} documento(s) exitosamente`,
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

  // Generate optimized prompts with AI
  const generateOptimizedPrompts = async () => {
    if (!product) return;

    setLoadingPrompts(true);
    try {
      const contextInfo = `
INFORMACIÓN DEL PRODUCTO:
- Nombre: ${product.name}
- Descripción: ${product.description || "No disponible"}
- Estrategia: ${product.strategy || "No disponible"}
- Investigación de mercado: ${product.market_research || "No disponible"}
- Avatar ideal: ${product.ideal_avatar || "No disponible"}
- Ángulos de venta: ${product.sales_angles?.join(", ") || "No definidos"}

${documentContent.brief ? `BRIEF DEL CLIENTE:\n${documentContent.brief.substring(0, 2000)}` : ""}

${documentContent.onboarding ? `ONBOARDING:\n${documentContent.onboarding.substring(0, 2000)}` : ""}

${documentContent.research ? `INVESTIGACIÓN:\n${documentContent.research.substring(0, 2000)}` : ""}
`;

      const promptGenerationRequest = `
Basándote en la siguiente información del producto y cliente, genera 4 prompts optimizados y específicos para generar contenido de alta calidad.

${contextInfo}

Genera prompts específicos para:
1. GUIÓN: Un prompt detallado para generar guiones de video que conecten con el avatar ideal y usen los ángulos de venta del producto
2. PAUTAS EDITOR: Un prompt para generar pautas de edición que reflejen la identidad visual del cliente
3. PAUTAS ESTRATEGA: Un prompt para estrategia de publicación optimizada para el público objetivo
4. PAUTAS TRAFFICKER: Un prompt para campañas de publicidad pagada que maximicen conversiones

Responde SOLO en formato JSON con esta estructura exacta:
{
  "script_prompt": "...",
  "editor_prompt": "...",
  "strategist_prompt": "...",
  "trafficker_prompt": "..."
}
`;

      const { data, error } = await supabase.functions.invoke(CONTENT_AI_FUNCTION, {
        body: {
          action: "generate_script",
          organizationId,
          prompt: promptGenerationRequest,
          product: { id: product.id, name: product.name },
          ai_provider: "kreoon",
          ai_model: formData.ai_model,
        },
      });

      if (error) throw new Error(error.message);

      // Handle MODULE_INACTIVE error
      if (data?.error === 'MODULE_INACTIVE') {
        toast({ 
          title: "Asistente no habilitado", 
          description: data?.message || "El módulo de asistencia IA 'Generación de Guiones' no está activado. Un administrador debe habilitarlo en Configuración → IA & Modelos.",
          variant: "destructive" 
        });
        return;
      }

      const responseText = data?.script || data?.result || "";
      
      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedPrompts = JSON.parse(jsonMatch[0]);
        setFormData(prev => ({
          ...prev,
          script_prompt: parsedPrompts.script_prompt || prev.script_prompt,
          editor_prompt: parsedPrompts.editor_prompt || prev.editor_prompt,
          strategist_prompt: parsedPrompts.strategist_prompt || prev.strategist_prompt,
          trafficker_prompt: parsedPrompts.trafficker_prompt || prev.trafficker_prompt,
        }));
        setPromptsOpen(true);
        toast({
          title: "Prompts generados",
          description: "Se han creado prompts optimizados basados en la información del producto",
        });
      } else {
        throw new Error("No se pudo parsear la respuesta de la IA");
      }
    } catch (error) {
      console.error("Error generating prompts:", error);
      toast({
        title: "Error al generar prompts",
        description: error instanceof Error ? error.message : "No se pudieron generar los prompts",
        variant: "destructive",
      });
    } finally {
      setLoadingPrompts(false);
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
      { key: "script", label: "Guión", status: "pending" },
      { key: "editor", label: "Pautas Editor", status: "pending" },
      { key: "strategist", label: "Pautas Estratega", status: "pending" },
      { key: "trafficker", label: "Pautas Trafficker", status: "pending" },
    ]);
  };

  const buildBaseContext = () => {
    const narrativeLabel = NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label || formData.narrative_structure;
    
    // Determine sphere phase info
    const sphereInfo = spherePhase ? getSpherePhaseInfo(spherePhase) : null;
    
    // Get business type
    const businessType = (product?.business_type as 'product_service' | 'personal_brand') || 'product_service';
    const isPersonalBrand = businessType === 'personal_brand';
    
    // Parse structured research data
    const researchData = product ? parseProductResearch({
      market_research: product.market_research,
      avatar_profiles: product.avatar_profiles,
      sales_angles: product.sales_angles,
      sales_angles_data: product.sales_angles_data,
      competitor_analysis: product.competitor_analysis,
      brief_data: product.brief_data,
    }) : null;
    
    // Format research for prompt
    const formattedResearch = researchData 
      ? formatResearchForPrompt(researchData, businessType)
      : '';
    
    let context = `${isPersonalBrand ? '🎯 MARCA PERSONAL' : '📦 PRODUCTO/SERVICIO'}: ${product?.name}
DESCRIPCIÓN: ${product?.description || 'No disponible'}
CTA: ${formData.cta}
ÁNGULO DE VENTA: ${formData.sales_angle}
ESTRUCTURA NARRATIVA: ${narrativeLabel}
PAÍS OBJETIVO: ${formData.target_country}
AVATAR/CLIENTE IDEAL: ${formData.ideal_avatar}

${isPersonalBrand ? `⚠️ IMPORTANTE - MARCA PERSONAL:
- El dueño de la marca será quien grabe el contenido (NO un creador externo)
- Los guiones deben estar en PRIMERA PERSONA ("Yo te enseño", "Mi método", etc.)
- El tono debe ser personal, auténtico y cercano
- Incluir referencias a la experiencia y trayectoria personal

` : ''}${sphereInfo ? `FASE DEL MÉTODO ESFERA: ${sphereInfo.label}
OBJETIVO DE FASE: ${sphereInfo.objective}
TIPO DE AUDIENCIA: ${sphereInfo.audience}
TONO RECOMENDADO: ${sphereInfo.tone}

` : ''}ESTRATEGIA DEL PRODUCTO:
${product?.strategy || 'No disponible'}

${formattedResearch ? `=== INVESTIGACIÓN DE MERCADO DETALLADA ===
${formattedResearch}

` : `INVESTIGACIÓN DE MERCADO:
${product?.market_research || 'No disponible'}

`}ÁNGULOS DE VENTA DISPONIBLES:
${product?.sales_angles?.join(', ') || 'No definidos'}

HOOKS SUGERIDOS:
${formData.hooks.length > 0 ? formData.hooks.map((h, i) => `${i + 1}. ${h}`).join('\n') : 'Generar automáticamente'}`;

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
    type: "script" | "editor" | "strategist" | "trafficker",
    customPrompt: string,
    previousScript?: string
  ): Promise<{ script: string; executionId?: string }> => {
    const baseContext = buildBaseContext();
    
    let fullPrompt = `${customPrompt}\n\n---\nCONTEXTO:\n${baseContext}`;
    
    if (previousScript && type !== "script") {
      fullPrompt += `\n\n---\nGUIÓN GENERADO:\n${previousScript}`;
    }

    const { data, error } = await supabase.functions.invoke(CONTENT_AI_FUNCTION, {
      body: {
        action: "generate_script",
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
        script_params: {
          sales_angle: formData.sales_angle,
          target_country: formData.target_country,
          ideal_avatar: formData.ideal_avatar,
          platform: "TikTok",
          product_category: product?.name,
        },
        use_perplexity: usePerplexity,
        perplexity_queries: usePerplexity ? perplexityQueries : undefined,
        custom_perplexity_query: usePerplexity && customPerplexityQuery.trim() ? customPerplexityQuery.trim() : undefined,
        generation_type: type,
        ai_provider: "kreoon",
        ai_model: formData.ai_model,
      },
    });

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Respuesta vacía de la IA");
    
    // Handle MODULE_INACTIVE error
    if (data.error === 'MODULE_INACTIVE') {
      throw new Error(data.message || "El módulo de IA 'Generación de Guiones' no está activado. Un administrador debe habilitarlo en Configuración → IA & Modelos.");
    }
    
    if (data.error) throw new Error(data.error);

    return {
      script: data.script || data.result || "",
      executionId: data.execution_id,
    };
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

    setLoading(true);
    setFeedbackDismissed(false);
    resetSteps();

    const generatedContent: GeneratedContent = {
      script: "",
      editor_guidelines: "",
      strategist_guidelines: "",
      trafficker_guidelines: "",
    };

    const emitProgress = (patch: Partial<GeneratedContent>) => {
      console.log("[ScriptGenerator] emitProgress", {
        script: patch.script?.length,
        editor: patch.editor_guidelines?.length,
        strategist: patch.strategist_guidelines?.length,
        trafficker: patch.trafficker_guidelines?.length,
      });
      onScriptGenerated({ ...generatedContent, ...patch });
    };

    try {
      let lastExecutionIdFromRun: string | undefined;
      // Step 1: Generate Script
      updateStepStatus("script", "generating");
      const scriptResult = await generateContent("script", formData.script_prompt);
      generatedContent.script = scriptResult.script;
      lastExecutionIdFromRun = scriptResult.executionId;
      updateStepStatus("script", "done");
      emitProgress({ script: generatedContent.script });

      // Step 2: Generate Editor Guidelines
      updateStepStatus("editor", "generating");
      const editorResult = await generateContent("editor", formData.editor_prompt, generatedContent.script);
      generatedContent.editor_guidelines = editorResult.script;
      lastExecutionIdFromRun = editorResult.executionId ?? lastExecutionIdFromRun;
      updateStepStatus("editor", "done");
      emitProgress({ editor_guidelines: generatedContent.editor_guidelines });

      // Step 3: Generate Strategist Guidelines
      updateStepStatus("strategist", "generating");
      const strategistResult = await generateContent("strategist", formData.strategist_prompt, generatedContent.script);
      generatedContent.strategist_guidelines = strategistResult.script;
      lastExecutionIdFromRun = strategistResult.executionId ?? lastExecutionIdFromRun;
      updateStepStatus("strategist", "done");
      emitProgress({ strategist_guidelines: generatedContent.strategist_guidelines });

      // Step 4: Generate Trafficker Guidelines
      updateStepStatus("trafficker", "generating");
      const traffickerResult = await generateContent("trafficker", formData.trafficker_prompt, generatedContent.script);
      generatedContent.trafficker_guidelines = traffickerResult.script;
      lastExecutionIdFromRun = traffickerResult.executionId ?? lastExecutionIdFromRun;
      updateStepStatus("trafficker", "done");
      emitProgress({ trafficker_guidelines: generatedContent.trafficker_guidelines });

      if (lastExecutionIdFromRun) setLastExecutionId(lastExecutionIdFromRun);
      toast({
        title: "Contenido generado exitosamente",
        description: `Guión y pautas generados con IA`,
      });
    } catch (error) {
      console.error("Error:", error);
      const currentStep = generationSteps.find(s => s.status === "generating");
      if (currentStep) {
        updateStepStatus(currentStep.key, "error");
      }
      toast({
        title: "Error al generar",
        description: error instanceof Error ? error.message : "No se pudo completar la generación",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!product) {
    return (
      <div className="p-6 border rounded-sm bg-muted/50 text-center">
        <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Selecciona un producto para poder crear el brief del guión
        </p>
      </div>
    );
  }

  const hasDocumentUrls = product.brief_url || product.onboarding_url || product.research_url;

  return (
    <div className="space-y-6 p-6 border border-[var(--nova-border-subtle)] rounded-sm bg-gradient-to-br from-[var(--nova-accent-primary)]/5 to-[var(--nova-accent-secondary)]/10">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2 text-lg text-[var(--nova-text-bright)]">
          <Wand2 className="h-5 w-5 text-[var(--nova-accent-primary)]" />
          Formulario de Guion
        </h4>
        <Badge variant="secondary" className="text-xs bg-[var(--nova-accent-primary)]/10 text-[var(--nova-accent-primary)] border-[var(--nova-accent-primary)]/20">
          {AI_MODELS.find(m => m.value === formData.ai_model)?.label || "IA"}
        </Badge>
      </div>

      {/* Document Loading Section */}
      {hasDocumentUrls && (
        <div className="p-4 rounded-sm bg-[var(--nova-bg-elevated)]/50 border border-[var(--nova-border-subtle)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-[var(--nova-accent-primary)]" />
              <Label className="text-sm font-medium text-[var(--nova-text-primary)]">Documentos del Producto</Label>
            </div>
            <div className="flex items-center gap-2">
              {docsLoaded && (
                <Badge variant="outline" className="text-xs text-[var(--nova-success)] border-[var(--nova-success)]">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Cargados
                </Badge>
              )}
              <NovaButton
                variant="outline"
                size="sm"
                onClick={loadProductDocuments}
                disabled={loadingDocs}
              >
                {loadingDocs ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">{docsLoaded ? "Recargar" : "Cargar Docs"}</span>
              </NovaButton>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
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

      {/* AI Provider Selection */}
      <div className="p-4 rounded-sm bg-[var(--nova-bg-elevated)]/50 border border-[var(--nova-border-subtle)] space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[var(--nova-accent-primary)]" />
          <Label className="text-sm font-medium text-[var(--nova-text-primary)]">Modelo IA</Label>
        </div>
        
        <Select 
          value={formData.ai_model} 
          onValueChange={(v) => setFormData({ ...formData, ai_model: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar modelo" />
          </SelectTrigger>
          <SelectContent>
            {AI_MODELS.map((model) => (
              <SelectItem key={model.value} value={model.value}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CTA */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-[var(--nova-text-primary)]">
            <Target className="h-4 w-4 text-[var(--nova-accent-primary)]" /> CTA (Llamado a la accion) *
          </Label>
          <NovaInput
            value={formData.cta}
            onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
            placeholder="Ej: Haz clic en el link de la bio"
          />
        </div>

        {/* Angulo de Venta */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-[var(--nova-text-primary)]">
            <Sparkles className="h-4 w-4 text-[var(--nova-accent-primary)]" /> Angulo de Venta *
          </Label>

          <Accordion type="single" collapsible className="border rounded-sm">
            {researchAngles.length > 0 ? (
              researchAngles.map((a: any, idx: number) => {
                const angleText = a?.angle || a?.salesAngle || a?.name || "";
                if (!angleText) return null;

                const type = a?.type || a?.category;
                const avatar = a?.avatar || a?.targetAvatar;
                const emotion = a?.emotion || a?.primaryEmotion;
                const hookExample = a?.hookExample;

                return (
                  <AccordionItem key={idx} value={`angle-${idx}`} className="px-3">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex flex-1 items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{angleText}</span>
                        {type && (
                          <Badge variant="outline" className="text-xs">
                            {type}
                          </Badge>
                        )}
                        {emotion && (
                          <Badge variant="secondary" className="text-xs">
                            {emotion}
                          </Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {(avatar || a?.contentType) && (
                          <p className="text-xs text-muted-foreground">
                            {avatar ? `Avatar: ${avatar}` : ""}
                            {avatar && a?.contentType ? " • " : ""}
                            {a?.contentType ? `Formato: ${a.contentType}` : ""}
                          </p>
                        )}
                        {hookExample && (
                          <p className="text-xs text-muted-foreground">Hook ejemplo: {hookExample}</p>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setFormData((prev) => ({ ...prev, sales_angle: angleText }))}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Usar este ángulo
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })
            ) : (
              <AccordionItem value="angle-empty" className="px-3">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <span className="text-sm text-muted-foreground">Ángulos de venta</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    No se encontraron ángulos en la investigación de este producto.
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>

        {/* Numero de Hooks */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-[var(--nova-text-primary)]">
            <ListOrdered className="h-4 w-4 text-[var(--nova-accent-primary)]" /> Cantidad de Hooks
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

        {/* Pais Objetivo */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-[var(--nova-text-primary)]">
            <Globe className="h-4 w-4 text-[var(--nova-accent-primary)]" /> Pais Objetivo
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

        {/* Estructura Narrativa */}
        <div className="space-y-2 md:col-span-2">
          <Label className="flex items-center gap-2 text-[var(--nova-text-primary)]">
            <MessageSquare className="h-4 w-4 text-[var(--nova-accent-primary)]" /> Estructura Narrativa *
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
        <div className="space-y-2 md:col-span-2">
          <Label className="flex items-center gap-2 text-[var(--nova-text-primary)]">
            <Users className="h-4 w-4 text-[var(--nova-accent-primary)]" /> Avatar / Cliente Ideal
          </Label>
          <NovaTextarea
            value={formData.ideal_avatar}
            onChange={(e) => setFormData({ ...formData, ideal_avatar: e.target.value })}
            placeholder="Describe al cliente ideal..."
            className="min-h-[60px]"
          />

          {/* Selector SIEMPRE visible (aunque esté vacío) */}
          <Accordion type="single" collapsible className="border rounded-sm">
            {researchAvatars.length > 0 ? (
              researchAvatars.map((a: any, idx: number) => {
                const name = a?.name || a?.avatarName || `Avatar ${idx + 1}`;
                const situation = a?.situation || a?.currentSituation || "";
                const awareness = a?.awarenessLevel || a?.awareness || "";

                return (
                  <AccordionItem key={idx} value={`avatar-${idx}`} className="px-3">
                    <AccordionTrigger className="py-3 hover:no-underline">
                      <div className="flex flex-1 items-center justify-between gap-3">
                        <span className="text-sm font-medium">{name}</span>
                        {awareness ? (
                          <Badge variant="secondary" className="text-xs">
                            {String(awareness).slice(0, 28)}
                          </Badge>
                        ) : null}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2">
                        {(situation || awareness) && (
                          <p className="text-sm text-muted-foreground">{situation || awareness}</p>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            const formatted = formatAvatarForField(a, idx);
                            setFormData((prev) => ({ ...prev, ideal_avatar: formatted }));
                          }}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Usar este avatar
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })
            ) : (
              <AccordionItem value="avatar-empty" className="px-3">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <span className="text-sm text-muted-foreground">Avatares</span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-muted-foreground">
                    No se encontraron avatares en la investigación de este producto.
                  </p>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      </div>

      {/* Video Strategies */}
      <div className="space-y-2 pt-4 border-t">
        <Label className="flex items-center gap-2">
          <Video className="h-4 w-4" /> Estrategias / Estructuras de Video
        </Label>
        <Textarea
          value={formData.video_strategies}
          onChange={(e) => setFormData({ ...formData, video_strategies: e.target.value })}
          placeholder="Ej: POV, Storytime, ASMR, Unboxing, Tutorial rápido..."
          rows={2}
        />
      </div>

      {/* Reference Transcription */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <FileText className="h-4 w-4" /> Transcripción Video de Referencia (opcional)
        </Label>
        <Textarea
          value={formData.reference_transcription}
          onChange={(e) => setFormData({ ...formData, reference_transcription: e.target.value })}
          placeholder="Pega aquí la transcripción de un video de referencia..."
          rows={3}
        />
      </div>

      {/* Hooks personalizados */}
      <div className="space-y-3 pt-4 border-t">
        <Label className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" /> Hooks Sugeridos (opcional)
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
      <div className="space-y-2">
        <Label>Instrucciones adicionales</Label>
        <Textarea
          value={formData.additional_instructions}
          onChange={(e) => setFormData({ ...formData, additional_instructions: e.target.value })}
          placeholder="Agrega cualquier indicación especial..."
          rows={2}
        />
      </div>

      {/* Toggle de Perplexity */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-sm border border-purple-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-sm">
              <Search className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="font-medium">Investigación en tiempo real</p>
              <p className="text-sm text-muted-foreground">
                Usa Perplexity para buscar tendencias y hooks actuales
              </p>
            </div>
          </div>
          <Switch checked={usePerplexity} onCheckedChange={setUsePerplexity} />
        </div>

        {usePerplexity && (
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

      {/* Custom Prompts Section */}
      <Collapsible open={promptsOpen} onOpenChange={setPromptsOpen}>
        <div className="flex gap-2">
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="flex-1 justify-between">
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Personalizar Prompts de IA
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${promptsOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <Button
            variant="secondary"
            onClick={generateOptimizedPrompts}
            disabled={loadingPrompts}
            title="Generar prompts optimizados con IA"
          >
            {loadingPrompts ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Generar Prompts con IA</span>
          </Button>
        </div>
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
            <Label className="text-sm font-medium">Prompt para Pautas del Editor</Label>
            <Textarea
              value={formData.editor_prompt}
              onChange={(e) => setFormData({ ...formData, editor_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt para Pautas del Estratega</Label>
            <Textarea
              value={formData.strategist_prompt}
              onChange={(e) => setFormData({ ...formData, strategist_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Prompt para Pautas del Trafficker</Label>
            <Textarea
              value={formData.trafficker_prompt}
              onChange={(e) => setFormData({ ...formData, trafficker_prompt: e.target.value })}
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
              editor_prompt: DEFAULT_PROMPTS.editor,
              strategist_prompt: DEFAULT_PROMPTS.strategist,
              trafficker_prompt: DEFAULT_PROMPTS.trafficker,
            }))}
          >
            Restaurar prompts por defecto
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Generation Progress */}
      {loading && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-sm">
          <p className="text-sm font-medium mb-3">Progreso (IA):</p>
          {generationSteps.map((step) => (
            <div key={step.key} className="flex items-center gap-3">
              {step.status === "pending" && <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30" />}
              {step.status === "generating" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
              {step.status === "done" && <CheckCircle2 className="h-5 w-5 text-green-500" />}
              {step.status === "error" && <X className="h-5 w-5 text-destructive" />}
              <span className={`text-sm ${step.status === "generating" ? "text-primary font-medium" : ""}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Generate Button */}
      <Button onClick={handleGenerate} disabled={loading} className="w-full" size="lg">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Generando con IA...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Generar Todo con IA
          </>
        )}
      </Button>

      {lastExecutionId && !feedbackDismissed && (
        <div className="mt-4">
          <AIFeedbackWidget
            executionId={lastExecutionId}
            onClose={() => setFeedbackDismissed(true)}
          />
        </div>
      )}
    </div>
  );
}
