import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  Sparkles, Loader2, Target, Users, Globe, FileText, 
  MessageSquare, ListOrdered, Plus, X, Wand2, Settings2,
  Video, ChevronDown, CheckCircle2, Bot, RefreshCw, FileSearch
} from "lucide-react";

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
}

interface GeneratedContent {
  script: string;
  editor_guidelines?: string;
  strategist_guidelines?: string;
  trafficker_guidelines?: string;
  designer_guidelines?: string;
  admin_guidelines?: string;
}

interface StrategistScriptFormProps {
  product: Product | null;
  contentId: string;
  onScriptGenerated: (content: GeneratedContent) => void;
  organizationId?: string;
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
  designer_prompt: string;
  admin_prompt: string;
  reference_transcription: string;
  video_strategies: string;
  ai_provider: "lovable" | "openai" | "anthropic";
  ai_model: string;
}

interface GenerationStep {
  key: "script" | "editor" | "strategist" | "trafficker" | "designer" | "admin";
  label: string;
  status: "pending" | "generating" | "done" | "error";
}

const AI_PROVIDERS = [
  { 
    value: "lovable", 
    label: "Lovable AI", 
    description: "Google Gemini & OpenAI GPT-5",
    models: [
      { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (Recomendado)" },
      { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite (Rápido)" },
      { value: "openai/gpt-5", label: "GPT-5" },
      { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
    ]
  },
  { 
    value: "openai", 
    label: "OpenAI GPT", 
    description: "Requiere API Key",
    models: [
      { value: "gpt-4o", label: "GPT-4o (Recomendado)" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini (Rápido)" },
      { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
      { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Económico)" },
    ]
  },
  { 
    value: "anthropic", 
    label: "Anthropic Claude", 
    description: "Requiere API Key",
    models: [
      { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (Recomendado)" },
      { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku (Rápido)" },
    ]
  },
];

const NARRATIVE_STRUCTURES = [
  { value: "problema-solucion", label: "Problema → Solución" },
  { value: "historia-personal", label: "Historia Personal" },
  { value: "antes-despues", label: "Antes/Después" },
  { value: "tutorial", label: "Tutorial paso a paso" },
  { value: "testimonio", label: "Testimonio" },
  { value: "urgencia", label: "Urgencia/Escasez" },
  { value: "educativo", label: "Educativo/Informativo" },
  { value: "entretenimiento", label: "Entretenimiento" },
];

const COUNTRIES = [
  "México", "Colombia", "Argentina", "España", "Chile", "Perú", "Estados Unidos (Latino)", "Otro",
];

const CONTENT_AI_FUNCTION = "content-ai";

const DEFAULT_PROMPTS = {
  script: `🎬 ROL: Eres un GUIONISTA EXPERTO en contenido viral para redes sociales (TikTok, Reels, Shorts).

Tu especialidad es crear guiones que capturan atención en los primeros 3 segundos y mantienen al espectador enganchado hasta el CTA final.

---
📦 INFORMACIÓN DEL PRODUCTO:
- Nombre: {producto_nombre}
- Descripción: {producto_descripcion}
- Estrategia: {producto_estrategia}
- Avatar Ideal: {producto_avatar}
- Ángulos de Venta: {producto_angulos}

🎯 PARÁMETROS DEL CONTENIDO:
- CTA Principal: {cta}
- Ángulo de Venta: {angulo_venta}
- Estructura Narrativa: {estructura_narrativa}
- País Objetivo: {pais_objetivo}
- Cantidad de Hooks: {cantidad_hooks}

📝 HOOKS SUGERIDOS:
{hooks_sugeridos}

📄 DOCUMENTOS DE REFERENCIA:
Brief: {documento_brief}
Onboarding: {documento_onboarding}
Research: {documento_research}

💡 INSTRUCCIONES ADICIONALES:
{instrucciones_adicionales}

---
INSTRUCCIONES DE GENERACIÓN:

1. Crea {cantidad_hooks} variaciones de hook que capturen atención inmediatamente
2. Desarrolla el cuerpo del guión usando la estructura "{estructura_narrativa}"
3. Integra naturalmente el ángulo de venta: "{angulo_venta}"
4. El CTA debe ser claro y accionable: "{cta}"
5. Usa lenguaje adaptado a {pais_objetivo}
6. El guión debe sonar NATURAL, como si alguien hablara a un amigo

FORMATO DE ENTREGA (HTML estructurado):

<h2>🎬 Guión - {producto_nombre}</h2>

<h3>🎣 HOOKS ({cantidad_hooks} variaciones)</h3>
<p><strong>Hook 1:</strong> <em>[Tono: Curioso/Provocador]</em></p>
<p>"Texto del hook..."</p>

<h3>💬 DESARROLLO</h3>
<p><em>[Indicación de actuación/tono]</em></p>
<p>"Texto del desarrollo..."</p>

<h3>🔥 TRANSICIÓN A BENEFICIO</h3>
<p>Conexión emocional con el avatar...</p>

<h3>📢 CIERRE / CTA</h3>
<p><em>[Tono: Urgente pero amigable]</em></p>
<p>"{cta}"</p>

<h3>⏱️ DURACIÓN ESTIMADA</h3>
<p>XX-XX segundos</p>

<h3>💡 NOTAS PARA EL CREADOR</h3>
<ul>
  <li>Tip de actuación...</li>
  <li>Expresiones faciales sugeridas...</li>
</ul>`,

  editor: `🎬 ROL: Eres un EDITOR DE VIDEO PROFESIONAL especializado en contenido de alto rendimiento para redes sociales.

Tienes experiencia en edición de TikTok, Reels y Shorts que generan millones de views.

---
📦 CONTEXTO DEL PROYECTO:
- Producto: {producto_nombre}
- Descripción: {producto_descripcion}
- Avatar objetivo: {producto_avatar}
- País: {pais_objetivo}

🎯 ENFOQUE DEL CONTENIDO:
- Ángulo de venta: {angulo_venta}
- Estructura narrativa: {estructura_narrativa}
- CTA: {cta}

📄 DOCUMENTOS:
Brief: {documento_brief}
Estrategias de video: {estrategias_video}

---
FORMATO DE ENTREGA (HTML estructurado):

<h2>🎬 Pautas de Edición - {producto_nombre}</h2>

<h3>📊 ESPECIFICACIONES TÉCNICAS</h3>
<ul>
  <li><strong>Formato:</strong> 9:16 vertical</li>
  <li><strong>Resolución:</strong> 1080x1920</li>
  <li><strong>Duración objetivo:</strong> XX-XX segundos</li>
  <li><strong>Ritmo de cortes:</strong> Cada X segundos</li>
</ul>

<h3>🎥 STORYBOARD POR ESCENAS</h3>
<h4>📍 Escena 1: HOOK (0:00 - 0:03)</h4>
<table>
  <tr><td><strong>Plano:</strong></td><td>Close-up / Medio</td></tr>
  <tr><td><strong>Visual:</strong></td><td>Descripción</td></tr>
  <tr><td><strong>Texto pantalla:</strong></td><td>"Texto"</td></tr>
  <tr><td><strong>Efecto:</strong></td><td>Zoom in rápido</td></tr>
</table>

<h3>🎵 DISEÑO DE AUDIO</h3>
<ul>
  <li><strong>Música:</strong> Género y BPM</li>
  <li><strong>SFX:</strong> Whoosh, pop, ding</li>
</ul>

<h3>✅ CHECKLIST DEL EDITOR</h3>
<ul>
  <li>[ ] Primer frame impactante</li>
  <li>[ ] Subtítulos sincronizados</li>
  <li>[ ] Audio balanceado</li>
  <li>[ ] CTA visible 3+ segundos</li>
</ul>`,

  strategist: `🧠 ROL: Eres un ESTRATEGA DE CONTENIDO Y GROWTH HACKER experto en viralidad y engagement orgánico.

Dominas los algoritmos de TikTok, Instagram y YouTube Shorts.

---
📦 CONTEXTO:
- Producto: {producto_nombre}
- Avatar ideal: {producto_avatar}
- Investigación: {producto_investigacion}
- País objetivo: {pais_objetivo}

🎯 ENFOQUE:
- Ángulo: {angulo_venta}
- Estructura: {estructura_narrativa}

📄 DOCUMENTOS:
Estrategia: {producto_estrategia}
Research: {documento_research}

---
FORMATO DE ENTREGA (HTML):

<h2>🧠 Estrategia de Publicación - {producto_nombre}</h2>

<h3>🎯 ANÁLISIS DEL CONTENIDO</h3>
<ul>
  <li><strong>Fase funnel:</strong> TOFU / MOFU / BOFU</li>
  <li><strong>Objetivo:</strong> Awareness / Engagement / Conversión</li>
</ul>

<h3>📅 TIMING DE PUBLICACIÓN</h3>
<table>
  <tr><th>Plataforma</th><th>Día</th><th>Hora</th></tr>
  <tr><td>TikTok</td><td>Día</td><td>HH:MM</td></tr>
  <tr><td>Instagram</td><td>Día</td><td>HH:MM</td></tr>
</table>

<h3>#️⃣ HASHTAGS</h3>
<p><strong>TikTok:</strong> #hashtag1 #hashtag2</p>
<p><strong>Instagram:</strong> #hashtag1 #hashtag2</p>

<h3>📝 CAPTIONS</h3>
<p><strong>TikTok:</strong> "Caption corto..."</p>
<p><strong>Instagram:</strong> "Caption largo..."</p>

<h3>📈 MÉTRICAS A MONITOREAR</h3>
<ul>
  <li>Watch time: >50%</li>
  <li>Engagement: >5%</li>
</ul>`,

  trafficker: `💰 ROL: Eres un MEDIA BUYER Y TRAFFICKER EXPERTO en campañas de paid media.

Dominas Meta Ads, TikTok Ads y Google Ads.

---
📦 CONTEXTO:
- Producto: {producto_nombre}
- Avatar: {producto_avatar}
- Investigación: {producto_investigacion}

🎯 ENFOQUE:
- CTA: {cta}
- Ángulo: {angulo_venta}
- País: {pais_objetivo}

📄 DOCUMENTOS:
Ángulos: {producto_angulos}
Brief: {documento_brief}

---
FORMATO DE ENTREGA (HTML):

<h2>💰 Pautas Publicitarias - {producto_nombre}</h2>

<h3>🎯 ESTRATEGIA</h3>
<ul>
  <li><strong>Objetivo:</strong> Conversiones / Tráfico</li>
  <li><strong>Fase funnel:</strong> Prospección / Retargeting</li>
</ul>

<h3>👥 SEGMENTACIÓN</h3>
<h4>Audiencia 1 - Intereses</h4>
<ul>
  <li><strong>Edad:</strong> XX-XX</li>
  <li><strong>Ubicación:</strong> {pais_objetivo}</li>
  <li><strong>Intereses:</strong> Lista</li>
</ul>

<h3>🔥 VARIACIONES DE ANUNCIO</h3>
<h4>Versión A - Pain Point</h4>
<p><strong>Hook:</strong> "¿Cansado de...?"</p>
<h4>Versión B - Beneficio</h4>
<p><strong>Hook:</strong> "Así logré..."</p>

<h3>📊 KPIs</h3>
<ul>
  <li><strong>CTR:</strong> >1.5%</li>
  <li><strong>CPC máximo:</strong> $X.XX</li>
  <li><strong>ROAS mínimo:</strong> X.Xx</li>
</ul>`,

  designer: `🎨 ROL: Eres un DISEÑADOR GRÁFICO Y MOTION DESIGNER experto en contenido para redes sociales.

---
📦 CONTEXTO:
- Producto: {producto_nombre}
- Avatar: {producto_avatar}

🎯 ENFOQUE:
- CTA: {cta}
- Ángulo: {angulo_venta}
- País: {pais_objetivo}

📄 DOCUMENTOS:
Brief: {documento_brief}
Onboarding: {documento_onboarding}

---
FORMATO DE ENTREGA (HTML):

<h2>🎨 Pautas de Diseño - {producto_nombre}</h2>

<h3>🎨 PALETA DE COLORES</h3>
<table>
  <tr><th>Uso</th><th>Color</th><th>HEX</th></tr>
  <tr><td>Primario</td><td>Nombre</td><td>#XXXXXX</td></tr>
  <tr><td>Secundario</td><td>Nombre</td><td>#XXXXXX</td></tr>
</table>

<h3>📝 TIPOGRAFÍA</h3>
<ul>
  <li><strong>Headlines:</strong> Fuente Bold XXpx</li>
  <li><strong>Body:</strong> Fuente Regular XXpx</li>
</ul>

<h3>📱 ASSETS A CREAR</h3>
<ul>
  <li>Thumbnail 1080x1080</li>
  <li>Textos en pantalla</li>
  <li>Lower thirds</li>
  <li>End card / CTA animado</li>
</ul>

<h3>🎬 MOTION GRAPHICS</h3>
<ul>
  <li>Transiciones: Tipo y duración</li>
  <li>Animación textos: Pop in / Slide</li>
</ul>

<h3>✅ CHECKLIST</h3>
<ul>
  <li>[ ] Colores alineados con marca</li>
  <li>[ ] Textos legibles en móvil</li>
  <li>[ ] Assets en alta resolución</li>
</ul>`,

  admin: `📋 ROL: Eres un PROJECT MANAGER / ADMIN experto en producción de contenido digital.

---
📦 CONTEXTO:
- Producto: {producto_nombre}
- País: {pais_objetivo}

🎯 ENFOQUE:
- CTA: {cta}
- Ángulo: {angulo_venta}
- Estructura: {estructura_narrativa}

📄 DOCUMENTOS:
Brief: {documento_brief}
Estrategia: {producto_estrategia}

---
FORMATO DE ENTREGA (HTML):

<h2>📋 Plan de Ejecución - {producto_nombre}</h2>

<h3>👥 EQUIPO</h3>
<table>
  <tr><th>Rol</th><th>Responsabilidades</th><th>Entregables</th></tr>
  <tr><td>Estratega</td><td>Briefing, aprobación</td><td>Brief aprobado</td></tr>
  <tr><td>Creador</td><td>Grabación</td><td>Video raw</td></tr>
  <tr><td>Editor</td><td>Edición</td><td>Video editado</td></tr>
  <tr><td>Diseñador</td><td>Assets gráficos</td><td>Thumbnails</td></tr>
  <tr><td>Trafficker</td><td>Campañas</td><td>Anuncios activos</td></tr>
</table>

<h3>📅 CRONOGRAMA</h3>
<table>
  <tr><th>Fase</th><th>Tarea</th><th>Responsable</th><th>Días</th></tr>
  <tr><td>Pre-prod</td><td>Aprobación guión</td><td>Estratega</td><td>1</td></tr>
  <tr><td>Producción</td><td>Grabación</td><td>Creador</td><td>2</td></tr>
  <tr><td>Post-prod</td><td>Edición + Diseño</td><td>Editor/Diseñador</td><td>2</td></tr>
  <tr><td>Revisión</td><td>QA + Aprobación</td><td>Admin/Cliente</td><td>2</td></tr>
  <tr><td>Publicación</td><td>Publicar + Pauta</td><td>Estratega/Trafficker</td><td>1</td></tr>
</table>

<h3>✅ CHECKLISTS</h3>
<h4>Pre-producción</h4>
<ul>
  <li>[ ] Guión aprobado</li>
  <li>[ ] Creador asignado</li>
  <li>[ ] Brief enviado</li>
</ul>
<h4>Producción</h4>
<ul>
  <li>[ ] Video raw subido</li>
  <li>[ ] Notificación a editor</li>
</ul>
<h4>Post-producción</h4>
<ul>
  <li>[ ] Edición completada</li>
  <li>[ ] Assets listos</li>
</ul>
<h4>Publicación</h4>
<ul>
  <li>[ ] Caption y hashtags listos</li>
  <li>[ ] Publicado en plataformas</li>
  <li>[ ] Campaña activa</li>
</ul>

<h3>⚠️ RIESGOS</h3>
<table>
  <tr><th>Riesgo</th><th>Mitigación</th></tr>
  <tr><td>Retraso grabación</td><td>Creador backup</td></tr>
  <tr><td>Cambios últimos</td><td>Límite de revisiones</td></tr>
</table>`,
};

export function StrategistScriptForm({ product, contentId, onScriptGenerated, organizationId: propOrgId }: StrategistScriptFormProps) {
  const { toast } = useToast();
  const { profile } = useAuth();
  const organizationId = propOrgId || profile?.current_organization_id;
  const [loading, setLoading] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [newHook, setNewHook] = useState("");
  const [promptsOpen, setPromptsOpen] = useState(false);
  
  // Document content from Drive
  const [documentContent, setDocumentContent] = useState<DocumentContent>({
    brief: "",
    onboarding: "",
    research: "",
  });
  const [docsLoaded, setDocsLoaded] = useState(false);

  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([
    { key: "script", label: "🧍‍♂️ Bloque Creador (Guión)", status: "pending" },
    { key: "editor", label: "🎬 Bloque Editor", status: "pending" },
    { key: "trafficker", label: "💰 Bloque Trafficker", status: "pending" },
    { key: "strategist", label: "🧠 Bloque Estratega", status: "pending" },
    { key: "designer", label: "🎨 Bloque Diseñador", status: "pending" },
    { key: "admin", label: "📋 Bloque Admin/PM", status: "pending" },
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
    designer_prompt: DEFAULT_PROMPTS.designer,
    admin_prompt: DEFAULT_PROMPTS.admin,
    reference_transcription: "",
    video_strategies: "",
    ai_provider: "lovable",
    ai_model: "google/gemini-2.5-flash",
  });

  const currentProvider = AI_PROVIDERS.find(p => p.value === formData.ai_provider);
  const availableModels = currentProvider?.models || [];

  // Update model when provider changes
  useEffect(() => {
    const provider = AI_PROVIDERS.find(p => p.value === formData.ai_provider);
    if (provider && provider.models.length > 0) {
      setFormData(prev => ({
        ...prev,
        ai_model: provider.models[0].value
      }));
    }
  }, [formData.ai_provider]);

  // Pre-fill avatar from product if available
  useEffect(() => {
    if (product?.ideal_avatar) {
      const strippedAvatar = product.ideal_avatar.replace(/<[^>]*>/g, '').substring(0, 200);
      setFormData(prev => ({
        ...prev,
        ideal_avatar: strippedAvatar
      }));
    }
  }, [product]);

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
Basándote en la siguiente información del producto y cliente, genera 6 prompts optimizados y específicos para generar contenido de alta calidad.

${contextInfo}

Genera prompts específicos para:
1. GUIÓN: Un prompt detallado para generar guiones de video que conecten con el avatar ideal y usen los ángulos de venta del producto
2. PAUTAS EDITOR: Un prompt para generar pautas de edición que reflejen la identidad visual del cliente
3. PAUTAS ESTRATEGA: Un prompt para estrategia de publicación optimizada para el público objetivo
4. PAUTAS TRAFFICKER: Un prompt para campañas de publicidad pagada que maximicen conversiones
5. PAUTAS DISEÑADOR: Un prompt para generar pautas de diseño visual, colores, tipografía y assets gráficos
6. PAUTAS ADMIN/PM: Un prompt para generar cronograma de producción y checklist de ejecución

Responde SOLO en formato JSON con esta estructura exacta:
{
  "script_prompt": "...",
  "editor_prompt": "...",
  "strategist_prompt": "...",
  "trafficker_prompt": "...",
  "designer_prompt": "...",
  "admin_prompt": "..."
}
`;

      const { data, error } = await supabase.functions.invoke(CONTENT_AI_FUNCTION, {
        body: {
          action: "generate_script",
          organizationId,
          prompt: promptGenerationRequest,
          product: { id: product.id, name: product.name },
          ai_provider: formData.ai_provider,
          ai_model: formData.ai_model,
        },
      });

      if (error) throw new Error(error.message);

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
          designer_prompt: parsedPrompts.designer_prompt || prev.designer_prompt,
          admin_prompt: parsedPrompts.admin_prompt || prev.admin_prompt,
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
      { key: "script", label: "🧍‍♂️ Bloque Creador (Guión)", status: "pending" },
      { key: "editor", label: "🎬 Bloque Editor", status: "pending" },
      { key: "trafficker", label: "💰 Bloque Trafficker", status: "pending" },
      { key: "strategist", label: "🧠 Bloque Estratega", status: "pending" },
      { key: "designer", label: "🎨 Bloque Diseñador", status: "pending" },
      { key: "admin", label: "📋 Bloque Admin/PM", status: "pending" },
    ]);
  };

  const buildBaseContext = () => {
    const narrativeLabel = NARRATIVE_STRUCTURES.find(s => s.value === formData.narrative_structure)?.label || formData.narrative_structure;
    
    let context = `PRODUCTO: ${product?.name}
DESCRIPCIÓN: ${product?.description || 'No disponible'}
CTA: ${formData.cta}
ÁNGULO DE VENTA: ${formData.sales_angle}
ESTRUCTURA NARRATIVA: ${narrativeLabel}
PAÍS OBJETIVO: ${formData.target_country}
AVATAR/CLIENTE IDEAL: ${formData.ideal_avatar}

ESTRATEGIA DEL PRODUCTO:
${product?.strategy || 'No disponible'}

INVESTIGACIÓN DE MERCADO:
${product?.market_research || 'No disponible'}

ÁNGULOS DE VENTA DISPONIBLES:
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
    type: "script" | "editor" | "strategist" | "trafficker" | "designer" | "admin",
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
        generation_type: type,
        ai_provider: formData.ai_provider,
        ai_model: formData.ai_model,
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

    setLoading(true);
    resetSteps();

    const generatedContent: GeneratedContent = {
      script: "",
      editor_guidelines: "",
      strategist_guidelines: "",
      trafficker_guidelines: "",
      designer_guidelines: "",
      admin_guidelines: "",
    };

    const emitProgress = (patch: Partial<GeneratedContent>) => {
      console.log("[StrategistScriptForm] emitProgress", {
        script: patch.script?.length,
        editor: patch.editor_guidelines?.length,
        strategist: patch.strategist_guidelines?.length,
        trafficker: patch.trafficker_guidelines?.length,
        designer: patch.designer_guidelines?.length,
        admin: patch.admin_guidelines?.length,
      });
      onScriptGenerated({ ...generatedContent, ...patch });
    };

    try {
      // Step 1: Generate Script (Bloque Creador)
      updateStepStatus("script", "generating");
      generatedContent.script = await generateContent("script", formData.script_prompt);
      updateStepStatus("script", "done");
      emitProgress({ script: generatedContent.script });

      // Step 2: Generate Editor Guidelines
      updateStepStatus("editor", "generating");
      generatedContent.editor_guidelines = await generateContent("editor", formData.editor_prompt, generatedContent.script);
      updateStepStatus("editor", "done");
      emitProgress({ editor_guidelines: generatedContent.editor_guidelines });

      // Step 3: Generate Trafficker Guidelines
      updateStepStatus("trafficker", "generating");
      generatedContent.trafficker_guidelines = await generateContent("trafficker", formData.trafficker_prompt, generatedContent.script);
      updateStepStatus("trafficker", "done");
      emitProgress({ trafficker_guidelines: generatedContent.trafficker_guidelines });

      // Step 4: Generate Strategist Guidelines
      updateStepStatus("strategist", "generating");
      generatedContent.strategist_guidelines = await generateContent("strategist", formData.strategist_prompt, generatedContent.script);
      updateStepStatus("strategist", "done");
      emitProgress({ strategist_guidelines: generatedContent.strategist_guidelines });

      // Step 5: Generate Designer Guidelines
      updateStepStatus("designer", "generating");
      generatedContent.designer_guidelines = await generateContent("designer", formData.designer_prompt, generatedContent.script);
      updateStepStatus("designer", "done");
      emitProgress({ designer_guidelines: generatedContent.designer_guidelines });

      // Step 6: Generate Admin/PM Guidelines
      updateStepStatus("admin", "generating");
      generatedContent.admin_guidelines = await generateContent("admin", formData.admin_prompt, generatedContent.script);
      updateStepStatus("admin", "done");
      emitProgress({ admin_guidelines: generatedContent.admin_guidelines });

      toast({
        title: "Contenido generado exitosamente",
        description: "Guión y pautas generados con IA",
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
    }
  };

  if (!product) {
    return (
      <div className="p-6 border rounded-lg bg-muted/50 text-center">
        <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Selecciona un producto para poder crear el brief del guión
        </p>
      </div>
    );
  }

  const hasDocumentUrls = product.brief_url || product.onboarding_url || product.research_url;

  return (
    <div className="space-y-6 p-6 border rounded-lg bg-gradient-to-br from-primary/5 to-primary/10">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2 text-lg">
          <Wand2 className="h-5 w-5 text-primary" />
          Formulario de Guión
        </h4>
        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
          {currentProvider?.label}
        </Badge>
      </div>

      {/* Document Loading Section */}
      {hasDocumentUrls && (
        <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-primary" />
              <Label className="text-sm font-medium">Documentos del Producto</Label>
            </div>
            <div className="flex items-center gap-2">
              {docsLoaded && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Cargados
                </Badge>
              )}
              <Button
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
              </Button>
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
      <div className="p-4 rounded-lg bg-muted/50 border space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <Label className="text-sm font-medium">Seleccionar IA</Label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Proveedor</Label>
            <Select 
              value={formData.ai_provider} 
              onValueChange={(v: "lovable" | "openai" | "anthropic") => setFormData({ ...formData, ai_provider: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    <div className="flex flex-col">
                      <span>{provider.label}</span>
                      <span className="text-xs text-muted-foreground">{provider.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Modelo</Label>
            <Select 
              value={formData.ai_model} 
              onValueChange={(v) => setFormData({ ...formData, ai_model: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.value} value={model.value}>
                    {model.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CTA */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Target className="h-4 w-4" /> CTA (Llamado a la acción) *
          </Label>
          <Input
            value={formData.cta}
            onChange={(e) => setFormData({ ...formData, cta: e.target.value })}
            placeholder="Ej: Haz clic en el link de la bio"
          />
        </div>

        {/* Ángulo de Venta */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Ángulo de Venta *
          </Label>
          <Select 
            value={formData.sales_angle} 
            onValueChange={(v) => setFormData({ ...formData, sales_angle: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar ángulo..." />
            </SelectTrigger>
            <SelectContent>
              {product.sales_angles?.map((angle, idx) => (
                <SelectItem key={idx} value={angle}>{angle}</SelectItem>
              ))}
              {(!product.sales_angles || product.sales_angles.length === 0) && (
                <div className="px-2 py-2 text-sm text-muted-foreground">No hay ángulos definidos</div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Número de Hooks */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <ListOrdered className="h-4 w-4" /> Cantidad de Hooks
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
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> País Objetivo
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
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Estructura Narrativa *
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
          <Label className="flex items-center gap-2">
            <Users className="h-4 w-4" /> Avatar / Cliente Ideal
          </Label>
          <Textarea
            value={formData.ideal_avatar}
            onChange={(e) => setFormData({ ...formData, ideal_avatar: e.target.value })}
            placeholder="Describe al cliente ideal..."
            rows={2}
          />
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
              <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
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

          <div className="space-y-2">
            <Label className="text-sm font-medium">🎨 Prompt para Pautas del Diseñador</Label>
            <Textarea
              value={formData.designer_prompt}
              onChange={(e) => setFormData({ ...formData, designer_prompt: e.target.value })}
              rows={3}
              className="text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">📋 Prompt para Pautas del Admin/PM</Label>
            <Textarea
              value={formData.admin_prompt}
              onChange={(e) => setFormData({ ...formData, admin_prompt: e.target.value })}
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
              designer_prompt: DEFAULT_PROMPTS.designer,
              admin_prompt: DEFAULT_PROMPTS.admin,
            }))}
          >
            Restaurar prompts por defecto
          </Button>
        </CollapsibleContent>
      </Collapsible>

      {/* Generation Progress */}
      {loading && (
        <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-3">Progreso ({currentProvider?.label}):</p>
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
            Generando con {currentProvider?.label}...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            Generar Todo con IA
          </>
        )}
      </Button>
    </div>
  );
}
